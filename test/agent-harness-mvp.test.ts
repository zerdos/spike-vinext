import { describe, it, expect, vi, beforeEach } from "vitest";
import worker, {
  mountMcpServer,
  discoverTools,
  runTool,
  executeAgentLoop,
  validateUpstreamUrl,
  detectPlaintextSecret,
  isValidNamespace,
  Env,
  SessionState,
  ChatMessage,
  LLMCompletionHandler,
  MAX_PAYLOAD_CHARS,
  HANDSHAKE_TIMEOUT_MS,
  EXECUTION_TIMEOUT_MS,
} from "../src/index.js";

function createMockKV(): KVNamespace {
  const map = new Map<string, string>();
  return {
    async get(key: string, options?: any) {
      const val = map.get(key);
      if (val === undefined) return null;
      if (options === "json" || options?.type === "json") {
        try {
          return JSON.parse(val);
        } catch {
          return null;
        }
      }
      return val;
    },
    async put(key: string, value: any) {
      map.set(key, typeof value === "string" ? value : JSON.stringify(value));
    },
    async delete(key: string) {
      map.delete(key);
    },
  } as unknown as KVNamespace;
}

describe("Cloudflare Agent Harness + Spike Land Meta-MCP (MVP)", () => {
  let mockKV: KVNamespace;
  let env: Env;

  beforeEach(() => {
    mockKV = createMockKV();
    env = {
      SESSION_KV: mockKV,
      LLM_API_KEY: "test-llm-key",
      GITHUB_TOKEN: "mock_gh_token_value_xyz",
      PG_SECRET: "mock_pg_secret_value_123",
    };
  });

  describe("Security Guardrails & Validation", () => {
    it("validates namespace against ^[a-z0-9_]{2,16}$", () => {
      expect(isValidNamespace("pg")).toBe(true);
      expect(isValidNamespace("spike_1")).toBe(true);
      expect(isValidNamespace("github_tools")).toBe(true);
      expect(isValidNamespace("a")).toBe(false); // too short
      expect(isValidNamespace("too_long_namespace_more_than_16")).toBe(false); // too long
      expect(isValidNamespace("PG")).toBe(false); // uppercase
      expect(isValidNamespace("pg-tool")).toBe(false); // hyphen
      expect(isValidNamespace("pg.tool")).toBe(false); // dot
    });

    it("enforces HTTPS protocol for upstream MCP URLs", () => {
      const httpResult = validateUpstreamUrl("http://api.example.com/mcp");
      expect(httpResult.valid).toBe(false);
      expect(httpResult.error).toContain("HTTPS");

      const httpsResult = validateUpstreamUrl("https://api.example.com/mcp");
      expect(httpsResult.valid).toBe(true);
    });

    it("blocks private/loopback IP ranges and SSRF targets", () => {
      expect(validateUpstreamUrl("https://127.0.0.1/mcp").valid).toBe(false);
      expect(validateUpstreamUrl("https://10.0.1.5/mcp").valid).toBe(false);
      expect(validateUpstreamUrl("https://192.168.1.1/mcp").valid).toBe(false);
      expect(validateUpstreamUrl("https://172.16.0.1/mcp").valid).toBe(false);
      expect(validateUpstreamUrl("https://169.254.169.254/latest/meta-data").valid).toBe(false);
      expect(validateUpstreamUrl("https://0.0.0.0/mcp").valid).toBe(false);
      expect(validateUpstreamUrl("https://service.internal/mcp").valid).toBe(false);
      expect(validateUpstreamUrl("https://cluster.local/mcp").valid).toBe(false);
    });

    it("prevents recursive self-mounting of internal Spike Land gateway", () => {
      const recursionCheck = validateUpstreamUrl("https://mcp.spike.land/api/mcp");
      expect(recursionCheck.valid).toBe(false);
      expect(recursionCheck.error).toContain("Recursion Protection");

      const nonRecursiveCheck = validateUpstreamUrl("https://mcp.spike.land/mcp");
      expect(nonRecursiveCheck.valid).toBe(true);
    });

    it("detects plaintext high-entropy secrets and bearer prefixes", () => {
      const mockSkLive = ["sk", "live", "mock1234567890abcdef12345678"].join("_");
      const mockGhp = ["ghp", "mock1234567890abcdef1234567890"].join("_");
      const mockSkTest = ["sk", "test", "mock123456789012345678"].join("_");

      expect(detectPlaintextSecret(mockSkLive)).toBe(true);
      expect(detectPlaintextSecret(mockGhp)).toBe(true);
      expect(detectPlaintextSecret("Bearer abcdef1234567890abcdef12345678")).toBe(true);
      expect(detectPlaintextSecret({ key: mockSkTest })).toBe(true);

      // Environment variable references must NOT be treated as plaintext secrets
      expect(detectPlaintextSecret("GITHUB_TOKEN")).toBe(false);
      expect(detectPlaintextSecret("env:GITHUB_TOKEN")).toBe(false);
      expect(detectPlaintextSecret("vault:PG_SECRET")).toBe(false);
    });
  });

  describe("AC2: Token Capping on mount_mcp_server", () => {
    it("ensures mount_mcp_server output never exceeds 100 tokens regardless of upstream tool count", async () => {
      // Simulate upstream with 100 tools
      const hundredTools = Array.from({ length: 100 }, (_, i) => ({
        name: `tool_operation_${i + 1}`,
        description: `This is a very detailed tool description for database operation number ${i + 1} with extensive metadata.`,
        inputSchema: { type: "object", properties: { id: { type: "string" } } },
      }));

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            result: { tools: hundredTools },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const sessionState: SessionState = { sessionId: "sess_ac2_test", mountedServers: {} };
      const output = await mountMcpServer(
        {
          url: "https://mcp.spike.land/mcp",
          namespace: "huge_srv",
        },
        env,
        sessionState,
        { fetchFn: mockFetch as unknown as typeof fetch }
      );

      expect("status" in output && output.status === "mounted").toBe(true);
      if ("status" in output && output.status === "mounted") {
        expect(output.toolCount).toBe(100);
        expect(output.sampleTools.length).toBe(3);
        expect(output.namespace).toBe("huge_srv");

        const jsonString = JSON.stringify(output);
        // Word count / character estimation: 100 tokens is ~350-400 characters
        // The output payload is ~200 characters, well under 100 tokens
        const estimatedTokens = Math.ceil(jsonString.length / 3.5);
        expect(estimatedTokens).toBeLessThan(100);
        expect(jsonString.length).toBeLessThan(400);
      }
    });
  });

  describe("AC3: Secret Protection & Injection", () => {
    it("rejects raw API keys passed in mount_mcp_server before outbound fetch", async () => {
      const mockFetch = vi.fn();
      const sessionState: SessionState = { sessionId: "sess_ac3_test", mountedServers: {} };
      const rawSecret = ["ghp", "mock1234567890abcdef1234567890"].join("_");

      // Raw token passed in authSecretName
      const result = await mountMcpServer(
        {
          url: "https://mcp.spike.land/mcp",
          namespace: "gh",
          authSecretName: rawSecret,
        },
        env,
        sessionState,
        { fetchFn: mockFetch as unknown as typeof fetch }
      );

      expect(mockFetch).not.toHaveBeenCalled();
      expect("error" in result && result.error.message).toContain("Security Error");
    });

    it("rejects raw API keys passed in run_tool arguments before outbound fetch", async () => {
      const mockFetch = vi.fn();
      const sessionState: SessionState = {
        sessionId: "sess_ac3_run_test",
        mountedServers: {
          gh: {
            namespace: "gh",
            url: "https://api.github.com/mcp",
            tools: [],
            mountedAt: Date.now(),
          },
        },
      };

      const rawApiKey = ["sk", "live", "mock1234567890abcdef12345678"].join("_");

      const result = await runTool(
        {
          tool_name: "gh.create_repo",
          arguments: {
            repoName: "test-repo",
            apiKey: rawApiKey,
          },
        },
        env,
        sessionState,
        { fetchFn: mockFetch as unknown as typeof fetch }
      );

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.error?.message).toContain("Plaintext API keys/tokens detected");
    });

    it("correctly injects bearer tokens from Worker env using authSecretName (and env: prefix)", async () => {
      let capturedHeaders: HeadersInit | undefined;
      const mockFetch = vi.fn().mockImplementation((url, init) => {
        capturedHeaders = init.headers;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              result: {
                tools: [{ name: "query", description: "Run query", inputSchema: {} }],
              },
            }),
            { status: 200 }
          )
        );
      });

      const sessionState: SessionState = { sessionId: "sess_auth_inject", mountedServers: {} };

      // Mount with env:GITHUB_TOKEN
      const mountRes = await mountMcpServer(
        {
          url: "https://mcp.example.com/mcp",
          namespace: "gh",
          authSecretName: "env:GITHUB_TOKEN",
        },
        env,
        sessionState,
        { fetchFn: mockFetch as unknown as typeof fetch }
      );

      expect("status" in mountRes && mountRes.status).toBe("mounted");
      expect((capturedHeaders as Record<string, string>)["Authorization"]).toBe(
        "Bearer mock_gh_token_value_xyz"
      );

      // Verify proxied run_tool also injects the secret
      let runHeaders: HeadersInit | undefined;
      const mockRunFetch = vi.fn().mockImplementation((url, init) => {
        runHeaders = init.headers;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              result: { success: true },
            }),
            { status: 200 }
          )
        );
      });

      await runTool(
        {
          tool_name: "gh.query",
          arguments: { q: "test" },
        },
        env,
        sessionState,
        { fetchFn: mockRunFetch as unknown as typeof fetch }
      );

      expect((runHeaders as Record<string, string>)["Authorization"]).toBe(
        "Bearer mock_gh_token_value_xyz"
      );
    });
  });

  describe("AC4: Payload & Timeout Safety", () => {
    it("aborts cleanly with structured error if upstream execution exceeds 15s", async () => {
      const mockSlowFetch = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          }, 10);
        });
      });

      const sessionState: SessionState = {
        sessionId: "sess_timeout_test",
        mountedServers: {
          slow_srv: {
            namespace: "slow_srv",
            url: "https://mcp.slow.com/mcp",
            tools: [],
            mountedAt: Date.now(),
          },
        },
      };

      const result = await runTool(
        {
          tool_name: "slow_srv.long_query",
          arguments: { timeout: true },
        },
        env,
        sessionState,
        { fetchFn: mockSlowFetch as unknown as typeof fetch }
      );

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe(-32000);
      expect(result.error?.message).toContain("timed out");
    });

    it("truncates responses exceeding 32 KB without crashing", async () => {
      // 50 KB response
      const largeData = "x".repeat(50000);
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(largeData, { status: 200, headers: { "Content-Type": "text/plain" } })
      );

      const sessionState: SessionState = {
        sessionId: "sess_trunc_test",
        mountedServers: {
          data_srv: {
            namespace: "data_srv",
            url: "https://mcp.data.com/mcp",
            tools: [],
            mountedAt: Date.now(),
          },
        },
      };

      const result = await runTool(
        {
          tool_name: "data_srv.get_huge_data",
          arguments: {},
        },
        env,
        sessionState,
        { fetchFn: mockFetch as unknown as typeof fetch }
      );

      expect(result.result).toBeDefined();
      const resultText = String(result.result);
      expect(resultText.length).toBe(MAX_PAYLOAD_CHARS + "\n...[TRUNCATED BY EDGE HARNESS]".length);
      expect(resultText).toContain("...[TRUNCATED BY EDGE HARNESS]");
    });
  });

  describe("6.2 Keyword Discovery (discover_tools)", () => {
    it("scores tools by token overlap and applies 2x weight when query starts with tool namespace", () => {
      const sessionState: SessionState = {
        sessionId: "sess_disc_test",
        mountedServers: {
          pg: {
            namespace: "pg",
            url: "https://mcp.pg.com/mcp",
            mountedAt: Date.now(),
            tools: [
              {
                namespacedName: "pg.describe_table",
                upstreamName: "describe_table",
                namespace: "pg",
                description: "Inspects schema, columns, foreign keys for a table",
                inputSchema: { type: "object", properties: { table: { type: "string" } } },
              },
              {
                namespacedName: "pg.query",
                upstreamName: "query",
                namespace: "pg",
                description: "Run SQL query on postgres",
                inputSchema: { type: "object", properties: { sql: { type: "string" } } },
              },
            ],
          },
          gh: {
            namespace: "gh",
            url: "https://mcp.gh.com/mcp",
            mountedAt: Date.now(),
            tools: [
              {
                namespacedName: "gh.describe_repo",
                upstreamName: "describe_repo",
                namespace: "gh",
                description: "Inspects github repository schema and metadata",
                inputSchema: { type: "object", properties: { repo: { type: "string" } } },
              },
            ],
          },
        },
      };

      // Query starting with "pg" -> pg tools get 2x weight
      const matches = discoverTools({ query: "pg describe" }, sessionState);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].namespacedName).toBe("pg.describe_table");
      expect(matches.length).toBeLessThanOrEqual(3);
    });
  });

  describe("AC1: Zero-Restart Mount & Execute in Single /chat Turn", () => {
    it("runs mount -> discover -> run in a single request execution loop", async () => {
      // Mock upstream server
      const mockUpstreamFetch = vi.fn().mockImplementation((url, init) => {
        const body = JSON.parse(init.body);
        if (body.method === "tools/list") {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                result: {
                  tools: [
                    {
                      name: "describe_table",
                      description: "Inspects columns for postgres table",
                      inputSchema: {
                        type: "object",
                        properties: { table: { type: "string" } },
                        required: ["table"],
                      },
                    },
                  ],
                },
              }),
              { status: 200 }
            )
          );
        }
        if (body.method === "tools/call") {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                jsonrpc: "2.0",
                id: 2,
                result: {
                  table: "users",
                  columns: ["id", "email", "created_at"],
                },
              }),
              { status: 200 }
            )
          );
        }
        return Promise.reject(new Error("Unknown method"));
      });

      // Mock LLM simulating multi-turn reasoning within a single POST /chat call:
      // Turn 1: LLM calls mount_mcp_server
      // Turn 2: LLM calls discover_tools
      // Turn 3: LLM calls run_tool
      // Turn 4: LLM outputs final answer
      let turnCounter = 0;
      const mockLLMHandler: LLMCompletionHandler = async (messages, tools) => {
        turnCounter++;
        if (turnCounter === 1) {
          return {
            content: null,
            tool_calls: [
              {
                id: "call_mount_1",
                type: "function",
                function: {
                  name: "mount_mcp_server",
                  arguments: JSON.stringify({
                    url: "https://mcp.spike.land/mcp",
                    namespace: "pg",
                  }),
                },
              },
            ],
          };
        }
        if (turnCounter === 2) {
          return {
            content: null,
            tool_calls: [
              {
                id: "call_disc_2",
                type: "function",
                function: {
                  name: "discover_tools",
                  arguments: JSON.stringify({ query: "pg describe table" }),
                },
              },
            ],
          };
        }
        if (turnCounter === 3) {
          return {
            content: null,
            tool_calls: [
              {
                id: "call_run_3",
                type: "function",
                function: {
                  name: "run_tool",
                  arguments: JSON.stringify({
                    tool_name: "pg.describe_table",
                    arguments: { table: "users" },
                  }),
                },
              },
            ],
          };
        }
        return {
          content: "The users table contains columns: id, email, created_at.",
          tool_calls: [],
        };
      };

      const chatResponse = await executeAgentLoop(
        {
          sessionId: "sess_ac1_pipeline",
          message: "Check the columns of the users table on our postgres server",
        },
        env,
        {
          llmHandler: mockLLMHandler,
          fetchFn: mockUpstreamFetch as unknown as typeof fetch,
        }
      );

      expect(chatResponse.toolsUsed).toEqual(["mount_mcp_server", "discover_tools", "run_tool"]);
      expect(chatResponse.response).toContain("The users table contains columns: id, email, created_at");
      expect(chatResponse.turns).toBe(4);

      // Verify KV session contains the mounted server
      const savedSession = (await mockKV.get("session:sess_ac1_pipeline", "json")) as SessionState;
      expect(savedSession.mountedServers["pg"]).toBeDefined();
      expect(savedSession.mountedServers["pg"].tools[0].namespacedName).toBe("pg.describe_table");
    });
  });

  describe("Worker HTTP Endpoint (POST /chat)", () => {
    it("handles /health GET request", async () => {
      const req = new Request("https://worker.local/health", { method: "GET" });
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("healthy");
      expect(data.tools).toEqual(["mount_mcp_server", "discover_tools", "run_tool"]);
    });

    it("rejects non-POST requests to /chat", async () => {
      const req = new Request("https://worker.local/chat", { method: "GET" });
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(405);
    });

    it("handles CORS OPTIONS preflight", async () => {
      const req = new Request("https://worker.local/chat", { method: "OPTIONS" });
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("returns 400 on invalid JSON or missing messages", async () => {
      const req = new Request("https://worker.local/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json",
      });
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(400);

      const reqMissing = new Request("https://worker.local/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const resMissing = await worker.fetch(reqMissing, env);
      expect(resMissing.status).toBe(400);
    });

    it("handles agent execution failure gracefully with HTTP 500", async () => {
      const badEnv: Env = {
        SESSION_KV: mockKV,
        LLM_API_KEY: "", // missing API key will cause default completion handler to throw
        GEMINI_API_KEY: "",
      };

      const req = new Request("https://worker.local/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Hello without key" }),
      });
      const res = await worker.fetch(req, badEnv);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe("Agent execution failed.");
      expect(data.details).toContain("Missing GEMINI_API_KEY or LLM_API_KEY");
    });

    it("works with GEMINI_API_KEY and routes to Google OpenAI-compatible endpoint", async () => {
      const geminiEnv: Env = {
        SESSION_KV: mockKV,
        GEMINI_API_KEY: "mock-gemini-key-12345",
      };

      let capturedUrl = "";
      let capturedHeaders: HeadersInit | undefined;
      let capturedBody: any;

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockImplementation((url, init) => {
        capturedUrl = String(url);
        capturedHeaders = init?.headers;
        capturedBody = init?.body ? JSON.parse(String(init.body)) : null;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: "Hello from Gemini!",
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
        const req = new Request("https://worker.local/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Hello Gemini" }),
        });
        const res = await worker.fetch(req, geminiEnv);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.response).toBe("Hello from Gemini!");

        expect(capturedUrl).toContain("generativelanguage.googleapis.com/v1beta/openai/chat/completions");
        expect((capturedHeaders as Record<string, string>)["Authorization"]).toBe("Bearer mock-gemini-key-12345");
        expect(capturedBody.model).toBe("gemini-flash-latest");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("Edge Cases & Robustness", () => {
    it("enforces max 5 loop steps to prevent runaway tool loops", async () => {
      let stepCount = 0;
      // LLM continuously emits discover_tools forever
      const runawayLLMHandler: LLMCompletionHandler = async () => {
        stepCount++;
        return {
          content: null,
          tool_calls: [
            {
              id: `call_${stepCount}`,
              type: "function",
              function: {
                name: "discover_tools",
                arguments: JSON.stringify({ query: "pg" }),
              },
            },
          ],
        };
      };

      const sessionState: SessionState = { sessionId: "sess_runaway", mountedServers: {} };
      const chatResponse = await executeAgentLoop(
        {
          sessionId: "sess_runaway",
          message: "Keep calling tools",
        },
        env,
        {
          llmHandler: runawayLLMHandler,
          maxSteps: 5,
        }
      );

      // Loop must terminate after at most 5 turns
      expect(chatResponse.turns).toBeLessThanOrEqual(5);
    });

    it("returns -32602 error for non-namespaced tool_name in run_tool", async () => {
      const sessionState: SessionState = { sessionId: "sess_non_ns", mountedServers: {} };
      const res = await runTool(
        {
          tool_name: "query_without_namespace",
          arguments: {},
        },
        env,
        sessionState
      );

      expect(res.error).toBeDefined();
      expect(res.error?.code).toBe(-32602);
      expect(res.error?.message).toContain("Must be namespaced");
    });

    it("returns -32601 error when running a tool on an unmounted server", async () => {
      const sessionState: SessionState = { sessionId: "sess_unmounted", mountedServers: {} };
      const res = await runTool(
        {
          tool_name: "unmounted_ns.some_tool",
          arguments: {},
        },
        env,
        sessionState
      );

      expect(res.error).toBeDefined();
      expect(res.error?.code).toBe(-32601);
      expect(res.error?.message).toContain("is not mounted");
    });

    it("returns -32602 when authSecretName is not present in Worker env", async () => {
      const mockFetch = vi.fn();
      const sessionState: SessionState = { sessionId: "sess_missing_secret", mountedServers: {} };

      const res = await mountMcpServer(
        {
          url: "https://mcp.spike.land/mcp",
          namespace: "test_srv",
          authSecretName: "NON_EXISTENT_KEY",
        },
        env,
        sessionState,
        { fetchFn: mockFetch as unknown as typeof fetch }
      );

      expect(mockFetch).not.toHaveBeenCalled();
      expect("error" in res && res.error.message).toContain("not found in environment");
    });

    it("handles upstream HTTP errors during mount_mcp_server", async () => {
      const mock500Fetch = vi.fn().mockResolvedValue(
        new Response("Internal Server Error", { status: 500, statusText: "Internal Server Error" })
      );

      const sessionState: SessionState = { sessionId: "sess_500", mountedServers: {} };
      const res = await mountMcpServer(
        {
          url: "https://mcp.error.com/mcp",
          namespace: "err_srv",
        },
        env,
        sessionState,
        { fetchFn: mock500Fetch as unknown as typeof fetch }
      );

      expect("error" in res && res.error.code).toBe(-32000);
      expect("error" in res && res.error.message).toContain("HTTP 500");
    });

    it("handles upstream JSON-RPC errors returned by upstream MCP server", async () => {
      const mockErrorRpcFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            error: { code: -32603, message: "Custom upstream internal error" },
          }),
          { status: 200 }
        )
      );

      const sessionState: SessionState = { sessionId: "sess_rpc_err", mountedServers: {} };
      const res = await mountMcpServer(
        {
          url: "https://mcp.error.com/mcp",
          namespace: "err_rpc",
        },
        env,
        sessionState,
        { fetchFn: mockErrorRpcFetch as unknown as typeof fetch }
      );

      expect("error" in res && res.error.code).toBe(-32603);
      expect("error" in res && res.error.message).toContain("Custom upstream internal error");
    });

    it("supports native tool execution when registered", async () => {
      const sessionState: SessionState = { sessionId: "sess_native", mountedServers: {} };
      const nativeHandler = vi.fn().mockResolvedValue({ status: "native_ok", time: 123456 });

      const res = await runTool(
        {
          tool_name: "spike.ping",
          arguments: { echo: "hello" },
        },
        env,
        sessionState,
        {
          nativeHandlers: {
            "spike.ping": nativeHandler,
          },
        }
      );

      expect(nativeHandler).toHaveBeenCalledWith({ echo: "hello" });
      expect(res.result).toEqual({ status: "native_ok", time: 123456 });
    });
  });
});
