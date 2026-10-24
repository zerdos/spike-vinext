"use client";

import React, { useMemo } from "react";
import { marked, Tokens } from "marked";
import { RoiCalculator } from "./roi-calculator";
import { McpPlaygroundEmbed } from "./mcp-playground-embed";
import { MountMidChat } from "@/components/mount-mid-chat";
import { McpConfigSnippet } from "./mcp-config-snippet";
import { Callout, CalloutType } from "./callout";
import { MermaidEmbed } from "./mermaid-embed";
import { HeroImageDisplay } from "./hero-image-display";
import { CodeBlock } from "@/components/markdown-renderer";
import { slugifyHeading } from "@/lib/blog/toc";
import { Check, Copy } from "lucide-react";

interface MdxRendererProps {
  content: string;
  className?: string;
}

/**
 * Parses JSX-like tag attributes into a JavaScript object.
 * Examples:
 *   defaultDevelopers={50} defaultTurns={200} highlightModelId="claude-sonnet-5-5" compact
 */
export function parseJsxProps(rawProps: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  if (!rawProps || !rawProps.trim()) return props;

  // Regex matches: prop="val", prop='val', prop={123}, prop={true}, prop={false}, prop
  const attrRegex = /([a-zA-Z0-9_-]+)(?:=(?:["']([^"']*)["']|\{([^}]+)\}))?/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(rawProps)) !== null) {
    const key = match[1];
    const stringVal = match[2];
    const exprVal = match[3];

    if (stringVal !== undefined) {
      props[key] = stringVal;
    } else if (exprVal !== undefined) {
      const trimmedExpr = exprVal.trim();
      if (trimmedExpr === "true") {
        props[key] = true;
      } else if (trimmedExpr === "false") {
        props[key] = false;
      } else if (!isNaN(Number(trimmedExpr))) {
        props[key] = Number(trimmedExpr);
      } else {
        // String or object literal without quotes
        props[key] = trimmedExpr.replace(/^["']|["']$/g, "");
      }
    } else {
      // Boolean prop flag like `compact`
      props[key] = true;
    }
  }

  return props;
}

type ContentSegment =
  | { type: "markdown"; content: string }
  | {
      type: "component";
      component: string;
      props: Record<string, unknown>;
      children?: string;
    };

export function splitContentSegments(rawContent: string): ContentSegment[] {
  const segments: ContentSegment[] = [];

  // Match supported JSX tags: self-closing or paired with children
  const tagNames = [
    "RoiCalculator",
    "TokenSavingsSimulator",
    "McpPlayground",
    "MountMidChat",
    "McpConfigSnippet",
    "Callout",
    "Mermaid",
    "HeroImageDisplay",
  ].join("|");

  const componentRegex = new RegExp(
    `<(?:(${tagNames}))([^>]*?)(?:\\/>|>([\\s\\S]*?)<\\/\\1>)`,
    "g"
  );

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = componentRegex.exec(rawContent)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      const mdChunk = rawContent.slice(lastIndex, matchIndex);
      if (mdChunk.trim()) {
        segments.push({ type: "markdown", content: mdChunk });
      }
    }

    const componentName = match[1];
    const rawAttrs = match[2] || "";
    const children = match[3];

    segments.push({
      type: "component",
      component: componentName,
      props: parseJsxProps(rawAttrs),
      children,
    });

    lastIndex = componentRegex.lastIndex;
  }

  if (lastIndex < rawContent.length) {
    const remaining = rawContent.slice(lastIndex);
    if (remaining.trim()) {
      segments.push({ type: "markdown", content: remaining });
    }
  }

  return segments;
}

export function MdxRenderer({ content, className = "" }: MdxRendererProps) {
  const segments = useMemo(() => splitContentSegments(content), [content]);

  return (
    <article
      className={`prose prose-invert max-w-none text-foreground leading-relaxed ${className}`}
    >
      {segments.map((seg, idx) => {
        if (seg.type === "markdown") {
          return <MarkdownBlock key={`md-${idx}`} content={seg.content} />;
        }

        // Render interactive React components
        switch (seg.component) {
          case "RoiCalculator":
          case "TokenSavingsSimulator":
            return (
              <RoiCalculator
                key={`roi-${idx}`}
                defaultDevelopers={seg.props.defaultDevelopers as number | undefined}
                defaultTurns={seg.props.defaultTurns as number | undefined}
                highlightModelId={seg.props.highlightModelId as string | undefined}
                compact={Boolean(seg.props.compact)}
                title={seg.props.title as string | undefined}
                description={seg.props.description as string | undefined}
              />
            );

          case "McpPlayground":
            return (
              <McpPlaygroundEmbed
                key={`mcp-${idx}`}
                initialCategory={seg.props.initialCategory as string | undefined}
                initialTool={seg.props.initialTool as string | undefined}
                prefillQuery={seg.props.prefillQuery as string | undefined}
                title={seg.props.title as string | undefined}
              />
            );

          case "MountMidChat":
            return (
              <MountMidChat
                key={`mount-${idx}`}
                highlightStep={seg.props.highlightStep as 1 | 2 | 3 | undefined}
                embedded={true}
              />
            );

          case "McpConfigSnippet":
            return (
              <McpConfigSnippet
                key={`config-${idx}`}
                defaultClient={
                  seg.props.defaultClient as
                    | "cursor"
                    | "claude"
                    | "windsurf"
                    | "cli"
                    | undefined
                }
                title={seg.props.title as string | undefined}
              />
            );

          case "Callout":
            return (
              <Callout
                key={`callout-${idx}`}
                type={(seg.props.type as CalloutType) || "info"}
                title={seg.props.title as string | undefined}
              >
                {seg.children ? <MarkdownBlock content={seg.children.trim()} /> : null}
              </Callout>
            );

          case "Mermaid":
            return (
              <MermaidEmbed
                key={`mermaid-${idx}`}
                chart={seg.children ? seg.children.trim() : (seg.props.chart as string) || ""}
                title={seg.props.title as string | undefined}
              />
            );

          case "HeroImageDisplay":
            return (
              <HeroImageDisplay
                key={`hero-${idx}`}
                heroImage={seg.props.heroImage as string}
                heroImagePrompt={seg.props.heroImagePrompt as string}
                title={seg.props.title as string}
              />
            );

          default:
            return null;
        }
      })}
    </article>
  );
}

/**
 * Standard Markdown AST block renderer using marked tokens
 */
function MarkdownBlock({ content }: { content: string }) {
  const tokens = useMemo(() => {
    try {
      return marked.lexer(content, { gfm: true, breaks: false });
    } catch {
      return [];
    }
  }, [content]);

  return <>{tokens.map((token, idx) => renderMarkedToken(token, idx))}</>;
}

function renderMarkedToken(token: Tokens.Generic, index: number | string): React.ReactNode {
  switch (token.type) {
    case "heading": {
      const headingText = token.text || "";
      const id = slugifyHeading(headingText);

      switch (token.depth) {
        case 1:
          return (
            <h1
              key={index}
              id={id}
              className="scroll-mt-24 font-display text-3xl sm:text-4xl font-black tracking-tight text-foreground mt-8 mb-4 border-b border-border/40 pb-2"
            >
              {headingText}
            </h1>
          );
        case 2:
          return (
            <h2
              key={index}
              id={id}
              className="scroll-mt-24 font-display text-2xl sm:text-3xl font-black tracking-tight text-foreground mt-8 mb-4 border-b border-border/40 pb-2"
            >
              {headingText}
            </h2>
          );
        case 3:
          return (
            <h3
              key={index}
              id={id}
              className="scroll-mt-24 font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-6 mb-3"
            >
              {headingText}
            </h3>
          );
        case 4:
        default:
          return (
            <h4
              key={index}
              id={id}
              className="scroll-mt-24 font-display text-lg font-bold tracking-tight text-foreground mt-5 mb-2"
            >
              {headingText}
            </h4>
          );
      }
    }

    case "paragraph":
      return (
        <p key={index} className="my-4 text-foreground/90 leading-relaxed text-sm sm:text-base">
          {token.tokens
            ? token.tokens.map((t: Tokens.Generic, i: number) =>
                renderInlineToken(t, `${index}-${i}`)
              )
            : token.text}
        </p>
      );

    case "code":
      return (
        <CodeBlock
          key={index}
          code={token.text}
          language={token.lang}
        />
      );

    case "blockquote":
      return (
        <blockquote
          key={index}
          className="my-5 border-l-4 border-primary/60 bg-muted/20 pl-4 py-2 italic text-foreground/80 rounded-r text-sm sm:text-base"
        >
          {token.tokens?.map((t: Tokens.Generic, i: number) =>
            renderMarkedToken(t, `${index}-${i}`)
          )}
        </blockquote>
      );

    case "list": {
      const ListTag = token.ordered ? "ol" : "ul";
      const listClass = token.ordered
        ? "my-4 ml-6 list-decimal space-y-1.5 text-sm sm:text-base text-foreground/90"
        : "my-4 ml-6 list-disc space-y-1.5 text-sm sm:text-base text-foreground/90";

      return (
        <ListTag key={index} start={token.start} className={listClass}>
          {token.items?.map((item: Tokens.ListItem, i: number) => (
            <li key={`${index}-${i}`} className="pl-1 leading-relaxed">
              {item.tokens
                ? item.tokens.map((t: Tokens.Generic, j: number) =>
                    renderMarkedToken(t, `${index}-${i}-${j}`)
                  )
                : item.text}
            </li>
          ))}
        </ListTag>
      );
    }

    case "table":
      return (
        <div key={index} className="my-6 w-full overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead className="border-b border-border/70 bg-muted/40 font-bold text-foreground">
              <tr>
                {token.header?.map((cell: Tokens.TableCell, i: number) => (
                  <th key={i} className="px-4 py-2.5 font-bold">
                    {cell.tokens
                      ? cell.tokens.map((t: Tokens.Generic, j: number) =>
                          renderInlineToken(t, `${index}-th-${i}-${j}`)
                        )
                      : cell.text}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono text-[12px] sm:text-xs">
              {token.rows?.map((row: Tokens.TableCell[], i: number) => (
                <tr key={i} className="hover:bg-muted/20 transition-colors">
                  {row.map((cell: Tokens.TableCell, j: number) => (
                    <td key={j} className="px-4 py-2.5 text-foreground/85">
                      {cell.tokens
                        ? cell.tokens.map((t: Tokens.Generic, k: number) =>
                            renderInlineToken(t, `${index}-td-${i}-${j}-${k}`)
                          )
                        : cell.text}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "hr":
      return <hr key={index} className="my-8 border-border/60" />;

    case "space":
      return null;

    default:
      if (token.text) {
        return <p key={index} className="my-3 text-foreground/90">{token.text}</p>;
      }
      return null;
  }
}

function renderInlineToken(token: Tokens.Generic, key: string): React.ReactNode {
  switch (token.type) {
    case "text":
      return token.text;

    case "strong":
      return (
        <strong key={key} className="font-bold text-foreground">
          {token.tokens
            ? token.tokens.map((t: Tokens.Generic, i: number) =>
                renderInlineToken(t, `${key}-${i}`)
              )
            : token.text}
        </strong>
      );

    case "em":
      return (
        <em key={key} className="italic text-foreground">
          {token.tokens
            ? token.tokens.map((t: Tokens.Generic, i: number) =>
                renderInlineToken(t, `${key}-${i}`)
              )
            : token.text}
        </em>
      );

    case "codespan":
      return (
        <code
          key={key}
          className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-xs text-primary font-medium border border-border/50"
        >
          {token.text}
        </code>
      );

    case "link":
      return (
        <a
          key={key}
          href={token.href}
          title={token.title || undefined}
          target={token.href.startsWith("http") ? "_blank" : undefined}
          rel={token.href.startsWith("http") ? "noopener noreferrer" : undefined}
          className="font-medium text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        >
          {token.tokens
            ? token.tokens.map((t: Tokens.Generic, i: number) =>
                renderInlineToken(t, `${key}-${i}`)
              )
            : token.text}
        </a>
      );

    case "image":
      return (
        <img
          key={key}
          src={token.href}
          alt={token.title || token.text || ""}
          className="my-4 rounded-lg border border-border/60 max-w-full"
          loading="lazy"
        />
      );

    default:
      return token.raw || token.text || null;
  }
}
