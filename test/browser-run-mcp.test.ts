import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  BROWSER_RUN_TOOLS,
  BROWSER_RUN_TOOL_NAMES,
  executeQuickAction,
  startCrawlJob,
  getCrawlJobStatus,
  cancelCrawlJob,
  acquireBrowserSession,
  listBrowserSessions,
  closeBrowserSession,
  getBrowserLiveView,
  executeBrowserDevtools,
  executeBrowserCdpCommand,
  resetBrowserRunLocalState,
  type BrowserRunBinding,
  type BrowserRunEnv,
} from "@/lib/browser-run";
import {
  ALL_TOOLS,
  dispatchJsonRpc,
  getVirtualGatewayTools,
  mintWorkspaceHandle,
} from "@/lib/mcp-gateway";
import { MCP_CATEGORIES } from "@/lib/mcp-data";
import { POST as mcpPost } from "@/app/api/mcp/route";
import {
  GET as virtualGatewayGet,
  POST as virtualGatewayPost,
} from "@/app/api/mcp/g/[gatewaySlug]/route";
import browserRunWorker from "../workers/browser-run-mcp/src/index";
import easyMcpGatewayWorker from "../workers/easy-mcp-gateway/src/index";

describe("Cloudflare Browser Run Engine, Worker & MCP Gateway Integration", () => {
  beforeEach(() => {
    resetBrowserRunLocalState();
    vi.restoreAllMocks();
  });

  describe("1. Quick Actions Unit Tests (/content, /markdown, /screenshot, /pdf, /snapshot, /accessibilityTree, /scrape, /json, /links)", () => {
    it("validates that either url or html is provided and action-specific required params are enforced", async () => {
      await expect(executeQuickAction("content", {})).rejects.toThrow(
        "Either 'url' (non-empty string) or 'html' (non-empty string) is required"
      );

      await expect(
        executeQuickAction("scrape", {
          url: "https://developers.cloudflare.com/browser-run/",
        })
      ).rejects.toThrow("'elements' must be a non-empty array");

      await expect(
        executeQuickAction("json", {
          url: "https://developers.cloudflare.com/browser-run/",
        })
      ).rejects.toThrow("At least one of 'prompt' or 'response_format' must be provided");

      await expect(
        executeQuickAction("screenshot", {
          url: "https://developers.cloudflare.com/browser-run/",
          screenshotOptions: { type: "png", quality: 80 },
        })
      ).rejects.toThrow("The 'quality' parameter is not compatible with the default 'png' format");

      await expect(
        executeQuickAction("snapshot", {
          url: "https://developers.cloudflare.com/browser-run/",
          formats: ["content"],
        })
      ).rejects.toThrow("At least two distinct formats are required");
    });

    it("executes all 9 Quick Actions via native env.BROWSER.quickAction() binding when attached", async () => {
      const quickActionSpy = vi.fn(async (endpoint: string, options: Record<string, unknown>) => {
        if (endpoint === "screenshot") {
          return new Response(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), {
            status: 200,
            headers: { "content-type": "image/png", "X-Browser-Ms-Used": "210" },
          });
        }
        if (endpoint === "pdf") {
          return new Response(new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]), {
            status: 200,
            headers: { "content-type": "application/pdf", "X-Browser-Ms-Used": "320" },
          });
        }
        if (endpoint === "content") {
          return Response.json(
            {
              success: true,
              result: `<html><body>Bound render for ${options.url}</body></html>`,
            },
            { headers: { "X-Browser-Ms-Used": "180" } }
          );
        }
        if (endpoint === "markdown") {
          return Response.json(
            {
              success: true,
              result: `# Bound Markdown\n\nURL: ${options.url}`,
            },
            { headers: { "X-Browser-Ms-Used": "195" } }
          );
        }
        if (endpoint === "snapshot") {
          return Response.json({
            success: true,
            result: {
              content: "<html><body>Snapshot DOM</body></html>",
              screenshot: "iVBORw0KGgoAAAANSUhEUg==",
            },
          });
        }
        if (endpoint === "accessibilityTree") {
          return Response.json({
            success: true,
            result: {
              nodes: [{ nodeId: "1", role: { type: "role", value: "RootWebArea" } }],
            },
          });
        }
        if (endpoint === "scrape") {
          return Response.json({
            success: true,
            result: [
              {
                selector: "h1",
                results: [
                  {
                    text: "Browser Run",
                    html: "<h1>Browser Run</h1>",
                    attributes: [{ name: "class", value: "hero" }],
                    height: 40,
                    width: 320,
                    top: 20,
                    left: 16,
                  },
                ],
              },
            ],
          });
        }
        if (endpoint === "json") {
          return Response.json({
            success: true,
            result: { product: "Cloudflare Browser Run", gaYear: 2026 },
          });
        }
        if (endpoint === "links") {
          return Response.json({
            success: true,
            result: ["https://developers.cloudflare.com/browser-run/quick-actions/"],
          });
        }
        return Response.json({ success: false }, { status: 400 });
      });

      const env: BrowserRunEnv = {
        BROWSER: {
          quickAction: quickActionSpy as unknown as BrowserRunBinding["quickAction"],
        } as unknown as BrowserRunBinding,
      };

      const contentRes = await executeQuickAction(
        "content",
        { url: "https://developers.cloudflare.com/browser-run/" },
        env
      );
      expect(contentRes.success).toBe(true);
      expect(contentRes.executionMode).toBe("workers-binding");
      expect(contentRes.browserMsUsed).toBe(180);
      expect(contentRes.result).toContain(
        "Bound render for https://developers.cloudflare.com/browser-run/"
      );

      const mdRes = await executeQuickAction(
        "markdown",
        { url: "https://developers.cloudflare.com/browser-run/" },
        env
      );
      expect(mdRes.success).toBe(true);
      expect(mdRes.executionMode).toBe("workers-binding");
      expect(mdRes.result).toContain("# Bound Markdown");

      const screenshotRes = await executeQuickAction(
        "screenshot",
        {
          url: "https://developers.cloudflare.com/browser-run/",
          screenshotOptions: { type: "png", fullPage: true },
        },
        env
      );
      expect(screenshotRes.success).toBe(true);
      expect(screenshotRes.executionMode).toBe("workers-binding");
      expect(screenshotRes).toMatchObject({
        contentType: "image/png",
        encoding: "base64",
        byteLength: 8,
      });

      const pdfRes = await executeQuickAction(
        "pdf",
        {
          url: "https://developers.cloudflare.com/browser-run/",
          pdfOptions: { format: "a4", printBackground: true },
        },
        env
      );
      expect(pdfRes.success).toBe(true);
      expect(pdfRes.executionMode).toBe("workers-binding");
      expect(pdfRes).toMatchObject({
        contentType: "application/pdf",
        encoding: "base64",
        byteLength: 8,
      });

      const snapshotRes = await executeQuickAction(
        "snapshot",
        { url: "https://developers.cloudflare.com/browser-run/" },
        env
      );
      expect(snapshotRes.success).toBe(true);
      expect(snapshotRes.result).toHaveProperty("screenshot");

      const axRes = await executeQuickAction(
        "accessibilityTree",
        { url: "https://developers.cloudflare.com/browser-run/" },
        env
      );
      expect(axRes.success).toBe(true);
      expect((axRes.result as { nodes: unknown[] }).nodes).toHaveLength(1);

      const scrapeRes = await executeQuickAction(
        "scrape",
        {
          url: "https://developers.cloudflare.com/browser-run/",
          elements: [{ selector: "h1" }],
        },
        env
      );
      expect(scrapeRes.success).toBe(true);
      expect((scrapeRes.result as Array<{ selector: string }>)[0].selector).toBe("h1");

      const jsonRes = await executeQuickAction(
        "json",
        {
          url: "https://developers.cloudflare.com/browser-run/",
          prompt: "Extract product name and GA year",
        },
        env
      );
      expect(jsonRes.success).toBe(true);
      expect(jsonRes.result).toEqual({ product: "Cloudflare Browser Run", gaYear: 2026 });

      const linksRes = await executeQuickAction(
        "links",
        {
          url: "https://developers.cloudflare.com/browser-run/",
          visibleLinksOnly: true,
        },
        env
      );
      expect(linksRes.success).toBe(true);
      expect(linksRes.result).toEqual([
        "https://developers.cloudflare.com/browser-run/quick-actions/",
      ]);
      expect(quickActionSpy).toHaveBeenCalledTimes(9);
    });

    it("gracefully falls back when env.BROWSER.quickAction throws the non-remote local dev RPC error", async () => {
      const env: BrowserRunEnv = {
        BROWSER: {
          quickAction: vi.fn(async () => {
            throw new Error('The RPC receiver does not implement the method "quickAction"');
          }),
        } as unknown as BrowserRunBinding,
      };

      const res = await executeQuickAction(
        "markdown",
        {
          html: "<html><head><title>Local Fallback</title></head><body><h1>Edge Title</h1><p>Paragraph text</p></body></html>",
        },
        env
      );
      expect(res.success).toBe(true);
      expect(res.executionMode).toBe("edge-simulation");
      expect(String(res.result)).toContain("# Edge Title");
      expect(String(res.result)).toContain("Paragraph text");
    });

    it("executes Quick Actions via Cloudflare REST API when accountId and apiToken are configured", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(async (input: RequestInfo | URL) => {
          const urlStr = String(input);
          if (urlStr.endsWith("/browser-run/markdown")) {
            return new Response(
              JSON.stringify({
                success: true,
                result: "# Cloudflare REST Markdown",
              }),
              {
                status: 200,
                headers: {
                  "content-type": "application/json",
                  "X-Browser-Ms-Used": "412",
                },
              }
            );
          }
          if (urlStr.endsWith("/browser-run/screenshot")) {
            return new Response(new Uint8Array([1, 2, 3, 4]), {
              status: 200,
              headers: {
                "content-type": "image/png",
                "X-Browser-Ms-Used": "650",
              },
            });
          }
          return new Response(JSON.stringify({ success: false, errors: [{ message: "Failed" }] }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        });

      const env: BrowserRunEnv = {
        CLOUDFLARE_ACCOUNT_ID: "1f98921051196545ebe79a450d3c71ed",
        CLOUDFLARE_API_TOKEN: "cf_test_token_123",
      };

      const mdRes = await executeQuickAction(
        "markdown",
        { url: "https://developers.cloudflare.com/browser-run/" },
        env
      );
      expect(mdRes.success).toBe(true);
      expect(mdRes.executionMode).toBe("rest-api");
      expect(mdRes.browserMsUsed).toBe(412);
      expect(mdRes.result).toBe("# Cloudflare REST Markdown");

      const shotRes = await executeQuickAction(
        "screenshot",
        { url: "https://developers.cloudflare.com/browser-run/" },
        env
      );
      expect(shotRes.success).toBe(true);
      expect(shotRes.executionMode).toBe("rest-api");
      expect(shotRes.browserMsUsed).toBe(650);
      expect(shotRes.byteLength).toBe(4);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it("executes all 9 Quick Actions in local deterministic edge mode when offline", async () => {
      const sampleHtml =
        '<html><head><title>Spike Test Page</title></head><body><h1>Main Heading</h1><p>Welcome to Spike</p><a href="https://spike.land/docs">Docs</a><a href="https://external.example.com/page">Ext</a></body></html>';

      const cRes = await executeQuickAction("content", { html: sampleHtml });
      expect(cRes.success).toBe(true);
      expect(cRes.result).toContain("<h1>Main Heading</h1>");

      const mRes = await executeQuickAction("markdown", { html: sampleHtml });
      expect(mRes.success).toBe(true);
      expect(String(mRes.result)).toContain("# Main Heading");

      const sRes = await executeQuickAction("screenshot", { html: sampleHtml });
      expect(sRes.success).toBe(true);
      expect(String(sRes.dataUri)).toMatch(/^data:image\/png;base64,/);

      const pRes = await executeQuickAction("pdf", { html: sampleHtml });
      expect(pRes.success).toBe(true);
      expect(pRes.contentType).toBe("application/pdf");

      const snapRes = await executeQuickAction("snapshot", { html: sampleHtml });
      expect(snapRes.success).toBe(true);
      expect((snapRes.result as { content: string; screenshot: string }).content).toContain(
        "Main Heading"
      );

      const axRes = await executeQuickAction("accessibilityTree", { html: sampleHtml });
      expect(axRes.success).toBe(true);
      expect(axRes.result).toHaveProperty("accessibilityTree");

      const scrapeRes = await executeQuickAction("scrape", {
        html: sampleHtml,
        elements: [{ selector: "h1" }, { selector: "a" }],
      });
      expect(scrapeRes.success).toBe(true);
      const scraped = scrapeRes.result as Array<{
        selector: string;
        results: Array<{ text: string }>;
      }>;
      expect(scraped[0].results[0].text).toBe("Main Heading");

      const jsonRes = await executeQuickAction("json", {
        html: sampleHtml,
        prompt: "Extract page summary",
        response_format: {
          type: "json_schema",
          json_schema: {
            type: "object",
            properties: {
              title: { type: "string" },
            },
          },
        },
      });
      expect(jsonRes.success).toBe(true);
      expect(jsonRes.result).toHaveProperty("title");

      const linksRes = await executeQuickAction("links", {
        url: "https://spike.land",
        html: sampleHtml,
        excludeExternalLinks: true,
      });
      expect(linksRes.success).toBe(true);
      expect(linksRes.result).toEqual(["https://spike.land/docs"]);
    });
  });

  describe("2. Multi-Page Crawl API Unit Tests (POST /crawl, GET /crawl/{job_id}, DELETE /crawl/{job_id})", () => {
    it("validates crawl parameters and enforces Content Signals Policy (contentUse === 'immediate')", async () => {
      await expect(startCrawlJob({ url: "" })).rejects.toThrow("'url' is required");

      await expect(
        startCrawlJob({ url: "https://spike.land", limit: 200000 })
      ).rejects.toThrow("between 1 and 100,000");

      await expect(
        startCrawlJob({
          url: "https://spike.land",
          contentUse: "immediate",
        })
      ).rejects.toThrow("Crawl disallowed by Content-Signal directive");
    });

    it("manages the full crawl lifecycle (start, status with pagination/filtering, cancel) in local mode and REST mode", async () => {
      const started = await startCrawlJob({
        url: "https://developers.cloudflare.com/browser-run/",
        limit: 2,
        depth: 2,
        formats: ["html", "markdown", "json"],
        jsonOptions: { prompt: "Extract page heading" },
      });
      expect(started.success).toBe(true);
      const jobId = String(started.jobId || "");
      expect(jobId).toMatch(/^crawl_/);

      // Poll status with limit=1
      const page1 = await getCrawlJobStatus({
        job_id: jobId,
        limit: 1,
        status: "completed",
      });
      expect(page1.success).toBe(true);
      const page1Result = page1.result as {
        total: number;
        records: Array<{ markdown?: string; html?: string; json?: unknown }>;
        cursor?: number;
      };
      expect(page1Result.total).toBe(2);
      expect(page1Result.records).toHaveLength(1);
      expect(page1Result.cursor).toBe(1);
      expect(page1Result.records[0].markdown).toBeDefined();
      expect(page1Result.records[0].html).toBeDefined();
      expect(page1Result.records[0].json).toBeDefined();

      // Fetch next page using cursor
      const page2 = await getCrawlJobStatus({
        job_id: jobId,
        cursor: page1Result.cursor,
        limit: 1,
      });
      expect(page2.success).toBe(true);
      const page2Result = page2.result as { records: unknown[] };
      expect(page2Result.records).toHaveLength(1);

      // Cancel job
      const cancelled = await cancelCrawlJob({ job_id: jobId });
      expect(cancelled.success).toBe(true);
      expect(cancelled.status).toBe("cancelled_by_user");

      // Poll status after cancel reflects cancelled_by_user status
      const afterCancel = await getCrawlJobStatus({ job_id: jobId });
      expect((afterCancel.result as { status: string }).status).toBe("cancelled_by_user");

      // Test REST API mode for Crawl
      vi.spyOn(globalThis, "fetch").mockImplementation(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const urlStr = String(input);
          if (init?.method === "POST" && urlStr.endsWith("/browser-run/crawl")) {
            return new Response(JSON.stringify({ success: true, result: "rest_job_999" }), {
              status: 200,
            });
          }
          if (init?.method === "GET" && urlStr.includes("/browser-run/crawl/rest_job_999")) {
            return new Response(
              JSON.stringify({
                success: true,
                result: {
                  id: "rest_job_999",
                  status: "completed",
                  browserSecondsUsed: 4.5,
                  total: 1,
                  finished: 1,
                  records: [
                    {
                      url: "https://spike.land",
                      status: "completed",
                      markdown: "# Spike",
                      metadata: { status: 200, title: "Spike", url: "https://spike.land" },
                    },
                  ],
                },
              }),
              { status: 200 }
            );
          }
          if (init?.method === "DELETE" && urlStr.endsWith("/browser-run/crawl/rest_job_999")) {
            return new Response(
              JSON.stringify({
                success: true,
                result: { id: "rest_job_999", status: "cancelled_by_user" },
              }),
              { status: 200 }
            );
          }
          return new Response("Not found", { status: 404 });
        }
      );

      const restEnv: BrowserRunEnv = {
        CLOUDFLARE_ACCOUNT_ID: "acc_123",
        CLOUDFLARE_API_TOKEN: "tok_123",
      };

      const restStart = await startCrawlJob({ url: "https://spike.land" }, restEnv);
      expect(restStart.executionMode).toBe("rest-api");
      expect(restStart.jobId).toBe("rest_job_999");

      const restStatus = await getCrawlJobStatus(
        { job_id: "rest_job_999", limit: 10 },
        restEnv
      );
      expect(restStatus.executionMode).toBe("rest-api");
      expect(
        (restStatus.result as { records: Array<{ url: string }> }).records[0].url
      ).toBe("https://spike.land");

      const restCancel = await cancelCrawlJob({ job_id: "rest_job_999" }, restEnv);
      expect(restCancel.executionMode).toBe("rest-api");
      expect(restCancel.status).toBe("cancelled_by_user");
    });
  });

  describe("3. Browser Sessions, Live View, DevTools & Raw CDP Unit Tests", () => {
    it("acquires, inspects, opens Live View, runs DevTools & CDP commands, and closes sessions in local and binding modes", async () => {
      // 1. Local mode lifecycle
      const acquired = await acquireBrowserSession({
        keepAlive: 120000,
        recording: true,
        location: "GB",
        targets: true,
      });
      expect(acquired.success).toBe(true);
      const sessionId = String(acquired.sessionId || "");
      expect(sessionId).toMatch(/^sess_/);

      const listRes = await listBrowserSessions({
        includeHistory: true,
        includeLimits: true,
      });
      expect(listRes.success).toBe(true);
      const activeSessions = listRes.activeSessions as Array<{ sessionId: string }>;
      expect(activeSessions.some((s) => s.sessionId === sessionId)).toBe(true);
      expect((listRes.limits as { maxConcurrentSessions: number }).maxConcurrentSessions).toBe(30);

      const liveViewRes = await getBrowserLiveView({
        sessionId,
        mode: "devtools",
        readonly: true,
      });
      expect(liveViewRes.success).toBe(true);
      expect(liveViewRes.devtoolsFrontendUrl).toContain(sessionId);
      expect((liveViewRes.options as { guardrails?: { mode: string } }).guardrails?.mode).toBe(
        "readonly"
      );

      // DevTools operations
      const dtVersion = await executeBrowserDevtools({
        sessionId,
        action: "getVersion",
      });
      expect(dtVersion.success).toBe(true);
      expect(dtVersion.version).toHaveProperty("Protocol-Version");

      const dtCreate = await executeBrowserDevtools({
        sessionId,
        action: "newTarget",
        url: "https://spike.land/mcp",
      });
      expect(dtCreate.success).toBe(true);
      const createdTargetId = (dtCreate.target as { id: string }).id;

      const dtActivate = await executeBrowserDevtools({
        sessionId,
        action: "activateTarget",
        targetId: createdTargetId,
      });
      expect(dtActivate.success).toBe(true);

      // Raw CDP commands
      const cdpEval = await executeBrowserCdpCommand({
        sessionId,
        method: "Runtime.evaluate",
        params: { expression: "document.title" },
      });
      expect(cdpEval.success).toBe(true);
      expect(cdpEval.method).toBe("Runtime.evaluate");

      const cdpNav = await executeBrowserCdpCommand({
        sessionId,
        method: "Page.navigate",
        params: { url: "https://developers.cloudflare.com/browser-run/" },
      });
      expect(cdpNav.success).toBe(true);
      expect(cdpNav.result).toHaveProperty("frameId");

      // Close session
      const closed = await closeBrowserSession({ sessionId });
      expect(closed.success).toBe(true);
      expect(closed.status).toBe("closed");

      // 2. Native env.BROWSER Binding mode
      const bindingEnv: BrowserRunEnv = {
        BROWSER: {
          acquire: vi.fn(async () => ({ sessionId: "bound_sess_42" })),
          listSessions: vi.fn(async () => [
            { sessionId: "bound_sess_42", startTime: Date.now() },
          ]),
          limits: vi.fn(async () => ({
            activeSessions: [{ id: "bound_sess_42" }],
            allowedBrowserAcquisitions: 9,
            maxConcurrentSessions: 10,
            timeUntilNextAllowedBrowserAcquisition: 0,
          })),
          history: vi.fn(async () => [
            {
              sessionId: "bound_sess_42",
              startTime: Date.now() - 1000,
            },
          ]),
          getLiveView: vi.fn(async (sid) => ({
            id: `lv_${sid}`,
            webSocketDebuggerUrl: `wss://live.cloudflare.com/${sid}`,
            devtoolsFrontendUrl: `https://live.cloudflare.com/${sid}`,
            options: { mode: "devtools" as const },
          })),
          closeSession: vi.fn(async () => ({ status: "closed" as const })),
          devtools: {
            getVersion: vi.fn(async () => ({
              Browser: "Chrome/134.0.0.0",
              "Protocol-Version": "1.3",
              "User-Agent": "HeadlessChrome/134.0.0.0",
              "V8-Version": "13.4",
              "WebKit-Version": "537.36",
              webSocketDebuggerUrl: "wss://live.cloudflare.com/bound_sess_42",
            })),
            getProtocol: vi.fn(async () => ({ domains: [] })),
            listTargets: vi.fn(async () => [
              { id: "t1", type: "page", title: "Bound Tab", url: "https://spike.land" },
            ]),
            getTarget: vi.fn(async (_sid: string, tid: string) => ({
              id: tid,
              type: "page",
              title: "Bound Tab",
              url: "https://spike.land",
            })),
            newTarget: vi.fn(async (_sid: string, url?: string) => ({
              id: "t2",
              type: "page",
              title: "New Bound Tab",
              url: url || "about:blank",
            })),
            activateTarget: vi.fn(async () => ({ message: "Target activated" })),
            closeTarget: vi.fn(async () => ({ message: "Target closing" })),
          },
        } as unknown as BrowserRunBinding,
      };

      const boundAcquire = await acquireBrowserSession({ keepAlive: 60000 }, bindingEnv);
      expect(boundAcquire.executionMode).toBe("workers-binding");
      expect(boundAcquire.sessionId).toBe("bound_sess_42");

      const boundList = await listBrowserSessions(
        { includeHistory: true, includeLimits: true },
        bindingEnv
      );
      expect(boundList.executionMode).toBe("workers-binding");
      expect(
        (boundList.activeSessions as Array<{ sessionId: string }>)[0].sessionId
      ).toBe("bound_sess_42");

      const boundLive = await getBrowserLiveView(
        { sessionId: "bound_sess_42", readonly: false },
        bindingEnv
      );
      expect(boundLive.executionMode).toBe("workers-binding");
      expect(boundLive.devtoolsFrontendUrl).toBe("https://live.cloudflare.com/bound_sess_42");

      const boundDt = await executeBrowserDevtools(
        { sessionId: "bound_sess_42", action: "listTargets" },
        bindingEnv
      );
      expect(boundDt.executionMode).toBe("workers-binding");
      expect(boundDt.targets).toHaveLength(1);

      const boundClose = await closeBrowserSession({ sessionId: "bound_sess_42" }, bindingEnv);
      expect(boundClose.executionMode).toBe("workers-binding");
      expect(boundClose.status).toBe("closed");
    });
  });

  describe("4. Spike Land MCP Gateway Integration (Pattern B Broker, Pattern C Virtual Gateway, Universal & Registry)", () => {
    it("registers all 18 Browser Run tools in ALL_TOOLS and 'Browser Run' category in MCP_CATEGORIES", () => {
      expect(BROWSER_RUN_TOOLS).toHaveLength(18);
      expect(BROWSER_RUN_TOOL_NAMES).toHaveLength(18);

      for (const toolName of BROWSER_RUN_TOOL_NAMES) {
        expect(ALL_TOOLS[toolName]).toBeDefined();
        expect(ALL_TOOLS[toolName].category).toBe("Browser Run");
      }

      const cat = MCP_CATEGORIES.find((c) => c.id === "browser-run");
      expect(cat).toBeDefined();
      expect(cat?.name).toBe("Browser Run");
      expect(cat?.tools).toHaveLength(18);
    });

    it("discloses and executes Browser Run tools through Pattern B Broker (configure_active_categories -> execute_tool)", async () => {
      const initialHandle = mintWorkspaceHandle({
        sub: "agent_browser_tester",
        cats: ["Platform Core"],
      });

      // 1. Sandbox blocks calling browser_run_markdown before 'Browser Run' is enabled on handle
      const blockedRpc = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 101,
          method: "tools/call",
          params: {
            name: "execute_tool",
            arguments: {
              workspace_handle: initialHandle,
              tool_name: "browser_run_markdown",
              arguments: { url: "https://developers.cloudflare.com/browser-run/" },
            },
          },
        },
        { callerSubject: "agent_browser_tester" }
      );
      const blockedPayload = JSON.parse(
        (blockedRpc?.result as { content: Array<{ text: string }> }).content[0].text
      );
      expect(blockedPayload.errorCode).toBe("CATEGORY_NOT_ENABLED_ON_HANDLE");
      expect(blockedPayload.requiredCategory).toBe("Browser Run");

      // 2. Enable 'Browser Run' via configure_active_categories
      const configRpc = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 102,
          method: "tools/call",
          params: {
            name: "configure_active_categories",
            arguments: {
              workspace_handle: initialHandle,
              enable_categories: ["Browser Run"],
            },
          },
        },
        { callerSubject: "agent_browser_tester" }
      );
      const configPayload = JSON.parse(
        (configRpc?.result as { content: Array<{ text: string }> }).content[0].text
      );
      expect(configPayload.status).toBe("success");
      expect(configPayload.activeCategories).toContain("Browser Run");
      expect(configPayload.disclosedSchemas).toHaveLength(18);

      const updatedHandle = configPayload.workspace_handle as string;

      // 3. Execute browser_run_markdown via execute_tool with updated workspace_handle
      const execRpc = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 103,
          method: "tools/call",
          params: {
            name: "execute_tool",
            arguments: {
              workspace_handle: updatedHandle,
              tool_name: "browser_run_markdown",
              arguments: {
                url: "https://developers.cloudflare.com/browser-run/",
                html: "<html><body><h1>Cloudflare Browser Run</h1><p>Edge headless Chromium</p></body></html>",
              },
            },
          },
        },
        { callerSubject: "agent_browser_tester" }
      );
      const execPayload = JSON.parse(
        (execRpc?.result as { content: Array<{ text: string }> }).content[0].text
      );
      expect(execPayload.status).toBe("success");
      expect(execPayload.executedTool).toBe("browser_run_markdown");
      expect(execPayload.output.success).toBe(true);
      expect(execPayload.output.action).toBe("markdown");
      expect(String(execPayload.output.result)).toContain("# Cloudflare Browser Run");
    });

    it("serves all 18 Browser Run tools via Pattern C Virtual Gateway (/api/mcp/g/browser-run)", async () => {
      const vgTools = getVirtualGatewayTools("browser-run");
      expect(vgTools).toHaveLength(18);
      expect(vgTools.map((t) => t.name)).toEqual([...BROWSER_RUN_TOOL_NAMES].sort());

      const getRes = await virtualGatewayGet(
        new Request("https://next.spike.land/api/mcp/g/browser-run"),
        { params: Promise.resolve({ gatewaySlug: "browser-run" }) }
      );
      expect(getRes.status).toBe(200);
      const getJson = (await getRes.json()) as {
        gatewaySlug: string;
        toolsCount: number;
        tools: string[];
      };
      expect(getJson.gatewaySlug).toBe("browser-run");
      expect(getJson.toolsCount).toBe(18);
      expect(getJson.tools).toContain("browser_run_screenshot");
      expect(getJson.tools).toContain("browser_run_crawl_start");

      const postRes = await virtualGatewayPost(
        new Request("https://next.spike.land/api/mcp/g/browser-run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 104,
            method: "tools/call",
            params: {
              name: "browser_run_links",
              arguments: {
                url: "https://developers.cloudflare.com/browser-run/",
                visibleLinksOnly: true,
              },
            },
          }),
        }),
        { params: Promise.resolve({ gatewaySlug: "browser-run" }) }
      );
      expect(postRes.status).toBe(200);
      const postJson = (await postRes.json()) as {
        result: { content: Array<{ text: string }>; isError: boolean };
      };
      expect(postJson.result.isError).toBe(false);
      const linksResult = JSON.parse(postJson.result.content[0].text);
      expect(linksResult.success).toBe(true);
      expect(Array.isArray(linksResult.result)).toBe(true);
    });

    it("supports Universal Gateway (discover_tools / run_tool) and MCP Registry lookup for cloudflare/browser-run-mcp", async () => {
      const discoverReq = new Request("https://next.spike.land/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 105,
          method: "tools/call",
          params: {
            name: "discover_tools",
            arguments: {
              query: "browser_run",
              category: "Browser Run",
              limit: 20,
              include_registry: false,
            },
          },
        }),
      });
      const discoverRes = await mcpPost(discoverReq);
      const discoverJson = (await discoverRes.json()) as {
        result: { content: Array<{ text: string }> };
      };
      const discoverData = JSON.parse(discoverJson.result.content[0].text);
      expect(discoverData.unlockedCount).toBe(10);
      expect(discoverData.matchedTools).toHaveLength(10);
      expect(discoverData.matchedTools[0].category).toBe("Browser Run");

      const runReq = new Request("https://next.spike.land/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1051,
          method: "tools/call",
          params: {
            name: "run_tool",
            arguments: {
              tool_name: "browser_run_links",
              arguments: { url: "https://developers.cloudflare.com/browser-run/" },
            },
          },
        }),
      });
      const runRes = await mcpPost(runReq);
      const runJson = (await runRes.json()) as {
        result: { content: Array<{ text: string }> };
      };
      const runData = JSON.parse(runJson.result.content[0].text);
      expect(runData.status).toBe("success");
      expect(runData.executedTool).toBe("browser_run_links");
      expect(runData.output.success).toBe(true);

      // Registry search for browser-run
      const regSearch = await dispatchJsonRpc(
        {
          jsonrpc: "2.0",
          id: 106,
          method: "tools/call",
          params: {
            name: "mcp_registry_search",
            arguments: { query: "browser-run", registry: "all" },
          },
        },
        {}
      );
      const regData = JSON.parse(
        (regSearch?.result as { content: Array<{ text: string }> }).content[0].text
      );
      expect(regData.servers.some((s: { id: string }) => s.id === "cloudflare/browser-run-mcp")).toBe(
        true
      );
    });

    it("exposes Browser Run tools in workers/easy-mcp-gateway", async () => {
      const configRes = await easyMcpGatewayWorker.fetch(
        new Request("https://mcp.spike.land/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 107,
            method: "tools/call",
            params: {
              name: "configure_active_categories",
              arguments: { enable_categories: ["Browser Run"] },
            },
          }),
        }),
        {}
      );
      const configJson = (await configRes.json()) as {
        result: { content: Array<{ text: string }> };
      };
      const disclosed = JSON.parse(configJson.result.content[0].text).disclosedSchemas;
      expect(disclosed).toHaveLength(18);

      const execRes = await easyMcpGatewayWorker.fetch(
        new Request("https://mcp.spike.land/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 108,
            method: "tools/call",
            params: {
              name: "execute_tool",
              arguments: {
                tool_name: "browser_run_snapshot",
                arguments: { url: "https://spike.land" },
              },
            },
          }),
        }),
        {}
      );
      const execJson = (await execRes.json()) as {
        result: { content: Array<{ text: string }> };
      };
      const snapOut = JSON.parse(execJson.result.content[0].text);
      expect(snapOut.success).toBe(true);
      expect(snapOut.action).toBe("snapshot");
    });
  });

  describe("5. Dedicated Browser Run MCP Worker (workers/browser-run-mcp) HTTP & JSON-RPC Integration Tests", () => {
    it("serves health diagnostics, OAuth 2.1 Protected Resource Metadata, and CORS preflight", async () => {
      const optRes = await browserRunWorker.fetch(
        new Request("https://spike-browser-run-mcp.zolika84.workers.dev/mcp", {
          method: "OPTIONS",
        })
      );
      expect(optRes.status).toBe(204);
      expect(optRes.headers.get("Access-Control-Allow-Origin")).toBe("*");

      const healthRes = await browserRunWorker.fetch(
        new Request("https://spike-browser-run-mcp.zolika84.workers.dev/health")
      );
      expect(healthRes.status).toBe(200);
      const health = (await healthRes.json()) as {
        name: string;
        toolsCount: number;
        quickActions: string[];
      };
      expect(health.name).toBe("spike-browser-run-mcp");
      expect(health.toolsCount).toBe(18);
      expect(health.quickActions).toHaveLength(9);

      const oauthRes = await browserRunWorker.fetch(
        new Request(
          "https://spike-browser-run-mcp.zolika84.workers.dev/.well-known/oauth-protected-resource"
        )
      );
      expect(oauthRes.status).toBe(200);
      const oauth = (await oauthRes.json()) as {
        client_id_metadata_document_supported: boolean;
        token_passthrough_prohibited: boolean;
      };
      expect(oauth.client_id_metadata_document_supported).toBe(true);
      expect(oauth.token_passthrough_prohibited).toBe(true);
    });

    it("handles MCP 2026-07-28 JSON-RPC 2.0 server/discover, tools/list, tools/call, batching, and SEP security checks", async () => {
      // 1. server/discover
      const discoverRes = await browserRunWorker.fetch(
        new Request("https://spike-browser-run-mcp.zolika84.workers.dev/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "server/discover",
            params: {},
          }),
        })
      );
      expect(discoverRes.status).toBe(200);
      const discoverJson = (await discoverRes.json()) as {
        result: {
          protocolVersion: string;
          browserRunCapabilities: { toolsCount: number; quickActions: string[] };
        };
      };
      expect(discoverJson.result.protocolVersion).toBe("2026-07-28");
      expect(discoverJson.result.browserRunCapabilities.toolsCount).toBe(18);

      // 2. tools/list
      const listRes = await browserRunWorker.fetch(
        new Request("https://spike-browser-run-mcp.zolika84.workers.dev/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 2,
            method: "tools/list",
            params: {},
          }),
        })
      );
      const listJson = (await listRes.json()) as {
        result: { tools: Array<{ name: string }> };
      };
      expect(listJson.result.tools).toHaveLength(18);

      // 3. tools/call for browser_run_accessibility_tree
      const callRes = await browserRunWorker.fetch(
        new Request("https://spike-browser-run-mcp.zolika84.workers.dev/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 3,
            method: "tools/call",
            params: {
              name: "browser_run_accessibility_tree",
              arguments: {
                url: "https://developers.cloudflare.com/browser-run/",
              },
            },
          }),
        })
      );
      const callJson = (await callRes.json()) as {
        result: { isError: boolean; content: Array<{ text: string }> };
      };
      expect(callJson.result.isError).toBe(false);
      const axPayload = JSON.parse(callJson.result.content[0].text);
      expect(axPayload.success).toBe(true);
      expect(axPayload.action).toBe("accessibilityTree");

      // 4. SEP-2243 HeaderMismatchError (-32020)
      const mismatchRes = await browserRunWorker.fetch(
        new Request("https://spike-browser-run-mcp.zolika84.workers.dev/mcp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Mcp-Method": "tools/list",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 4,
            method: "tools/call",
            params: { name: "browser_run_content", arguments: { url: "https://spike.land" } },
          }),
        })
      );
      expect(mismatchRes.status).toBe(400);
      const mismatchJson = (await mismatchRes.json()) as { error: { code: number } };
      expect(mismatchJson.error.code).toBe(-32020);

      // 5. Dual-Era initialize (2025-11-25) + SEP-2575 UnsupportedProtocolVersionError (-32022)
      const initRes = await browserRunWorker.fetch(
        new Request("https://spike-browser-run-mcp.zolika84.workers.dev/mcp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 50,
            method: "initialize",
            params: { protocolVersion: "2025-11-25" },
          }),
        })
      );
      expect(initRes.status).toBe(200);
      const initJson = (await initRes.json()) as { result: { protocolVersion: string } };
      expect(initJson.result.protocolVersion).toBe("2025-11-25");

      const oldVerRes = await browserRunWorker.fetch(
        new Request("https://spike-browser-run-mcp.zolika84.workers.dev/mcp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "MCP-Protocol-Version": "1999-01-01",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 5,
            method: "tools/list",
            params: {},
          }),
        })
      );
      expect(oldVerRes.status).toBe(400);
      const oldVerJson = (await oldVerRes.json()) as { error: { code: number } };
      expect(oldVerJson.error.code).toBe(-32022);
    });

    it("serves direct HTTP REST endpoints (/quick-action/:action, /crawl, /sessions/*) on the Worker", async () => {
      // POST /quick-action/json
      const qaRes = await browserRunWorker.fetch(
        new Request("https://spike-browser-run-mcp.zolika84.workers.dev/quick-action/json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: "https://developers.cloudflare.com/browser-run/",
            prompt: "Extract key features",
          }),
        })
      );
      expect(qaRes.status).toBe(200);
      const qaData = (await qaRes.json()) as { success: boolean; action: string };
      expect(qaData.success).toBe(true);
      expect(qaData.action).toBe("json");

      // POST /crawl -> GET /crawl/:id -> DELETE /crawl/:id
      const crawlStartRes = await browserRunWorker.fetch(
        new Request("https://spike-browser-run-mcp.zolika84.workers.dev/crawl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: "https://developers.cloudflare.com/browser-run/",
            limit: 2,
          }),
        })
      );
      expect(crawlStartRes.status).toBe(200);
      const crawlStartData = (await crawlStartRes.json()) as {
        success: boolean;
        jobId: string;
      };
      const jobId = crawlStartData.jobId;

      const crawlGetRes = await browserRunWorker.fetch(
        new Request(`https://spike-browser-run-mcp.zolika84.workers.dev/crawl/${jobId}`)
      );
      expect(crawlGetRes.status).toBe(200);

      const crawlDelRes = await browserRunWorker.fetch(
        new Request(`https://spike-browser-run-mcp.zolika84.workers.dev/crawl/${jobId}`, {
          method: "DELETE",
        })
      );
      expect(crawlDelRes.status).toBe(200);

      // POST /sessions/acquire -> GET /sessions/:id/live-view -> POST /sessions/:id/devtools -> POST /sessions/cdp -> DELETE /sessions/:id
      const sessAcqRes = await browserRunWorker.fetch(
        new Request("https://spike-browser-run-mcp.zolika84.workers.dev/sessions/acquire", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keepAlive: 60000, recording: true }),
        })
      );
      expect(sessAcqRes.status).toBe(200);
      const sessAcqData = (await sessAcqRes.json()) as {
        sessionId: string;
      };
      const sid = sessAcqData.sessionId;

      const liveRes = await browserRunWorker.fetch(
        new Request(
          `https://spike-browser-run-mcp.zolika84.workers.dev/sessions/${sid}/live-view?readonly=true`
        )
      );
      expect(liveRes.status).toBe(200);

      const dtRes = await browserRunWorker.fetch(
        new Request(`https://spike-browser-run-mcp.zolika84.workers.dev/sessions/${sid}/devtools`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "getVersion" }),
        })
      );
      expect(dtRes.status).toBe(200);

      const cdpRes = await browserRunWorker.fetch(
        new Request("https://spike-browser-run-mcp.zolika84.workers.dev/sessions/cdp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sid,
            method: "Browser.getVersion",
            keepSessionOpen: false,
          }),
        })
      );
      expect(cdpRes.status).toBe(200);

      const delSessRes = await browserRunWorker.fetch(
        new Request(`https://spike-browser-run-mcp.zolika84.workers.dev/sessions/${sid}`, {
          method: "DELETE",
        })
      );
      expect(delSessRes.status).toBe(200);
    });
  });
});
