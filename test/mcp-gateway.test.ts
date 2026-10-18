import { describe, it, expect } from "vitest";
import {
  dispatchJsonRpc,
  GATEWAY_TOOL_NAMES,
  BROKER_2026_TOOL_NAMES,
  BROKER_2026_TOOLS,
  ALL_TOOLS,
  SUPPORTED_PROTOCOL_VERSIONS,
  mintWorkspaceHandle,
  verifyWorkspaceHandle,
  auditToolHeaderAnnotations,
} from "@/lib/mcp-gateway";
import { POST as mcpPost, GET as mcpGet, OPTIONS as mcpOptions } from "@/app/api/mcp/route";
import {
  GET as virtualGatewayGet,
  POST as virtualGatewayPost,
} from "@/app/api/mcp/g/[gatewaySlug]/route";
import { GET as oauthResourceGet } from "@/app/.well-known/oauth-protected-resource/route";

describe("Pure MCP 2026-07-28 Stateless Progressive-Disclosure Relay", () => {
  describe("SEP-2575 Stateless Discovery & Dual-Era Protocol Version Compatibility", () => {
    it("supports Dual-Era MCP protocol versions and implements mandatory 'server/discover'", async () => {
      expect(SUPPORTED_PROTOCOL_VERSIONS).toEqual([
        "2026-07-28",
        "2025-11-25",
        "2024-11-05",
      ]);
      expect(GATEWAY_TOOL_NAMES).toEqual(BROKER_2026_TOOL_NAMES);

      const response = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "server/discover",
          params: {},
        },
        {}
      );

      expect(response?.error).toBeUndefined();
      const result = response?.result as {
        resultType: string;
        protocolVersion: string;
        supportedProtocolVersions: string[];
        capabilities: { extensions: Record<string, unknown> };
      };
      expect(result.resultType).toBe("complete");
      expect(result.protocolVersion).toBe("2026-07-28");
      expect(result.supportedProtocolVersions).toEqual([
        "2026-07-28",
        "2025-11-25",
        "2024-11-05",
      ]);
      expect(result.capabilities.extensions).toHaveProperty("io.modelcontextprotocol/tasks");
      expect(result.capabilities.extensions).toHaveProperty("io.modelcontextprotocol/ui");
    });

    it("rejects unknown protocol versions with -32022 UnsupportedProtocolVersionError and HTTP 400", async () => {
      const req = new Request("https://next.spike.land/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "MCP-Protocol-Version": "1999-01-01",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list",
          params: {},
        }),
      });

      const res = await mcpPost(req);
      expect(res.status).toBe(400);
      const json = (await res.json()) as {
        error: { code: number; data: { supportedVersions: string[] } };
      };
      expect(json.error.code).toBe(-32022);
      expect(json.error.data.supportedVersions).toEqual([
        "2026-07-28",
        "2025-11-25",
        "2024-11-05",
      ]);
    });

    it("supports Dual-Era stateless 'initialize' (e.g. Antigravity 2025-11-25) and 'notifications/initialized'", async () => {
      const response = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 3,
          method: "initialize",
          params: {
            protocolVersion: "2025-11-25",
          },
        },
        {}
      );

      expect(response?.error).toBeUndefined();
      const result = response?.result as {
        protocolVersion: string;
        serverInfo: { name: string };
        capabilities: { tools: { listChanged: boolean } };
      };
      expect(result.protocolVersion).toBe("2025-11-25");
      expect(result.serverInfo.name).toBe("spike-land-gateway");
      expect(result.capabilities.tools.listChanged).toBe(true);

      const notifReq = new Request("https://next.spike.land/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "MCP-Protocol-Version": "2025-11-25",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        }),
      });
      const notifRes = await mcpPost(notifReq);
      expect(notifRes.status).toBe(202);
    });

    it("handles 'subscriptions/listen' and 'ping' in stateless mode", async () => {
      const subRes = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 4,
          method: "subscriptions/listen",
          params: { notifications: { toolsListChanged: true } },
        },
        {}
      );
      expect((subRes?.result as { notification: string }).notification).toBe(
        "notifications/subscriptions/acknowledged"
      );

      const pingRes = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 5,
          method: "ping",
        },
        {}
      );
      expect(pingRes?.result).toEqual({});
    });
  });

  describe("SEP-2567 & SEP-2549 Position-Zero Prefix Cache Immunity", () => {
    it("always returns the static 5 Broker Meta-Tools on 'tools/list' with cacheScope: 'public' and ttlMs: 3600000", async () => {
      const listBefore = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 10,
          method: "tools/list",
          params: {
            _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28" },
          },
        },
        {}
      );

      const resBefore = listBefore?.result as {
        resultType: string;
        ttlMs: number;
        cacheScope: string;
        tools: Array<{ name: string }>;
      };
      expect(resBefore.resultType).toBe("complete");
      expect(resBefore.ttlMs).toBe(3600000);
      expect(resBefore.cacheScope).toBe("public");
      expect(resBefore.tools.map((t) => t.name)).toEqual([...BROKER_2026_TOOL_NAMES]);

      // Toggle category via configure_active_categories
      const handle = mintWorkspaceHandle({ sub: "user_1", cats: ["Platform Core"] });
      const configCall = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 11,
          method: "tools/call",
          params: {
            name: "configure_active_categories",
            arguments: {
              workspace_handle: handle,
              enable_categories: ["Development"],
            },
            _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28" },
          },
        },
        { callerSubject: "user_1" }
      );

      const configData = JSON.parse(
        (configCall?.result as { content: Array<{ text: string }> }).content[0].text
      );
      expect(configData.positionZeroInvalidated).toBe(false);
      expect(configData.disclosedSchemas.map((s: { name: string }) => s.name)).toContain(
        "code_runner"
      );

      // tools/list after toggle MUST remain 100% identical (Position Zero never mutates)
      const listAfter = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 12,
          method: "tools/list",
          params: {
            _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28" },
          },
        },
        {}
      );

      const resAfter = listAfter?.result as { tools: Array<{ name: string }> };
      expect(resAfter.tools.map((t) => t.name)).toEqual([...BROKER_2026_TOOL_NAMES]);
    });
  });

  describe("SEP-2567 Workspace Handle Security, RFC 8707 Token Exchange & Output Slicing", () => {
    it("enforces workspace_handle cryptographic signature, caller subject binding, and category sandboxing on execute_tool", async () => {
      const handleUserA = mintWorkspaceHandle({
        sub: "user_alice",
        cats: ["Platform Core"],
      });

      // 1. Cross-user replay attempt by user_bob fails verification
      const replayCheck = verifyWorkspaceHandle(handleUserA, "user_bob");
      expect(replayCheck.valid).toBe(false);
      expect(replayCheck.reason).toContain("Caller subject mismatch");

      // 2. Calling execute_tool for 'code_runner' (Development) when only 'Platform Core' is enabled is blocked by sandbox
      const sandboxBlocked = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 20,
          method: "tools/call",
          params: {
            name: "execute_tool",
            arguments: {
              workspace_handle: handleUserA,
              tool_name: "code_runner",
              arguments: { code: "1+1", runtime: "node" },
            },
          },
        },
        { callerSubject: "user_alice" }
      );

      const blockedData = JSON.parse(
        (sandboxBlocked?.result as { content: Array<{ text: string }> }).content[0].text
      );
      expect(blockedData.errorCode).toBe("CATEGORY_NOT_ENABLED_ON_HANDLE");

      // 3. Enable Development on handle, then execute_tool succeeds with RFC 8707 token exchange + Output Progressive Disclosure slicing
      const devHandle = mintWorkspaceHandle({
        sub: "user_alice",
        cats: ["Platform Core", "Development"],
      });

      const execSuccess = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 21,
          method: "tools/call",
          params: {
            name: "execute_tool",
            arguments: {
              workspace_handle: devHandle,
              tool_name: "query_database",
              arguments: { sql: "SELECT * FROM metrics" },
              slice_large_payloads: true,
            },
          },
        },
        { callerSubject: "user_alice" }
      );

      const execData = JSON.parse(
        (execSuccess?.result as { content: Array<{ text: string }> }).content[0].text
      );
      expect(execData.status).toBe("success");
      expect(execData.rfc8707TokenExchange.tokenPassthrough).toBe(false);
      expect(execData.outputProgressiveDisclosure.result_cursor_handle).toMatch(/^spk_res_v2\./);

      // 4. Query slice via inspect_result_slice
      const sliceCall = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 22,
          method: "tools/call",
          params: {
            name: "inspect_result_slice",
            arguments: {
              result_cursor_handle: execData.outputProgressiveDisclosure.result_cursor_handle,
              jsonpath_or_filter: "$.rows[0]",
            },
          },
        },
        { callerSubject: "user_alice" }
      );

      const sliceData = JSON.parse(
        (sliceCall?.result as { content: Array<{ text: string }> }).content[0].text
      );
      expect(sliceData.status).toBe("success");
      expect(sliceData.slice).toEqual({ id: 1, metric: "ARR", value: "$1.2M" });
    });

    it("list_capability_categories and inspect_tool_schema return 2026-07-28 metadata", async () => {
      const catCall = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 23,
          method: "tools/call",
          params: {
            name: "list_capability_categories",
            arguments: { domain_filter: "development" },
          },
        },
        { callerSubject: "user_dev" }
      );
      const catData = JSON.parse(
        (catCall?.result as { content: Array<{ text: string }> }).content[0].text
      );
      expect(catData.protocolVersion).toBe("2026-07-28");
      expect(catData.workspace_handle).toMatch(/^spk_hdl_v2\./);

      const inspectCall = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 24,
          method: "tools/call",
          params: {
            name: "inspect_tool_schema",
            arguments: { tool_name: "code_runner" },
          },
        },
        {}
      );
      const inspectData = JSON.parse(
        (inspectCall?.result as { content: Array<{ text: string }> }).content[0].text
      );
      expect(inspectData.schemaDialect).toBe("https://json-schema.org/draft/2020-12/schema");
      expect(inspectData.headerPolicyAudit.safe).toBe(true);
    });
  });

  describe("SEP-2322 MRTR Step-Up Governance & SEP-2243 Data-Plane Hardening", () => {
    it("enforces MRTR step-up approval for elevated write categories", async () => {
      const handle = mintWorkspaceHandle({ sub: "user_ciso", cats: ["Platform Core"] });

      const stepUpReq = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 30,
          method: "tools/call",
          params: {
            name: "configure_active_categories",
            arguments: {
              workspace_handle: handle,
              enable_categories: ["FinTech & Billing"],
              require_step_up: true,
            },
          },
        },
        { callerSubject: "user_ciso" }
      );

      const stepUpResult = stepUpReq?.result as {
        resultType: string;
        requestState: string;
        inputRequests: Array<{ category: string; riskTier: string }>;
      };
      expect(stepUpResult.resultType).toBe("input_required");
      expect(stepUpResult.requestState).toMatch(/^spk_mrtr_v2\./);
      expect(stepUpResult.inputRequests[0].riskTier).toBe("elevated-write");

      // Resume MRTR with requestState + inputResponses approval
      const resumed = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 31,
          method: "tools/call",
          params: {
            name: "configure_active_categories",
            requestState: stepUpResult.requestState,
            inputResponses: { step_up_fintech___billing: "approved" },
          },
        },
        { callerSubject: "user_ciso" }
      );

      const resumedResult = resumed?.result as {
        resultType: string;
        content: Array<{ text: string }>;
      };
      expect(resumedResult.resultType).toBe("complete");
      const resumedData = JSON.parse(resumedResult.content[0].text);
      expect(resumedData.activeCategories).toContain("FinTech & Billing");
    });

    it("neutralizes protocol desynchronization attacks with -32020 HeaderMismatchError", async () => {
      const req = new Request("https://next.spike.land/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "MCP-Protocol-Version": "2026-07-28",
          "Mcp-Method": "tools/list",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 32,
          method: "tools/call",
          params: { name: "code_runner", arguments: {} },
        }),
      });

      const res = await mcpPost(req);
      expect(res.status).toBe(400);
      const json = (await res.json()) as { error: { code: number; message: string } };
      expect(json.error.code).toBe(-32020);
      expect(json.error.message).toContain("HeaderMismatchError");
    });

    it("audits x-mcp-header PII leaks, serves Pattern C Virtual Gateways, and publishes OAuth 2.1 Protected Resource Metadata", async () => {
      const audit = auditToolHeaderAnnotations({
        type: "object",
        properties: {
          public_region: {
            type: "string",
            description: "Region",
            "x-mcp-header": "Mcp-Param-Region",
          },
          secret_api_key: {
            type: "string",
            description: "Secret key",
            "x-mcp-header": "Mcp-Param-Secret",
          },
        },
      });
      expect(audit.safe).toBe(false);
      expect(audit.strippedHeaders).toContain("secret_api_key");
      expect(audit.sanitizedSchema.properties.secret_api_key["x-mcp-header"]).toBeUndefined();

      // Pattern C Virtual Gateway endpoint (/api/mcp/g/development)
      const vgGetRes = await virtualGatewayGet(
        new Request("https://next.spike.land/api/mcp/g/development"),
        { params: Promise.resolve({ gatewaySlug: "development" }) }
      );
      expect(vgGetRes.status).toBe(200);
      const vgMeta = (await vgGetRes.json()) as {
        canonicalServerUri: string;
        cacheScope: string;
        tools: string[];
      };
      expect(vgMeta.canonicalServerUri).toBe("https://spike.land/api/mcp/g/development");
      expect(vgMeta.cacheScope).toBe("public");
      expect(vgMeta.tools).toContain("code_runner");

      const vgPostRes = await virtualGatewayPost(
        new Request("https://next.spike.land/api/mcp/g/development", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 33, method: "tools/list", params: {} }),
        }),
        { params: Promise.resolve({ gatewaySlug: "development" }) }
      );
      const vgList = (await vgPostRes.json()) as { result: { tools: Array<{ name: string }> } };
      expect(vgList.result.tools.map((t) => t.name)).toContain("code_runner");

      // RFC 9728 OAuth 2.1 Protected Resource Metadata (/.well-known/oauth-protected-resource)
      const oauthRes = await oauthResourceGet(
        new Request("https://next.spike.land/.well-known/oauth-protected-resource")
      );
      expect(oauthRes.status).toBe(200);
      const oauthJson = (await oauthRes.json()) as {
        resource: string;
        client_id_metadata_document_supported: boolean;
        token_passthrough_prohibited: boolean;
      };
      expect(oauthJson.resource).toBe("https://spike.land/api/mcp");
      expect(oauthJson.client_id_metadata_document_supported).toBe(true);
      expect(oauthJson.token_passthrough_prohibited).toBe(true);
    });

    it("GET and OPTIONS /api/mcp return 2026-07-28 diagnostics and CORS headers", async () => {
      const req = new Request("https://next.spike.land/api/mcp");
      const res = await mcpGet(req);
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        name: string;
        protocolVersion: string;
        gatewayTools: string[];
      };
      expect(json.name).toBe("spike-land-gateway");
      expect(json.protocolVersion).toBe("2026-07-28");
      expect(json.gatewayTools).toEqual([...BROKER_2026_TOOL_NAMES]);

      const optRes = await mcpOptions();
      expect(optRes.status).toBe(204);
      expect(optRes.headers.get("access-control-allow-origin")).toBe("*");
    });
  });

  describe("Multi-Registry MCP Integration", () => {
    it("mcp_registry_search, mcp_registry_get, and mcp_registry_install execute via stateless tools/call", async () => {
      const searchCall = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 40,
          method: "tools/call",
          params: {
            name: "mcp_registry_search",
            arguments: { query: "postgres", registry: "all" },
          },
        },
        {}
      );
      expect(searchCall?.error).toBeUndefined();
      const searchData = JSON.parse(
        (searchCall?.result as { content: Array<{ text: string }> }).content[0].text
      );
      expect(searchData.servers[0].id).toBe("modelcontextprotocol/server-postgres");

      const installCall = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 41,
          method: "tools/call",
          params: {
            name: "mcp_registry_install",
            arguments: {
              serverId: "@smithery/sqlite",
              clientType: "cursor",
              envVariables: { SQLITE_PATH: "./mydb.sqlite" },
            },
          },
        },
        {}
      );
      const installData = JSON.parse(
        (installCall?.result as { content: Array<{ text: string }> }).content[0].text
      );
      expect(installData.status).toBe("mounted");
    });
  });

  describe("JSON Schema 2020-12 Input Schema Strict Compliance", () => {
    it("ensures no tool schema in BROKER_2026_TOOLS places 'required' inside property definitions", () => {
      for (const tool of BROKER_2026_TOOLS) {
        const schema = tool.inputSchema;
        expect(schema.type).toBe("object");
        if (schema.required) {
          expect(Array.isArray(schema.required)).toBe(true);
        }
        for (const [propName, propDef] of Object.entries(schema.properties || {})) {
          expect(
            (propDef as unknown as Record<string, unknown>).required,
            `Tool '${tool.name}' property '${propName}' contains invalid boolean 'required' field`
          ).toBeUndefined();
        }
      }
    });

    it("ensures auditToolHeaderAnnotations strips any boolean 'required' defensively and preserves valid arrays", () => {
      const mockSchema = {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object" as const,
        properties: {
          badProp: {
            type: "string" as const,
            description: "test",
            required: true,
          },
          goodProp: {
            type: "string" as const,
            description: "test",
          },
        },
        required: ["goodProp"],
      };

      const audited = auditToolHeaderAnnotations(mockSchema as unknown as import("@/lib/mcp-types").ToolInputSchema);
      expect((audited.sanitizedSchema.properties.badProp as unknown as Record<string, unknown>).required).toBeUndefined();
      expect(audited.sanitizedSchema.required).toEqual(["goodProp"]);
    });

    it("ensures all ALL_TOOLS have strictly compliant JSON Schema properties without boolean 'required'", () => {
      for (const [name, tool] of Object.entries(ALL_TOOLS)) {
        const schema = tool.inputSchema;
        if (!schema || !schema.properties) continue;
        for (const [propName, propDef] of Object.entries(schema.properties)) {
          expect(
            (propDef as unknown as Record<string, unknown>).required,
            `Tool '${name}' property '${propName}' contains invalid boolean 'required'`
          ).toBeUndefined();
        }
      }
    });
  });
});
