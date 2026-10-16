"use client";

import { useState } from "react";
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

export function McpPlayground() {
  const [openCategoryId, setOpenCategoryId] = useState<string>("platform-core");
  const [activeTool, setActiveTool] = useState<ToolItem>(MCP_CATEGORIES[0].tools[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [paramInputs, setParamInputs] = useState<Record<string, string>>({
    query: "image",
  });
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<Record<string, unknown>>(
    MCP_CATEGORIES[0].tools[0].mockResponse
  );
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [executionTime, setExecutionTime] = useState<number>(4.2);

  const toggleCategory = (id: string) => {
    setOpenCategoryId((prev) => (prev === id ? "" : id));
  };

  const selectTool = (tool: ToolItem) => {
    setActiveTool(tool);
    // Populate default parameter inputs
    const initialParams: Record<string, string> = {};
    Object.keys(tool.parameters).forEach((paramKey) => {
      if (paramKey === "query") initialParams[paramKey] = "image";
      else if (paramKey === "category") initialParams[paramKey] = tool.category;
      else if (paramKey === "prompt") initialParams[paramKey] = "cyberpunk city in twilight";
      else if (paramKey === "code") initialParams[paramKey] = "console.log('Worker active');";
      else initialParams[paramKey] = "demo_value";
    });
    setParamInputs(initialParams);
    setTerminalOutput(tool.mockResponse);
  };

  const handleRunTool = async () => {
    setIsRunning(true);
    const startTime = performance.now();
    try {
      const parsedArguments: Record<string, unknown> = {};
      Object.entries(paramInputs).forEach(([key, val]) => {
        const paramDef = activeTool.parameters[key];
        if (paramDef?.type === "number") {
          parsedArguments[key] = Number(val);
        } else if (paramDef?.type === "boolean") {
          parsedArguments[key] = val === "true" || val === "1";
        } else if (paramDef?.type === "object" || paramDef?.type === "array") {
          try {
            parsedArguments[key] = JSON.parse(val);
          } catch {
            parsedArguments[key] = val;
          }
        } else {
          parsedArguments[key] = val;
        }
      });

      const response = await fetch("/api/mcp?sessionId=web_playground", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: activeTool.name,
            arguments: parsedArguments,
          },
        }),
      });

      const execTime = Number((performance.now() - startTime).toFixed(1));
      setExecutionTime(execTime);

      if (response.ok) {
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
        throw new Error(`HTTP ${response.status}`);
      }
    } catch {
      const execTime = Number((Math.random() * 8 + 2).toFixed(1));
      setExecutionTime(execTime);
      setTerminalOutput({
        ...activeTool.mockResponse,
        executedAt: new Date().toISOString(),
        requestParams: paramInputs,
        latencyMs: execTime,
        mode: "edge_simulation",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const copyResponseText = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(terminalOutput, null, 2));
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
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-3">
            <Terminal className="w-3.5 h-3.5" />
            Live Tool Console
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Interactive Playground
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto text-base sm:text-lg">
            Experience progressive disclosure: inspect schemas, configure arguments, and execute MCP gateway calls in real time.
          </p>
        </div>

        {/* 2-Column Grid */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column: Category & Tool Browser */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="glass-1 glass-edge rounded-2xl p-4 shadow-xl border border-white/10 sticky top-24 max-h-[700px] flex flex-col">
              {/* Header & Search */}
              <div className="mb-3 px-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Available Tools
                  </h3>
                  <span className="text-[11px] text-cyan-400 font-mono">455 total</span>
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
                          <span className="bg-black/30 border border-white/10 rounded-full px-1.5 py-0 text-[10px] text-zinc-400 font-mono">
                            {cat.count}
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
              {/* Terminal Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#131924] border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                    <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                  </div>
                  <div className="ml-3 text-xs text-zinc-400 font-mono flex items-center gap-2">
                    <span>spike.land MCP Terminal</span>
                    <span className="text-zinc-600">/</span>
                    <span className="text-cyan-400">{activeTool.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Edge Session
                  </span>
                </div>
              </div>

              {/* Tool Detail & Controls */}
              <div className="p-5 bg-[#0a0f1a] border-b border-white/[0.06]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-lg font-bold font-mono text-white">{activeTool.name}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-400/20">
                        {activeTool.category}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
                      {activeTool.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunTool}
                    disabled={isRunning}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition-all self-start sm:self-center disabled:opacity-50"
                  >
                    <Play className={`w-3.5 h-3.5 fill-white ${isRunning ? "animate-spin" : ""}`} />
                    {isRunning ? "Invoking..." : "Execute Tool"}
                  </button>
                </div>

                {/* Parameters Editor */}
                {Object.keys(activeTool.parameters).length > 0 ? (
                  <div className="bg-black/40 rounded-xl p-3 border border-white/10 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Arguments (JSON-RPC)
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
                            onChange={(e) =>
                              setParamInputs((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            placeholder={schema.description}
                            className="w-full bg-[#111622] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-black/20 rounded-xl px-3 py-2 border border-white/[0.06] text-[11px] text-zinc-500 font-mono">
                    No required arguments. Ready for zero-arg execution.
                  </div>
                )}
              </div>

              {/* Terminal Execution Output */}
              <div className="bg-[#080d16] p-4 font-mono text-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="text-zinc-500">$</span>
                    <span className="text-zinc-300">result.json</span>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <Clock className="w-3 h-3" />
                      {executionTime}ms
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={copyResponseText}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
                  >
                    {copiedResponse ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedResponse ? "Copied" : "Copy Output"}</span>
                  </button>
                </div>
                <div className="rounded-xl bg-black/50 border border-white/10 p-4 overflow-x-auto max-h-[320px]">
                  <pre className="text-cyan-300/90 leading-relaxed">
                    <code>{JSON.stringify(terminalOutput, null, 2)}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
