import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getAllPosts,
  getPostBySlug,
  getRelatedPosts,
} from "@/lib/blog/posts";
import { BlogHeader } from "@/components/blog/blog-header";
import { HeroImageDisplay } from "@/components/blog/hero-image-display";
import { BlogToc } from "@/components/blog/blog-toc";
import { extractTocFromMarkdown } from "@/lib/blog/toc";
import { BlogShare } from "@/components/blog/blog-share";
import { BlogReadingProgress } from "@/components/blog/blog-reading-progress";
import { MdxRenderer } from "@/components/blog/mdx-components";
import { BlogCard } from "@/components/blog/blog-card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const revalidate = 86400; // Edge ISR 24 hours

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found | Spike Land Blog",
    };
  }

  const siteUrl = "https://spike.land";
  const postUrl = `${siteUrl}/blog/${post.slug}`;
  const heroUrl = post.heroImage.startsWith("http")
    ? post.heroImage
    : `${siteUrl}${post.heroImage.startsWith("/") ? "" : "/"}${post.heroImage}`;

  return {
    title: `${post.title} | Spike Land Engineering Blog`,
    description: post.description,
    authors: [{ name: post.author.name, url: post.author.twitter }],
    alternates: {
      canonical: post.canonicalUrl || postUrl,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: postUrl,
      siteName: "Spike Land",
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.updatedDate || post.date,
      authors: [post.author.name],
      tags: post.tags,
      images: [
        {
          url: heroUrl,
          width: 1280,
          height: 720,
          alt: post.heroImagePrompt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [heroUrl],
      creator: post.author.twitter || "@spikeland",
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedPosts(post.slug, 3);
  const tocItems = extractTocFromMarkdown(post.content);

  // Schema.org BlogPosting JSON-LD
  const siteUrl = "https://spike.land";
  const postUrl = `${siteUrl}/blog/${post.slug}`;
  const heroUrl = post.heroImage.startsWith("http")
    ? post.heroImage
    : `${siteUrl}${post.heroImage.startsWith("/") ? "" : "/"}${post.heroImage}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: heroUrl,
    datePublished: post.date,
    dateModified: post.updatedDate || post.date,
    author: {
      "@type": "Person",
      name: post.author.name,
      jobTitle: post.author.role,
    },
    publisher: {
      "@type": "Organization",
      name: "Spike Land",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/favicon.ico`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postUrl,
    },
    keywords: post.tags.join(", "),
  };

  return (
    <>
      <BlogReadingProgress />

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        {/* Back navigation */}
        <div className="mb-6">
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

        {/* Article Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Main Content Column */}
          <main className="lg:col-span-8 space-y-8">
            <BlogHeader post={post} />

            {/* MANDATORY HERO IMAGE DISPLAY & PROMPT ALT CAPTION */}
            <HeroImageDisplay
              heroImage={post.heroImage}
              heroImagePrompt={post.heroImagePrompt}
              title={post.title}
            />

            {/* Rendered MDX Content */}
            <MdxRenderer content={post.content} />

            {/* Social Share Footer */}
            <BlogShare title={post.title} slug={post.slug} />
          </main>

          {/* Sticky Table of Contents Sidebar */}
          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              <BlogToc items={tocItems} />

              {/* Author Card */}
              <div className="rounded-xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm shadow-sm space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Published by
                </div>
                <div className="flex items-center gap-3">
                  <img
                    src={post.author.avatar}
                    alt={post.author.name}
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-full object-cover border border-border/70 bg-muted/40"
                  />
                  <div>
                    <div className="font-bold text-sm text-foreground">
                      {post.author.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {post.author.role}
                    </div>
                    {post.author.twitter && (
                      <div className="text-xs text-primary font-mono mt-0.5">
                        {post.author.twitter}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Newsletter / Waitlist CTA */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-sm space-y-3">
                <div className="font-display text-sm font-bold text-foreground">
                  Preserve Your Agent&apos;s Prefix Caches
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Connect Spike Land to Cursor, Claude Desktop, or Windsurf in 60 seconds and cut prompt token bills by 98.7%.
                </p>
                <Button size="sm" asChild className="w-full text-xs font-bold">
                  <a href="/waitlist">Get Early Access</a>
                </Button>
              </div>
            </div>
          </aside>
        </div>

        {/* Related Articles Section */}
        {relatedPosts.length > 0 && (
          <section className="mt-16 pt-12 border-t border-border/60 space-y-6">
            <h2 className="font-display text-2xl font-black tracking-tight text-foreground">
              Related Engineering Deep Dives
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((related) => (
                <BlogCard key={related.slug} post={related} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
