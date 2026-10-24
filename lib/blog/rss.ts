import { BlogPost } from "./schema";

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface RssOptions {
  siteUrl?: string;
  feedTitle?: string;
  feedDescription?: string;
}

export function generateRssFeed(
  posts: BlogPost[],
  options: RssOptions = {}
): string {
  const siteUrl = (options.siteUrl || "https://spike.land").replace(/\/$/, "");
  const feedTitle = options.feedTitle || "Spike Land Engineering Blog";
  const feedDescription =
    options.feedDescription ||
    "The open-source context and governance control plane for AI coding agents and MCP 2026-07-28 systems.";

  const now = new Date().toUTCString();

  const itemsXml = posts
    .map((post) => {
      const postUrl = `${siteUrl}/blog/${post.slug}`;
      const pubDate = new Date(post.date).toUTCString();
      const heroUrl = post.heroImage.startsWith("http")
        ? post.heroImage
        : `${siteUrl}${post.heroImage.startsWith("/") ? "" : "/"}${post.heroImage}`;

      const tagsXml = post.tags
        .map((tag) => `<category>${escapeXml(tag)}</category>`)
        .join("\n        ");

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(postUrl)}</link>
      <guid isPermaLink="true">${escapeXml(postUrl)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.description)}</description>
      <author>${escapeXml(post.author.name)}</author>
      ${tagsXml}
      <media:content url="${escapeXml(heroUrl)}" medium="image">
        <media:description type="plain">${escapeXml(post.heroImagePrompt)}</media:description>
      </media:content>
      <enclosure url="${escapeXml(heroUrl)}" length="0" type="image/webp"/>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${escapeXml(siteUrl + "/blog")}</link>
    <description>${escapeXml(feedDescription)}</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${escapeXml(siteUrl + "/blog/feed.xml")}" rel="self" type="application/rss+xml"/>
${itemsXml}
  </channel>
</rss>`;
}

export function generateAtomFeed(
  posts: BlogPost[],
  options: RssOptions = {}
): string {
  const siteUrl = (options.siteUrl || "https://spike.land").replace(/\/$/, "");
  const feedTitle = options.feedTitle || "Spike Land Engineering Blog";
  const feedDescription =
    options.feedDescription ||
    "The open-source context and governance control plane for AI coding agents and MCP 2026-07-28 systems.";

  const now = new Date().toISOString();

  const entriesXml = posts
    .map((post) => {
      const postUrl = `${siteUrl}/blog/${post.slug}`;
      const updated = new Date(post.updatedDate || post.date).toISOString();

      const tagsXml = post.tags
        .map((tag) => `<category term="${escapeXml(tag)}" />`)
        .join("\n      ");

      return `    <entry>
      <id>${escapeXml(postUrl)}</id>
      <title>${escapeXml(post.title)}</title>
      <link href="${escapeXml(postUrl)}" />
      <updated>${updated}</updated>
      <summary>${escapeXml(post.description)}</summary>
      <author>
        <name>${escapeXml(post.author.name)}</name>
      </author>
      ${tagsXml}
    </entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(feedTitle)}</title>
  <subtitle>${escapeXml(feedDescription)}</subtitle>
  <link href="${escapeXml(siteUrl + "/blog/atom.xml")}" rel="self" />
  <link href="${escapeXml(siteUrl + "/blog")}" />
  <id>${escapeXml(siteUrl + "/blog")}</id>
  <updated>${now}</updated>
${entriesXml}
</feed>`;
}
