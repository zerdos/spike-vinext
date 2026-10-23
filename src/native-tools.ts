/**
 * Internal Native Tools & Handlers for Spike Land Agent Harness (MVP)
 * PRD Section 2.1 & 6: Built-in platform tools (including Cloudflare Browser Run)
 */

import { MountedToolDefinition, Env } from "./types.js";
import { executeQuickAction, BROWSER_RUN_TOOLS, BrowserRunEnv } from "../lib/browser-run.js";
import { MeetingNotesConnector } from "./connectors/meeting-notes-connector.js";

/**
 * Returns built-in native tools exposed to the agent loop via `discover_tools`.
 */
export function getInternalNativeTools(): MountedToolDefinition[] {
  const tools: MountedToolDefinition[] = [];

  for (const tool of BROWSER_RUN_TOOLS) {
    const simpleName = tool.name.replace(/^browser_run_/, "");

    // e.g. "browser.markdown"
    tools.push({
      namespacedName: `browser.${simpleName}`,
      upstreamName: tool.name,
      namespace: "browser",
      description: tool.description,
      inputSchema: tool.inputSchema as Record<string, unknown>,
    });

    // Also include canonical "browser.browser_run_markdown"
    if (simpleName !== tool.name) {
      tools.push({
        namespacedName: `browser.${tool.name}`,
        upstreamName: tool.name,
        namespace: "browser",
        description: tool.description,
        inputSchema: tool.inputSchema as Record<string, unknown>,
      });
    }
  }

  // Meeting notes native tools (namespace: "meetings")
  const dummyEnv: any = {};
  const meetingConnector = new MeetingNotesConnector(null, dummyEnv);
  const meetingTools = meetingConnector.getToolMap();

  for (const [toolName, toolDef] of Object.entries(meetingTools)) {
    tools.push({
      namespacedName: `meetings.${toolName}`,
      upstreamName: toolName,
      namespace: "meetings",
      description: toolDef.description,
      inputSchema: (toolDef.inputSchema as Record<string, unknown>) || {},
    });
  }

  return tools;
}

/**
 * Returns default execution handlers for native tools invoked via `run_tool`.
 */
export function getDefaultNativeHandlers(
  env: Env
): Record<string, (args: any) => Promise<any>> {
  const browserEnv: BrowserRunEnv = {
    BROWSER: env.BROWSER as any,
    CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID as string | undefined,
    CLOUDFLARE_API_TOKEN: (env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_API_KEY) as string | undefined,
  };

  const handlers: Record<string, (args: any) => Promise<any>> = {};

  const quickActionMap: Record<string, string> = {
    markdown: "markdown",
    browser_run_markdown: "markdown",
    content: "content",
    browser_run_content: "content",
    screenshot: "screenshot",
    browser_run_screenshot: "screenshot",
    pdf: "pdf",
    browser_run_pdf: "pdf",
    snapshot: "snapshot",
    browser_run_snapshot: "snapshot",
    accessibility_tree: "accessibilityTree",
    browser_run_accessibility_tree: "accessibilityTree",
    accessibilitytree: "accessibilityTree",
    scrape: "scrape",
    browser_run_scrape: "scrape",
    json: "json",
    browser_run_json: "json",
    links: "links",
    browser_run_links: "links",
  };

  for (const [key, action] of Object.entries(quickActionMap)) {
    const handler = async (args: any) => {
      return await executeQuickAction(action as any, args || {}, browserEnv);
    };
    handlers[`browser.${key}`] = handler;
    handlers[`browser_run.${key}`] = handler;
    handlers[key] = handler;
  }

  // Meeting notes handlers
  const meetingConnector = new MeetingNotesConnector(null, env);
  const meetingTools = meetingConnector.getToolMap();
  for (const [toolName, toolDef] of Object.entries(meetingTools)) {
    const handler = async (args: any) => {
      return await toolDef.execute(args);
    };
    handlers[`meetings.${toolName}`] = handler;
    handlers[toolName] = handler;
  }

  return handlers;
}
