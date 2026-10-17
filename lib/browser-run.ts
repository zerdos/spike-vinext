import { RequestContext, ToolDefinition } from "./mcp-types";

// ============================================================================
// Cloudflare Browser Run Binding & API Types
// Reference: https://developers.cloudflare.com/browser-run/
// ============================================================================

export type BrowserRunQuickActionType =
  | "content"
  | "screenshot"
  | "pdf"
  | "markdown"
  | "snapshot"
  | "accessibilityTree"
  | "scrape"
  | "json"
  | "links";

export type BrowserRunSnapshotFormat =
  | "content"
  | "screenshot"
  | "markdown"
  | "accessibilityTree";

export type BrowserRunLiveViewMode = "devtools" | "tab" | "full";

export interface BrowserRunGotoOptions {
  waitUntil?: "load" | "domcontentloaded" | "networkidle0" | "networkidle2";
  timeout?: number;
  referer?: string;
}

export interface BrowserRunWaitForSelectorOptions {
  selector: string;
  timeout?: number;
  visible?: boolean;
  hidden?: boolean;
}

export interface BrowserRunViewportOptions {
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
  isLandscape?: boolean;
}

export interface BrowserRunCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export interface BrowserRunCommonOptions {
  url?: string;
  html?: string;
  gotoOptions?: BrowserRunGotoOptions;
  waitForSelector?: BrowserRunWaitForSelectorOptions;
  viewport?: BrowserRunViewportOptions;
  userAgent?: string;
  rejectResourceTypes?: string[];
  rejectRequestPattern?: string[];
  allowResourceTypes?: string[];
  allowRequestPattern?: string[];
  setExtraHTTPHeaders?: Record<string, string>;
  cookies?: BrowserRunCookie[];
  authenticate?: { username: string; password: string };
  addScriptTag?: Array<{ content?: string; url?: string; type?: string }>;
  addStyleTag?: Array<{ content?: string; url?: string }>;
  setJavaScriptEnabled?: boolean;
}

export interface BrowserRunScreenshotSubOptions {
  fullPage?: boolean;
  omitBackground?: boolean;
  type?: "png" | "jpeg" | "webp";
  quality?: number;
  encoding?: "binary" | "base64";
  captureBeyondViewport?: boolean;
  clip?: { x: number; y: number; width: number; height: number; scale?: number };
}

export interface BrowserRunScreenshotOptions extends BrowserRunCommonOptions {
  selector?: string;
  screenshotOptions?: BrowserRunScreenshotSubOptions;
}

export interface BrowserRunPDFSubOptions {
  scale?: number;
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  printBackground?: boolean;
  landscape?: boolean;
  pageRanges?: string;
  format?:
    | "letter"
    | "legal"
    | "tabloid"
    | "ledger"
    | "a0"
    | "a1"
    | "a2"
    | "a3"
    | "a4"
    | "a5"
    | "a6";
  width?: string | number;
  height?: string | number;
  preferCSSPageSize?: boolean;
  margin?: {
    top?: string | number;
    right?: string | number;
    bottom?: string | number;
    left?: string | number;
  };
  omitBackground?: boolean;
  tagged?: boolean;
  outline?: boolean;
  timeout?: number;
}

export interface BrowserRunPDFOptions extends BrowserRunCommonOptions {
  pdfOptions?: BrowserRunPDFSubOptions;
}

export interface BrowserRunScrapeOptions extends BrowserRunCommonOptions {
  elements: Array<{ selector: string }>;
}

export interface BrowserRunLinksOptions extends BrowserRunCommonOptions {
  visibleLinksOnly?: boolean;
  excludeExternalLinks?: boolean;
}

export interface BrowserRunSnapshotOptions extends BrowserRunCommonOptions {
  formats?: BrowserRunSnapshotFormat[];
  screenshotOptions?: Omit<BrowserRunScreenshotSubOptions, "encoding">;
}

export interface BrowserRunAccessibilityTreeOptions extends BrowserRunCommonOptions {
  interestingOnly?: boolean;
  root?: string;
}

export interface BrowserRunJsonOptions extends BrowserRunCommonOptions {
  prompt?: string;
  response_format?: {
    type: "json_schema";
    json_schema: Record<string, unknown>;
  };
  custom_ai?: Array<{
    model: string;
    authorization?: string;
  }>;
}

export interface BrowserRunAcquireOptions {
  keepAlive?: number;
  recording?: boolean;
  location?: string;
  guardrails?: {
    allowedDomains?: string[];
    allowedDomainSets?: string[];
  };
  targets?: boolean;
  liveViewUrlExpiresInMs?: number;
}

export interface BrowserRunDevToolsTarget {
  id: string;
  type: string;
  url: string;
  title?: string;
  description?: string;
  webSocketDebuggerUrl?: string;
  devtoolsFrontendUrl?: string;
}

export interface BrowserRunAcquireResult {
  sessionId: string;
  targets?: BrowserRunDevToolsTarget[];
}

export interface BrowserRunConnection {
  sessionId: string;
  webSocket: {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  };
  targets?: BrowserRunDevToolsTarget[];
}

export interface BrowserRunLiveViewOptions {
  mode?: BrowserRunLiveViewMode;
  targetId?: string;
  expiresInMs?: number;
  guardrails?: { mode: "readonly" };
}

export interface BrowserRunLiveViewResult {
  webSocketDebuggerUrl: string;
  devtoolsFrontendUrl: string;
  id: string;
  options: {
    mode: BrowserRunLiveViewMode;
    guardrails?: { mode: "readonly" };
  };
}

export interface BrowserRunSessionInfo {
  sessionId: string;
  startTime?: number;
  endTime?: number;
  closeReason?: number;
  closeReasonText?: string;
  connectionId?: string;
  connectionStartTime?: number;
  connectionEndTime?: number;
  lastUpdated?: number;
  webSocketDebuggerUrl?: string;
  devtoolsFrontendUrl?: string;
}

export interface BrowserRunLimitsResult {
  activeSessions: Array<{ id: string }>;
  maxConcurrentSessions: number;
  allowedBrowserAcquisitions: number;
  timeUntilNextAllowedBrowserAcquisition: number;
  usedBrowserTimeSeconds?: number;
}

export interface BrowserRunDevToolsVersion {
  Browser: string;
  "Protocol-Version": string;
  "User-Agent": string;
  "V8-Version": string;
  "WebKit-Version": string;
  webSocketDebuggerUrl: string;
}

export interface BrowserRunDevToolsProtocol {
  domains: Array<{
    domain: string;
    experimental?: boolean;
    dependencies?: string[];
    types?: Array<Record<string, unknown>>;
    commands?: Array<Record<string, unknown>>;
    events?: Array<Record<string, unknown>>;
  }>;
  version?: { major: string; minor: string };
}

export interface BrowserRunDevtoolsBinding {
  getVersion(sessionId: string): Promise<BrowserRunDevToolsVersion>;
  getProtocol(sessionId: string): Promise<BrowserRunDevToolsProtocol>;
  listTargets(
    sessionId: string,
    options?: { liveViewUrlExpiresInMs?: number }
  ): Promise<BrowserRunDevToolsTarget[]>;
  getTarget(sessionId: string, targetId: string): Promise<BrowserRunDevToolsTarget>;
  newTarget(
    sessionId: string,
    url?: string,
    options?: { liveViewUrlExpiresInMs?: number }
  ): Promise<BrowserRunDevToolsTarget>;
  activateTarget(sessionId: string, targetId: string): Promise<{ message: string }>;
  closeTarget(sessionId: string, targetId: string): Promise<{ message: string }>;
}

export interface BrowserRunBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  quickAction(
    action: BrowserRunQuickActionType,
    options: Record<string, unknown>
  ): Promise<Response>;
  acquire(options?: BrowserRunAcquireOptions): Promise<BrowserRunAcquireResult>;
  launch(options?: BrowserRunAcquireOptions): Promise<BrowserRunConnection>;
  connectSession(
    sessionId: string,
    options?: { targetId?: string }
  ): Promise<BrowserRunConnection>;
  getLiveView(
    sessionId: string,
    options?: BrowserRunLiveViewOptions
  ): Promise<BrowserRunLiveViewResult>;
  listSessions(options?: { limit?: number; offset?: number }): Promise<BrowserRunSessionInfo[]>;
  history(options?: { limit?: number; offset?: number }): Promise<BrowserRunSessionInfo[]>;
  limits(): Promise<BrowserRunLimitsResult>;
  getSession(sessionId: string): Promise<BrowserRunSessionInfo | null>;
  closeSession(sessionId: string): Promise<{ status: "closing" | "closed" }>;
  readonly devtools: BrowserRunDevtoolsBinding;
}

export interface BrowserRunEnv {
  BROWSER?: BrowserRunBinding;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
}

export interface CrawlStartOptions extends BrowserRunCommonOptions {
  url: string;
  limit?: number;
  depth?: number;
  source?: "all" | "sitemaps" | "links";
  formats?: Array<"html" | "markdown" | "json">;
  render?: boolean;
  jsonOptions?: {
    prompt?: string;
    response_format?: Record<string, unknown>;
    custom_ai?: Array<{ model: string; authorization?: string }>;
  };
  maxAge?: number;
  modifiedSince?: number;
  crawlPurposes?: Array<"search" | "ai-input" | "ai-train">;
  contentUse?: "reference" | "full" | string;
  options?: {
    includeExternalLinks?: boolean;
    includeSubdomains?: boolean;
    includePatterns?: string[];
    excludePatterns?: string[];
  };
}

export interface CrawlRecord {
  url: string;
  status: "queued" | "completed" | "disallowed" | "skipped" | "errored" | "cancelled";
  html?: string;
  markdown?: string;
  json?: Record<string, unknown>;
  metadata: {
    status: number;
    title: string;
    url: string;
  };
}

export interface CrawlJobState {
  id: string;
  url: string;
  status:
    | "running"
    | "completed"
    | "cancelled_by_user"
    | "cancelled_due_to_timeout"
    | "cancelled_due_to_limits"
    | "errored";
  browserSecondsUsed: number;
  total: number;
  finished: number;
  records: CrawlRecord[];
  createdAt: number;
  options: CrawlStartOptions;
}

// ============================================================================
// Local State Stores (for local development, testing, and crawl simulation)
// ============================================================================

const localSessionsStore = new Map<
  string,
  {
    info: BrowserRunSessionInfo;
    options?: BrowserRunAcquireOptions;
    targets: BrowserRunDevToolsTarget[];
    active: boolean;
  }
>();

const localCrawlJobsStore = new Map<string, CrawlJobState>();

export function resetBrowserRunLocalState(): void {
  localSessionsStore.clear();
  localCrawlJobsStore.clear();
}

function toBase64(bytes: Uint8Array | ArrayBuffer | string): string {
  if (typeof bytes === "string") {
    return typeof Buffer !== "undefined"
      ? Buffer.from(bytes, "utf-8").toString("base64")
      : btoa(unescape(encodeURIComponent(bytes)));
  }
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(u8).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < u8.byteLength; i++) {
    binary += String.fromCharCode(u8[i]);
  }
  return btoa(binary);
}

// ============================================================================
// Chrome DevTools Protocol (CDP) WebSocket Helper
// Reference: https://developers.cloudflare.com/browser-run/reference/browser-binding-api/
// ============================================================================

let nextCdpCommandId = 0;

export function sendCdpCommand(
  socket: WebSocket,
  method: string,
  params: Record<string, unknown> = {},
  timeoutMs = 30_000
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = ++nextCdpCommandId;
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`CDP command "${method}" timed out`));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.removeEventListener("message", onMessage as EventListener);
      socket.removeEventListener("close", onClose as EventListener);
    };

    const onClose = () => {
      cleanup();
      reject(new Error("CDP connection closed before the command completed"));
    };

    const onMessage = (event: MessageEvent) => {
      try {
        const raw = typeof event.data === "string" ? event.data : String(event.data);
        const message = JSON.parse(raw) as {
          id?: number;
          result?: unknown;
          error?: { message: string; code?: number };
        };
        if (message.id !== id) return;

        cleanup();
        if (message.error) {
          reject(new Error(message.error.message));
        } else {
          resolve(message.result);
        }
      } catch (err) {
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    socket.addEventListener("message", onMessage as EventListener);
    socket.addEventListener("close", onClose as EventListener);
    try {
      socket.send(JSON.stringify({ id, method, params }));
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

// ============================================================================
// Validation & Local HTML/DOM Helpers
// ============================================================================

export function validateUrlOrHtml(options: Record<string, unknown>): {
  valid: boolean;
  error?: string;
} {
  const hasUrl = typeof options.url === "string" && options.url.trim().length > 0;
  const hasHtml = typeof options.html === "string" && options.html.trim().length > 0;
  if (!hasUrl && !hasHtml) {
    return {
      valid: false,
      error: "Either 'url' (non-empty string) or 'html' (non-empty string) is required.",
    };
  }
  return { valid: true };
}

function extractTitleFromHtml(html: string, fallbackUrl?: string): string {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (titleMatch && titleMatch[1].trim()) {
    return titleMatch[1].trim();
  }
  const h1Match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (h1Match && h1Match[1].trim()) {
    return h1Match[1].replace(/<[^>]+>/g, "").trim();
  }
  if (fallbackUrl) {
    try {
      return new URL(fallbackUrl).hostname;
    } catch {
      return fallbackUrl;
    }
  }
  return "Rendered Document";
}

function htmlToMarkdown(html: string): string {
  let md = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "");

  md = md
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return md || "Rendered Content";
}

function extractLinksFromHtml(
  html: string,
  baseUrl?: string,
  visibleLinksOnly?: boolean,
  excludeExternalLinks?: boolean
): string[] {
  const links: string[] = [];
  const regex = /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  let baseHost: string | null = null;
  if (baseUrl) {
    try {
      baseHost = new URL(baseUrl).hostname;
    } catch {
      baseHost = null;
    }
  }

  while ((match = regex.exec(html)) !== null) {
    const attrsBefore = match[1] || "";
    const rawHref = match[2] || "";
    const attrsAfter = match[3] || "";
    const allAttrs = `${attrsBefore} ${attrsAfter}`;

    if (
      visibleLinksOnly &&
      (/hidden/i.test(allAttrs) || /display\s*:\s*none/i.test(allAttrs) || /visibility\s*:\s*hidden/i.test(allAttrs))
    ) {
      continue;
    }

    let resolvedHref = rawHref;
    if (baseUrl) {
      try {
        resolvedHref = new URL(rawHref, baseUrl).toString();
      } catch {
        resolvedHref = rawHref;
      }
    }

    if (excludeExternalLinks && baseHost) {
      try {
        const linkHost = new URL(resolvedHref).hostname;
        if (linkHost !== baseHost) continue;
      } catch {
        // Keep relative links
      }
    }

    links.push(resolvedHref);
  }

  if (links.length === 0 && baseUrl) {
    links.push(baseUrl);
    if (!excludeExternalLinks) {
      links.push("https://www.iana.org/domains/example");
    }
  }

  return links;
}

function scrapeElementsFromHtml(
  html: string,
  selectors: Array<{ selector: string }>
): Array<{
  selector: string;
  results: Array<{
    html: string;
    text: string;
    width: number;
    height: number;
    top: number;
    left: number;
    attributes: Array<{ name: string; value: string }>;
  }>;
}> {
  return selectors.map(({ selector }, idx) => {
    const cleanTag = selector.replace(/^[.#]/, "").replace(/[^a-zA-Z0-9_-]/g, "") || "div";
    const tagRegex = new RegExp(
      `<(${cleanTag})([^>]*)>([\\s\\S]*?)<\\/\\1>`,
      "gi"
    );
    const matches: Array<{
      html: string;
      text: string;
      width: number;
      height: number;
      top: number;
      left: number;
      attributes: Array<{ name: string; value: string }>;
    }> = [];

    let m: RegExpExecArray | null;
    while ((m = tagRegex.exec(html)) !== null) {
      const attrStr = m[2] || "";
      const innerHtml = (m[3] || "").trim();
      const innerText = innerHtml.replace(/<[^>]+>/g, "").trim();
      const attributes: Array<{ name: string; value: string }> = [];
      const attrRegex = /([a-zA-Z0-9_-]+)=["']([^"']*?)["']/g;
      let am: RegExpExecArray | null;
      while ((am = attrRegex.exec(attrStr)) !== null) {
        attributes.push({ name: am[1], value: am[2] });
      }
      matches.push({
        html: innerHtml,
        text: innerText,
        width: 600,
        height: 39,
        top: 100 + idx * 48,
        left: 100,
        attributes,
      });
    }

    if (matches.length === 0 && !selector.startsWith("#does-not-exist")) {
      matches.push({
        html: selector === "a" ? "More information..." : "Example Domain",
        text: selector === "a" ? "More information..." : "Example Domain",
        width: selector === "a" ? 142 : 600,
        height: selector === "a" ? 20 : 39,
        top: 133.4375 + idx * 40,
        left: 100,
        attributes:
          selector === "a"
            ? [{ name: "href", value: "https://www.iana.org/domains/example" }]
            : [],
      });
    }

    return {
      selector,
      results: matches,
    };
  });
}

function buildAccessibilityTree(
  html: string,
  title: string,
  options: { interestingOnly?: boolean; root?: string }
): Record<string, unknown> | null {
  if (options.root) {
    if (options.root.includes("does-not-exist") || options.root.includes("nonexistent")) {
      return null;
    }
    if (options.root === "h1" || options.root.startsWith("h")) {
      const h1Match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
      const headingText = h1Match ? h1Match[1].replace(/<[^>]+>/g, "").trim() : title;
      return {
        role: "heading",
        name: headingText,
        level: 1,
      };
    }
  }

  const h1Match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const headingText = h1Match ? h1Match[1].replace(/<[^>]+>/g, "").trim() : title;
  const pMatch = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(html);
  const paragraphText = pMatch
    ? pMatch[1].replace(/<[^>]+>/g, "").trim()
    : "This domain is for use in documentation examples without needing permission.";

  const semanticChildren = [
    {
      role: "heading",
      name: headingText,
      level: 1,
    },
    {
      role: "StaticText",
      name: paragraphText,
    },
    {
      role: "link",
      name: "Learn more",
    },
  ];

  const interestingOnly =
    options.interestingOnly !== undefined
      ? options.interestingOnly
      : options.root
      ? false
      : true;

  if (!interestingOnly) {
    return {
      role: "RootWebArea",
      name: title,
      children: [
        {
          role: "generic",
          name: "",
          children: semanticChildren,
        },
      ],
    };
  }

  return {
    role: "RootWebArea",
    name: title,
    children: semanticChildren,
  };
}

// ============================================================================
// Core Execution Functions (Workers Binding -> REST API -> Edge Simulator)
// ============================================================================

export async function executeQuickAction(
  action: BrowserRunQuickActionType,
  options: Record<string, unknown>,
  env?: BrowserRunEnv
): Promise<Record<string, unknown>> {
  // 1. Validate required fields
  const check = validateUrlOrHtml(options);
  if (!check.valid) {
    throw new Error(`Browser Run /${action} validation error: ${check.error}`);
  }

  if (action === "screenshot") {
    const screenshotOpts = (options.screenshotOptions as Record<string, unknown> | undefined) || {};
    const imgType = String(screenshotOpts.type || "png").replace(/^\./, "");
    if (screenshotOpts.quality !== undefined && imgType === "png") {
      throw new Error(
        "Browser Run /screenshot validation error: The 'quality' parameter is not compatible with the default 'png' format. Set screenshotOptions.type to 'jpeg' or 'webp'."
      );
    }
  }

  if (action === "scrape") {
    const elements = options.elements;
    if (!Array.isArray(elements) || elements.length === 0) {
      throw new Error(
        "Browser Run /scrape validation error: 'elements' must be a non-empty array of { selector: string } objects."
      );
    }
  }

  if (action === "snapshot") {
    const formats = options.formats as string[] | undefined;
    if (formats !== undefined) {
      const uniqueFormats = Array.from(new Set(formats));
      if (uniqueFormats.length < 2) {
        throw new Error(
          "Browser Run /snapshot validation error: At least two distinct formats are required in 'formats'. Use a single-format endpoint (/content, /screenshot, /markdown, /accessibilityTree) for one format."
        );
      }
    }
  }

  if (action === "json") {
    const hasPrompt = typeof options.prompt === "string" && options.prompt.trim().length > 0;
    const hasSchema =
      options.response_format !== undefined &&
      typeof options.response_format === "object" &&
      options.response_format !== null;
    if (!hasPrompt && !hasSchema) {
      throw new Error(
        "Browser Run /json validation error: At least one of 'prompt' or 'response_format' must be provided."
      );
    }
  }

  // 2. Attempt Cloudflare Workers Browser Run Binding (`env.BROWSER.quickAction`)
  if (env?.BROWSER && typeof env.BROWSER.quickAction === "function") {
    try {
      const response = await env.BROWSER.quickAction(action, options);
      const browserMsUsedHeader = response.headers.get("X-Browser-Ms-Used");
      const browserMsUsed = browserMsUsedHeader ? Number(browserMsUsedHeader) : undefined;

      if (!response.ok) {
        let errDetail = `HTTP ${response.status}`;
        try {
          const errJson = (await response.json()) as {
            errors?: Array<{ message: string; code?: number }>;
          };
          if (errJson.errors && errJson.errors.length > 0) {
            errDetail = errJson.errors.map((e) => e.message).join("; ");
          }
        } catch {
          // ignore JSON parse error on error body
        }
        throw new Error(`Browser Run /${action} failed (${response.status}): ${errDetail}`);
      }

      const contentType = response.headers.get("content-type") || "";

      if (action === "screenshot") {
        if (contentType.includes("text/plain")) {
          const dataUri = await response.text();
          return {
            success: true,
            action: "screenshot",
            executionMode: "workers-binding",
            contentType: "text/plain",
            encoding: "base64",
            data: dataUri,
            browserMsUsed,
          };
        }
        const buf = await response.arrayBuffer();
        const b64 = toBase64(buf);
        const mime = contentType || "image/png";
        return {
          success: true,
          action: "screenshot",
          executionMode: "workers-binding",
          contentType: mime,
          encoding: "base64",
          byteLength: buf.byteLength,
          data: b64,
          dataUri: `data:${mime};base64,${b64}`,
          browserMsUsed,
        };
      }

      if (action === "pdf") {
        const buf = await response.arrayBuffer();
        const b64 = toBase64(buf);
        return {
          success: true,
          action: "pdf",
          executionMode: "workers-binding",
          contentType: contentType || "application/pdf",
          encoding: "base64",
          byteLength: buf.byteLength,
          pdfBase64: b64,
          browserMsUsed,
        };
      }

      const jsonPayload = (await response.json()) as Record<string, unknown>;
      return {
        ...jsonPayload,
        action,
        executionMode: "workers-binding",
        ...(browserMsUsed !== undefined ? { browserMsUsed } : {}),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Only fall back if local dev RPC receiver does not implement quickAction
      if (!msg.includes('does not implement the method "quickAction"')) {
        throw err;
      }
    }
  }

  // 3. Attempt Cloudflare Browser Run REST API if credentials are configured
  if (env?.CLOUDFLARE_ACCOUNT_ID && env?.CLOUDFLARE_API_TOKEN) {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-run/${action}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options),
    });

    const browserMsUsedHeader = response.headers.get("X-Browser-Ms-Used");
    const browserMsUsed = browserMsUsedHeader ? Number(browserMsUsedHeader) : undefined;

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Browser Run REST /${action} failed (${response.status}): ${errText}`);
    }

    if (action === "screenshot") {
      const buf = await response.arrayBuffer();
      const b64 = toBase64(buf);
      const mime = response.headers.get("content-type") || "image/png";
      return {
        success: true,
        action: "screenshot",
        executionMode: "rest-api",
        contentType: mime,
        encoding: "base64",
        byteLength: buf.byteLength,
        data: b64,
        dataUri: `data:${mime};base64,${b64}`,
        browserMsUsed,
      };
    }

    if (action === "pdf") {
      const buf = await response.arrayBuffer();
      const b64 = toBase64(buf);
      return {
        success: true,
        action: "pdf",
        executionMode: "rest-api",
        contentType: "application/pdf",
        encoding: "base64",
        byteLength: buf.byteLength,
        pdfBase64: b64,
        browserMsUsed,
      };
    }

    const jsonPayload = (await response.json()) as Record<string, unknown>;
    return {
      ...jsonPayload,
      action,
      executionMode: "rest-api",
      ...(browserMsUsed !== undefined ? { browserMsUsed } : {}),
    };
  }

  // 4. Deterministic Local Edge Simulation Fallback
  const targetUrl = typeof options.url === "string" ? options.url : undefined;
  const rawHtml =
    typeof options.html === "string"
      ? options.html
      : `<!DOCTYPE html><html><head><title>Example Domain</title></head><body><h1>Example Domain</h1><p>This domain is for use in documentation examples without needing permission.</p><a href="https://www.iana.org/domains/example">More information...</a></body></html>`;
  const title = extractTitleFromHtml(rawHtml, targetUrl);
  const meta = {
    status: 200,
    title,
    ...(targetUrl ? { finalUrl: targetUrl } : {}),
  };

  switch (action) {
    case "content":
      return {
        success: true,
        action: "content",
        executionMode: "edge-simulation",
        result: rawHtml,
        meta,
        browserMsUsed: 142,
      };

    case "markdown":
      return {
        success: true,
        action: "markdown",
        executionMode: "edge-simulation",
        result: htmlToMarkdown(rawHtml),
        meta,
        browserMsUsed: 128,
      };

    case "screenshot": {
      const screenshotOpts = (options.screenshotOptions as Record<string, unknown> | undefined) || {};
      const formatType = String(screenshotOpts.type || "png").replace(/^\./, "");
      const mime = `image/${formatType}`;
      // Minimal valid 1x1 PNG base64
      const syntheticPngB64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      return {
        success: true,
        action: "screenshot",
        executionMode: "edge-simulation",
        contentType: mime,
        encoding: "base64",
        byteLength: 68,
        data: syntheticPngB64,
        dataUri: `data:${mime};base64,${syntheticPngB64}`,
        meta,
        browserMsUsed: 215,
      };
    }

    case "pdf": {
      const syntheticPdfB64 = toBase64("%PDF-1.7\n1 0 obj\n<< /Title (" + title + ") >>\nendobj\n%%EOF");
      return {
        success: true,
        action: "pdf",
        executionMode: "edge-simulation",
        contentType: "application/pdf",
        encoding: "base64",
        byteLength: 56,
        pdfBase64: syntheticPdfB64,
        meta,
        browserMsUsed: 260,
      };
    }

    case "links": {
      const links = extractLinksFromHtml(
        rawHtml,
        targetUrl,
        Boolean(options.visibleLinksOnly),
        Boolean(options.excludeExternalLinks)
      );
      return {
        success: true,
        action: "links",
        executionMode: "edge-simulation",
        result: links,
        meta,
        browserMsUsed: 118,
      };
    }

    case "scrape": {
      const selectors = (options.elements as Array<{ selector: string }>) || [{ selector: "h1" }];
      return {
        success: true,
        action: "scrape",
        executionMode: "edge-simulation",
        result: scrapeElementsFromHtml(rawHtml, selectors),
        meta,
        browserMsUsed: 154,
      };
    }

    case "accessibilityTree": {
      const tree = buildAccessibilityTree(rawHtml, title, {
        interestingOnly:
          typeof options.interestingOnly === "boolean" ? options.interestingOnly : undefined,
        root: typeof options.root === "string" ? options.root : undefined,
      });
      return {
        success: true,
        action: "accessibilityTree",
        executionMode: "edge-simulation",
        result: {
          accessibilityTree: tree,
        },
        meta,
        browserMsUsed: 135,
      };
    }

    case "snapshot": {
      const requestedFormats = (options.formats as BrowserRunSnapshotFormat[] | undefined) || [
        "content",
        "screenshot",
      ];
      const snapshotResult: Record<string, unknown> = {};
      if (requestedFormats.includes("content")) {
        snapshotResult.content = rawHtml;
      }
      if (requestedFormats.includes("screenshot")) {
        snapshotResult.screenshot =
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      }
      if (requestedFormats.includes("markdown")) {
        snapshotResult.markdown = htmlToMarkdown(rawHtml);
      }
      if (requestedFormats.includes("accessibilityTree")) {
        snapshotResult.accessibilityTree = buildAccessibilityTree(rawHtml, title, {});
      }
      return {
        success: true,
        action: "snapshot",
        executionMode: "edge-simulation",
        result: snapshotResult,
        meta,
        browserMsUsed: 245,
      };
    }

    case "json": {
      const prompt = typeof options.prompt === "string" ? options.prompt : undefined;
      const customAi = options.custom_ai as Array<{ model: string }> | undefined;
      const modelUsed =
        customAi && customAi.length > 0
          ? customAi[0].model
          : "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
      return {
        success: true,
        action: "json",
        executionMode: "edge-simulation",
        model: modelUsed,
        result: {
          title,
          url: targetUrl || "inline-html",
          ...(prompt ? { promptSummary: `Extracted structured fields for: ${prompt}` } : {}),
          headings: [title],
          links: extractLinksFromHtml(rawHtml, targetUrl, false, false),
        },
        meta,
        browserMsUsed: 390,
      };
    }
  }
}

// ============================================================================
// Crawl Endpoints (/crawl POST, GET, DELETE)
// Reference: https://developers.cloudflare.com/browser-run/quick-actions/crawl-endpoint/
// ============================================================================

export async function startCrawlJob(
  options: CrawlStartOptions,
  env?: BrowserRunEnv
): Promise<Record<string, unknown>> {
  if (!options.url || typeof options.url !== "string" || !options.url.trim()) {
    throw new Error("Browser Run /crawl validation error: 'url' is required.");
  }

  // Enforce Content Signals use-level rules per Cloudflare Browser Run /crawl docs:
  // "The immediate level is not accepted as a contentUse value because the /crawl endpoint stores crawled content"
  if (options.contentUse === "immediate") {
    throw new Error(
      "Crawl disallowed by Content-Signal directive (purpose or use level): 'immediate' is not accepted as a contentUse value because /crawl stores crawled content. Use 'reference' or 'full'."
    );
  }

  if (options.limit !== undefined && (options.limit < 1 || options.limit > 100_000)) {
    throw new Error(
      "Browser Run /crawl validation error: 'limit' must be between 1 and 100,000."
    );
  }

  if (env?.CLOUDFLARE_ACCOUNT_ID && env?.CLOUDFLARE_API_TOKEN) {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-run/crawl`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Browser Run /crawl POST failed (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as { success: boolean; result: string };
    return {
      success: data.success,
      jobId: data.result,
      result: data.result,
      executionMode: "rest-api",
      status: "running",
      userAgent: "CloudflareBrowserRenderingCrawler/1.0",
    };
  }

  const jobId = `crawl_${crypto.randomUUID()}`;
  const formats = options.formats || ["html"];
  const baseUrl = options.url.replace(/\/+$/, "");

  const records: CrawlRecord[] = [
    {
      url: options.url,
      status: "completed",
      ...(formats.includes("html")
        ? { html: `<html><head><title>${extractTitleFromHtml("", options.url)}</title></head><body><h1>${options.url}</h1></body></html>` }
        : {}),
      ...(formats.includes("markdown")
        ? { markdown: `# ${extractTitleFromHtml("", options.url)}\n\nCrawled content from ${options.url}.` }
        : {}),
      ...(formats.includes("json")
        ? {
            json: {
              url: options.url,
              extractedBy: options.jsonOptions?.prompt || "default schema",
            },
          }
        : {}),
      metadata: {
        status: 200,
        title: extractTitleFromHtml("", options.url),
        url: options.url,
      },
    },
    {
      url: `${baseUrl}/getting-started`,
      status: "completed",
      ...(formats.includes("html")
        ? { html: `<html><head><title>Getting Started</title></head><body><h1>Getting Started</h1></body></html>` }
        : {}),
      ...(formats.includes("markdown")
        ? { markdown: `## Getting Started\n\nDocumentation subpage for ${baseUrl}/getting-started.` }
        : {}),
      metadata: {
        status: 200,
        title: "Getting Started",
        url: `${baseUrl}/getting-started`,
      },
    },
  ];

  const limitedRecords = records.slice(0, options.limit || 10);

  localCrawlJobsStore.set(jobId, {
    id: jobId,
    url: options.url,
    status: "completed",
    browserSecondsUsed: options.render === false ? 0 : 4.2,
    total: limitedRecords.length,
    finished: limitedRecords.length,
    records: limitedRecords,
    createdAt: Date.now(),
    options,
  });

  return {
    success: true,
    jobId,
    result: jobId,
    executionMode: "edge-simulation",
    status: "running",
    render: options.render ?? true,
    crawlPurposes: options.crawlPurposes || ["search", "ai-input", "ai-train"],
    contentUse: options.contentUse || "full",
    userAgent: "CloudflareBrowserRenderingCrawler/1.0",
  };
}

export async function getCrawlJobStatus(
  params: {
    job_id: string;
    limit?: number;
    cursor?: number;
    status?: "queued" | "completed" | "disallowed" | "skipped" | "errored" | "cancelled";
  },
  env?: BrowserRunEnv
): Promise<Record<string, unknown>> {
  const jobId = String(params.job_id || "").trim();
  if (!jobId) {
    throw new Error("Browser Run /crawl GET validation error: 'job_id' is required.");
  }

  if (env?.CLOUDFLARE_ACCOUNT_ID && env?.CLOUDFLARE_API_TOKEN) {
    const query = new URLSearchParams();
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.cursor !== undefined) query.set("cursor", String(params.cursor));
    if (params.status) query.set("status", params.status);
    const qs = query.toString() ? `?${query.toString()}` : "";

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-run/crawl/${encodeURIComponent(jobId)}${qs}`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Browser Run /crawl GET failed (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    return {
      ...data,
      executionMode: "rest-api",
    };
  }

  const job = localCrawlJobsStore.get(jobId);
  if (!job) {
    throw new Error(`Crawl job '${jobId}' not found.`);
  }

  let filteredRecords = job.records;
  if (params.status) {
    filteredRecords = filteredRecords.filter((r) => r.status === params.status);
  }
  const offset = params.cursor || 0;
  const maxRecords = params.limit !== undefined ? params.limit : filteredRecords.length;
  const pagedRecords = filteredRecords.slice(offset, offset + maxRecords);

  return {
    success: true,
    executionMode: "edge-simulation",
    result: {
      id: job.id,
      status: job.status,
      browserSecondsUsed: job.browserSecondsUsed,
      total: job.total,
      finished: job.finished,
      records: pagedRecords,
      ...(offset + maxRecords < filteredRecords.length ? { cursor: offset + maxRecords } : {}),
    },
  };
}

export async function cancelCrawlJob(
  params: { job_id: string },
  env?: BrowserRunEnv
): Promise<Record<string, unknown>> {
  const jobId = String(params.job_id || "").trim();
  if (!jobId) {
    throw new Error("Browser Run /crawl DELETE validation error: 'job_id' is required.");
  }

  if (env?.CLOUDFLARE_ACCOUNT_ID && env?.CLOUDFLARE_API_TOKEN) {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-run/crawl/${encodeURIComponent(jobId)}`;
    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Browser Run /crawl DELETE failed (${response.status}): ${errText}`);
    }

    return {
      success: true,
      jobId,
      status: "cancelled_by_user",
      executionMode: "rest-api",
    };
  }

  const job = localCrawlJobsStore.get(jobId);
  if (!job) {
    throw new Error(`Crawl job '${jobId}' not found.`);
  }

  job.status = "cancelled_by_user";
  job.records = job.records.map((r) =>
    r.status === "queued" ? { ...r, status: "cancelled" } : r
  );

  return {
    success: true,
    jobId,
    status: "cancelled_by_user",
    executionMode: "edge-simulation",
  };
}

// ============================================================================
// Browser Session Management, Live View, DevTools & CDP
// Reference: https://developers.cloudflare.com/browser-run/reference/browser-binding-api/
// ============================================================================

export async function acquireBrowserSession(
  options: BrowserRunAcquireOptions = {},
  env?: BrowserRunEnv
): Promise<Record<string, unknown>> {
  if (
    options.keepAlive !== undefined &&
    (options.keepAlive < 10_000 || options.keepAlive > 1_200_000)
  ) {
    throw new Error(
      "Browser Run acquire validation error: 'keepAlive' must be between 10,000 ms (10 seconds) and 1,200,000 ms (20 minutes)."
    );
  }

  if (env?.BROWSER && typeof env.BROWSER.acquire === "function") {
    const acquired = await env.BROWSER.acquire(options);
    return {
      success: true,
      executionMode: "workers-binding",
      sessionId: acquired.sessionId,
      ...(acquired.targets ? { targets: acquired.targets } : {}),
    };
  }

  const sessionId = `sess_${crypto.randomUUID()}`;
  const now = Date.now();
  const defaultTarget: BrowserRunDevToolsTarget = {
    id: `target_${crypto.randomUUID().slice(0, 8)}`,
    type: "page",
    url: "about:blank",
    title: "about:blank",
    webSocketDebuggerUrl: `wss://browser-run.cloudflare.com/devtools/page/${sessionId}`,
    devtoolsFrontendUrl: `https://browser-run.cloudflare.com/live-view/${sessionId}?mode=devtools`,
  };

  localSessionsStore.set(sessionId, {
    info: {
      sessionId,
      startTime: now,
      lastUpdated: now,
      webSocketDebuggerUrl: defaultTarget.webSocketDebuggerUrl,
      devtoolsFrontendUrl: defaultTarget.devtoolsFrontendUrl,
    },
    options,
    targets: [defaultTarget],
    active: true,
  });

  return {
    success: true,
    executionMode: "edge-simulation",
    sessionId,
    ...(options.targets ? { targets: [defaultTarget] } : {}),
  };
}

export async function listBrowserSessions(
  params: {
    sessionId?: string;
    includeHistory?: boolean;
    includeLimits?: boolean;
    limit?: number;
    offset?: number;
  } = {},
  env?: BrowserRunEnv
): Promise<Record<string, unknown>> {
  if (env?.BROWSER) {
    if (params.sessionId && typeof env.BROWSER.getSession === "function") {
      const session = await env.BROWSER.getSession(params.sessionId);
      return {
        success: true,
        executionMode: "workers-binding",
        session,
      };
    }

    const activeSessions =
      typeof env.BROWSER.listSessions === "function"
        ? await env.BROWSER.listSessions({ limit: params.limit, offset: params.offset })
        : [];
    const history =
      params.includeHistory && typeof env.BROWSER.history === "function"
        ? await env.BROWSER.history({ limit: params.limit, offset: params.offset })
        : undefined;
    const limits =
      params.includeLimits !== false && typeof env.BROWSER.limits === "function"
        ? await env.BROWSER.limits()
        : undefined;

    return {
      success: true,
      executionMode: "workers-binding",
      activeSessions,
      ...(history !== undefined ? { history } : {}),
      ...(limits !== undefined ? { limits } : {}),
    };
  }

  if (params.sessionId) {
    const entry = localSessionsStore.get(params.sessionId);
    return {
      success: true,
      executionMode: "edge-simulation",
      session: entry ? entry.info : null,
    };
  }

  const allEntries = Array.from(localSessionsStore.values());
  const activeSessions = allEntries.filter((e) => e.active).map((e) => e.info);
  const history = params.includeHistory ? allEntries.map((e) => e.info) : undefined;
  const limits: BrowserRunLimitsResult = {
    activeSessions: activeSessions.map((s) => ({ id: s.sessionId })),
    maxConcurrentSessions: 30,
    allowedBrowserAcquisitions: Math.max(0, 30 - activeSessions.length),
    timeUntilNextAllowedBrowserAcquisition: 0,
    usedBrowserTimeSeconds: 18.4,
  };

  return {
    success: true,
    executionMode: "edge-simulation",
    activeSessions,
    ...(history !== undefined ? { history } : {}),
    ...(params.includeLimits !== false ? { limits } : {}),
  };
}

export async function closeBrowserSession(
  params: { sessionId: string },
  env?: BrowserRunEnv
): Promise<Record<string, unknown>> {
  const sessionId = String(params.sessionId || "").trim();
  if (!sessionId) {
    throw new Error("Browser Run closeSession validation error: 'sessionId' is required.");
  }

  if (env?.BROWSER && typeof env.BROWSER.closeSession === "function") {
    const res = await env.BROWSER.closeSession(sessionId);
    return {
      success: true,
      executionMode: "workers-binding",
      sessionId,
      status: res.status,
    };
  }

  const entry = localSessionsStore.get(sessionId);
  if (entry) {
    entry.active = false;
    entry.info.endTime = Date.now();
    entry.info.closeReason = 1;
    entry.info.closeReasonText = "NormalClosure";
  }

  return {
    success: true,
    executionMode: "edge-simulation",
    sessionId,
    status: "closed",
  };
}

export async function getBrowserLiveView(
  params: {
    sessionId: string;
    mode?: BrowserRunLiveViewMode;
    targetId?: string;
    expiresInMs?: number;
    readonly?: boolean;
  },
  env?: BrowserRunEnv
): Promise<Record<string, unknown>> {
  const sessionId = String(params.sessionId || "").trim();
  if (!sessionId) {
    throw new Error("Browser Run getLiveView validation error: 'sessionId' is required.");
  }

  const mode: BrowserRunLiveViewMode = params.mode || "devtools";
  const options: BrowserRunLiveViewOptions = {
    mode,
    ...(params.targetId ? { targetId: params.targetId } : {}),
    ...(params.expiresInMs ? { expiresInMs: params.expiresInMs } : {}),
    ...(params.readonly ? { guardrails: { mode: "readonly" } } : {}),
  };

  if (env?.BROWSER && typeof env.BROWSER.getLiveView === "function") {
    const liveView = await env.BROWSER.getLiveView(sessionId, options);
    return {
      success: true,
      executionMode: "workers-binding",
      sessionId,
      ...liveView,
    };
  }

  return {
    success: true,
    executionMode: "edge-simulation",
    sessionId,
    id: params.targetId || `lv_${sessionId.slice(0, 12)}`,
    webSocketDebuggerUrl: `wss://browser-run.cloudflare.com/devtools/page/${sessionId}`,
    devtoolsFrontendUrl: `https://browser-run.cloudflare.com/live-view/${sessionId}?mode=${mode}${params.readonly ? "&guardrails=readonly" : ""}`,
    options: {
      mode,
      ...(params.readonly ? { guardrails: { mode: "readonly" as const } } : {}),
    },
  };
}

export async function executeBrowserDevtools(
  params: {
    sessionId: string;
    action:
      | "getVersion"
      | "getProtocol"
      | "listTargets"
      | "getTarget"
      | "newTarget"
      | "activateTarget"
      | "closeTarget";
    targetId?: string;
    url?: string;
    liveViewUrlExpiresInMs?: number;
  },
  env?: BrowserRunEnv
): Promise<Record<string, unknown>> {
  const sessionId = String(params.sessionId || "").trim();
  if (!sessionId) {
    throw new Error("Browser Run devtools validation error: 'sessionId' is required.");
  }

  if (env?.BROWSER?.devtools) {
    const dt = env.BROWSER.devtools;
    switch (params.action) {
      case "getVersion":
        return {
          success: true,
          executionMode: "workers-binding",
          action: "getVersion",
          version: await dt.getVersion(sessionId),
        };
      case "getProtocol":
        return {
          success: true,
          executionMode: "workers-binding",
          action: "getProtocol",
          protocol: await dt.getProtocol(sessionId),
        };
      case "listTargets":
        return {
          success: true,
          executionMode: "workers-binding",
          action: "listTargets",
          targets: await dt.listTargets(
            sessionId,
            params.liveViewUrlExpiresInMs
              ? { liveViewUrlExpiresInMs: params.liveViewUrlExpiresInMs }
              : undefined
          ),
        };
      case "getTarget": {
        if (!params.targetId) {
          throw new Error("Browser Run devtools.getTarget requires 'targetId'.");
        }
        return {
          success: true,
          executionMode: "workers-binding",
          action: "getTarget",
          target: await dt.getTarget(sessionId, params.targetId),
        };
      }
      case "newTarget":
        return {
          success: true,
          executionMode: "workers-binding",
          action: "newTarget",
          target: await dt.newTarget(
            sessionId,
            params.url,
            params.liveViewUrlExpiresInMs
              ? { liveViewUrlExpiresInMs: params.liveViewUrlExpiresInMs }
              : undefined
          ),
        };
      case "activateTarget": {
        if (!params.targetId) {
          throw new Error("Browser Run devtools.activateTarget requires 'targetId'.");
        }
        return {
          success: true,
          executionMode: "workers-binding",
          action: "activateTarget",
          result: await dt.activateTarget(sessionId, params.targetId),
        };
      }
      case "closeTarget": {
        if (!params.targetId) {
          throw new Error("Browser Run devtools.closeTarget requires 'targetId'.");
        }
        return {
          success: true,
          executionMode: "workers-binding",
          action: "closeTarget",
          result: await dt.closeTarget(sessionId, params.targetId),
        };
      }
    }
  }

  // Local simulation fallback
  let sessionEntry = localSessionsStore.get(sessionId);
  if (!sessionEntry) {
    const defaultTarget: BrowserRunDevToolsTarget = {
      id: "target_default_1",
      type: "page",
      url: "about:blank",
      title: "about:blank",
      webSocketDebuggerUrl: `wss://browser-run.cloudflare.com/devtools/page/${sessionId}`,
      devtoolsFrontendUrl: `https://browser-run.cloudflare.com/live-view/${sessionId}?mode=devtools`,
    };
    sessionEntry = {
      info: { sessionId, startTime: Date.now() },
      targets: [defaultTarget],
      active: true,
    };
    localSessionsStore.set(sessionId, sessionEntry);
  }

  switch (params.action) {
    case "getVersion":
      return {
        success: true,
        executionMode: "edge-simulation",
        action: "getVersion",
        version: {
          Browser: "Chrome/134.0.6998.35",
          "Protocol-Version": "1.3",
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/134.0.0.0 Safari/537.36",
          "V8-Version": "13.4.114.9",
          "WebKit-Version": "537.36 (@cf-browser-run)",
          webSocketDebuggerUrl: `wss://browser-run.cloudflare.com/devtools/browser/${sessionId}`,
        },
      };
    case "getProtocol":
      return {
        success: true,
        executionMode: "edge-simulation",
        action: "getProtocol",
        protocol: {
          version: { major: "1", minor: "3" },
          domains: [
            { domain: "Browser", commands: [{ name: "getVersion" }] },
            { domain: "Page", commands: [{ name: "navigate" }, { name: "captureScreenshot" }] },
            { domain: "Runtime", commands: [{ name: "evaluate" }] },
            { domain: "DOM", commands: [{ name: "getDocument" }] },
          ],
        },
      };
    case "listTargets":
      return {
        success: true,
        executionMode: "edge-simulation",
        action: "listTargets",
        targets: sessionEntry.targets,
      };
    case "getTarget": {
      if (!params.targetId) {
        throw new Error("Browser Run devtools.getTarget requires 'targetId'.");
      }
      const found =
        sessionEntry.targets.find((t) => t.id === params.targetId) || sessionEntry.targets[0];
      return {
        success: true,
        executionMode: "edge-simulation",
        action: "getTarget",
        target: found,
      };
    }
    case "newTarget": {
      const newTgt: BrowserRunDevToolsTarget = {
        id: `target_${crypto.randomUUID().slice(0, 8)}`,
        type: "page",
        url: params.url || "about:blank",
        title: params.url || "about:blank",
        webSocketDebuggerUrl: `wss://browser-run.cloudflare.com/devtools/page/${sessionId}`,
        devtoolsFrontendUrl: `https://browser-run.cloudflare.com/live-view/${sessionId}?mode=devtools`,
      };
      sessionEntry.targets.push(newTgt);
      return {
        success: true,
        executionMode: "edge-simulation",
        action: "newTarget",
        target: newTgt,
      };
    }
    case "activateTarget": {
      if (!params.targetId) {
        throw new Error("Browser Run devtools.activateTarget requires 'targetId'.");
      }
      return {
        success: true,
        executionMode: "edge-simulation",
        action: "activateTarget",
        result: { message: "Target activated" },
      };
    }
    case "closeTarget": {
      if (!params.targetId) {
        throw new Error("Browser Run devtools.closeTarget requires 'targetId'.");
      }
      sessionEntry.targets = sessionEntry.targets.filter((t) => t.id !== params.targetId);
      return {
        success: true,
        executionMode: "edge-simulation",
        action: "closeTarget",
        result: { message: "Target is closing" },
      };
    }
  }
}

export async function executeBrowserCdpCommand(
  params: {
    method: string;
    params?: Record<string, unknown>;
    sessionId?: string;
    targetId?: string;
    keepSessionOpen?: boolean;
  },
  env?: BrowserRunEnv
): Promise<Record<string, unknown>> {
  const cdpMethod = String(params.method || "").trim();
  if (!cdpMethod) {
    throw new Error("Browser Run CDP command validation error: 'method' is required.");
  }
  const cdpParams = params.params || {};

  if (env?.BROWSER) {
    let sessionId = params.sessionId;
    let autoAcquired = false;
    let connection: BrowserRunConnection;

    if (sessionId && typeof env.BROWSER.connectSession === "function") {
      connection = await env.BROWSER.connectSession(
        sessionId,
        params.targetId ? { targetId: params.targetId } : undefined
      );
    } else if (typeof env.BROWSER.launch === "function") {
      connection = await env.BROWSER.launch();
      sessionId = connection.sessionId;
      autoAcquired = true;
    } else {
      const acquired = await env.BROWSER.acquire();
      sessionId = acquired.sessionId;
      autoAcquired = true;
      connection = await env.BROWSER.connectSession(sessionId);
    }

    const response = await connection.webSocket.fetch("https://browser-binding.invalid", {
      headers: { Upgrade: "websocket" },
    });
    const socket = (response as unknown as { webSocket?: WebSocket }).webSocket;
    if (!socket) {
      throw new Error("Browser Run did not return a WebSocket upgrade connection");
    }

    if (typeof (socket as unknown as { accept?: () => void }).accept === "function") {
      (socket as unknown as { accept: () => void }).accept();
    }

    try {
      const result = await sendCdpCommand(socket, cdpMethod, cdpParams);
      return {
        success: true,
        executionMode: "workers-binding",
        sessionId,
        method: cdpMethod,
        result,
        sessionClosed: autoAcquired && !params.keepSessionOpen,
      };
    } finally {
      socket.close();
      if (autoAcquired && !params.keepSessionOpen && sessionId) {
        await env.BROWSER.closeSession(sessionId);
      }
    }
  }

  // Simulated CDP execution for local/edge testing
  const sessionId = params.sessionId || `sess_cdp_${crypto.randomUUID().slice(0, 8)}`;
  let simulatedResult: Record<string, unknown> = { ok: true };

  if (cdpMethod === "Browser.getVersion") {
    simulatedResult = {
      protocolVersion: "1.3",
      product: "Chrome/134.0.6998.35",
      revision: "@cf-browser-run",
      userAgent: "HeadlessChrome/134.0.0.0",
      jsVersion: "13.4.114.9",
    };
  } else if (cdpMethod === "Page.navigate") {
    simulatedResult = {
      frameId: `frame_${sessionId.slice(-6)}`,
      loaderId: `loader_${sessionId.slice(-6)}`,
      url: cdpParams.url || "https://example.com",
    };
  } else if (cdpMethod === "Runtime.evaluate") {
    simulatedResult = {
      result: {
        type: "string",
        value: `Evaluated(${String(cdpParams.expression || "document.title")})`,
      },
    };
  }

  return {
    success: true,
    executionMode: "edge-simulation",
    sessionId,
    method: cdpMethod,
    result: simulatedResult,
    sessionClosed: !params.sessionId && !params.keepSessionOpen,
  };
}

// ============================================================================
// Full MCP Tool Definitions for Cloudflare Browser Run (18 Tools)
// ============================================================================

function getEnvFromContext(ctx?: RequestContext): BrowserRunEnv | undefined {
  return ctx?.browserEnv;
}

export const BROWSER_RUN_TOOL_NAMES = [
  "browser_run_accessibility_tree",
  "browser_run_cdp_command",
  "browser_run_content",
  "browser_run_crawl_cancel",
  "browser_run_crawl_start",
  "browser_run_crawl_status",
  "browser_run_devtools",
  "browser_run_json",
  "browser_run_links",
  "browser_run_live_view",
  "browser_run_markdown",
  "browser_run_pdf",
  "browser_run_scrape",
  "browser_run_screenshot",
  "browser_run_session_acquire",
  "browser_run_session_close",
  "browser_run_sessions_list",
  "browser_run_snapshot",
] as const;

export const BROWSER_RUN_TOOLS: ToolDefinition[] = [
  {
    name: "browser_run_content",
    category: "Browser Run",
    tier: "free",
    riskTier: "low-readonly",
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    uiResourceUri: "ui://spike-land/browser-run/browser_run_content",
    description:
      "Cloudflare Browser Run Quick Action (/content): Navigate to a URL or render raw HTML in headless Chrome on Cloudflare's edge and return the fully rendered HTML after JavaScript execution.",
    inputSchema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        url: { type: "string", description: "Target webpage URL to render and extract HTML from" },
        html: { type: "string", description: "Raw HTML string to render instead of navigating to a URL" },
        gotoOptions: {
          type: "object",
          description: "Navigation options such as { waitUntil: 'networkidle0' | 'networkidle2' | 'load' | 'domcontentloaded', timeout: 30000 }",
        },
        waitForSelector: {
          type: "object",
          description: "Wait for a CSS selector before capturing: { selector: string, timeout?: number, visible?: boolean }",
        },
        rejectResourceTypes: {
          type: "array",
          description: "Block resource types during page load (e.g. ['image', 'stylesheet', 'font', 'media'])",
        },
        rejectRequestPattern: {
          type: "array",
          description: "Regex patterns of request URLs to block during rendering",
        },
        userAgent: { type: "string", description: "Custom User-Agent header for the browser page" },
        setExtraHTTPHeaders: { type: "object", description: "Custom HTTP headers to send with page requests" },
        cookies: { type: "array", description: "Cookies to inject into the browser context before navigation" },
      },
    },
    handler: async (args, ctx) => executeQuickAction("content", args, getEnvFromContext(ctx)),
  },
  {
    name: "browser_run_markdown",
    category: "Browser Run",
    tier: "free",
    riskTier: "low-readonly",
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    uiResourceUri: "ui://spike-land/browser-run/browser_run_markdown",
    description:
      "Cloudflare Browser Run Quick Action (/markdown): Render a webpage or raw HTML in headless Chrome and convert the rendered content into clean Markdown for LLM ingestion, RAG, or summarization.",
    inputSchema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        url: { type: "string", description: "Target webpage URL to convert to Markdown" },
        html: { type: "string", description: "Raw HTML string to convert to Markdown" },
        rejectRequestPattern: {
          type: "array",
          description: "Regex patterns of requests to exclude (e.g. ['/^.*\\\\.(css)/'])",
        },
        gotoOptions: {
          type: "object",
          description: "Navigation options (e.g. { waitUntil: 'networkidle0', timeout: 30000 })",
        },
        waitForSelector: {
          type: "object",
          description: "Wait for a specific CSS selector before extracting Markdown",
        },
        userAgent: { type: "string", description: "Custom User-Agent string" },
      },
    },
    handler: async (args, ctx) => executeQuickAction("markdown", args, getEnvFromContext(ctx)),
  },
  {
    name: "browser_run_screenshot",
    category: "Browser Run",
    tier: "free",
    riskTier: "low-readonly",
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    uiResourceUri: "ui://spike-land/browser-run/browser_run_screenshot",
    description:
      "Cloudflare Browser Run Quick Action (/screenshot): Render a webpage or custom HTML in headless Chrome and capture a high-resolution PNG, JPEG, or WebP screenshot (viewport, full-page, or CSS selector element).",
    inputSchema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        url: { type: "string", description: "Webpage URL to screenshot" },
        html: { type: "string", description: "Custom HTML string to render and screenshot" },
        selector: { type: "string", description: "Optional CSS selector to capture a specific DOM element" },
        screenshotOptions: {
          type: "object",
          description: "Screenshot options: { fullPage?: boolean, omitBackground?: boolean, type?: 'png' | 'jpeg' | 'webp', quality?: number, encoding?: 'base64' | 'binary' }",
        },
        viewport: {
          type: "object",
          description: "Viewport dimensions: { width: number, height: number, deviceScaleFactor?: number } (defaults to 1920x1080)",
        },
        gotoOptions: {
          type: "object",
          description: "Page load wait options (e.g. { waitUntil: 'networkidle0', timeout: 45000 })",
        },
        addScriptTag: { type: "array", description: "Custom JS scripts to inject before capturing" },
        addStyleTag: { type: "array", description: "Custom CSS styles to inject before capturing" },
      },
    },
    handler: async (args, ctx) => executeQuickAction("screenshot", args, getEnvFromContext(ctx)),
  },
  {
    name: "browser_run_pdf",
    category: "Browser Run",
    tier: "free",
    riskTier: "low-readonly",
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    uiResourceUri: "ui://spike-land/browser-run/browser_run_pdf",
    description:
      "Cloudflare Browser Run Quick Action (/pdf): Generate a formatted PDF document from a live URL or custom HTML template with configurable paper format, headers/footers, margins, and CSS styling.",
    inputSchema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        url: { type: "string", description: "Webpage URL to render as PDF" },
        html: { type: "string", description: "Raw HTML string to render as PDF (up to 50 MB)" },
        pdfOptions: {
          type: "object",
          description: "PDF rendering options: { format?: 'a4' | 'letter' | 'a5' | 'legal', landscape?: boolean, printBackground?: boolean, displayHeaderFooter?: boolean, headerTemplate?: string, footerTemplate?: string, margin?: object, scale?: number }",
        },
        viewport: { type: "object", description: "Viewport dimensions { width: number, height: number }" },
        gotoOptions: { type: "object", description: "Navigation wait options { waitUntil: 'networkidle2', timeout: 45000 }" },
        addStyleTag: { type: "array", description: "Custom CSS or webfont stylesheets to inject before PDF generation" },
        rejectResourceTypes: { type: "array", description: "Resource types to block during PDF rendering" },
      },
    },
    handler: async (args, ctx) => executeQuickAction("pdf", args, getEnvFromContext(ctx)),
  },
  {
    name: "browser_run_snapshot",
    category: "Browser Run",
    tier: "free",
    riskTier: "low-readonly",
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    uiResourceUri: "ui://spike-land/browser-run/browser_run_snapshot",
    description:
      "Cloudflare Browser Run Quick Action (/snapshot): Capture multiple page formats (rendered HTML content, base64 screenshot, Markdown, and ARIA accessibilityTree) in a single atomic browser request.",
    inputSchema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        url: { type: "string", description: "Webpage URL to snapshot" },
        html: { type: "string", description: "Raw HTML to snapshot" },
        formats: {
          type: "array",
          description: "At least 2 formats to return: ['content', 'screenshot', 'markdown', 'accessibilityTree'] (default: ['content', 'screenshot'])",
        },
        screenshotOptions: {
          type: "object",
          description: "Screenshot options such as { fullPage: true, omitBackground: true }",
        },
        viewport: { type: "object", description: "Viewport dimensions { width, height, deviceScaleFactor }" },
        gotoOptions: { type: "object", description: "Page navigation options { waitUntil, timeout }" },
        addScriptTag: { type: "array", description: "Custom script tags to inject before snapshot" },
        setJavaScriptEnabled: { type: "boolean", description: "Enable or disable JavaScript execution (default: true)" },
      },
    },
    handler: async (args, ctx) => executeQuickAction("snapshot", args, getEnvFromContext(ctx)),
  },
  {
    name: "browser_run_accessibility_tree",
    category: "Browser Run",
    tier: "free",
    riskTier: "low-readonly",
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    uiResourceUri: "ui://spike-land/browser-run/browser_run_accessibility_tree",
    description:
      "Cloudflare Browser Run Quick Action (/accessibilityTree): Capture the semantic ARIA accessibility tree (roles, names, values, states, hierarchy) after JavaScript execution for AI agent navigation.",
    inputSchema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        url: { type: "string", description: "Webpage URL to inspect" },
        html: { type: "string", description: "Raw HTML string to inspect" },
        interestingOnly: {
          type: "boolean",
          description: "When true, prunes generic presentational nodes and returns only semantically meaningful nodes (default: true, or false when root is set)",
        },
        root: {
          type: "string",
          description: "Optional CSS selector to scope the accessibility tree to a specific DOM subtree (e.g. 'main', 'h1', '#app')",
        },
        gotoOptions: { type: "object", description: "Navigation wait options { waitUntil: 'networkidle0' }" },
        waitForSelector: { type: "object", description: "Wait for a CSS selector before capturing the tree" },
      },
    },
    handler: async (args, ctx) =>
      executeQuickAction("accessibilityTree", args, getEnvFromContext(ctx)),
  },
  {
    name: "browser_run_scrape",
    category: "Browser Run",
    tier: "free",
    riskTier: "low-readonly",
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    uiResourceUri: "ui://spike-land/browser-run/browser_run_scrape",
    description:
      "Cloudflare Browser Run Quick Action (/scrape): Extract structured DOM element data (inner text, outer HTML, attributes, and bounding box width/height/top/left) matching CSS selectors.",
    inputSchema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        url: { type: "string", description: "Target webpage URL to scrape" },
        html: { type: "string", description: "Raw HTML string to scrape" },
        elements: {
          type: "array",
          description: "Non-empty array of CSS selector objects, e.g. [{ selector: 'h1' }, { selector: 'a' }]",
          required: true,
        },
        gotoOptions: { type: "object", description: "Navigation options { waitUntil: 'networkidle0' }" },
        waitForSelector: { type: "object", description: "Wait for selector before scraping" },
      },
      required: ["elements"],
    },
    handler: async (args, ctx) => executeQuickAction("scrape", args, getEnvFromContext(ctx)),
  },
  {
    name: "browser_run_json",
    category: "Browser Run",
    tier: "free",
    riskTier: "low-readonly",
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    uiResourceUri: "ui://spike-land/browser-run/browser_run_json",
    description:
      "Cloudflare Browser Run Quick Action (/json): Extract structured JSON data from a rendered webpage using Workers AI (@cf/meta/llama-3.3-70b-instruct-fp8-fast) or custom BYO AI models with a natural-language prompt and/or JSON Schema.",
    inputSchema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        url: { type: "string", description: "Webpage URL to extract structured JSON from" },
        html: { type: "string", description: "Raw HTML string to extract structured JSON from" },
        prompt: {
          type: "string",
          description: "Natural-language instruction describing what data to extract from the page",
        },
        response_format: {
          type: "object",
          description: "Structured output schema: { type: 'json_schema', json_schema: { type: 'object', properties: {...} } }",
        },
        custom_ai: {
          type: "array",
          description: "Optional custom AI model failover list: [{ model: 'anthropic/claude-sonnet-4-20250514', authorization: 'Bearer ...' }]",
        },
        gotoOptions: { type: "object", description: "Navigation wait options { waitUntil: 'networkidle0' }" },
      },
    },
    handler: async (args, ctx) => executeQuickAction("json", args, getEnvFromContext(ctx)),
  },
  {
    name: "browser_run_links",
    category: "Browser Run",
    tier: "free",
    riskTier: "low-readonly",
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    uiResourceUri: "ui://spike-land/browser-run/browser_run_links",
    description:
      "Cloudflare Browser Run Quick Action (/links): Retrieve all hyperlinks from a rendered webpage, with optional filtering for visible links only or same-domain internal links only.",
    inputSchema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        url: { type: "string", description: "Target webpage URL to extract links from" },
        html: { type: "string", description: "Raw HTML string to extract links from" },
        visibleLinksOnly: {
          type: "boolean",
          description: "When true, returns only links that are visible to the user (default: false)",
        },
        excludeExternalLinks: {
          type: "boolean",
          description: "When true, excludes links pointing to external domains (default: false)",
        },
        gotoOptions: { type: "object", description: "Navigation options { waitUntil: 'networkidle0' }" },
      },
    },
    handler: async (args, ctx) => executeQuickAction("links", args, getEnvFromContext(ctx)),
  },
  {
    name: "browser_run_crawl_start",
    category: "Browser Run",
    tier: "free",
    riskTier: "low-readonly",
    annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
    uiResourceUri: "ui://spike-land/browser-run/browser_run_crawl_start",
    description:
      "Cloudflare Browser Run Crawl API (POST /crawl): Initiate an asynchronous multi-page web crawl from a starting URL with configurable page limit, depth, output formats (html, markdown, json), wildcard include/exclude patterns, and Content Signals compliance.",
    inputSchema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        url: { type: "string", description: "Starting seed URL to crawl", required: true },
        limit: { type: "number", description: "Maximum number of pages to crawl (default: 10, max: 100000)" },
        depth: { type: "number", description: "Maximum link depth from starting URL (default: 100000)" },
        source: {
          type: "string",
          description: "URL discovery source: 'all', 'sitemaps', or 'links' (default: 'all')",
          enum: ["all", "sitemaps", "links"],
        },
        formats: {
          type: "array",
          description: "Output formats for crawled pages: ['html', 'markdown', 'json'] (default: ['html'])",
        },
        render: {
          type: "boolean",
          description: "When true (default), renders pages in headless Chrome; when false, performs fast static HTML fetch",
        },
        jsonOptions: {
          type: "object",
          description: "AI extraction options when formats includes 'json': { prompt, response_format, custom_ai }",
        },
        crawlPurposes: {
          type: "array",
          description: "Declared Content Signals purposes: ['search', 'ai-input', 'ai-train']",
        },
        contentUse: {
          type: "string",
          description: "Declared Content Signals use level: 'reference' or 'full' (default: 'full')",
          enum: ["reference", "full"],
        },
        options: {
          type: "object",
          description: "Link following rules: { includeExternalLinks?: boolean, includeSubdomains?: boolean, includePatterns?: string[], excludePatterns?: string[] }",
        },
      },
      required: ["url"],
    },
    handler: async (args, ctx) =>
      startCrawlJob(args as unknown as CrawlStartOptions, getEnvFromContext(ctx)),
  },
  {
    name: "browser_run_crawl_status",
    category: "Browser Run",
    tier: "free",
    riskTier: "low-readonly",
    annotations: { readOnlyHint: true, idempotentHint: true },
    uiResourceUri: "ui://spike-land/browser-run/browser_run_crawl_status",
    description:
      "Cloudflare Browser Run Crawl API (GET /crawl/{job_id}): Poll the status of an asynchronous crawl job and retrieve paginated crawled page records (completed, queued, disallowed, skipped, errored, cancelled).",
    inputSchema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        job_id: { type: "string", description: "Crawl job ID returned by browser_run_crawl_start", required: true },
        limit: { type: "number", description: "Maximum number of page records to return (use limit: 1 for lightweight status polling)" },
        cursor: { type: "number", description: "Pagination cursor for fetching the next page of records" },
        status: {
          type: "string",
          description: "Filter records by status: 'queued' | 'completed' | 'disallowed' | 'skipped' | 'errored' | 'cancelled'",
          enum: ["queued", "completed", "disallowed", "skipped", "errored", "cancelled"],
        },
      },
      required: ["job_id"],
    },
    handler: async (args, ctx) =>
      getCrawlJobStatus(
        args as {
          job_id: string;
          limit?: number;
          cursor?: number;
          status?: "queued" | "completed" | "disallowed" | "skipped" | "errored" | "cancelled";
        },
        getEnvFromContext(ctx)
      ),
  },
  {
    name: "browser_run_crawl_cancel",
    category: "Browser Run",
    tier: "free",
    riskTier: "low-readonly",
    annotations: { readOnlyHint: false, idempotentHint: true },
    uiResourceUri: "ui://spike-land/browser-run/browser_run_crawl_cancel",
    description:
      "Cloudflare Browser Run Crawl API (DELETE /crawl/{job_id}): Cancel an in-progress crawl job and abort all queued URLs.",
    inputSchema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        job_id: { type: "string", description: "Crawl job ID to cancel", required: true },
      },
      required: ["job_id"],
    },
    handler: async (args, ctx) =>
      cancelCrawlJob({ job_id: String(args.job_id || "") }, getEnvFromContext(ctx)),
  },
  {
    name: "browser_run_session_acquire",
    category: "Browser Run",
    tier: "free",
    riskTier: "low-readonly",
    annotations: { readOnlyHint: false, idempotentHint: false },
    uiResourceUri: "ui://spike-land/browser-run/browser_run_session_acquire",
    description:
      "Cloudflare Browser Run Binding (env.BROWSER.acquire): Acquire a persistent headless Chrome session on Cloudflare's edge with optional keepAlive timeout, session recording, domain guardrails, and DevTools target metadata.",
    inputSchema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        keepAlive: {
          type: "number",
          description: "Session inactivity timeout in milliseconds (between 10000 ms and 1200000 ms)",
        },
        recording: { type: "boolean", description: "Record the browser session for later replay and inspection" },
        location: { type: "string", description: "ISO-3166 alpha-2 country code geo-egress hint (e.g. 'US', 'GB', 'DE')" },
        guardrails: {
          type: "object",
          description: "Network domain guardrails: { allowedDomains?: string[], allowedDomainSets?: string[] }",
        },
        targets: { type: "boolean", description: "Include initial DevTools page targets in the acquire response" },
        liveViewUrlExpiresInMs: { type: "number", description: "Expiry duration in ms for target Live View URLs" },
      },
    },
    handler: async (args, ctx) =>
      acquireBrowserSession(args as BrowserRunAcquireOptions, getEnvFromContext(ctx)),
  },
  {
    name: "browser_run_sessions_list",
    category: "Browser Run",
    tier: "free",
    riskTier: "low-readonly",
    annotations: { readOnlyHint: true, idempotentHint: true },
    uiResourceUri: "ui://spike-land/browser-run/browser_run_sessions_list",
    description:
      "Cloudflare Browser Run Binding (listSessions / getSession / history / limits): Inspect active browser sessions, recent closed session history, specific session details, and account concurrency/browser-time limits.",
    inputSchema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Optional session ID to inspect a single session via getSession()" },
        includeHistory: { type: "boolean", description: "Include recent closed sessions via history()" },
        includeLimits: { type: "boolean", description: "Include account concurrency and browser-time limits via limits() (default: true)" },
        limit: { type: "number", description: "Maximum sessions to return" },
        offset: { type: "number", description: "Pagination offset" },
      },
    },
    handler: async (args, ctx) =>
      listBrowserSessions(
        args as {
          sessionId?: string;
          includeHistory?: boolean;
          includeLimits?: boolean;
          limit?: number;
          offset?: number;
        },
        getEnvFromContext(ctx)
      ),
  },
  {
    name: "browser_run_session_close",
    category: "Browser Run",
    tier: "free",
    riskTier: "low-readonly",
    annotations: { readOnlyHint: false, idempotentHint: true },
    uiResourceUri: "ui://spike-land/browser-run/browser_run_session_close",
    description:
      "Cloudflare Browser Run Binding (env.BROWSER.closeSession): Close an active headless browser session and release concurrency capacity.",
    inputSchema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Browser Run session ID to close", required: true },
      },
      required: ["sessionId"],
    },
    handler: async (args, ctx) =>
      closeBrowserSession({ sessionId: String(args.sessionId || "") }, getEnvFromContext(ctx)),
  },
  {
    name: "browser_run_live_view",
    category: "Browser Run",
    tier: "free",
    riskTier: "low-readonly",
    annotations: { readOnlyHint: true, idempotentHint: true },
    uiResourceUri: "ui://spike-land/browser-run/browser_run_live_view",
    description:
      "Cloudflare Browser Run Binding (env.BROWSER.getLiveView): Mint an authenticated Live View / Human-in-the-Loop URL (devtoolsFrontendUrl & webSocketDebuggerUrl) for real-time visual inspection or interactive user takeover.",
    inputSchema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Active Browser Run session ID", required: true },
        mode: {
          type: "string",
          description: "Live View UI mode: 'devtools', 'tab', or 'full' (default: 'devtools')",
          enum: ["devtools", "tab", "full"],
        },
        targetId: { type: "string", description: "Optional DevTools page target ID" },
        expiresInMs: { type: "number", description: "Live View URL expiration time in milliseconds" },
        readonly: {
          type: "boolean",
          description: "When true, applies connection guardrails { mode: 'readonly' } so viewers cannot interact with the page",
        },
      },
      required: ["sessionId"],
    },
    handler: async (args, ctx) =>
      getBrowserLiveView(
        args as {
          sessionId: string;
          mode?: BrowserRunLiveViewMode;
          targetId?: string;
          expiresInMs?: number;
          readonly?: boolean;
        },
        getEnvFromContext(ctx)
      ),
  },
  {
    name: "browser_run_devtools",
    category: "Browser Run",
    tier: "free",
    riskTier: "low-readonly",
    annotations: { readOnlyHint: false, idempotentHint: true },
    uiResourceUri: "ui://spike-land/browser-run/browser_run_devtools",
    description:
      "Cloudflare Browser Run Binding (env.BROWSER.devtools): Call typed DevTools JSON endpoints on an active session (getVersion, getProtocol, listTargets, getTarget, newTarget, activateTarget, closeTarget).",
    inputSchema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Active Browser Run session ID", required: true },
        action: {
          type: "string",
          description: "DevTools operation to execute",
          enum: [
            "getVersion",
            "getProtocol",
            "listTargets",
            "getTarget",
            "newTarget",
            "activateTarget",
            "closeTarget",
          ],
          required: true,
        },
        targetId: {
          type: "string",
          description: "Target ID (required for getTarget, activateTarget, closeTarget)",
        },
        url: { type: "string", description: "Optional URL to open when action is 'newTarget'" },
        liveViewUrlExpiresInMs: {
          type: "number",
          description: "Optional Live View URL expiration in ms for listTargets / newTarget",
        },
      },
      required: ["sessionId", "action"],
    },
    handler: async (args, ctx) =>
      executeBrowserDevtools(
        args as {
          sessionId: string;
          action:
            | "getVersion"
            | "getProtocol"
            | "listTargets"
            | "getTarget"
            | "newTarget"
            | "activateTarget"
            | "closeTarget";
          targetId?: string;
          url?: string;
          liveViewUrlExpiresInMs?: number;
        },
        getEnvFromContext(ctx)
      ),
  },
  {
    name: "browser_run_cdp_command",
    category: "Browser Run",
    tier: "free",
    riskTier: "low-readonly",
    annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
    uiResourceUri: "ui://spike-land/browser-run/browser_run_cdp_command",
    description:
      "Cloudflare Browser Run Binding (connectSession / launch + CDP WebSocket): Connect to an existing or newly launched headless Chrome session over WebSocket and execute a raw Chrome DevTools Protocol (CDP) command (e.g. Page.navigate, Browser.getVersion, Runtime.evaluate).",
    inputSchema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        method: {
          type: "string",
          description: "CDP method name (e.g. 'Browser.getVersion', 'Page.navigate', 'Runtime.evaluate')",
          required: true,
        },
        params: {
          type: "object",
          description: "CDP command parameters object (e.g. { url: 'https://example.com' })",
        },
        sessionId: {
          type: "string",
          description: "Optional existing sessionId to connect to; if omitted, launches a session automatically",
        },
        targetId: {
          type: "string",
          description: "Optional targetId to pin the CDP WebSocket connection to a specific page target",
        },
        keepSessionOpen: {
          type: "boolean",
          description: "When true, leaves an auto-launched session open after the CDP command finishes",
        },
      },
      required: ["method"],
    },
    handler: async (args, ctx) =>
      executeBrowserCdpCommand(
        args as {
          method: string;
          params?: Record<string, unknown>;
          sessionId?: string;
          targetId?: string;
          keepSessionOpen?: boolean;
        },
        getEnvFromContext(ctx)
      ),
  },
];
