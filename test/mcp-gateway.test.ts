import { describe, it, expect, beforeEach } from "vitest";
import {
  dispatchJsonRpc,
  getOrCreateSession,
  resetSession,
  GATEWAY_TOOL_NAMES,
  UNIVERSAL_GATEWAY_TOOL_NAMES,
  ALL_TOOLS,
} from "@/lib/mcp-gateway";
import { POST as mcpPost, GET as mcpGet, OPTIONS as mcpOptions } from "@/app/api/mcp/route";
import { GET as sseGet } from "@/app/api/mcp/sse/route";

describe("Progressive Context Disclosure MCP Gateway", () => {
  const sessionId = "test-session-123";

  beforeEach(() => {
    resetSession(sessionId);
  });

  describe("JSON-RPC 2.0 Handshake & Bootstrap", () => {
    it("handles 'initialize' method with protocol negotiation", async () => {
      const response = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: { tools: { listChanged: true } },
            clientInfo: { name: "Cursor", version: "0.45.0" },
          },
        },
        { sessionId }
      );

      expect(response).not.toBeNull();
      expect(response?.id).toBe(1);
      expect(response?.result).toEqual({
        protocolVersion: "2024-11-05",
        capabilities: { tools: { listChanged: true } },
        serverInfo: {
          name: "spike-land-gateway",
          version: "1.0.0-mvp",
        },
      });
    });

    it("returns ONLY the 5 Gateway Meta-Tools on initial 'tools/list'", async () => {
      const response = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list",
          params: {},
        },
        { sessionId }
      );

      expect(response?.id).toBe(2);
      const tools = (response?.result as { tools: Array<{ name: string }> }).tools;
      expect(tools).toHaveLength(5);
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toEqual(expect.arrayContaining([...GATEWAY_TOOL_NAMES]));
    });

    it("handles 'notifications/initialized' silently", async () => {
      const response = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          method: "notifications/initialized",
          params: {},
        },
        { sessionId }
      );

      expect(response).toBeNull();
    });

    it("handles 'ping' successfully", async () => {
      const response = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 3,
          method: "ping",
        },
        { sessionId }
      );

      expect(response?.result).toEqual({});
    });
  });

  describe("Progressive Tool Discovery & Schema Hydration", () => {
    it("search_tools discovers tools and auto-hydrates them into active session", async () => {
      // 1. Call search_tools for "image"
      const searchCall = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 4,
          method: "tools/call",
          params: {
            name: "search_tools",
            arguments: { query: "image", limit: 5 },
          },
        },
        { sessionId }
      );

      expect(searchCall?.error).toBeUndefined();
      const contentText = (searchCall?.result as { content: Array<{ text: string }> }).content[0].text;
      const parsedOutput = JSON.parse(contentText);
      expect(parsedOutput.matchedCount).toBeGreaterThan(0);
      const matchedNames = parsedOutput.tools.map((t: { name: string }) => t.name);
      expect(matchedNames).toContain("generate_image");

      // 2. tools/list should now include the newly discovered tools!
      const listResponse = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 5,
          method: "tools/list",
        },
        { sessionId }
      );

      const tools = (listResponse?.result as { tools: Array<{ name: string }> }).tools;
      const toolNames = tools.map((t) => t.name);
      expect(toolNames.length).toBeGreaterThan(5);
      expect(toolNames).toContain("generate_image");
    });

    it("enable_category dynamically mounts all category tools into session", async () => {
      const enableCall = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 6,
          method: "tools/call",
          params: {
            name: "enable_category",
            arguments: { category: "Development" },
          },
        },
        { sessionId }
      );

      expect(enableCall?.error).toBeUndefined();
      const contentText = (enableCall?.result as { content: Array<{ text: string }> }).content[0].text;
      const parsedOutput = JSON.parse(contentText);
      expect(parsedOutput.status).toBe("success");
      expect(parsedOutput.category).toBe("Development");
      expect(parsedOutput.tools).toContain("code_runner");

      // Verify tools/list has all development tools now
      const listResponse = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 7,
          method: "tools/list",
        },
        { sessionId }
      );

      const toolNames = (listResponse?.result as { tools: Array<{ name: string }> }).tools.map((t) => t.name);
      expect(toolNames).toContain("code_runner");
      expect(toolNames).toContain("git_diff_viewer");
    });

    it("list_categories returns category details and status", async () => {
      const call = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 8,
          method: "tools/call",
          params: {
            name: "list_categories",
            arguments: {},
          },
        },
        { sessionId }
      );

      const text = (call?.result as { content: Array<{ text: string }> }).content[0].text;
      const data = JSON.parse(text);
      expect(data.totalCategories).toBe(88);
      expect(data.categories.length).toBeGreaterThan(5);
      expect(data.categories[0]).toHaveProperty("id");
      expect(data.categories[0]).toHaveProperty("count");
    });

    it("get_balance and get_status return valid telemetry", async () => {
      const balanceCall = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 9,
          method: "tools/call",
          params: { name: "get_balance" },
        },
        { sessionId }
      );

      const balanceData = JSON.parse((balanceCall?.result as { content: Array<{ text: string }> }).content[0].text);
      expect(balanceData.balance).toBe(1450.0);
      expect(balanceData.currency).toBe("credits");

      const statusCall = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 10,
          method: "tools/call",
          params: { name: "get_status" },
        },
        { sessionId }
      );

      const statusData = JSON.parse((statusCall?.result as { content: Array<{ text: string }> }).content[0].text);
      expect(statusData.status).toBe("healthy");
      expect(statusData.features.progressiveDisclosure).toBe(true);
    });
  });

  describe("Execution & Auto-Hydration Fallbacks", () => {
    it("auto-hydrates an unmounted tool when invoked directly via tools/call", async () => {
      // "seo_audit" is not in gateway tools and category is not enabled
      const call = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 11,
          method: "tools/call",
          params: {
            name: "seo_audit",
            arguments: { url: "https://spike.land/mcp" },
          },
        },
        { sessionId }
      );

      expect(call?.error).toBeUndefined();
      const content = (call?.result as { content: Array<{ text: string }> }).content;
      expect(content.some((c) => c.text.includes("[Info: Tool 'seo_audit' was auto-mounted"))).toBe(true);
      const dataText = content[content.length - 1].text;
      expect(dataText).toContain("https://spike.land/mcp");

      // Verify that seo_audit is now in the active tools for the session
      const listResponse = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 12,
          method: "tools/list",
        },
        { sessionId }
      );

      const toolNames = (listResponse?.result as { tools: Array<{ name: string }> }).tools.map((t) => t.name);
      expect(toolNames).toContain("seo_audit");
    });

    it("returns error code -32601 with hint if tool does not exist", async () => {
      const call = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 13,
          method: "tools/call",
          params: {
            name: "non_existent_tool_xyz",
            arguments: {},
          },
        },
        { sessionId }
      );

      expect(call?.error).toBeDefined();
      expect(call?.error?.code).toBe(-32601);
      expect(call?.error?.message).toContain("Tool not found. Use search_tools to discover available capabilities.");
    });
  });

  describe("Multi-Registry MCP Integration (Sprint 2)", () => {
    it("mcp_registry_search queries across external registries", async () => {
      const searchCall = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 14,
          method: "tools/call",
          params: {
            name: "mcp_registry_search",
            arguments: { query: "postgres", registry: "all" },
          },
        },
        { sessionId }
      );

      expect(searchCall?.error).toBeUndefined();
      const content = (searchCall?.result as { content: Array<{ text: string }> }).content;
      const data = JSON.parse(content[content.length - 1].text);
      expect(data.servers.length).toBeGreaterThan(0);
      expect(data.servers[0].id).toBe("modelcontextprotocol/server-postgres");
      expect(data.servers[0].registrySource).toBe("official");
    });

    it("mcp_registry_get returns server manifest and environment requirements", async () => {
      const getCall = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 15,
          method: "tools/call",
          params: {
            name: "mcp_registry_get",
            arguments: { serverId: "modelcontextprotocol/server-postgres" },
          },
        },
        { sessionId }
      );

      expect(getCall?.error).toBeUndefined();
      const content = (getCall?.result as { content: Array<{ text: string }> }).content;
      const data = JSON.parse(content[content.length - 1].text);
      expect(data.id).toBe("modelcontextprotocol/server-postgres");
      expect(data.requiredEnv).toHaveProperty("DATABASE_URL");
      expect(data.tools).toContain("query");
    });

    it("mcp_registry_install generates ready-to-copy snippet and mounts server", async () => {
      const installCall = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 16,
          method: "tools/call",
          params: {
            name: "mcp_registry_install",
            arguments: {
              serverId: "@smithery/sqlite",
              clientType: "cursor",
              envVariables: { SQLITE_PATH: "./mydb.sqlite" },
            },
          },
        },
        { sessionId }
      );

      expect(installCall?.error).toBeUndefined();
      const content = (installCall?.result as { content: Array<{ text: string }> }).content;
      const data = JSON.parse(content[content.length - 1].text);
      expect(data.status).toBe("mounted");
      expect(data.proxyUrl).toContain("api/mcp/proxy/%40smithery%2Fsqlite");
      expect(data.snippet).toBeDefined();

      // Check mcp_registry_list_installed includes mounted server
      const listInstalled = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 17,
          method: "tools/call",
          params: { name: "mcp_registry_list_installed" },
        },
        { sessionId }
      );

      const installedContent = (listInstalled?.result as { content: Array<{ text: string }> }).content;
      const installedData = JSON.parse(installedContent[installedContent.length - 1].text);
      const ids = installedData.servers.map((s: { id: string }) => s.id);
      expect(ids).toContain("@smithery/sqlite");
    });
  });

  describe("API Endpoints Integration", () => {
    it("POST /api/mcp handles initialize request", async () => {
      const req = new Request("https://next.spike.land/api/mcp?sessionId=api-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 101,
          method: "initialize",
          params: {},
        }),
      });

      const res = await mcpPost(req);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { id: number; result: { serverInfo: { name: string } } };
      expect(json.id).toBe(101);
      expect(json.result.serverInfo.name).toBe("spike-land-gateway");
    });

    it("GET /api/mcp returns gateway diagnostics and tools summary", async () => {
      const req = new Request("https://next.spike.land/api/mcp");
      const res = await mcpGet(req);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { name: string; gatewayTools: unknown[] };
      expect(json.name).toBe("spike-land-gateway");
      expect(json.gatewayTools).toHaveLength(5);
    });

    it("OPTIONS /api/mcp returns 204 with CORS headers", async () => {
      const res = await mcpOptions();
      expect(res.status).toBe(204);
      expect(res.headers.get("access-control-allow-origin")).toBe("*");
    });

    it("GET /api/mcp/sse initiates SSE stream and emits endpoint event", async () => {
      const req = new Request("https://next.spike.land/api/mcp/sse?sessionId=sse-test");
      const res = await sseGet(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");

      // Read initial chunk from stream
      const reader = res.body?.getReader();
      expect(reader).toBeDefined();
      if (reader) {
        const { value } = await reader.read();
        const text = new TextDecoder().decode(value);
        expect(text).toContain("event: endpoint");
        expect(text).toContain("/api/mcp?sessionId=sse-test");
        await reader.cancel();
      }
    });
  });

  describe("Universal 3-Tool Gateway Suite & Investor Telemetry", () => {
    const uniSessionId = "universal-session-999";

    beforeEach(() => {
      resetSession(uniSessionId);
    });

    it("returns ONLY the 3 Universal Gateway tools when initialized with universal profile", async () => {
      await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            profile: "universal",
            clientInfo: { name: "Claude Code", version: "1.0.0" },
          },
        },
        { sessionId: uniSessionId, profile: "universal" }
      );

      const listResponse = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list",
          params: {},
        },
        { sessionId: uniSessionId, profile: "universal" }
      );

      const tools = (listResponse?.result as { tools: Array<{ name: string }> }).tools;
      expect(tools).toHaveLength(3);
      const names = tools.map((t) => t.name);
      expect(names).toEqual(expect.arrayContaining([...UNIVERSAL_GATEWAY_TOOL_NAMES]));
    });

    it("discover_tools dynamically searches and mounts tools by intent", async () => {
      const call = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 10,
          method: "tools/call",
          params: {
            name: "discover_tools",
            arguments: { query: "scrape web page", limit: 3 },
          },
        },
        { sessionId: uniSessionId }
      );

      expect(call?.error).toBeUndefined();
      const text = (call?.result as { content: Array<{ text: string }> }).content[0].text;
      const parsed = JSON.parse(text);
      expect(parsed.status).toBe("Tools dynamically mounted to session");
      expect(parsed.estimatedTokenSavings).toBe("98.2%");
      expect(parsed.matchedTools.length).toBeGreaterThan(0);
    });

    it("run_tool executes an unmounted tool directly and auto-hydrates it", async () => {
      const call = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 11,
          method: "tools/call",
          params: {
            name: "run_tool",
            arguments: {
              tool_name: "generate_image",
              arguments: { prompt: "hyper-realistic quantum computer" },
            },
          },
        },
        { sessionId: uniSessionId }
      );

      expect(call?.error).toBeUndefined();
      const text = (call?.result as { content: Array<{ text: string }> }).content[0].text;
      const parsed = JSON.parse(text);
      expect(parsed.status).toBe("success");
      expect(parsed.executedTool).toBe("generate_image");
    });

    it("get_gateway_status calculates real-time token savings and edge datacenter", async () => {
      // Simulate 2 calls
      await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 20,
          method: "tools/call",
          params: {
            name: "discover_tools",
            arguments: { query: "database query" },
          },
        },
        { sessionId: uniSessionId, colo: "SFO" }
      );

      const statusCall = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 21,
          method: "tools/call",
          params: {
            name: "get_gateway_status",
            arguments: {},
          },
        },
        { sessionId: uniSessionId, colo: "SFO" }
      );

      expect(statusCall?.error).toBeUndefined();
      const text = (statusCall?.result as { content: Array<{ text: string }> }).content[0].text;
      const status = JSON.parse(text);
      expect(status.service).toContain("Progressive MCP Gateway");
      expect(status.cloudflareEdgeColo).toBe("SFO");
      expect(status.sessionTurns).toBeGreaterThanOrEqual(2);
      expect(status.percentageContextSaved).toContain("%");
      expect(status.tokensSavedThisSession).toBeGreaterThan(40000);
    });
  });
});
