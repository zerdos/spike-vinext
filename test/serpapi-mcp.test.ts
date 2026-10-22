import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mountMcpServer,
  discoverTools,
  runTool,
  getSessionState,
  saveSessionState,
  SERPAPI_DEFAULT_SERVER,
} from "../src/meta-mcp.js";
import {
  resolveServerUrlAndAuth,
  redactSecretFromText,
  parseMcpResponseText,
} from "../src/security.js";
import { isMutatingMcpTool, SpikeMcpConnector } from "../src/connectors/spike-mcp-connector.js";
import {
  createSpikeCodemodeRuntime,
  MockWorkerLoader,
  createMockDurableObjectState,
} from "../src/codemode-runtime.js";
import { resolveEnv } from "../src/index.js";
import { Env, SessionState } from "../src/types.js";

// Mock KVNamespace for session testing
function createMockKV(): any {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string, type?: string) => {
      const val = store.get(key);
      if (val === undefined) return null;
      if (type === "json") return JSON.parse(val);
      return val;
    }),
    put: vi.fn(async (key: string, val: string) => {
      store.set(key, typeof val === "string" ? val : JSON.stringify(val));
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    _store: store,
  };
}

describe("SerpApi MCP Integration (PRD: prds/serpapi.md)", () => {
  const mockApiKey = "test_serpapi_key_1234567890abcdef1234567890abcdef";

  describe("Unit Tests: URL Secret Resolution & Redaction", () => {
    it("interpolates YOUR_SERPAPI_API_KEY placeholder and leaves template URL intact", () => {
      const env: Env = {
        SESSION_KV: createMockKV(),
        SERPAPI_API_KEY: mockApiKey,
      };

      const res = resolveServerUrlAndAuth(
        "https://mcp.serpapi.com/YOUR_SERPAPI_API_KEY/mcp",
        undefined,
        env,
        "serpapi"
      );

      expect(res.error).toBeUndefined();
      expect(res.templateUrl).toBe("https://mcp.serpapi.com/YOUR_SERPAPI_API_KEY/mcp");
      expect(res.resolvedUrl).toBe(`https://mcp.serpapi.com/${encodeURIComponent(mockApiKey)}/mcp`);
      expect(res.secretKeyName).toBe("SERPAPI_API_KEY");
      expect(res.secretValue).toBe(mockApiKey);
      expect(res.bearerToken).toBeUndefined(); // Path-embedded, no bearer header needed
    });

    it("interpolates {SERPAPI_API_KEY} and ${SERPAPI_API_KEY} placeholders", () => {
      const env: Env = {
        SESSION_KV: createMockKV(),
        SERPAPI_API_KEY: mockApiKey,
      };

      const resCurly = resolveServerUrlAndAuth(
        "https://mcp.serpapi.com/{SERPAPI_API_KEY}/mcp",
        undefined,
        env,
        "serpapi"
      );
      expect(resCurly.resolvedUrl).toBe(`https://mcp.serpapi.com/${encodeURIComponent(mockApiKey)}/mcp`);

      const resDollar = resolveServerUrlAndAuth(
        "https://mcp.serpapi.com/${SERPAPI_API_KEY}/mcp",
        undefined,
        env,
        "serpapi"
      );
      expect(resDollar.resolvedUrl).toBe(`https://mcp.serpapi.com/${encodeURIComponent(mockApiKey)}/mcp`);
    });

    it("scrubs literal secret from URL and replaces with template placeholder", () => {
      const env: Env = {
        SESSION_KV: createMockKV(),
        SERPAPI_API_KEY: mockApiKey,
      };

      // Caller passed real key directly in URL
      const res = resolveServerUrlAndAuth(
        `https://mcp.serpapi.com/${mockApiKey}/mcp`,
        undefined,
        env,
        "serpapi"
      );

      expect(res.templateUrl).toBe("https://mcp.serpapi.com/YOUR_SERPAPI_API_KEY/mcp");
      expect(res.resolvedUrl).toBe(`https://mcp.serpapi.com/${encodeURIComponent(mockApiKey)}/mcp`);
    });

    it("uses Bearer header auth when URL does not embed key in path", () => {
      const env: Env = {
        SESSION_KV: createMockKV(),
        SERPAPI_API_KEY: mockApiKey,
      };

      const res = resolveServerUrlAndAuth(
        "https://mcp.serpapi.com/mcp",
        undefined,
        env,
        "serpapi"
      );

      expect(res.templateUrl).toBe("https://mcp.serpapi.com/mcp");
      expect(res.resolvedUrl).toBe("https://mcp.serpapi.com/mcp");
      expect(res.bearerToken).toBe(mockApiKey);
    });

    it("returns a structured error when secret is missing from environment", () => {
      const env: Env = {
        SESSION_KV: createMockKV(),
      };

      const res = resolveServerUrlAndAuth(
        "https://mcp.serpapi.com/YOUR_SERPAPI_API_KEY/mcp",
        undefined,
        env,
        "serpapi"
      );

      expect(res.error).toContain("Worker secret 'SERPAPI_API_KEY' not found in environment.");
    });

    it("redactSecretFromText thoroughly scrubs secret from strings", () => {
      const sensitiveText = `Failed to connect to https://mcp.serpapi.com/${mockApiKey}/mcp: status 401`;
      const scrubbed = redactSecretFromText(sensitiveText, mockApiKey);
      expect(scrubbed).not.toContain(mockApiKey);
      expect(scrubbed).toContain("[REDACTED]");
    });

    it("parses both standard JSON and SSE data stream frames", () => {
      // Standard JSON
      const jsonRes = parseMcpResponseText(
        JSON.stringify({ jsonrpc: "2.0", id: 1, result: { tools: [] } }),
        "application/json"
      );
      expect(jsonRes.result.tools).toEqual([]);

      // SSE Text Stream
      const sseText = `event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"tools":[{"name":"search"}]}}\n\n`;
      const sseRes = parseMcpResponseText(sseText, "text/event-stream", 1);
      expect(sseRes.result.tools[0].name).toBe("search");
    });
  });

  describe("Unit Tests: Tool Governance & Approval Classification", () => {
    it("classifies 'search' as read-only (requiresApproval: false)", () => {
      expect(isMutatingMcpTool("search")).toBe(false);
      expect(isMutatingMcpTool("search_dashboard")).toBe(false);
      expect(isMutatingMcpTool("search_table")).toBe(false);
      expect(isMutatingMcpTool("delete_index")).toBe(true);
    });
  });

  describe("AC1: Canonical Config URL Support & Zero Secret KV Persistence", () => {
    it("mounts https://mcp.serpapi.com/YOUR_SERPAPI_API_KEY/mcp and saves only template URL in KV", async () => {
      const mockKV = createMockKV();
      const env: Env = {
        SESSION_KV: mockKV,
        SERPAPI_API_KEY: mockApiKey,
      };

      let requestedUrl = "";
      let requestedHeaders: Record<string, string> = {};

      const mockFetch = vi.fn().mockImplementation((url, init) => {
        requestedUrl = String(url);
        requestedHeaders = init.headers;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              result: {
                tools: [
                  {
                    name: "search",
                    description: "SerpApi search tool",
                    inputSchema: { type: "object", properties: { params: { type: "object" } } },
                  },
                ],
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );
      });

      const sessionState: SessionState = { sessionId: "test-sess-1", mountedServers: {} };

      const res = await mountMcpServer(
        {
          namespace: "serpapi",
          url: "https://mcp.serpapi.com/YOUR_SERPAPI_API_KEY/mcp",
        },
        env,
        sessionState,
        { fetchFn: mockFetch as any }
      );

      expect("status" in res && res.status).toBe("mounted");
      // Check that fetch was called with the RESOLVED URL
      expect(requestedUrl).toBe(`https://mcp.serpapi.com/${encodeURIComponent(mockApiKey)}/mcp`);
      expect(requestedHeaders["Accept"]).toContain("application/json");

      // Verify that in sessionState and KV, the URL is the REDACTED TEMPLATE
      const savedServer = sessionState.mountedServers["serpapi"];
      expect(savedServer).toBeDefined();
      expect(savedServer.url).toBe("https://mcp.serpapi.com/YOUR_SERPAPI_API_KEY/mcp");
      expect(savedServer.url).not.toContain(mockApiKey);

      // Verify KV store
      const kvStoredText = mockKV._store.get("session:test-sess-1");
      expect(kvStoredText).toBeDefined();
      expect(kvStoredText).not.toContain(mockApiKey);
      expect(kvStoredText).toContain("YOUR_SERPAPI_API_KEY");
    });
  });

  describe("AC2: Zero-Turn Auto-Availability & Discovery", () => {
    it("auto-populates serpapi by default even when SERPAPI_API_KEY is not in env", async () => {
      const mockKV = createMockKV();
      const env: Env = {
        SESSION_KV: mockKV,
      };

      const sessionState = await getSessionState("default-sess-1", env);
      expect(sessionState.mountedServers["serpapi"]).toBeDefined();
      expect(sessionState.mountedServers["serpapi"].tools[0].namespacedName).toBe("serpapi.search");

      // Discover in JSON schema format
      const discoveredJson = discoverTools({ query: "serpapi search" }, sessionState);
      expect(discoveredJson.length).toBeGreaterThan(0);
      expect(discoveredJson[0].namespacedName).toBe("serpapi.search");

      // Discover in TypeScript format
      const discoveredTs = discoverTools({ query: "serpapi search", format: "typescript" }, sessionState);
      expect(discoveredTs[0].typeDefinition).toContain("serpapi.search(args:");
    });

    it("auto-populates serpapi when SERPAPI_API_KEY is present in env", async () => {
      const mockKV = createMockKV();
      const env: Env = {
        SESSION_KV: mockKV,
        SERPAPI_API_KEY: mockApiKey,
      };

      const sessionState = await getSessionState("auto-sess-1", env);
      expect(sessionState.mountedServers["serpapi"]).toBeDefined();
      expect(sessionState.mountedServers["serpapi"].tools[0].namespacedName).toBe("serpapi.search");

      // Discover in JSON schema format
      const discoveredJson = discoverTools({ query: "serpapi search" }, sessionState);
      expect(discoveredJson.length).toBeGreaterThan(0);
      expect(discoveredJson[0].namespacedName).toBe("serpapi.search");

      // Discover in TypeScript format
      const discoveredTs = discoverTools({ query: "serpapi search", format: "typescript" }, sessionState);
      expect(discoveredTs[0].typeDefinition).toContain("serpapi.search(args:");
    });
  });

  describe("AC3: Durable Code Mode Sandbox Integration", () => {
    it("executes serpapi.search in isolated sandbox and filters results in JavaScript", async () => {
      const mockKV = createMockKV();
      const env: Env = {
        SESSION_KV: mockKV,
        SERPAPI_API_KEY: mockApiKey,
      };

      const sessionState = await getSessionState("codemode-sess", env);
      const ctx = createMockDurableObjectState();

      const mockFetch = vi.fn().mockImplementation((url, init) => {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              result: {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      organic_results: [
                        { title: "Workers Docs", link: "https://developers.cloudflare.com" },
                        { title: "Workers GitHub", link: "https://github.com/cloudflare/workers-sdk" },
                        { title: "Spike Land", link: "https://spike.land" },
                      ],
                    }),
                  },
                ],
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );
      });

      const runtime = createSpikeCodemodeRuntime(ctx, env, sessionState, {
        fetchFn: mockFetch as any,
        loader: new MockWorkerLoader(),
      });

      const code = `async () => {
        const searchRes = await serpapi.search({
          params: { q: "cloudflare workers", engine: "google_light" },
          mode: "compact"
        });
        const organic = searchRes.organic_results || [];
        return {
          total: organic.length,
          topLinks: organic.slice(0, 2).map(r => r.link)
        };
      }`;

      const res = await runtime.execute({ code });
      expect(res.status).toBe("completed");
      if (res.status === "completed") {
        expect(res.result).toEqual({
          total: 3,
          topLinks: ["https://developers.cloudflare.com", "https://github.com/cloudflare/workers-sdk"],
        });
      }
    });
  });

  describe("AC4: Strict Secret Redaction on Errors", () => {
    it("scrubs raw secret from upstream HTTP errors in runTool", async () => {
      const mockKV = createMockKV();
      const env: Env = {
        SESSION_KV: mockKV,
        SERPAPI_API_KEY: mockApiKey,
      };

      const sessionState = await getSessionState("error-sess", env);

      const mockErrorFetch = vi.fn().mockImplementation((url) => {
        // Echo back the URL in the error message
        return Promise.resolve(
          new Response(`Invalid key in URL: ${url}`, { status: 401, statusText: "Unauthorized" })
        );
      });

      const res = await runTool(
        {
          tool_name: "serpapi.search",
          arguments: { params: { q: "test" } },
        },
        env,
        sessionState,
        { fetchFn: mockErrorFetch as any }
      );

      expect(res.error).toBeDefined();
      expect(res.error?.message).not.toContain(mockApiKey);
      expect(res.error?.message).toContain("[REDACTED]");
    });
  });

  describe("Live E2E Integration (Using .dev.vars Key)", () => {
    const liveEnv = resolveEnv();
    const liveKey = liveEnv.SERPAPI_API_KEY as string | undefined;

    it("executes live SerpApi search via run_tool against mcp.serpapi.com", async () => {
      if (!liveKey) {
        console.warn("Skipping live SerpApi E2E test: SERPAPI_API_KEY not configured.");
        return;
      }

      const mockKV = createMockKV();
      const env: Env = {
        SESSION_KV: mockKV,
        SERPAPI_API_KEY: liveKey,
      };

      const sessionState = await getSessionState("live-sess-1", env);

      const res = await runTool(
        {
          tool_name: "serpapi.search",
          arguments: {
            params: {
              q: "Cloudflare Workers",
              engine: "google_light",
            },
            mode: "compact",
          },
        },
        env,
        sessionState
      );

      expect(res.error).toBeUndefined();
      expect(res.result).toBeDefined();

      const resultObj = res.result as any;
      expect(resultObj.organic_results || resultObj.content).toBeDefined();
      if (resultObj.organic_results) {
        expect(resultObj.organic_results.length).toBeGreaterThan(0);
      }
    }, 20000);

    it("executes live codemode search & filter in isolated V8 sandbox", async () => {
      if (!liveKey) {
        console.warn("Skipping live SerpApi codemode test: SERPAPI_API_KEY not configured.");
        return;
      }

      const mockKV = createMockKV();
      const env: Env = {
        SESSION_KV: mockKV,
        SERPAPI_API_KEY: liveKey,
      };

      const sessionState = await getSessionState("live-sess-2", env);
      const ctx = createMockDurableObjectState();

      const runtime = createSpikeCodemodeRuntime(ctx, env, sessionState, {
        loader: new MockWorkerLoader(),
      });

      const code = `async () => {
        const searchRes = await serpapi.search({
          params: { q: "Cloudflare Workers Durable Objects", engine: "google_light" },
          mode: "compact"
        });
        const organic = searchRes.organic_results || [];
        return {
          query: "Cloudflare Workers Durable Objects",
          found: organic.length,
          firstTitle: organic[0] ? organic[0].title : null
        };
      }`;

      const res = await runtime.execute({ code });
      expect(res.status).toBe("completed");
      if (res.status === "completed") {
        const result = res.result as any;
        expect(result.found).toBeGreaterThan(0);
        expect(result.firstTitle).toBeTypeOf("string");
      }
    }, 20000);
  });

  describe("Progressive Gateway Integration (lib/mcp-gateway & lib/mcp-data)", () => {
    it("includes SerpApi in MCP_REGISTRY_SERVERS and default installed servers", async () => {
      const { MCP_REGISTRY_SERVERS } = await import("../lib/mcp-registry-data.js");
      const { ALL_TOOLS } = await import("../lib/mcp-gateway.js");
      const { MCP_CATEGORIES } = await import("../lib/mcp-data.js");

      // Verify registry data
      const serpRegistry = MCP_REGISTRY_SERVERS.find(
        (s) => s.id === "serpapi/serpapi-mcp" || s.id.includes("serpapi")
      );
      expect(serpRegistry).toBeDefined();
      expect(serpRegistry?.name).toContain("SerpApi");

      // Verify categories
      const serpCategory = MCP_CATEGORIES.find((c) => c.id === "serpapi");
      expect(serpCategory).toBeDefined();
      expect(serpCategory?.tools.some((t) => t.name === "serpapi_search")).toBe(true);

      // Verify catalog tools
      expect(ALL_TOOLS["serpapi_search"]).toBeDefined();
      expect(ALL_TOOLS["serpapi.search"]).toBeDefined();
      expect(typeof ALL_TOOLS["serpapi_search"].handler).toBe("function");
    });
  });
});
