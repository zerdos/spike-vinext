import type { KVNamespaceLike } from "../types.js";

export interface WorkerLoaderBinding {
  /** Cloudflare Dynamic Worker Loader binding for isolated V8 execution */
  load(options: unknown): any;
}

export interface CodemodeEnv {
  SESSION_KV: KVNamespaceLike;
  /** Required for @cloudflare/codemode DynamicWorkerExecutor */
  LOADER?: WorkerLoaderBinding;
  /** Durable Object namespace hosting the stateful Codemode Agent Runtime */
  CODEMODE_AGENT?: any;
  [key: string]: unknown;
}

export type ExecutionStatus =
  | "running"
  | "completed"
  | "pending_approval"
  | "rejected"
  | "failed"
  | "rolled_back";

export interface PendingApprovalRecord {
  executionId: string;
  seq: number;
  connector: string;
  method: string;
  args: Record<string, unknown>;
  intent?: string;
  pausedAt: number;
}

export interface CodemodeExecutionResult {
  executionId: string;
  status: ExecutionStatus;
  result?: unknown;
  logs?: string[];
  pendingApproval?: PendingApprovalRecord;
  error?: {
    code: number;
    message: string;
    stepSeq?: number;
  };
  metrics: {
    durationMs: number;
    rpcCallsCount: number;
    bytesReturned: number;
  };
}

export interface SavedSnippetDefinition {
  name: string;
  description: string;
  code: string;
  inputSchema?: Record<string, unknown>;
  createdAt: number;
  createdFromExecutionId?: string;
}

export interface ToolApprovalPolicy {
  /** Glob or regex patterns of namespaced tools that require human approval */
  requireApprovalPatterns: string[];
  /** Glob or regex patterns explicitly whitelisted for auto-execution */
  autoApprovePatterns: string[];
}
