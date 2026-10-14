// Core MCP Data Models & Schemas (PRD Section 11)

export interface ToolParameter {
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required?: boolean;
  enum?: string[];
  default?: unknown;
}

export interface ToolInputSchema {
  type: "object";
  properties: Record<string, ToolParameter>;
  required?: string[];
}

export interface RequestContext {
  sessionId?: string;
  apiKey?: string;
  clientInfo?: { name: string; version: string };
  ip?: string;
  colo?: string;
  profile?: "standard" | "universal";
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: string;
  tier: "free" | "workspace";
  inputSchema: ToolInputSchema;
  handler?: (args: Record<string, unknown>, ctx: RequestContext) => Promise<unknown> | unknown;
}

export interface CategoryDefinition {
  id: string;
  name: string;
  count: number;
  icon: string;
  description: string;
  tools: ToolDefinition[];
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

export interface MCPSessionState {
  sessionId: string;
  createdAt: number;
  lastActiveAt: number;
  activatedCategories: string[];
  activatedTools: string[]; // Dynamically hydrated tools
  clientInfo?: { name: string; version: string };
  turns?: number;
  profile?: "standard" | "universal";
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
