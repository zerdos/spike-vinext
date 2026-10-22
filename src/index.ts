/**
 * Cloudflare Worker Agent Harness + Spike Land Meta-MCP Gateway (MVP)
 * PRD Section 1, 2.1 & 7
 * Main Worker Entrypoint
 */

import { Env, ChatRequest } from "./types.js";
import { executeAgentLoop } from "./agent.js";
import { META_MCP_TOOLS } from "./meta-mcp.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Session-Id",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // 2. Health & Info Endpoint
    if (url.pathname === "/" || url.pathname === "/health") {
      return Response.json(
        {
          name: "spike-land-agent-harness-mvp",
          status: "healthy",
          runtime: "Cloudflare Workers",
          tools: META_MCP_TOOLS.map((t) => t.function.name),
          version: "1.0.0-mvp",
        },
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          },
        }
      );
    }

    // 3. Stateless Agent Loop Endpoint: POST /chat
    if (url.pathname === "/chat" || url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        return Response.json(
          { error: "Method not allowed. Use POST /chat." },
          { status: 405, headers: CORS_HEADERS }
        );
      }

      let payload: ChatRequest;
      try {
        payload = (await request.json()) as ChatRequest;
      } catch {
        return Response.json(
          { error: "Invalid JSON request body." },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      if (!payload.messages && !payload.message) {
        return Response.json(
          { error: "Missing required 'messages' array or 'message' string." },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      try {
        const result = await executeAgentLoop(payload, env);
        return Response.json(result, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          },
        });
      } catch (err: unknown) {
        return Response.json(
          {
            error: "Agent execution failed.",
            details: (err as Error)?.message || String(err),
          },
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            },
          }
        );
      }
    }

    return Response.json(
      { error: "Not found." },
      { status: 404, headers: CORS_HEADERS }
    );
  },
};

export * from "./types.js";
export * from "./security.js";
export * from "./meta-mcp.js";
export * from "./agent.js";
