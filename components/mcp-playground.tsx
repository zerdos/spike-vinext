"use client";

import { useState, useMemo, useEffect } from "react";
import { MCP_CATEGORIES, ToolCategory, ToolItem } from "@/lib/mcp-data";
import {
  Layers,
  CodeXml,
  Sparkles,
  FileText,
  TrendingUp,
  CreditCard,
  Gamepad2,
  Users,
  Globe,
  Terminal,
  Play,
  Search,
  Check,
  Copy,
  Clock,
  Zap,
  RotateCcw,
  Trash2,
  Code,
  FileJson,
  Shield,
  Key,
  Server,
  Plus,
  X,
  Lock,
  AlertCircle,
} from "lucide-react";
import {
  getClientBearerToken,
  setClientBearerToken,
  BEARER_TOKEN_CHANGED_EVENT,
} from "@/lib/auth/client-token";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  layers: Layers,
  "code-xml": CodeXml,
  "file-text": FileText,
  globe: Globe,
  server: Server,
  search: Search,
  terminal: Terminal,
};

const PARAM_PRESETS: Record<string, string> = {
  query: "postgres",
  category: "Platform Core",
  workspace_handle: "spk_hdl_v2...",
  domain_filter: "browser-run",
  enable_categories: '["Browser Run", "Code Mode", "Meeting Notes"]',
  disable_categories: "[]",
  tool_name: "browser_run_content",
  arguments: '{"url": "https://spike.land"}',
  result_cursor_handle: "spk_res_v2.7f6e5d4c",
  jsonpath_or_filter: "$.result",
  source: "https://mcp.linear.app/sse",
  namespace: "linear",
  transport: "auto",
  authSecretRef: "vault:LINEAR_API_KEY",
  code: "async () => {\n  const res = await tools.browser_run_content({ url: 'https://spike.land' });\n  return res;\n}",
  intent: "Render and inspect homepage using Browser Run",
  name: "spike_scraper",
  description: "Scrape and extract rendered DOM from spike.land",
  executionId: "exec_sample_9841",
  decision: "approved",
  reason: "Authorized production tool run",
  url: "https://spike.land",
  html: "<!DOCTYPE html><html><body><h1>Spike Land</h1></body></html>",
  q: "Claude 3.7 Sonnet MCP 2026",
  engine: "google_light",
  location: "Austin, TX",
  output: "json",
  mode: "compact",
  serverId: "modelcontextprotocol/server-postgres",
  clientType: "cursor",
  registry: "all",
  limit: "5",
  jobId: "crawl_sample_123",
  sessionId: "cf_sess_1f989210",
  method: "Page.navigate",
  params: '{"url": "https://spike.land"}',
  elements: '[{"selector": "h1"}]',
  prompt: "Extract the headline and feature list",
  screenshotOptions: '{"fullPage": true, "type": "png"}',
  pdfOptions: '{"format": "A4", "landscape": false}',
  viewport: '{"width": 1280, "height": 720}',
  gotoOptions: '{"waitUntil": "networkidle0", "timeout": 30000}',
  waitForSelector: '{"selector": "h1", "timeout": 5000}',
  operation: "version",
  readonly: "false",
  keep_alive: "60000",
  stealth: "true",
  adblock: "true",
  country: "US",
  closeAfter: "true",
  includeHistory: "true",
  includeLimits: "true",
  depth: "1",
  formats: '["markdown"]',
  render: "true",
  visibleLinksOnly: "false",
  excludeExternalLinks: "false",
  title: "Q4 Product Roadmap Sync",
  meetingDate: "2026-10-23",
  startTime: "14:00 UTC",
  participants: '["Alice", "Bob", "Zoltan"]',
  tags: '["roadmap", "architecture"]',
  transcript: "Alice: Let us review the Q4 release plan.\nBob: Sounds good, SQLite migrations are ready.",
  meetingId: "mtg_20261023_a1b2",
  executiveSummary: "Reviewed Q4 roadmap and agreed on SQLite migration timelines.",
  keyDecisions: '["Ship SQLite migrations in sprint 42", "Target 100% test coverage"]',
  takeaways: '["Zero cold-starts on edge workers"]',
  topics: '["Migrations", "Performance"]',
  questions: '[{"question": "Does KV fallback support FTS?", "askedBy": "Bob", "status": "open"}]',
  questionId: "q_1",
  actionItems: '[{"task": "Run benchmark tests", "owner": "Alice", "dueDate": "2026-10-25"}]',
  actionItemId: "act_1",
  dateFrom: "2026-10-01",
  dateTo: "2026-10-31",
  append: "false",
  includeTranscript: "true",
};

const POPULAR_TOOLS = [
  { name: "list_capability_categories", categoryId: "platform-core" },
  { name: "inspect_tool_schema", categoryId: "platform-core" },
  { name: "mount_mcp_server", categoryId: "platform-core" },
  { name: "codemode", categoryId: "code-mode" },
  { name: "create_meeting", categoryId: "meeting-notes" },
  { name: "browser_run_content", categoryId: "browser-run" },
  { name: "browser_run_screenshot", categoryId: "browser-run" },
  { name: "mcp_registry_search", categoryId: "mcp-registry" },
  { name: "serpapi_search", categoryId: "serpapi" },
];

export function McpPlayground() {
  const [openCategoryId, setOpenCategoryId] = useState<string>("platform-core");
  const [activeTool, setActiveTool] = useState<ToolItem>(MCP_CATEGORIES[0].tools[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewTab, setViewTab] = useState<string>("response");

  const getInitialParamsForTool = (tool: ToolItem): Record<string, string> => {
    const params: Record<string, string> = {};
    Object.keys(tool.parameters).forEach((paramKey) => {
      params[paramKey] =
        PARAM_PRESETS[paramKey] ??
        (paramKey === "category" ? tool.category : "default_value");
    });
    return params;
  };

  const [paramInputs, setParamInputs] = useState<Record<string, string>>(() =>
    getInitialParamsForTool(MCP_CATEGORIES[0].tools[0])
  );
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<Record<string, unknown> | null>(
    MCP_CATEGORIES[0].tools[0].mockResponse
  );
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [executionTime, setExecutionTime] = useState<number>(4.2);
  const [executionStatus, setExecutionStatus] = useState<string>("200 OK");
  const [bearerToken, setBearerToken] = useState<string>(() => getClientBearerToken() || "");

  useEffect(() => {
    const initial = getClientBearerToken();
    if (initial) {
      setBearerToken(initial);
    } else {
      // Try to load user's configured token from settings if authenticated
      fetch("/api/settings/tokens", { headers: { Accept: "application/json" } })
        .then((res) => (res.ok ? res.json() : null))
        .then((rawData: unknown) => {
          const data = rawData as { tokens?: Array<{ tokenValue: string }>; providerTokens?: Record<string, string> } | null;
          if (!data) return;
          const candidate =
            data.providerTokens?.SPIKE_API_KEY ||
            (data.tokens && data.tokens.length > 0 ? data.tokens[0].tokenValue : "");
          if (candidate) {
            setClientBearerToken(candidate);
            setBearerToken(candidate);
          }
        })
        .catch(() => {});
    }

    const handleTokenChange = (e: Event) => {
      const customEvent = e as CustomEvent<string | null>;
      setBearerToken(customEvent.detail || "");
    };

    window.addEventListener(BEARER_TOKEN_CHANGED_EVENT, handleTokenChange);
    return () => {
      window.removeEventListener(BEARER_TOKEN_CHANGED_EVENT, handleTokenChange);
    };
  }, []);

  // Runtime Mounting State (PRD Section 9)
  const [showMountPanel, setShowMountPanel] = useState(false);
  const [mountSource, setMountSource] = useState("https://mcp.linear.app/sse");
  const [mountNamespace, setMountNamespace] = useState("linear");
  const [mountTransport, setMountTransport] = useState<"auto" | "streamable-http" | "sse">("auto");
  const [mountAuthSecretRef, setMountAuthSecretRef] = useState("vault:LINEAR_API_KEY");
  const [isMounting, setIsMounting] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const [mountedServers, setMountedServers] = useState<
    Array<{
      namespace: string;
      source: string;
      toolCount: number;
      latencyMs: number;
      sampleTools: string[];
      status: string;
    }>
  >([]);
  const [totalTokensSavedByMounts, setTotalTokensSavedByMounts] = useState(0);

  const handleMountServer = async () => {
    setIsMounting(true);
    setMountError(null);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "MCP-Protocol-Version": "2026-07-28",
        "Mcp-Method": "tools/call",
        "Mcp-Name": "mount_mcp_server",
      };
      if (bearerToken) {
        headers["Authorization"] = `Bearer ${bearerToken}`;
      }

      const res = await fetch("/api/mcp", {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: `mount_${Date.now()}`,
          method: "tools/call",
          params: {
            name: "mount_mcp_server",
            arguments: {
              source: mountSource,
              namespace: mountNamespace,
              transport: mountTransport,
              authSecretRef: mountAuthSecretRef || undefined,
            },
          },
        }),
      });

      const data = (await res.json()) as {
        error?: { message?: string };
        result?: { content?: Array<{ text: string }>; status?: string; namespace?: string; toolCount?: number; sampleTools?: string[]; cliCommand?: string; error?: string };
      };
      if (data.error) {
        setMountError(data.error.message || String(data.error));
        return;
      }

      let resultObj = data.result;
      if (resultObj?.content?.[0]?.text) {
        try {
          resultObj = JSON.parse(resultObj.content[0].text);
        } catch {}
      }

      if (resultObj?.status === "mounted" && resultObj.namespace) {
        const count = resultObj.toolCount || 10;
        const ns = resultObj.namespace;
        setMountedServers((prev) => [
          ...prev.filter((s) => s.namespace !== ns),
          {
            namespace: ns,
            source: mountSource,
            toolCount: count,
            latencyMs: 38,
            sampleTools: resultObj.sampleTools || [],
            status: "healthy",
          },
        ]);
        setTotalTokensSavedByMounts((prev) => prev + count * 110);
        setShowMountPanel(false);
      } else if (resultObj?.status === "stdio_only") {
        setMountError(`Server supports local stdio only: ${resultObj.cliCommand}`);
      } else if (resultObj?.error) {
        setMountError(resultObj.error);
      }
    } catch (err) {
      setMountError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsMounting(false);
    }
  };

  const handleUnmountServer = async (namespace: string) => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "MCP-Protocol-Version": "2026-07-28",
      };
      if (bearerToken) headers["Authorization"] = `Bearer ${bearerToken}`;

      await fetch("/api/mcp", {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: `unmount_${Date.now()}`,
          method: "tools/call",
          params: {
            name: "unmount_mcp_server",
            arguments: { namespace },
          },
        }),
      });

      setMountedServers((prev) => prev.filter((s) => s.namespace !== namespace));
    } catch {}
  };

  const totalLiveToolsCount = useMemo(() => {
    return MCP_CATEGORIES.reduce((acc, cat) => acc + cat.tools.length, 0);
  }, []);

  const selectTool = (tool: ToolItem) => {
    setActiveTool(tool);
    const initialParams = getInitialParamsForTool(tool);
    setParamInputs(initialParams);
    setTerminalOutput(tool.mockResponse);
    setExecutionStatus("200 OK");
  };

  const handleResetParams = () => {
    const initialParams = getInitialParamsForTool(activeTool);
    setParamInputs(initialParams);
  };

  const handleClearOutput = () => {
    setTerminalOutput({
      status: "idle",
      message: "Terminal output cleared. Click 'Execute Tool' or press ⌘+Enter to invoke.",
    });
    setExecutionStatus("cleared");
  };

  const parsedArguments = useMemo(() => {
    const parsed: Record<string, unknown> = {};
    Object.entries(paramInputs).forEach(([key, val]) => {
      const paramDef = activeTool.parameters[key];
      if (paramDef?.type === "number") {
        parsed[key] = Number(val);
      } else if (paramDef?.type === "boolean") {
        parsed[key] = val === "true" || val === "1";
      } else if (paramDef?.type === "object" || paramDef?.type === "array") {
        try {
          parsed[key] = JSON.parse(val);
        } catch {
          parsed[key] = val;
        }
      } else {
        parsed[key] = val;
      }
    });
    return parsed;
  }, [paramInputs, activeTool]);

  const jsonRpcPayload = useMemo(() => {
    return {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: activeTool.name,
        arguments: parsedArguments,
        _meta: {
          "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        },
      },
    };
  }, [activeTool.name, parsedArguments]);

  const curlCommand = useMemo(() => {
    const payloadStr = JSON.stringify(jsonRpcPayload).replace(/'/g, "'\\''");
    const authHeaderLine = bearerToken
      ? ` \\\n  -H "Authorization: Bearer ${bearerToken}"`
      : ' \\\n  -H "Authorization: Bearer YOUR_API_KEY"';
    return `curl -X POST https://spike.land/api/mcp${authHeaderLine} \\\n  -H "Content-Type: application/json" \\\n  -H "MCP-Protocol-Version: 2026-07-28" \\\n  -H "Mcp-Method: tools/call" \\\n  -H "Mcp-Name: ${activeTool.name}" \\\n  -d '${payloadStr}'`;
  }, [jsonRpcPayload, activeTool.name, bearerToken]);

  const handleRunTool = async () => {
    setIsRunning(true);
    setViewTab("response");
    const startTime = performance.now();
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "MCP-Protocol-Version": "2026-07-28",
        "Mcp-Method": "tools/call",
        "Mcp-Name": activeTool.name,
      };
      if (bearerToken) {
        headers["Authorization"] = `Bearer ${bearerToken}`;
      }

      const response = await fetch("/api/mcp", {
        method: "POST",
        headers,
        body: JSON.stringify(jsonRpcPayload),
      });

      const execTime = Number((performance.now() - startTime).toFixed(1));
      setExecutionTime(execTime);

      if (response.ok) {
        setExecutionStatus("200 OK");
        const json = (await response.json()) as {
          result?: {
            content?: Array<{
              type?: string;
              text: string;
            }>;
          };
          error?: unknown;
          [key: string]: unknown;
        };
        if (json.result && json.result.content && json.result.content.length > 0) {
          const contentItems = json.result.content;
          const lastItem = contentItems[contentItems.length - 1];
          try {
            const parsed = JSON.parse(lastItem.text);
            setTerminalOutput({
              ...(typeof parsed === "object" && parsed !== null ? parsed : { output: parsed }),
              _gatewayNotice: contentItems.length > 1 ? contentItems[0].text : undefined,
              _latencyMs: execTime,
            });
          } catch {
            setTerminalOutput({
              output: lastItem.text,
              _gatewayNotice: contentItems.length > 1 ? contentItems[0].text : undefined,
              _latencyMs: execTime,
            });
          }
        } else if (json.error) {
          setTerminalOutput({ error: json.error, _latencyMs: execTime });
        } else {
          setTerminalOutput(json);
        }
      } else {
        setExecutionStatus(`HTTP ${response.status}`);
        throw new Error(`HTTP ${response.status}`);
      }
    } catch {
      const execTime = Number((performance.now() - startTime).toFixed(1));
      setExecutionTime(execTime > 0 ? execTime : 3.8);
      setTerminalOutput({
        ...activeTool.mockResponse,
        executedAt: new Date().toISOString(),
        requestParams: parsedArguments,
        latencyMs: execTime > 0 ? execTime : 3.8,
        mode: "synthetic_demo_fallback",
        _syntheticNotice: "Offline / preview fallback: synthetic demonstration response",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleKeyDownInputs = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleRunTool();
    }
  };

  const copyActiveContent = async () => {
    try {
      let textToCopy = "";
      if (viewTab === "response") {
        textToCopy = JSON.stringify(terminalOutput, null, 2);
      } else if (viewTab === "request") {
        textToCopy = JSON.stringify(jsonRpcPayload, null, 2);
      } else {
        textToCopy = curlCommand;
      }
      await navigator.clipboard.writeText(textToCopy);
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    } catch {
      // fallback
    }
  };

  const filteredCategories: ToolCategory[] = MCP_CATEGORIES.map((cat) => {
    if (!searchQuery.trim()) return cat;
    const q = searchQuery.toLowerCase();
    const matchingTools = cat.tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        cat.name.toLowerCase().includes(q)
    );
    return { ...cat, tools: matchingTools };
  }).filter((cat) => !searchQuery.trim() || cat.tools.length > 0);

  return (
    <section
      id="playground"
      className="scroll-mt-16 py-16 sm:py-24 border-b-2 border-[#111315] bg-background"
    >
      <div className="mx-auto max-w-7xl px-4">
        {/* Section Header: Heading leads first, badge & quick pick buttons below */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 pb-6 border-b border-[#111315]">
          <div className="space-y-3 max-w-2xl">
            <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-foreground leading-[1.02]">
              Interactive Playground
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed max-w-[65ch]">
              Try any tool right here in your browser. Pick a tool from the catalog, tweak its inputs, and run it live to see how it responds.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <Badge variant="ink">
                <Terminal className="w-3.5 h-3.5" />
                Live MCP Console
              </Badge>
              <Badge variant="outline" className="font-mono">
                {totalLiveToolsCount} Tools Ready to Try
              </Badge>
              {bearerToken ? (
                <Badge variant="emerald" className="font-mono text-xs flex items-center gap-1">
                  <Shield className="w-3 h-3 text-[#0D7A5F]" />
                  Bearer Protected
                </Badge>
              ) : (
                <a href="/settings" className="hover:underline">
                  <Badge variant="secondary" className="font-mono text-xs flex items-center gap-1 cursor-pointer">
                    <Key className="w-3 h-3 text-muted-foreground" />
                    Configure Bearer in Settings
                  </Badge>
                </a>
              )}
            </div>
          </div>

          {/* Quick Tool Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground mr-1">
              Quick Pick:
            </span>
            {POPULAR_TOOLS.map((item) => {
              const isCurrent = activeTool.name === item.name;
              return (
                <Button
                  key={item.name}
                  type="button"
                  size="sm"
                  variant={isCurrent ? "default" : "outline"}
                  onClick={() => {
                    const foundCat = MCP_CATEGORIES.find((c) => c.id === item.categoryId);
                    const foundTool = foundCat?.tools.find((t) => t.name === item.name);
                    if (foundCat && foundTool) {
                      setOpenCategoryId(foundCat.id);
                      selectTool(foundTool);
                    }
                  }}
                  className="font-mono text-xs h-8 px-2.5"
                >
                  {item.name}
                </Button>
              );
            })}
          </div>
        </div>

        {/* 2-Column Playground Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (4 cols): Category & Tool Browser Card */}
          <Card className="lg:col-span-4 min-w-0 border-2 border-[#111315] overflow-hidden">
            <CardHeader className="p-4 border-b border-[#111315] bg-secondary/60 space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">
                  Categories &amp; Tools
                </CardTitle>
                <Badge variant="cobalt" className="font-mono text-[11px]">
                  {totalLiveToolsCount} live tools
                </Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="tool-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tools or categories..."
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Mount Custom Server Trigger & Form (PRD Section 9.1) */}
              <Button
                type="button"
                variant={showMountPanel ? "default" : "outline"}
                size="sm"
                onClick={() => setShowMountPanel(!showMountPanel)}
                className="w-full text-xs font-mono h-8 flex items-center justify-center gap-1.5 border-dashed"
              >
                <Server className="w-3.5 h-3.5" />
                <span>{showMountPanel ? "Close Mount Panel" : "+ Mount Custom Server (Runtime)"}</span>
              </Button>

              {showMountPanel && (
                <div className="p-3 bg-secondary/80 rounded-md border border-[#111315] space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between pb-1 border-b border-[#111315]">
                    <span className="font-bold flex items-center gap-1.5 text-foreground">
                      <Server className="w-3.5 h-3.5 text-primary" />
                      Mount MCP Server
                    </span>
                    <Badge variant="cobalt" className="text-[10px]">
                      &lt;100 Tokens
                    </Badge>
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold">Source URL or Registry ID</Label>
                    <Input
                      value={mountSource}
                      onChange={(e) => setMountSource(e.target.value)}
                      placeholder="https://mcp.linear.app/sse or glama/fetch"
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] font-semibold">Namespace</Label>
                      <Input
                        value={mountNamespace}
                        onChange={(e) => setMountNamespace(e.target.value)}
                        placeholder="e.g. pg, linear"
                        className="h-8 text-xs font-mono mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold">Prefix Preview</Label>
                      <div className="h-8 mt-1 flex items-center px-2 bg-background rounded border text-[11px] font-bold text-primary">
                        {mountNamespace ? `${mountNamespace}.*` : "ns.*"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3 text-muted-foreground" />
                      Vault Secret Ref (Optional)
                    </Label>
                    <Input
                      value={mountAuthSecretRef}
                      onChange={(e) => setMountAuthSecretRef(e.target.value)}
                      placeholder="vault:YOUR_API_KEY"
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>

                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-[11px] text-emerald-800 dark:text-emerald-300">
                    Intercepted tools cached in KV. 0 schemas in initial context.
                  </div>

                  {mountError && (
                    <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-[11px] text-red-600 flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{mountError}</span>
                    </div>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    disabled={isMounting || !mountSource || !mountNamespace}
                    onClick={handleMountServer}
                    className="w-full text-xs font-mono h-8"
                  >
                    {isMounting ? "Mounting & Intercepting..." : "Mount Server to Session"}
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-3">
              {/* Session Inspector Sidebar (PRD Section 9.2) */}
              {mountedServers.length > 0 && (
                <div className="mb-3 p-3 bg-card rounded-md border-2 border-primary/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold font-mono">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Mounted Servers ({mountedServers.length})
                    </span>
                    <Badge variant="emerald" className="text-[10px]">
                      Saved {totalTokensSavedByMounts} tokens/turn
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    {mountedServers.map((s) => (
                      <div
                        key={s.namespace}
                        className="flex items-center justify-between p-2 bg-secondary/60 rounded border text-xs font-mono"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Badge variant="ink" className="text-[10px] px-1.5">
                            {s.namespace}.*
                          </Badge>
                          <span className="text-[11px] text-muted-foreground truncate">
                            {s.toolCount} tools • {s.latencyMs}ms
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnmountServer(s.namespace)}
                          className="h-6 px-1.5 text-[10px] text-destructive hover:bg-destructive/10"
                        >
                          Unmount
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <ScrollArea className="max-h-[560px] pr-1">
                {filteredCategories.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    No tools match &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : (
                  <Accordion
                    type="single"
                    value={openCategoryId}
                    onValueChange={setOpenCategoryId}
                  >
                    {filteredCategories.map((cat) => {
                      const Icon = CATEGORY_ICONS[cat.icon] || Layers;
                      const forceOpen = searchQuery.trim().length > 0;

                      return (
                        <AccordionItem
                          key={cat.id}
                          value={cat.id}
                          forceOpen={forceOpen}
                        >
                          <AccordionTrigger>
                            <span className="flex items-center gap-2 min-w-0 flex-1">
                              <Icon className="h-4 w-4 text-primary shrink-0" />
                              <span className="truncate font-semibold">{cat.name}</span>
                            </span>
                            <Badge
                              variant="secondary"
                              className="font-mono text-[10px] px-2 py-0 shrink-0"
                            >
                              {cat.tools.length} {cat.tools.length === 1 ? "tool" : "tools"}
                            </Badge>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-1">
                              {cat.tools.map((tool) => {
                                const isSelected = activeTool.name === tool.name;
                                return (
                                  <Button
                                    key={tool.name}
                                    type="button"
                                    variant={isSelected ? "ink" : "ghost"}
                                    size="sm"
                                    onClick={() => selectTool(tool)}
                                    className="w-full justify-between font-mono text-xs h-8 px-2.5"
                                  >
                                    <span className="truncate">{tool.name}</span>
                                    {isSelected && (
                                      <Zap className="w-3 h-3 text-primary shrink-0 ml-1" />
                                    )}
                                  </Button>
                                );
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right Column (8 cols): Dispatch Terminal Card */}
          <Card className="lg:col-span-8 min-w-0 border-2 border-[#111315] overflow-hidden">
            {/* Terminal Top Rail: Tabular Swiss Instrument Controls (no decorative traffic-light dots) */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#111315] text-[#F5F4F0] border-b border-[#111315]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="inline-flex items-center border border-[#343942] rounded-sm overflow-hidden shrink-0" role="group" aria-label="Terminal actions">
                  <button
                    type="button"
                    onClick={handleClearOutput}
                    title="Clear terminal output"
                    aria-label="Clear output"
                    className="px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider bg-[#1B1E23] text-[#F5F4F0] hover:bg-primary hover:text-white border-r border-[#343942] transition-colors cursor-pointer"
                  >
                    CLR
                  </button>
                  <button
                    type="button"
                    onClick={handleResetParams}
                    title="Reset parameters to defaults"
                    aria-label="Reset parameters"
                    className="px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider bg-[#1B1E23] text-[#F5F4F0] hover:bg-[#0047BB] hover:text-white border-r border-[#343942] transition-colors cursor-pointer"
                  >
                    RST
                  </button>
                  <button
                    type="button"
                    onClick={handleRunTool}
                    title="Quick run (Cmd+Enter)"
                    aria-label="Quick run tool"
                    className="px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider bg-[#0D7A5F] text-white hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    RUN
                  </button>
                </div>
                <div className="text-xs text-[#B8BDC7] font-mono flex items-center gap-1.5 truncate">
                  <span className="truncate">spike.land MCP Gateway</span>
                  <span>/</span>
                  <span className="text-[#F5F4F0] font-semibold truncate">{activeTool.category}</span>
                </div>
              </div>

              <Badge variant="emerald" className="hidden sm:inline-flex font-mono text-[11px] shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-dispatch-pulse" />
                Edge Isolate Active
              </Badge>
            </div>

            {/* SEP-2243 Transport Headers & SEP-2567 Handle Telemetry Strip */}
            <div className="px-4 py-2 bg-[#181B20] border-b border-[#111315] flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-[#B8BDC7]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[#34D399] font-semibold">SEP-2243:</span>
                <span className="bg-[#111315] px-1.5 py-0.5 rounded border border-[#2E323B] text-[#F5F4F0]">
                  MCP-Protocol-Version: 2026-07-28
                </span>
                <span className="bg-[#111315] px-1.5 py-0.5 rounded border border-[#2E323B] text-[#93C5FD]">
                  Mcp-Name: {activeTool.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-[#B8BDC7]">SEP-2567 Handle:</span>
                <span className="text-[#F5F4F0] font-semibold">spk_hdl_v2...3c2d1e0f</span>
              </div>
            </div>

            {/* Tool Detail & Parameters (with authored mechanical split-flap reveal on tool change) */}
            <CardHeader
              key={activeTool.name}
              className="p-5 bg-card border-b border-[#111315] space-y-4 animate-dispatch-flap"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg font-mono text-foreground">
                      {activeTool.name}
                    </CardTitle>
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {activeTool.category}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs sm:text-sm max-w-[65ch]">
                    {activeTool.description}
                  </CardDescription>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetParams}
                    title="Reset arguments to default values"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handleRunTool}
                    disabled={isRunning}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {isRunning ? "Executing..." : "Execute Tool"}
                  </Button>
                </div>
              </div>

              {/* Parameters Editor */}
              {Object.keys(activeTool.parameters).length > 0 ? (
                 <div className="bg-secondary/60 rounded-lg p-4 border border-[#111315] space-y-3">
                   <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-semibold text-foreground">
                     <span>Inputs &amp; Options</span>
                     <span className="text-muted-foreground font-mono font-normal">
                       Press ⌘+Enter to execute
                     </span>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     {Object.entries(activeTool.parameters).map(([key, schema]) => (
                       <div key={key} className="space-y-1.5">
                         <Label className="block font-mono text-xs">
                           {key}{" "}
                           {schema.required && <span className="text-primary">*</span>}
                           <span className="text-muted-foreground text-[10px] ml-1">
                             ({schema.type})
                           </span>
                         </Label>
                         <Input
                           type="text"
                           value={paramInputs[key] ?? ""}
                           onKeyDown={handleKeyDownInputs}
                           onChange={(e) =>
                             setParamInputs((prev) => ({
                               ...prev,
                               [key]: e.target.value,
                             }))
                           }
                           placeholder={schema.description}
                           className="h-9 font-mono text-xs"
                         />
                       </div>
                     ))}
                   </div>
                 </div>
               ) : (
                 <div className="bg-secondary/50 rounded-lg px-3.5 py-2.5 border border-[#C8C5BC] text-xs text-muted-foreground font-mono">
                   No inputs needed for this tool. Ready to run.
                 </div>
               )}
             </CardHeader>

             {/* View Tabs & Output Console */}
             <CardContent className="p-5 bg-[#111315] text-[#F5F4F0]">
               <Tabs value={viewTab} onValueChange={setViewTab}>
                 <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#2E323B]">
                   <TabsList className="flex-wrap h-auto bg-[#1B1E23] border-[#343942]">
                     <TabsTrigger
                       value="response"
                       className="font-mono text-xs text-[#B8BDC7] data-[state=active]:bg-primary data-[state=active]:text-white"
                     >
                       <FileJson className="w-3.5 h-3.5" />
                       Result (JSON)
                     </TabsTrigger>
                     <TabsTrigger
                       value="request"
                       className="font-mono text-xs text-[#B8BDC7] data-[state=active]:bg-primary data-[state=active]:text-white"
                     >
                       <Code className="w-3.5 h-3.5" />
                       Raw Request
                     </TabsTrigger>
                     <TabsTrigger
                       value="curl"
                       className="font-mono text-xs text-[#B8BDC7] data-[state=active]:bg-primary data-[state=active]:text-white"
                     >
                       <Terminal className="w-3.5 h-3.5" />
                       cURL
                     </TabsTrigger>
                   </TabsList>

                  <div className="flex items-center gap-2.5">
                    {viewTab === "response" && (
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-[#34D399] font-semibold">
                          {executionStatus}
                        </span>
                        <span className="text-[#6B7280]">•</span>
                        <span className="flex items-center gap-1 text-[#F5F4F0]">
                          <Clock className="w-3 h-3 text-primary" />
                          {executionTime}ms
                        </span>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      onClick={handleClearOutput}
                      title="Clear output"
                      aria-label="Clear output"
                      className="h-7 w-7"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={copyActiveContent}
                      className="h-7 px-2.5 text-xs font-mono"
                    >
                      {copiedResponse ? (
                        <Check className="w-3 h-3 text-[#0D7A5F]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedResponse ? "Copied" : "Copy"}</span>
                    </Button>
                  </div>
                </div>

                <TabsContent value="response">
                  <ScrollArea className="rounded-lg bg-[#181B20] border border-[#343942] p-4 max-h-[340px]">
                    <pre className="text-xs font-mono text-[#F5F4F0] leading-relaxed">
                      <code>{JSON.stringify(terminalOutput, null, 2)}</code>
                    </pre>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="request">
                  <ScrollArea className="rounded-lg bg-[#181B20] border border-[#343942] p-4 max-h-[340px]">
                    <pre className="text-xs font-mono text-[#93C5FD] leading-relaxed">
                      <code>{JSON.stringify(jsonRpcPayload, null, 2)}</code>
                    </pre>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="curl">
                  <ScrollArea className="rounded-lg bg-[#181B20] border border-[#343942] p-4 max-h-[340px]">
                    <pre className="text-xs font-mono text-[#6EE7B7] leading-relaxed">
                      <code>{curlCommand}</code>
                    </pre>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
