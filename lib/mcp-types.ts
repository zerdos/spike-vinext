// Core MCP Data Models & Schemas (PRD Section 11)

export interface ToolParameter {
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  items?: { type: string };
  required?: boolean;
  enum?: string[];
  default?: unknown;
  "x-mcp-header"?: string;
}

export interface ToolInputSchema {
  $schema?: string;
  type: "object";
  properties: Record<string, ToolParameter>;
  required?: string[];
}

export interface MCP2026RequestMeta {
  "io.modelcontextprotocol/protocolVersion"?: string;
  "io.modelcontextprotocol/clientCapabilities"?: {
    extensions?: Record<string, unknown>;
    [key: string]: unknown;
  };
  "io.modelcontextprotocol/clientInfo"?: {
    name: string;
    version: string;
  };
  "io.modelcontextprotocol/logLevel"?: string;
  traceparent?: string;
  tracestate?: string;
  baggage?: string;
  [key: string]: unknown;
}

export interface TransportHeaders {
  mcpProtocolVersion?: string;
  mcpMethod?: string;
  mcpName?: string;
  mcpParams?: Record<string, string>;
}

export interface RequestContext {
  sessionId?: string;
  apiKey?: string;
  callerSubject?: string;
  clientInfo?: { name: string; version: string };
  ip?: string;
  colo?: string;
  profile?: "standard" | "universal" | "broker-2026";
  gatewaySlug?: string;
  transportHeaders?: TransportHeaders;
  sanitizedMeta?: MCP2026RequestMeta;
  strippedMetaKeys?: string[];
  browserEnv?: import("./browser-run").BrowserRunEnv;
}

export type RiskTier = "low-readonly" | "elevated-write" | "critical-admin";

export interface ToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
  elicitationCapable?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: string;
  tier: "free" | "workspace";
  riskTier?: RiskTier;
  annotations?: ToolAnnotations;
  inputSchema: ToolInputSchema;
  outputSchema?: Record<string, unknown>;
  uiResourceUri?: string;
  handler?: (args: Record<string, unknown>, ctx: RequestContext) => Promise<unknown> | unknown;
}

export interface CategoryDefinition {
  id: string;
  name: string;
  count: number;
  icon: string;
  description: string;
  riskTier?: RiskTier;
  readOnlyHint?: boolean;
  tools: ToolDefinition[];
}

export interface WorkspaceHandlePayload {
  v: 2;
  sub: string;
  aud: string;
  cats: string[];
  tools: string[];
  stepUpCategories: string[];
  th: string; // tools_hash fingerprint
  iat: number;
  exp: number;
}

export interface MRTRInputRequest {
  id: string;
  type: "confirmation" | "form" | "oauth_step_up";
  title: string;
  message: string;
  category?: string;
  riskTier?: RiskTier;
  requiredScopes?: string[];
  schema?: Record<string, unknown>;
}

export interface MRTRStatePayload {
  v: 2;
  sub: string;
  targetTool: string;
  targetArgs: Record<string, unknown>;
  workspaceHandle?: string;
  pendingCategories?: string[];
  downstreamServerId?: string;
  iat: number;
  exp: number;
}

export interface RegistryServerRecord {
  id: string;
  name: string;
  description: string;
  homepage?: string;
  repository?: string;
  registrySource: "official" | "smithery" | "glama";
  transport: "stdio" | "sse" | "http";
  installCount?: number;
  tags: string[];
  env?: Record<string, { description: string; required: boolean; default?: string }>;
  tools?: string[];
  configTemplate: Record<string, unknown>;
}

export * from "./types/mcp-mounting";
import type {
  MountedRemoteServer,
  MCPSessionMetrics,
} from "./types/mcp-mounting";

export interface MCPSessionState {
  sessionId: string;
  workspaceId?: string;
  createdAt: number;
  lastActiveAt: number;
  activatedCategories: string[];
  activatedTools: string[]; // Dynamically hydrated tools
  mountedServers?: Record<string, MountedRemoteServer>;
  metrics?: MCPSessionMetrics;
  clientInfo?: { name: string; version: string };
  turns?: number;
  profile?: "standard" | "universal" | "broker-2026";
  workspaceHandle?: string;
}

export interface JSONRPCRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

