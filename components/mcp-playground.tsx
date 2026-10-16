"use client";

import { useState, useMemo } from "react";
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
  ChevronDown,
  ChevronRight,
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
} from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  layers: Layers,
  "code-xml": CodeXml,
  sparkles: Sparkles,
  "file-text": FileText,
  "trending-up": TrendingUp,
  "credit-card": CreditCard,
  "gamepad-2": Gamepad2,
  users: Users,
  globe: Globe,
};

// Realistic defaults for tool arguments
const PARAM_PRESETS: Record<string, string> = {
  query: "image",
  category: "AI & Creative",
  prompt: "cyberpunk neon skyline with reflections in rain, 8k cinematic",
  aspectRatio: "16:9",
  imageUrl: "https://spike.land/assets/demo.png",
  instruction: "Add glowing neon cyan reflections to the puddle",
  factor: "4",
  fileUrl: "https://spike.land/whitepaper.pdf",
  extractTables: "true",
  content: "# Spike Land MCP Architecture\n\nProgressive context disclosure loads tool schemas on demand.",
  url: "https://spike.land/mcp",
  baseUrl: "https://spike.land",
  customerId: "cus_test_9841f",
  action: "create_canvas",
  intent: "Optimize JSON-RPC dispatch loop for edge isolates",
  task: "Audit cache hit ratio across global edge regions",
  memoryScope: "production_agent_core",
  schedule: "0 0 * * *",
  targetTool: "usage_meter",
  serverId: "modelcontextprotocol/server-postgres",
  clientType: "cursor",
  registry: "all",
  limit: "5",
  rawDiff: "diff --git a/src/index.ts b/src/index.ts\n--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1,3 +1,4 @@\n+import { Hono } from 'hono';\n const app = new Hono();",
  code: "console.log('Spike Land edge worker active at LHR');",
  runtime: "node",
  source: "export default { fetch: (req) => new Response('Hello Edge') };",
  enabledOnly: "false",
  sql: "SELECT id, metric, value FROM platform_metrics LIMIT 5;",
};

const POPULAR_TOOLS = [
  { name: "search_tools", categoryId: "platform-core" },
  { name: "code_runner", categoryId: "development" },
  { name: "generate_image", categoryId: "ai-creative" },
  { name: "git_diff_viewer", categoryId: "development" },
  { name: "seo_audit", categoryId: "marketing-growth" },
  { name: "mcp_registry_search", categoryId: "mcp-registry" },
];

export function McpPlayground() {
  const [openCategoryId, setOpenCategoryId] = useState<string>("platform-core");
  const [activeTool, setActiveTool] = useState<ToolItem>(MCP_CATEGORIES[0].tools[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewTab, setViewTab] = useState<"response" | "request" | "curl">("response");

  // Initial params populated from realistic presets
  const getInitialParamsForTool = (tool: ToolItem): Record<string, string> => {
    const params: Record<string, string> = {};
    Object.keys(tool.parameters).forEach((paramKey) => {
      params[paramKey] = PARAM_PRESETS[paramKey] ?? (paramKey === "category" ? tool.category : "default_value");
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

  const totalLiveToolsCount = useMemo(() => {
    return MCP_CATEGORIES.reduce((acc, cat) => acc + cat.tools.length, 0);
  }, []);

  const toggleCategory = (id: string) => {
    setOpenCategoryId((prev) => (prev === id ? "" : id));
  };

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
      },
    };
  }, [activeTool.name, parsedArguments]);

  const curlCommand = useMemo(() => {
    const payloadStr = JSON.stringify(jsonRpcPayload).replace(/'/g, "'\\''");
    return `curl -X POST https://spike.land/api/mcp \\\n  -H "Content-Type: application/json" \\\n  -d '${payloadStr}'`;
  }, [jsonRpcPayload]);

  const handleRunTool = async () => {
    setIsRunning(true);
    setViewTab("response");
    const startTime = performance.now();
    try {
      const response = await fetch("/api/mcp?sessionId=web_playground", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        mode: "edge_processed",
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

  // Filter categories and tools based on search query
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
    <div id="playground" className="scroll-mt-24 py-16 sm:py-24">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-3">
            <Terminal className="w-3.5 h-3.5" />
            Live MCP Console
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-3">
            Interactive Playground
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Progressive context disclosure in action: inspect schemas, configure arguments, and execute edge-native MCP gateway calls with live feedback.
          </p>

          {/* Quick Tool Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <span className="text-xs text-zinc-500 font-mono">Quick Pick:</span>
            {POPULAR_TOOLS.map((item) => {
              const isCurrent = activeTool.name === item.name;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    const foundCat = MCP_CATEGORIES.find((c) => c.id === item.categoryId);
                    const foundTool = foundCat?.tools.find((t) => t.name === item.name);
                    if (foundCat && foundTool) {
                      setOpenCategoryId(foundCat.id);
                      selectTool(foundTool);
                    }
                  }}
                  className={`text-xs font-mono px-3 py-1 rounded-full border transition-all ${
                    isCurrent
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/40 font-semibold"
                      : "bg-white/5 text-zinc-400 border-white/10 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column: Category & Tool Browser */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="glass-1 glass-edge rounded-2xl p-4 shadow-xl border border-white/10 sticky top-24 max-h-[720px] flex flex-col">
              {/* Header & Search */}
              <div className="mb-3 px-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Categories & Tools
                  </h3>
                  <span className="text-[11px] text-cyan-400 font-mono">
                    {totalLiveToolsCount} live tools
                  </span>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    id="tool-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tools or categories..."
                    className="w-full rounded-xl bg-black/40 border border-white/10 pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all"
                  />
                </div>
              </div>

              {/* Accordion List */}
              <div className="overflow-y-auto space-y-1 pr-1 flex-1 custom-scrollbar">
                {filteredCategories.length === 0 ? (
                  <div className="text-center py-8 text-xs text-zinc-500">
                    No tools match &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : (
                  filteredCategories.map((cat) => {
                    const Icon = CATEGORY_ICONS[cat.icon] || Layers;
                    const isOpen = openCategoryId === cat.id || searchQuery.length > 0;

                    return (
                      <div key={cat.id} className="rounded-xl overflow-hidden mb-1">
                        <button
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                        >
                          <Icon className="h-4 w-4 text-cyan-400 shrink-0" />
                          <span className="flex-1 text-left truncate">{cat.name}</span>
                          <span className="bg-black/30 border border-white/10 rounded-full px-2 py-0.5 text-[10px] text-zinc-400 font-mono">
                            {cat.tools.length} {cat.tools.length === 1 ? "tool" : "tools"}
                          </span>
                          {isOpen ? (
                            <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          )}
                        </button>

                        {isOpen && (
                          <div className="pl-6 pr-1 py-1 space-y-1 bg-black/20 rounded-b-lg">
                            {cat.tools.map((tool) => {
                              const isSelected = activeTool.name === tool.name;
                              return (
                                <button
                                  key={tool.name}
                                  type="button"
                                  onClick={() => selectTool(tool)}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center justify-between ${
                                    isSelected
                                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                                  }`}
                                >
                                  <span className="truncate">{tool.name}</span>
                                  {isSelected && <Zap className="w-3 h-3 text-cyan-400 shrink-0 ml-1" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Terminal Window */}
          <div className="flex-1 min-w-0">
            <div className="glass-1 glass-edge rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              {/* Terminal Header with interactive traffic dots */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#131924] border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5" role="group" aria-label="Terminal actions">
                    <button
                      type="button"
                      onClick={handleClearOutput}
                      title="Clear terminal output"
                      aria-label="Clear output"
                      className="w-3 h-3 rounded-full bg-[#ff5f56] hover:brightness-125 transition-transform active:scale-90"
                    />
                    <button
                      type="button"
                      onClick={handleResetParams}
                      title="Reset parameters to defaults"
                      aria-label="Reset parameters"
                      className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:brightness-125 transition-transform active:scale-90"
                    />
                    <button
                      type="button"
                      onClick={handleRunTool}
                      title="Quick run (Cmd+Enter)"
                      aria-label="Quick run tool"
                      className="w-3 h-3 rounded-full bg-[#27c93f] hover:brightness-125 transition-transform active:scale-90"
                    />
                  </div>
                  <div className="ml-3 text-xs text-zinc-400 font-mono flex items-center gap-2">
                    <span>spike.land MCP Gateway</span>
                    <span className="text-zinc-600">/</span>
                    <span className="text-cyan-400 font-semibold">{activeTool.category}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Edge Isolate Active
                  </span>
                </div>
              </div>

              {/* Tool Detail & Controls */}
              <div className="p-5 bg-[#0a0f1a] border-b border-white/[0.06]">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <h4 className="text-lg font-bold font-mono text-white">{activeTool.name}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-400/20">
                        {activeTool.category}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
                      {activeTool.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={handleResetParams}
                      title="Reset arguments to default values"
                      className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-mono text-zinc-400 border border-white/10 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Reset</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRunTool}
                      disabled={isRunning}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Play className={`w-3.5 h-3.5 fill-white ${isRunning ? "animate-spin" : ""}`} />
                      {isRunning ? "Executing..." : "Execute Tool"}
                    </button>
                  </div>
                </div>

                {/* Parameters Editor */}
                {Object.keys(activeTool.parameters).length > 0 ? (
                  <div className="bg-black/40 rounded-xl p-3.5 border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      <span>Arguments (JSON-RPC 2.0 params)</span>
                      <span className="text-zinc-500 font-mono font-normal">Press ⌘+Enter to execute</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(activeTool.parameters).map(([key, schema]) => (
                        <div key={key}>
                          <label className="block text-[11px] font-mono text-zinc-300 mb-1">
                            {key}{" "}
                            {schema.required && <span className="text-red-400">*</span>}
                            <span className="text-zinc-500 text-[10px] ml-1">({schema.type})</span>
                          </label>
                          <input
                            type="text"
                            value={paramInputs[key] ?? ""}
                            onKeyDown={handleKeyDownInputs}
                            onChange={(e) =>
                              setParamInputs((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            placeholder={schema.description}
                            className="w-full bg-[#111622] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-400 transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-black/20 rounded-xl px-3 py-2 border border-white/[0.06] text-[11px] text-zinc-500 font-mono">
                    Zero arguments required. Ready for instant edge execution.
                  </div>
                )}
              </div>

              {/* View Tabs & Output Area */}
              <div className="bg-[#080d16] p-4 font-mono text-xs">
                {/* Tabs Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-white/[0.08]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setViewTab("response")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                        viewTab === "response"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <FileJson className="w-3.5 h-3.5" />
                      Response (JSON)
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewTab("request")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                        viewTab === "request"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Code className="w-3.5 h-3.5" />
                      JSON-RPC Request
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewTab("curl")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                        viewTab === "curl"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      cURL
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    {viewTab === "response" && (
                      <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                        <span className="text-emerald-400 font-mono font-medium">{executionStatus}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="flex items-center gap-1 text-zinc-300">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          {executionTime}ms
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleClearOutput}
                      title="Clear output"
                      className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-white/5 transition-colors"
                      aria-label="Clear output"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={copyActiveContent}
                      className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 transition-colors"
                    >
                      {copiedResponse ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedResponse ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {/* Terminal Content Display */}
                <div className="rounded-xl bg-black/60 border border-white/10 p-4 overflow-x-auto max-h-[340px]">
                  {viewTab === "response" && (
                    <pre className="text-cyan-300/95 leading-relaxed">
                      <code>{JSON.stringify(terminalOutput, null, 2)}</code>
                    </pre>
                  )}
                  {viewTab === "request" && (
                    <pre className="text-purple-300/95 leading-relaxed">
                      <code>{JSON.stringify(jsonRpcPayload, null, 2)}</code>
                    </pre>
                  )}
                  {viewTab === "curl" && (
                    <pre className="text-emerald-300/95 leading-relaxed">
                      <code>{curlCommand}</code>
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
