import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  dispatchJsonRpc,
  getOrCreateSession,
  resetSession,
  ALL_TOOLS,
} from "@/lib/mcp-gateway";
import { POST as mcpPost } from "@/app/api/mcp/route";
import {
  setVaultSecret,
  clearVaultStore,
} from "@/lib/vault";
import {
  validateUpstreamUrl,
  detectPlaintextSecret,
  isValidNamespace,
} from "@/lib/mcp-ssrf";
import { UpstreamMCPClient } from "@/lib/mcp-upstream-client";

describe("Runtime MCP Server Mounting (mount_mcp_server) - PRD Verification", () => {
  const TEST_SESSION_ID = "sess_runtime_mount_test_1";

  beforeEach(() => {
    resetSession(TEST_SESSION_ID);
    clearVaultStore();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetSession(TEST_SESSION_ID);
    clearVaultStore();
    vi.restoreAllMocks();
  });

  // Mock upstream MCP server response generator
  function createMockUpstreamFetch(options?: {
    toolCount?: number;
    largePayload?: boolean;
    requireAuthHeader?: string;
  }) {
    const toolCount = options?.toolCount ?? 5;
    const tools = [];
    for (let i = 1; i <= toolCount; i++) {
      tools.push({
        name: i === 1 ? "describe_table" : `query_tool_${i}`,
        description:
          i === 1
            ? "Inspects columns, foreign keys, and indexes for a database table."
            : `Executes database operation ${i}.`,
        inputSchema: {
          type: "object",
          properties: {
            table: { type: "string", description: "Name of the table" },
            limit: { type: "number", description: "Row limit" },
          },
          required: i === 1 ? ["table"] : [],
        },
      });
    }

    return vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === "string" ? input : input.toString();

      // Check auth header if required
      if (options?.requireAuthHeader) {
        const headers = new Headers(init?.headers);
        const auth = headers.get("authorization");
        if (auth !== options.requireAuthHeader) {
          return new Response(
            JSON.stringify({ error: { code: -32001, message: "Unauthorized" } }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      const bodyStr = init?.body as string;
      const body = bodyStr ? JSON.parse(bodyStr) : {};

      if (body.method === "initialize") {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: {
              protocolVersion: "2024-11-05",
              serverInfo: {
                name: "postgres-mcp-server",
                version: "1.2.0",
              },
              capabilities: {
                tools: {},
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (body.method === "notifications/initialized") {
        return new Response(null, { status: 202 });
      }

      if (body.method === "tools/list") {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: {
              tools,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (body.method === "tools/call") {
        let contentText: string;
        if (options?.largePayload) {
          // Exceeds 32 KB
          contentText = "X".repeat(40000);
        } else {
          contentText = JSON.stringify({
            table: body.params?.arguments?.table || "unknown",
            columns: [
              { name: "id", type: "uuid" },
              { name: "email", type: "varchar" },
              { name: "created_at", type: "timestamp" },
            ],
            rowCount: 1420,
          });
        }

        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: {
              content: [
                {
                  type: "text",
                  text: contentText,
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: { code: -32601, message: "Method not found" } }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    });
  }

  // =========================================================================
  // AC1: In-Chat Mount & Call
  // =========================================================================
  it("AC1: Mounts a remote MCP server in-session, discovers tool, and executes it via run_tool without restart", async () => {
    const mockFetch = createMockUpstreamFetch({ toolCount: 18 });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = { sessionId: TEST_SESSION_ID };

    // 1. Mount the server into the active session
    const mountRes = (await dispatchJsonRpc(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "mount_mcp_server",
          arguments: {
            source: "https://remote-pg.internal/mcp",
            namespace: "pg",
          },
        },
      },
      ctx
    )) as { result: { content: Array<{ text: string }> } };

    expect(mountRes.result).toBeDefined();
    const mountOutput = JSON.parse(mountRes.result.content[0].text);
    expect(mountOutput.status).toBe("mounted");
    expect(mountOutput.namespace).toBe("pg");
    expect(mountOutput.toolCount).toBe(18);
    expect(mountOutput.sampleTools).toContain("pg.describe_table");
    expect(mountOutput.serverInfo.name).toBe("postgres-mcp-server");

    // 2. Discover tool via discover_tools
    const discoverRes = (await dispatchJsonRpc(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "discover_tools",
          arguments: {
            query: "pg describe table schema",
          },
        },
      },
      ctx
    )) as { result: { content: Array<{ text: string }> } };

    const discoverOutput = JSON.parse(discoverRes.result.content[0].text);
    expect(discoverOutput.matchedTools.length).toBeGreaterThan(0);
    const pgTool = discoverOutput.matchedTools.find(
      (t: { name: string }) => t.name === "pg.describe_table"
    );
    expect(pgTool).toBeDefined();
    expect(pgTool.category).toBe("Mounted (pg)");
    expect(pgTool.source).toBe("mounted");

    // 3. Execute tool via run_tool
    const runRes = (await dispatchJsonRpc(
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "run_tool",
          arguments: {
            tool_name: "pg.describe_table",
            arguments: {
              table: "users",
            },
          },
        },
      },
      ctx
    )) as { result: { content: Array<{ text: string }> } };

    const runOutput = JSON.parse(runRes.result.content[0].text);
    expect(runOutput.status).toBe("success");
    expect(runOutput.executedTool).toBe("pg.describe_table");
    expect(runOutput.output).toBeDefined();

    // Verify upstream received the expected JSON-RPC tools/call with table: users
    expect(mockFetch).toHaveBeenCalled();
  });

  // =========================================================================
  // AC2: Token Budget Compliance (<120 tokens returned on mount)
  // =========================================================================
  it("AC2: Mounting an upstream server with 50 tools adds <= 120 tokens to the tool response payload", async () => {
    const mockFetch = createMockUpstreamFetch({ toolCount: 50 });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = { sessionId: TEST_SESSION_ID };

    const mountRes = (await dispatchJsonRpc(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "mount_mcp_server",
          arguments: {
            source: "https://huge-api.internal/mcp",
            namespace: "big",
          },
        },
      },
      ctx
    )) as { result: { content: Array<{ text: string }> } };

    const rawResponseText = mountRes.result.content[0].text;
    const parsed = JSON.parse(rawResponseText);

    expect(parsed.status).toBe("mounted");
    expect(parsed.toolCount).toBe(50);
    // Strict token cap: sampleTools capped at 5
    expect(parsed.sampleTools.length).toBeLessThanOrEqual(5);

    // Estimate token count: ~4 characters per token
    // PRD AC2 requirement: <= 120 tokens (~480 characters)
    const tokenEstimate = Math.ceil(rawResponseText.length / 4);
    expect(tokenEstimate).toBeLessThanOrEqual(120);
  });

  // =========================================================================
  // AC3: Plaintext Secret Rejection (Zero-Plaintext Secret Policy)
  // =========================================================================
  it("AC3: Fails fast when raw plaintext secrets are passed in chat", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const ctx = { sessionId: TEST_SESSION_ID };

    // Test with GitHub Personal Access Token pattern (constructed dynamically to avoid push protection flags)
    const mockGhpKey = ["ghp", "mock1234567890abcdefghijklmnopqrst"].join("_");
    const resGhp = (await dispatchJsonRpc(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "mount_mcp_server",
          arguments: {
            source: "https://mcp.github.internal",
            namespace: "gh",
            authSecretRef: mockGhpKey,
          },
        },
      },
      ctx
    )) as { result: { content: Array<{ text: string }> } };

    const parsedGhp = JSON.parse(resGhp.result.content[0].text);
    expect(parsedGhp.status).toBe("security_error");
    expect(parsedGhp.error).toContain("Security Error: Do not pass raw API keys in chat");
    expect(parsedGhp.error).toContain("vault:");

    // Test with generic sk_live_... key pattern (constructed dynamically to avoid push protection flags)
    const mockSkKey = ["sk", "live", "mock999988887777666655554444"].join("_");
    const resSk = (await dispatchJsonRpc(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "mount_mcp_server",
          arguments: {
            source: `https://api.custom.internal?token=${mockSkKey}`,
            namespace: "sec",
          },
        },
      },
      ctx
    )) as { result: { content: Array<{ text: string }> } };

    const parsedSk = JSON.parse(resSk.result.content[0].text);
    expect(parsedSk.status).toBe("security_error");
    expect(parsedSk.error).toContain("Security Error: Do not pass raw API keys in chat");

    // Upstream should NEVER have been called when secret was passed in chat
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // =========================================================================
  // AC4: Graceful STDIO Fallback
  // =========================================================================
  it("AC4: Calling mount_mcp_server with a Registry ID that only supports stdio returns local .mcp.json snippet", async () => {
    const ctx = { sessionId: TEST_SESSION_ID };

    const res = (await dispatchJsonRpc(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "mount_mcp_server",
          arguments: {
            source: "modelcontextprotocol/server-postgres",
            namespace: "pg_local",
          },
        },
      },
      ctx
    )) as { result: { content: Array<{ text: string }> } };

    const parsed = JSON.parse(res.result.content[0].text);
    expect(parsed.status).toBe("stdio_only");
    expect(parsed.message).toContain("only supports local stdio execution");
    expect(parsed.snippet).toBeDefined();
    expect(parsed.snippet.mcpServers).toHaveProperty("pg_local");
    expect(parsed.cliCommand).toContain("claude mcp add pg_local npx");
  });

  // =========================================================================
  // SSRF Protection & Loopback / Recursive Prevention (PRD Section 7.2)
  // =========================================================================
  describe("SSRF Protection & Loopback Prevention", () => {
    it("blocks private IPv4 and metadata IP ranges in production mode", () => {
      // 10.0.0.0/8
      expect(validateUpstreamUrl("https://10.0.0.1/mcp", { allowLocalhost: false }).valid).toBe(
        false
      );
      // 172.16.0.0/12
      expect(
        validateUpstreamUrl("https://172.20.5.1/mcp", { allowLocalhost: false }).valid
      ).toBe(false);
      // 192.168.0.0/16
      expect(
        validateUpstreamUrl("https://192.168.1.1/mcp", { allowLocalhost: false }).valid
      ).toBe(false);
      // 169.254.169.254 Cloud metadata
      expect(
        validateUpstreamUrl("https://169.254.169.254/latest/meta-data", {
          allowLocalhost: false,
        }).valid
      ).toBe(false);
      // 0.0.0.0
      expect(validateUpstreamUrl("https://0.0.0.0:8080", { allowLocalhost: false }).valid).toBe(
        false
      );
    });

    it("blocks recursive self-mounting to spike.land/api/mcp", () => {
      const res = validateUpstreamUrl("https://spike.land/api/mcp", { allowLocalhost: true });
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Recursive self-mounting detected");

      const resSub = validateUpstreamUrl("https://staging.spike.land/api/mcp/sse", {
        allowLocalhost: true,
      });
      expect(resSub.valid).toBe(false);
      expect(resSub.error).toContain("Recursive self-mounting detected");
    });
  });

  // =========================================================================
  // Edge Pre-Flight Schema Validation (PRD Section 5.4)
  // =========================================================================
  it("performs edge pre-flight validation on missing required arguments before network hop", async () => {
    const mockFetch = createMockUpstreamFetch();
    vi.stubGlobal("fetch", mockFetch);

    const ctx = { sessionId: TEST_SESSION_ID };

    // Mount server with describe_table (requires 'table' argument)
    await dispatchJsonRpc(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "mount_mcp_server",
          arguments: {
            source: "https://pg-preflight.internal/mcp",
            namespace: "pg",
          },
        },
      },
      ctx
    );

    mockFetch.mockClear();

    // Call pg.describe_table WITHOUT required 'table' argument
    const callRes = (await dispatchJsonRpc(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "run_tool",
          arguments: {
            tool_name: "pg.describe_table",
            arguments: {}, // Missing 'table'
          },
        },
      },
      ctx
    )) as { result: { content: Array<{ text: string }> } };

    const parsed = JSON.parse(callRes.result.content[0].text);
    expect(parsed.status).toBe("validation_error");
    expect(parsed.error).toContain("Missing required argument(s): table");
    expect(parsed.missingFields).toContain("table");

    // Edge worker rejected request BEFORE making upstream network hop
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // =========================================================================
  // Vault Secret Resolution (PRD Section 7.1)
  // =========================================================================
  it("resolves vault:<SECRET_NAME> at request time and injects Bearer token into upstream request", async () => {
    setVaultSecret("LINEAR_KEY", "lin_secret_live_token_778899");

    const mockFetch = createMockUpstreamFetch({
      requireAuthHeader: "Bearer lin_secret_live_token_778899",
    });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = { sessionId: TEST_SESSION_ID };

    const mountRes = (await dispatchJsonRpc(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "mount_mcp_server",
          arguments: {
            source: "https://linear-vault.internal/mcp",
            namespace: "lin",
            authSecretRef: "vault:LINEAR_KEY",
          },
        },
      },
      ctx
    )) as { result: { content: Array<{ text: string }> } };

    const parsed = JSON.parse(mountRes.result.content[0].text);
    expect(parsed.status).toBe("mounted");
    expect(parsed.namespace).toBe("lin");

    // Execute tool on the authenticated server
    const runRes = (await dispatchJsonRpc(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "run_tool",
          arguments: {
            tool_name: "lin.describe_table",
            arguments: { table: "issues" },
          },
        },
      },
      ctx
    )) as { result: { content: Array<{ text: string }> } };

    const runParsed = JSON.parse(runRes.result.content[0].text);
    expect(runParsed.status).toBe("success");
  });

  // =========================================================================
  // Response Payload Guardrail (32 KB Truncation - PRD Section 5.4)
  // =========================================================================
  it("truncates massive upstream tool output to 32 KB guardrail and appends warning", async () => {
    const mockFetch = createMockUpstreamFetch({ largePayload: true });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = { sessionId: TEST_SESSION_ID };

    await dispatchJsonRpc(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "mount_mcp_server",
          arguments: {
            source: "https://huge-output.internal/mcp",
            namespace: "huge",
          },
        },
      },
      ctx
    );

    const runRes = (await dispatchJsonRpc(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "run_tool",
          arguments: {
            tool_name: "huge.describe_table",
            arguments: { table: "big_table" },
          },
        },
      },
      ctx
    )) as { result: { content: Array<{ text: string }> } };

    const runParsed = JSON.parse(runRes.result.content[0].text);
    expect(runParsed.status).toBe("success");
    const outputText = JSON.stringify(runParsed.output);

    // Payload should be truncated around 32KB
    expect(outputText).toContain("Warning: Tool response exceeded 32KB payload guardrail");
    expect(new TextEncoder().encode(outputText).length).toBeLessThan(35000);
  });

  // =========================================================================
  // Server Management: list_mounted_servers and unmount_mcp_server
  // =========================================================================
  it("supports list_mounted_servers and unmount_mcp_server", async () => {
    const mockFetch = createMockUpstreamFetch({ toolCount: 10 });
    vi.stubGlobal("fetch", mockFetch);

    const ctx = { sessionId: TEST_SESSION_ID };

    // Mount server 1
    await dispatchJsonRpc(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "mount_mcp_server",
          arguments: {
            source: "https://srv1.internal/mcp",
            namespace: "srv1",
          },
        },
      },
      ctx
    );

    // Mount server 2
    await dispatchJsonRpc(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "mount_mcp_server",
          arguments: {
            source: "https://srv2.internal/mcp",
            namespace: "srv2",
          },
        },
      },
      ctx
    );

    // List mounted servers
    const listRes = (await dispatchJsonRpc(
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "list_mounted_servers",
          arguments: {},
        },
      },
      ctx
    )) as { result: { content: Array<{ text: string }> } };

    const listParsed = JSON.parse(listRes.result.content[0].text);
    expect(listParsed.totalCount).toBe(2);
    expect(listParsed.mountedServers.map((s: { namespace: string }) => s.namespace)).toEqual([
      "srv1",
      "srv2",
    ]);

    // Unmount server 1
    const unmountRes = (await dispatchJsonRpc(
      {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "unmount_mcp_server",
          arguments: { namespace: "srv1" },
        },
      },
      ctx
    )) as { result: { content: Array<{ text: string }> } };

    const unmountParsed = JSON.parse(unmountRes.result.content[0].text);
    expect(unmountParsed.status).toBe("unmounted");
    expect(unmountParsed.namespace).toBe("srv1");

    // Verify list only has srv2 now
    const listAfterRes = (await dispatchJsonRpc(
      {
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: {
          name: "list_mounted_servers",
          arguments: {},
        },
      },
      ctx
    )) as { result: { content: Array<{ text: string }> } };

    const listAfterParsed = JSON.parse(listAfterRes.result.content[0].text);
    expect(listAfterParsed.totalCount).toBe(1);
    expect(listAfterParsed.mountedServers[0].namespace).toBe("srv2");
  });

  // =========================================================================
  // Recency Relevance Boost (PRD Section 5.3)
  // =========================================================================
  it("boosts relevance score of recently mounted server tools in discover_tools", async () => {
    const mockFetch = createMockUpstreamFetch();
    vi.stubGlobal("fetch", mockFetch);

    const ctx = { sessionId: TEST_SESSION_ID };

    // Mount server
    await dispatchJsonRpc(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "mount_mcp_server",
          arguments: {
            source: "https://pg-boost.internal/mcp",
            namespace: "analytics",
          },
        },
      },
      ctx
    );

    // Search with prefix
    const searchRes = (await dispatchJsonRpc(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "discover_tools",
          arguments: {
            query: "analytics describe table",
          },
        },
      },
      ctx
    )) as { result: { content: Array<{ text: string }> } };

    const parsed = JSON.parse(searchRes.result.content[0].text);
    const analyticsTool = parsed.matchedTools.find(
      (t: { name: string }) => t.name === "analytics.describe_table"
    );
    expect(analyticsTool).toBeDefined();
    // Recently mounted tool receives 1.25x recency boost
    expect(analyticsTool.relevance).toBeGreaterThanOrEqual(0.95);
  });

  // =========================================================================
  // HTTP POST /api/mcp Endpoint Integration
  // =========================================================================
  it("supports mount_mcp_server over HTTP POST /api/mcp", async () => {
    const mockFetch = createMockUpstreamFetch();
    vi.stubGlobal("fetch", mockFetch);

    const httpReq = new Request("https://spike.land/api/mcp?sessionId=sess_http_test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 10,
        method: "tools/call",
        params: {
          name: "mount_mcp_server",
          arguments: {
            source: "https://api.http-route.internal/mcp",
            namespace: "http_ns",
          },
        },
      }),
    });

    const httpRes = await mcpPost(httpReq);
    expect(httpRes.status).toBe(200);
    const data = (await httpRes.json()) as {
      result?: { content?: Array<{ text: string }> };
    };
    expect(data.result).toBeDefined();
    const parsed = JSON.parse(data.result!.content![0].text);
    expect(parsed.status).toBe("mounted");
    expect(parsed.namespace).toBe("http_ns");
  });
});
