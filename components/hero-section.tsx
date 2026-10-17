"use client";

import { useState } from "react";
import { Wrench, LayoutGrid, Zap, ArrowDown, Copy, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const INITIAL_GATEWAY_SUITE = [
  { idx: "01", name: "search_tools", role: "Semantic & keyword catalog search", footprint: "118 tok" },
  { idx: "02", name: "list_categories", role: "Enumerate 88 domain tool groups", footprint: "94 tok" },
  { idx: "03", name: "enable_category", role: "Mount category schemas on demand", footprint: "112 tok" },
  { idx: "04", name: "get_balance", role: "Inspect execution quota & rate state", footprint: "86 tok" },
  { idx: "05", name: "get_status", role: "Edge isolate colo & latency telemetry", footprint: "92 tok" },
];

export function HeroSection() {
  const [copied, setCopied] = useState(false);

  const mcpConfig = `{
  "mcpServers": {
    "spike-land": {
      "url": "https://spike.land/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`;

  const copyConfig = async () => {
    try {
      await navigator.clipboard.writeText(mcpConfig);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <section className="border-b-2 border-[#111315] bg-background">
      <div className="mx-auto max-w-7xl xl:border-x-2 xl:border-[#111315]">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:divide-x-2 lg:divide-[#111315] items-stretch">
          {/* Left 7 Columns: Primary Thesis, Subcopy, and Ruled Index Table */}
          <div className="lg:col-span-7 min-w-0 p-4 py-10 sm:p-8 lg:p-10 flex flex-col justify-between space-y-8 border-b-2 lg:border-b-0 border-[#111315]">
            <div className="space-y-6">
              <h1 className="font-display text-4xl sm:text-7xl lg:text-[5.25rem] font-black text-foreground leading-[0.94] tracking-[-0.03em] balance">
                455 AI Tools.
                <br />
                <span className="text-primary underline decoration-[#111315] decoration-4 underline-offset-8">
                  One Protocol.
                </span>
              </h1>

              {/* Protocol Status Strip (placed below h1 per craft floor) */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="outline" className="px-3 py-1 bg-card">
                  <span
                    className="inline-flex items-center mr-1.5"
                    role="img"
                    aria-label="Progressive Disclosure MCP logo"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-primary animate-dispatch-pulse" />
                  </span>
                  <span>Progressive Disclosure MCP</span>
                </Badge>
                <Badge variant="cobalt" className="font-mono">
                  CLOUDFLARE V8 ISOLATES
                </Badge>
                <Badge variant="emerald" className="font-mono">
                  -98.7% PROMPT OVERHEAD
                </Badge>
              </div>

              <p className="text-base sm:text-lg text-muted-foreground max-w-[65ch] leading-relaxed">
                Spike Land&apos;s MCP server uses{" "}
                <strong className="text-foreground font-semibold underline decoration-primary decoration-2 underline-offset-4">
                  Progressive Context Disclosure
                </strong>{" "}
                — agents start with 5 lightweight gateway tools and progressively discover 455 tools across 88 categories strictly when the task requires them.
              </p>
            </div>

            {/* 3-Cell Ruled Index Table (Chivo 900 numeral leads, label + sector coordinate below, zero decorative icons) */}
            <Card className="overflow-hidden rounded-xl border-2 border-[#111315]">
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-[#111315]">
                <div className="p-5 sm:p-6 bg-card flex flex-col justify-between">
                  <div className="font-display text-4xl sm:text-5xl font-black tracking-tight text-foreground tabular-nums leading-none">
                    455
                  </div>
                  <div className="mt-2 text-sm font-bold text-foreground">
                    Tools
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#C8C5BC] flex items-center justify-between font-mono text-[10px] font-semibold text-muted-foreground">
                    <span>SEC 01 // CATALOG</span>
                    <span className="text-primary">ON-DEMAND</span>
                  </div>
                </div>

                <div className="p-5 sm:p-6 bg-card flex flex-col justify-between">
                  <div className="font-display text-4xl sm:text-5xl font-black tracking-tight text-foreground tabular-nums leading-none">
                    88
                  </div>
                  <div className="mt-2 text-sm font-bold text-foreground">
                    Categories
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#C8C5BC] flex items-center justify-between font-mono text-[10px] font-semibold text-muted-foreground">
                    <span>SEC 02 // TAXONOMY</span>
                    <span className="text-[#0047BB]">INDEXED</span>
                  </div>
                </div>

                <div className="p-5 sm:p-6 bg-card flex flex-col justify-between">
                  <div className="font-display text-4xl sm:text-5xl font-black tracking-tight text-primary tabular-nums leading-none">
                    5
                  </div>
                  <div className="mt-2 text-sm font-bold text-foreground">
                    Gateway Tools
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#C8C5BC] flex items-center justify-between font-mono text-[10px] font-semibold text-muted-foreground">
                    <span>SEC 03 // ENTRY</span>
                    <span className="text-[#0D7A5F]">~502 TOK</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Primary Viewport Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" variant="default" asChild>
                <a href="#playground">
                  Explore Tools
                  <ArrowDown className="h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/waitlist">
                  Reserve Early Access Key
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <a href="#simulator">Calculate Token ROI</a>
              </Button>
            </div>
          </div>

          {/* Right 5 Columns: Live Gateway Dispatch Schedule + .mcp.json Config Card */}
          <div className="lg:col-span-5 min-w-0 p-4 py-10 sm:p-8 lg:p-10 bg-secondary/40 flex flex-col gap-5">
            <Card className="border-2 border-[#111315] overflow-hidden flex-1 flex flex-col justify-between">
              <CardHeader className="bg-[#111315] text-[#F5F4F0] py-4 px-5 border-b border-[#111315]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base font-bold text-[#F5F4F0]">
                    Initial Gateway Dispatch Suite
                  </CardTitle>
                  <Badge variant="default" className="font-mono text-[10px]">
                    ~502 TOKENS (5 GATEWAY TOOLS)
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-0 min-w-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-3 sm:px-4">Gateway Tool</TableHead>
                      <TableHead className="px-3 sm:px-4">Dispatch Role</TableHead>
                      <TableHead className="px-3 sm:px-4 text-right whitespace-nowrap">Schema</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {INITIAL_GATEWAY_SUITE.map((item) => (
                      <TableRow key={item.name}>
                        <TableCell className="px-3 sm:px-4 font-mono text-xs font-bold text-[#0047BB] whitespace-nowrap">
                          <span className="text-muted-foreground mr-1.5 font-normal">{item.idx}.</span>
                          {item.name}
                        </TableCell>
                        <TableCell className="px-3 sm:px-4 text-xs text-muted-foreground">
                          {item.role}
                        </TableCell>
                        <TableCell className="px-3 sm:px-4 text-right font-mono text-xs font-semibold text-[#0D7A5F] whitespace-nowrap">
                          {item.footprint}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>

              {/* .mcp.json Snippet Panel */}
              <div className="border-t-2 border-[#111315] bg-[#111315] text-[#F5F4F0] p-4 sm:p-5 min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <span className="font-mono text-xs font-semibold text-[#F5F4F0]">
                      .mcp.json
                    </span>
                    <span className="font-mono text-[11px] text-[#B8BDC7]">
                      — Streamable HTTP
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={copyConfig}
                    className="h-7 px-2.5 text-xs font-mono"
                    aria-label="Copy .mcp.json snippet"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-[#0D7A5F]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>
                <pre className="text-xs font-mono text-[#F5F4F0] leading-relaxed overflow-x-auto p-3 rounded-md bg-[#1B1E23] border border-[#343942]">
                  <code>{mcpConfig}</code>
                </pre>
              </div>

              <CardFooter className="bg-secondary px-5 py-3 border-t border-[#111315] flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  Zero local Docker containers required
                </span>
                <span className="font-mono font-semibold text-[#0D7A5F]">
                  300+ Edge Colos
                </span>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
