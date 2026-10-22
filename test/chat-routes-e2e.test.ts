import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as chatApiPost, OPTIONS as chatApiOptions } from "@/app/api/chat/route";
import { GET as healthGet } from "@/app/health/route";
import { GET as apiHealthGet } from "@/app/api/health/route";

describe("Chat API Routes & Health End-to-End (/api/chat, /health, /api/health)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GEMINI_API_KEY: "mock-gemini-test-key",
    };
  });

  it("handles GET /health and returns healthy status and tools", async () => {
    const req = new Request("https://spike.land/health", { method: "GET" });
    const res = await healthGet(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("healthy");
    expect(data.provider).toBe("openrouter");
    expect(data.defaultModel).toBe("deepseek/deepseek-v4.1-flash");
    expect(data.tools).toEqual(
      expect.arrayContaining(["mount_mcp_server", "discover_tools", "run_tool"])
    );
  });

  it("handles GET /api/health and returns healthy status", async () => {
    const req = new Request("https://spike.land/api/health", { method: "GET" });
    const res = await apiHealthGet(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("healthy");
  });

  it("handles OPTIONS preflight on /api/chat", async () => {
    const reqApi = new Request("https://spike.land/api/chat", { method: "OPTIONS" });
    const resApi = await chatApiOptions(reqApi);
    expect(resApi.status).toBe(204);
    expect(resApi.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("handles POST /api/chat with valid payload", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url, init) => {
      const urlStr = String(url);
      if (urlStr.includes("chat/completions")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: "Hello from Gemini via Next.js route!",
                    role: "assistant",
                  },
                  finish_reason: "stop",
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );
      }
      return Promise.reject(new Error(`Unexpected fetch to ${urlStr}`));
    });

    try {
      const req = new Request("https://spike.land/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Hello spike agent" }),
      });
      const res = await chatApiPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.response).toBe("Hello from Gemini via Next.js route!");
      expect(data.turns).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("handles POST /api/chat error when body is invalid", async () => {
    const req = new Request("https://spike.land/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await chatApiPost(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing required 'messages' array or 'message' string.");
  });

  it("resolves OPENROUTER_API_KEY from .dev.vars if process.env has no key", async () => {
    delete (process.env as Record<string, string | undefined>).OPENROUTER_API_KEY;
    delete (process.env as Record<string, string | undefined>).GEMINI_API_KEY;
    delete (process.env as Record<string, string | undefined>).LLM_API_KEY;
    const req = new Request("https://spike.land/api/health", { method: "GET" });
    const res = await apiHealthGet(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.provider).toBe("openrouter");
    expect(data.defaultModel).toBe("deepseek/deepseek-v4.1-flash");
  });
});
