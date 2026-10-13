import { Layers, ArrowRight } from "lucide-react";

export function CategoriesCta() {
  return (
    <section id="categories" className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="glass-1 glass-edge rounded-3xl p-8 sm:p-12 text-center border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute -inset-10 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none" />

        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center mx-auto mb-6">
          <Layers className="h-7 w-7 text-cyan-400" />
        </div>

        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mb-3">
          Tool Categories
        </h2>
        <p className="text-sm sm:text-base text-zinc-300 max-w-xl mx-auto leading-relaxed mb-8">
          Browse 88 categories and 455 tools with inline try-it forms, progressive disclosure, and edge-native performance.
        </p>

        <a
          href="#playground"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold tracking-wide transition-all duration-300 active:scale-[0.98] bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:brightness-110 h-12 rounded-xl px-8 text-sm"
        >
          Browse All Categories
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}
