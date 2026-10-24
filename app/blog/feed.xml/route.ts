import { getAllPosts } from "@/lib/blog/posts";
import { generateRssFeed } from "@/lib/blog/rss";

export const revalidate = 7200; // 2 hours edge cache

export async function GET() {
  const posts = getAllPosts();
  const rssXml = generateRssFeed(posts, {
    siteUrl: "https://spike.land",
    feedTitle: "Spike Land Engineering Blog",
    feedDescription:
      "The open-source context and governance control plane for AI coding agents and MCP 2026-07-28 systems.",
  });

  return new Response(rssXml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=7200, stale-while-revalidate=86400",
    },
  });
}
