"use client";

import { BlogPost } from "@/lib/blog/schema";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";

interface BlogHeaderProps {
  post: BlogPost;
}

export function BlogHeader({ post }: BlogHeaderProps) {
  const formattedDate = new Date(post.date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="space-y-6 pb-6 border-b border-border/60">
      <div className="flex flex-wrap items-center gap-2">
        {post.tags.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="font-mono text-xs hover:border-primary hover:text-primary transition-colors"
          >
            <a href={`/blog/tag/${encodeURIComponent(tag.toLowerCase())}`}>
              #{tag}
            </a>
          </Badge>
        ))}
      </div>

      <div className="space-y-4">
        <h1 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-foreground leading-[1.05]">
          {post.title}
        </h1>
        <p className="text-base sm:text-xl text-muted-foreground leading-relaxed">
          {post.description}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs text-muted-foreground">
        {/* Author */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-full border border-border/70 bg-muted/40">
            <img
              src={post.author.avatar}
              alt={post.author.name}
              width={40}
              height={40}
              className="h-full w-full object-cover"
              onError={(e) => {
                // Fallback avatar icon
                e.currentTarget.src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23888'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
              }}
            />
          </div>
          <div>
            <div className="font-bold text-foreground">{post.author.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {post.author.role}
              {post.author.twitter && (
                <span className="ml-1 text-primary">
                  {post.author.twitter}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Date and Reading Time */}
        <div className="flex items-center gap-4 font-mono text-[11px]">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <time dateTime={post.date}>{formattedDate}</time>
          </div>
          {post.readingTime && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{post.readingTime}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
