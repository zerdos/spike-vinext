import { Plug, Search, Zap, Check, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StepTool {
  name: string;
  checked: boolean;
  highlight?: boolean;
}

interface StepItem {
  step: string;
  title: string;
  badge: string;
  icon: React.ElementType;
  description: string;
  tools: StepTool[];
  more: string | null;
}

const ARCHITECTURE_COMPARISON = [
  {
    pattern: "Static MCP (455 Tools Upfront)",
    sep2567: "Compliant (Static)",
    positionZeroCache: "100% Preserved (but 50,050 tok/turn bloat)",
    clientSupport: "Universal",
    verdict: "Unsustainable token spend & 48% tool accuracy",
    highlight: false,
  },
  {
    pattern: "Pattern A: Stateful tools/list Mutation (list_changed)",
    sep2567: "Non-Compliant (Violates SEP-2567)",
    positionZeroCache: "0% (Busts 60k-token LLM prefix cache on toggle)",
    clientSupport: "Broken in Claude Code / Remote Proxies",
    verdict: "Architectural dead end under MCP 2026-07-28",
    highlight: false,
  },
  {
    pattern: "Probabilistic Top-K Search (search_tools BM25/Vector)",
    sep2567: "Partial",
    positionZeroCache: "Unstable (Non-deterministic tool ordering)",
    clientSupport: "Universal",
    verdict: "Fails on multi-tool workflows & audit compliance",
    highlight: false,
  },
  {
    pattern: "Spike Land Pattern B + C (Stateless Handle Broker + Virtual URIs)",
    sep2567: "100% Native SEP-2567 & SEP-2549",
    positionZeroCache: "100% Preserved (~516 tok static Position Zero)",
    clientSupport: "100% Universal across all 2026 clients",
    verdict: "98.7% input savings + 98% output slicing + RFC 8707/MRTR",
    highlight: true,
  },
];

export function HowItWorks() {
  const steps: StepItem[] = [
    {
      step: "1",
      title: "Connect",
      badge: "5 tools (Static)",
      icon: Plug,
      description:
        "Wire-Level Surface (SEP-2567 & SEP-2549): tools/list exposes 5 static Broker Meta-Tools with cacheScope: \"public\" and ttlMs: 3600000. Token Position Zero never mutates.",
      tools: [
        { name: "list_capability_categories", checked: false },
        { name: "configure_active_categories", checked: false },
        { name: "inspect_tool_schema", checked: false },
        { name: "execute_tool", checked: false },
        { name: "inspect_result_slice", checked: false },
      ],
      more: null,
    },
    {
      step: "2",
      title: "Discover",
      badge: "Handle-Scoped",
      icon: Search,
      description:
        "Conversation Working Set: Agent invokes configure_active_categories(workspace_handle, [\"Development\"]). Tool schemas append in-band to the conversation tail — 0% prefix cache invalidation.",
      tools: [
        { name: "list_capability_categories", checked: true },
        { name: "configure_active_categories", checked: true },
        { name: "code_runner (tail-disclosed)", checked: false, highlight: true },
        { name: "git_diff_viewer (tail-disclosed)", checked: false, highlight: true },
        { name: "ast_inspect (tail-disclosed)", checked: false, highlight: true },
      ],
      more: "workspace_handle: spk_hdl_v2...",
    },
    {
      step: "3",
      title: "Activate",
      badge: "RFC 8707 + MRTR",
      icon: Zap,
      description:
        "Two-Sided Disclosure & Governance: execute_tool verifies handle grants, performs RFC 8707 OAuth 2.1 token exchange (zero passthrough), enforces SEP-2322 MRTR step-up, and slices oversized payloads.",
      tools: [
        { name: "execute_tool (RFC 8707 exchange)", checked: true },
        { name: "inspect_result_slice (98% output saved)", checked: true },
        { name: "MRTR Step-Up (resultType: input_required)", checked: true, highlight: true },
        { name: "HeaderMismatch (-32020) Defense", checked: true },
      ],
      more: "+88 deterministic capability packs...",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-16 sm:py-24 border-b-2 border-[#111315] bg-secondary/40 scroll-mt-16"
    >
      <div className="mx-auto max-w-7xl px-4">
        {/* Heading leads first, description and badge below */}
        <div className="mb-12 pb-6 border-b border-[#111315] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-3 max-w-2xl">
            <h2 className="font-display text-3xl sm:text-5xl font-black text-foreground tracking-tight leading-[1.02]">
              How It Works
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed max-w-[65ch]">
              Built on the MCP 2026-07-28 Three-Layer Separation Principle: decouple the static wire catalog at Token Position Zero from the handle-scoped conversation working set.
            </p>
          </div>
          <Badge variant="secondary" className="self-start sm:self-end">
            MCP 2026-07-28 Architecture
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.step}
                className="border-2 border-[#111315] overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <CardHeader className="bg-secondary/70 border-b border-[#111315] p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#111315] text-[#F5F4F0] font-mono text-sm font-bold">
                          {item.step}
                        </span>
                        <CardTitle className="text-xl flex items-center gap-2">
                          <Icon className="w-4 h-4 text-primary" />
                          <span>{item.title}</span>
                        </CardTitle>
                      </div>
                      <Badge variant="cobalt" className="font-mono">
                        {item.badge}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-0">
                    <Table>
                      <TableBody>
                        {item.tools.map((t) => (
                          <TableRow key={t.name}>
                            <TableCell className="py-2 px-4 flex items-center gap-2.5 font-mono text-xs">
                              {t.checked ? (
                                <Check className="w-3.5 h-3.5 text-[#0D7A5F] shrink-0" />
                              ) : (
                                <Circle className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                              )}
                              <span
                                className={
                                  t.highlight
                                    ? "font-bold text-primary"
                                    : "text-foreground"
                                }
                              >
                                {t.name}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                        {item.more && (
                          <TableRow>
                            <TableCell className="py-2 px-4 font-mono text-xs text-muted-foreground">
                              {item.more}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Architectural Comparison Timetable */}
        <Card className="mt-8 border-2 border-[#111315] overflow-hidden">
          <CardHeader className="bg-[#111315] text-[#F5F4F0] py-4 px-5 border-b border-[#111315] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-[#F5F4F0]">
                Why Stateful tools/list Mutation Fails Under MCP 2026-07-28
              </CardTitle>
              <CardDescription className="text-xs text-[#B8BDC7] mt-0.5">
                Comparing progressive disclosure architectures across SEP-2567 compliance, LLM prefix cache physics, and client compatibility
              </CardDescription>
            </div>
            <Badge variant="emerald" className="font-mono text-[10px] self-start sm:self-center">
              THREE-LAYER SEPARATION
            </Badge>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4">Architecture Pattern</TableHead>
                  <TableHead className="px-4">SEP-2567 Stateless</TableHead>
                  <TableHead className="px-4">Position-Zero Prefix Cache</TableHead>
                  <TableHead className="px-4">Client Support</TableHead>
                  <TableHead className="px-4">Production Verdict</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ARCHITECTURE_COMPARISON.map((row) => (
                  <TableRow
                    key={row.pattern}
                    className={row.highlight ? "bg-[#ECFDF5]" : undefined}
                  >
                    <TableCell className="px-4 font-mono text-xs font-bold text-foreground">
                      {row.pattern}
                    </TableCell>
                    <TableCell className="px-4 font-mono text-xs text-muted-foreground">
                      {row.sep2567}
                    </TableCell>
                    <TableCell
                      className={`px-4 font-mono text-xs ${
                        row.highlight ? "font-bold text-[#0D7A5F]" : "text-muted-foreground"
                      }`}
                    >
                      {row.positionZeroCache}
                    </TableCell>
                    <TableCell className="px-4 text-xs text-muted-foreground">
                      {row.clientSupport}
                    </TableCell>
                    <TableCell
                      className={`px-4 text-xs ${
                        row.highlight ? "font-bold text-[#064E3B]" : "text-muted-foreground"
                      }`}
                    >
                      {row.verdict}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
