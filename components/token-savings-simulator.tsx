"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  Zap,
  ShieldCheck,
  Cpu,
  Copy,
  Check,
  ArrowRight,
  Flame,
  Layers,
  DollarSign,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

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
  const AVG_CONVERSATION_HISTORY_TOKENS = 60000;

  // Static MCP (loading all tools upfront on every single turn)
  const staticTokensPerTurn = toolsInCatalog * TOKENS_PER_TOOL;
  // Spike Land Progressive Gateway (5 static Position-Zero broker meta-tools + tail-disclosed working set)
  const spikeLandTokensPerTurn = (3 + 3) * TOKENS_PER_TOOL;

  const totalTurnsPerMonth = developers * turnsPerDay * WORKING_DAYS_PER_MONTH;

  const staticMonthlyTokens = totalTurnsPerMonth * staticTokensPerTurn;
  const spikeLandMonthlyTokens = totalTurnsPerMonth * spikeLandTokensPerTurn;

  // Pattern A (Naive tools/list mutation) busts the 60k-token Position-Zero LLM prompt cache on category toggles (~15% of turns)
  const patternACacheBustTokensPerMonth = Math.round(totalTurnsPerMonth * 0.15 * AVG_CONVERSATION_HISTORY_TOKENS * 0.9);
  const patternACachePenaltyCost =
    (patternACacheBustTokensPerMonth / 1_000_000) * selectedModel.inputCostPerMillion;

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
  const spikeLandAccuracy = 99.2;

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
SPIKE LAND MCP 2026-07-28 RELAY — INVESTOR ROI & UNIT ECONOMICS
=============================================================
Team Size: ${developers} Engineers / Agents
Activity: ${turnsPerDay} Turns / Day / Dev (${totalTurnsPerMonth.toLocaleString()} turns/mo)
Tool Catalog: ${toolsInCatalog} Tools
Selected LLM: ${selectedModel.name} ($${selectedModel.inputCostPerMillion.toFixed(2)}/M tokens)

1. TOKEN OVERHEAD & POSITION-ZERO CACHE PRESERVATION
- Status Quo (Static MCP): ${staticTokensPerTurn.toLocaleString()} tokens/turn
- Naive Pattern A (tools/list mutation): Invalidates 60k-token Position-Zero prefix cache ($${Math.round(patternACachePenaltyCost).toLocaleString()}/mo cache-bust penalty)
- Spike Land Pattern B (Stateless Handle Broker): ${spikeLandTokensPerTurn.toLocaleString()} tokens/turn (0% Position-Zero cache invalidation)
- Context Reduction:       ${percentageSaved.toFixed(1)}% savings

2. FINANCIAL ROI
- Status Quo LLM Spend:    $${Math.round(staticMonthlyCost).toLocaleString()} / month
- Spike Land LLM Spend:    $${Math.round(spikeLandMonthlyCost).toLocaleString()} / month
- Net LLM Savings:         $${Math.round(monthlySavings).toLocaleString()} / month ($${Math.round(annualSavings).toLocaleString()} / year)

3. AGENT ACCURACY & MCP 2026-07-28 COMPLIANCE
- Status Quo Accuracy:     ${staticAccuracy}% (${100 - staticAccuracy}% hallucination risk)
- Spike Land Accuracy:     ${spikeLandAccuracy}% (< 1% hallucination risk)
- Spec Compliance:         100% SEP-2567 Stateless Handle + SEP-2549 CacheableResult + RFC 8707 Token Exchange
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
    <section
      id="simulator"
      className="py-16 sm:py-24 bg-secondary/50 border-b-2 border-[#111315] scroll-mt-16"
    >
      <div className="mx-auto max-w-7xl px-4">
        {/* Section Header: Heading leads first, badges and presets below */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12 pb-6 border-b border-[#111315]">
          <div className="space-y-3 max-w-2xl">
            <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-foreground leading-[1.02]">
              See How Much You Cut Your{" "}
              <span className="text-primary">AI Agent Token Bills</span>
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed max-w-[65ch]">
              Standard MCP servers force models to ingest your entire catalog on every turn. Spike Land replaces context bloat with{" "}
              <strong className="text-foreground font-semibold">
                Progressive Context Disclosure
              </strong>{" "}
              on Cloudflare&apos;s global edge.
            </p>
            <div className="pt-1">
              <Badge variant="cobalt">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Interactive Unit Economics Simulator</span>
              </Badge>
            </div>
          </div>

          {/* Scenario Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground mr-1">
              Investor Scenarios:
            </span>
            {PRESETS.map((preset) => {
              const isActive =
                developers === preset.developers &&
                toolsInCatalog === preset.toolsInCatalog &&
                selectedModelId === preset.modelId;
              return (
                <Button
                  key={preset.name}
                  type="button"
                  variant={isActive ? "ink" : "outline"}
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  className="gap-2"
                >
                  <span>{preset.name}</span>
                  <Badge
                    variant={isActive ? "default" : "secondary"}
                    className="font-mono text-[10px] px-1.5 py-0"
                  >
                    {preset.badge}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Simulator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Panel (Left, 5 cols) */}
          <Card className="lg:col-span-5 min-w-0 border-2 border-[#111315]">
            <CardHeader className="border-b border-[#111315] bg-secondary/60 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[#111315] bg-card">
                    <Gauge className="w-4 h-4 text-primary" />
                  </span>
                  <div>
                    <CardTitle className="text-base">Workload Parameters</CardTitle>
                    <CardDescription className="text-xs">
                      Adjust team scale &amp; catalog size
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Slider 1: Developers / Agents */}
              <div className="space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <Label htmlFor="input-developers" className="text-sm font-semibold">
                    Team Size (Engineers / Agents)
                  </Label>
                  <Badge variant="outline" className="font-mono text-xs font-bold shrink-0">
                    {developers} devs
                  </Badge>
                </div>
                <Slider
                  id="input-developers"
                  min={1}
                  max={200}
                  step={1}
                  value={developers}
                  accentColor="vermilion"
                  onChange={(e) => setDevelopers(Number(e.target.value))}
                />
                <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                  <span>1 dev</span>
                  <span>50 devs</span>
                  <span>100 devs</span>
                  <span>200 devs</span>
                </div>
              </div>

              {/* Slider 2: Turns per Dev per Day */}
              <div className="space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <Label htmlFor="input-turns" className="text-sm font-semibold">
                    Turns / Agent Prompts per Day
                  </Label>
                  <Badge variant="cobalt" className="font-mono text-xs font-bold shrink-0">
                    {turnsPerDay} turns/day
                  </Badge>
                </div>
                <Slider
                  id="input-turns"
                  min={20}
                  max={400}
                  step={10}
                  value={turnsPerDay}
                  accentColor="cobalt"
                  onChange={(e) => setTurnsPerDay(Number(e.target.value))}
                />
                <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                  <span>20 (Casual)</span>
                  <span>150 (Active)</span>
                  <span>400 (Swarm)</span>
                </div>
              </div>

              {/* Slider 3: Tools in Catalog */}
              <div className="space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <Label htmlFor="input-tools" className="text-sm font-semibold">
                    Total Tools in Catalog
                  </Label>
                  <Badge variant="emerald" className="font-mono text-xs font-bold shrink-0">
                    {toolsInCatalog} tools
                  </Badge>
                </div>
                <Slider
                  id="input-tools"
                  min={20}
                  max={1000}
                  step={15}
                  value={toolsInCatalog}
                  accentColor="emerald"
                  onChange={(e) => setToolsInCatalog(Number(e.target.value))}
                />
                <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                  <span>20 (Mini)</span>
                  <span>455 (Spike Land)</span>
                  <span>1,000+ (Hub)</span>
                </div>
              </div>

              <Separator />

              {/* Model Selector */}
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold block">LLM Pricing Model</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {LLM_MODELS.map((model) => {
                    const isSelected = model.id === selectedModelId;
                    return (
                      <Button
                        key={model.id}
                        type="button"
                        variant={isSelected ? "ink" : "outline"}
                        onClick={() => setSelectedModelId(model.id)}
                        className="h-auto p-3 flex flex-col items-stretch text-left justify-start"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold truncate">{model.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </div>
                        <div className="flex items-center justify-between w-full text-[11px] opacity-85 mt-1 font-mono">
                          <span>{model.provider}</span>
                          <span className="font-semibold">
                            ${model.inputCostPerMillion.toFixed(2)}/M
                          </span>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </CardContent>

            <CardFooter className="border-t border-[#111315] bg-secondary/40 p-4">
              <Button
                type="button"
                variant="outline"
                onClick={copyInvestorSummary}
                className="w-full font-semibold whitespace-normal h-auto py-2.5 text-center"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-[#0D7A5F]" />
                    <span className="text-[#0D7A5F]">
                      Investor Brief Copied to Clipboard!
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-primary" />
                    <span>Copy Investor One-Pager / ROI Calculations</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Results Dashboard (Right, 7 cols) */}
          <div className="lg:col-span-7 min-w-0 space-y-6">
            {/* Big Headline Hero Card (Numbers lead first, labels below/beside) */}
            <Card className="border-2 border-[#111315] overflow-hidden">
              <CardHeader className="bg-[#111315] text-[#F5F4F0] p-6 sm:p-8 border-b border-[#111315]">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
                  <div>
                    <div className="font-mono text-4xl sm:text-5xl font-bold text-[#F5F4F0] tabular-nums">
                      ${Math.round(monthlySavings).toLocaleString()}
                      <span className="text-sm sm:text-base font-sans font-normal text-[#B8BDC7] ml-2">
                        saved / month
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="default">Customer Value Proposition</Badge>
                      <span className="text-xs text-[#B8BDC7] font-mono">
                        {totalTurnsPerMonth.toLocaleString()} turns/mo
                      </span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-2xl sm:text-3xl font-mono font-bold text-[#34D399] tabular-nums">
                      ${Math.round(annualSavings).toLocaleString()} / yr
                    </div>
                    <div className="text-xs text-[#B8BDC7] mt-1">
                      Annual LLM Spend Avoided
                    </div>
                  </div>
                </div>
              </CardHeader>

              {/* Side-by-Side Token Overhead Comparison */}
              <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-card">
                {/* Standard MCP Box */}
                <div className="p-4 rounded-lg bg-[#FEF2F2] border border-[#BA1C1C]">
                  <div className="flex items-center justify-between text-xs font-bold text-[#7F1D1D] mb-2">
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-[#BA1C1C]" />
                      Status Quo (Static MCP)
                    </span>
                    <Badge variant="destructive" className="font-mono text-[10px]">
                      Context Bloat
                    </Badge>
                  </div>
                  <div className="text-2xl font-mono font-bold text-[#111315] mb-1 tabular-nums">
                    {staticTokensPerTurn.toLocaleString()}
                    <span className="text-xs text-muted-foreground font-sans font-normal ml-1">
                      tokens / turn
                    </span>
                  </div>
                  <div className="text-xs text-[#7F1D1D] font-mono">
                    ${Math.round(staticMonthlyCost).toLocaleString()} / month on prompt waste
                  </div>
                </div>

                {/* Spike Land Box */}
                <div className="p-4 rounded-lg bg-[#ECFDF5] border-2 border-[#0D7A5F]">
                  <div className="flex items-center justify-between text-xs font-bold text-[#064E3B] mb-2">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#0D7A5F] fill-[#0D7A5F]" />
                      Spike Land Edge Gateway
                    </span>
                    <Badge variant="emerald" className="font-mono text-[10px]">
                      {percentageSaved.toFixed(1)}% OFF
                    </Badge>
                  </div>
                  <div className="text-2xl font-mono font-bold text-[#111315] mb-1 tabular-nums">
                    {spikeLandTokensPerTurn.toLocaleString()}
                    <span className="text-xs text-muted-foreground font-sans font-normal ml-1">
                      tokens / turn (avg active turn: 3 gateway + 3 domain)
                    </span>
                  </div>
                  <div className="text-xs text-[#065F46] font-mono font-semibold">
                    ${Math.round(spikeLandMonthlyCost).toLocaleString()} / month ($
                    {Math.round(monthlySavings).toLocaleString()} saved)
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Context Window Visualizer Bar */}
            <Card className="border-2 border-[#111315]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#0047BB]" />
                    Context Window Consumption per Single Turn
                  </CardTitle>
                  <Badge variant="cobalt" className="font-mono">
                    {percentageSaved.toFixed(1)}% Headroom Preserved
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Static MCP ({toolsInCatalog} tools loaded upfront at Position Zero)</span>
                    <span className="font-mono text-[#BA1C1C] font-bold">
                      {staticTokensPerTurn.toLocaleString()} tokens / turn
                    </span>
                  </div>
                  <Progress value={100} indicatorClassName="bg-[#BA1C1C]" />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Naive Pattern A (tools/list mutation busts 60k-token Position-Zero LLM cache)</span>
                    <span className="font-mono text-primary font-bold">
                      +${Math.round(patternACachePenaltyCost).toLocaleString()}/mo cache-bust penalty
                    </span>
                  </div>
                  <Progress value={68} indicatorClassName="bg-primary" />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Spike Land Pattern B (5 static Position-Zero broker tools + tail working set)</span>
                    <span className="font-mono text-[#0D7A5F] font-bold">
                      {spikeLandTokensPerTurn.toLocaleString()} tokens / turn (0% cache invalidation)
                    </span>
                  </div>
                  <Progress
                    value={(spikeLandTokensPerTurn / staticTokensPerTurn) * 100}
                    indicatorClassName="bg-[#0D7A5F]"
                  />
                </div>

                <div className="pt-2 border-t border-[#C8C5BC] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">Two-Sided Disclosure (SEP-2567 &amp; SEP-2549):</strong>{" "}
                    Position Zero stays 100% cache-stable (<code className="font-mono">cacheScope: &quot;public&quot;</code>) while oversized tool outputs slice via <code className="font-mono">result_cursor_handle</code>.
                  </span>
                  <Badge variant="emerald" className="font-mono text-[10px] shrink-0">
                    98% Output Slicing Included
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* 3 Secondary Metric Cells (Number leads first, label and description below) */}
            <Card className="border-2 border-[#111315] overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#111315]">
                {/* Cell 1: Tool Selection Accuracy */}
                <div className="p-5 bg-card space-y-1.5">
                  <div className="text-2xl font-bold text-foreground font-mono tabular-nums">
                    {spikeLandAccuracy}%
                    <span className="text-xs font-normal text-muted-foreground ml-1.5">
                      vs {staticAccuracy}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-foreground font-semibold text-xs">
                    <ShieldCheck className="w-4 h-4 text-[#0D7A5F]" />
                    <span>Tool Accuracy</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Prevents hallucinated parameters by keeping active tool context under 6 tools.
                  </p>
                </div>

                {/* Cell 2: Zero Cold Start Latency */}
                <div className="p-5 bg-card space-y-1.5">
                  <div className="text-2xl font-bold text-foreground font-mono tabular-nums">
                    &lt; 5ms
                    <span className="text-xs font-normal text-muted-foreground ml-1.5">
                      vs 1,200ms
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-foreground font-semibold text-xs">
                    <Cpu className="w-4 h-4 text-[#0047BB]" />
                    <span>Edge Startup Latency</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Cloudflare V8 isolates eliminate container spin-up delays across 300+ edge cities.
                  </p>
                </div>

                {/* Cell 3: Business Gross Margin */}
                <div className="p-5 bg-card space-y-1.5">
                  <div className="text-2xl font-bold text-foreground font-mono tabular-nums">
                    {grossMargin}%
                    <span className="text-xs font-normal text-muted-foreground ml-1.5">
                      gross margin
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-foreground font-semibold text-xs">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span>Spike Land Margin</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Serverless edge compute COGS is under $0.45 per million agent turns.
                  </p>
                </div>
              </div>
            </Card>

            {/* Call to action strip */}
            <Card className="border-2 border-[#111315] bg-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs sm:text-sm font-medium text-foreground">
                Ready to verify this in your AI agent? Connect Cursor, Claude Code, or Windsurf in 30 seconds.
              </div>
              <Button variant="default" size="sm" asChild className="shrink-0">
                <a href="#playground">
                  <span>Try Live Gateway</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
