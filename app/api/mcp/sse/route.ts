import {
  dispatchJsonRpc,
  getOrCreateSession,
  registerSSEListener,
} from "@/lib/mcp-gateway";
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
  // Support reconnecting to existing session or generate new UUID
  const sessionId =
    url.searchParams.get("sessionId") ||
    `sess_${crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Math.random().toString(36).slice(2)}`;

  getOrCreateSession(sessionId);

  const encoder = new TextEncoder();

  let cleanupListener: (() => void) | null = null;
  let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 1. Send the standard MCP SSE endpoint event
      // This tells the MCP client (Cursor, Claude Desktop, etc.) where to POST its JSON-RPC messages
      const postEndpoint = `/api/mcp?sessionId=${encodeURIComponent(sessionId)}`;
      controller.enqueue(encoder.encode(`event: endpoint\ndata: ${postEndpoint}\n\n`));

      // 2. Register listener for real-time notifications (e.g., tools/list_changed)
      cleanupListener = registerSSEListener(sessionId, (event, data) => {
        try {
          const payload = typeof data === "string" ? data : JSON.stringify(data);
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${payload}\n\n`));
        } catch {
          // Stream might be closed
        }
      });

      // 3. Keepalive heartbeat every 25 seconds
      keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          if (keepAliveInterval) clearInterval(keepAliveInterval);
        }
      }, 25000);
    },
    cancel() {
      if (cleanupListener) cleanupListener();
      if (keepAliveInterval) clearInterval(keepAliveInterval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      ...getCorsHeaders(),
    },
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const sessionId =
    url.searchParams.get("sessionId") ||
    request.headers.get("mcp-session-id") ||
    "sse_default_session";

  const authHeader = request.headers.get("authorization") || "";
  const apiKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;

  const ctx: RequestContext = {
    sessionId,
    apiKey,
  };

  try {
    const body = (await request.json()) as JSONRPCRequest;
    const response = await dispatchJsonRpc(body, ctx);
    if (!response) {
      return new Response(null, { status: 204, headers: getCorsHeaders() });
    }
    return Response.json(response, { headers: getCorsHeaders() });
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
}
