"use client";

import { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";

interface HeroImageDisplayProps {
  heroImage: string;
  heroImagePrompt: string;
  title: string;
}

export function HeroImageDisplay({
  heroImage,
  heroImagePrompt,
  title,
}: HeroImageDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(heroImagePrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <figure className="relative my-8 overflow-hidden rounded-xl border border-border/60 bg-card/40 shadow-sm">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted/20">
        <img
          src={heroImage}
          alt={heroImagePrompt}
          width={1280}
          height={720}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.01]"
          loading="eager"
          // @ts-expect-error - fetchPriority is standard in modern HTML
          fetchPriority="high"
        />
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 bg-card/80 px-4 py-2.5 backdrop-blur-sm text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 min-w-0 max-w-[75%]">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
          <span className="truncate font-medium text-foreground/90">
            Hero Visual & Prompt
          </span>
          <span className="hidden sm:inline text-muted-foreground/60">•</span>
          <span className="hidden sm:inline truncate text-[11px] text-muted-foreground italic max-w-sm">
            &ldquo;{heroImagePrompt}&rdquo;
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowPromptModal(!showPromptModal)}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors font-mono sm:hidden"
            aria-label="Toggle full prompt"
          >
            {showPromptModal ? "Hide Prompt" : "View Prompt"}
          </button>

          <button
            type="button"
            onClick={handleCopyPrompt}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-mono font-medium text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            aria-label="Copy hero image prompt to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-500">Copied Prompt</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy Prompt</span>
              </>
            )}
          </button>
        </div>
      </figcaption>

      {/* Expanded prompt panel for mobile or direct review */}
      {showPromptModal && (
        <div className="border-t border-border/40 bg-background/95 p-3 text-xs text-muted-foreground font-mono leading-relaxed sm:hidden">
          <p className="text-[10px] uppercase font-bold text-primary mb-1">
            Generative Screen-Reader Prompt:
          </p>
          {heroImagePrompt}
        </div>
      )}
    </figure>
  );
}
