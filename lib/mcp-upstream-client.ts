/**
 * Pure TypeScript Upstream MCP Client for Cloudflare Workers & Edge V8 Isolates
 * PRD Section 5.2 (Handshake & Schema Interception) & Section 5.4 (Execution Proxy)
 */

import {
  MountedToolDefinition,
  UpstreamTransport,
} from "./types/mcp-mounting";

export interface UpstreamClientOptions {
  endpointUrl: string;
  namespace: string;
  transport?: "auto" | UpstreamTransport;
  authToken?: string;
  customHeaders?: Record<string, string>;
  handshakeTimeoutMs?: number; // default 5,000 ms per PRD
  callTimeoutMs?: number; // default 15,000 ms per PRD
}

export interface HandshakeResult {
  serverInfo: {
    name: string;
    version: string;
  };
  transportUsed: UpstreamTransport;
  tools: MountedToolDefinition[];
  latencyMs: number;
}

export const MAX_PAYLOAD_BYTES = 32 * 1024; // 32 KB payload guardrail (PRD 5.4)
export const MAX_TOOLS_PER_SERVER = 200; // Max 200 tools guardrail (PRD 7.3)
export const MAX_DESCRIPTION_LENGTH = 500; // Strip excessive bloat >500 chars (PRD 5.2)

export class UpstreamMCPClient {
  public endpointUrl: string;
  public namespace: string;
  public transport: "auto" | UpstreamTransport;
  public authToken?: string;
  public customHeaders: Record<string, string>;
  public handshakeTimeoutMs: number;
  public callTimeoutMs: number;

  private postUrl: string;
  private resolvedTransport: UpstreamTransport = "streamable-http";

  constructor(options: UpstreamClientOptions) {
    this.endpointUrl = options.endpointUrl;
    this.postUrl = options.endpointUrl;
    this.namespace = options.namespace;
    this.transport = options.transport || "auto";
    this.authToken = options.authToken;
    this.customHeaders = options.customHeaders || {};
    this.handshakeTimeoutMs = options.handshakeTimeoutMs ?? 5000;
    this.callTimeoutMs = options.callTimeoutMs ?? 15000;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...this.customHeaders,
    };

    if (this.authToken) {
      headers["Authorization"] = this.authToken.startsWith("Bearer ")
        ? this.authToken
        : `Bearer ${this.authToken}`;
    }

    return headers;
  }

  private createTimeoutSignal(timeoutMs: number): { signal: AbortSignal; cleanup: () => void } {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort(new Error(`Upstream request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    return {
      signal: controller.signal,
      cleanup: () => clearTimeout(timeoutId),
    };
  }

  /**
   * Performs the 3-step handshake:
   * 1. URL & Transport Resolution
   * 2. Protocol Handshake (initialize)
   * 3. Catalog Fetch (tools/list)
   */
  public async performHandshake(): Promise<HandshakeResult> {
    const startTime = Date.now();
    let transportToUse: UpstreamTransport =
      this.transport === "sse" ? "sse" : "streamable-http";

    let serverInfo = {
      name: `${this.namespace}-mcp-server`,
      version: "1.0.0",
    };

    // If explicit SSE or auto-detected SSE, connect to stream first to locate endpoint
    if (this.transport === "sse") {
      await this.initSseStream();
      transportToUse = "sse";
    }

    // Step 2: Dispatch initialize
    const initPayload = {
      jsonrpc: "2.0",
      id: "init_1",
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "spike-land-gateway",
          version: "2.0.0-mcp2026",
        },
      },
    };

    let initRes: Response;
    const { signal: initSignal, cleanup: cleanupInit } = this.createTimeoutSignal(
      this.handshakeTimeoutMs
    );

    try {
      initRes = await fetch(this.postUrl, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(initPayload),
        signal: initSignal,
      });
    } catch (err) {
      cleanupInit();
      // If auto transport and fetch failed, check if we should fall back to SSE
      if (this.transport === "auto") {
        try {
          await this.initSseStream();
          transportToUse = "sse";
          const retryInit = await this.postJsonRpc(initPayload, this.handshakeTimeoutMs);
          if (retryInit && typeof retryInit === "object" && "result" in retryInit) {
            const resObj = retryInit.result as { serverInfo?: { name: string; version: string } };
            if (resObj?.serverInfo) {
              serverInfo = resObj.serverInfo;
            }
          }
          initRes = new Response(JSON.stringify(retryInit));
        } catch {
          throw new Error(
            `Failed to connect to upstream MCP server at ${this.endpointUrl}: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      } else {
        throw new Error(
          `Failed to connect to upstream MCP server at ${this.endpointUrl}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    } finally {
      cleanupInit();
    }

    // Check if upstream returned 405 Method Not Allowed or requested SSE
    if (
      this.transport === "auto" &&
      (initRes.status === 405 ||
        initRes.headers.get("content-type")?.includes("text/event-stream"))
    ) {
      await this.initSseStream();
      transportToUse = "sse";
      const retryInit = await this.postJsonRpc(initPayload, this.handshakeTimeoutMs);
      if (retryInit && typeof retryInit === "object" && "result" in retryInit) {
        const resObj = retryInit.result as { serverInfo?: { name: string; version: string } };
        if (resObj?.serverInfo) {
          serverInfo = resObj.serverInfo;
        }
      }
    } else if (initRes.ok) {
      try {
        const data = (await initRes.json()) as {
          result?: { serverInfo?: { name: string; version: string } };
        };
        if (data?.result?.serverInfo) {
          serverInfo = data.result.serverInfo;
        }
      } catch {
        // Fallback to default serverInfo
      }
    }

    this.resolvedTransport = transportToUse;

    // Send notifications/initialized (MCP protocol lifecycle requirement)
    try {
      await fetch(this.postUrl, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        }),
      });
    } catch {
      // Non-fatal notification
    }

    // Step 3: Fetch tools/list
    const toolsPayload = {
      jsonrpc: "2.0",
      id: "tools_list_1",
      method: "tools/list",
      params: {},
    };

    const toolsResponse = await this.postJsonRpc(toolsPayload, this.handshakeTimeoutMs);
    const rawTools =
      (toolsResponse?.result as { tools?: Array<Record<string, unknown>> })?.tools || [];

    // Step 4: Intercept, normalize, truncate descriptions, and cap at 200 tools
    const normalizedTools: MountedToolDefinition[] = [];
    const cappedRawTools = rawTools.slice(0, MAX_TOOLS_PER_SERVER);

    for (const raw of cappedRawTools) {
      const originalName = String(raw.name || "");
      if (!originalName) continue;

      let desc = String(raw.description || "");
      if (desc.length > MAX_DESCRIPTION_LENGTH) {
        desc = `${desc.slice(0, MAX_DESCRIPTION_LENGTH - 3)}...`;
      }

      const inputSchema = (raw.inputSchema as Record<string, unknown>) || {};
      const properties = (inputSchema.properties as Record<string, unknown>) || {};
      const required = Array.isArray(inputSchema.required)
        ? (inputSchema.required as string[])
        : undefined;

      normalizedTools.push({
        namespacedName: `${this.namespace}.${originalName}`,
        upstreamName: originalName,
        namespace: this.namespace,
        description: desc,
        inputSchema: {
          type: "object",
          properties,
          required,
        },
      });
    }

    const latencyMs = Date.now() - startTime;

    return {
      serverInfo,
      transportUsed: transportToUse,
      tools: normalizedTools,
      latencyMs,
    };
  }

  /**
   * Initializes SSE transport discovery by opening stream and reading endpoint event
   */
  private async initSseStream(): Promise<void> {
    const { signal, cleanup } = this.createTimeoutSignal(this.handshakeTimeoutMs);
    try {
      const sseRes = await fetch(this.endpointUrl, {
        headers: {
          Accept: "text/event-stream",
          ...this.customHeaders,
        },
        signal,
      });

      if (!sseRes.ok) {
        throw new Error(`SSE stream connection failed with status ${sseRes.status}`);
      }

      const reader = sseRes.body?.getReader();
      if (!reader) {
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      // Read initial chunks to find 'event: endpoint'
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const endpointMatch = buffer.match(/event:\s*endpoint\s*\ndata:\s*([^\n\r]+)/);
        if (endpointMatch && endpointMatch[1]) {
          const endpointPath = endpointMatch[1].trim();
          this.postUrl = new URL(endpointPath, this.endpointUrl).toString();
          reader.cancel().catch(() => {});
          break;
        }

        if (buffer.length > 4096) {
          reader.cancel().catch(() => {});
          break;
        }
      }
    } finally {
      cleanup();
    }
  }

  /**
   * Dispatches a JSON-RPC request to the resolved upstream POST endpoint
   */
  public async postJsonRpc(
    payload: Record<string, unknown>,
    timeoutMs: number
  ): Promise<Record<string, unknown>> {
    const { signal, cleanup } = this.createTimeoutSignal(timeoutMs);

    try {
      const res = await fetch(this.postUrl, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal,
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(
          `Upstream MCP server returned HTTP ${res.status}: ${errorText.slice(0, 200)}`
        );
      }

      return (await res.json()) as Record<string, unknown>;
    } finally {
      cleanup();
    }
  }

  /**
   * Executes a proxied tool call on the upstream server
   * Handles JSON-RPC framing, edge timeout (15s), and 32 KB payload guardrails.
   */
  public async executeTool(
    upstreamToolName: string,
    args: Record<string, unknown>,
    timeoutMs: number = this.callTimeoutMs
  ): Promise<unknown> {
    const payload = {
      jsonrpc: "2.0",
      id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      method: "tools/call",
      params: {
        name: upstreamToolName,
        arguments: args,
      },
    };

    const response = await this.postJsonRpc(payload, timeoutMs);

    if (response.error) {
      const err = response.error as { code?: number; message?: string; data?: unknown };
      throw new Error(err.message || `Upstream tool error (${err.code || "unknown"})`);
    }

    const result = response.result;

    // Apply 32 KB token guardrail (PRD Section 5.4 / 7.3)
    return this.applyResponseGuardrail(result);
  }

  /**
   * Enforces 32 KB response payload limit to prevent context window explosion
   */
  public applyResponseGuardrail(result: unknown): unknown {
    if (result === undefined || result === null) {
      return result;
    }

    let stringified: string;
    try {
      stringified = typeof result === "string" ? result : JSON.stringify(result);
    } catch {
      stringified = String(result);
    }

    const byteLength = new TextEncoder().encode(stringified).length;
    if (byteLength <= MAX_PAYLOAD_BYTES) {
      return result;
    }

    const truncationWarning =
      "\n\n[Warning: Tool response exceeded 32KB payload guardrail and was truncated by Spike Land Edge Gateway]";

    if (typeof result === "object" && result !== null && "content" in result) {
      const resObj = result as { content?: Array<{ type: string; text: string }> };
      if (Array.isArray(resObj.content)) {
        const truncatedContent = resObj.content.map((item) => {
          if (item.type === "text" && item.text) {
            return {
              ...item,
              text: `${item.text.slice(0, 30000)}${truncationWarning}`,
            };
          }
          return item;
        });
        return {
          ...resObj,
          content: truncatedContent,
          truncated: true,
        };
      }
    }

    // Default string or object truncation
    const safeSlice = stringified.slice(0, 30000);
    return `${safeSlice}${truncationWarning}`;
  }
}
