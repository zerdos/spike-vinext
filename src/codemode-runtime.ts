import {
  createCodemodeRuntime,
  DynamicWorkerExecutor,
  CodemodeRuntime,
  CodemodeRuntimeHandle,
  truncateResult,
  Executor,
} from "@cloudflare/codemode";
import { BrowserRunConnector } from "./connectors/browser-connector.js";
import { SpikeMcpConnector } from "./connectors/spike-mcp-connector.js";
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
  const db = new DatabaseSync(dbPath);
  const facetInstances = new Map<string, any>();

  const ctx: any = {
    id: { toString: () => "mock-do-id" },
    storage: {
      sql: {
        exec: (sql: string, ...params: any[]) => {
          const trimmed = sql.trim();
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
  const activeCtx = ctx || createMockDurableObjectState();

  // Ensure CodemodeRuntime export and facets exist on ctx
  if (!activeCtx.exports) {
    activeCtx.exports = {};
  }
  if (!activeCtx.exports.CodemodeRuntime) {
    activeCtx.exports.CodemodeRuntime = CodemodeRuntime;
  }
  if (!activeCtx.facets) {
    const facetInstances = new Map<string, any>();
    activeCtx.facets = {
      get: (name: string, factory: () => { class: any }) => {
        let inst = facetInstances.get(name);
        if (!inst) {
          const { class: RuntimeClass } = factory();
          inst = new RuntimeClass(activeCtx, env);
          facetInstances.set(name, inst);
        }
        return inst;
      },
    };
  }

  // 1. Build connectors
  const browserConnector = new BrowserRunConnector(activeCtx, env, {
    handlers: options?.browserHandlers,
  });

  const mcpConnectors = Object.values(sessionState.mountedServers || {}).map(
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
