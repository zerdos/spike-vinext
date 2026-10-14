import { dispatchJsonRpc, GATEWAY_TOOL_NAMES, ALL_TOOLS } from "@/lib/mcp-gateway";
import { JSONRPCRequest, RequestContext } from "@/lib/mcp-types";

function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
  };
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  const colo = (request as unknown as { cf?: { colo?: string } }).cf?.colo || "LHR";

  return Response.json(
    {
      service: "Spike Land Progressive MCP Gateway",
      name: "spike-land-gateway",
      version: "1.0.0-mvp",
      protocol: "mcp-jsonrpc-2.0",
      runtime: "Cloudflare Workers Edge (V8 isolates)",
      datacenter: colo,
      description: "Progressively Disclosed MCP Server & MCP Registry Gateway",
      endpoints: {
        httpPost: "/api/mcp",
        sse: "/api/mcp/sse",
      },
      gatewayTools: [...GATEWAY_TOOL_NAMES],
      universalGatewayTools: ["discover_tools", "run_tool", "get_gateway_status"],
      totalCatalogTools: Object.keys(ALL_TOOLS).length,
      initialExposedTools: 3,
      estimatedTokenSavings: "98.2%",
      currentSession: sessionId || null,
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
  const headerSessionId = request.headers.get("mcp-session-id");
  const querySessionId = url.searchParams.get("sessionId");

  // Derive or use provided session ID
  const sessionId = querySessionId || headerSessionId || (apiKey ? `auth_${apiKey.slice(-8)}` : "default_session");
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "127.0.0.1";
  const colo = (request as unknown as { cf?: { colo?: string } }).cf?.colo || "LHR";
  const profile = (url.searchParams.get("profile") || request.headers.get("x-mcp-profile") || request.headers.get("mcp-profile")) as ("standard" | "universal" | undefined);

  const ctx: RequestContext = {
    sessionId,
    apiKey,
    ip,
    colo,
    profile,
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
    return Response.json(responses, {
      headers: getCorsHeaders(),
    });
  }

  // Handle single request
  const response = await dispatchJsonRpc(body as JSONRPCRequest, ctx);
  if (!response) {
    // Notification: return 204 or empty response
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(),
    });
  }

  return Response.json(response, {
    headers: getCorsHeaders(),
  });
}
