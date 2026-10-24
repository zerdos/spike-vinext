import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Spike Land Engineering Blog | High-Performance Context Architecture",
  description:
    "Technical deep dives, architectural benchmarks, and tutorials on Model Context Protocol (MCP), Position-Zero prompt caching, and Cloudflare Workers agent runtimes.",
  openGraph: {
    title: "Spike Land Engineering Blog",
    description:
      "Technical deep dives on Model Context Protocol (MCP), prompt caching, and Cloudflare Workers agent runtimes.",
    url: "https://spike.land/blog",
    siteName: "Spike Land",
    type: "website",
  },
  alternates: {
    types: {
      "application/rss+xml": "https://spike.land/blog/feed.xml",
      "application/atom+xml": "https://spike.land/blog/atom.xml",
    },
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
