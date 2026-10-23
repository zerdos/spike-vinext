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
    count: 10,
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
      {
        name: "mount_mcp_server",
        description: "Mount an external HTTP/SSE MCP server or Registry server mid-chat without restarting the client. Automatically intercepts and indexes schemas in session state.",
        category: "Platform Core",
        parameters: {
          source: { type: "string", description: "Either a direct HTTPS MCP endpoint URL or registry identifier", required: true },
          namespace: { type: "string", description: "Short prefix for all tools from this server (e.g. 'gh', 'pg', 'linear')", required: true },
          transport: { type: "string", description: "MCP transport protocol: 'auto' | 'streamable-http' | 'sse'" },
          authSecretRef: { type: "string", description: "Optional Spike Land Vault reference (e.g. 'vault:GITHUB_TOKEN')" },
        },
        mockResponse: {
          status: "mounted",
          namespace: "linear",
          toolCount: 14,
          sampleTools: ["linear.issue_create", "linear.issue_search", "linear.project_list"],
          latencyMs: 38,
        },
      },
      {
        name: "unmount_mcp_server",
        description: "Unmount a previously mounted MCP server and purge its cached schemas from the active session.",
        category: "Platform Core",
        parameters: {
          namespace: { type: "string", description: "The namespace prefix of the mounted server to remove", required: true },
        },
        mockResponse: {
          status: "unmounted",
          namespace: "linear",
          message: "Successfully unmounted server and removed all tools from session context.",
        },
      },
      {
        name: "list_mounted_servers",
        description: "Returns active runtime-mounted servers in the current session, their health status, tool counts, and latency.",
        category: "Platform Core",
        parameters: {},
        mockResponse: {
          count: 1,
          servers: [
            {
              namespace: "linear",
              source: "https://mcp.linear.app/sse",
              toolCount: 14,
              transport: "sse",
              status: "healthy",
              latencyMs: 38,
            },
          ],
        },
      },
    ],
  },
  {
    id: "code-mode",
    name: "Code Mode",
    count: 5,
    icon: "code-xml",
    tools: [
      {
        name: "codemode",
        description: "Execute a JavaScript/TypeScript async program inside an isolated sandbox to orchestrate multiple tools, filter intermediate data, run conditional logic, or invoke saved snippets.",
        category: "Code Mode",
        parameters: {
          code: { type: "string", description: "Async arrow function expression to execute in sandbox, e.g. async () => { ... }", required: true },
          intent: { type: "string", description: "Summary of code intent for audit trail" },
        },
        mockResponse: {
          executionId: "exec_sample_9841",
          status: "completed",
          returnValue: {
            title: "Rendered at Edge",
            itemCount: 42,
          },
          logs: ["Executing codemode sandbox...", "Tool browser_run_content dispatched", "Completed in 14ms"],
          durationMs: 14.2,
        },
      },
      {
        name: "save_codemode_snippet",
        description: "Promote a working codemode execution or routine into a durable, reusable tool stored in SQLite.",
        category: "Code Mode",
        parameters: {
          name: { type: "string", description: "Unique name for the snippet", required: true },
          description: { type: "string", description: "Snippet description", required: true },
          code: { type: "string", description: "Optional async function code" },
          executionId: { type: "string", description: "Optional execution ID to save from" },
        },
        mockResponse: {
          status: "saved",
          snippet: {
            id: "snp_8f9a2c",
            name: "scrape_and_summarize",
            description: "Scrapes a URL and returns structured summary",
          },
        },
      },
      {
        name: "list_pending_executions",
        description: "Inspect all paused Code Mode executions awaiting human confirmation or review.",
        category: "Code Mode",
        parameters: {},
        mockResponse: {
          count: 0,
          pending: [],
        },
      },
      {
        name: "resolve_execution_approval",
        description: "Approve or reject a paused execution requiring human authorization (step-up authentication).",
        category: "Code Mode",
        parameters: {
          executionId: { type: "string", description: "ID of paused execution", required: true },
          decision: { type: "string", description: "Approval decision: 'approved' | 'rejected'", required: true },
          reason: { type: "string", description: "Optional reason for decision" },
        },
        mockResponse: {
          executionId: "exec_sample_9841",
          status: "approved",
          resumed: true,
        },
      },
      {
        name: "rollback_execution",
        description: "Roll back state changes performed by an execution using audit transaction log.",
        category: "Code Mode",
        parameters: {
          executionId: { type: "string", description: "ID of execution to roll back", required: true },
        },
        mockResponse: {
          executionId: "exec_sample_9841",
          status: "rolled_back",
          mutationsReverted: 1,
        },
      },
    ],
  },
  {
    id: "meeting-notes",
    name: "Meeting Notes",
    count: 14,
    icon: "file-text",
    tools: [
      {
        name: "create_meeting",
        description: "Create a new meeting record with a date, title, optional attendees, tags, transcript, summary, or questions.",
        category: "Meeting Notes",
        parameters: {
          title: { type: "string", description: "Title or subject of the meeting", required: true },
          meetingDate: { type: "string", description: "Meeting date in 'YYYY-MM-DD' format (e.g. '2026-10-23', 'today')" },
          startTime: { type: "string", description: "Optional start time (e.g. '14:00 UTC')" },
          participants: { type: "array", description: "Attendee names or emails" },
          tags: { type: "array", description: "Topic or category tags" },
          transcript: { type: "string", description: "Initial raw transcript text" },
        },
        mockResponse: {
          status: "created",
          meetingId: "mtg_20261023_a1b2",
          meetingDate: "2026-10-23",
          title: "Q4 Architecture Sync",
        },
      },
      {
        name: "get_meeting",
        description: "Retrieve complete meeting notes by meetingId or title (with optional meetingDate), including transcript, summary, and questions.",
        category: "Meeting Notes",
        parameters: {
          meetingId: { type: "string", description: "Meeting ID or title", required: true },
          includeTranscript: { type: "boolean", description: "Whether to return full raw transcript (default: true)" },
        },
        mockResponse: {
          id: "mtg_20261023_a1b2",
          title: "Q4 Architecture Sync",
          meetingDate: "2026-10-23",
          status: "completed",
          participants: ["Alice", "Bob"],
        },
      },
      {
        name: "list_meetings",
        description: "List historical meeting notes with flexible date range ('dateFrom', 'dateTo', 'onDate'), participant, and tag filters.",
        category: "Meeting Notes",
        parameters: {
          dateFrom: { type: "string", description: "Start date filter ('YYYY-MM-DD')" },
          dateTo: { type: "string", description: "End date filter ('YYYY-MM-DD')" },
          participant: { type: "string", description: "Filter meetings with this attendee" },
          tag: { type: "string", description: "Filter by topic/tag" },
        },
        mockResponse: {
          total: 1,
          meetings: [
            {
              id: "mtg_20261023_a1b2",
              title: "Q4 Architecture Sync",
              meetingDate: "2026-10-23",
              status: "completed",
              participants: ["Alice", "Bob"],
              tags: ["architecture", "workers"],
            },
          ],
        },
      },
      {
        name: "search_meetings",
        description: "Full-text search across all meeting transcripts, summaries, and questions.",
        category: "Meeting Notes",
        parameters: {
          query: { type: "string", description: "Search term or keyword", required: true },
          limit: { type: "number", description: "Max results to return" },
        },
        mockResponse: {
          query: "sqlite",
          total: 1,
          matches: [
            {
              meetingId: "mtg_20261023_a1b2",
              title: "Q4 Architecture Sync",
              meetingDate: "2026-10-23",
              matchedField: "summary",
              snippet: "Discussed Durable Object SQLite replay...",
            },
          ],
        },
      },
      {
        name: "add_transcript",
        description: "Attach or append a raw transcript to a meeting, automatically parsing speaker turns.",
        category: "Meeting Notes",
        parameters: {
          meetingId: { type: "string", description: "Meeting ID", required: true },
          transcript: { type: "string", description: "Raw transcript text", required: true },
          append: { type: "boolean", description: "Whether to append to existing transcript (default: false)" },
        },
        mockResponse: {
          meetingId: "mtg_20261023_a1b2",
          parsedSegments: 4,
          transcriptLength: 480,
        },
      },
      {
        name: "get_transcript",
        description: "Retrieve parsed speaker turns and raw transcript for a meeting.",
        category: "Meeting Notes",
        parameters: {
          meetingId: { type: "string", description: "Meeting ID", required: true },
        },
        mockResponse: {
          meetingId: "mtg_20261023_a1b2",
          segmentCount: 4,
          segments: [
            { speaker: "Alice", timestamp: "00:01", text: "Let's review the SQLite replay architecture." },
          ],
        },
      },
      {
        name: "save_summary",
        description: "Save or update structured executive summary, key decisions, takeaways, and topics for a meeting.",
        category: "Meeting Notes",
        parameters: {
          meetingId: { type: "string", description: "Meeting ID", required: true },
          executiveSummary: { type: "string", description: "Concise TL;DR paragraph or markdown", required: true },
          keyDecisions: { type: "array", description: "Explicit decisions made in meeting" },
          takeaways: { type: "array", description: "Key insights or highlights" },
          topics: { type: "array", description: "Discussed topics or sections" },
        },
        mockResponse: {
          meetingId: "mtg_20261023_a1b2",
          summarySaved: true,
          keyDecisionsCount: 2,
        },
      },
      {
        name: "add_questions",
        description: "Log questions raised during or after a meeting with optional answers and assignees.",
        category: "Meeting Notes",
        parameters: {
          meetingId: { type: "string", description: "Meeting ID", required: true },
          questions: { type: "array", description: "Array of question objects: [{ question, askedBy, answer, status }]", required: true },
        },
        mockResponse: {
          meetingId: "mtg_20261023_a1b2",
          addedQuestionsCount: 1,
          totalQuestions: 1,
        },
      },
      {
        name: "list_questions",
        description: "List questions across all meetings or filtered by meetingId, status ('open' | 'answered'), or person.",
        category: "Meeting Notes",
        parameters: {
          meetingId: { type: "string", description: "Optional meeting ID filter" },
          status: { type: "string", description: "'open' | 'answered' | 'deferred'" },
          person: { type: "string", description: "Filter by asker or answerer" },
        },
        mockResponse: {
          total: 1,
          questions: [
            {
              id: "q_1",
              meetingId: "mtg_20261023_a1b2",
              question: "Does KV fallback support FTS?",
              askedBy: "Bob",
              status: "open",
            },
          ],
        },
      },
      {
        name: "update_question",
        description: "Update question status, answer, or answerer on a meeting record.",
        category: "Meeting Notes",
        parameters: {
          meetingId: { type: "string", description: "Meeting ID", required: true },
          questionId: { type: "string", description: "Question ID", required: true },
          status: { type: "string", description: "'open' | 'answered' | 'deferred'" },
          answer: { type: "string", description: "Answer text" },
        },
        mockResponse: {
          meetingId: "mtg_20261023_a1b2",
          questionId: "q_1",
          status: "answered",
        },
      },
      {
        name: "add_action_items",
        description: "Add follow-up action items and task assignments to a meeting.",
        category: "Meeting Notes",
        parameters: {
          meetingId: { type: "string", description: "Meeting ID", required: true },
          actionItems: { type: "array", description: "Array of action items: [{ task, owner, dueDate, status }]", required: true },
        },
        mockResponse: {
          meetingId: "mtg_20261023_a1b2",
          addedActionItemsCount: 1,
          totalActionItems: 1,
        },
      },
      {
        name: "update_action_item",
        description: "Update status, owner, or due date for a meeting action item.",
        category: "Meeting Notes",
        parameters: {
          meetingId: { type: "string", description: "Meeting ID", required: true },
          actionItemId: { type: "string", description: "Action item ID", required: true },
          status: { type: "string", description: "'pending' | 'in_progress' | 'done' | 'cancelled'" },
          owner: { type: "string", description: "Task owner name" },
        },
        mockResponse: {
          meetingId: "mtg_20261023_a1b2",
          actionItemId: "act_1",
          status: "done",
        },
      },
      {
        name: "update_meeting",
        description: "Update existing meeting metadata such as title, status, tags, participants, or notes.",
        category: "Meeting Notes",
        parameters: {
          meetingId: { type: "string", description: "Meeting ID", required: true },
          title: { type: "string", description: "New title" },
          status: { type: "string", description: "'scheduled' | 'in_progress' | 'completed' | 'archived'" },
          tags: { type: "array", description: "Updated tags" },
        },
        mockResponse: {
          meetingId: "mtg_20261023_a1b2",
          status: "updated",
        },
      },
      {
        name: "delete_meeting",
        description: "Delete a meeting record and its associated transcripts, summaries, and questions.",
        category: "Meeting Notes",
        parameters: {
          meetingId: { type: "string", description: "Meeting ID to delete", required: true },
        },
        mockResponse: {
          status: "deleted",
          success: true,
          meetingId: "mtg_20261023_a1b2",
        },
      },
    ],
  },
  {
    id: "mcp-registry",
    name: "MCP Registry",
    count: 4,
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
  {
    id: "serpapi",
    name: "SerpApi Search",
    count: 1,
    icon: "search",
    tools: [
      {
        name: "serpapi_search",
        description:
          "Universal search tool supporting all SerpApi engines (google_light, google, bing, duckduckgo, youtube, scholar, ebay, amazon) and result types.",
        category: "SerpApi Search",
        parameters: {
          q: { type: "string", description: "Search query string", required: true },
          engine: { type: "string", description: "Search engine to query (default: 'google_light'). Examples: google, google_light, bing, duckduckgo, youtube, scholar, ebay, amazon" },
          location: { type: "string", description: "Optional geographic location for localized results (e.g. 'Austin, TX' or 'Brighton, UK')" },
          output: { type: "string", description: "Response format: omit or 'json' for structured JSON, or 'md' for token-efficient Markdown" },
          mode: { type: "string", description: "Response verbosity: 'compact' or 'complete' (default: 'compact')" },
          params: { type: "object", description: "Optional nested engine-specific query parameters" },
        },
        mockResponse: {
          search_metadata: { status: "Success" },
          organic_results: [
            { position: 1, title: "Search Result", link: "https://example.com", snippet: "Result snippet..." },
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

