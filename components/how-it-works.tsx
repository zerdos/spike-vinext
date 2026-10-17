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
    pattern: "Load all 455 tools up front",
    sep2567: "Yes",
    positionZeroCache: "Kept, but every message carries ~50,000 extra tokens",
    clientSupport: "Works everywhere",
    verdict: "Expensive, and the AI picks the right tool only about half the time",
    highlight: false,
  },
  {
    pattern: "Change the tool list mid-chat",
    sep2567: "No",
    positionZeroCache: "Lost every time the list changes",
    clientSupport: "Breaks in Claude Code and remote setups",
    verdict: "Doesn't work with the latest MCP version",
    highlight: false,
  },
  {
    pattern: "Search for the closest-matching tools (Probabilistic Search)",
    sep2567: "Partly",
    positionZeroCache: "Unreliable (results come back in a different order)",
    clientSupport: "Works everywhere",
    verdict: "Misses related tools that a task needs together",
    highlight: false,
  },
  {
    pattern: "Spike Land (5 Starter Tools + Categories on Demand)",
    sep2567: "Yes (SEP-2567 & SEP-2549)",
    positionZeroCache: "Always kept (only ~516 tokens at Position Zero)",
    clientSupport: "Works with every major AI app",
    verdict: "~99% fewer prompt tokens, smaller results, and built-in safety checks",
    highlight: true,
  },
];

export function HowItWorks() {
  const steps: StepItem[] = [
    {
      step: "1",
      title: "Connect",
      badge: "5 tools",
      icon: Plug,
      description:
        "Add Spike Land to your AI app. Your AI sees just 5 small helper tools. This list never changes, so your AI provider can cache it and you pay less on every message.",
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
      badge: "Pick a category",
      icon: Search,
      description:
        "When your AI needs something specific, it switches on a category — for example \"Development\". The instructions for those tools are added to the end of the chat, so nothing earlier has to be re-read.",
      tools: [
        { name: "list_capability_categories", checked: true },
        { name: "configure_active_categories", checked: true },
        { name: "code_runner (now available)", checked: false, highlight: true },
        { name: "git_diff_viewer (now available)", checked: false, highlight: true },
        { name: "ast_inspect (now available)", checked: false, highlight: true },
      ],
      more: "Your choices are remembered for this chat",
    },
    {
      step: "3",
      title: "Activate",
      badge: "Safe by default",
      icon: Zap,
      description:
        "Your AI runs the tool. Spike Land checks it's allowed, uses a separate login for each service (your own key is never passed on), asks you before anything risky, and trims huge results down to size.",
      tools: [
        { name: "execute_tool (secure login)", checked: true },
        { name: "inspect_result_slice (up to 98% smaller results)", checked: true },
        { name: "Asks for your approval on risky actions", checked: true, highlight: true },
        { name: "Blocks mismatched or tampered requests", checked: true },
      ],
      more: "+88 categories to choose from...",
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
              Your AI doesn&apos;t need every tool at once. Spike Land keeps a short, fixed list of helper tools
              in view, and adds the rest only when a task calls for them.
            </p>
          </div>
          <Badge variant="secondary" className="self-start sm:self-end">
            3 simple steps
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
                Comparing 4 ways to give an AI lots of tools — and what each one actually costs you
              </CardDescription>
            </div>
            <Badge variant="emerald" className="font-mono text-[10px] self-start sm:self-center">
              SIDE-BY-SIDE
            </Badge>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4">Approach</TableHead>
                  <TableHead className="px-4">Works With Latest MCP?</TableHead>
                  <TableHead className="px-4">AI Cache Savings</TableHead>
                  <TableHead className="px-4">Which Apps It Works In</TableHead>
                  <TableHead className="px-4">Bottom Line</TableHead>
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
