import { z } from "zod";

export const AuthorSchema = z.object({
  name: z.string().min(1, "Author name is required"),
  role: z.string().default("Contributor"),
  avatar: z.string().default("/authors/spike-team.png"),
  twitter: z.string().optional(),
  github: z.string().optional(),
});

export const BlogPostSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(140),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  description: z.string().min(10, "Description must be at least 10 characters").max(400),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must follow YYYY-MM-DD format"),
  updatedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  author: AuthorSchema,

  // MANDATORY HERO IMAGE & PROMPT POLICY
  heroImage: z.string().min(1, "A hero image path is mandatory for all blog articles."),
  heroImagePrompt: z
    .string()
    .min(20, "A detailed hero image generation prompt is mandatory and serves as the screen reader alt description."),

  tags: z.array(z.string()).min(1, "At least one tag is required"),
  readingTime: z.string().optional(),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
  canonicalUrl: z.string().url().optional(),
});

export type Author = z.infer<typeof AuthorSchema>;
export type BlogPostMetadata = z.infer<typeof BlogPostSchema>;

export type BlogPost = BlogPostMetadata & {
  content: string; // Raw MDX / markdown body content
};

export interface BlogFilterOptions {
  tag?: string;
  query?: string;
  includeDrafts?: boolean;
}
