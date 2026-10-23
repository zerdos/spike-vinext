import { describe, it, expect, vi } from "vitest";
import { executeAgentLoop } from "@/src/agent";
import { Env } from "@/src/types";
import fs from "node:fs";
import path from "node:path";

function getLiveOpenRouterKey(): string | undefined {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  try {
    const devVarsPath = path.resolve(process.cwd(), ".dev.vars");
    if (fs.existsSync(devVarsPath)) {
      const content = fs.readFileSync(devVarsPath, "utf-8");
      const match = content.match(/^OPENROUTER_API_KEY=(.+)$/m);
      if (match) return match[1].trim();
    }
  } catch {}
  return undefined;
}

describe("Live OpenRouter API End-to-End Integration (deepseek/deepseek-v4.1-flash-1017)", () => {
  it("successfully performs live multi-turn tool calling with OpenRouter and DeepSeek flash", async () => {
    const liveKey = getLiveOpenRouterKey();
    if (!liveKey) {
      console.warn("Skipping live OpenRouter test: no OPENROUTER_API_KEY found in environment or .dev.vars");
      return;
    }

    const env: Env = {
      SESSION_KV: undefined as any,
      OPENROUTER_API_KEY: liveKey,
    };

    // Upstream server mock for database tools
    const mockFetch = vi.fn().mockImplementation((url, init) => {
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
                    description: "Inspects schema, columns, foreign keys for a table",
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
      return Promise.reject(new Error("Unknown method"));
    });

    const res = await executeAgentLoop(
      {
        message:
          "Connect to the database MCP server at https://mcp.example.com/mcp with namespace db, then discover tools related to table schemas.",
      },
      env,
      {
        fetchFn: mockFetch as unknown as typeof fetch,
        maxSteps: 3,
      }
    );

    expect(res.toolsUsed).toContain("mount_mcp_server");
    expect(res.turns).toBeGreaterThanOrEqual(2);
    expect(res.response).toBeDefined();
    expect(res.response.length).toBeGreaterThan(0);
  }, 60000);
});
