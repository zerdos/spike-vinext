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

export function HowItWorks() {
  const steps: StepItem[] = [
    {
      step: "1",
      title: "Connect",
      badge: "5 tools",
      icon: Plug,
      description:
        "Agent connects to spike.land MCP. Only 5 lightweight gateway tools are exposed — no context bloat.",
      tools: [
        { name: "search_tools", checked: false },
        { name: "list_categories", checked: false },
        { name: "enable_category", checked: false },
        { name: "get_balance", checked: false },
        { name: "get_status", checked: false },
      ],
      more: null,
    },
    {
      step: "2",
      title: "Discover",
      badge: "8 tools",
      icon: Search,
      description:
        'Agent calls search_tools("image"). The gateway finds matching tools and returns them on demand.',
      tools: [
        { name: "search_tools", checked: false },
        { name: "list_categories", checked: false },
        { name: "enable_category", checked: false },
        { name: "get_balance", checked: false },
        { name: "get_status", checked: false },
        { name: "generate_image", checked: false, highlight: true },
        { name: "modify_image", checked: false, highlight: true },
        { name: "check_job", checked: false, highlight: true },
      ],
      more: null,
    },
    {
      step: "3",
      title: "Activate",
      badge: "34 tools",
      icon: Zap,
      description:
        "Agent enables categories as needed. Full toolset available — loaded only when required.",
      tools: [
        { name: "search_tools", checked: true },
        { name: "list_categories", checked: true },
        { name: "enable_category", checked: true },
        { name: "get_balance", checked: true },
        { name: "get_status", checked: true },
        { name: "generate_image", checked: true },
      ],
      more: "+28 more...",
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
              Progressive Context Disclosure keeps your agent fast and focused. Tools load only when needed.
            </p>
          </div>
          <Badge variant="secondary" className="self-start sm:self-end">
            Architecture
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
      </div>
    </section>
  );
}
