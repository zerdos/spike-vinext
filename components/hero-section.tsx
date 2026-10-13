"use client";

import { useState } from "react";
import { Wrench, LayoutGrid, Zap, ArrowDown, Copy, Check } from "lucide-react";

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
    <section className="relative min-h-[92vh] flex items-center justify-center pt-28 pb-20 sm:pt-36 sm:pb-28 overflow-hidden">
      {/* Background ambient light blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute w-[600px] h-[600px] rounded-full bg-cyan-500/[0.08] blur-[140px] animate-float-slow"
          style={{ top: "5%", left: "15%" }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full bg-purple-500/[0.08] blur-[150px] animate-float-slow-reverse"
          style={{ top: "40%", right: "15%" }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full bg-pink-500/[0.05] blur-[120px]"
          style={{ bottom: "5%", left: "40%" }}
        />
      </div>

      <div className="container relative mx-auto px-4 text-center z-10 max-w-5xl">
        {/* Shimmering Badge */}
        <div className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-cyan-400 mb-8 backdrop-blur-xl overflow-hidden shadow-2xl hover:bg-white/[0.07] transition-all cursor-default">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent animate-shimmer pointer-events-none" />
          <div className="inline-flex items-center relative" role="img" aria-label="Progressive Disclosure MCP logo">
            <svg width="24" height="18" viewBox="0 0 84 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0" aria-hidden="true">
              <rect x="0" y="0" width="84" height="60" rx="8" fill="#1e293b" />
              <rect x="10" y="15" width="12" height="6" rx="3" fill="#00E5FF" />
              <rect x="10" y="27" width="20" height="6" rx="3" fill="#A855F7" />
              <rect x="10" y="39" width="28" height="6" rx="3" fill="#EC4899" />
              <text x="74" y="40" textAnchor="end" fill="white" fontFamily="monospace" fontSize="16" fontWeight="bold">
                MCP
              </text>
            </svg>
          </div>
          <span className="font-semibold tracking-wider uppercase text-[11px] relative text-cyan-300">
            Progressive Disclosure MCP
          </span>
        </div>

        {/* Main Headline */}
        <div className="relative inline-block py-2">
          <div className="absolute -inset-10 bg-cyan-500/15 blur-[90px] rounded-full pointer-events-none mix-blend-screen" />
          <h1 className="relative text-5xl sm:text-7xl md:text-8xl font-black text-white max-w-5xl mx-auto leading-none mb-6 tracking-tight drop-shadow-2xl">
            455 AI Tools.
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-black drop-shadow-[0_0_40px_rgba(168,85,247,0.4)]">
              One Protocol.
            </span>
          </h1>
        </div>

        {/* Subhead */}
        <p className="text-base sm:text-xl text-zinc-300 max-w-2xl mx-auto mb-12 font-light leading-relaxed">
          Spike Land&apos;s MCP server uses{" "}
          <span className="text-white font-medium underline decoration-cyan-400/40 underline-offset-4">
            Progressive Context Disclosure
          </span>{" "}
          — agents start with 5 lightweight gateway tools and progressively discover 455 tools across 88 categories.
        </p>

        {/* Metrics Row */}
        <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 mb-12">
          <div className="glass-1 glass-edge rounded-2xl px-6 py-4 flex items-center gap-4 min-w-[170px] shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-left">
              <div className="text-2xl font-black tracking-tight text-white">455</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Tools</div>
            </div>
          </div>

          <div className="glass-1 glass-edge rounded-2xl px-6 py-4 flex items-center gap-4 min-w-[170px] shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-400/20 flex items-center justify-center shrink-0">
              <LayoutGrid className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-left">
              <div className="text-2xl font-black tracking-tight text-white">88</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Categories</div>
            </div>
          </div>

          <div className="glass-1 glass-edge rounded-2xl px-6 py-4 flex items-center gap-4 min-w-[170px] shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-left">
              <div className="text-2xl font-black tracking-tight text-white">5</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Gateway Tools</div>
            </div>
          </div>
        </div>

        {/* .mcp.json Snippet Card */}
        <div className="max-w-md mx-auto mb-10">
          <div className="glass-1 glass-edge rounded-2xl border border-white/10 p-4 text-left shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                <span className="ml-2 text-[11px] text-zinc-400 font-mono">.mcp.json</span>
              </div>
              <button
                type="button"
                onClick={copyConfig}
                className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
                aria-label="Copy .mcp.json snippet"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <pre className="text-xs font-mono text-zinc-300 leading-relaxed overflow-x-auto p-1">
              <code>{mcpConfig}</code>
            </pre>
          </div>
        </div>

        {/* Explore Tools Button */}
        <div>
          <a
            href="#playground"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold tracking-wide border border-white/10 bg-white/5 hover:bg-white/10 h-11 px-6 py-2 text-zinc-300 hover:text-white gap-2 group transition-all duration-300 shadow-md"
          >
            Explore Tools
            <ArrowDown className="w-4 h-4 transition-transform group-hover:translate-y-1 text-cyan-400" />
          </a>
        </div>
      </div>
    </section>
  );
}
