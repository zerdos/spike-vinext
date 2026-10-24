"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BlogShareProps {
  title: string;
  slug: string;
}

export function BlogShare({ title, slug }: BlogShareProps) {
  const [copied, setCopied] = useState(false);
  const articleUrl = `https://spike.land/blog/${slug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(articleUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    title
  )}&url=${encodeURIComponent(articleUrl)}&via=spikeland`;

  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    articleUrl
  )}`;

  const hnUrl = `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(
    articleUrl
  )}&t=${encodeURIComponent(title)}`;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-6 border-t border-border/60">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-2">
        <Share2 className="h-3.5 w-3.5" />
        <span>Share:</span>
      </div>

      <Button
        variant="outline"
        size="sm"
        asChild
        className="h-8 px-2.5 text-xs border-border/60 hover:text-foreground"
      >
        <a href={xUrl} target="_blank" rel="noopener noreferrer">
          X / Twitter
        </a>
      </Button>

      <Button
        variant="outline"
        size="sm"
        asChild
        className="h-8 px-2.5 text-xs border-border/60 hover:text-foreground"
      >
        <a href={linkedInUrl} target="_blank" rel="noopener noreferrer">
          LinkedIn
        </a>
      </Button>

      <Button
        variant="outline"
        size="sm"
        asChild
        className="h-8 px-2.5 text-xs border-border/60 hover:text-foreground"
      >
        <a href={hnUrl} target="_blank" rel="noopener noreferrer">
          Hacker News
        </a>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="h-8 px-2.5 text-xs border-border/60 hover:text-foreground"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-500 mr-1" />
            <span className="text-emerald-500">Link Copied</span>
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5 mr-1" />
            <span>Copy Link</span>
          </>
        )}
      </Button>
    </div>
  );
}
