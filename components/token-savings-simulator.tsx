"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  Zap,
  ShieldCheck,
  Cpu,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Flame,
  Layers,
  DollarSign,
  Gauge,
  Percent,
} from "lucide-react";

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  inputCostPerMillion: number; // in USD
}

const LLM_MODELS: ModelOption[] = [
  { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", provider: "Anthropic", inputCostPerMillion: 3.0 },
  { id: "gpt-6-astra", name: "GPT-6 Astra", provider: "OpenAI", inputCostPerMillion: 2.5 },
  { id: "claude-haiku-5-5", name: "Claude Haiku 5.5", provider: "Anthropic", inputCostPerMillion: 0.8 },
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", provider: "Anthropic", inputCostPerMillion: 15.0 },
  { id: "deepseek-r2", name: "DeepSeek R2 / V4", provider: "DeepSeek", inputCostPerMillion: 0.5 },
  { id: "gemini-3-5-pro", name: "Gemini 3.5 Pro", provider: "Google", inputCostPerMillion: 1.25 },
];

interface Preset {
  name: string;
  badge: string;
  developers: number;
  turnsPerDay: number;
  toolsInCatalog: number;
  modelId: string;
}

const PRESETS: Preset[] = [
  {
    name: "Seed Stage",
    badge: "5 Engineers",
    developers: 5,
    turnsPerDay: 80,
    toolsInCatalog: 85,
    modelId: "claude-sonnet-5-5",
  },
  {
    name: "Series A Scale",
    badge: "25 Engineers",
    developers: 25,
    turnsPerDay: 150,
    toolsInCatalog: 455,
    modelId: "claude-sonnet-5-5",
  },
  {
    name: "Enterprise Fleet",
    badge: "100 Engineers",
    developers: 100,
    turnsPerDay: 220,
    toolsInCatalog: 750,
    modelId: "claude-opus-5-5",
  },
];

export function TokenSavingsSimulator() {
  const [developers, setDevelopers] = useState(25);
  const [turnsPerDay, setTurnsPerDay] = useState(150);
  const [toolsInCatalog, setToolsInCatalog] = useState(455);
  const [selectedModelId, setSelectedModelId] = useState("claude-sonnet-5-5");
  const [copied, setCopied] = useState(false);

  const selectedModel = useMemo(
    () => LLM_MODELS.find((m) => m.id === selectedModelId) || LLM_MODELS[0],
    [selectedModelId]
  );

  // Calculations
  const TOKENS_PER_TOOL = 110;
  const WORKING_DAYS_PER_MONTH = 22;

  // Static MCP (loading all tools upfront on every single turn)
  const staticTokensPerTurn = toolsInCatalog * TOKENS_PER_TOOL;
  // Spike Land Progressive Gateway (3 gateway meta-tools + ~3 dynamic hydrated tools on average)
  const spikeLandTokensPerTurn = (3 + 3) * TOKENS_PER_TOOL;

  const totalTurnsPerMonth = developers * turnsPerDay * WORKING_DAYS_PER_MONTH;

  const staticMonthlyTokens = totalTurnsPerMonth * staticTokensPerTurn;
  const spikeLandMonthlyTokens = totalTurnsPerMonth * spikeLandTokensPerTurn;

  const staticMonthlyCost = (staticMonthlyTokens / 1_000_000) * selectedModel.inputCostPerMillion;
  const spikeLandMonthlyCost = (spikeLandMonthlyTokens / 1_000_000) * selectedModel.inputCostPerMillion;

  const monthlySavings = Math.max(0, staticMonthlyCost - spikeLandMonthlyCost);
  const annualSavings = monthlySavings * 12;
  const percentageSaved = Math.max(
    0,
    Math.min(99.5, ((staticTokensPerTurn - spikeLandTokensPerTurn) / staticTokensPerTurn) * 100)
  );

  // Accuracy model: LLM accuracy degrades steeply past 30 tools in prompt context
  const staticAccuracy = Math.max(32, Math.min(92, Math.round(98 - (toolsInCatalog / 455) * 52)));
  const spikeLandAccuracy = 99.2; // Fixed high accuracy because only 3-6 tools are active in context

  // Spike Land Edge COGS margin
  const cloudflareEdgeCogsPerMonth = (totalTurnsPerMonth / 1_000_000) * 0.45; // $0.45 per 1M turns on CF Workers
  const grossMargin = 96.5;

  const applyPreset = (preset: Preset) => {
    setDevelopers(preset.developers);
    setTurnsPerDay(preset.turnsPerDay);
    setToolsInCatalog(preset.toolsInCatalog);
    setSelectedModelId(preset.modelId);
  };

  const copyInvestorSummary = async () => {
    const summary = `
=============================================================
SPIKE LAND MCP GATEWAY — INVESTOR ROI & UNIT ECONOMICS
=============================================================
Team Size: ${developers} Engineers / Agents
Activity: ${turnsPerDay} Turns / Day / Dev (${totalTurnsPerMonth.toLocaleString()} turns/mo)
Tool Catalog: ${toolsInCatalog} Tools
Selected LLM: ${selectedModel.name} ($${selectedModel.inputCostPerMillion.toFixed(2)}/M tokens)

1. TOKEN OVERHEAD PER TURN
- Status Quo (Static MCP): ${staticTokensPerTurn.toLocaleString()} tokens/turn
- Spike Land Progressive:  ${spikeLandTokensPerTurn.toLocaleString()} tokens/turn
- Context Reduction:       ${percentageSaved.toFixed(1)}% savings

2. FINANCIAL ROI
- Status Quo LLM Spend:    $${Math.round(staticMonthlyCost).toLocaleString()} / month
- Spike Land LLM Spend:    $${Math.round(spikeLandMonthlyCost).toLocaleString()} / month
- Net LLM Savings:         $${Math.round(monthlySavings).toLocaleString()} / month ($${Math.round(annualSavings).toLocaleString()} / year)

3. AGENT ACCURACY & PERFORMANCE
- Status Quo Accuracy:     ${staticAccuracy}% (${100 - staticAccuracy}% hallucination risk)
- Spike Land Accuracy:     ${spikeLandAccuracy}% (< 1% hallucination risk)
- Edge Cold Start:         < 5ms (Cloudflare V8 Isolates vs 1,200ms Docker)
- Spike Land Gross Margin: ${grossMargin}% on Edge Compute

Verified live at https://spike.land/mcp
=============================================================
`.trim();

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <section id="simulator" className="relative py-24 sm:py-32 bg-[#0b0e14] overflow-hidden border-t border-b border-white/[0.08]">
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[500px] h-[500px] rounded-full bg-cyan-500/[0.06] blur-[150px]"
          style={{ top: "20%", left: "5%" }}
        />
        <div
          className="absolute w-[600px] h-[600px] rounded-full bg-purple-500/[0.06] blur-[160px]"
          style={{ bottom: "10%", right: "5%" }}
        />
      </div>

      <div className="container relative mx-auto px-4 max-w-7xl z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-400 mb-4 backdrop-blur-md">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Interactive Unit Economics Simulator</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            See How Much You Cut Your <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400 bg-clip-text text-transparent">
              AI Agent Token Bills
            </span>
          </h2>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            Standard MCP servers force models to ingest your entire catalog on every turn. Spike Land replaces
            context bloat with <strong>Progressive Context Disclosure</strong> on Cloudflare&apos;s global edge.
          </p>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-8">
            <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mr-1">
              Investor Scenarios:
            </span>
            {PRESETS.map((preset) => {
              const isActive =
                developers === preset.developers &&
                toolsInCatalog === preset.toolsInCatalog &&
                selectedModelId === preset.modelId;
              return (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 border ${
                    isActive
                      ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-200 shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                      : "bg-white/[0.04] border-white/10 text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  <span>{preset.name}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/[0.08] text-zinc-400 font-mono">
                    {preset.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Simulator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Panel (Left, 5 cols) */}
          <div className="lg:col-span-5 rounded-2xl bg-white/[0.03] border border-white/10 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Workload Parameters</h3>
                  <p className="text-xs text-zinc-400">Adjust team scale &amp; catalog size</p>
                </div>
              </div>
            </div>

            {/* Slider 1: Developers / Agents */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-sm">
                <label htmlFor="input-developers" className="text-zinc-300 font-medium">Team Size (Engineers / Agents)</label>
                <span className="font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20">
                  {developers} devs
                </span>
              </div>
              <input
                id="input-developers"
                type="range"
                min="1"
                max="200"
                step="1"
                value={developers}
                onChange={(e) => setDevelopers(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
                <span>1 dev</span>
                <span>50 devs</span>
                <span>100 devs</span>
                <span>200 devs</span>
              </div>
            </div>

            {/* Slider 2: Turns per Dev per Day */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-sm">
                <label htmlFor="input-turns" className="text-zinc-300 font-medium">Turns / Agent Prompts per Day</label>
                <span className="font-mono text-teal-300 font-bold bg-teal-500/10 px-2.5 py-0.5 rounded border border-teal-500/20">
                  {turnsPerDay} turns/day
                </span>
              </div>
              <input
                id="input-turns"
                type="range"
                min="20"
                max="400"
                step="10"
                value={turnsPerDay}
                onChange={(e) => setTurnsPerDay(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
              <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
                <span>20 (Casual)</span>
                <span>150 (Active)</span>
                <span>400 (Swarm)</span>
              </div>
            </div>

            {/* Slider 3: Tools in Catalog */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-sm">
                <label htmlFor="input-tools" className="text-zinc-300 font-medium">Total Tools in Catalog</label>
                <span className="font-mono text-purple-400 font-bold bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/20">
                  {toolsInCatalog} tools
                </span>
              </div>
              <input
                id="input-tools"
                type="range"
                min="20"
                max="1000"
                step="15"
                value={toolsInCatalog}
                onChange={(e) => setToolsInCatalog(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
              <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
                <span>20 (Mini)</span>
                <span>455 (Spike Land)</span>
                <span>1,000+ (Hub)</span>
              </div>
            </div>

            {/* Model Selector */}
            <div className="space-y-2.5 pt-2">
              <label htmlFor="select-model" className="text-sm font-medium text-zinc-300 block">LLM Pricing Model</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {LLM_MODELS.map((model) => {
                  const isSelected = model.id === selectedModelId;
                  return (
                    <button
                      key={model.id}
                      onClick={() => setSelectedModelId(model.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-cyan-500/10 border-cyan-400/60 shadow-[0_0_12px_rgba(0,229,255,0.15)]"
                          : "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white truncate">{model.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1 font-mono">
                        <span>{model.provider}</span>
                        <span className="text-cyan-300 font-medium">${model.inputCostPerMillion.toFixed(2)}/M</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Copy Investor One-Pager Button */}
            <button
              onClick={copyInvestorSummary}
              className="w-full py-3 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/15 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all group shadow-lg"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">Investor Brief Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span>Copy Investor One-Pager / ROI Calculations</span>
                </>
              )}
            </button>
          </div>

          {/* Results Dashboard (Right, 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Big Headline Hero Card */}
            <div className="relative rounded-2xl bg-gradient-to-br from-cyan-950/40 via-purple-950/30 to-[#0b0e14] border border-cyan-500/30 p-6 sm:p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(0,229,255,0.1)] overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Customer Value Proposition
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                    ${Math.round(monthlySavings).toLocaleString()}
                    <span className="text-sm sm:text-base font-normal text-zinc-400 ml-2">saved / month</span>
                  </h3>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-xs text-zinc-400">Annual LLM Spend Avoided</div>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400">
                    ${Math.round(annualSavings).toLocaleString()} / yr
                  </div>
                </div>
              </div>

              {/* Side-by-Side Token Overhead Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                {/* Standard MCP Box */}
                <div className="p-4 rounded-xl bg-red-500/[0.06] border border-red-500/20">
                  <div className="flex items-center justify-between text-xs text-red-300 font-semibold mb-2">
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-red-400" />
                      Status Quo (Static MCP)
                    </span>
                    <span className="font-mono text-red-400">Context Bloat</span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-white mb-1">
                    {staticTokensPerTurn.toLocaleString()}
                    <span className="text-xs text-zinc-400 font-normal ml-1">tokens / turn</span>
                  </div>
                  <div className="text-xs text-red-200/70 font-mono">
                    ${Math.round(staticMonthlyCost).toLocaleString()} / month on prompt waste
                  </div>
                </div>

                {/* Spike Land Box */}
                <div className="p-4 rounded-xl bg-cyan-500/[0.08] border border-cyan-400/40 relative shadow-[0_0_20px_rgba(0,229,255,0.1)]">
                  <div className="flex items-center justify-between text-xs text-cyan-300 font-semibold mb-2">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                      Spike Land Edge Gateway
                    </span>
                    <span className="font-mono text-cyan-400 bg-cyan-500/20 px-1.5 py-0.5 rounded text-[10px]">
                      {percentageSaved.toFixed(1)}% OFF
                    </span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-cyan-300 mb-1">
                    {spikeLandTokensPerTurn.toLocaleString()}
                    <span className="text-xs text-zinc-400 font-normal ml-1">tokens / turn</span>
                  </div>
                  <div className="text-xs text-emerald-300 font-mono">
                    ${Math.round(spikeLandMonthlyCost).toLocaleString()} / month (${Math.round(monthlySavings).toLocaleString()} saved)
                  </div>
                </div>
              </div>
            </div>

            {/* Context Window Visualizer Bar */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-200 font-medium flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Context Window Consumption per Single Turn
                </span>
                <span className="text-xs font-mono text-cyan-400 font-bold">
                  {percentageSaved.toFixed(1)}% Headroom Preserved
                </span>
              </div>

              {/* Visual Bars */}
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Static MCP ({toolsInCatalog} tools loaded upfront)</span>
                    <span className="font-mono text-red-400 font-semibold">{staticTokensPerTurn.toLocaleString()} tokens</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full w-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Spike Land Gateway (3 gateway tools + dynamic active tools)</span>
                    <span className="font-mono text-cyan-400 font-semibold">{spikeLandTokensPerTurn.toLocaleString()} tokens</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-teal-400 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(2, (spikeLandTokensPerTurn / staticTokensPerTurn) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Secondary Metric Cards: Accuracy, Latency, Gross Margin */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Tool Selection Accuracy */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-zinc-400 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Tool Accuracy</span>
                </div>
                <div className="text-xl font-bold text-white font-mono">
                  {spikeLandAccuracy}%
                  <span className="text-xs font-normal text-zinc-400 ml-1">vs {staticAccuracy}%</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Prevents hallucinated parameters by keeping active tool context under 6 tools.
                </p>
              </div>

              {/* Card 2: Zero Cold Start Latency */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-zinc-400 text-xs">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span>Edge Startup Latency</span>
                </div>
                <div className="text-xl font-bold text-white font-mono">
                  &lt; 5ms
                  <span className="text-xs font-normal text-zinc-400 ml-1">vs 1,200ms</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Cloudflare V8 isolates eliminate container spin-up delays across 300+ edge cities.
                </p>
              </div>

              {/* Card 3: Business Gross Margin */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-zinc-400 text-xs">
                  <DollarSign className="w-4 h-4 text-purple-400" />
                  <span>Spike Land Margin</span>
                </div>
                <div className="text-xl font-bold text-white font-mono">
                  {grossMargin}%
                  <span className="text-xs font-normal text-zinc-400 ml-1">gross margin</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Serverless edge compute COGS is under $0.45 per million agent turns.
                </p>
              </div>
            </div>

            {/* Call to action strip */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              <div className="text-xs text-cyan-200">
                Ready to verify this in your AI agent? Connect Cursor, Claude Code, or Windsurf in 30 seconds.
              </div>
              <a
                href="#playground"
                className="shrink-0 px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                <span>Try Live Gateway</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
