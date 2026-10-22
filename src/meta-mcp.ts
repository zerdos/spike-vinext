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
  resolveServerUrlAndAuth,
  redactSecretFromText,
  parseMcpResponseText,
} from "./security.js";

export const MAX_PAYLOAD_CHARS = 32768; // 32 KB character limit
export const HANDSHAKE_TIMEOUT_MS = 5000; // 5s timeout
export const EXECUTION_TIMEOUT_MS = 15000; // 15s timeout
export const SESSION_TTL_SECONDS = 86400; // 24 hours
export const MAX_DISCOVERED_TOOLS = 3;
export const MAX_DESCRIPTION_LENGTH = 300;

export const SERPAPI_DEFAULT_SERVER: MountedServer = {
  namespace: "serpapi",
  url: "https://mcp.serpapi.com/YOUR_SERPAPI_API_KEY/mcp",
  authSecretName: "SERPAPI_API_KEY",
  tools: [
    {
      namespacedName: "serpapi.search",
      upstreamName: "search",
      namespace: "serpapi",
      description:
        "Universal search tool supporting all SerpApi engines (google_light, google, bing, duckduckgo, youtube, scholar, ebay, amazon) and result types.",
      inputSchema: {
        type: "object",
        properties: {
          params: {
            type: "object",
            description:
              "Engine-specific query parameters passed to SerpApi (e.g. { q: 'cloudflare workers', engine: 'google_light', location: 'United States', output: 'md' }).",
            properties: {
              q: {
                type: "string",
                description: "Search query string.",
              },
              engine: {
                type: "string",
                description:
                  "Search engine to query (default: 'google_light'). Examples: 'google', 'google_light', 'google_news', 'google_scholar', 'google_maps', 'google_finance', 'google_patents', 'bing', 'duckduckgo', 'youtube', 'ebay', 'amazon'.",
              },
              location: {
                type: "string",
                description:
                  "Optional geographic location for localized search results (e.g. 'Austin, TX').",
              },
              output: {
                type: "string",
                enum: ["json", "md"],
                description:
                  "Response format: omit or 'json' for structured JSON, or 'md' for token-efficient Markdown.",
              },
            },
            required: ["q"],
            additionalProperties: true,
          },
          mode: {
            type: "string",
            enum: ["complete", "compact"],
            default: "compact",
            description:
              "Response verbosity mode when returning JSON: 'compact' strips noisy metadata to save context tokens; 'complete' returns full raw metadata.",
          },
        },
        required: ["params"],
      },
    },
  ],
  mountedAt: 0,
};

// The 8 Extended Tools exposed to LLM
export const META_MCP_TOOLS = [
  // Tier 1: Meta-MCP Gateway
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
              "Direct HTTPS MCP endpoint URL (e.g., 'https://spike.land/mcp' or 'https://api.example.com/mcp').",
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
        "Searches cached tool descriptions, names, and saved snippets in the current session. Returns full JSON schemas or TypeScript signatures for matching tools.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Keywords or namespace prefix to search for (e.g., 'pg describe table', 'browser markdown').",
          },
          format: {
            type: "string",
            enum: ["json_schema", "typescript"],
            description:
              "Optional format: 'json_schema' (default) or 'typescript' for concise .d.ts type signatures to write codemode programs.",
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
      description: "Executes a single discovered tool directly by its namespaced name (e.g. 'browser.markdown').",
      parameters: {
        type: "object",
        properties: {
          tool_name: {
            type: "string",
            description: "Namespaced tool name (e.g., 'pg.describe_table', 'browser.markdown').",
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

  // Tier 2: Durable Code Mode Execution & Composable Memory
  {
    type: "function" as const,
    function: {
      name: "codemode",
      description:
        "Execute a JavaScript/TypeScript async program inside an isolated sandbox to orchestrate multiple tools, filter intermediate data, run conditional logic, or invoke saved snippets. Inside the sandbox, call tools via global namespaces (e.g. `await browser.markdown({ url })`, `await pg.query({ sql })`) or use `await codemode.search({ query })`, `await codemode.describe({ target })`, and `await codemode.run({ name, args })`.",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description:
              "An async arrow function expression, e.g. `async () => { const md = await browser.markdown({ url: 'https://example.com' }); return md.slice(0, 500); }`",
          },
          intent: {
            type: "string",
            description:
              "Short human-readable summary of what this code plan does (logged in the durable execution audit trail).",
          },
        },
        required: ["code"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "save_codemode_snippet",
      description:
        "Promote a working codemode execution or routine into a durable, reusable tool stored in SQLite.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            pattern: "^[a-z0-9_]{2,32}$",
            description:
              "Unique identifier for the reusable snippet (e.g., 'audit_landing_page_seo').",
          },
          description: {
            type: "string",
            description:
              "Clear description of what the snippet does and when future turns should call it.",
          },
          executionId: {
            type: "string",
            description:
              "Optional ID of a completed codemode execution to promote directly into a snippet.",
          },
          code: {
            type: "string",
            description:
              "Async function source code if creating or parameterizing the snippet directly.",
          },
          inputSchema: {
            type: "object",
            description:
              "Optional JSON Schema describing the `args` object accepted by this snippet.",
          },
        },
        required: ["name", "description"],
      },
    },
  },

  // Tier 3: Durable Governance, Approvals & Rollbacks
  {
    type: "function" as const,
    function: {
      name: "list_pending_executions",
      description:
        "Inspect all paused Code Mode executions awaiting human confirmation or review.",
      parameters: {
        type: "object",
        properties: {
          executionId: {
            type: "string",
            description: "Optional specific execution ID to filter by.",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "resolve_execution_approval",
      description:
        "Resume or abort a paused Code Mode execution after human confirmation. 'approve' replays prior steps and executes the paused step; 'reject' terminates it.",
      parameters: {
        type: "object",
        properties: {
          executionId: {
            type: "string",
            description:
              "The durable execution ID returned when the codemode run paused for approval.",
          },
          decision: {
            type: "string",
            enum: ["approve", "reject"],
            description:
              "'approve' replays prior steps from durable log and executes the paused step; 'reject' terminates the execution.",
          },
          seq: {
            type: "number",
            description:
              "Sequence number of the pending step (required when decision is 'reject').",
          },
          reason: {
            type: "string",
            description:
              "Optional audit note explaining why the execution was approved or rejected.",
          },
        },
        required: ["executionId", "decision"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "rollback_execution",
      description:
        "Wraps compensation logic (revert) in reverse sequence order for any completed or partially failed execution whose connectors support state reversal.",
      parameters: {
        type: "object",
        properties: {
          executionId: {
            type: "string",
            description:
              "The execution ID whose side effects should be compensated/reverted.",
          },
        },
        required: ["executionId"],
      },
    },
  },
];

const inMemorySessionStore = new Map<string, SessionState>();

export async function getSessionState(
  sessionId: string,
  env: Env
): Promise<SessionState> {
  const key = `session:${sessionId}`;
  let state: SessionState | undefined;

  if (env.SESSION_KV) {
    try {
      const existing = await env.SESSION_KV.get(key, "json");
      if (existing && typeof existing === "object") {
        state = {
          sessionId,
          mountedServers: (existing as SessionState).mountedServers || {},
        };
      }
    } catch {
      // Fallback on error or empty
    }
  }

  // Memory store fallback
  if (!state && inMemorySessionStore.has(sessionId)) {
    state = inMemorySessionStore.get(sessionId)!;
  }

  if (!state) {
    state = {
      sessionId,
      mountedServers: {},
    };
  }

  // Pre-register SERPAPI_DEFAULT_SERVER if env.SERPAPI_API_KEY is present and not already mounted
  if (env.SERPAPI_API_KEY && !state.mountedServers["serpapi"]) {
    state.mountedServers["serpapi"] = {
      ...SERPAPI_DEFAULT_SERVER,
      mountedAt: Date.now(),
    };
  }

  inMemorySessionStore.set(sessionId, state);
  return state;
}

export async function saveSessionState(
  sessionState: SessionState,
  env: Env
): Promise<void> {
  const key = `session:${sessionState.sessionId}`;
  inMemorySessionStore.set(sessionState.sessionId, sessionState);
  if (env.SESSION_KV) {
    try {
      await env.SESSION_KV.put(key, JSON.stringify(sessionState), {
        expirationTtl: SESSION_TTL_SECONDS,
      });
    } catch {
      // Non-fatal if KV put fails
    }
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

  // 3. Resolve URL and secrets
  const authRes = resolveServerUrlAndAuth(
    input.url,
    input.authSecretName,
    env,
    input.namespace
  );
  if (authRes.error) {
    return {
      error: {
        code: -32602,
        message: authRes.error,
      },
    };
  }

  // Reject plaintext secrets in the template URL
  if (detectPlaintextSecret(authRes.templateUrl)) {
    return {
      error: {
        code: -32602,
        message: "Security Error: URL contains what appears to be a plaintext secret.",
      },
    };
  }

  // 4. SSRF and protocol check on resolved URL
  const ssrfCheck = validateUpstreamUrl(authRes.resolvedUrl, {
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

  // 5. Send JSON-RPC 2.0 tools/list request with 5,000 ms timeout
  const isSerpApi = input.namespace === "serpapi" || input.url.includes("serpapi");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: isSerpApi ? "application/json, text/event-stream" : "application/json",
  };
  if (authRes.bearerToken) {
    headers["Authorization"] = authRes.bearerToken.startsWith("Bearer ")
      ? authRes.bearerToken
      : `Bearer ${authRes.bearerToken}`;
  }

  let res: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HANDSHAKE_TIMEOUT_MS);

  try {
    res = await fetchImpl(authRes.resolvedUrl, {
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
    const rawMsg = isTimeout
      ? `Upstream handshake timed out after ${HANDSHAKE_TIMEOUT_MS}ms.`
      : `Failed to connect to upstream MCP server: ${String(err)}`;
    return {
      error: {
        code: -32000,
        message: redactSecretFromText(rawMsg, authRes.secretValue),
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }

  const mcpSessionId = res.headers.get("mcp-session-id");
  if (mcpSessionId) {
    headers["Mcp-Session-Id"] = mcpSessionId;
  }

  let rawText = "";
  try {
    rawText = await res.text();
  } catch (err) {
    return {
      error: {
        code: -32000,
        message: redactSecretFromText(`Failed to read response: ${String(err)}`, authRes.secretValue),
      },
    };
  }

  let body: any = parseMcpResponseText(rawText, res.headers.get("content-type") || "", 1);

  if (!res.ok) {
    return {
      error: {
        code: (body?.error && body.error.code !== -32700) ? body.error.code : -32000,
        message: redactSecretFromText(
          (body?.error && body.error.code !== -32700 && body.error.message)
            ? body.error.message
            : `Upstream MCP server returned HTTP ${res.status}: ${res.statusText}`,
          authRes.secretValue
        ),
      },
    };
  }

  if (body?._rawText && !body?.result && !body?.error) {
    return {
      error: {
        code: -32700,
        message: "Failed to parse JSON response from upstream MCP server.",
      },
    };
  }

  // If upstream returns an error or status 400 with "not initialized", attempt initialize handshake
  if (body?.error) {
    const errMsg = String(body.error.message || "").toLowerCase();
    // If upstream requires initialize handshake first, perform initialize then retry tools/list
    if (errMsg.includes("not initialized")) {
      try {
        const initRes = await fetchImpl(authRes.resolvedUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 2,
            method: "initialize",
            params: {
              protocolVersion: "2024-11-05",
              capabilities: {},
              clientInfo: { name: "spike-agent-harness", version: "1.0.0" },
            },
          }),
        });

        const initSessionId = initRes.headers.get("mcp-session-id");
        if (initSessionId) {
          headers["Mcp-Session-Id"] = initSessionId;
        }

        if (initRes.ok) {
          const retryRes = await fetchImpl(authRes.resolvedUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 3,
              method: "tools/list",
              params: {},
            }),
          });
          if (retryRes.ok) {
            const retryText = await retryRes.text();
            const retryBody = parseMcpResponseText(retryText, retryRes.headers.get("content-type") || "", 3);
            if (retryBody?.result?.tools) {
              body = retryBody;
            }
          }
        }
      } catch {
        // Fall through to error reporting below if retry fails
      }
    }
  }

  if (!res.ok && !body?.result?.tools) {
    return {
      error: {
        code: body?.error?.code || -32000,
        message: redactSecretFromText(
          body?.error?.message ||
            `Upstream MCP server returned HTTP ${res.status}: ${res.statusText}`,
          authRes.secretValue
        ),
      },
    };
  }

  if (body?.error) {
    return {
      error: {
        code: body.error.code || -32000,
        message: redactSecretFromText(
          body.error.message || "Upstream MCP server returned an error.",
          authRes.secretValue
        ),
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

  // 7. Save to sessionState and KV using TEMPLATE URL
  sessionState.mountedServers[input.namespace] = {
    namespace: input.namespace,
    url: authRes.templateUrl,
    authSecretName: authRes.secretKeyName,
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

export function schemaToTypeScriptType(schema: Record<string, unknown> | undefined): string {
  if (!schema || typeof schema !== "object") return "any";
  if (schema.type === "string") return "string";
  if (schema.type === "number" || schema.type === "integer") return "number";
  if (schema.type === "boolean") return "boolean";
  if (schema.type === "array") {
    const itemType = schemaToTypeScriptType(schema.items as Record<string, unknown>);
    return `${itemType}[]`;
  }
  if (schema.type === "object" || schema.properties) {
    const props = (schema.properties as Record<string, any>) || {};
    const required = new Set((schema.required as string[]) || []);
    const entries = Object.entries(props).map(([key, val]) => {
      const isReq = required.has(key);
      const propType = schemaToTypeScriptType(val);
      return `${key}${isReq ? "" : "?"}: ${propType}`;
    });
    if (entries.length === 0) return "Record<string, unknown>";
    return `{ ${entries.join("; ")} }`;
  }
  return "any";
}

/**
 * 6.2 Keyword Discovery (discover_tools)
 */
export function discoverTools(
  input: DiscoverToolsInput,
  sessionState: SessionState,
  nativeTools: MountedToolDefinition[] = [],
  snippets: Array<{ name: string; description: string; inputSchema?: any }> = []
): MountedToolDefinition[] {
  const query = (input.query || "").trim().toLowerCase();
  if (!query) return [];

  const queryTokens = query.split(/\s+/).filter(Boolean);

  // Aggregate all candidate tools
  const allTools: MountedToolDefinition[] = [...nativeTools];
  for (const server of Object.values(sessionState.mountedServers || {})) {
    allTools.push(...server.tools);
  }

  // Include saved snippets
  for (const snippet of snippets) {
    allTools.push({
      namespacedName: `codemode.${snippet.name}`,
      upstreamName: snippet.name,
      namespace: "codemode",
      description: snippet.description,
      inputSchema: (snippet.inputSchema as Record<string, unknown>) || { type: "object", properties: {} },
    });
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

  // Return top 3 full JSON schemas or TypeScript signatures
  const results = scored.slice(0, MAX_DISCOVERED_TOOLS).map((s) => ({ ...s.tool }));

  if (input.format === "typescript") {
    for (const tool of results) {
      tool.typeDefinition = `${tool.namespacedName}(args: ${schemaToTypeScriptType(tool.inputSchema)}): Promise<any>;`;
    }
  }

  return results;
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

  // 2. Check native tools handler if registered (supports exact name e.g. "browser.markdown" or bare "markdown" / "browser_run_markdown")
  if (options?.nativeHandlers) {
    const handler =
      options.nativeHandlers[input.tool_name] ||
      options.nativeHandlers[`browser.${input.tool_name}`] ||
      options.nativeHandlers[`browser_run.${input.tool_name}`];
    if (handler) {
      try {
        const res = await handler(input.arguments);
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
  }

  // 3. Split tool_name on the first '.' into [namespace, upstreamName]
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

  // 4. Look up mounted server in session
  const server = sessionState.mountedServers?.[namespace];
  if (!server) {
    return {
      error: {
        code: -32601,
        message: `Server for namespace '${namespace}' is not mounted. Call mount_mcp_server first.`,
      },
    };
  }

  // Resolve URL and auth secrets
  const authRes = resolveServerUrlAndAuth(
    server.url,
    server.authSecretName,
    env,
    namespace
  );
  if (authRes.error) {
    return {
      error: {
        code: -32602,
        message: authRes.error,
      },
    };
  }

  const ssrfCheck = validateUpstreamUrl(authRes.resolvedUrl, {
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

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (authRes.bearerToken) {
    headers["Authorization"] = authRes.bearerToken.startsWith("Bearer ")
      ? authRes.bearerToken
      : `Bearer ${authRes.bearerToken}`;
  }

  // 5. Dispatch JSON-RPC 2.0 tools/call with 15,000 ms timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetchImpl(authRes.resolvedUrl, {
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
    const rawMsg = isTimeout
      ? `Upstream tool call timed out after ${EXECUTION_TIMEOUT_MS}ms.`
      : `Failed to execute upstream tool: ${String(err)}`;
    return {
      error: {
        code: -32000,
        message: redactSecretFromText(rawMsg, authRes.secretValue),
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
    const errorMsg = redactSecretFromText(
      `Upstream tool execution returned HTTP ${res.status}: ${text}`,
      authRes.secretValue
    );
    return {
      error: {
        code: -32000,
        message: errorMsg,
      },
    };
  }

  if (isTruncated) {
    return { result: redactSecretFromText(text, authRes.secretValue) };
  }

  // Attempt to parse JSON / SSE response
  const json = parseMcpResponseText(text, res.headers.get("content-type") || "");
  if (json.error) {
    return {
      error: {
        code: json.error.code || -32000,
        message: redactSecretFromText(
          json.error.message || "Upstream tool returned error.",
          authRes.secretValue
        ),
      },
    };
  }

  let resPayload = json.result ?? json;
  if (
    resPayload &&
    typeof resPayload === "object" &&
    Array.isArray(resPayload.content) &&
    resPayload.content.length === 1 &&
    typeof resPayload.content[0]?.text === "string"
  ) {
    try {
      const inner = JSON.parse(resPayload.content[0].text);
      if (inner && typeof inner === "object" && !Array.isArray(inner)) {
        resPayload = { ...inner, ...resPayload };
      }
    } catch {
      // Plain text or markdown
    }
  }

  return { result: resPayload };
}
