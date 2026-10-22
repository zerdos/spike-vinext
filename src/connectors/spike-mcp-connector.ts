import { CodemodeConnector, ConnectorTools, ConnectorTool, ToolExecuteContext } from "@cloudflare/codemode";
import { Env, MountedServer, ToolApprovalPolicy } from "../types.js";
import {
  validateUpstreamUrl,
  detectPlaintextSecret,
  resolveServerUrlAndAuth,
  redactSecretFromText,
  parseMcpResponseText,
} from "../security.js";
import { MAX_PAYLOAD_CHARS, EXECUTION_TIMEOUT_MS } from "../meta-mcp.js";

export interface SpikeMcpConnectorOptions {
  allowLocalhost?: boolean;
  fetchFn?: typeof fetch;
  policy?: ToolApprovalPolicy;
  revertHandler?: (
    toolName: string,
    args: unknown,
    result: unknown,
    ctx?: ToolExecuteContext
  ) => Promise<void> | void;
}

export function isMutatingMcpTool(name: string): boolean {
  const lower = name.toLowerCase();
  const readOnlyExact = [
    "search",
    "query",
    "find",
    "read",
    "inspect",
    "check",
    "describe",
    "list",
    "get",
  ];
  if (readOnlyExact.includes(lower)) {
    return false;
  }
  const readOnlyPrefixes = [
    "get_",
    "list_",
    "describe_",
    "search_",
    "read_",
    "find_",
    "query_readonly",
    "check_",
    "inspect_",
  ];
  if (readOnlyPrefixes.some((p) => lower.startsWith(p))) {
    return false;
  }
  const mutatingPrefixes = [
    "delete_",
    "drop_",
    "update_",
    "create_",
    "insert_",
    "exec_",
    "remove_",
    "alter_",
    "send_",
    "write_",
    "post_",
    "patch_",
  ];
  if (mutatingPrefixes.some((p) => lower.startsWith(p))) {
    return true;
  }
  if (
    lower.includes("delete") ||
    lower.includes("drop") ||
    lower.includes("destroy") ||
    lower.includes("remove") ||
    lower.includes("update") ||
    lower.includes("create")
  ) {
    return true;
  }
  return false;
}

export class SpikeMcpConnector extends CodemodeConnector {
  private server: MountedServer;
  private options?: SpikeMcpConnectorOptions;

  constructor(
    ctx: any,
    env: Env,
    server: MountedServer,
    options?: SpikeMcpConnectorOptions
  ) {
    super(ctx, env);
    this.server = server;
    this.options = options;
  }

  name(): string {
    return this.server.namespace;
  }

  protected instructions(): string {
    return `Mounted MCP server '${this.server.namespace}' connecting to ${this.server.url}.`;
  }

  private shouldRequireApproval(toolName: string): boolean {
    const policy = this.options?.policy;
    if (policy) {
      if (
        policy.autoApprovePatterns.some(
          (pat) =>
            toolName === pat ||
            toolName.startsWith(pat) ||
            new RegExp(pat).test(toolName)
        )
      ) {
        return false;
      }
      if (
        policy.requireApprovalPatterns.some(
          (pat) =>
            toolName === pat ||
            toolName.startsWith(pat) ||
            new RegExp(pat).test(toolName)
        )
      ) {
        return true;
      }
    }
    return isMutatingMcpTool(toolName);
  }

  protected tools(): ConnectorTools {
    const tools: ConnectorTools = {};
    const fetchImpl = this.options?.fetchFn || fetch;

    for (const toolDef of this.server.tools) {
      const toolName = toolDef.upstreamName;
      const requiresApproval = this.shouldRequireApproval(toolName);

      const connectorTool: ConnectorTool = {
        description: toolDef.description,
        inputSchema: toolDef.inputSchema as any,
        requiresApproval,
        replay: "log",
        execute: async (args: any, ctx?: ToolExecuteContext) => {
          // 1. Plaintext Secret Detection
          if (detectPlaintextSecret(args)) {
            throw new Error(
              "Plaintext secret detected in arguments: raw credentials must never enter tool calls."
            );
          }

          // 2. Resolve URL and secrets
          const authRes = resolveServerUrlAndAuth(
            this.server.url,
            this.server.authSecretName,
            this.env as Env,
            this.server.namespace
          );
          if (authRes.error) {
            throw new Error(authRes.error);
          }

          // 3. SSRF & URL Validation on resolved URL
          const urlValidation = validateUpstreamUrl(authRes.resolvedUrl, {
            allowLocalhost: this.options?.allowLocalhost,
          });
          if (!urlValidation.valid) {
            throw new Error(`SSRF validation failed: ${urlValidation.error}`);
          }

          // 4. Request Headers
          const isSerpApi =
            this.server.namespace === "serpapi" ||
            this.server.url.includes("serpapi");
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Accept: isSerpApi
              ? "application/json, text/event-stream"
              : "application/json",
            "MCP-Protocol-Version": "2024-11-05",
            ...((this.server as any).customHeaders || {}),
          };

          if (authRes.bearerToken) {
            headers.Authorization = authRes.bearerToken.startsWith("Bearer ")
              ? authRes.bearerToken
              : `Bearer ${authRes.bearerToken}`;
          }

          // 5. Dispatch JSON-RPC tools/call
          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(),
            EXECUTION_TIMEOUT_MS
          );

          try {
            const res = await fetchImpl(authRes.resolvedUrl, {
              method: "POST",
              headers,
              body: JSON.stringify({
                jsonrpc: "2.0",
                id: Date.now(),
                method: "tools/call",
                params: {
                  name: toolDef.upstreamName,
                  arguments: args || {},
                },
              }),
              signal: controller.signal,
            });

            const rawText = await res.text();
            if (!res.ok) {
              const scrubbed = redactSecretFromText(
                rawText.slice(0, 500),
                authRes.secretValue
              );
              throw new Error(`Upstream MCP server HTTP ${res.status}: ${scrubbed}`);
            }

            const body = parseMcpResponseText(
              rawText,
              res.headers.get("content-type") || ""
            );
            if (body?.error) {
              const scrubbed = redactSecretFromText(
                body.error.message || `Upstream error code ${body.error.code || -32000}`,
                authRes.secretValue
              );
              throw new Error(scrubbed);
            }

            let result = body?.result ?? body;
            if (
              result &&
              typeof result === "object" &&
              Array.isArray(result.content) &&
              result.content.length === 1 &&
              typeof result.content[0]?.text === "string"
            ) {
              try {
                const inner = JSON.parse(result.content[0].text);
                if (inner && typeof inner === "object" && !Array.isArray(inner)) {
                  result = { ...inner, ...result };
                }
              } catch {
                // Plain text or markdown
              }
            }

            // Cap payload characters
            const serialized = JSON.stringify(result);
            if (serialized && serialized.length > MAX_PAYLOAD_CHARS) {
              return JSON.parse(serialized.slice(0, MAX_PAYLOAD_CHARS));
            }
            return result;
          } catch (err: unknown) {
            const msg = redactSecretFromText(
              String(err instanceof Error ? err.message : err),
              authRes.secretValue
            );
            throw new Error(msg);
          } finally {
            clearTimeout(timeoutId);
          }
        },
        revert: async (args: any, result: any, ctx?: ToolExecuteContext) => {
          if (this.options?.revertHandler) {
            await this.options.revertHandler(toolName, args, result, ctx);
          }
        },
      };

      tools[toolName] = connectorTool;
    }

    return tools;
  }
}
