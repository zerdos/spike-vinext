import { describe, it, expect, vi } from "vitest";
import { executeAgentLoop } from "@/src/agent";
import worker from "@/src/index";
import { Env, ChatRequest, LLMCompletionHandler } from "@/src/types";

describe("Agent Loop & REST API /api/chat with Durable Code Mode", () => {
  it("executes multi-step codemode workflow through executeAgentLoop", async () => {
    const env: Env = {
      SESSION_KV: undefined as any,
    };

    const mockBrowserHandler = vi.fn().mockResolvedValue("# Latest AI News\n- GPT-5 released\n- Vinext is fast");

    // Mock LLM completion handler: turn 1 calls codemode, turn 2 synthesizes
    let turnCount = 0;
    const mockLlmHandler: LLMCompletionHandler = async (messages, tools) => {
      turnCount++;
      if (turnCount === 1) {
        return {
          content: null,
          tool_calls: [
            {
              id: "call_codemode_1",
              type: "function",
              function: {
                name: "codemode",
                arguments: JSON.stringify({
                  code: `async () => {
                    const md = await browser.markdown({ url: "https://news.ycombinator.com" });
                    const lines = md.split("\\n").filter(l => l.startsWith("- "));
                    return { headlineCount: lines.length, topHeadline: lines[0] };
                  }`,
                  intent: "Fetch and filter headlines",
                }),
              },
            },
          ],
        };
      }

      // Turn 2: Assistant synthesizes final answer
      const lastToolMessage = messages.find((m) => m.role === "tool");
      const toolOutput = JSON.parse(lastToolMessage?.content || "{}");
      return {
        content: `I found ${toolOutput.result?.headlineCount} headlines. Top headline: ${toolOutput.result?.topHeadline}`,
        tool_calls: [],
      };
    };

    const request: ChatRequest = {
      sessionId: `sess_chat_test_${crypto.randomUUID()}`,
      message: "What are the top AI headlines?",
    };

    const res = await executeAgentLoop(request, env, {
      llmHandler: mockLlmHandler,
      nativeHandlers: {
        "browser.markdown": mockBrowserHandler,
      },
    });

    expect(res.turns).toBe(2);
    expect(res.toolsUsed).toContain("codemode");
    expect(res.response).toContain("I found 2 headlines");
    expect(res.response).toContain("Top headline: - GPT-5 released");
  });

  it("handles paused execution and lifecycle governance via /api/chat REST endpoints", async () => {
    const sessionId = `sess_gov_test_${crypto.randomUUID()}`;
    const env: Env = {
      SESSION_KV: undefined as any,
    };

    // Pre-mount pg server in session
    const { getSessionState, saveSessionState } = await import("@/src/meta-mcp");
    const sessionState = await getSessionState(sessionId, env);
    sessionState.mountedServers.pg = {
      namespace: "pg",
      url: "https://pg-mcp.internal.spike/mcp",
      tools: [
        {
          namespacedName: "pg.insert_row",
          upstreamName: "insert_row",
          namespace: "pg",
          description: "Insert a new row into PostgreSQL",
          inputSchema: {
            type: "object",
            properties: { table: { type: "string" }, data: { type: "object" } },
            required: ["table", "data"],
          },
        },
      ],
      mountedAt: Date.now(),
    };
    await saveSessionState(sessionState, env);

    // 1. Run agent loop that triggers paused execution on mutating tool
    const mockLlmHandler: LLMCompletionHandler = async () => {
      return {
        content: null,
        tool_calls: [
          {
            id: "call_code_pause",
            type: "function",
            function: {
              name: "codemode",
              arguments: JSON.stringify({
                code: `async () => {
                  return await pg.insert_row({ table: "users", data: { name: "Alice" } });
                }`,
              }),
            },
          },
        ],
      };
    };

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: { id: 42, status: "created" },
        })
      )
    );

    const chatRes = await executeAgentLoop(
      {
        sessionId,
        message: "Insert user Alice into pg database",
      },
      env,
      {
        llmHandler: mockLlmHandler,
        fetchFn: mockFetch as any,
        maxSteps: 1,
      }
    );

    // Verify tool execution paused
    const toolMsg = chatRes.messages.find((m) => m.role === "tool");
    const parsed = JSON.parse(toolMsg?.content || "{}");
    expect(parsed.status).toBe("pending_approval");
    const executionId = parsed.executionId;
    expect(executionId).toBeDefined();

    // 2. Query GET /api/chat/pending
    const pendingReq = new Request(`https://spike.land/api/chat/pending?sessionId=${sessionId}`);
    const pendingRes = await worker.fetch(pendingReq, env);
    expect(pendingRes.status).toBe(200);
    const pendingData = (await pendingRes.json()) as any;
    expect(pendingData.pending.length).toBe(1);
    expect(pendingData.pending[0].executionId).toBe(executionId);

    // 3. Approve via POST /api/chat/approve
    const approveReq = new Request("https://spike.land/api/chat/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        executionId,
      }),
    });
    const approveRes = await worker.fetch(approveReq, env);
    expect(approveRes.status).toBe(200);
    const approveData = (await approveRes.json()) as any;
    expect(approveData.status).toBe("completed");

    // 4. Test rollback via POST /api/chat/rollback
    const rollbackReq = new Request("https://spike.land/api/chat/rollback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        executionId,
      }),
    });
    const rollbackRes = await worker.fetch(rollbackReq, env);
    expect(rollbackRes.status).toBe(200);
    const rollbackData = (await rollbackRes.json()) as any;
    expect(rollbackData.status).toBe("rolled_back");
  });

  it("handles rejection via POST /api/chat/reject", async () => {
    const sessionId = `sess_reject_test_${crypto.randomUUID()}`;
    const env: Env = {
      SESSION_KV: undefined as any,
    };

    // Pre-mount pg server in session
    const { getSessionState, saveSessionState } = await import("@/src/meta-mcp");
    const sessionState = await getSessionState(sessionId, env);
    sessionState.mountedServers.pg = {
      namespace: "pg",
      url: "https://pg-mcp.internal.spike/mcp",
      tools: [
        {
          namespacedName: "pg.insert_row",
          upstreamName: "insert_row",
          namespace: "pg",
          description: "Insert a new row into PostgreSQL",
          inputSchema: {
            type: "object",
            properties: { table: { type: "string" }, data: { type: "object" } },
            required: ["table", "data"],
          },
        },
      ],
      mountedAt: Date.now(),
    };
    await saveSessionState(sessionState, env);

    const mockLlmHandler: LLMCompletionHandler = async () => {
      return {
        content: null,
        tool_calls: [
          {
            id: "call_code_pause",
            type: "function",
            function: {
              name: "codemode",
              arguments: JSON.stringify({
                code: `async () => {
                  return await pg.insert_row({ table: "orders", data: { total: 500 } });
                }`,
              }),
            },
          },
        ],
      };
    };

    const chatRes = await executeAgentLoop(
      {
        sessionId,
        message: "Create high-value order",
      },
      env,
      {
        llmHandler: mockLlmHandler,
        maxSteps: 1,
      }
    );

    const toolMsg = chatRes.messages.find((m) => m.role === "tool");
    const parsed = JSON.parse(toolMsg?.content || "{}");
    const executionId = parsed.executionId;
    const seq = parsed.pending?.[0]?.seq ?? 1;

    // Reject via POST /api/chat/reject
    const rejectReq = new Request("https://spike.land/api/chat/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        executionId,
        seq,
        reason: "User cancelled high-value order",
      }),
    });
    const rejectRes = await worker.fetch(rejectReq, env);
    expect(rejectRes.status).toBe(200);
    const rejectData = (await rejectRes.json()) as any;
    expect(rejectData.status).toBe("rejected");
    expect(rejectData.success).toBe(true);
  });
});
