export interface ToolItem {
  name: string;
  description: string;
  category: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  mockResponse: Record<string, unknown>;
}

export interface ToolCategory {
  id: string;
  name: string;
  count: number;
  icon: string;
  tools: ToolItem[];
}

export const MCP_CATEGORIES: ToolCategory[] = [
  {
    id: "platform-core",
    name: "Platform Core",
    count: 47,
    icon: "layers",
    tools: [
      {
        name: "list_capability_categories",
        description: "MCP 2026-07-28 Broker Meta-Tool: Returns a directory of deterministic capability categories with risk tiers, tool counts, and a server-minted SEP-2567 workspace_handle.",
        category: "Platform Core",
        parameters: {
          workspace_handle: { type: "string", description: "Optional SEP-2567 workspace state handle" },
          domain_filter: { type: "string", description: "Optional domain keyword filter (e.g. 'development', 'billing')" },
        },
        mockResponse: {
          protocolVersion: "2026-07-28",
          workspace_handle: "spk_hdl_v2.eyJzdWIiOiJhbm9uIiwiY2F0cyI6WyJQbGF0Zm9ybSBDb3JlIl19.9f8a7b6c",
          positionZeroCacheStatus: "100% immutable (cacheScope: public, ttlMs: 3600000)",
          totalCategories: 88,
          categories: [
            { id: "development", name: "Development", riskTier: "low-readonly", readOnlyHint: true, count: 69 },
            { id: "fintech-billing", name: "FinTech & Billing", riskTier: "elevated-write", readOnlyHint: false, count: 38 },
          ],
        },
      },
      {
        name: "configure_active_categories",
        description: "MCP 2026-07-28 Broker Meta-Tool: Updates active category grants on workspace_handle and discloses JSON Schema 2020-12 definitions in-band at the conversation tail (preserving Position-Zero LLM prefix cache).",
        category: "Platform Core",
        parameters: {
          workspace_handle: { type: "string", description: "SEP-2567 workspace handle", required: true },
          enable_categories: { type: "array", description: "JSON array of category IDs or names to activate", required: true },
          disable_categories: { type: "array", description: "Optional JSON array of categories to deactivate" },
        },
        mockResponse: {
          resultType: "complete",
          workspace_handle: "spk_hdl_v2.eyJzdWIiOiJhbm9uIiwiY2F0cyI6WyJQbGF0Zm9ybSBDb3JlIiwiRGV2ZWxvcG1lbnQiXX0.3c2d1e0f",
          activeCategories: ["Platform Core", "Development"],
          positionZeroInvalidated: false,
          disclosedToolsCount: 3,
          tools_hash: "th_9e8d7c6b5a",
        },
      },
      {
        name: "inspect_tool_schema",
        description: "MCP 2026-07-28 Broker Meta-Tool: Fetches extended JSON Schema 2020-12 documentation, $ref sub-schemas, x-mcp-header policy status, and SEP-1865 MCP Apps UI metadata on demand.",
        category: "Platform Core",
        parameters: {
          workspace_handle: { type: "string", description: "Optional SEP-2567 workspace handle" },
          tool_name: { type: "string", description: "Target tool name to inspect", required: true },
        },
        mockResponse: {
          tool_name: "code_runner",
          dialect: "https://json-schema.org/draft/2020-12/schema",
          headerPolicyAudit: "clean (no sensitive x-mcp-header bindings)",
          uiResourceUri: "ui://spike-land/sandbox-console",
        },
      },
      {
        name: "execute_tool",
        description: "MCP 2026-07-28 Broker Meta-Tool: Verifies workspace_handle category grants, performs RFC 8707 OAuth 2.1 upstream token exchange (zero passthrough), executes the target tool, and slices oversized outputs.",
        category: "Platform Core",
        parameters: {
          workspace_handle: { type: "string", description: "SEP-2567 workspace handle", required: true },
          tool_name: { type: "string", description: "Target tool name to execute", required: true },
          arguments: { type: "object", description: "JSON arguments for the target tool", required: true },
        },
        mockResponse: {
          resultType: "complete",
          executedTool: "code_runner",
          rfc8707TokenExchange: {
            inboundAudience: "https://spike.land/api/mcp",
            upstreamResource: "https://mcp.upstream.spike.land/development",
            tokenPassthrough: false,
          },
          _meta: { tools_hash: "th_9e8d7c6b5a" },
        },
      },
      {
        name: "inspect_result_slice",
        description: "MCP 2026-07-28 Broker Meta-Tool: Output Progressive Disclosure — queries an oversized downstream tool response via result_cursor_handle and JSONPath/key filter, cutting response tokens by up to 98%.",
        category: "Platform Core",
        parameters: {
          result_cursor_handle: { type: "string", description: "SEP-2567 result cursor handle from execute_tool", required: true },
          jsonpath_or_filter: { type: "string", description: "JSONPath or property filter (e.g. '$.rows[0]' or 'markdown')" },
        },
        mockResponse: {
          resultType: "complete",
          result_cursor_handle: "spk_res_v2.7f6e5d4c",
          filter: "$.rows[0]",
          sliceTokens: 28,
          originalPayloadTokensSaved: "96.4%",
        },
      },
      {
        name: "get_balance",
        description: "Check your current credit quota, rate limits, and API consumption tier.",
        category: "Platform Core",
        parameters: {},
        mockResponse: {
          balance: 1450.0,
          currency: "credits",
          tier: "Developer Pro",
          monthlyQuotaRemaining: "92%",
        },
      },
      {
        name: "get_status",
        description: "Retrieve health, latency, and edge worker deployment status across global regions.",
        category: "Platform Core",
        parameters: {},
        mockResponse: {
          status: "healthy",
          edgeRegion: "LHR (London)",
          version: "v2.4.1-edge",
          activeWorkerRuntimes: 38,
        },
      },
    ],
  },
  {
    id: "development",
    name: "Development",
    count: 69,
    icon: "code-xml",
    tools: [
      {
        name: "git_diff_viewer",
        description: "Parse and colorize unified git diffs with line-level change insights.",
        category: "Development",
        parameters: {
          rawDiff: { type: "string", description: "Unified diff string", required: true },
        },
        mockResponse: {
          filesChanged: 3,
          insertions: 48,
          deletions: 12,
          hunks: 4,
        },
      },
      {
        name: "code_runner",
        description: "Execute untrusted JavaScript, TypeScript, or Python code safely in isolated Cloudflare sandboxes.",
        category: "Development",
        parameters: {
          code: { type: "string", description: "Source code to execute", required: true },
          runtime: { type: "string", description: "Runtime environment: node, python, wasm", required: true },
        },
        mockResponse: {
          exitCode: 0,
          stdout: "Hello from Cloudflare Workers sandbox!\nExecution duration: 18ms",
          stderr: "",
          memoryUsedMb: 14.2,
        },
      },
      {
        name: "ast_inspect",
        description: "Generate and analyze AST representations for syntax tree debugging.",
        category: "Development",
        parameters: {
          source: { type: "string", description: "Source file code", required: true },
        },
        mockResponse: {
          astType: "Program",
          nodeCount: 142,
          imports: ["react", "lucide-react"],
          exports: ["McpTerminal"],
        },
      },
    ],
  },
  {
    id: "ai-creative",
    name: "AI & Creative",
    count: 60,
    icon: "sparkles",
    tools: [
      {
        name: "generate_image",
        description: "Generate photo-realistic images or UI vector artwork using diffusion and vision models.",
        category: "AI & Creative",
        parameters: {
          prompt: { type: "string", description: "Descriptive image prompt", required: true },
          aspectRatio: { type: "string", description: "Aspect ratio (1:1, 16:9, 4:3, etc.)" },
        },
        mockResponse: {
          jobId: "img_98ad712e",
          status: "completed",
          url: "https://spike.land/assets/generated/aurora-network.webp",
          seed: 48920194,
        },
      },
      {
        name: "modify_image",
        description: "Apply inpainting, background removal, or neural style transfer to existing images.",
        category: "AI & Creative",
        parameters: {
          imageUrl: { type: "string", description: "Source image URL", required: true },
          instruction: { type: "string", description: "Editing instruction", required: true },
        },
        mockResponse: {
          status: "completed",
          outputUrl: "https://spike.land/assets/generated/modified-preview.webp",
          changes: "Background replaced with dark aurora glow",
        },
      },
      {
        name: "upscale_image",
        description: "High-fidelity 4x super-resolution image upscaling with edge restoration.",
        category: "AI & Creative",
        parameters: {
          imageUrl: { type: "string", description: "Image to upscale", required: true },
          factor: { type: "number", description: "Scale factor: 2 or 4" },
        },
        mockResponse: {
          status: "completed",
          dimensions: { width: 3840, height: 2160 },
          processingTimeSec: 1.8,
        },
      },
    ],
  },
  {
    id: "content-media",
    name: "Content & Media",
    count: 55,
    icon: "file-text",
    tools: [
      {
        name: "pdf_extract",
        description: "Extract structured tables, key-value forms, and clean markdown text from PDF documents.",
        category: "Content & Media",
        parameters: {
          fileUrl: { type: "string", description: "PDF document URL", required: true },
          extractTables: { type: "boolean", description: "Extract markdown formatted tables" },
        },
        mockResponse: {
          pageCount: 14,
          wordsExtracted: 4820,
          detectedTables: 3,
        },
      },
      {
        name: "markdown_lint",
        description: "Audit markdown documents for broken links, syntax violations, and readability metrics.",
        category: "Content & Media",
        parameters: {
          content: { type: "string", description: "Markdown body content", required: true },
        },
        mockResponse: {
          score: 98,
          issues: [],
          wordCount: 840,
          readingTimeMinutes: 3.4,
        },
      },
    ],
  },
  {
    id: "marketing-growth",
    name: "Marketing & Growth",
    count: 50,
    icon: "trending-up",
    tools: [
      {
        name: "seo_audit",
        description: "Audit live URLs for OpenGraph tags, canonical consistency, meta viewport, and performance.",
        category: "Marketing & Growth",
        parameters: {
          url: { type: "string", description: "Target URL to inspect", required: true },
        },
        mockResponse: {
          url: "https://spike.land/mcp",
          score: 100,
          ogCard: "valid",
          canonical: "https://spike.land/mcp",
          recommendations: [],
        },
      },
      {
        name: "sitemap_builder",
        description: "Generate XML sitemaps and robots.txt rules dynamically.",
        category: "Marketing & Growth",
        parameters: {
          baseUrl: { type: "string", description: "Domain root", required: true },
        },
        mockResponse: {
          sitemapUrl: "https://spike.land/sitemap.xml",
          entries: 48,
        },
      },
    ],
  },
  {
    id: "commerce-admin",
    name: "Commerce & Admin",
    count: 44,
    icon: "credit-card",
    tools: [
      {
        name: "stripe_billing",
        description: "Query subscription status, calculate usage invoices, and manage payment intents.",
        category: "Commerce & Admin",
        parameters: {
          customerId: { type: "string", description: "Stripe customer ID", required: true },
        },
        mockResponse: {
          status: "active",
          tier: "Enterprise Tier",
          currentPeriodEnd: "2026-11-01T00:00:00Z",
        },
      },
      {
        name: "usage_meter",
        description: "Meter tool invocations, token bandwidth, and edge worker CPU time.",
        category: "Commerce & Admin",
        parameters: {},
        mockResponse: {
          totalCallsThisMonth: 128450,
          averageLatencyMs: 14.6,
          successRate: "99.98%",
        },
      },
    ],
  },
  {
    id: "first-party-apps",
    name: "First-Party Apps",
    count: 62,
    icon: "gamepad-2",
    tools: [
      {
        name: "pixel_studio",
        description: "Full suite generative canvas manipulation with layer blending, text effects, and export.",
        category: "First-Party Apps",
        parameters: {
          action: { type: "string", description: "Operation: create_canvas, add_layer, render" },
        },
        mockResponse: {
          canvasId: "cnv_3914a",
          layersCount: 4,
          resolution: "1920x1080",
        },
      },
      {
        name: "code_companion",
        description: "Interactive AI pair-programmer for real-time edge code refactoring.",
        category: "First-Party Apps",
        parameters: {
          intent: { type: "string", description: "Refactor goal or feature requirement" },
        },
        mockResponse: {
          suggestionsReady: true,
          filesAnalyzed: 12,
        },
      },
    ],
  },
  {
    id: "agents-automation",
    name: "Agents & Automation",
    count: 60,
    icon: "users",
    tools: [
      {
        name: "subagent_spawn",
        description: "Spawn persistent background subagent instances with isolated task channels and shared memory.",
        category: "Agents & Automation",
        parameters: {
          task: { type: "string", description: "High-level goal for child subagent", required: true },
          memoryScope: { type: "string", description: "Shared memory namespace" },
        },
        mockResponse: {
          agentId: "subagent_984f",
          status: "running",
          parentTaskId: "root_task_12",
        },
      },
      {
        name: "cron_scheduler",
        description: "Configure distributed alarms and cron expressions executed directly on Cloudflare Durable Objects.",
        category: "Agents & Automation",
        parameters: {
          schedule: { type: "string", description: "Standard cron syntax or duration", required: true },
          targetTool: { type: "string", description: "Tool to invoke on trigger", required: true },
        },
        mockResponse: {
          jobId: "cron_daily_backup",
          nextRun: "2026-10-14T00:00:00Z",
          status: "active",
        },
      },
    ],
  },
  {
    id: "mcp-registry",
    name: "MCP Registry",
    count: 24,
    icon: "globe",
    tools: [
      {
        name: "mcp_registry_search",
        description: "Search across Smithery, Official MCP Registry, and Glama for MCP servers by keyword.",
        category: "MCP Registry",
        parameters: {
          query: { type: "string", description: "Keywords (e.g. postgres, brave search, github)", required: true },
          registry: { type: "string", description: "Filter: all, official, smithery, glama" },
          limit: { type: "number", description: "Maximum servers to return (default: 10)" },
        },
        mockResponse: {
          query: "database",
          totalFound: 4,
          servers: [
            {
              id: "@smithery/sqlite",
              name: "SQLite MCP Server",
              source: "smithery",
              transport: "stdio",
              downloads: 14200,
            },
            {
              id: "modelcontextprotocol/server-postgres",
              name: "PostgreSQL Database Connector",
              source: "official",
              transport: "stdio",
              downloads: 38900,
            },
          ],
        },
      },
      {
        name: "mcp_registry_get",
        description: "Get detailed information about a specific MCP server including connection configuration, required environment variables, and tool list.",
        category: "MCP Registry",
        parameters: {
          serverId: { type: "string", description: "Server ID from registry search", required: true },
        },
        mockResponse: {
          id: "modelcontextprotocol/server-postgres",
          name: "PostgreSQL Database Connector",
          source: "official",
          requiredEnv: ["DATABASE_URL"],
          tools: ["query", "execute", "list_tables", "describe_table"],
        },
      },
      {
        name: "mcp_registry_install",
        description: "Generate auto-configured client snippet or mount an MCP server via proxy.",
        category: "MCP Registry",
        parameters: {
          serverId: { type: "string", description: "Server identifier to install", required: true },
          clientType: { type: "string", description: "cursor | claude_desktop | claude_code | http" },
        },
        mockResponse: {
          status: "installed",
          serverId: "modelcontextprotocol/server-postgres",
          clientType: "cursor",
          configurationSnippet: {
            mcpServers: {
              postgres: {
                command: "npx",
                args: ["-y", "@modelcontextprotocol/server-postgres", "${DATABASE_URL}"],
              },
            },
          },
        },
      },
      {
        name: "mcp_registry_list_installed",
        description: "List all currently configured or proxy-mounted MCP servers in the current workspace.",
        category: "MCP Registry",
        parameters: {},
        mockResponse: {
          count: 2,
          servers: [
            { id: "spike-land-gateway", transport: "sse", status: "active", latencyMs: 3.8 },
            { id: "@smithery/sqlite", transport: "stdio", status: "active", latencyMs: 1.2 },
          ],
        },
      },
    ],
  },
];

export const CLIENT_CONFIGS = [
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    icon: "settings",
    filename: "claude_desktop_config.json",
    code: `{
  "mcpServers": {
    "spike-land": {
      "url": "https://next.spike.land/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY",
        "MCP-Protocol-Version": "2026-07-28"
      }
    }
  }
}`,
  },
  {
    id: "claude-code",
    name: "Claude Code",
    icon: "terminal",
    filename: "Terminal Command",
    code: `claude mcp add spike-land https://next.spike.land/api/mcp --header "Authorization: Bearer YOUR_API_KEY" --header "MCP-Protocol-Version: 2026-07-28"`,
  },
  {
    id: "cursor",
    name: "Cursor",
    icon: "code",
    filename: "cursor-mcp-settings.json",
    code: `{
  "mcpServers": {
    "spike-land": {
      "url": "https://next.spike.land/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY",
        "MCP-Protocol-Version": "2026-07-28"
      }
    }
  }
}`,
  },
  {
    id: "virtual-gateway",
    name: "Virtual Gateway (Pattern C)",
    icon: "settings",
    filename: "virtual-gateway-mcp.json",
    code: `{
  "mcpServers": {
    "spike-land-dev": {
      "url": "https://next.spike.land/api/mcp/g/development",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY",
        "MCP-Protocol-Version": "2026-07-28"
      }
    }
  }
}`,
  },
  {
    id: "http",
    name: "HTTP / JSON-RPC",
    icon: "globe",
    filename: "curl request",
    code: `curl -X POST https://next.spike.land/api/mcp \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "MCP-Protocol-Version: 2026-07-28" \\
  -H "Mcp-Method: tools/call" \\
  -H "Mcp-Name: configure_active_categories" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "configure_active_categories",
      "arguments": {
        "workspace_handle": "spk_hdl_v2...",
        "enable_categories": ["Development"]
      },
      "_meta": {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28"
      }
    }
  }'`,
  },
];

