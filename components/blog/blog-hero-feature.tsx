"use client";

import { BlogPost } from "@/lib/blog/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Calendar, Clock } from "lucide-react";

interface BlogHeroFeatureProps {
  post: BlogPost;
}

export function BlogHeroFeature({ post }: BlogHeroFeatureProps) {
  const formattedDate = new Date(post.date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <section className="relative overflow-hidden rounded-2xl border-2 border-border/70 bg-card/60 backdrop-blur-sm transition-all hover:border-primary/50 shadow-lg">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Column: Post Details */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default" className="gap-1 font-mono text-[11px]">
                <Sparkles className="h-3 w-3" />
                Featured Editorial
              </Badge>
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="font-mono text-[11px]">
                  #{tag}
                </Badge>
              ))}
            </div>

            <h2 className="font-display text-2xl sm:text-4xl font-black tracking-tight text-foreground leading-[1.08] hover:text-primary transition-colors">
              <a href={`/blog/${post.slug}`}>{post.title}</a>
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-[65ch]">
              {post.description}
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/40">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-full object-cover border border-border/70"
                  onError={(e) => {
                    e.currentTarget.src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23888'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
                  }}
                />
                <div>
                  <div className="text-xs font-bold text-foreground">
                    {post.author.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {post.author.role}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formattedDate}
                </span>
                {post.readingTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {post.readingTime}
                  </span>
                )}
              </div>
            </div>

            <Button asChild size="default" className="gap-2 font-semibold">
              <a href={`/blog/${post.slug}`}>
                Read Article
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* Right Column: Hero Visual */}
        <div className="lg:col-span-5 relative min-h-[260px] lg:min-h-full border-t lg:border-t-0 lg:border-l border-border/60 overflow-hidden bg-muted/20">
          <img
            src={post.heroImage}
            alt={post.heroImagePrompt}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            loading="eager"
            // @ts-expect-error - fetchPriority is standard in modern HTML
            fetchPriority="high"
          />
        </div>
      </div>
    </section>
  );
}
