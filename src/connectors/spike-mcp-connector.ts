import { CodemodeConnector, ConnectorTools, ConnectorTool, ToolExecuteContext } from "@cloudflare/codemode";
import { Env, MountedServer, ToolApprovalPolicy } from "../types.js";
import { validateUpstreamUrl, detectPlaintextSecret } from "../security.js";
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
          // 1. SSRF & URL Validation
          const urlValidation = validateUpstreamUrl(this.server.url, {
            allowLocalhost: this.options?.allowLocalhost,
          });
          if (!urlValidation.valid) {
            throw new Error(`SSRF validation failed: ${urlValidation.error}`);
          }

          // 2. Plaintext Secret Detection
          if (detectPlaintextSecret(args)) {
            throw new Error(
              "Plaintext secret detected in arguments: raw credentials must never enter tool calls."
            );
          }

          // 3. Resolve Bearer Auth Secret on Host
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Accept: "application/json",
            "MCP-Protocol-Version": "2024-11-05",
            ...((this.server as any).customHeaders || {}),
          };
          if (!headers["Accept"]) {
            headers["Accept"] = "application/json";
          }

          if (this.server.authSecretName) {
            const secretVal = (this.env as any)[this.server.authSecretName];
            if (typeof secretVal === "string" && secretVal.length > 0) {
              headers.Authorization = secretVal.startsWith("Bearer ")
                ? secretVal
                : `Bearer ${secretVal}`;
            }
          }

          // 4. Dispatch JSON-RPC tools/call
          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(),
            EXECUTION_TIMEOUT_MS
          );

          try {
            const res = await fetchImpl(this.server.url, {
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

            if (!res.ok) {
              const text = await res.text();
              throw new Error(
                `Upstream MCP server HTTP ${res.status}: ${text.slice(0, 500)}`
              );
            }

            const body = (await res.json()) as any;
            if (body?.error) {
              throw new Error(
                body.error.message ||
                  `Upstream error code ${body.error.code || -32000}`
              );
            }

            const result = body?.result;
            // Cap payload characters
            const serialized = JSON.stringify(result);
            if (serialized && serialized.length > MAX_PAYLOAD_CHARS) {
              return JSON.parse(serialized.slice(0, MAX_PAYLOAD_CHARS));
            }
            return result;
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
