import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { dispatchJsonRpc, resetSession, ALL_TOOLS } from "@/lib/mcp-gateway";
import { POST as mcpPost } from "@/app/api/mcp/route";

describe("Durable Code Mode over MCP Gateway (tools/list & tools/call)", () => {
  const TEST_SESSION_ID = `sess_mcp_codemode_${crypto.randomUUID()}`;

  beforeEach(() => {
    resetSession(TEST_SESSION_ID);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetSession(TEST_SESSION_ID);
    vi.restoreAllMocks();
  });

  it("exposes all 5 durable Code Mode tools in MCP gateway and catalogue", async () => {
    expect(ALL_TOOLS["codemode"]).toBeDefined();
    expect(ALL_TOOLS["save_codemode_snippet"]).toBeDefined();
    expect(ALL_TOOLS["list_pending_executions"]).toBeDefined();
    expect(ALL_TOOLS["resolve_execution_approval"]).toBeDefined();
    expect(ALL_TOOLS["rollback_execution"]).toBeDefined();

    // Query virtual gateway for codemode
    const listReq = {
      jsonrpc: "2.0" as const,
      id: 1,
      method: "tools/list",
      params: {},
    };

    const res = await dispatchJsonRpc(listReq, {
      sessionId: TEST_SESSION_ID,
      gatewaySlug: "codemode",
    });

    expect(res).not.toBeNull();
    expect(res?.error).toBeUndefined();
    const tools = (res?.result as any)?.tools || [];
    const toolNames = tools.map((t: any) => t.name);

    expect(toolNames).toContain("codemode");
    expect(toolNames).toContain("save_codemode_snippet");
    expect(toolNames).toContain("list_pending_executions");
    expect(toolNames).toContain("resolve_execution_approval");
    expect(toolNames).toContain("rollback_execution");

    const codemodeTool = tools.find((t: any) => t.name === "codemode");
    expect(codemodeTool.inputSchema.properties.code).toBeDefined();
  });

  it("executes code successfully via tools/call for 'codemode'", async () => {
    const callReq = {
      jsonrpc: "2.0" as const,
      id: 2,
      method: "tools/call",
      params: {
        name: "codemode",
        arguments: {
          code: "async () => { const x = 20; const y = 22; return { answer: x + y }; }",
          intent: "Calculate simple sum",
        },
      },
    };

    const res = await dispatchJsonRpc(callReq, {
      sessionId: TEST_SESSION_ID,
    });

    expect(res).not.toBeNull();
    expect(res?.error).toBeUndefined();
    const content = (res?.result as any).content[0];
    expect(content.type).toBe("text");
    const output = JSON.parse(content.text);
    expect(output.status).toBe("completed");
    expect(output.result).toEqual({ answer: 42 });
  });

  it("saves and re-executes snippets through MCP tools/call", async () => {
    // 1. Run initial execution
    const runReq = {
      jsonrpc: "2.0" as const,
      id: 3,
      method: "tools/call",
      params: {
        name: "codemode",
        arguments: {
          code: "async () => { return { status: 'healthy', uptime: 99.9 }; }",
        },
      },
    };
    const runRes = await dispatchJsonRpc(runReq, { sessionId: TEST_SESSION_ID });
    expect(runRes).not.toBeNull();
    expect(runRes?.error).toBeUndefined();
    const runOutput = JSON.parse((runRes?.result as any).content[0].text);
    const execId = runOutput.executionId;
    expect(execId).toBeDefined();

    // 2. Save snippet
    const saveReq = {
      jsonrpc: "2.0" as const,
      id: 4,
      method: "tools/call",
      params: {
        name: "save_codemode_snippet",
        arguments: {
          name: "health_check",
          description: "System health check routine",
          executionId: execId,
        },
      },
    };
    const saveRes = await dispatchJsonRpc(saveReq, { sessionId: TEST_SESSION_ID });
    expect(saveRes).not.toBeNull();
    expect(saveRes?.error).toBeUndefined();
    const saveOutput = JSON.parse((saveRes?.result as any).content[0].text);
    expect(saveOutput.name).toBe("health_check");

    // 3. Re-run snippet via codemode.run
    const execSnippetReq = {
      jsonrpc: "2.0" as const,
      id: 5,
      method: "tools/call",
      params: {
        name: "codemode",
        arguments: {
          code: "async () => { return await codemode.run('health_check'); }",
        },
      },
    };
    const execSnippetRes = await dispatchJsonRpc(execSnippetReq, { sessionId: TEST_SESSION_ID });
    expect(execSnippetRes).not.toBeNull();
    expect(execSnippetRes?.error).toBeUndefined();
    const execSnippetOutput = JSON.parse((execSnippetRes?.result as any).content[0].text);
    expect(execSnippetOutput.result).toEqual({
      status: "healthy",
      uptime: 99.9,
    });
  });

  it("dispatches through HTTP POST /api/mcp endpoint", async () => {
    const httpReq = new Request("https://spike.land/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Mcp-Session-Id": TEST_SESSION_ID,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 10,
        method: "tools/call",
        params: {
          name: "codemode",
          arguments: {
            code: "async () => { return { edge: true, timestamp: 12345 }; }",
          },
        },
      }),
    });

    const httpRes = await mcpPost(httpReq);
    expect(httpRes.status).toBe(200);
    const body = (await httpRes.json()) as any;
    expect(body.error).toBeUndefined();
    const output = JSON.parse(body.result.content[0].text);
    expect(output.status).toBe("completed");
    expect(output.result).toEqual({ edge: true, timestamp: 12345 });
  });
});
