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
        name: "search_tools",
        description: "Search across all 455 tools by semantic query or keyword with progressive schema loading.",
        category: "Platform Core",
        parameters: {
          query: { type: "string", description: "Search query or task requirement", required: true },
          category: { type: "string", description: "Optional filter category" },
        },
        mockResponse: {
          matchedTools: [
            { name: "generate_image", category: "AI & Creative", score: 0.98 },
            { name: "modify_image", category: "AI & Creative", score: 0.94 },
            { name: "check_job", category: "AI & Creative", score: 0.89 },
          ],
          totalMatches: 8,
          executionTimeMs: 4.2,
        },
      },
      {
        name: "list_categories",
        description: "List all 88 tool categories with available tool counts and enablement status.",
        category: "Platform Core",
        parameters: {
          enabledOnly: { type: "boolean", description: "Filter only currently activated categories" },
        },
        mockResponse: {
          categoriesCount: 88,
          totalTools: 455,
          activeCategories: ["Platform Core"],
          gatewayTools: ["search_tools", "list_categories", "enable_category", "get_balance", "get_status"],
        },
      },
      {
        name: "enable_category",
        description: "Dynamically mount all schemas and endpoints for a specific category into active context.",
        category: "Platform Core",
        parameters: {
          category: { type: "string", description: "Name or ID of category to enable", required: true },
        },
        mockResponse: {
          status: "success",
          category: "AI & Creative",
          unlockedTools: 60,
          tokensConsumed: 120,
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
      "url": "https://spike.land/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
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
    code: `claude mcp add spike-land https://spike.land/api/mcp --header "Authorization: Bearer YOUR_API_KEY"`,
  },
  {
    id: "cursor",
    name: "Cursor",
    icon: "code",
    filename: "cursor-mcp-settings.json",
    code: `{
  "mcpServers": {
    "spike-land": {
      "command": "npx",
      "args": ["-y", "@spike-land/mcp-remote", "https://spike.land/api/mcp"],
      "env": {
        "SPIKE_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}`,
  },
  {
    id: "http",
    name: "HTTP",
    icon: "globe",
    filename: "curl request",
    code: `curl -X POST https://spike.land/api/mcp \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_tools",
      "arguments": { "query": "image" }
    }
  }'`,
  },
];
