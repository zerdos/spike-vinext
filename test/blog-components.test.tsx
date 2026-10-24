import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BlogCard } from "@/components/blog/blog-card";
import { HeroImageDisplay } from "@/components/blog/hero-image-display";
import { Callout } from "@/components/blog/callout";
import { MdxRenderer } from "@/components/blog/mdx-components";
import { BlogPost } from "@/lib/blog/schema";

describe("Blog UI Components & Rendering", () => {
  const samplePost: BlogPost = {
    title: "Slashing Agent Token Costs by 98.7%",
    slug: "slashing-agent-token-costs-position-zero-cache",
    description: "Preserving LLM Position-Zero Prefix Caches.",
    date: "2026-10-23",
    author: {
      name: "Spike Land Engineering",
      role: "Context Systems",
      avatar: "/authors/spike-team.png",
      twitter: "@spikeland",
    },
    heroImage: "/blog/slashing-agent-token-costs/hero.svg",
    heroImagePrompt: "A high-precision architectural visualization with cyan prompt cache blocks.",
    tags: ["Architecture", "MCP"],
    readingTime: "7 min read",
    featured: true,
    draft: false,
    content: "## Overview\n\nPreserving prompt caches is critical.",
  };

  it("renders BlogCard with image, tags, and author info", () => {
    render(<BlogCard post={samplePost} />);

    expect(screen.getByText("Slashing Agent Token Costs by 98.7%")).toBeDefined();
    expect(screen.getByText("Preserving LLM Position-Zero Prefix Caches.")).toBeDefined();
    expect(screen.getByText("#Architecture")).toBeDefined();
    expect(screen.getByText("#MCP")).toBeDefined();
    expect(screen.getByText("Spike Land Engineering")).toBeDefined();

    const [heroImg, avatarImg] = screen.getAllByRole("img");
    expect(heroImg.getAttribute("src")).toBe("/blog/slashing-agent-token-costs/hero.svg");
    expect(heroImg.getAttribute("alt")).toBe(samplePost.heroImagePrompt);
    expect(avatarImg.getAttribute("src")).toBe("/authors/spike-team.png");
  });

  it("renders HeroImageDisplay and handles Copy Prompt click", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(
      <HeroImageDisplay
        heroImage={samplePost.heroImage}
        heroImagePrompt={samplePost.heroImagePrompt}
        title={samplePost.title}
      />
    );

    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBe(samplePost.heroImage);
    expect(img.getAttribute("alt")).toBe(samplePost.heroImagePrompt);

    const copyBtn = screen.getByRole("button", { name: /Copy hero image prompt/i });
    expect(copyBtn).toBeDefined();

    fireEvent.click(copyBtn);
    expect(writeTextMock).toHaveBeenCalledWith(samplePost.heroImagePrompt);
  });

  it("renders Callout container with custom title and child content", () => {
    render(
      <Callout type="tip" title="Position-Zero Rule">
        <p>Never mutate tools/list mid-session.</p>
      </Callout>
    );

    expect(screen.getByText("Position-Zero Rule")).toBeDefined();
    expect(screen.getByText("Never mutate tools/list mid-session.")).toBeDefined();
  });

  it("renders MdxRenderer with both Markdown and embedded Callout", () => {
    const rawMdx = `
## Heading Two

Standard paragraph text.

<Callout type="warning" title="Prefix Invariant">
Prefix caching operates left to right.
</Callout>

More markdown prose.
`;

    render(<MdxRenderer content={rawMdx} />);

    expect(screen.getByText("Heading Two")).toBeDefined();
    expect(screen.getByText("Standard paragraph text.")).toBeDefined();
    expect(screen.getByText("Prefix Invariant")).toBeDefined();
    expect(screen.getByText("Prefix caching operates left to right.")).toBeDefined();
    expect(screen.getByText("More markdown prose.")).toBeDefined();
  });
});
