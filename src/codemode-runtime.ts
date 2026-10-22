import {
  createCodemodeRuntime,
  DynamicWorkerExecutor,
  CodemodeRuntime,
  CodemodeRuntimeHandle,
  truncateResult,
  Executor,
} from "@cloudflare/codemode";

export type { CodemodeRuntimeHandle };
import { BrowserRunConnector } from "./connectors/browser-connector.js";
import { SpikeMcpConnector } from "./connectors/spike-mcp-connector.js";
import { SERPAPI_DEFAULT_SERVER } from "./meta-mcp.js";
import { Env, SessionState, ToolApprovalPolicy, WorkerLoaderBinding } from "./types.js";
import { DatabaseSync } from "node:sqlite";
import vm from "node:vm";

export interface CreateSpikeCodemodeRuntimeOptions {
  executor?: Executor;
  loader?: WorkerLoaderBinding;
  approvalPolicy?: ToolApprovalPolicy;
  revertHandler?: (
    toolName: string,
    args: unknown,
    result: unknown
  ) => Promise<void> | void;
  allowLocalhost?: boolean;
  fetchFn?: typeof fetch;
  browserHandlers?: Record<string, (args: any) => Promise<any> | any>;
  transformResult?: (result: unknown) => unknown;
}

/**
 * Isolated in-memory WorkerLoader implementation for test environments and Node runtimes
 * when native Cloudflare Dynamic Worker Loader (env.LOADER) is not available.
 */
export class MockWorkerLoader implements WorkerLoaderBinding {
  load(options: any): any {
    const code =
      options.modules?.[options.mainModule] || options.modules?.["executor.js"] || "";
    const transformed = code
      .replace(/import\s*\{[^}]*\}\s*from\s*["']cloudflare:workers["'];?/, "")
      .replace(
        /export\s+default\s+class\s+CodeExecutor(\s+extends\s+WorkerEntrypoint)?/,
        "class CodeExecutor"
      );

    const sandbox: Record<string, any> = {
      WorkerEntrypoint: class {},
      setTimeout,
      clearTimeout,
      Promise,
      JSON,
      Math,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Error,
      TypeError,
      RangeError,
      btoa,
      atob,
      Uint8Array,
      ArrayBuffer,
      // Strictly enforce globalOutbound: null (no raw fetch)
      fetch:
        options.globalOutbound === null
          ? () => {
              throw new Error("Direct fetch() is disabled in sandbox (globalOutbound: null). Use host connectors.");
            }
          : undefined,
    };

    const script = new vm.Script(transformed + "\n; new CodeExecutor();");
    const context = vm.createContext(sandbox);
    const instance = script.runInContext(context);

    return {
      getEntrypoint: () => instance,
      dispose: () => {},
    };
  }
}

/**
 * SQLite-backed Mock DurableObjectState for tests and standalone worker sessions.
 */
export function createMockDurableObjectState(dbPath = ":memory:"): any {
  let db: any = null;
  try {
    db = new DatabaseSync(dbPath);
  } catch {
    db = null;
  }
  const facetInstances = new Map<string, any>();

  const ctx: any = {
    id: { toString: () => "mock-do-id" },
    storage: {
      sql: {
        exec: (sql: string, ...params: any[]) => {
          const trimmed = sql.trim();
          if (db) {
            if (trimmed.includes(";") && !params.length) {
              db.exec(trimmed);
              return {
                rowsWritten: 0,
                rowsRead: 0,
                toArray: () => [],
                [Symbol.iterator]: function* () {},
              };
            }
            if (/^\s*SELECT/i.test(trimmed)) {
              const stmt = db.prepare(trimmed);
              const rows = stmt.all(...params) as Record<string, unknown>[];
              return {
                rowsWritten: 0,
                rowsRead: rows.length,
                toArray: () => rows,
                [Symbol.iterator]: function* () {
                  yield* rows;
                },
              };
            } else {
              const stmt = db.prepare(trimmed);
              const info = stmt.run(...params);
              return {
                rowsWritten: Number(info.changes),
                rowsRead: 0,
                toArray: () => [],
                [Symbol.iterator]: function* () {},
              };
            }
          }

          // Fallback when DatabaseSync is not available in workerd worker context
          return {
            rowsWritten: 0,
            rowsRead: 0,
            toArray: () => [],
            [Symbol.iterator]: function* () {},
          };
        },
      },
    },
  };

  ctx.exports = { CodemodeRuntime };
  ctx.facets = {
    get: (name: string, factory: () => { class: any }) => {
      let inst = facetInstances.get(name);
      if (!inst) {
        const { class: RuntimeClass } = factory();
        inst = new RuntimeClass(ctx, {});
        facetInstances.set(name, inst);
      }
      return inst;
    },
  };

  return ctx;
}

/**
 * Session runtime store for caching active runtime handles per session
 */
const sessionRuntimeCache = new Map<string, CodemodeRuntimeHandle>();

/**
 * Factory function creating a stateful CodemodeRuntime handle with:
 * - BrowserRunConnector (`browser.*`)
 * - Dynamic SpikeMcpConnector(s) for each mounted server (`pg.*`, `gh.*`, etc.)
 * - DynamicWorkerExecutor sandboxed execution with `globalOutbound: null`
 */
export function createSpikeCodemodeRuntime(
  ctx: any,
  env: Env,
  sessionState: SessionState,
  options?: CreateSpikeCodemodeRuntimeOptions
): CodemodeRuntimeHandle {
  const rawCtx = ctx || createMockDurableObjectState();
  const facetInstances = new Map<string, any>();

  // Use a proxy wrapper to ensure `facets.get` safely instantiates the CodemodeRuntime class
  // directly against `rawCtx.storage.sql` without relying on workerd's experimental C++ facets.
  const activeCtx = new Proxy(rawCtx, {
    get(target, prop, receiver) {
      if (prop === "exports") {
        return { CodemodeRuntime, ...target.exports };
      }
      if (prop === "facets") {
        return {
          get: (name: string, factory: () => { class: any }) => {
            let inst = facetInstances.get(name);
            if (!inst) {
              const { class: RuntimeClass } = factory();
              try {
                inst = new RuntimeClass(rawCtx, env);
              } catch {
                // If workerd rejects non-native DurableObjectState in constructor,
                // bypass native DurableObjectBase constructor and bind storage.sql directly
                inst = Object.create(RuntimeClass.prototype);
                inst.ctx = rawCtx;
                inst.env = env;
                try {
                  rawCtx.storage.sql.exec(`
                    CREATE TABLE IF NOT EXISTS cm_executions (
                      id TEXT PRIMARY KEY,
                      code TEXT NOT NULL,
                      status TEXT NOT NULL,
                      result TEXT,
                      error TEXT,
                      logs TEXT,
                      connectors TEXT,
                      created_at INTEGER NOT NULL,
                      updated_at INTEGER NOT NULL
                    );
                    CREATE INDEX IF NOT EXISTS cm_executions_status
                      ON cm_executions (status, created_at);
                    CREATE TABLE IF NOT EXISTS cm_log (
                      execution_id TEXT NOT NULL,
                      seq INTEGER NOT NULL,
                      connector TEXT NOT NULL,
                      method TEXT NOT NULL,
                      args TEXT,
                      result TEXT,
                      status TEXT NOT NULL,
                      requires_approval INTEGER NOT NULL,
                      ephemeral INTEGER NOT NULL,
                      created_at INTEGER NOT NULL,
                      PRIMARY KEY (execution_id, seq)
                    );
                    CREATE TABLE IF NOT EXISTS cm_snippets (
                      name TEXT PRIMARY KEY,
                      description TEXT NOT NULL,
                      code TEXT NOT NULL,
                      saved_at INTEGER NOT NULL,
                      input_schema TEXT,
                      connectors TEXT
                    );
                  `);
                } catch {
                  // Tables may already exist or storage mock handled
                }
              }
              facetInstances.set(name, inst);
            }
            return inst;
          },
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });

  // 1. Build connectors
  const browserConnector = new BrowserRunConnector(activeCtx, env, {
    handlers: options?.browserHandlers,
  });

  const mountedServers: Record<string, any> = {
    ...(sessionState.mountedServers || {}),
  };
  if (env.SERPAPI_API_KEY && !mountedServers["serpapi"]) {
    mountedServers["serpapi"] = {
      ...SERPAPI_DEFAULT_SERVER,
      mountedAt: Date.now(),
    };
  }

  const mcpConnectors = Object.values(mountedServers).map(
    (server) =>
      new SpikeMcpConnector(activeCtx, env, server, {
        allowLocalhost: options?.allowLocalhost,
        fetchFn: options?.fetchFn,
        policy: options?.approvalPolicy,
        revertHandler: options?.revertHandler,
      })
  );

  // 2. Resolve executor
  let executor = options?.executor;
  if (!executor) {
    const loader = (env.LOADER as WorkerLoaderBinding) || options?.loader || new MockWorkerLoader();
    executor = new DynamicWorkerExecutor({
      loader: loader as any,
      globalOutbound: null, // Zero outbound network from sandbox
    });
  }

  // 3. Create runtime
  const runtime = createCodemodeRuntime({
    ctx: activeCtx,
    name: `session-${sessionState.sessionId}`,
    executor,
    connectors: [browserConnector, ...mcpConnectors],
    transformResult:
      options?.transformResult ||
      ((res) => truncateResult(res, { maxChars: 32768 })),
  });

  sessionRuntimeCache.set(sessionState.sessionId, runtime);
  return runtime;
}

export function getCachedCodemodeRuntime(sessionId: string): CodemodeRuntimeHandle | undefined {
  return sessionRuntimeCache.get(sessionId);
}
