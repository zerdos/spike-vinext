/**
 * Spike Land Meta-MCP Gateway Implementation (MVP)
 * PRD Section 4 & 6: mount_mcp_server, discover_tools, run_tool
 */

import {
  Env,
  MountedServer,
  MountedToolDefinition,
  MountMcpServerInput,
  MountMcpServerOutput,
  DiscoverToolsInput,
  RunToolInput,
  SessionState,
} from "./types.js";
import {
  isValidNamespace,
  validateUpstreamUrl,
  detectPlaintextSecret,
} from "./security.js";

export const MAX_PAYLOAD_CHARS = 32768; // 32 KB character limit
export const HANDSHAKE_TIMEOUT_MS = 5000; // 5s timeout
export const EXECUTION_TIMEOUT_MS = 15000; // 15s timeout
export const SESSION_TTL_SECONDS = 86400; // 24 hours
export const MAX_DISCOVERED_TOOLS = 3;
export const MAX_DESCRIPTION_LENGTH = 300;

// The 3 Gateway Tools exposed to LLM
export const META_MCP_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "mount_mcp_server",
      description:
        "Connects to a remote Streamable HTTP MCP server, fetches tools/list, caches schemas in Cloudflare KV, and returns a concise summary (<100 tokens).",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description:
              "Direct HTTPS MCP endpoint URL (e.g., 'https://mcp.spike.land/mcp' or 'https://api.example.com/mcp').",
          },
          namespace: {
            type: "string",
            pattern: "^[a-z0-9_]{2,16}$",
            description:
              "Short prefix for tools from this server (e.g., 'spike', 'pg', 'gh').",
          },
          authSecretName: {
            type: "string",
            description:
              "Optional name of the Worker environment secret to inject as Bearer token (e.g., 'GITHUB_TOKEN'). Never pass raw secrets.",
          },
        },
        required: ["url", "namespace"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "discover_tools",
      description:
        "Searches cached tool descriptions and names in the current KV session and returns full JSON schemas for matching tools.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Keywords or namespace prefix to search for (e.g., 'pg describe table').",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "run_tool",
      description: "Executes a discovered tool by its namespaced name.",
      parameters: {
        type: "object",
        properties: {
          tool_name: {
            type: "string",
            description: "Namespaced tool name (e.g., 'pg.describe_table').",
          },
          arguments: {
            type: "object",
            description: "Key-value arguments matching the tool's inputSchema.",
          },
        },
        required: ["tool_name", "arguments"],
      },
    },
  },
];

export async function getSessionState(
  sessionId: string,
  env: Env
): Promise<SessionState> {
  const key = `session:${sessionId}`;
  if (env.SESSION_KV) {
    try {
      const existing = await env.SESSION_KV.get(key, "json");
      if (existing && typeof existing === "object") {
        return {
          sessionId,
          mountedServers: (existing as SessionState).mountedServers || {},
        };
      }
    } catch {
      // Fallback on error or empty
    }
  }
  return {
    sessionId,
    mountedServers: {},
  };
}

export async function saveSessionState(
  sessionState: SessionState,
  env: Env
): Promise<void> {
  const key = `session:${sessionState.sessionId}`;
  if (env.SESSION_KV) {
    await env.SESSION_KV.put(key, JSON.stringify(sessionState), {
      expirationTtl: SESSION_TTL_SECONDS,
    });
  }
}

/**
 * 6.1 Upstream Handshake (mount_mcp_server)
 */
export async function mountMcpServer(
  input: MountMcpServerInput,
  env: Env,
  sessionState: SessionState,
  options?: { allowLocalhost?: boolean; fetchFn?: typeof fetch }
): Promise<MountMcpServerOutput | { error: { code: number; message: string } }> {
  const fetchImpl = options?.fetchFn ?? fetch;

  // 1. Namespace validation
  if (!input.namespace || !isValidNamespace(input.namespace)) {
    return {
      error: {
        code: -32602,
        message: `Invalid namespace '${input.namespace}'. Must match ^[a-z0-9_]{2,16}$.`,
      },
    };
  }

  // 2. Reject raw secrets in url or authSecretName
  if (detectPlaintextSecret(input.url)) {
    return {
      error: {
        code: -32602,
        message: "Security Error: URL contains what appears to be a plaintext secret.",
      },
    };
  }

  if (input.authSecretName && detectPlaintextSecret(input.authSecretName)) {
    return {
      error: {
        code: -32602,
        message:
          "Security Error: authSecretName contains raw secret patterns. Pass the environment variable name (e.g., 'GITHUB_TOKEN' or 'env:GITHUB_TOKEN'), never raw tokens.",
      },
    };
  }

  // 3. SSRF and protocol check
  const ssrfCheck = validateUpstreamUrl(input.url, {
    allowLocalhost: options?.allowLocalhost,
  });
  if (!ssrfCheck.valid) {
    return {
      error: {
        code: -32602,
        message: ssrfCheck.error || "SSRF validation failed.",
      },
    };
  }

  // 4. Resolve authSecretName from env
  let bearerToken: string | undefined;
  let secretKeyName: string | undefined;
  if (input.authSecretName) {
    secretKeyName = input.authSecretName.startsWith("env:")
      ? input.authSecretName.slice(4)
      : input.authSecretName;

    const val = env[secretKeyName];
    if (typeof val === "string") {
      bearerToken = val;
    } else {
      return {
        error: {
          code: -32602,
          message: `Worker secret '${secretKeyName}' not found in environment.`,
        },
      };
    }
  }

  // 5. Send JSON-RPC 2.0 tools/list request with 5,000 ms timeout
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (bearerToken) {
    headers["Authorization"] = bearerToken.startsWith("Bearer ")
      ? bearerToken
      : `Bearer ${bearerToken}`;
  }

  let res: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HANDSHAKE_TIMEOUT_MS);

  try {
    res = await fetchImpl(input.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isTimeout =
      (err as { name?: string })?.name === "AbortError" ||
      String(err).includes("timed out") ||
      controller.signal.aborted;
    return {
      error: {
        code: -32000,
        message: isTimeout
          ? `Upstream handshake timed out after ${HANDSHAKE_TIMEOUT_MS}ms.`
          : `Failed to connect to upstream MCP server: ${String(err)}`,
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    return {
      error: {
        code: -32000,
        message: `Upstream MCP server returned HTTP ${res.status}: ${res.statusText}`,
      },
    };
  }

  let body: any;
  try {
    body = await res.json();
  } catch {
    return {
      error: {
        code: -32700,
        message: "Failed to parse JSON response from upstream MCP server.",
      },
    };
  }

  if (body?.error) {
    return {
      error: {
        code: body.error.code || -32000,
        message: body.error.message || "Upstream MCP server returned an error.",
      },
    };
  }

  const rawTools: Array<{
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
  }> = body?.result?.tools || [];

  // 6. Prefix each returned tool with <namespace>., cap description at 300 chars
  const mountedTools: MountedToolDefinition[] = rawTools.map((t) => ({
    namespacedName: `${input.namespace}.${t.name}`,
    upstreamName: t.name,
    namespace: input.namespace,
    description: (t.description || "").slice(0, MAX_DESCRIPTION_LENGTH),
    inputSchema: t.inputSchema || { type: "object", properties: {} },
  }));

  // 7. Save to sessionState and KV
  sessionState.mountedServers[input.namespace] = {
    namespace: input.namespace,
    url: input.url,
    authSecretName: secretKeyName,
    tools: mountedTools,
    mountedAt: Date.now(),
  };

  await saveSessionState(sessionState, env);

  // 8. Return <100-token summary output
  return {
    status: "mounted",
    namespace: input.namespace,
    toolCount: mountedTools.length,
    sampleTools: mountedTools.slice(0, 3).map((t) => t.namespacedName),
    hint: `Call discover_tools({ query: '${input.namespace} <keyword>' }) to get parameter schemas.`,
  };
}

/**
 * 6.2 Keyword Discovery (discover_tools)
 */
export function discoverTools(
  input: DiscoverToolsInput,
  sessionState: SessionState,
  nativeTools: MountedToolDefinition[] = []
): MountedToolDefinition[] {
  const query = (input.query || "").trim().toLowerCase();
  if (!query) return [];

  const queryTokens = query.split(/\s+/).filter(Boolean);

  // Aggregate all candidate tools
  const allTools: MountedToolDefinition[] = [...nativeTools];
  for (const server of Object.values(sessionState.mountedServers || {})) {
    allTools.push(...server.tools);
  }

  const scored: Array<{ tool: MountedToolDefinition; score: number }> = [];

  for (const tool of allTools) {
    let score = 0;
    const nameLower = tool.namespacedName.toLowerCase();
    const descLower = tool.description.toLowerCase();
    const toolNsLower = tool.namespace.toLowerCase();

    // Check query token overlap
    for (const token of queryTokens) {
      if (nameLower.includes(token)) {
        score += 3;
      }
      if (descLower.includes(token)) {
        score += 1;
      }
    }

    // Exact matches bonus
    if (nameLower === query || tool.upstreamName.toLowerCase() === query) {
      score += 10;
    }

    // PRD 6.2 requirement: 2x weight if the query starts with the tool's namespace
    if (query.startsWith(toolNsLower)) {
      score *= 2;
    }

    if (score > 0) {
      scored.push({ tool, score });
    }
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Return top 3 full JSON schemas
  return scored.slice(0, MAX_DISCOVERED_TOOLS).map((s) => s.tool);
}

/**
 * 6.3 Proxied Execution (run_tool)
 */
export async function runTool(
  input: RunToolInput,
  env: Env,
  sessionState: SessionState,
  options?: {
    allowLocalhost?: boolean;
    fetchFn?: typeof fetch;
    nativeHandlers?: Record<string, (args: any) => Promise<any> | any>;
  }
): Promise<{ result?: unknown; error?: { code: number; message: string } }> {
  const fetchImpl = options?.fetchFn ?? fetch;

  // 1. Guardrail: Plaintext Secret Check (AC3)
  if (detectPlaintextSecret(input.arguments)) {
    return {
      error: {
        code: -32602,
        message:
          "Security Error: Plaintext API keys/tokens detected in tool arguments. Raw secrets must never enter LLM prompts; pass them via authSecretName and Worker environment variables.",
      },
    };
  }

  // 2. Split tool_name on the first '.' into [namespace, upstreamName]
  const dotIndex = input.tool_name.indexOf(".");
  if (dotIndex === -1) {
    return {
      error: {
        code: -32602,
        message: `Invalid tool name '${input.tool_name}'. Must be namespaced as '<namespace>.<tool_name>'.`,
      },
    };
  }

  const namespace = input.tool_name.slice(0, dotIndex);
  const upstreamName = input.tool_name.slice(dotIndex + 1);

  // Check native tools handler if registered
  if (options?.nativeHandlers && options.nativeHandlers[input.tool_name]) {
    try {
      const res = await options.nativeHandlers[input.tool_name](input.arguments);
      return { result: res };
    } catch (e: any) {
      return {
        error: {
          code: -32000,
          message: `Native tool execution error: ${e?.message || String(e)}`,
        },
      };
    }
  }

  // 3. Look up mounted server in session
  const server = sessionState.mountedServers?.[namespace];
  if (!server) {
    return {
      error: {
        code: -32601,
        message: `Server for namespace '${namespace}' is not mounted. Call mount_mcp_server first.`,
      },
    };
  }

  // 4. Resolve auth header if server has authSecretName
  let bearerToken: string | undefined;
  if (server.authSecretName) {
    const val = env[server.authSecretName];
    if (typeof val === "string") {
      bearerToken = val;
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (bearerToken) {
    headers["Authorization"] = bearerToken.startsWith("Bearer ")
      ? bearerToken
      : `Bearer ${bearerToken}`;
  }

  // 5. Dispatch JSON-RPC 2.0 tools/call with 15,000 ms timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetchImpl(server.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: upstreamName,
          arguments: input.arguments,
        },
      }),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isTimeout =
      (err as { name?: string })?.name === "AbortError" ||
      String(err).includes("timed out") ||
      controller.signal.aborted;
    return {
      error: {
        code: -32000,
        message: isTimeout
          ? `Upstream tool call timed out after ${EXECUTION_TIMEOUT_MS}ms.`
          : `Failed to execute upstream tool: ${String(err)}`,
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }

  // 6. Read response text and apply 32 KB truncation limit (PRD 6.3)
  const rawText = await res.text();
  let text = rawText;
  let isTruncated = false;

  if (text.length > MAX_PAYLOAD_CHARS) {
    text = text.slice(0, MAX_PAYLOAD_CHARS) + "\n...[TRUNCATED BY EDGE HARNESS]";
    isTruncated = true;
  }

  if (!res.ok) {
    return {
      error: {
        code: -32000,
        message: `Upstream tool execution returned HTTP ${res.status}: ${text}`,
      },
    };
  }

  if (isTruncated) {
    return { result: text };
  }

  // Attempt to parse JSON response
  try {
    const json = JSON.parse(text);
    if (json.error) {
      return {
        error: {
          code: json.error.code || -32000,
          message: json.error.message || "Upstream tool returned error.",
        },
      };
    }
    return { result: json.result ?? json };
  } catch {
    return { result: text };
  }
}
