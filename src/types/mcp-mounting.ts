// Runtime MCP Server Mounting TypeScript Types (PRD Section 6)

export type UpstreamTransport = "streamable-http" | "sse";

export interface MountedToolDefinition {
  /** Namespaced name exposed to the agent, e.g. "linear.create_issue" */
  namespacedName: string;
  /** Original tool name expected by the upstream server, e.g. "create_issue" */
  upstreamName: string;
  namespace: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MountedRemoteServer {
  namespace: string;
  source: string;
  endpointUrl: string;
  transport: UpstreamTransport;
  serverInfo: {
    name: string;
    version: string;
  };
  /** Vault reference handle, e.g., "vault:LINEAR_API_KEY". Never store plaintext keys in session KV. */
  authSecretRef?: string;
  /** Custom non-sensitive headers if needed */
  customHeaders?: Record<string, string>;
  tools: MountedToolDefinition[];
  mountedAt: number;
  lastCalledAt?: number;
  status: "healthy" | "degraded" | "unreachable";
  latencyMs?: number;
}

export interface MCPSessionMetrics {
  turns: number;
  upstreamSchemasIntercepted: number;
  estimatedTokensSaved: number;
}

export interface MCPSessionState {
  sessionId: string;
  workspaceId?: string;
  createdAt: number;
  lastActiveAt: number;
  activatedCategories: string[];
  activatedTools: string[];
  /** Map of namespace -> MountedRemoteServer */
  mountedServers: Record<string, MountedRemoteServer>;
  metrics: MCPSessionMetrics;
  clientInfo?: { name: string; version: string };
  turns?: number;
  profile?: "standard" | "universal" | "broker-2026";
  workspaceHandle?: string;
}

export interface MountServerInput {
  source: string;
  namespace: string;
  transport?: "auto" | "streamable-http" | "sse";
  authSecretRef?: string;
}

export interface MountServerSuccessOutput {
  status: "mounted";
  namespace: string;
  serverInfo: {
    name: string;
    version: string;
  };
  transportUsed: UpstreamTransport;
  toolCount: number;
  sampleTools: string[];
  nextStepHint: string;
}

export interface StdioFallbackOutput {
  status: "stdio_only";
  namespace: string;
  message: string;
  registryId?: string;
  snippet: {
    mcpServers: Record<string, unknown>;
  };
  cliCommand: string;
  suggestion: string;
}

export type MountServerOutput = MountServerSuccessOutput | StdioFallbackOutput;
