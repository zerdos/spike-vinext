import { BlogPost, BlogPostSchema, BlogFilterOptions } from "./schema";

/**
 * Parses simple YAML-style frontmatter without heavy external dependencies.
 */
export function parseFrontmatter(rawContent: string): {
  frontmatter: Record<string, unknown>;
  content: string;
} {
  const trimmed = rawContent.trimStart();
  if (!trimmed.startsWith("---")) {
    return { frontmatter: {}, content: rawContent };
  }

  const endIdx = trimmed.indexOf("\n---", 3);
  if (endIdx === -1) {
    return { frontmatter: {}, content: rawContent };
  }

  const rawYaml = trimmed.slice(3, endIdx).trim();
  const bodyContent = trimmed.slice(endIdx + 4).trimStart();

  const frontmatter: Record<string, unknown> = {};
  const lines = rawYaml.split("\n");

  let currentKey: string | null = null;
  let currentObjKey: string | null = null;
  let inArrayKey: string | null = null;
  let inMultilineKey: string | null = null;
  let multilineAccumulator = "";

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Check for multiline continuation if previously started
    if (inMultilineKey) {
      if (line.endsWith('"') || line.endsWith("'")) {
        multilineAccumulator += " " + line.slice(0, -1);
        frontmatter[inMultilineKey] = multilineAccumulator.trim();
        inMultilineKey = null;
        multilineAccumulator = "";
      } else {
        multilineAccumulator += " " + line;
      }
      continue;
    }

    if (!line || line.startsWith("#")) continue;

    // Array item e.g. - "Architecture"
    if (line.startsWith("- ") && inArrayKey) {
      const val = cleanValue(line.slice(2));
      const arr = frontmatter[inArrayKey] as unknown[];
      if (Array.isArray(arr)) {
        arr.push(val);
      }
      continue;
    }

    // Nested object property (indented under e.g. author:)
    if (rawLine.startsWith("  ") && currentObjKey) {
      const colonIdx = line.indexOf(":");
      if (colonIdx !== -1) {
        const subKey = line.slice(0, colonIdx).trim();
        const subVal = cleanValue(line.slice(colonIdx + 1));
        const parentObj = frontmatter[currentObjKey] as Record<string, unknown>;
        if (parentObj && typeof parentObj === "object") {
          parentObj[subKey] = subVal;
        }
      }
      continue;
    }

    // Top-level key-value
    const colonIdx = line.indexOf(":");
    if (colonIdx !== -1) {
      inArrayKey = null;
      currentObjKey = null;

      const key = line.slice(0, colonIdx).trim();
      const rawVal = line.slice(colonIdx + 1).trim();

      if (!rawVal) {
        // Likely start of object or array
        currentKey = key;
        const nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
        if (nextLine.startsWith("- ")) {
          inArrayKey = key;
          frontmatter[key] = [];
        } else {
          currentObjKey = key;
          frontmatter[key] = {};
        }
        continue;
      }

      // Check if starting an unclosed multiline string
      if (
        (rawVal.startsWith('"') && !rawVal.endsWith('"')) ||
        (rawVal.startsWith("'") && !rawVal.endsWith("'")) ||
        rawVal === ">" ||
        rawVal === "|"
      ) {
        inMultilineKey = key;
        multilineAccumulator = rawVal.replace(/^["'>|]/, "");
        continue;
      }

      frontmatter[key] = cleanValue(rawVal);
      currentKey = key;
    }
  }

  return { frontmatter, content: bodyContent };
}

function cleanValue(val: string): unknown {
  const trimmed = val.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (!isNaN(Number(trimmed)) && trimmed !== "") return Number(trimmed);
  return trimmed;
}

/**
 * Calculates estimated reading time for a markdown body.
 */
export function calculateReadingTime(content: string): string {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(words / 200);
  return `${Math.max(1, minutes)} min read`;
}

// Module-level cache
let cachedPosts: BlogPost[] | null = null;

/**
 * Loads all raw MDX files using Vite's import.meta.glob with a Node fallback.
 */
function loadRawMdxFiles(): Record<string, string> {
  const files: Record<string, string> = {};

  // 1. Try Vite's import.meta.glob (works in RSC, SSR, and Edge runtime)
  try {
    // @ts-expect-error - import.meta.glob is a Vite feature
    const globFiles = import.meta.glob("/content/blog/*.mdx", {
      query: "?raw",
      import: "default",
      eager: true,
    });
    if (globFiles && Object.keys(globFiles).length > 0) {
      for (const [path, content] of Object.entries(globFiles)) {
        files[path] = content as string;
      }
      return files;
    }
  } catch {
    // Fall back to Node fs if running in Node.js test environment
  }

  // 2. Node.js fallback (for Vitest or standalone CLI scripts)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("node:path");

    const contentDir = path.resolve(process.cwd(), "content/blog");
    if (fs.existsSync(contentDir)) {
      const filenames = fs.readdirSync(contentDir);
      for (const file of filenames) {
        if (file.endsWith(".mdx") || file.endsWith(".md")) {
          const fullPath = path.join(contentDir, file);
          files[file] = fs.readFileSync(fullPath, "utf-8");
        }
      }
    }
  } catch {
    // In pure edge runtime with no files, return whatever was collected
  }

  return files;
}

/**
 * Parses and validates all blog posts against the BlogPostSchema.
 */
export function loadAllPosts(): BlogPost[] {
  if (cachedPosts) return cachedPosts;

  const rawFiles = loadRawMdxFiles();
  const posts: BlogPost[] = [];

  for (const [filepath, rawContent] of Object.entries(rawFiles)) {
    try {
      const { frontmatter, content } = parseFrontmatter(rawContent);

      // Infer slug from filepath if omitted
      if (!frontmatter.slug) {
        const basename = filepath.split("/").pop() || "";
        frontmatter.slug = basename.replace(/\.(mdx|md)$/, "");
      }

      // Automatically calculate readingTime if not provided
      if (!frontmatter.readingTime) {
        frontmatter.readingTime = calculateReadingTime(content);
      }

      // Validate with Zod
      const validatedMeta = BlogPostSchema.parse(frontmatter);

      posts.push({
        ...validatedMeta,
        content,
      });
    } catch (err) {
      console.error(`[Blog] Failed to validate post at ${filepath}:`, err);
      throw err;
    }
  }

  // Sort descending by date
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  cachedPosts = posts;
  return posts;
}

/**
 * Invalidate cached posts (useful for tests).
 */
export function clearPostsCache(): void {
  cachedPosts = null;
}

/**
 * Retrieves all published blog posts (or drafts if requested).
 */
export function getAllPosts(options: BlogFilterOptions = {}): BlogPost[] {
  const posts = loadAllPosts();
  return posts.filter((post) => {
    if (!options.includeDrafts && post.draft) {
      return false;
    }
    if (options.tag) {
      const searchTag = options.tag.toLowerCase();
      const hasTag = post.tags.some((t) => t.toLowerCase() === searchTag);
      if (!hasTag) return false;
    }
    if (options.query) {
      const q = options.query.toLowerCase();
      const match =
        post.title.toLowerCase().includes(q) ||
        post.description.toLowerCase().includes(q) ||
        post.tags.some((t) => t.toLowerCase().includes(q)) ||
        post.author.name.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}

/**
 * Retrieves a single post by slug.
 */
export function getPostBySlug(slug: string): BlogPost | null {
  const posts = loadAllPosts();
  return posts.find((p) => p.slug === slug) || null;
}

/**
 * Retrieves the featured article or defaults to the latest published post.
 */
export function getFeaturedPost(): BlogPost | null {
  const posts = getAllPosts();
  if (posts.length === 0) return null;
  return posts.find((p) => p.featured) || posts[0];
}

/**
 * Retrieves posts filtered by tag.
 */
export function getPostsByTag(tag: string): BlogPost[] {
  return getAllPosts({ tag });
}

/**
 * Lists all unique tags with their post counts.
 */
export function getAllTags(): { tag: string; count: number }[] {
  const posts = getAllPosts();
  const tagCounts: Record<string, number> = {};

  for (const post of posts) {
    for (const tag of post.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * Retrieves related posts based on overlapping tags, excluding the current post.
 */
export function getRelatedPosts(currentSlug: string, limit = 3): BlogPost[] {
  const current = getPostBySlug(currentSlug);
  if (!current) return [];

  const currentTags = new Set(current.tags.map((t) => t.toLowerCase()));
  const candidates = getAllPosts().filter((p) => p.slug !== currentSlug);

  const scored = candidates.map((p) => {
    let score = 0;
    for (const t of p.tags) {
      if (currentTags.has(t.toLowerCase())) {
        score += 1;
      }
    }
    return { post: p, score };
  });

  scored.sort((a, b) => b.score - a.score || new Date(b.post.date).getTime() - new Date(a.post.date).getTime());

  return scored.slice(0, limit).map((s) => s.post);
}
