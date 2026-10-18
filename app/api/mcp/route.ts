import {
  dispatchJsonRpc,
  GATEWAY_TOOL_NAMES,
  BROKER_2026_TOOL_NAMES,
  SUPPORTED_PROTOCOL_VERSIONS,
  ALL_TOOLS,
  getProtectedResourceMetadata,
} from "@/lib/mcp-gateway";
import { JSONRPCRequest, RequestContext, TransportHeaders } from "@/lib/mcp-types";
import { getEnvFromContext } from "@/lib/browser-run";


function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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

export async function DELETE() {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

export async function GET(request: Request) {
  const accept = request.headers.get("accept") || "";
  if (accept.includes("text/event-stream") && !accept.includes("application/json")) {
    return new Response(null, {
      status: 405,
      headers: getCorsHeaders(),
    });
  }

  const url = new URL(request.url);
  const gatewaySlug = url.searchParams.get("gateway") || undefined;
  const colo = (request as unknown as { cf?: { colo?: string } }).cf?.colo || "LHR";

  return Response.json(
    {
      service: "Spike Land Progressive MCP Gateway",
      name: "spike-land-gateway",
      version: "2.0.0-mcp2026",
      protocol: "mcp-jsonrpc-2.0",
      protocolVersion: "2026-07-28",
      supportedProtocolVersions: [...SUPPORTED_PROTOCOL_VERSIONS],
      runtime: "Cloudflare Workers Edge (V8 isolates)",
      datacenter: colo,
      description:
        "MCP 2026-07-28 Stateless Progressive-Disclosure Relay & Capability Broker (SEP-2567, SEP-2575, SEP-2549, SEP-2243, SEP-2322)",
      endpoints: {
        httpPost: "/api/mcp",
        virtualGateways: "/api/mcp/g/{gateway_slug}",
        oauthProtectedResource: "/.well-known/oauth-protected-resource",
      },
      broker2026Tools: [...BROKER_2026_TOOL_NAMES],
      gatewayTools: [...GATEWAY_TOOL_NAMES],
      totalCatalogTools: Object.keys(ALL_TOOLS).length,
      initialExposedTools: 5,
      positionZeroCacheStatus: "100% immutable (cacheScope: public, ttlMs: 3600000)",
      estimatedTokenSavings: "98.7%",
      oauthProtectedResource: getProtectedResourceMetadata(gatewaySlug),
      documentation: "https://spike.land/mcp",
    },
    {
      headers: getCorsHeaders(),
    }
  );
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization") || "";
  const apiKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;
  const callerSubject = apiKey ? `sub_${apiKey.slice(-8)}` : "anonymous";
  const ip =
    request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "127.0.0.1";
  const colo = (request as unknown as { cf?: { colo?: string } }).cf?.colo || "LHR";
  const gatewaySlug = url.searchParams.get("gateway") || undefined;

  // SEP-2243: Extract HTTP Transport Headers (MCP-Protocol-Version, Mcp-Method, Mcp-Name, Mcp-Param-*)
  const mcpParams: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (key.toLowerCase().startsWith("mcp-param-")) {
      mcpParams[key.slice(10)] = value;
    }
  });

  const transportHeaders: TransportHeaders = {
    mcpProtocolVersion: request.headers.get("mcp-protocol-version") || undefined,
    mcpMethod: request.headers.get("mcp-method") || undefined,
    mcpName: request.headers.get("mcp-name") || undefined,
    mcpParams: Object.keys(mcpParams).length > 0 ? mcpParams : undefined,
  };

  const ctx: RequestContext = {
    apiKey,
    callerSubject,
    ip,
    colo,
    gatewaySlug,
    transportHeaders,
    browserEnv: getEnvFromContext(),
  };


  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error: Invalid JSON was received by the server",
        },
      },
      {
        status: 400,
        headers: getCorsHeaders(),
      }
    );
  }

  // Handle batch requests
  if (Array.isArray(body)) {
    const responses = [];
    for (const req of body) {
      const res = await dispatchJsonRpc(req as JSONRPCRequest, ctx);
      if (res) responses.push(res);
    }
    if (responses.length === 0) {
      return new Response(null, {
        status: 202,
        headers: getCorsHeaders(),
      });
    }
    return Response.json(responses, {
      headers: getCorsHeaders(),
    });
  }

  // Handle single request
  const response = await dispatchJsonRpc(body as JSONRPCRequest, ctx);
  if (!response) {
    // Notification: return 202 Accepted per MCP Streamable HTTP specification
    return new Response(null, {
      status: 202,
      headers: getCorsHeaders(),
    });
  }

  // SEP-2575 / SEP-2243: Return HTTP 400 for UnsupportedProtocolVersionError (-32022) or HeaderMismatchError (-32020)
  const httpStatus =
    response.error && (response.error.code === -32022 || response.error.code === -32020)
      ? 400
      : 200;

  return Response.json(response, {
    status: httpStatus,
    headers: getCorsHeaders(),
  });
}

