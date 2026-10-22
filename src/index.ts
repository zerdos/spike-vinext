/**
 * Cloudflare Worker Agent Harness + Spike Land Meta-MCP Gateway (MVP)
 * PRD Section 1, 2.1 & 7
 * Main Worker Entrypoint
 */

import { Env, ChatRequest } from "./types.js";
import { executeAgentLoop, DEFAULT_CHAT_MODEL } from "./agent.js";
import { META_MCP_TOOLS } from "./meta-mcp.js";
import { env as cfEnv } from "cloudflare:workers";
import fs from "node:fs";
import path from "node:path";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Session-Id",
};

function loadDevVars(): Partial<Env> {
  try {
    if (typeof process !== "undefined" && typeof process.cwd === "function") {
      const devVarsPath = path.resolve(process.cwd(), ".dev.vars");
      if (fs.existsSync(devVarsPath)) {
        const content = fs.readFileSync(devVarsPath, "utf-8");
        const parsed: Record<string, string> = {};
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#")) {
            const idx = trimmed.indexOf("=");
            if (idx > 0) {
              const k = trimmed.slice(0, idx).trim();
              const v = trimmed.slice(idx + 1).trim();
              parsed[k] = v;
            }
          }
        }
        return parsed as Partial<Env>;
      }
    }
  } catch {
    // Ignored in non-filesystem or edge environments
  }
  return {};
}

export function resolveEnv(passedEnv?: Partial<Env>): Env {
  const devVars = loadDevVars();
  return {
    ...devVars,
    ...process.env,
    ...(typeof cfEnv === "object" ? cfEnv : {}),
    ...passedEnv,
  } as Env;
}

export default {
  async fetch(request: Request, env?: Env): Promise<Response> {
    const resolvedEnv = resolveEnv(env);
    const url = new URL(request.url);

    // 1. CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // 2. Health & Info Endpoint
    if (
      url.pathname === "/" ||
      url.pathname === "/health" ||
      url.pathname === "/api/health"
    ) {
      return Response.json(
        {
          name: "spike-land-agent-harness-mvp",
          status: "healthy",
          runtime: "Cloudflare Workers",
          tools: META_MCP_TOOLS.map((t) => t.function.name),
          provider: resolvedEnv.OPENROUTER_API_KEY
            ? "openrouter"
            : resolvedEnv.GEMINI_API_KEY
            ? "gemini"
            : resolvedEnv.LLM_API_KEY
            ? "openai"
            : "none",
          defaultModel: resolvedEnv.OPENROUTER_API_KEY
            ? (resolvedEnv.LLM_MODEL || DEFAULT_CHAT_MODEL)
            : resolvedEnv.GEMINI_API_KEY
            ? (resolvedEnv.LLM_MODEL || "gemini-flash-latest")
            : (resolvedEnv.LLM_MODEL || DEFAULT_CHAT_MODEL),
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

    // 3. Stateless Agent Loop Endpoint: POST /chat or /api/chat
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

      if (!payload.model) {
        if (resolvedEnv.OPENROUTER_API_KEY || (!resolvedEnv.GEMINI_API_KEY && !resolvedEnv.LLM_API_KEY)) {
          payload.model = resolvedEnv.LLM_MODEL || DEFAULT_CHAT_MODEL;
        } else if (resolvedEnv.LLM_MODEL) {
          payload.model = resolvedEnv.LLM_MODEL;
        }
      }

      try {
        const result = await executeAgentLoop(payload, resolvedEnv);
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
