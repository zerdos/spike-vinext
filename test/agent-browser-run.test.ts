import { describe, it, expect } from "vitest";
import { executeAgentLoop } from "@/src/agent";
import { discoverTools, runTool } from "@/src/meta-mcp";
import { getInternalNativeTools, getDefaultNativeHandlers } from "@/src/native-tools";
import { Env, SessionState } from "@/src/types";

describe("Agent Harness Built-in Browser Tools Integration", () => {
  it("discovers native browser tools via discoverTools without mounting external servers", () => {
    const sessionState: SessionState = { sessionId: "test-sess", mountedServers: {} };
    const nativeTools = getInternalNativeTools();

    expect(nativeTools.length).toBeGreaterThan(0);

    const discovered = discoverTools({ query: "browser" }, sessionState, nativeTools);
    expect(discovered.length).toBeGreaterThan(0);
    const names = discovered.map((t) => t.namespacedName);
    expect(names.some((n) => n.includes("markdown"))).toBe(true);
  });

  it("executes browser.markdown via runTool using native handlers", async () => {
    const sessionState: SessionState = { sessionId: "test-sess", mountedServers: {} };
    const env: Env = { SESSION_KV: undefined as any };
    const handlers = getDefaultNativeHandlers(env);

    const runResult = await runTool(
      {
        tool_name: "browser.markdown",
        arguments: { url: "https://bbc.co.uk" },
      },
      env,
      sessionState,
      { nativeHandlers: handlers }
    );

    expect(runResult.error).toBeUndefined();
    expect(runResult.result).toBeDefined();
    const resultObj = runResult.result as Record<string, unknown>;
    expect(resultObj.success).toBe(true);
    expect(resultObj.action).toBe("markdown");
  });

  it("completes browser news request end-to-end in executeAgentLoop", async () => {
    const env: Env = {
      SESSION_KV: undefined as any,
    };

    // Mock completion handler simulating 2-turn tool call
    let turn = 0;
    const mockLlmHandler = async (messages: any[], tools: any[]) => {
      turn++;
      if (turn === 1) {
        return {
          content: null,
          tool_calls: [
            {
              id: "call_discover_1",
              type: "function" as const,
              function: {
                name: "discover_tools",
                arguments: JSON.stringify({ query: "browser markdown" }),
              },
            },
          ],
        };
      }
      if (turn === 2) {
        return {
          content: null,
          tool_calls: [
            {
              id: "call_run_1",
              type: "function" as const,
              function: {
                name: "run_tool",
                arguments: JSON.stringify({
                  tool_name: "browser.markdown",
                  arguments: { url: "https://bbc.co.uk" },
                }),
              },
            },
          ],
        };
      }
      return {
        content: "Here are the top headlines from BBC: Breaking news from the global desk.",
        tool_calls: [],
      };
    };

    const res = await executeAgentLoop(
      {
        message: "use the browser tool and tell me what are the news on https://bbc.co.uk",
      },
      env,
      { llmHandler: mockLlmHandler }
    );

    expect(res.turns).toBe(3);
    expect(res.toolsUsed).toEqual(["discover_tools", "run_tool"]);
    expect(res.response).toContain("Here are the top headlines from BBC");
  });
});
