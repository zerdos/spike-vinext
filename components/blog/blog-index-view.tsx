"use client";

import { useState, useMemo } from "react";
import { BlogPost } from "@/lib/blog/schema";
import { BlogHeroFeature } from "@/components/blog/blog-hero-feature";
import { BlogCard } from "@/components/blog/blog-card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Rss, Tag as TagIcon, X, Sparkles } from "lucide-react";

interface BlogIndexViewProps {
  initialPosts: BlogPost[];
  allTags: { tag: string; count: number }[];
  featuredPost: BlogPost | null;
}

export function BlogIndexView({
  initialPosts,
  allTags,
  featuredPost,
}: BlogIndexViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Filter posts
  const filteredPosts = useMemo(() => {
    return initialPosts.filter((post) => {
      if (selectedTag) {
        const matchesTag = post.tags.some(
          (t) => t.toLowerCase() === selectedTag.toLowerCase()
        );
        if (!matchesTag) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          post.title.toLowerCase().includes(q) ||
          post.description.toLowerCase().includes(q) ||
          post.tags.some((t) => t.toLowerCase().includes(q)) ||
          post.author.name.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [initialPosts, selectedTag, searchQuery]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 space-y-12">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/60">
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground font-mono text-xs font-black">
              S
            </span>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
              Spike Land Engineering Publication
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-foreground leading-[1.04]">
            Context Architecture & Agent Economics
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Technical deep dives on Model Context Protocol (MCP 2026-07-28), Position-Zero prompt caching,
            sandboxed edge execution, and building resilient AI agent infrastructure.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild className="font-mono text-xs gap-1.5 border-border/60">
            <a href="/blog/feed.xml" target="_blank" rel="noopener noreferrer">
              <Rss className="h-3.5 w-3.5 text-amber-500" />
              <span>RSS Feed</span>
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild className="font-mono text-xs gap-1.5 border-border/60">
            <a href="/blog/atom.xml" target="_blank" rel="noopener noreferrer">
              <Rss className="h-3.5 w-3.5 text-primary" />
              <span>Atom</span>
            </a>
          </Button>
        </div>
      </div>

      {/* Spotlight Feature Article */}
      {featuredPost && !selectedTag && !searchQuery.trim() && (
        <BlogHeroFeature post={featuredPost} />
      )}

      {/* Filter and Search Bar */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Tag Pills */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <Button
              type="button"
              variant={selectedTag === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTag(null)}
              className="h-8 text-xs font-mono"
            >
              All Articles ({initialPosts.length})
            </Button>
            {allTags.map(({ tag, count }) => {
              const isSelected = selectedTag?.toLowerCase() === tag.toLowerCase();
              return (
                <Button
                  key={tag}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTag(isSelected ? null : tag)}
                  className="h-8 text-xs font-mono border-border/60"
                >
                  #{tag} ({count})
                </Button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs bg-card border-border/60"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Active Filters Summary */}
        {(selectedTag || searchQuery) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <span>Filtering by:</span>
            {selectedTag && (
              <Badge variant="secondary" className="gap-1 font-mono text-[11px]">
                Tag: #{selectedTag}
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className="hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {searchQuery && (
              <Badge variant="secondary" className="gap-1 font-mono text-[11px]">
                Query: &ldquo;{searchQuery}&rdquo;
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedTag(null);
                setSearchQuery("");
              }}
              className="text-primary hover:underline ml-2"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* Articles Grid */}
      {filteredPosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {filteredPosts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 p-12 text-center space-y-3">
          <p className="font-display text-lg font-bold text-foreground">
            No articles found matching your criteria
          </p>
          <p className="text-xs text-muted-foreground">
            Try adjusting your search terms or clearing the selected tag filter.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedTag(null);
              setSearchQuery("");
            }}
          >
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
}
