import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostsByTag, getAllTags, getAllPosts } from "@/lib/blog/posts";
import { BlogCard } from "@/components/blog/blog-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Tag as TagIcon } from "lucide-react";

export const revalidate = 3600;

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  const allTags = getAllTags();
  return allTags.map(({ tag }) => ({
    tag: tag.toLowerCase(),
  }));
}

export async function generateMetadata({
  params,
}: TagPageProps): Promise<Metadata> {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);

  return {
    title: `Articles tagged #${decodedTag} | Spike Land Blog`,
    description: `Read technical articles and architecture deep dives on #${decodedTag} from Spike Land Engineering.`,
  };
}

export default async function BlogTagPage({ params }: TagPageProps) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  const posts = getPostsByTag(decodedTag);
  const allTags = getAllTags();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 space-y-10">
      {/* Navigation */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-xs text-muted-foreground hover:text-foreground font-mono -ml-2"
        >
          <a href="/blog">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to all articles
          </a>
        </Button>
      </div>

      {/* Header */}
      <div className="pb-6 border-b border-border/60 space-y-3">
        <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-wider">
          <TagIcon className="h-4 w-4" />
          <span>Tag Archive</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-foreground">
          Articles tagged with <span className="text-primary">#{decodedTag}</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Showing {posts.length} {posts.length === 1 ? "article" : "articles"} in this category.
        </p>
      </div>

      {/* Other Tags Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground mr-1">Other tags:</span>
        {allTags.map(({ tag: otherTag, count }) => {
          const isCurrent = otherTag.toLowerCase() === decodedTag.toLowerCase();
          return (
            <Badge
              key={otherTag}
              variant={isCurrent ? "default" : "outline"}
              className="font-mono text-xs"
            >
              <a href={`/blog/tag/${encodeURIComponent(otherTag.toLowerCase())}`}>
                #{otherTag} ({count})
              </a>
            </Badge>
          );
        })}
      </div>

      {/* Articles Grid */}
      {posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 p-12 text-center space-y-3">
          <p className="font-display text-lg font-bold text-foreground">
            No articles found for tag #{decodedTag}
          </p>
          <Button variant="outline" size="sm" asChild>
            <a href="/blog">Browse all articles</a>
          </Button>
        </div>
      )}
    </div>
  );
}
