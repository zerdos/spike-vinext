import { describe, it, expect } from "vitest";
import { BlogPostSchema } from "@/lib/blog/schema";
import {
  parseFrontmatter,
  calculateReadingTime,
  getAllPosts,
  getPostBySlug,
  getPostsByTag,
  getAllTags,
  getRelatedPosts,
  clearPostsCache,
} from "@/lib/blog/posts";
import { extractTocFromMarkdown, slugifyHeading } from "@/lib/blog/toc";
import { generateRssFeed, generateAtomFeed } from "@/lib/blog/rss";
import {
  parseJsxProps,
  splitContentSegments,
} from "@/components/blog/mdx-components";

describe("Blog Post Schema Validation & Editorial Invariants", () => {
  const validPostMeta = {
    title: "Slashing Agent Token Costs by 98.7%",
    slug: "slashing-agent-token-costs",
    description: "How Spike Land preserves LLM prompt prefix caches at position zero.",
    date: "2026-10-23",
    author: {
      name: "Spike Land Engineering",
      role: "Context Systems Engineering",
      avatar: "/authors/spike-team.png",
      twitter: "@spikeland",
    },
    heroImage: "/blog/slashing-agent-token-costs/hero.svg",
    heroImagePrompt:
      "A high-precision architectural visualization of neural network prompt cache layers with glowing cyan blocks.",
    tags: ["Architecture", "MCP", "Prompt Caching"],
    readingTime: "7 min read",
    featured: true,
    draft: false,
  };

  it("validates a complete post successfully", () => {
    const parsed = BlogPostSchema.parse(validPostMeta);
    expect(parsed.title).toBe(validPostMeta.title);
    expect(parsed.heroImage).toBe(validPostMeta.heroImage);
    expect(parsed.heroImagePrompt).toBe(validPostMeta.heroImagePrompt);
  });

  it("fails validation when mandatory heroImage is missing or empty", () => {
    const invalid = { ...validPostMeta, heroImage: "" };
    expect(() => BlogPostSchema.parse(invalid)).toThrow(
      /A hero image path is mandatory/
    );
  });

  it("fails validation when mandatory heroImagePrompt is missing or too short", () => {
    const invalid = { ...validPostMeta, heroImagePrompt: "Too short" };
    expect(() => BlogPostSchema.parse(invalid)).toThrow(
      /A detailed hero image generation prompt is mandatory/
    );
  });

  it("enforces slug format (lowercase alphanumeric and hyphens)", () => {
    const invalidSlug = { ...validPostMeta, slug: "Invalid Slug With Spaces!" };
    expect(() => BlogPostSchema.parse(invalidSlug)).toThrow(/Slug must only contain/);
  });

  it("enforces YYYY-MM-DD date format", () => {
    const invalidDate = { ...validPostMeta, date: "10/23/2026" };
    expect(() => BlogPostSchema.parse(invalidDate)).toThrow(/Date must follow YYYY-MM-DD/);
  });
});

describe("Frontmatter Parsing & Reading Time", () => {
  const sampleMdx = `---
title: "Zero-Restart Tool Mounting"
slug: "mid-chat-mcp-server-mounting"
description: "How Spike Land enables mid-chat server mounting at the edge."
date: "2026-10-22"
author:
  name: "Spike Land Team"
  role: "Edge Runtime Systems"
heroImage: "/blog/mid-chat-mcp-server-mounting/hero.svg"
heroImagePrompt: "A futuristic modular cybernetic docking bay with glowing sapphire data cartridge."
tags:
  - "MCP"
  - "Cloudflare Workers"
readingTime: "5 min read"
draft: false
---

# Headline

This is body content explaining the architecture.
`;

  it("extracts frontmatter fields accurately", () => {
    const { frontmatter, content } = parseFrontmatter(sampleMdx);
    expect(frontmatter.title).toBe("Zero-Restart Tool Mounting");
    expect(frontmatter.slug).toBe("mid-chat-mcp-server-mounting");
    expect(frontmatter.heroImage).toBe("/blog/mid-chat-mcp-server-mounting/hero.svg");
    expect(frontmatter.tags).toEqual(["MCP", "Cloudflare Workers"]);
    expect(typeof frontmatter.author).toBe("object");
    expect((frontmatter.author as Record<string, unknown>).name).toBe("Spike Land Team");
    expect(content).toContain("# Headline");
  });

  it("calculates reading time from word count", () => {
    const words = new Array(600).fill("word").join(" ");
    const rt = calculateReadingTime(words);
    expect(rt).toBe("3 min read");
  });
});

describe("Blog Post Queries & Content Portfolio", () => {
  beforeEach(() => {
    clearPostsCache();
  });

  it("loads all launch articles and verifies mandatory hero visuals", () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThanOrEqual(3);

    for (const post of posts) {
      expect(post.title).toBeTruthy();
      expect(post.slug).toMatch(/^[a-z0-9-]+$/);
      expect(post.heroImage).toBeTruthy();
      expect(post.heroImagePrompt.length).toBeGreaterThanOrEqual(20);
      expect(post.content).toBeTruthy();
      expect(post.tags.length).toBeGreaterThan(0);
    }
  });

  it("retrieves a single post by slug", () => {
    const post = getPostBySlug("slashing-agent-token-costs-position-zero-cache");
    expect(post).not.toBeNull();
    expect(post?.title).toContain("Slashing Agent Token Costs");
    expect(post?.heroImage).toBe("/blog/slashing-agent-token-costs/hero.svg");
  });

  it("filters posts by tag correctly", () => {
    const mcpPosts = getPostsByTag("MCP");
    expect(mcpPosts.length).toBeGreaterThanOrEqual(2);
    for (const p of mcpPosts) {
      expect(p.tags.map((t) => t.toLowerCase())).toContain("mcp");
    }
  });

  it("aggregates all tags with counts", () => {
    const tags = getAllTags();
    expect(tags.length).toBeGreaterThan(0);
    const mcpTag = tags.find((t) => t.tag === "MCP");
    expect(mcpTag).toBeDefined();
    expect(mcpTag!.count).toBeGreaterThanOrEqual(2);
  });

  it("calculates related posts based on tag overlap", () => {
    const related = getRelatedPosts(
      "slashing-agent-token-costs-position-zero-cache",
      2
    );
    expect(related.length).toBeGreaterThan(0);
    expect(related.every((p) => p.slug !== "slashing-agent-token-costs-position-zero-cache")).toBe(true);
  });
});

describe("Table of Contents (TOC) Extraction", () => {
  it("slugifies heading text properly", () => {
    expect(slugifyHeading("1. The Geometry of LLM Prefix Caching")).toBe(
      "1-the-geometry-of-llm-prefix-caching"
    );
    expect(slugifyHeading("Zero-Restart & Dynamic Mounting!")).toBe(
      "zero-restart-dynamic-mounting"
    );
  });

  it("extracts H2 and H3 headings with hierarchical levels", () => {
    const sample = `
# Title (Ignored)
## Overview
Some intro text.
### The Problem
More details.
## Architecture Solution
### Tail Disclosure
### Cloudflare Workers Edge
`;
    const toc = extractTocFromMarkdown(sample);
    expect(toc).toHaveLength(5);
    expect(toc[0]).toEqual({ id: "overview", text: "Overview", level: 2 });
    expect(toc[1]).toEqual({ id: "the-problem", text: "The Problem", level: 3 });
    expect(toc[2]).toEqual({ id: "architecture-solution", text: "Architecture Solution", level: 2 });
  });
});

describe("RSS & Atom Feed Generation", () => {
  it("generates a valid RSS 2.0 XML feed with media enclosures and prompts", () => {
    const posts = getAllPosts();
    const rss = generateRssFeed(posts, { siteUrl: "https://spike.land" });

    expect(rss).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(rss).toContain('<rss version="2.0"');
    expect(rss).toContain("<channel>");
    expect(rss).toContain("<title>Spike Land Engineering Blog</title>");
    expect(rss).toContain("<link>https://spike.land/blog</link>");
    expect(rss).toContain("<media:content");
    expect(rss).toContain("<media:description");
    expect(rss).toContain("<enclosure");

    // Ensure all posts are present
    for (const post of posts) {
      expect(rss).toContain(`<title>${post.title}</title>`);
      expect(rss).toContain(`https://spike.land/blog/${post.slug}`);
    }
  });

  it("generates a valid Atom 1.0 XML feed", () => {
    const posts = getAllPosts();
    const atom = generateAtomFeed(posts, { siteUrl: "https://spike.land" });

    expect(atom).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(atom).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
    expect(atom).toContain("<title>Spike Land Engineering Blog</title>");
    expect(atom).toContain("<entry>");

    for (const post of posts) {
      expect(atom).toContain(`<title>${post.title}</title>`);
      expect(atom).toContain(`https://spike.land/blog/${post.slug}`);
    }
  });
});

describe("MDX JSX Attribute Parser & Segmentation", () => {
  it("parses diverse JSX attribute types (strings, numbers, booleans)", () => {
    const raw = 'defaultDevelopers={50} defaultTurns={200} highlightModelId="claude-sonnet-5-5" compact';
    const parsed = parseJsxProps(raw);

    expect(parsed.defaultDevelopers).toBe(50);
    expect(parsed.defaultTurns).toBe(200);
    expect(parsed.highlightModelId).toBe("claude-sonnet-5-5");
    expect(parsed.compact).toBe(true);
  });

  it("splits markdown content and embedded JSX components", () => {
    const content = `
Here is some introductory markdown.

<RoiCalculator defaultDevelopers={25} defaultTurns={150} />

Here is an intermediate paragraph.

<Callout type="tip" title="Position-Zero Rule">
Never mutate tools/list mid-session.
</Callout>

And concluding remarks.
`;

    const segments = splitContentSegments(content);
    expect(segments.length).toBe(5);

    expect(segments[0].type).toBe("markdown");
    expect(segments[1]).toEqual({
      type: "component",
      component: "RoiCalculator",
      props: { defaultDevelopers: 25, defaultTurns: 150 },
      children: undefined,
    });
    expect(segments[2].type).toBe("markdown");
    expect(segments[3].type).toBe("component");
    if (segments[3].type === "component") {
      expect(segments[3].component).toBe("Callout");
      expect(segments[3].props.type).toBe("tip");
      expect(segments[3].props.title).toBe("Position-Zero Rule");
      expect(segments[3].children?.trim()).toBe("Never mutate tools/list mid-session.");
    }
    expect(segments[4].type).toBe("markdown");
  });
});
