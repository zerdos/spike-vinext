"use client";

import { useState } from "react";
import { GitFork, Copy, Check } from "lucide-react";

interface MermaidEmbedProps {
  chart: string;
  title?: string;
}

export function MermaidEmbed({ chart, title = "System Architecture Diagram" }: MermaidEmbedProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(chart);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <figure className="my-8 rounded-xl border border-border/70 bg-card overflow-hidden shadow-sm">
      <figcaption className="flex items-center justify-between border-b border-border/50 bg-muted/40 px-4 py-2 text-xs">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <GitFork className="h-3.5 w-3.5 text-primary" />
          <span>{title}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy Source</span>
            </>
          )}
        </button>
      </figcaption>

      <div className="p-4 sm:p-6 bg-background/50 overflow-x-auto">
        <pre className="font-mono text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
          {chart}
        </pre>
      </div>
    </figure>
  );
}
