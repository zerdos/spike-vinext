import { describe, it, expect, vi } from "vitest";
import {
  createSpikeCodemodeRuntime,
  createMockDurableObjectState,
  MockWorkerLoader,
} from "../src/codemode-runtime.js";
import { DynamicWorkerExecutor } from "@cloudflare/codemode";
import { Env, SessionState } from "../src/types.js";

describe("Durable Code Mode Runtime (AC1 - AC6)", () => {
  function setupTestRuntime(overrides?: {
    mountedTools?: any[];
    revertHandler?: any;
    policy?: any;
    browserHandlers?: any;
  }) {
    const ctx = createMockDurableObjectState();
    const env: Env = {
      SESSION_KV: undefined as any,
      DB_SECRET: "super-secret-token",
    };

    const sessionState: SessionState = {
      sessionId: `test-sess-${crypto.randomUUID()}`,
      mountedServers: {
        pg: {
          namespace: "pg",
          url: "https://pg-mcp.internal.spike/mcp",
          authSecretName: "DB_SECRET",
          tools: overrides?.mountedTools || [
            {
              namespacedName: "pg.query",
              upstreamName: "query",
              namespace: "pg",
              description: "Run read-only query on PostgreSQL database",
              inputSchema: {
                type: "object",
                properties: { sql: { type: "string" } },
                required: ["sql"],
              },
            },
            {
              namespacedName: "pg.insert_row",
              upstreamName: "insert_row",
              namespace: "pg",
              description: "Insert a new row into PostgreSQL database",
              inputSchema: {
                type: "object",
                properties: {
                  table: { type: "string" },
                  data: { type: "object" },
                },
                required: ["table", "data"],
              },
            },
          ],
          mountedAt: Date.now(),
        },
      },
    };

    const mockFetch = vi.fn().mockImplementation((url, init) => {
      const body = JSON.parse(init.body);
      if (body.method === "tools/call") {
        if (body.params.name === "query") {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                jsonrpc: "2.0",
                id: body.id,
                result: {
                  rows: [
                    { id: 1, name: "Spike Pro", price: 49 },
                    { id: 2, name: "Spike Enterprise", price: 199 },
                  ],
                },
              })
            )
          );
        }
        if (body.params.name === "insert_row") {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                jsonrpc: "2.0",
                id: body.id,
                result: { insertedId: 101, status: "created" },
              })
            )
          );
        }
      }
      return Promise.resolve(new Response(JSON.stringify({ error: "not found" }), { status: 404 }));
    });

    const browserHandlers = overrides?.browserHandlers || {
      "browser.markdown": async (args: any) => {
        return `# Pricing Page\n- Plan A: $59\n- Plan B: $249\nTarget: ${args.url}`;
      },
    };

    const runtime = createSpikeCodemodeRuntime(ctx, env, sessionState, {
      fetchFn: mockFetch as any,
      browserHandlers,
      allowLocalhost: true,
      approvalPolicy: overrides?.policy,
      revertHandler: overrides?.revertHandler,
      loader: new MockWorkerLoader(),
    });

    return { runtime, ctx, env, mockFetch };
  }

  // AC1: Multi-Tool Sandbox Composition in 1 Turn
  it("AC1: executes multi-tool composition in single turn and filters intermediate data", async () => {
    const { runtime, mockFetch } = setupTestRuntime();

    const code = `async () => {
      // 1. Call native browser tool
      const markdown = await browser.markdown({ url: "https://example.com/pricing" });

      // 2. Call mounted pg MCP tool
      const dbResult = await pg.query({ sql: "SELECT * FROM products" });

      // 3. Filter and compose inside V8 sandbox memory
      const competitorPrice = 59;
      const internalProduct = dbResult.rows.find(p => p.id === 1);
      const isMoreExpensive = competitorPrice > internalProduct.price;

      return {
        hasMarkdown: markdown.includes("Pricing Page"),
        internalPrice: internalProduct.price,
        competitorPrice,
        isMoreExpensive
      };
    }`;

    const res = await runtime.execute({ code });
    expect(res.status).toBe("completed");
    if (res.status === "completed") {
      expect(res.result).toEqual({
        hasMarkdown: true,
        internalPrice: 49,
        competitorPrice: 59,
        isMoreExpensive: true,
      });
    }

    // Verify upstream MCP call was dispatched
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  // AC2: In-Sandbox Discovery (codemode.search & codemode.describe)
  it("AC2: supports in-sandbox discovery via codemode.search and codemode.describe", async () => {
    const { runtime } = setupTestRuntime();

    const code = `async () => {
      const searchRes = await codemode.search("markdown");
      const describeRes = await codemode.describe("browser.markdown");

      return {
        searchCount: searchRes.results.length,
        firstMatch: searchRes.results[0]?.path,
        hasTypes: typeof describeRes.types === "string" && describeRes.types.length > 0,
        describePath: describeRes.path
      };
    }`;

    const res = await runtime.execute({ code });
    expect(res.status).toBe("completed");
    if (res.status === "completed") {
      const data = res.result as any;
      expect(data.searchCount).toBeGreaterThanOrEqual(1);
      expect(data.firstMatch).toBe("browser.markdown");
      expect(data.hasTypes).toBe(true);
      expect(data.describePath).toBe("browser.markdown");
    }
  });

  // AC3: Durable Approval Pause & Deterministic Replay
  it("AC3: pauses on mutating tool (requiresApproval: true) and resumes with exact replay upon approval", async () => {
    const { runtime, mockFetch } = setupTestRuntime();

    const code = `async () => {
      // Step 1: Read-only query (requiresApproval: false)
      const data = await pg.query({ sql: "SELECT * FROM products" });

      // Step 2: Mutating insert (requiresApproval: true by default)
      const insertResult = await pg.insert_row({
        table: "audit_log",
        data: { count: data.rows.length }
      });

      return {
        readCount: data.rows.length,
        insertStatus: insertResult.status
      };
    }`;

    // Initial execution should pause on step 2
    const pass1 = await runtime.execute({ code });
    expect(pass1.status).toBe("paused");
    if (pass1.status === "paused") {
      expect(pass1.pending.length).toBe(1);
      expect(pass1.pending[0].connector).toBe("pg");
      expect(pass1.pending[0].method).toBe("insert_row");
    }

    const executionId = pass1.executionId;
    const initialFetchCount = mockFetch.mock.calls.length;
    expect(initialFetchCount).toBe(1); // Only step 1 ran

    // Inspect pending via runtime.pending()
    const pendingList = await runtime.pending(executionId);
    expect(pendingList.length).toBe(1);
    expect(pendingList[0].executionId).toBe(executionId);

    // Human calls approve
    const pass2 = await runtime.approve({ executionId });
    expect(pass2.status).toBe("completed");
    if (pass2.status === "completed") {
      expect(pass2.result).toEqual({
        readCount: 2,
        insertStatus: "created",
      });
    }

    // Step 1 was replayed from durable SQLite storage, step 2 executed:
    // Total mockFetch calls should now be 2 (1 from pass1, + 1 for insert_row in pass2)
    expect(mockFetch.mock.calls.length).toBe(2);
  });

  // AC4: First-Class Rejection & Rollback
  it("AC4: handles rejection and rollback of executed side effects", async () => {
    const revertMock = vi.fn();
    const { runtime } = setupTestRuntime({
      revertHandler: revertMock,
    });

    const code = `async () => {
      return await pg.insert_row({ table: "test", data: { a: 1 } });
    }`;

    // Execution pauses on insert_row
    const res = await runtime.execute({ code });
    expect(res.status).toBe("paused");

    const pendingSeq = (res as any).pending?.[0]?.seq;

    // Reject execution
    const rejected = await runtime.reject({
      executionId: res.executionId,
      seq: pendingSeq ?? 1,
    });
    expect(rejected).toBe(true);

    // Verify status is rejected
    const executions = await runtime.executions();
    const execRecord = executions.find((e) => e.id === res.executionId);
    expect(execRecord?.status).toBe("rejected");

    // Test rollback on completed execution
    const code2 = `async () => {
      return await pg.query({ sql: "SELECT 1" });
    }`;
    const completedRes = await runtime.execute({ code: code2 });
    expect(completedRes.status).toBe("completed");

    await runtime.rollback({ executionId: completedRes.executionId });
    const afterRollback = await runtime.executions();
    const rolledBackRecord = afterRollback.find((e) => e.id === completedRes.executionId);
    expect(rolledBackRecord?.status).toBe("rolled_back");
  });

  // AC5: Composable Snippet Persistence
  it("AC5: saves and re-executes durable snippets via codemode.run", async () => {
    const { runtime } = setupTestRuntime();

    const code = `async () => {
      const d = await pg.query({ sql: "SELECT * FROM products" });
      return { total: d.rows.length };
    }`;

    const execRes = await runtime.execute({ code });
    expect(execRes.status).toBe("completed");

    // Save as snippet
    const snippet = await runtime.saveSnippet("count_products", {
      executionId: execRes.executionId,
      description: "Counts all active products from pg",
    });
    expect(snippet.name).toBe("count_products");

    // Discover snippet via search
    const searchRes = await runtime.search("count_products");
    expect(searchRes.results.some((r) => r.method === "count_products" || r.path.includes("count_products"))).toBe(true);

    // Call snippet via codemode.run inside a fresh codemode script
    const runCode = `async () => {
      return await codemode.run("count_products");
    }`;
    const runRes = await runtime.execute({ code: runCode });
    expect(runRes.status).toBe("completed");
    if (runRes.status === "completed") {
      expect(runRes.result).toEqual({ total: 2 });
    }
  });

  // AC6: Sandbox Network & Secret Isolation
  it("AC6: blocks raw fetch and prevents secret leaks into sandbox isolate scope", async () => {
    const { runtime } = setupTestRuntime();

    // 1. Raw direct fetch should fail (globalOutbound: null)
    const codeFetch = `async () => {
      return await fetch("https://example.com");
    }`;
    const fetchRes = await runtime.execute({ code: codeFetch });
    expect(fetchRes.status).toBe("error");
    if (fetchRes.status === "error") {
      expect(fetchRes.error).toMatch(/fetch\(\) is disabled/i);
    }

    // 2. Secret isolation: Worker env secrets must not be in sandbox global scope
    const codeSecrets = `async () => {
      return {
        hasProcessEnv: typeof process !== "undefined" && typeof process.env !== "undefined",
        hasSecret: typeof globalThis.DB_SECRET !== "undefined"
      };
    }`;
    const secretRes = await runtime.execute({ code: codeSecrets });
    expect(secretRes.status).toBe("completed");
    if (secretRes.status === "completed") {
      const data = secretRes.result as any;
      expect(data.hasProcessEnv).toBe(false);
      expect(data.hasSecret).toBe(false);
    }
  });
});
