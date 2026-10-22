import { DurableObject } from "cloudflare:workers";
import { CodemodeRuntime } from "@cloudflare/codemode";
import { createSpikeCodemodeRuntime, CreateSpikeCodemodeRuntimeOptions } from "./codemode-runtime.js";
import { Env, SessionState } from "./types.js";

/**
 * CodemodeAgent Durable Object
 * SQLite-backed actor hosting stateful Codemode execution logs, replay checkpoints,
 * pending human approvals, and saved procedural snippets across hibernations.
 */
export class CodemodeAgent extends DurableObject {
  private runtimeMap = new Map<string, any>();

  constructor(ctx: any, env: any) {
    super(ctx, env);
    const anyCtx = this.ctx as any;
    if (!anyCtx.exports) {
      anyCtx.exports = {};
    }
    anyCtx.exports.CodemodeRuntime = CodemodeRuntime;
  }

  getRuntime(sessionState: SessionState, options?: CreateSpikeCodemodeRuntimeOptions) {
    let runtime = this.runtimeMap.get(sessionState.sessionId);
    if (!runtime) {
      runtime = createSpikeCodemodeRuntime(this.ctx, this.env as Env, sessionState, options);
      this.runtimeMap.set(sessionState.sessionId, runtime);
    }
    return runtime;
  }

  async execute(sessionState: SessionState, code: string, options?: CreateSpikeCodemodeRuntimeOptions) {
    const runtime = this.getRuntime(sessionState, options);
    return await runtime.execute(code);
  }

  async pending(sessionState: SessionState) {
    const runtime = this.getRuntime(sessionState);
    return await runtime.pending();
  }

  async approve(sessionState: SessionState, executionId: string) {
    const runtime = this.getRuntime(sessionState);
    return await runtime.approve({ executionId });
  }

  async reject(sessionState: SessionState, executionId: string, reason?: string) {
    const runtime = this.getRuntime(sessionState);
    return await runtime.reject({ executionId, reason });
  }

  async rollback(sessionState: SessionState, executionId: string) {
    const runtime = this.getRuntime(sessionState);
    return await runtime.rollback({ executionId });
  }

  async snippets(sessionState: SessionState) {
    const runtime = this.getRuntime(sessionState);
    return await runtime.snippets();
  }

  async saveSnippet(sessionState: SessionState, name: string, code: string, description?: string) {
    const runtime = this.getRuntime(sessionState);
    return await runtime.saveSnippet({ name, code, description });
  }
}
