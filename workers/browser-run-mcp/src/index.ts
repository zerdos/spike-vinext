import {
  BROWSER_RUN_TOOLS,
  BROWSER_RUN_TOOL_NAMES,
  executeQuickAction,
  startCrawlJob,
  getCrawlJobStatus,
  cancelCrawlJob,
  acquireBrowserSession,
  listBrowserSessions,
  closeBrowserSession,
  getBrowserLiveView,
  executeBrowserDevtools,
  executeBrowserCdpCommand,
  type BrowserRunBinding,
  type BrowserRunEnv,
  type BrowserRunQuickActionType,
} from "../../../lib/browser-run";
import type { JSONRPCRequest, JSONRPCResponse, RequestContext } from "../../../lib/mcp-types";

export interface Env extends BrowserRunEnv {
  BROWSER?: BrowserRunBinding;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  AI?: unknown;
}

export const WORKER_NAME = "spike-browser-run-mcp";
export const WORKER_VERSION = "2.0.0-mcp2026";
export const CANONICAL_WORKER_URI = "https://spike-browser-run-mcp.spikeland.workers.dev";
export const SUPPORTED_PROTOCOL_VERSIONS = [
  "2026-07-28",
  "2025-11-25",
  "2024-11-05",
] as const;

const QUICK_ACTIONS_SET = new Set<BrowserRunQuickActionType>([
  "content",
  "screenshot",
  "pdf",
  "markdown",
  "snapshot",
  "accessibilityTree",
  "scrape",
  "json",
  "links",
]);

const TOOL_MAP = new Map(BROWSER_RUN_TOOLS.map((t) => [t.name, t]));

function getCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, MCP-Protocol-Version, Mcp-Method, Mcp-Name",
  };
}

function getOAuthMetadata(resourceUri = CANONICAL_WORKER_URI) {
  return {
    resource: resourceUri,
    authorization_servers: ["https://auth.spike.land/oauth2"],
    bearer_methods_supported: ["header"],
    scopes_supported: [
      "mcp:tools:read",
      "mcp:tools:execute",
      "browser-rendering:read",
      "browser-rendering:write",
    ],
    client_id_metadata_document_supported: true,
    rfc8707_audience_binding_required: true,
    token_passthrough_prohibited: true,
  };
}

export async function handleMcpJsonRpc(
  req: JSONRPCRequest,
  env: Env,
  headers?: Headers
): Promise<JSONRPCResponse | null> {
  const { id = null, method, params = {} } = req;

  if (req.jsonrpc !== "2.0" || !method) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32600,
        message: "Invalid Request: 'jsonrpc' must be '2.0' and 'method' is required",
      },
    };
  }

  // SEP-2243: Protocol Desynchronization Defense (-32020 HeaderMismatchError)
  if (headers) {
    const headerMethod = headers.get("Mcp-Method") || headers.get("mcp-method");
    const headerName = headers.get("Mcp-Name") || headers.get("mcp-name");
    if (headerMethod && headerMethod.trim() !== method) {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32020,
          message: `HeaderMismatchError: HTTP 'Mcp-Method' ('${headerMethod}') disagrees with JSON-RPC method ('${method}')`,
        },
      };
    }
    if (headerName && typeof params.name === "string" && headerName.trim() !== params.name) {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32020,
          message: `HeaderMismatchError: HTTP 'Mcp-Name' ('${headerName}') disagrees with JSON-RPC params.name ('${params.name}')`,
        },
      };
    }
  }

  // SEP-2575: Protocol Version Enforcement (-32022 UnsupportedProtocolVersionError)
  const meta = (params._meta as Record<string, unknown> | undefined) || {};
  const requestedVersion =
    (typeof meta["io.modelcontextprotocol/protocolVersion"] === "string"
      ? meta["io.modelcontextprotocol/protocolVersion"]
      : undefined) ||
    headers?.get("MCP-Protocol-Version") ||
    headers?.get("mcp-protocol-version") ||
    (typeof params.protocolVersion === "string" ? params.protocolVersion : undefined);

  if (
    requestedVersion &&
    !SUPPORTED_PROTOCOL_VERSIONS.includes(
      requestedVersion as (typeof SUPPORTED_PROTOCOL_VERSIONS)[number]
    )
  ) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32022,
        message: `UnsupportedProtocolVersionError: Protocol version '${requestedVersion}' is not supported. Only MCP 2026-07-28 is supported.`,
        data: {
          requestedVersion,
          supportedVersions: [...SUPPORTED_PROTOCOL_VERSIONS],
          sep: "SEP-2575",
        },
      },
    };
  }

  const serverInfoMeta = {
    name: WORKER_NAME,
    version: WORKER_VERSION,
    protocolVersion: "2026-07-28",
    canonicalUri: CANONICAL_WORKER_URI,
    bindingAvailable: Boolean(env?.BROWSER),
  };

  const ctx: RequestContext = {
    browserEnv: env,
    gatewaySlug: "browser-run",
  };

  try {
    switch (method) {
      case "initialize": {
        const clientVersion =
          typeof params.protocolVersion === "string" &&
          SUPPORTED_PROTOCOL_VERSIONS.includes(
            params.protocolVersion as (typeof SUPPORTED_PROTOCOL_VERSIONS)[number]
          )
            ? params.protocolVersion
            : "2025-11-25";

        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: clientVersion,
            supportedProtocolVersions: [...SUPPORTED_PROTOCOL_VERSIONS],
            serverInfo: {
              name: WORKER_NAME,
              version: WORKER_VERSION,
            },
            capabilities: {
              tools: {
                listChanged: true,
              },
            },
            _meta: {
              "io.modelcontextprotocol/serverInfo": serverInfoMeta,
            },
          },
        };
      }

      case "notifications/initialized":
      case "notifications/cancelled": {
        return null;
      }

      case "server/discover": {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            resultType: "complete",
            protocolVersion: "2026-07-28",
            supportedProtocolVersions: [...SUPPORTED_PROTOCOL_VERSIONS],
            serverInfo: {
              name: WORKER_NAME,
              version: WORKER_VERSION,
            },
            capabilities: {
              tools: {
                listChanged: true,
              },
              extensions: {
                "io.modelcontextprotocol/tasks": {
                  version: "2026-07-28",
                  polling: true,
                },
                "io.modelcontextprotocol/ui": {
                  version: "2026-01-26",
                  profiles: ["text/html;profile=mcp-app"],
                },
              },
            },
            browserRunCapabilities: {
              bindingAttached: Boolean(env?.BROWSER),
              quickActions: Array.from(QUICK_ACTIONS_SET),
              crawlSupported: true,
              sessionsSupported: true,
              liveViewSupported: true,
              devtoolsSupported: true,
              rawCdpSupported: true,
              toolsCount: BROWSER_RUN_TOOLS.length,
            },
            oauthProtectedResource: getOAuthMetadata(),
            _meta: {
              "io.modelcontextprotocol/serverInfo": serverInfoMeta,
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

      case "subscriptions/listen": {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            resultType: "complete",
            notification: "notifications/subscriptions/acknowledged",
            _meta: {
              "io.modelcontextprotocol/serverInfo": serverInfoMeta,
            },
          },
        };
      }

      case "tools/list": {
        const sortedTools = [...BROWSER_RUN_TOOLS]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
            ...(t.annotations ? { annotations: t.annotations } : {}),
            ...(t.uiResourceUri ? { _meta: { ui: { resourceUri: t.uiResourceUri } } } : {}),
          }));

        return {
          jsonrpc: "2.0",
          id,
          result: {
            resultType: "complete",
            ttlMs: 3600000,
            cacheScope: "public",
            tools: sortedTools,
            _meta: {
              "io.modelcontextprotocol/serverInfo": serverInfoMeta,
            },
          },
        };
      }

      case "tools/call": {
        const rawName = String(params.name || "").trim();
        const rawArgs = (params.arguments as Record<string, unknown>) || {};

        if (!rawName) {
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32602,
              message: "Invalid params: 'name' is required for tools/call",
            },
          };
        }

        // Support Broker / Universal meta-tool invocations seamlessly
        if (rawName === "list_capability_categories") {
          const payload = {
            protocolVersion: "2026-07-28",
            categories: [
              {
                id: "browser-run",
                name: "Browser Run",
                riskTier: "low-readonly",
                readOnlyHint: true,
                count: BROWSER_RUN_TOOLS.length,
              },
            ],
          };
          return {
            jsonrpc: "2.0",
            id,
            result: {
              resultType: "complete",
              content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
              isError: false,
            },
          };
        }

        if (rawName === "configure_active_categories" || rawName === "discover_tools") {
          const query = typeof rawArgs.query === "string" ? rawArgs.query.toLowerCase() : "";
          const filtered = BROWSER_RUN_TOOLS.filter(
            (t) =>
              !query ||
              t.name.toLowerCase().includes(query) ||
              t.description.toLowerCase().includes(query)
          );
          const payload = {
            status: "success",
            activeCategories: ["Browser Run"],
            positionZeroInvalidated: false,
            disclosedSchemas: filtered.map((t) => ({
              name: t.name,
              category: t.category,
              description: t.description,
              inputSchema: t.inputSchema,
            })),
          };
          return {
            jsonrpc: "2.0",
            id,
            result: {
              resultType: "complete",
              content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
              isError: false,
            },
          };
        }

        if (rawName === "inspect_tool_schema") {
          const targetName = String(rawArgs.tool_name || "");
          const target = TOOL_MAP.get(targetName);
          if (!target) {
            return {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32601,
                message: `Tool '${targetName}' not found in Browser Run MCP server.`,
              },
            };
          }
          const payload = {
            status: "success",
            tool_name: target.name,
            category: target.category,
            description: target.description,
            schemaDialect: "https://json-schema.org/draft/2020-12/schema",
            inputSchema: target.inputSchema,
          };
          return {
            jsonrpc: "2.0",
            id,
            result: {
              resultType: "complete",
              content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
              isError: false,
            },
          };
        }

        const effectiveToolName =
          rawName === "execute_tool" || rawName === "run_tool"
            ? String(rawArgs.tool_name || "")
            : rawName;
        const effectiveArgs =
          rawName === "execute_tool" || rawName === "run_tool"
            ? ((rawArgs.arguments as Record<string, unknown>) || {})
            : rawArgs;

        const tool = TOOL_MAP.get(effectiveToolName);
        if (!tool || !tool.handler) {
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Unknown Browser Run tool: '${effectiveToolName}'. Available tools: ${BROWSER_RUN_TOOL_NAMES.join(", ")}`,
            },
          };
        }

        const output = await tool.handler(effectiveArgs, ctx);
        const isErrorResult =
          output !== null &&
          typeof output === "object" &&
          (output as Record<string, unknown>).success === false;

        return {
          jsonrpc: "2.0",
          id,
          result: {
            resultType: "complete",
            content: [
              {
                type: "text",
                text: typeof output === "string" ? output : JSON.stringify(output, null, 2),
              },
            ],
            isError: isErrorResult,
            _meta: {
              "io.modelcontextprotocol/serverInfo": serverInfoMeta,
            },
          },
        };
      }

      default: {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Method not found: '${method}'. Note: stateful 'initialize' is removed in MCP 2026-07-28 (SEP-2567 / SEP-2575).`,
          },
        };
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32603,
        message: `Internal error: ${message}`,
      },
    };
  }
}

export default {
  async fetch(request: Request, env: Env = {}): Promise<Response> {
    const corsHeaders = getCorsHeaders();

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";

    // 1. RFC 9728 OAuth 2.1 Protected Resource Metadata
    if (request.method === "GET" && pathname === "/.well-known/oauth-protected-resource") {
      return Response.json(getOAuthMetadata(`${url.origin}/mcp`), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // 2. Service Health & Discovery Diagnostics
    if (request.method === "GET" && (pathname === "/" || pathname === "/health" || pathname === "/mcp")) {
      const colo = (request as unknown as { cf?: { colo?: string } }).cf?.colo || "EDGE";
      return Response.json(
        {
          service: "Cloudflare Browser Run MCP Worker",
          name: WORKER_NAME,
          version: WORKER_VERSION,
          protocol: "mcp-jsonrpc-2.0",
          protocolVersion: "2026-07-28",
          supportedProtocolVersions: [...SUPPORTED_PROTOCOL_VERSIONS],
          runtime: "Cloudflare Workers Edge (V8 isolates)",
          datacenter: colo,
          bindingAttached: Boolean(env?.BROWSER),
          endpoints: {
            mcpJsonRpc: "/mcp",
            quickActions: "/quick-action/{action}",
            crawlStart: "POST /crawl",
            crawlStatus: "GET /crawl/{jobId}",
            crawlCancel: "DELETE /crawl/{jobId}",
            sessionsAcquire: "POST /sessions/acquire",
            sessionsList: "GET /sessions",
            sessionsClose: "DELETE /sessions/{sessionId}",
            liveView: "GET /sessions/{sessionId}/live-view",
            devtools: "POST /sessions/{sessionId}/devtools",
            cdp: "POST /sessions/cdp",
            oauthProtectedResource: "/.well-known/oauth-protected-resource",
          },
          quickActions: Array.from(QUICK_ACTIONS_SET),
          toolsCount: BROWSER_RUN_TOOLS.length,
          tools: [...BROWSER_RUN_TOOL_NAMES],
          documentation: "https://developers.cloudflare.com/browser-run/",
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // 3. Direct REST Quick Actions: POST /quick-action/:action
    if (request.method === "POST" && pathname.startsWith("/quick-action/")) {
      const action = pathname.slice("/quick-action/".length) as BrowserRunQuickActionType;
      if (!QUICK_ACTIONS_SET.has(action)) {
        return Response.json(
          {
            success: false,
            error: `Unsupported Quick Action '${action}'. Valid actions: ${Array.from(QUICK_ACTIONS_SET).join(", ")}`,
          },
          { status: 400, headers: corsHeaders }
        );
      }
      let payload: Record<string, unknown> = {};
      try {
        payload = (await request.json()) as Record<string, unknown>;
      } catch {
        return Response.json(
          { success: false, error: "Invalid JSON request body" },
          { status: 400, headers: corsHeaders }
        );
      }
      try {
        const res = await executeQuickAction(action, payload, env);
        return Response.json(res, {
          status: 200,
          headers: corsHeaders,
        });
      } catch (err: unknown) {
        return Response.json(
          { success: false, error: err instanceof Error ? err.message : String(err) },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // 4. Direct REST Crawl API: POST /crawl, GET /crawl/:jobId, DELETE /crawl/:jobId
    if (pathname === "/crawl" && request.method === "POST") {
      let payload: Record<string, unknown> = {};
      try {
        payload = (await request.json()) as Record<string, unknown>;
      } catch {
        return Response.json(
          { success: false, error: "Invalid JSON request body" },
          { status: 400, headers: corsHeaders }
        );
      }
      try {
        const res = await startCrawlJob(
          payload as unknown as Parameters<typeof startCrawlJob>[0],
          env
        );
        return Response.json(res, {
          status: 200,
          headers: corsHeaders,
        });
      } catch (err: unknown) {
        return Response.json(
          { success: false, error: err instanceof Error ? err.message : String(err) },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    if (pathname.startsWith("/crawl/")) {
      const jobId = decodeURIComponent(pathname.slice("/crawl/".length));
      if (request.method === "GET") {
        const cursorParam = url.searchParams.get("cursor");
        const cursor = cursorParam ? Number(cursorParam) : undefined;
        const limitParam = url.searchParams.get("limit");
        const limit = limitParam ? Number(limitParam) : undefined;
        const status =
          (url.searchParams.get("status") as Parameters<typeof getCrawlJobStatus>[0]["status"]) ||
          undefined;
        try {
          const res = await getCrawlJobStatus({ job_id: jobId, cursor, limit, status }, env);
          return Response.json(res, {
            status: 200,
            headers: corsHeaders,
          });
        } catch (err: unknown) {
          return Response.json(
            { success: false, error: err instanceof Error ? err.message : String(err) },
            { status: 404, headers: corsHeaders }
          );
        }
      }
      if (request.method === "DELETE") {
        try {
          const res = await cancelCrawlJob({ job_id: jobId }, env);
          return Response.json(res, {
            status: 200,
            headers: corsHeaders,
          });
        } catch (err: unknown) {
          return Response.json(
            { success: false, error: err instanceof Error ? err.message : String(err) },
            { status: 404, headers: corsHeaders }
          );
        }
      }
    }

    // 5. Direct REST Browser Sessions, Live View, DevTools, and CDP endpoints
    if (pathname === "/sessions/acquire" && request.method === "POST") {
      let payload: Record<string, unknown> = {};
      try {
        payload = (await request.json()) as Record<string, unknown>;
      } catch {
        // Empty JSON body is allowed for default session acquisition
      }
      try {
        const res = await acquireBrowserSession(payload, env);
        return Response.json(res, {
          status: 200,
          headers: corsHeaders,
        });
      } catch (err: unknown) {
        return Response.json(
          { success: false, error: err instanceof Error ? err.message : String(err) },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    if (pathname === "/sessions" && request.method === "GET") {
      const sessionId = url.searchParams.get("sessionId") || undefined;
      const includeHistory = url.searchParams.get("includeHistory") === "true";
      const includeLimits = url.searchParams.get("includeLimits") !== "false";
      try {
        const res = await listBrowserSessions({ sessionId, includeHistory, includeLimits }, env);
        return Response.json(res, {
          status: 200,
          headers: corsHeaders,
        });
      } catch (err: unknown) {
        return Response.json(
          { success: false, error: err instanceof Error ? err.message : String(err) },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    if (pathname === "/sessions/cdp" && request.method === "POST") {
      let payload: Record<string, unknown> = {};
      try {
        payload = (await request.json()) as Record<string, unknown>;
      } catch {
        return Response.json(
          { success: false, error: "Invalid JSON request body" },
          { status: 400, headers: corsHeaders }
        );
      }
      try {
        const res = await executeBrowserCdpCommand(
          {
            sessionId: typeof payload.sessionId === "string" ? payload.sessionId : undefined,
            targetId: typeof payload.targetId === "string" ? payload.targetId : undefined,
            method: String(payload.method || ""),
            params: (payload.params as Record<string, unknown>) || undefined,
            keepSessionOpen: Boolean(payload.keepSessionOpen),
          },
          env
        );
        return Response.json(res, {
          status: 200,
          headers: corsHeaders,
        });
      } catch (err: unknown) {
        return Response.json(
          { success: false, error: err instanceof Error ? err.message : String(err) },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    if (pathname.startsWith("/sessions/")) {
      const rest = pathname.slice("/sessions/".length);
      if (rest.endsWith("/live-view") && request.method === "GET") {
        const sessionId = decodeURIComponent(rest.slice(0, -"/live-view".length));
        const readonly = url.searchParams.get("readonly") === "true";
        const mode =
          (url.searchParams.get("mode") as Parameters<typeof getBrowserLiveView>[0]["mode"]) ||
          undefined;
        try {
          const res = await getBrowserLiveView({ sessionId, readonly, mode }, env);
          return Response.json(res, {
            status: 200,
            headers: corsHeaders,
          });
        } catch (err: unknown) {
          return Response.json(
            { success: false, error: err instanceof Error ? err.message : String(err) },
            { status: 400, headers: corsHeaders }
          );
        }
      }
      if (rest.endsWith("/devtools") && request.method === "POST") {
        const sessionId = decodeURIComponent(rest.slice(0, -"/devtools".length));
        let payload: Record<string, unknown> = {};
        try {
          payload = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json(
            { success: false, error: "Invalid JSON request body" },
            { status: 400, headers: corsHeaders }
          );
        }
        try {
          const action = String(
            payload.action || payload.operation || "getVersion"
          ) as Parameters<typeof executeBrowserDevtools>[0]["action"];
          const res = await executeBrowserDevtools(
            {
              sessionId,
              action,
              targetId: typeof payload.targetId === "string" ? payload.targetId : undefined,
              url: typeof payload.url === "string" ? payload.url : undefined,
            },
            env
          );
          return Response.json(res, {
            status: 200,
            headers: corsHeaders,
          });
        } catch (err: unknown) {
          return Response.json(
            { success: false, error: err instanceof Error ? err.message : String(err) },
            { status: 400, headers: corsHeaders }
          );
        }
      }
      if (!rest.includes("/") && request.method === "DELETE") {
        const sessionId = decodeURIComponent(rest);
        try {
          const res = await closeBrowserSession({ sessionId }, env);
          return Response.json(res, {
            status: 200,
            headers: corsHeaders,
          });
        } catch (err: unknown) {
          return Response.json(
            { success: false, error: err instanceof Error ? err.message : String(err) },
            { status: 400, headers: corsHeaders }
          );
        }
      }
    }

    // 6. MCP JSON-RPC 2.0 Endpoint (POST / or POST /mcp)
    if (request.method === "POST" && (pathname === "/" || pathname === "/mcp")) {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return Response.json(
          {
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32700,
              message: "Parse error: Invalid JSON was received by the server",
            },
          },
          { status: 400, headers: corsHeaders }
        );
      }

      if (Array.isArray(body)) {
        const responses: JSONRPCResponse[] = [];
        for (const item of body) {
          const rpcRes = await handleMcpJsonRpc(item as JSONRPCRequest, env, request.headers);
          if (rpcRes) responses.push(rpcRes);
        }
        return Response.json(responses, { status: 200, headers: corsHeaders });
      }

      const rpcRes = await handleMcpJsonRpc(body as JSONRPCRequest, env, request.headers);
      if (!rpcRes) {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      const httpStatus =
        rpcRes.error && (rpcRes.error.code === -32022 || rpcRes.error.code === -32020)
          ? 400
          : 200;

      return Response.json(rpcRes, { status: httpStatus, headers: corsHeaders });
    }

    return Response.json(
      { error: `Route '${request.method} ${pathname}' not found` },
      { status: 404, headers: corsHeaders }
    );
  },
};
