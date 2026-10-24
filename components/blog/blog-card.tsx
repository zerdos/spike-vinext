"use client";

import { BlogPost } from "@/lib/blog/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, Calendar, ArrowRight } from "lucide-react";

interface BlogCardProps {
  post: BlogPost;
}

export function BlogCard({ post }: BlogCardProps) {
  const formattedDate = new Date(post.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card className="group relative flex flex-col overflow-hidden border border-border/70 bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
      <a
        href={`/blog/${post.slug}`}
        className="block aspect-[16/9] w-full overflow-hidden bg-muted/20 border-b border-border/60"
      >
        <img
          src={post.heroImage}
          alt={post.heroImagePrompt}
          loading="lazy"
          width={640}
          height={360}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </a>

      <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="font-mono text-[10px] px-1.5 py-0"
              >
                #{tag}
              </Badge>
            ))}
          </div>

          <h3 className="font-display text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors leading-snug">
            <a href={`/blog/${post.slug}`} className="focus:outline-none">
              {post.title}
            </a>
          </h3>

          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {post.description}
          </p>
        </div>

        <div className="pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <img
              src={post.author.avatar}
              alt={post.author.name}
              width={22}
              height={22}
              className="h-5 w-5 rounded-full object-cover border border-border/60"
              onError={(e) => {
                e.currentTarget.src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23888'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
              }}
            />
            <span className="font-medium text-foreground">{post.author.name}</span>
          </div>

          <div className="flex items-center gap-3 font-mono">
            <span>{formattedDate}</span>
            {post.readingTime && (
              <>
                <span>•</span>
                <span>{post.readingTime}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
