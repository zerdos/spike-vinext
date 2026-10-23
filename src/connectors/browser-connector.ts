import { CodemodeConnector, ConnectorTools, ConnectorTool } from "@cloudflare/codemode";
import { executeQuickAction, BROWSER_RUN_TOOLS, BrowserRunEnv } from "../../lib/browser-run.js";
import { Env } from "../types.js";

export interface BrowserRunConnectorOptions {
  handlers?: Record<string, (args: any) => Promise<any> | any>;
}

export class BrowserRunConnector extends CodemodeConnector {
  private customHandlers?: Record<string, (args: any) => Promise<any> | any>;

  constructor(
    ctx: any,
    env: Env,
    options?: BrowserRunConnectorOptions
  ) {
    const validCtx = ctx && typeof ctx === "object" ? ctx : {};
    const validEnv = env && typeof env === "object" ? env : ({} as Env);
    super(validCtx, validEnv);
    this.customHandlers = options?.handlers;
  }

  name(): string {
    return "browser";
  }

  protected instructions(): string {
    return "Cloudflare Browser Run edge tools: extract clean markdown, raw HTML, structured JSON, screenshots, PDFs, accessibility trees, and scraped DOM elements from URLs.";
  }

  protected tools(): ConnectorTools {
    const tools: ConnectorTools = {};

    const browserEnv: BrowserRunEnv = {
      BROWSER: (this.env as any)?.BROWSER,
      CLOUDFLARE_ACCOUNT_ID: (this.env as any)?.CLOUDFLARE_ACCOUNT_ID as string | undefined,
      CLOUDFLARE_API_TOKEN: ((this.env as any)?.CLOUDFLARE_API_TOKEN || (this.env as any)?.CLOUDFLARE_API_KEY) as string | undefined,
    };

    const actionMap: Record<string, { action: string; desc: string }> = {
      markdown: {
        action: "markdown",
        desc: "Convert rendered webpage or HTML into clean markdown for LLM ingestion.",
      },
      content: {
        action: "content",
        desc: "Navigate to a URL and return fully rendered HTML after JavaScript execution.",
      },
      scrape: {
        action: "scrape",
        desc: "Scrape elements matching CSS selectors from a webpage.",
      },
      json: {
        action: "json",
        desc: "Extract structured JSON from a webpage using natural language prompt and schema.",
      },
      links: {
        action: "links",
        desc: "Extract all hyperlinks from a webpage URL.",
      },
      screenshot: {
        action: "screenshot",
        desc: "Capture a full-page or viewport screenshot of a webpage.",
      },
      pdf: {
        action: "pdf",
        desc: "Print a webpage to PDF document.",
      },
      snapshot: {
        action: "snapshot",
        desc: "Capture an MHTML snapshot of a webpage.",
      },
      accessibility_tree: {
        action: "accessibilityTree",
        desc: "Retrieve accessibility DOM tree representation of a webpage URL.",
      },
    };

    // Find schema from BROWSER_RUN_TOOLS if present
    const schemaMap = new Map<string, any>();
    for (const def of BROWSER_RUN_TOOLS) {
      const simple = def.name.replace(/^browser_run_/, "");
      schemaMap.set(simple, def.inputSchema);
      schemaMap.set(def.name, def.inputSchema);
    }

    for (const [methodName, { action, desc }] of Object.entries(actionMap)) {
      const toolSchema = schemaMap.get(methodName) || {
        type: "object",
        properties: {
          url: { type: "string", description: "Target webpage URL" },
        },
        required: ["url"],
      };

      const customHandler =
        this.customHandlers?.[`browser.${methodName}`] ||
        this.customHandlers?.[methodName];

      const connectorTool: ConnectorTool = {
        description: desc,
        inputSchema: toolSchema,
        requiresApproval: false, // Read-only extraction
        replay: "log",
        execute: async (args: any) => {
          if (customHandler) {
            return await customHandler(args);
          }
          return await executeQuickAction(action as any, args || {}, browserEnv);
        },
      };

      tools[methodName] = connectorTool;
    }

    return tools;
  }
}
