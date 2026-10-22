import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as chatApiPost, OPTIONS as chatApiOptions } from "@/app/api/chat/route";
import { POST as chatPost, GET as chatGet, OPTIONS as chatOptions } from "@/app/chat/route";
import { GET as healthGet } from "@/app/health/route";
import { GET as apiHealthGet } from "@/app/api/health/route";

describe("Chat Routes & Health End-to-End (/api/chat, /chat, /health)", () => {
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
    expect(data.provider).toBe("gemini");
    expect(data.tools).toEqual(["mount_mcp_server", "discover_tools", "run_tool"]);
  });

  it("handles GET /api/health and returns healthy status", async () => {
    const req = new Request("https://spike.land/api/health", { method: "GET" });
    const res = await apiHealthGet(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("healthy");
  });

  it("handles OPTIONS preflight on /api/chat and /chat", async () => {
    const reqApi = new Request("https://spike.land/api/chat", { method: "OPTIONS" });
    const resApi = await chatApiOptions(reqApi);
    expect(resApi.status).toBe(204);
    expect(resApi.headers.get("Access-Control-Allow-Origin")).toBe("*");

    const reqChat = new Request("https://spike.land/chat", { method: "OPTIONS" });
    const resChat = await chatOptions(reqChat);
    expect(resChat.status).toBe(204);
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

  it("handles POST /chat identically to /api/chat", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "Direct /chat response",
                  role: "assistant",
                },
                finish_reason: "stop",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    });

    try {
      const req = new Request("https://spike.land/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Direct message" }),
      });
      const res = await chatPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.response).toBe("Direct /chat response");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
