import { Layers, ArrowRight, ShieldAlert, ShieldCheck, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const VIRTUAL_GATEWAYS = [
  {
    slug: "development",
    name: "Development Pack",
    uri: "https://spike.land/api/mcp/g/development",
    toolsCount: 69,
    riskTier: "Read-only (Safe)",
    stepUp: "Ready to run",
    cacheScope: "public • ttlMs: 3600000",
  },
  {
    slug: "ai-creative",
    name: "AI & Creative Pack",
    uri: "https://spike.land/api/mcp/g/ai-creative",
    toolsCount: 60,
    riskTier: "Read-only (Safe)",
    stepUp: "Ready to run",
    cacheScope: "public • ttlMs: 3600000",
  },
  {
    slug: "fintech-billing",
    name: "FinTech & Billing Pack",
    uri: "https://spike.land/api/mcp/g/fintech-billing",
    toolsCount: 38,
    riskTier: "Write actions",
    stepUp: "Asks before running",
    cacheScope: "public • ttlMs: 3600000",
  },
  {
    slug: "web-scraping",
    name: "Web & Scraping Pack",
    uri: "https://spike.land/api/mcp/g/web-scraping",
    toolsCount: 44,
    riskTier: "Read-only (Safe)",
    stepUp: "Ready to run",
    cacheScope: "public • ttlMs: 3600000",
  },
];

export function CategoriesCta() {
  return (
    <section
      id="categories"
      className="py-16 sm:py-20 border-b-2 border-[#111315] bg-background"
    >
      <div className="mx-auto max-w-7xl px-4 space-y-6">
        <Card className="border-2 border-[#111315] overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
            <CardHeader className="lg:col-span-8 p-6 sm:p-10 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-[#111315] bg-secondary text-primary shrink-0">
                  <Layers className="h-5 w-5" />
                </span>
                <CardTitle className="font-display text-2xl sm:text-4xl font-black tracking-tight text-foreground">
                  Deterministic Capability Packs &amp; Virtual Gateways
                </CardTitle>
              </div>
              <CardDescription className="text-sm sm:text-base text-muted-foreground max-w-[65ch] leading-relaxed">
                Instead of guessing which tools you might need with fuzzy search, Spike Land organizes 455 tools into{" "}
                <strong className="text-foreground font-semibold">88 focused Capability Packs</strong>{" "}
                grouped by topic. Your AI can turn on whole packs on the fly, or you can connect your client directly to a single-purpose link tailored to one team.
              </CardDescription>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="outline" className="font-mono">
                  88 FOCUSED PACKS
                </Badge>
                <Badge variant="emerald" className="font-mono">
                  455 TESTED TOOLS
                </Badge>
                <Badge variant="cobalt" className="font-mono">
                  SAFETY APPROVALS INCLUDED
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="lg:col-span-4 p-6 sm:p-10 lg:border-l border-t lg:border-t-0 border-[#111315] bg-secondary/50 h-full flex items-center justify-start lg:justify-center">
              <Button size="lg" variant="default" asChild className="w-full sm:w-auto">
                <a href="#playground">
                  Browse All Categories
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </div>

          {/* Pattern C URI-Scoped Virtual Gateway Directory */}
          <div className="border-t-2 border-[#111315] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#111315] bg-card">
            {VIRTUAL_GATEWAYS.map((vg) => {
              const isWrite = vg.riskTier === "Write actions";
              return (
                <div key={vg.slug} className="p-5 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-2xl font-black font-mono tabular-nums text-foreground">
                        {vg.toolsCount}
                        <span className="text-xs font-sans font-normal text-muted-foreground ml-1">
                          tools
                        </span>
                      </span>
                      <Badge
                        variant={isWrite ? "default" : "emerald"}
                        className="font-mono text-[10px]"
                      >
                        {vg.riskTier}
                      </Badge>
                    </div>
                    <div className="text-sm font-bold text-foreground">{vg.name}</div>
                    <div className="font-mono text-[11px] text-[#0047BB] break-all flex items-center gap-1">
                      <Globe className="w-3 h-3 shrink-0" />
                      <span>/api/mcp/g/{vg.slug}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#C8C5BC] flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {isWrite ? (
                        <ShieldAlert className="w-3 h-3 text-primary" />
                      ) : (
                        <ShieldCheck className="w-3 h-3 text-[#0D7A5F]" />
                      )}
                      {vg.stepUp}
                    </span>
                    <span className="text-foreground font-semibold">Secure Login</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </section>
  );
}
