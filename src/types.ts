/**
 * Data Models for Cloudflare Agent Harness + Spike Land Meta-MCP (MVP)
 * PRD Section 5: Data Models (`src/types.ts`)
 */

// If KVNamespace is not globally defined in non-CF environments, provide a structural fallback
export interface KVNamespaceLike {
  get(key: string, options?: "text" | "json" | "arrayBuffer" | "stream" | { type?: string; cacheTtl?: number }): Promise<any>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expirationTtl?: number; expiration?: number; metadata?: any }): Promise<void>;
  delete(key: string): Promise<void>;
}

declare global {
  // Allow global KVNamespace when available, or fallback
  interface KVNamespace extends KVNamespaceLike {}
}

export interface Env {
  SESSION_KV: KVNamespace;
  OPENROUTER_API_KEY?: string;
  LLM_API_KEY?: string;
  GEMINI_API_KEY?: string;
  SERPAPI_API_KEY?: string;
  LLM_BASE_URL?: string;
  LLM_MODEL?: string;
  // Dynamic upstream secrets stored as Worker secrets (e.g. env["GITHUB_TOKEN"])
  [key: string]: unknown;
}

export interface MountedToolDefinition {
  namespacedName: string; // e.g., "pg.describe_table"
  upstreamName: string;   // e.g., "describe_table"
  namespace: string;
  description: string;
  inputSchema: Record<string, unknown>;
  typeDefinition?: string;
}

export interface MountedServer {
  namespace: string;
  url: string;
  authSecretName?: string;
  tools: MountedToolDefinition[];
  mountedAt: number;
}

export interface SessionState {
  sessionId: string;
  mountedServers: Record<string, MountedServer>;
}

// Tool Input & Output Types
export interface MountMcpServerInput {
  url: string;
  namespace: string;
  authSecretName?: string;
}

export interface MountMcpServerOutput {
  status: "mounted";
  namespace: string;
  toolCount: number;
  sampleTools: string[];
  hint: string;
}

export interface DiscoverToolsInput {
  query: string;
  format?: "json_schema" | "typescript";
}

export interface RunToolInput {
  tool_name: string;
  arguments: Record<string, unknown>;
}

export interface CodemodeToolInput {
  code: string;
  intent?: string;
}

export interface SaveCodemodeSnippetInput {
  name: string;
  description: string;
  executionId?: string;
  code?: string;
  inputSchema?: Record<string, unknown>;
}

export interface ListPendingExecutionsInput {
  executionId?: string;
}

export interface ResolveExecutionApprovalInput {
  executionId: string;
  decision: "approve" | "reject";
  seq?: number;
  reason?: string;
}

export interface RollbackExecutionInput {
  executionId: string;
}

// LLM & Agent Loop Types
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatRequest {
  sessionId?: string;
  messages?: ChatMessage[];
  message?: string;
  model?: string;
}

export interface ChatResponse {
  sessionId: string;
  response: string;
  messages: ChatMessage[];
  turns: number;
  toolsUsed: string[];
}

// Meeting Notes & Knowledge Base Domain Types (PRD: prds/meetingNotes.md)
export type MeetingStatus = "scheduled" | "in_progress" | "completed" | "archived";
export type QuestionStatus = "open" | "answered" | "deferred";
export type ActionItemStatus = "pending" | "in_progress" | "done" | "cancelled";

export interface TranscriptSegment {
  id: string;
  speaker?: string;
  timestamp?: string; // e.g. "00:04:12" or ISO
  text: string;
  createdAt: number;
}

export interface MeetingSummary {
  executiveSummary: string;
  keyDecisions: string[];
  takeaways: string[];
  topics: string[];
  updatedAt: number;
}

export interface MeetingQuestion {
  id: string;
  meetingId: string;
  question: string;
  askedBy?: string;
  answeredBy?: string;
  answer?: string;
  status: QuestionStatus;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface MeetingActionItem {
  id: string;
  meetingId: string;
  task: string;
  owner?: string;
  dueDate?: string; // YYYY-MM-DD
  status: ActionItemStatus;
  createdAt: number;
  updatedAt: number;
}

export interface MeetingNoteRecord {
  id: string;
  title: string;
  meetingDate: string; // Canonical "YYYY-MM-DD"
  startTime?: string;
  endTime?: string;
  status: MeetingStatus;
  participants: string[];
  tags: string[];
  locationOrUrl?: string;
  summary?: MeetingSummary;
  transcriptText: string;
  transcriptSegments: TranscriptSegment[];
  questions: MeetingQuestion[];
  actionItems: MeetingActionItem[];
  notesMarkdown?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MeetingIndexItem {
  id: string;
  title: string;
  meetingDate: string;
  startTime?: string;
  status: MeetingStatus;
  participants: string[];
  tags: string[];
  hasTranscript: boolean;
  hasSummary: boolean;
  questionCount: number;
  openQuestionCount: number;
  actionItemCount: number;
  updatedAt: number;
}

export interface MeetingSummaryPreview extends MeetingIndexItem {
  executiveSummary?: string;
  transcriptLength: number;
}

export type LLMCompletionHandler = (
  messages: ChatMessage[],
  tools: Array<{
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>,
  env: Env,
  model?: string
) => Promise<{
  content: string | null;
  tool_calls?: ToolCall[];
}>;

export * from "./types/codemode.js";

