import {
  ToolDefinition,
  CategoryDefinition,
  MCPSessionState,
  JSONRPCRequest,
  JSONRPCResponse,
  RequestContext,
} from "./mcp-types";
import { MCP_CATEGORIES } from "./mcp-data";
import { MCP_REGISTRY_SERVERS } from "./mcp-registry-data";

// 5 Gateway Meta-Tool names
export const GATEWAY_TOOL_NAMES = [
  "search_tools",
  "list_categories",
  "enable_category",
  "get_balance",
  "get_status",
] as const;

// Session storage in edge memory
const sessions = new Map<string, MCPSessionState>();

// Workspace-installed third-party servers
const installedServers = new Map<string, { id: string; name: string; transport: string; status: string; installedAt: number }>();
// Seed default mounted servers
installedServers.set("spike-land-gateway", {
  id: "spike-land-gateway",
  name: "Spike Land Edge Gateway",
  transport: "sse",
  status: "active",
  installedAt: Date.now() - 3600000,
});

// SSE subscriber listeners
type SSEListener = (event: string, data: unknown) => void;
const sseListeners = new Map<string, Set<SSEListener>>();

export function registerSSEListener(sessionId: string, listener: SSEListener): () => void {
  let set = sseListeners.get(sessionId);
  if (!set) {
    set = new Set();
    sseListeners.set(sessionId, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) {
      sseListeners.delete(sessionId);
    }
  };
}

export function notifyToolsListChanged(sessionId?: string): void {
  const payload = {
    jsonrpc: "2.0",
    method: "notifications/tools/list_changed",
    params: {},
  };

  if (sessionId) {
    const listeners = sseListeners.get(sessionId);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener("message", payload);
        } catch {
          // Ignore dropped connections
        }
      }
    }
  } else {
    // Broadcast to all active sessions
    for (const [, listeners] of sseListeners) {
      for (const listener of listeners) {
        try {
          listener("message", payload);
        } catch {
          // Ignore
        }
      }
    }
  }
}

export function getOrCreateSession(sessionId: string, clientInfo?: { name: string; version: string }): MCPSessionState {
  let session = sessions.get(sessionId);
  const now = Date.now();
  if (!session) {
    session = {
      sessionId,
      createdAt: now,
      lastActiveAt: now,
      activatedCategories: ["Platform Core"],
      activatedTools: [],
      clientInfo,
    };
    sessions.set(sessionId, session);
  } else {
    session.lastActiveAt = now;
    if (clientInfo && !session.clientInfo) {
      session.clientInfo = clientInfo;
    }
  }
  return session;
}

export function resetSession(sessionId: string): void {
  sessions.delete(sessionId);
}

// All tool definitions catalogue
export const ALL_TOOLS: Record<string, ToolDefinition> = {};

// 1. Five Gateway Meta-Tools
export const GATEWAY_TOOLS: ToolDefinition[] = [
  {
    name: "search_tools",
    description: "Search across all 455 tools by semantic query or keyword with progressive schema loading.",
    category: "Platform Core",
    tier: "free",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query or task requirement", required: true },
        category: { type: "string", description: "Optional category filter" },
        limit: { type: "number", description: "Maximum tools to return (default: 5)" },
      },
      required: ["query"],
    },
    handler: async (args, ctx) => {
      const query = String(args.query || "").toLowerCase();
      const catFilter = args.category ? String(args.category).toLowerCase() : null;
      const limit = typeof args.limit === "number" ? Math.min(args.limit, 20) : 5;

      const results: Array<{
        name: string;
        category: string;
        description: string;
        tier: string;
        inputSchema: unknown;
        score: number;
      }> = [];

      for (const tool of Object.values(ALL_TOOLS)) {
        if (catFilter && tool.category.toLowerCase() !== catFilter && !tool.category.toLowerCase().includes(catFilter)) {
          continue;
        }

        let score = 0;
        const nameLower = tool.name.toLowerCase();
        const descLower = tool.description.toLowerCase();
        const catLower = tool.category.toLowerCase();

        if (nameLower === query) score = 1.0;
        else if (nameLower.includes(query)) score = 0.9;
        else if (descLower.includes(query)) score = 0.75;
        else if (catLower.includes(query)) score = 0.6;
        else {
          // Token matching
          const tokens = query.split(/\s+/).filter(Boolean);
          const matchCount = tokens.filter((t) => nameLower.includes(t) || descLower.includes(t)).length;
          if (matchCount > 0) {
            score = 0.4 + (matchCount / tokens.length) * 0.4;
          }
        }

        if (score > 0) {
          results.push({
            name: tool.name,
            category: tool.category,
            description: tool.description,
            tier: tool.tier,
            inputSchema: tool.inputSchema,
            score: Number(score.toFixed(2)),
          });
        }
      }

      results.sort((a, b) => b.score - a.score);
      const topResults = results.slice(0, limit);

      // Auto-register matched tools into session
      if (ctx.sessionId) {
        const session = getOrCreateSession(ctx.sessionId);
        for (const r of topResults) {
          if (!session.activatedTools.includes(r.name) && !GATEWAY_TOOL_NAMES.includes(r.name as (typeof GATEWAY_TOOL_NAMES)[number])) {
            session.activatedTools.push(r.name);
          }
        }
        notifyToolsListChanged(ctx.sessionId);
      }

      return {
        query,
        matchedCount: topResults.length,
        totalCatalogTools: Object.keys(ALL_TOOLS).length,
        tools: topResults,
        note: "Matched tool schemas have been automatically mounted into your active session context.",
      };
    },
  },
  {
    name: "list_categories",
    description: "List all 88 tool categories with available tool counts and enablement status.",
    category: "Platform Core",
    tier: "free",
    inputSchema: {
      type: "object",
      properties: {
        enabledOnly: { type: "boolean", description: "Filter only currently activated categories" },
      },
    },
    handler: async (args, ctx) => {
      const enabledOnly = Boolean(args.enabledOnly);
      const session = ctx.sessionId ? getOrCreateSession(ctx.sessionId) : null;
      const activeCats = session ? session.activatedCategories : ["Platform Core"];

      const categories = MCP_CATEGORIES.map((cat) => {
        const isEnabled = activeCats.some(
          (c) => c.toLowerCase() === cat.name.toLowerCase() || c.toLowerCase() === cat.id.toLowerCase()
        );
        return {
          id: cat.id,
          name: cat.name,
          count: cat.count,
          icon: cat.icon,
          isEnabled,
          description: `Tools for ${cat.name}`,
        };
      }).filter((cat) => !enabledOnly || cat.isEnabled);

      return {
        totalCategories: 88,
        activeCategoriesCount: activeCats.length,
        categories,
        gatewayTools: [...GATEWAY_TOOL_NAMES],
      };
    },
  },
  {
    name: "enable_category",
    description: "Dynamically mount all schemas and endpoints for a specific category into active context.",
    category: "Platform Core",
    tier: "free",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Category name or ID to mount", required: true },
      },
      required: ["category"],
    },
    handler: async (args, ctx) => {
      const catInput = String(args.category || "").trim().toLowerCase();
      const matchedCat = MCP_CATEGORIES.find(
        (c) => c.id.toLowerCase() === catInput || c.name.toLowerCase() === catInput || c.name.toLowerCase().includes(catInput)
      );

      if (!matchedCat) {
        return {
          status: "error",
          message: `Category '${args.category}' not found. Use list_categories to browse available categories.`,
        };
      }

      let unlockedTools: string[] = [];
      if (ctx.sessionId) {
        const session = getOrCreateSession(ctx.sessionId);
        if (!session.activatedCategories.includes(matchedCat.name)) {
          session.activatedCategories.push(matchedCat.name);
        }
        // Add all tools from that category
        for (const tool of matchedCat.tools) {
          if (!session.activatedTools.includes(tool.name)) {
            session.activatedTools.push(tool.name);
          }
          unlockedTools.push(tool.name);
        }
        notifyToolsListChanged(ctx.sessionId);
      } else {
        unlockedTools = matchedCat.tools.map((t) => t.name);
      }

      return {
        status: "success",
        category: matchedCat.name,
        categoryId: matchedCat.id,
        unlockedToolsCount: matchedCat.count,
        tools: unlockedTools,
        message: `Successfully mounted ${matchedCat.name}. All ${matchedCat.count} tools are now accessible in active context.`,
      };
    },
  },
  {
    name: "get_balance",
    description: "Check your current credit quota, rate limits, and API consumption tier.",
    category: "Platform Core",
    tier: "free",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (_args, ctx) => {
      return {
        balance: 1450.0,
        currency: "credits",
        tier: ctx.apiKey ? "Developer Pro (Authenticated)" : "Developer Free (Anonymous)",
        monthlyQuotaRemaining: "92%",
        rateLimit: ctx.apiKey ? "600 requests/minute" : "60 requests/minute",
        edgeRegion: "LHR (Cloudflare Workers Edge)",
      };
    },
  },
  {
    name: "get_status",
    description: "Retrieve health, edge region, latency, and available feature status.",
    category: "Platform Core",
    tier: "free",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (_args, ctx) => {
      const session = ctx.sessionId ? getOrCreateSession(ctx.sessionId) : null;
      return {
        status: "healthy",
        version: "1.0.0-mvp",
        edgeRegion: "LHR (London Edge)",
        runtimes: "Cloudflare Workers (V8 isolates)",
        activeCategories: session ? session.activatedCategories : ["Platform Core"],
        totalAvailableTools: Object.keys(ALL_TOOLS).length,
        latencyMs: 3.4,
        features: {
          progressiveDisclosure: true,
          dynamicHydration: true,
          sseStreaming: true,
          mcpRegistrySupport: true,
        },
      };
    },
  },
];

// 2. MCP Registry Tools (PRD Section 7)
export const REGISTRY_TOOLS: ToolDefinition[] = [
  {
    name: "mcp_registry_search",
    description: "Search across Smithery, Official MCP Registry, and Glama for MCP servers by keyword.",
    category: "MCP Registry",
    tier: "free",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords (e.g. postgres, brave search, slack)", required: true },
        registry: { type: "string", description: "Registry filter: all, official, smithery, glama", enum: ["all", "official", "smithery", "glama"] },
        limit: { type: "number", description: "Maximum servers to return (default: 10)" },
      },
      required: ["query"],
    },
    handler: async (args) => {
      const query = String(args.query || "").toLowerCase();
      const registry = String(args.registry || "all").toLowerCase();
      const limit = typeof args.limit === "number" ? Math.min(args.limit, 20) : 10;

      const filtered = MCP_REGISTRY_SERVERS.filter((s) => {
        if (registry !== "all" && s.registrySource !== registry) return false;
        const matchesText =
          s.id.toLowerCase().includes(query) ||
          s.name.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.tags.some((t) => t.toLowerCase().includes(query));
        return matchesText;
      });

      const sliced = filtered.slice(0, limit).map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        registrySource: s.registrySource,
        transportType: s.transport,
        installCount: s.installCount || 1000,
        tags: s.tags,
        tools: s.tools || [],
      }));

      return {
        query,
        registry,
        totalFound: filtered.length,
        servers: sliced,
      };
    },
  },
  {
    name: "mcp_registry_get",
    description: "Get detailed information about a specific MCP server including connection configuration, required environment variables, and tool list.",
    category: "MCP Registry",
    tier: "free",
    inputSchema: {
      type: "object",
      properties: {
        serverId: { type: "string", description: "The server ID returned from registry search", required: true },
      },
      required: ["serverId"],
    },
    handler: async (args) => {
      const serverId = String(args.serverId || "");
      const server = MCP_REGISTRY_SERVERS.find((s) => s.id.toLowerCase() === serverId.toLowerCase());

      if (!server) {
        return {
          error: `Server with ID '${serverId}' not found in registries. Use mcp_registry_search to discover valid IDs.`,
        };
      }

      return {
        id: server.id,
        name: server.name,
        description: server.description,
        registrySource: server.registrySource,
        transport: server.transport,
        homepage: server.homepage,
        repository: server.repository,
        installCount: server.installCount,
        requiredEnv: server.env || {},
        tools: server.tools || [],
        configTemplate: server.configTemplate,
        clientSnippets: {
          cursor: {
            mcpServers: {
              [server.name.toLowerCase().replace(/[^a-z0-9]/g, "-")]: server.configTemplate,
            },
          },
        },
      };
    },
  },
  {
    name: "mcp_registry_install",
    description: "Generate auto-configured client snippet or mount an MCP server via proxy.",
    category: "MCP Registry",
    tier: "free",
    inputSchema: {
      type: "object",
      properties: {
        serverId: { type: "string", description: "Server ID to install", required: true },
        clientType: {
          type: "string",
          description: "Target client: cursor, claude_desktop, claude_code, http",
          enum: ["cursor", "claude_desktop", "claude_code", "http"],
        },
        envVariables: { type: "object", description: "Key-value environment variables" },
      },
      required: ["serverId"],
    },
    handler: async (args) => {
      const serverId = String(args.serverId || "");
      const clientType = String(args.clientType || "cursor").toLowerCase();
      const envVars = (args.envVariables as Record<string, string>) || {};

      const server = MCP_REGISTRY_SERVERS.find((s) => s.id.toLowerCase() === serverId.toLowerCase());
      if (!server) {
        return {
          error: `Server '${serverId}' not found in registry.`,
        };
      }

      // Record in installed list
      installedServers.set(server.id, {
        id: server.id,
        name: server.name,
        transport: server.transport,
        status: "active",
        installedAt: Date.now(),
      });

      // Build ready-to-copy snippet
      const serverKey = server.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
      let snippet: unknown;
      let rawCode = "";

      if (clientType === "cursor" || clientType === "claude_desktop") {
        const config = JSON.parse(JSON.stringify(server.configTemplate));
        if (server.env) {
          config.env = config.env || {};
          for (const [key] of Object.entries(server.env)) {
            config.env[key] = envVars[key] || `YOUR_${key}`;
          }
        }
        snippet = {
          mcpServers: {
            [serverKey]: config,
          },
        };
        rawCode = JSON.stringify(snippet, null, 2);
      } else if (clientType === "claude_code") {
        rawCode = `claude mcp add ${serverKey} -- ${server.id}`;
      } else {
        rawCode = `curl -X POST https://next.spike.land/api/mcp/proxy/${encodeURIComponent(server.id)}`;
      }

      return {
        status: "mounted",
        serverId: server.id,
        serverName: server.name,
        clientType,
        snippet,
        codeSnippet: rawCode,
        proxyUrl: `https://next.spike.land/api/mcp/proxy/${encodeURIComponent(server.id)}`,
        message: `Successfully mounted ${server.name} to workspace. Ready for client integration.`,
      };
    },
  },
  {
    name: "mcp_registry_list_installed",
    description: "List all currently configured or proxy-mounted MCP servers in the current workspace.",
    category: "MCP Registry",
    tier: "free",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      const list = Array.from(installedServers.values()).map((s) => ({
        id: s.id,
        name: s.name,
        transport: s.transport,
        status: s.status,
        latencyMs: Number((Math.random() * 3 + 1).toFixed(1)),
        uptime: "99.99%",
      }));

      return {
        count: list.length,
        servers: list,
      };
    },
  },
];

// Initialize ALL_TOOLS catalogue
function initializeCatalog() {
  // 1. Gateway tools
  for (const t of GATEWAY_TOOLS) {
    ALL_TOOLS[t.name] = t;
  }
  // 2. Registry tools
  for (const t of REGISTRY_TOOLS) {
    ALL_TOOLS[t.name] = t;
  }

  // 3. Platform catalogue tools from MCP_CATEGORIES
  for (const cat of MCP_CATEGORIES) {
    for (const item of cat.tools) {
      if (ALL_TOOLS[item.name]) continue;

      const props: Record<string, { type: "string" | "number" | "boolean" | "object" | "array"; description: string; required?: boolean }> = {};
      const required: string[] = [];

      for (const [key, val] of Object.entries(item.parameters)) {
        props[key] = {
          type: (val.type as "string" | "number" | "boolean" | "object" | "array") || "string",
          description: val.description,
          required: val.required,
        };
        if (val.required) required.push(key);
      }

      ALL_TOOLS[item.name] = {
        name: item.name,
        description: item.description,
        category: item.category,
        tier: "free",
        inputSchema: {
          type: "object",
          properties: props,
          required: required.length > 0 ? required : undefined,
        },
        handler: async (args) => {
          return {
            ...item.mockResponse,
            executedAt: new Date().toISOString(),
            receivedArgs: args,
            edgeStatus: "processed_at_edge",
          };
        },
      };
    }
  }
}

initializeCatalog();

// Progressive Tool Resolver for a given Session
export function getActiveToolsForSession(sessionId?: string): ToolDefinition[] {
  if (!sessionId) {
    return [...GATEWAY_TOOLS];
  }

  const session = getOrCreateSession(sessionId);
  const result: ToolDefinition[] = [...GATEWAY_TOOLS];
  const seen = new Set<string>(GATEWAY_TOOL_NAMES);

  // Add tools from activated categories
  for (const catName of session.activatedCategories) {
    const matchedCategory = MCP_CATEGORIES.find(
      (c) => c.name.toLowerCase() === catName.toLowerCase() || c.id.toLowerCase() === catName.toLowerCase()
    );
    if (matchedCategory) {
      for (const toolItem of matchedCategory.tools) {
        if (!seen.has(toolItem.name) && ALL_TOOLS[toolItem.name]) {
          result.push(ALL_TOOLS[toolItem.name]);
          seen.add(toolItem.name);
        }
      }
    }
  }

  // Add individually hydrated tools
  for (const toolName of session.activatedTools) {
    if (!seen.has(toolName) && ALL_TOOLS[toolName]) {
      result.push(ALL_TOOLS[toolName]);
      seen.add(toolName);
    }
  }

  return result;
}

// JSON-RPC 2.0 Dispatcher (Core Gateway Engine)
export async function dispatchJsonRpc(
  request: JSONRPCRequest,
  ctx: RequestContext
): Promise<JSONRPCResponse | null> {
  const { id = null, method, params = {} } = request;

  // JSON-RPC specification validation
  if (request.jsonrpc !== "2.0" || !method) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32600,
        message: "Invalid Request: 'jsonrpc' must be '2.0' and 'method' is required",
      },
    };
  }

  // Handle Notifications (no response needed for JSON-RPC notifications if id is omitted or null)
  if (method === "notifications/initialized") {
    return null;
  }

  try {
    switch (method) {
      case "initialize": {
        const clientInfo = (params.clientInfo as { name: string; version: string }) || undefined;
        if (ctx.sessionId) {
          getOrCreateSession(ctx.sessionId, clientInfo);
        }

        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: { listChanged: true },
            },
            serverInfo: {
              name: "spike-land-gateway",
              version: "1.0.0-mvp",
            },
          },
        };
      }

      case "ping": {
        return {
          jsonrpc: "2.0",
          id,
          result: {},
        };
      }

      case "tools/list": {
        const activeTools = getActiveToolsForSession(ctx.sessionId);
        const toolsResult = activeTools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        }));

        return {
          jsonrpc: "2.0",
          id,
          result: {
            tools: toolsResult,
          },
        };
      }

      case "tools/call": {
        const toolName = String(params.name || "");
        const toolArgs = (params.arguments as Record<string, unknown>) || {};

        if (!toolName) {
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32602,
              message: "Invalid params: 'name' is required for tools/call",
            },
          };
        }

        const tool = ALL_TOOLS[toolName];
        if (!tool) {
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Tool not found. Use search_tools to discover available capabilities. Unknown tool: '${toolName}'`,
            },
          };
        }

        // Auto-hydration check
        let autoHydratedNote = "";
        if (ctx.sessionId) {
          const session = getOrCreateSession(ctx.sessionId);
          const isGateway = GATEWAY_TOOL_NAMES.includes(toolName as (typeof GATEWAY_TOOL_NAMES)[number]);
          const isCategoryActivated = session.activatedCategories.some(
            (c) => c.toLowerCase() === tool.category.toLowerCase()
          );
          const isIndividuallyActivated = session.activatedTools.includes(toolName);

          if (!isGateway && !isCategoryActivated && !isIndividuallyActivated) {
            session.activatedTools.push(toolName);
            autoHydratedNote = `[Info: Tool '${toolName}' was auto-mounted into active session context]\n`;
            notifyToolsListChanged(ctx.sessionId);
          }
        }

        // Execute tool handler
        const executionOutput = tool.handler ? await tool.handler(toolArgs, ctx) : { status: "success" };

        const content: Array<{ type: string; text: string }> = [];
        if (autoHydratedNote) {
          content.push({
            type: "text",
            text: autoHydratedNote.trim(),
          });
        }
        content.push({
          type: "text",
          text: typeof executionOutput === "string" ? executionOutput : JSON.stringify(executionOutput, null, 2),
        });

        return {
          jsonrpc: "2.0",
          id,
          result: {
            content,
            isError: false,
          },
        };
      }

      default: {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Method not found: '${method}'`,
          },
        };
      }
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32603,
        message: `Internal error: ${errorMsg}`,
      },
    };
  }
}
