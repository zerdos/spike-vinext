"use client";

import { useState } from "react";
import { CLIENT_CONFIGS } from "@/lib/mcp-data";
import {
  Settings,
  Terminal,
  Code,
  Globe,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

const CLIENT_ICONS: Record<string, React.ElementType> = {
  settings: Settings,
  terminal: Terminal,
  code: Code,
  globe: Globe,
};

export function ClientConfigs() {
  const [activeTabId, setActiveTabId] = useState(CLIENT_CONFIGS[0].id);
  const [copied, setCopied] = useState(false);

  const activeConfig =
    CLIENT_CONFIGS.find((c) => c.id === activeTabId) || CLIENT_CONFIGS[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeConfig.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <section id="get-connected" className="container mx-auto px-4 py-20 sm:py-32 border-t border-white/[0.05] relative overflow-hidden max-w-5xl">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-950/5 to-transparent pointer-events-none" />

      <div className="text-center space-y-3 mb-12 relative z-10">
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
          Get Connected
        </h2>
        <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto">
          Integrate spike.land MCP with your favorite AI tools in seconds.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-8 overflow-x-auto pb-2 relative z-10">
        <div
          role="tablist"
          className="bg-black/40 backdrop-blur-xl border border-white/10 p-1.5 rounded-full inline-flex gap-1.5 shadow-xl"
        >
          {CLIENT_CONFIGS.map((config) => {
            const Icon = CLIENT_ICONS[config.icon] || Terminal;
            const isActive = activeTabId === config.id;
            return (
              <button
                key={config.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveTabId(config.id);
                  setCopied(false);
                }}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-md shadow-cyan-500/20 font-semibold"
                    : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {config.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Code Card */}
      <div className="relative group max-w-3xl mx-auto z-10">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
        <div className="relative glass-1 glass-edge rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/60 backdrop-blur-md">
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
              </div>
              <span className="ml-3 font-mono text-xs text-zinc-400">
                {activeConfig.filename}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Copy config snippet"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Snippet */}
          <div className="p-5 font-mono text-xs sm:text-sm overflow-x-auto leading-relaxed">
            <pre className="text-zinc-200">
              <code>{activeConfig.code}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Need an API key footer note */}
      <div className="text-center mt-10 relative z-10">
        <a
          href="#settings"
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-zinc-400 hover:text-white transition-colors px-4 py-2 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10"
        >
          <span>Need an API key?</span>
          <span className="text-cyan-400 flex items-center gap-1 font-medium underline underline-offset-4 decoration-cyan-400/40">
            Go to Settings <ExternalLink className="h-3.5 w-3.5" />
          </span>
        </a>
      </div>
    </section>
  );
}
