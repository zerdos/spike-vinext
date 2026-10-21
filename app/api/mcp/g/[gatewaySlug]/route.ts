import {
  dispatchJsonRpc,
  getVirtualGatewayTools,
  getProtectedResourceMetadata,
} from "@/lib/mcp-gateway";
import { JSONRPCRequest, RequestContext, TransportHeaders } from "@/lib/mcp-types";
import { getEnvFromContext } from "@/lib/browser-run";
import { verifyApiToken, UserAccount } from "@/lib/auth/users-db";
import { verifySessionToken, getSessionFromRequest } from "@/lib/auth/session";


function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Mcp-Method, Mcp-Name",
  };
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ gatewaySlug: string }> }
) {
  const { gatewaySlug } = await context.params;
  const colo = (request as unknown as { cf?: { colo?: string } }).cf?.colo || "LHR";
  const tools = getVirtualGatewayTools(gatewaySlug);

  return Response.json(
    {
      service: "Spike Land URI-Scoped Virtual Gateway (Pattern C)",
      gatewaySlug,
      protocolVersion: "2026-07-28",
      runtime: "Cloudflare Workers Edge (V8 isolates)",
      datacenter: colo,
      canonicalServerUri: `https://spike.land/api/mcp/g/${gatewaySlug}`,
      cacheScope: "public",
      ttlMs: 3600000,
      toolsCount: tools.length,
      tools: tools.map((t) => t.name),
      oauthProtectedResource: getProtectedResourceMetadata(gatewaySlug),
    },
    {
      headers: getCorsHeaders(),
    }
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ gatewaySlug: string }> }
) {
  const { gatewaySlug } = await context.params;
  const authHeader = request.headers.get("authorization") || "";
  const apiKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;

  let authenticatedUser: { id: string; email: string } | null = null;
  let userAccount: UserAccount | null = null;

  if (apiKey) {
    const verified = await verifyApiToken(apiKey);
    if (verified) {
      userAccount = verified.user;
      authenticatedUser = { id: verified.user.id, email: verified.user.email };
    } else {
      const session = await verifySessionToken(apiKey);
      if (session?.user) {
        authenticatedUser = { id: session.user.id, email: session.user.email };
      }
    }

    if (!authenticatedUser) {
      return Response.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32001,
            message: "Unauthorized: Invalid or revoked Bearer token. Please configure a valid API token in Settings.",
          },
        },
        { status: 401, headers: getCorsHeaders() }
      );
    }
  } else {
    const session = await getSessionFromRequest(request);
    if (session?.user) {
      authenticatedUser = { id: session.user.id, email: session.user.email };
    }
  }

  const callerSubject = authenticatedUser
    ? authenticatedUser.id
    : apiKey
    ? `sub_${apiKey.slice(-8)}`
    : "anonymous";
  const colo = (request as unknown as { cf?: { colo?: string } }).cf?.colo || "LHR";

  const transportHeaders: TransportHeaders = {
    mcpProtocolVersion: request.headers.get("mcp-protocol-version") || "2026-07-28",
    mcpMethod: request.headers.get("mcp-method") || undefined,
    mcpName: request.headers.get("mcp-name") || undefined,
  };

  const userEnv = userAccount?.providerTokens ? { ...userAccount.providerTokens } : {};
  const url = new URL(request.url);
  const sessionId =
    url.searchParams.get("sessionId") ||
    request.headers.get("mcp-session-id") ||
    callerSubject ||
    "default-session";

  const ctx: RequestContext = {
    sessionId,
    apiKey,
    callerSubject,
    colo,
    gatewaySlug,
    transportHeaders,
    browserEnv: {
      ...getEnvFromContext(),
      ...userEnv,
    },
  };


  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      },
      { status: 400, headers: getCorsHeaders() }
    );
  }

  const response = await dispatchJsonRpc(body as JSONRPCRequest, ctx);
  if (!response) {
    return new Response(null, { status: 204, headers: getCorsHeaders() });
  }

  const httpStatus =
    response.error && (response.error.code === -32022 || response.error.code === -32020)
      ? 400
      : 200;

  return Response.json(response, {
    status: httpStatus,
    headers: getCorsHeaders(),
  });
}
