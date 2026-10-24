import { getAllPosts } from "@/lib/blog/posts";
import { generateAtomFeed } from "@/lib/blog/rss";

export const revalidate = 7200;

export async function GET() {
  const posts = getAllPosts();
  const atomXml = generateAtomFeed(posts, {
    siteUrl: "https://spike.land",
    feedTitle: "Spike Land Engineering Blog",
    feedDescription:
      "The open-source context and governance control plane for AI coding agents and MCP 2026-07-28 systems.",
  });

  return new Response(atomXml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=7200, stale-while-revalidate=86400",
    },
  });
}
