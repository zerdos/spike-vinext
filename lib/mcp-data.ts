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
        description: "Lists all available tool categories with their tool counts and security levels.",
        category: "Platform Core",
        parameters: {
          workspace_handle: { type: "string", description: "Optional workspace state handle" },
          domain_filter: { type: "string", description: "Optional category filter keyword (e.g. 'development', 'billing')" },
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
        description: "Turns categories on or off for this conversation, loading tool instructions right when needed without wiping the AI's cache.",
        category: "Platform Core",
        parameters: {
          workspace_handle: { type: "string", description: "Workspace state handle", required: true },
          enable_categories: { type: "array", description: "List of category IDs or names to turn on", required: true },
          disable_categories: { type: "array", description: "Optional list of categories to turn off" },
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
        description: "Fetches full instructions and input options for one specific tool on demand.",
        category: "Platform Core",
        parameters: {
          workspace_handle: { type: "string", description: "Optional workspace handle" },
          tool_name: { type: "string", description: "Name of the tool to inspect", required: true },
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
        description: "Safely runs a tool in an isolated sandbox with its own login (your keys are never passed through).",
        category: "Platform Core",
        parameters: {
          workspace_handle: { type: "string", description: "Workspace handle", required: true },
          tool_name: { type: "string", description: "Tool name to run", required: true },
          arguments: { type: "object", description: "Inputs for the tool", required: true },
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
        description: "Reads large tool outputs in small slices using a filter or page cursor, saving up to 98% on output tokens.",
        category: "Platform Core",
        parameters: {
          result_cursor_handle: { type: "string", description: "Result handle returned by execute_tool", required: true },
          jsonpath_or_filter: { type: "string", description: "Filter or property path (e.g. '$.rows[0]')" },
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
  {
    id: "browser-run",
    name: "Browser Run",
    count: 18,
    icon: "globe",
    tools: [
      {
        name: "browser_run_content",
        description: "Cloudflare Browser Run Quick Action (/content): Render a URL or raw HTML in a headless Chromium browser at the Cloudflare edge and return the fully rendered DOM HTML after JavaScript execution.",
        category: "Browser Run",
        parameters: {
          url: { type: "string", description: "Target URL to render in headless Chromium" },
          html: { type: "string", description: "Raw HTML string to render instead of navigating to a URL" },
          gotoOptions: { type: "object", description: "Navigation options: { waitUntil, timeout, referer }" },
          waitForSelector: { type: "object", description: "Selector wait condition before capturing DOM" },
        },
        mockResponse: {
          success: true,
          action: "content",
          mode: "binding",
          result: "<!DOCTYPE html><html><head><title>Rendered at Edge</title></head><body><main><h1>Hello World</h1></main></body></html>",
        },
      },
      {
        name: "browser_run_markdown",
        description: "Cloudflare Browser Run Quick Action (/markdown): Render a webpage or raw HTML in headless Chromium and convert the rendered document into clean, LLM-ready Markdown.",
        category: "Browser Run",
        parameters: {
          url: { type: "string", description: "Target URL to render and convert to Markdown" },
          html: { type: "string", description: "Raw HTML string to convert to Markdown" },
          rejectRequestPattern: { type: "array", description: "Regex patterns of requests to block for faster extraction" },
        },
        mockResponse: {
          success: true,
          action: "markdown",
          mode: "binding",
          result: "# Rendered at Edge\n\nExtracted via Cloudflare Browser Run `/markdown` Quick Action.",
        },
      },
      {
        name: "browser_run_screenshot",
        description: "Cloudflare Browser Run Quick Action (/screenshot): Capture a pixel-accurate PNG, JPEG, or WebP screenshot of a rendered webpage or specific DOM selector.",
        category: "Browser Run",
        parameters: {
          url: { type: "string", description: "Target URL to screenshot" },
          html: { type: "string", description: "Raw HTML string to screenshot" },
          screenshotOptions: { type: "object", description: "Screenshot options: { type, fullPage, quality, omitBackground, selector, clip }" },
          viewport: { type: "object", description: "Viewport configuration: { width, height, deviceScaleFactor }" },
        },
        mockResponse: {
          success: true,
          action: "screenshot",
          mode: "binding",
          result: { mimeType: "image/png", encoding: "base64", byteLength: 68, dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" },
        },
      },
      {
        name: "browser_run_pdf",
        description: "Cloudflare Browser Run Quick Action (/pdf): Render a webpage or HTML template in headless Chromium and generate a paginated PDF document.",
        category: "Browser Run",
        parameters: {
          url: { type: "string", description: "Target URL to render to PDF" },
          html: { type: "string", description: "Raw HTML string to render to PDF" },
          pdfOptions: { type: "object", description: "PDF options: { format, landscape, printBackground, scale, margin }" },
        },
        mockResponse: {
          success: true,
          action: "pdf",
          mode: "binding",
          result: { mimeType: "application/pdf", encoding: "base64", byteLength: 420 },
        },
      },
      {
        name: "browser_run_snapshot",
        description: "Cloudflare Browser Run Quick Action (/snapshot): Capture both the rendered HTML DOM and a base64-encoded viewport screenshot in a single atomic browser render pass.",
        category: "Browser Run",
        parameters: {
          url: { type: "string", description: "Target URL to snapshot" },
          html: { type: "string", description: "Raw HTML string to snapshot" },
          viewport: { type: "object", description: "Viewport dimensions { width, height, deviceScaleFactor }" },
        },
        mockResponse: {
          success: true,
          action: "snapshot",
          mode: "binding",
          result: { content: "<!DOCTYPE html><html><body>Snapshot</body></html>", screenshot: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" },
        },
      },
      {
        name: "browser_run_accessibility_tree",
        description: "Cloudflare Browser Run Quick Action (/accessibilityTree): Extract the semantic WAI-ARIA Accessibility Tree of a rendered page for token-efficient AI agent inspection.",
        category: "Browser Run",
        parameters: {
          url: { type: "string", description: "Target URL to inspect" },
          html: { type: "string", description: "Raw HTML string to inspect" },
        },
        mockResponse: {
          success: true,
          action: "accessibilityTree",
          mode: "binding",
          result: { nodes: [{ nodeId: "ax_root", role: { type: "role", value: "RootWebArea" } }] },
        },
      },
      {
        name: "browser_run_scrape",
        description: "Cloudflare Browser Run Quick Action (/scrape): Extract text, HTML, attributes, and bounding-box geometry for one or more CSS selectors from a rendered page.",
        category: "Browser Run",
        parameters: {
          url: { type: "string", description: "Target URL to scrape" },
          elements: { type: "array", description: "Array of element selectors: [{ selector: 'h1' }, { selector: 'a.nav' }]", required: true },
        },
        mockResponse: {
          success: true,
          action: "scrape",
          mode: "binding",
          result: [{ selector: "h1", results: [{ text: "Example Heading", html: "<h1>Example Heading</h1>" }] }],
        },
      },
      {
        name: "browser_run_json",
        description: "Cloudflare Browser Run Quick Action (/json): Extract structured JSON data from any rendered webpage using Workers AI or custom BYO-model inference with a prompt and/or JSON Schema.",
        category: "Browser Run",
        parameters: {
          url: { type: "string", description: "Target URL to extract structured JSON from" },
          prompt: { type: "string", description: "Natural language instructions describing what data to extract" },
          response_format: { type: "object", description: "JSON Schema response format: { type: 'json_schema', schema: { ... } }" },
        },
        mockResponse: {
          success: true,
          action: "json",
          mode: "binding",
          result: { title: "Extracted Entity", items: [{ name: "Cloudflare Browser Run", category: "Edge Headless Browser" }] },
        },
      },
      {
        name: "browser_run_links",
        description: "Cloudflare Browser Run Quick Action (/links): Extract all hyperlinks from a rendered webpage, optionally filtering to visible links only or excluding external domains.",
        category: "Browser Run",
        parameters: {
          url: { type: "string", description: "Target URL to extract links from" },
          visibleLinksOnly: { type: "boolean", description: "Only return links from visible DOM elements" },
          excludeExternalLinks: { type: "boolean", description: "Exclude links pointing to external domains" },
        },
        mockResponse: {
          success: true,
          action: "links",
          mode: "binding",
          result: ["https://developers.cloudflare.com/browser-run/", "https://developers.cloudflare.com/browser-run/quick-actions/"],
        },
      },
      {
        name: "browser_run_crawl_start",
        description: "Cloudflare Browser Run Crawl API (POST /crawl): Start an asynchronous multi-page crawl job from a starting URL, returning html, markdown, and/or structured json while respecting robots.txt and Content Signals.",
        category: "Browser Run",
        parameters: {
          url: { type: "string", description: "Starting URL to crawl", required: true },
          limit: { type: "number", description: "Maximum number of pages to crawl (1–100000, default: 10)" },
          depth: { type: "number", description: "Maximum link hop depth from starting URL" },
          formats: { type: "array", description: "Output formats per page: ['html', 'markdown', 'json']" },
          source: { type: "string", description: "URL discovery source: 'all' | 'sitemaps' | 'links'" },
          render: { type: "boolean", description: "Set true to execute headless Chromium JavaScript or false for fast static HTML fetch" },
        },
        mockResponse: {
          success: true,
          mode: "rest",
          result: { id: "crawl_f89a1c2d-3b4e-4f5a-9c8d-1e2f3a4b5c6d", status: "running" },
        },
      },
      {
        name: "browser_run_crawl_status",
        description: "Cloudflare Browser Run Crawl API (GET /crawl/{job_id}): Poll the status and retrieve paginated page results (html, markdown, json, metadata) for a crawl job.",
        category: "Browser Run",
        parameters: {
          jobId: { type: "string", description: "Crawl job ID returned by browser_run_crawl_start", required: true },
          limit: { type: "number", description: "Maximum records to return in this page" },
          status: { type: "string", description: "Filter records by status: queued | completed | disallowed | skipped | errored | cancelled" },
        },
        mockResponse: {
          success: true,
          mode: "rest",
          result: { id: "crawl_f89a1c2d-3b4e-4f5a-9c8d-1e2f3a4b5c6d", status: "completed", total: 2, finished: 2, records: [] },
        },
      },
      {
        name: "browser_run_crawl_cancel",
        description: "Cloudflare Browser Run Crawl API (DELETE /crawl/{job_id}): Cancel an in-progress asynchronous multi-page crawl job.",
        category: "Browser Run",
        parameters: {
          jobId: { type: "string", description: "Crawl job ID to cancel", required: true },
        },
        mockResponse: {
          success: true,
          mode: "rest",
          result: { id: "crawl_f89a1c2d-3b4e-4f5a-9c8d-1e2f3a4b5c6d", status: "cancelled" },
        },
      },
      {
        name: "browser_run_session_acquire",
        description: "Cloudflare Browser Run Session Management (env.BROWSER.acquire / launch): Acquire or launch a reusable headless Chromium session at the Cloudflare edge with configurable keep_alive timeout, stealth mode, or adblock.",
        category: "Browser Run",
        parameters: {
          keep_alive: { type: "number", description: "Idle timeout in milliseconds before browser closes (10000–600000)" },
          stealth: { type: "boolean", description: "Enable human-like stealth behavior" },
          adblock: { type: "boolean", description: "Enable built-in network adblocking" },
          country: { type: "string", description: "Two-letter ISO country code for routing" },
        },
        mockResponse: {
          success: true,
          mode: "binding",
          result: { sessionId: "cf_sess_1f989210", status: "running", keepAliveMs: 60000 },
        },
      },
      {
        name: "browser_run_sessions_list",
        description: "Cloudflare Browser Run Session Introspection (env.BROWSER.listSessions / limits / history / getSession): List active edge browser sessions, check concurrency limits, or inspect recent session history.",
        category: "Browser Run",
        parameters: {
          sessionId: { type: "string", description: "Optional specific session ID to inspect via env.BROWSER.getSession(sessionId)" },
          includeHistory: { type: "boolean", description: "Include recent closed/active session history via env.BROWSER.history()" },
          includeLimits: { type: "boolean", description: "Include concurrency and rate-limit telemetry via env.BROWSER.limits()" },
        },
        mockResponse: {
          success: true,
          mode: "binding",
          result: { activeSessions: [], limits: { activeSessions: [], allowedBrowserAcquisitions: 10, maxConcurrentSessions: 10 } },
        },
      },
      {
        name: "browser_run_session_close",
        description: "Cloudflare Browser Run Session Close (env.BROWSER.closeSession): Gracefully terminate and release an active headless Chromium session by sessionId.",
        category: "Browser Run",
        parameters: {
          sessionId: { type: "string", description: "Browser session ID to close", required: true },
        },
        mockResponse: {
          success: true,
          mode: "binding",
          result: { sessionId: "cf_sess_1f989210", status: "closed" },
        },
      },
      {
        name: "browser_run_live_view",
        description: "Cloudflare Browser Run Live View (env.BROWSER.getLiveView): Generate a real-time interactive Live View inspection URL and target metadata for an active browser session.",
        category: "Browser Run",
        parameters: {
          sessionId: { type: "string", description: "Active browser session ID", required: true },
          readonly: { type: "boolean", description: "Set true for view-only mode or false to allow interactive user takeover" },
        },
        mockResponse: {
          success: true,
          mode: "binding",
          result: { sessionId: "cf_sess_1f989210", liveViewUrl: "https://dash.cloudflare.com/?to=/:account/workers/browser-run/live-view/cf_sess_1f989210", readonly: false, targets: [] },
        },
      },
      {
        name: "browser_run_devtools",
        description: "Cloudflare Browser Run DevTools API (env.BROWSER.devtools): Manage CDP targets (list, create, activate, close, get, connect) and inspect version metadata for an active browser session.",
        category: "Browser Run",
        parameters: {
          sessionId: { type: "string", description: "Browser session ID", required: true },
          operation: { type: "string", description: "DevTools operation: version | list_targets | create_target | activate_target | close_target | get_target | connect_target", required: true },
          targetId: { type: "string", description: "Target ID (required for activate_target, close_target, get_target, connect_target)" },
          url: { type: "string", description: "Optional initial URL when operation is create_target" },
        },
        mockResponse: {
          success: true,
          mode: "binding",
          result: { Browser: "Chrome/134.0.6998.35", "Protocol-Version": "1.3" },
        },
      },
      {
        name: "browser_run_cdp_command",
        description: "Cloudflare Browser Run Raw CDP Execution (env.BROWSER.connectSession): Send a Chrome DevTools Protocol (CDP) JSON-RPC command (e.g. Page.navigate, Runtime.evaluate, DOM.getDocument, Network.enable) over WebSocket to an edge browser session.",
        category: "Browser Run",
        parameters: {
          sessionId: { type: "string", description: "Optional existing browser session ID (if omitted, a temporary session is acquired)" },
          method: { type: "string", description: "CDP method name (e.g. 'Page.navigate', 'Runtime.evaluate', 'Browser.getVersion')", required: true },
          params: { type: "object", description: "CDP method parameters object" },
          closeAfter: { type: "boolean", description: "Whether to close the session after executing the CDP command" },
        },
        mockResponse: {
          success: true,
          mode: "binding",
          result: { sessionId: "cf_sess_1f989210", method: "Runtime.evaluate", cdpResult: { result: { type: "string", value: "Edge Eval OK" } } },
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
    code: `claude mcp add spike-land https://spike.land/api/mcp --header "Authorization: Bearer YOUR_API_KEY" --header "MCP-Protocol-Version: 2026-07-28"`,
  },
  {
    id: "cursor",
    name: "Cursor",
    icon: "code",
    filename: "cursor-mcp-settings.json",
    code: `{
  "mcpServers": {
    "spike-land": {
      "url": "https://spike.land/api/mcp",
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
      "url": "https://spike.land/api/mcp/g/development",
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
    code: `curl -X POST https://spike.land/api/mcp \\
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

