"use client";

import { useEffect, useState } from "react";
import { List } from "lucide-react";
import { TocItem } from "@/lib/blog/toc";

export type { TocItem };

interface BlogTocProps {
  items: TocItem[];
}

export function BlogToc({ items }: BlogTocProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      {
        rootMargin: "-80px 0% -60% 0%",
        threshold: 0,
      }
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav
      className="sticky top-24 rounded-xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm shadow-sm"
      aria-label="Table of contents"
    >
      <div className="flex items-center gap-2 border-b border-border/40 pb-3 mb-3 text-xs font-bold uppercase tracking-wider text-foreground">
        <List className="h-3.5 w-3.5 text-primary" />
        <span>Table of Contents</span>
      </div>

      <ul className="space-y-2 text-xs">
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <li
              key={item.id}
              style={{ paddingLeft: `${(item.level - 2) * 12}px` }}
            >
              <a
                href={`#${item.id}`}
                className={`block py-1 leading-snug transition-colors line-clamp-2 ${
                  isActive
                    ? "font-semibold text-primary translate-x-1"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
