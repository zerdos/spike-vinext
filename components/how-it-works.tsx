import { Plug, Search, Zap, Check } from "lucide-react";

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
    <section className="relative py-20 sm:py-32 overflow-hidden border-t border-white/[0.05]">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-950/10 to-transparent pointer-events-none" />

      <div className="container relative mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-3">
            Architecture
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-4">
            How It Works
          </h2>
          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Progressive Context Disclosure keeps your agent fast and focused. Tools load only when needed.
          </p>
        </div>

        <div className="relative">
          {/* Connector Line on desktop */}
          <div className="hidden lg:block absolute top-6 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {steps.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="flex flex-col items-center">
                  {/* Step Bubble */}
                  <div className="relative mb-6">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                      <span className="text-lg font-bold text-white">{item.step}</span>
                    </div>
                    <div className="absolute -inset-2 rounded-full bg-cyan-500/10 blur-lg -z-10" />
                  </div>

                  {/* Card */}
                  <div className="glass-1 glass-edge rounded-2xl w-full max-w-sm p-6 shadow-xl border border-white/10 text-left hover:border-cyan-400/30 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-cyan-400">
                        <Icon className="w-5 h-5" />
                        <span className="font-bold tracking-tight text-white text-lg">{item.title}</span>
                      </div>
                      <span className="text-xs font-semibold font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-400/20">
                        {item.badge}
                      </span>
                    </div>

                    <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-6">
                      {item.description}
                    </p>

                    <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                      {item.tools.map((t) => (
                        <div
                          key={t.name}
                          className={`flex items-center gap-2 text-xs font-mono ${
                            t.highlight ? "text-cyan-300" : "text-zinc-400"
                          }`}
                        >
                          {t.checked ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0" />
                          )}
                          <span className="truncate">{t.name}</span>
                        </div>
                      ))}
                      {item.more && (
                        <div className="text-xs text-zinc-500 pl-4 font-mono">{item.more}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
