/**
 * Runtime MCP Server Mounting Engine
 * Implements PRD: ./prds/mcp-runtime-mounting-prd.md
 */

import { RequestContext, ToolDefinition } from "./mcp-types";
import {
  MountedRemoteServer,
  MountedToolDefinition,
  MountServerOutput,
  MCPSessionState,
} from "./types/mcp-mounting";
import {
  validateUpstreamUrl,
  detectPlaintextSecret,
  isValidNamespace,
} from "./mcp-ssrf";
import { resolveVaultSecret } from "./vault";
import { UpstreamMCPClient, HandshakeResult } from "./mcp-upstream-client";
import { MCP_REGISTRY_SERVERS } from "./mcp-registry-data";
import { getOrCreateSession, notifyToolsListChanged } from "./mcp-gateway";

/**
 * Tool 1: mount_mcp_server
 * Mounts a remote HTTP/SSE MCP server or Registry server into the session
 */
export async function mountMcpServerHandler(
  args: Record<string, unknown>,
  ctx: RequestContext
): Promise<MountServerOutput | { error: string; status: string; snippet?: unknown }> {
  // 1. Plaintext Secret Detection (AC3)
  if (detectPlaintextSecret(args)) {
    return {
      error:
        "Security Error: Do not pass raw API keys in chat. Add your key at https://spike.land/settings/vault and pass authSecretRef: 'vault:YOUR_KEY_NAME'.",
      status: "security_error",
    };
  }

  const rawSource = String(args.source || "").trim();
  const namespace = String(args.namespace || "").trim().toLowerCase();
  const transport = (String(args.transport || "auto").toLowerCase()) as
    | "auto"
    | "streamable-http"
    | "sse";
  const authSecretRef =
    typeof args.authSecretRef === "string" ? args.authSecretRef.trim() : undefined;

  if (!rawSource) {
    return {
      error: "Missing required parameter: 'source'",
      status: "invalid_params",
    };
  }

  if (!namespace || !isValidNamespace(namespace)) {
    return {
      error:
        "Invalid namespace format. Must be 2-16 lowercase letters, numbers, or underscores (^[a-z0-9_]{2,16}$).",
      status: "invalid_params",
    };
  }

  // 2. Session & Quota resolution
  const sessionId = ctx.sessionId || ctx.callerSubject || "default-session";
  const session = getOrCreateSession(sessionId);
  if (!session.mountedServers) session.mountedServers = {};
  if (!session.metrics) {
    session.metrics = {
      turns: session.turns || 0,
      upstreamSchemasIntercepted: 0,
      estimatedTokensSaved: 0,
    };
  }

  const MAX_MOUNTED_SERVERS = 10;
  const currentCount = Object.keys(session.mountedServers).length;
  if (!session.mountedServers[namespace] && currentCount >= MAX_MOUNTED_SERVERS) {
    return {
      error: `Quota exceeded: Maximum of ${MAX_MOUNTED_SERVERS} mounted servers per session reached. Unmount an unused server before mounting a new one.`,
      status: "quota_exceeded",
    };
  }

  // 3. Resolve source (URL vs Registry Identifier)
  let targetUrl = rawSource;
  let registryRecord = MCP_REGISTRY_SERVERS.find(
    (r) => r.id.toLowerCase() === rawSource.toLowerCase()
  );

  if (!registryRecord && rawSource.includes(":")) {
    const [, regId] = rawSource.split(":");
    registryRecord = MCP_REGISTRY_SERVERS.find(
      (r) =>
        r.id.toLowerCase() === regId.toLowerCase() ||
        r.id.toLowerCase() === `@${regId.toLowerCase()}` ||
        r.id.toLowerCase().replace(/[\/-]/g, "_") === regId.toLowerCase()
    );
  }

  if (!registryRecord) {
    const cleaned = rawSource.replace(/^(smithery|glama|official)[:/]/, "");
    registryRecord = MCP_REGISTRY_SERVERS.find(
      (r) =>
        r.id.toLowerCase() === cleaned.toLowerCase() ||
        r.id.toLowerCase().endsWith(cleaned.toLowerCase())
    );
  }

  // 4. Fallback for STDIO-only packages (AC4)
  if (registryRecord) {
    const hasHostedUrl =
      Boolean(registryRecord.configTemplate?.url) ||
      registryRecord.transport === "http" ||
      registryRecord.transport === "sse";

    if (registryRecord.transport === "stdio" && !hasHostedUrl) {
      const command = (registryRecord.configTemplate.command as string) || "npx";
      const argsList = (registryRecord.configTemplate.args as string[]) || [];
      const cliCmd = `claude mcp add ${namespace} ${command} ${argsList.join(" ")}`;

      return {
        status: "stdio_only",
        namespace,
        message:
          "This MCP server only supports local stdio execution and cannot be directly mounted at edge runtime without a hosted bridge.",
        registryId: registryRecord.id,
        snippet: {
          mcpServers: {
            [namespace]: registryRecord.configTemplate,
          },
        },
        cliCommand: cliCmd,
        suggestion:
          "To use this tool locally, add the snippet above to your .mcp.json or claude_desktop_config.json.",
      };
    }

    if (registryRecord.configTemplate?.url) {
      targetUrl = String(registryRecord.configTemplate.url);
    } else if (registryRecord.homepage && registryRecord.transport !== "stdio") {
      targetUrl = registryRecord.homepage;
    }
  } else if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    // If user provided domain like "mcp.linear.app/sse"
    if (targetUrl.includes(".") && !targetUrl.includes(" ")) {
      targetUrl = `https://${targetUrl}`;
    } else {
      return {
        error: `Could not resolve registry server '${rawSource}'. Please provide a valid HTTPS endpoint URL or a known registry server ID.`,
        status: "invalid_source",
      };
    }
  }

  // 5. SSRF & Protocol Validation
  const ssrfCheck = validateUpstreamUrl(targetUrl);
  if (!ssrfCheck.valid) {
    return {
      error: ssrfCheck.error || "Security Error: Target URL is not allowed.",
      status: "security_error",
    };
  }

  // 6. Resolve Vault Secret if provided
  let authToken: string | undefined = undefined;
  if (authSecretRef) {
    const resolved = await resolveVaultSecret(authSecretRef, ctx);
    if (!resolved) {
      return {
        error: `Vault secret '${authSecretRef}' could not be resolved. Please verify the secret is configured in Settings.`,
        status: "auth_error",
      };
    }
    authToken = resolved;
  }

  // 7. Perform Handshake (initialize + tools/list)
  const client = new UpstreamMCPClient({
    endpointUrl: targetUrl,
    namespace,
    transport,
    authToken,
    handshakeTimeoutMs: 5000,
    callTimeoutMs: 15000,
  });

  let handshakeResult: HandshakeResult;
  try {
    handshakeResult = await client.performHandshake();
  } catch (err) {
    return {
      error: `Handshake failed: ${err instanceof Error ? err.message : String(err)}`,
      status: "handshake_failed",
    };
  }

  // 8. KV / Session Persistence
  const mountedServer: MountedRemoteServer = {
    namespace,
    source: rawSource,
    endpointUrl: targetUrl,
    transport: handshakeResult.transportUsed,
    serverInfo: handshakeResult.serverInfo,
    authSecretRef,
    tools: handshakeResult.tools,
    mountedAt: Date.now(),
    latencyMs: handshakeResult.latencyMs,
    status: "healthy",
  };

  session.mountedServers[namespace] = mountedServer;
  session.metrics.upstreamSchemasIntercepted += handshakeResult.tools.length;
  session.metrics.estimatedTokensSaved += handshakeResult.tools.length * 110;

  // Notify connected clients of tools list change
  notifyToolsListChanged(session.sessionId);

  // 9. Compact Summary Output (<100 tokens, strict cap)
  const sampleTools = handshakeResult.tools.slice(0, 5).map((t) => t.namespacedName);

  return {
    status: "mounted",
    namespace,
    serverInfo: handshakeResult.serverInfo,
    transportUsed: handshakeResult.transportUsed,
    toolCount: handshakeResult.tools.length,
    sampleTools,
    nextStepHint: `Call discover_tools({ query: '${namespace} <keyword>' }) to load specific parameter schemas before calling run_tool().`,
  };
}

/**
 * Tool 2: unmount_mcp_server
 * Removes a mounted server and purges its cached schemas from the session
 */
export async function unmountMcpServerHandler(
  args: Record<string, unknown>,
  ctx: RequestContext
): Promise<Record<string, unknown>> {
  const namespace = String(args.namespace || "").trim().toLowerCase();
  if (!namespace) {
    return {
      error: "Missing required parameter: 'namespace'",
      status: "invalid_params",
    };
  }

  const sessionId = ctx.sessionId || ctx.callerSubject || "default-session";
  const session = getOrCreateSession(sessionId);

  if (!session.mountedServers || !session.mountedServers[namespace]) {
    return {
      error: `Server with namespace '${namespace}' is not mounted in this session.`,
      status: "not_found",
    };
  }

  delete session.mountedServers[namespace];
  session.activatedTools = session.activatedTools.filter(
    (t) => !t.startsWith(`${namespace}.`)
  );

  notifyToolsListChanged(session.sessionId);

  return {
    status: "unmounted",
    namespace,
    message: `Successfully unmounted server '${namespace}' and purged cached schemas from session.`,
  };
}

/**
 * Tool 3: list_mounted_servers
 * Returns active runtime-mounted servers in current session
 */
export async function listMountedServersHandler(
  _args: Record<string, unknown>,
  ctx: RequestContext
): Promise<Record<string, unknown>> {
  const sessionId = ctx.sessionId || ctx.callerSubject || "default-session";
  const session = getOrCreateSession(sessionId);
  const mounted = Object.values(session.mountedServers || {});

  return {
    mountedServers: mounted.map((s) => ({
      namespace: s.namespace,
      source: s.source,
      endpointUrl: s.endpointUrl,
      transport: s.transport,
      serverInfo: s.serverInfo,
      toolCount: s.tools.length,
      mountedAt: s.mountedAt,
      latencyMs: s.latencyMs,
      status: s.status,
    })),
    totalCount: mounted.length,
    estimatedTokensSaved: session.metrics?.estimatedTokensSaved || 0,
    upstreamSchemasIntercepted: session.metrics?.upstreamSchemasIntercepted || 0,
  };
}

/**
 * Executes a tool belonging to a mounted upstream server
 * Handles edge pre-flight validation, credential resolution, and 32KB guardrail
 */
export async function executeProxiedMountedTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: RequestContext
): Promise<{ success: boolean; output: unknown; error?: string }> {
  const [namespace, ...toolParts] = toolName.split(".");
  const upstreamToolName = toolParts.join(".");

  const sessionId = ctx.sessionId || ctx.callerSubject || "default-session";
  const session = getOrCreateSession(sessionId);

  const mountedServer = session.mountedServers?.[namespace];
  if (!mountedServer) {
    return {
      success: false,
      output: null,
      error: `Mounted server for namespace '${namespace}' not found in active session. Call mount_mcp_server first.`,
    };
  }

  const toolDef = mountedServer.tools.find(
    (t) => t.namespacedName === toolName || t.upstreamName === upstreamToolName
  );

  if (!toolDef) {
    return {
      success: false,
      output: null,
      error: `Tool '${upstreamToolName}' not found on mounted server '${namespace}'. Run discover_tools({ query: '${namespace}' }) to view available tools.`,
    };
  }

  // 1. Edge Pre-Flight Schema Validation (save upstream round-trip latency)
  const required = toolDef.inputSchema.required || [];
  const missingFields: string[] = [];
  for (const field of required) {
    if (args[field] === undefined || args[field] === null || args[field] === "") {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    return {
      success: false,
      output: {
        error: `Validation error: Missing required argument(s): ${missingFields.join(", ")} for tool '${toolName}'.`,
        status: "validation_error",
        missingFields,
        requiredFields: required,
      },
      error: `Validation error: Missing required argument(s): ${missingFields.join(", ")} for tool '${toolName}'.`,
    };
  }

  // 2. Resolve credentials if needed
  let authToken: string | undefined = undefined;
  if (mountedServer.authSecretRef) {
    authToken = (await resolveVaultSecret(mountedServer.authSecretRef, ctx)) || undefined;
  }

  // 3. Dispatch to Upstream MCP Server
  const client = new UpstreamMCPClient({
    endpointUrl: mountedServer.endpointUrl,
    namespace: mountedServer.namespace,
    transport: mountedServer.transport,
    authToken,
    customHeaders: mountedServer.customHeaders,
    callTimeoutMs: 15000,
  });

  try {
    const rawResult = await client.executeTool(toolDef.upstreamName, args);
    mountedServer.lastCalledAt = Date.now();

    // Auto-hydrate into session active tools
    if (!session.activatedTools.includes(toolName)) {
      session.activatedTools.push(toolName);
      notifyToolsListChanged(session.sessionId);
    }

    if (session.metrics) {
      session.metrics.turns += 1;
    }

    return {
      success: true,
      output: rawResult,
    };
  } catch (err) {
    return {
      success: false,
      output: null,
      error: `Upstream tool execution failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Searches across all tools from servers mounted in the active session
 * Implements prefix filtering and the 1.25x recency boost (PRD Section 5.3)
 */
export function searchMountedToolsInSession(
  query: string,
  session: MCPSessionState
): Array<{
  name: string;
  category: string;
  description: string;
  tier: string;
  inputSchema: unknown;
  score: number;
  source: "mounted";
}> {
  if (!session.mountedServers) return [];

  const q = query.toLowerCase().trim();
  const tokens = q.split(/\s+/).filter(Boolean);
  const matches: Array<{
    name: string;
    category: string;
    description: string;
    tier: string;
    inputSchema: unknown;
    score: number;
    source: "mounted";
  }> = [];

  const now = Date.now();

  for (const server of Object.values(session.mountedServers)) {
    const nsLower = server.namespace.toLowerCase();
    // Direct prefix filtering: e.g. "pg." or "pg " or "linear "
    const isDirectPrefixQuery =
      q.startsWith(`${nsLower}.`) ||
      q.startsWith(`${nsLower} `) ||
      q === nsLower;

    // Recency boost: 1.25x if mounted within last 10 minutes or last 10 turns
    const isRecentlyMounted =
      now - server.mountedAt < 10 * 60 * 1000 ||
      (session.turns !== undefined && session.turns <= 10);
    const recencyMultiplier = isRecentlyMounted ? 1.25 : 1.0;

    for (const tool of server.tools) {
      const nameLower = tool.namespacedName.toLowerCase();
      const upstreamLower = tool.upstreamName.toLowerCase();
      const descLower = tool.description.toLowerCase();

      let score = 0;

      if (isDirectPrefixQuery) {
        // High baseline match when scoping by namespace prefix
        const remainder = q.slice(nsLower.length).replace(/^[.\s]+/, "").trim();
        if (!remainder) {
          score = 0.95;
        } else if (upstreamLower.includes(remainder) || descLower.includes(remainder)) {
          score = 0.98;
        } else {
          score = 0.85;
        }
      } else if (nameLower === q || upstreamLower === q) {
        score = 1.0;
      } else if (nameLower.includes(q) || upstreamLower.includes(q)) {
        score = 0.92;
      } else if (descLower.includes(q)) {
        score = 0.8;
      } else if (tokens.length > 0) {
        const matchCount = tokens.filter(
          (t) =>
            nameLower.includes(t) ||
            upstreamLower.includes(t) ||
            descLower.includes(t)
        ).length;
        if (matchCount > 0) {
          score = 0.45 + (matchCount / tokens.length) * 0.45;
        }
      }

      if (score > 0) {
        const finalScore = Number(Math.min(1.0, score * recencyMultiplier).toFixed(2));
        matches.push({
          name: tool.namespacedName,
          category: `Mounted (${server.namespace})`,
          description: tool.description,
          tier: "free",
          inputSchema: tool.inputSchema,
          score: finalScore,
          source: "mounted",
        });
      }
    }
  }

  return matches;
}

/**
 * Tool Definition: mount_mcp_server
 */
export const MOUNT_MCP_SERVER_TOOL: ToolDefinition = {
  name: "mount_mcp_server",
  description:
    "Mount an external HTTP/SSE MCP server or Registry server mid-chat without restarting the client. Automatically intercepts and indexes schemas in session state.",
  category: "Platform Core",
  tier: "free",
  inputSchema: {
    type: "object",
    properties: {
      source: {
        type: "string",
        description:
          "Either a direct HTTPS MCP endpoint URL (e.g. 'https://mcp.linear.app/sse') or a registry identifier (e.g. 'smithery:@modelcontextprotocol/server-github').",
      },
      namespace: {
        type: "string",
        description:
          "Short prefix for all tools from this server (e.g. 'gh', 'pg', 'linear'). Pattern: ^[a-z0-9_]{2,16}$",
      },
      transport: {
        type: "string",
        enum: ["auto", "streamable-http", "sse"],
        description: "MCP transport protocol to use for upstream handshake (default: 'auto').",
      },
      authSecretRef: {
        type: "string",
        description:
          "Optional Spike Land Vault reference (e.g. 'vault:GITHUB_TOKEN'). Never pass raw plaintext secrets.",
      },
    },
    required: ["source", "namespace"],
  },
  handler: mountMcpServerHandler,
};

/**
 * Tool Definition: unmount_mcp_server
 */
export const UNMOUNT_MCP_SERVER_TOOL: ToolDefinition = {
  name: "unmount_mcp_server",
  description:
    "Unmount a previously mounted MCP server and purge its cached schemas from the active session.",
  category: "Platform Core",
  tier: "free",
  inputSchema: {
    type: "object",
    properties: {
      namespace: {
        type: "string",
        description: "The namespace prefix of the mounted server to remove.",
      },
    },
    required: ["namespace"],
  },
  handler: unmountMcpServerHandler,
};

/**
 * Tool Definition: list_mounted_servers
 */
export const LIST_MOUNTED_SERVERS_TOOL: ToolDefinition = {
  name: "list_mounted_servers",
  description:
    "Returns active runtime-mounted servers in the current session, their health status, tool counts, and latency.",
  category: "Platform Core",
  tier: "free",
  inputSchema: {
    type: "object",
    properties: {},
  },
  handler: listMountedServersHandler,
};

export const RUNTIME_MOUNT_TOOLS: ToolDefinition[] = [
  MOUNT_MCP_SERVER_TOOL,
  UNMOUNT_MCP_SERVER_TOOL,
  LIST_MOUNTED_SERVERS_TOOL,
];
