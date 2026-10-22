"use client";

import React, { useState } from "react";
import { marked, Tokens } from "marked";
import {
  Check,
  Copy,
  Eye,
  Code as CodeIcon,
  FileText,
  ExternalLink,
} from "lucide-react";

export interface MarkdownRendererProps {
  content: string;
  className?: string;
  depth?: number;
}

/**
 * Extracts language and optional filename from code block info string.
 * Examples:
 *   "markdown:README.md" -> { language: "markdown", filename: "README.md" }
 *   "md" -> { language: "md" }
 *   "typescript index.ts" -> { language: "typescript", filename: "index.ts" }
 */
export function parseLangAndFilename(rawLang?: string): {
  language: string;
  filename?: string;
} {
  if (!rawLang || !rawLang.trim()) {
    return { language: "code" };
  }

  const trimmed = rawLang.trim();

  // Pattern: lang:filename (e.g. markdown:README.md or md:prd.md)
  if (trimmed.includes(":")) {
    const [lang, ...rest] = trimmed.split(":");
    return {
      language: lang.trim().toLowerCase() || "code",
      filename: rest.join(":").trim(),
    };
  }

  // Pattern: lang filename (e.g. "markdown README.md" or "md file=demo.md")
  const parts = trimmed.split(/\s+/);
  if (parts.length > 1) {
    const lang = parts[0].toLowerCase();
    const filenamePart = parts
      .slice(1)
      .join(" ")
      .replace(/^(?:file|title)=["']?|["']$/g, "");
    return {
      language: lang || "code",
      filename: filenamePart,
    };
  }

  return { language: trimmed.toLowerCase() };
}

export function CodeBlock({
  code,
  language,
  depth = 0,
}: {
  code: string;
  language?: string;
  depth?: number;
}) {
  const [copied, setCopied] = useState(false);
  const parsed = parseLangAndFilename(language);

  const isMarkdown =
    parsed.language === "markdown" ||
    parsed.language === "md" ||
    (parsed.filename ? parsed.filename.toLowerCase().endsWith(".md") : false);

  // Markdown blocks default to formatted view; other languages default to raw code
  const [viewMode, setViewMode] = useState<"formatted" | "raw">(
    isMarkdown ? "formatted" : "raw"
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write failures
    }
  };

  const displayName = parsed.filename
    ? parsed.filename
    : isMarkdown
    ? "MARKDOWN DOCUMENT"
    : parsed.language.toUpperCase();

  return (
    <div
      className="my-3 rounded-md border-2 border-[#111315] bg-[#111315] text-[#F5F4F0] overflow-hidden shadow-xs"
      data-testid="code-block"
      data-language={parsed.language}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#1F2428] border-b border-[#30363D] text-[11px] font-mono select-none">
        <div className="flex items-center gap-1.5 min-w-0">
          {isMarkdown ? (
            <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
          ) : (
            <CodeIcon className="w-3.5 h-3.5 text-[#C8C5BC] shrink-0" />
          )}
          <span className="text-[#F5F4F0] font-semibold truncate">
            {displayName}
          </span>
          {isMarkdown && parsed.filename && (
            <span className="hidden sm:inline-block text-[9px] uppercase px-1 py-0.2 rounded bg-primary/20 text-primary border border-primary/30">
              md file
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Format / Raw toggle for Markdown */}
          {isMarkdown && (
            <div className="flex items-center rounded border border-[#30363D] bg-[#111315] p-0.5 text-[10px]">
              <button
                type="button"
                onClick={() => setViewMode("formatted")}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                  viewMode === "formatted"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-[#C8C5BC] hover:text-[#F5F4F0]"
                }`}
                aria-label="View formatted markdown"
                title="View formatted markdown"
              >
                <Eye className="w-3 h-3" />
                <span>Formatted</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("raw")}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                  viewMode === "raw"
                    ? "bg-[#30363D] text-[#F5F4F0] font-bold"
                    : "text-[#C8C5BC] hover:text-[#F5F4F0]"
                }`}
                aria-label="View raw markdown"
                title="View raw markdown"
              >
                <CodeIcon className="w-3 h-3" />
                <span>Raw</span>
              </button>
            </div>
          )}

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 text-[#C8C5BC] hover:text-[#F5F4F0] transition-colors py-0.5 px-1"
            aria-label="Copy code to clipboard"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#0D7A5F]" />
                <span className="text-[#0D7A5F]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isMarkdown && viewMode === "formatted" ? (
        <div className="p-4 bg-card text-foreground overflow-x-auto">
          {depth < 2 ? (
            <MarkdownRenderer content={code} depth={depth + 1} />
          ) : (
            <pre className="text-xs font-mono whitespace-pre-wrap">{code}</pre>
          )}
        </div>
      ) : (
        <pre className="p-3 overflow-x-auto text-xs font-mono leading-relaxed">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

function sanitizeHref(href?: string): string {
  if (!href) return "#";
  const trimmed = href.trim();
  if (/^(?:https?:\/\/|\/|#|mailto:)/i.test(trimmed)) {
    return trimmed;
  }
  return "#";
}

function renderInlineToken(
  token: Tokens.Generic,
  key: string | number
): React.ReactNode {
  switch (token.type) {
    case "text":
      if ("tokens" in token && Array.isArray(token.tokens) && token.tokens.length > 0) {
        return (
          <React.Fragment key={key}>
            {token.tokens.map((t: Tokens.Generic, i: number) =>
              renderInlineToken(t, `${key}-${i}`)
            )}
          </React.Fragment>
        );
      }
      return <React.Fragment key={key}>{token.text || token.raw}</React.Fragment>;

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
        <em key={key} className="italic">
          {token.tokens
            ? token.tokens.map((t: Tokens.Generic, i: number) =>
                renderInlineToken(t, `${key}-${i}`)
              )
            : token.text}
        </em>
      );

    case "del":
      return (
        <del key={key} className="line-through opacity-75">
          {token.tokens
            ? token.tokens.map((t: Tokens.Generic, i: number) =>
                renderInlineToken(t, `${key}-${i}`)
              )
            : token.text}
        </del>
      );

    case "codespan":
      return (
        <code
          key={key}
          className="font-mono text-xs px-1.5 py-0.5 rounded bg-secondary/80 border border-[#111315]/20 text-foreground font-semibold"
        >
          {token.text}
        </code>
      );

    case "link": {
      const safeHref = sanitizeHref(token.href);
      const isExternal = safeHref.startsWith("http");
      return (
        <a
          key={key}
          href={safeHref}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5"
        >
          {token.tokens
            ? token.tokens.map((t: Tokens.Generic, i: number) =>
                renderInlineToken(t, `${key}-${i}`)
              )
            : token.text}
          {isExternal && <ExternalLink className="w-3 h-3 inline shrink-0" />}
        </a>
      );
    }

    case "image": {
      const safeSrc = sanitizeHref(token.href);
      return (
        <img
          key={key}
          src={safeSrc}
          alt={token.text || ""}
          title={token.title || undefined}
          className="max-w-full rounded border border-[#111315]/20 my-2"
          loading="lazy"
        />
      );
    }

    case "escape":
      return <React.Fragment key={key}>{token.text}</React.Fragment>;

    case "html":
      // Safely render HTML as plain text to prevent XSS
      return <React.Fragment key={key}>{token.text || token.raw}</React.Fragment>;

    default:
      if ("tokens" in token && Array.isArray(token.tokens)) {
        return (
          <React.Fragment key={key}>
            {token.tokens.map((t: Tokens.Generic, i: number) =>
              renderInlineToken(t, `${key}-${i}`)
            )}
          </React.Fragment>
        );
      }
      return <React.Fragment key={key}>{token.text || token.raw}</React.Fragment>;
  }
}

function renderBlockToken(
  token: Tokens.Generic,
  key: string | number,
  depth: number
): React.ReactNode {
  switch (token.type) {
    case "heading": {
      const children = token.tokens
        ? token.tokens.map((t: Tokens.Generic, i: number) =>
            renderInlineToken(t, `${key}-${i}`)
          )
        : token.text;

      switch (token.depth) {
        case 1:
          return (
            <h1
              key={key}
              className="text-xl sm:text-2xl font-bold font-display tracking-tight text-foreground mt-4 mb-2 pb-1.5 border-b-2 border-[#111315]/20 first:mt-0"
            >
              {children}
            </h1>
          );
        case 2:
          return (
            <h2
              key={key}
              className="text-lg sm:text-xl font-bold font-display tracking-tight text-foreground mt-3.5 mb-2 pb-1 border-b border-[#111315]/10 first:mt-0"
            >
              {children}
            </h2>
          );
        case 3:
          return (
            <h3
              key={key}
              className="text-base sm:text-lg font-bold font-display text-foreground mt-3 mb-1.5 first:mt-0"
            >
              {children}
            </h3>
          );
        case 4:
          return (
            <h4
              key={key}
              className="text-sm sm:text-base font-semibold font-sans text-foreground mt-2.5 mb-1 first:mt-0"
            >
              {children}
            </h4>
          );
        case 5:
        case 6:
        default:
          return (
            <h5
              key={key}
              className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground mt-2 mb-1 first:mt-0"
            >
              {children}
            </h5>
          );
      }
    }

    case "paragraph":
      return (
        <p key={key} className="leading-relaxed mb-2.5 last:mb-0">
          {token.tokens
            ? token.tokens.map((t: Tokens.Generic, i: number) =>
                renderInlineToken(t, `${key}-${i}`)
              )
            : token.text}
        </p>
      );

    case "list": {
      const isOrdered = !!token.ordered;
      const ListTag = isOrdered ? "ol" : "ul";
      const startProp = isOrdered && token.start ? token.start : undefined;

      return (
        <ListTag
          key={key}
          start={startProp}
          className={`${
            isOrdered ? "list-decimal" : "list-disc"
          } pl-5 my-2.5 space-y-1 leading-relaxed`}
        >
          {token.items?.map((item: Tokens.ListItem, i: number) => (
            <li
              key={`${key}-${i}`}
              className={item.task ? "list-none flex items-start gap-2 -ml-5" : ""}
            >
              {item.task && (
                <input
                  type="checkbox"
                  checked={!!item.checked}
                  readOnly
                  className="mt-1 h-3.5 w-3.5 rounded border border-[#111315] accent-primary shrink-0"
                  aria-label="Task item"
                />
              )}
              <div>
                {item.tokens
                  ? item.tokens.map((t: Tokens.Generic, ti: number) =>
                      t.type === "text" || !("tokens" in t)
                        ? renderInlineToken(t, `${key}-${i}-${ti}`)
                        : renderBlockToken(t, `${key}-${i}-${ti}`, depth)
                    )
                  : item.text}
              </div>
            </li>
          ))}
        </ListTag>
      );
    }

    case "blockquote":
      return (
        <blockquote
          key={key}
          className="border-l-4 border-primary bg-secondary/30 pl-3.5 pr-2.5 py-2 my-2.5 rounded-r italic text-foreground/90 space-y-1.5"
        >
          {token.tokens
            ? token.tokens.map((t: Tokens.Generic, i: number) =>
                renderBlockToken(t, `${key}-${i}`, depth)
              )
            : token.text}
        </blockquote>
      );

    case "table":
      return (
        <div
          key={key}
          className="my-3 overflow-x-auto rounded-md border-2 border-[#111315]"
        >
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-secondary border-b-2 border-[#111315]">
                {token.header?.map((cell: Tokens.TableCell, i: number) => (
                  <th
                    key={i}
                    className="p-2.5 font-mono font-bold text-foreground border-r border-[#111315]/20 last:border-r-0"
                    style={{ textAlign: cell.align || "left" }}
                  >
                    {cell.tokens
                      ? cell.tokens.map((t: Tokens.Generic, ti: number) =>
                          renderInlineToken(t, `${key}-th-${i}-${ti}`)
                        )
                      : cell.text}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {token.rows?.map((row: Tokens.TableCell[], ri: number) => (
                <tr
                  key={ri}
                  className="border-b border-[#C8C5BC] last:border-b-0 hover:bg-secondary/20 transition-colors"
                >
                  {row.map((cell: Tokens.TableCell, ci: number) => (
                    <td
                      key={ci}
                      className="p-2.5 border-r border-[#C8C5BC]/40 last:border-r-0"
                      style={{ textAlign: cell.align || "left" }}
                    >
                      {cell.tokens
                        ? cell.tokens.map((t: Tokens.Generic, ti: number) =>
                            renderInlineToken(t, `${key}-td-${ri}-${ci}-${ti}`)
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
      return <hr key={key} className="my-4 border-t-2 border-[#111315]/20" />;

    case "code":
      return (
        <CodeBlock
          key={key}
          code={token.text}
          language={token.lang}
          depth={depth}
        />
      );

    case "space":
      return null;

    default:
      if ("tokens" in token && Array.isArray(token.tokens)) {
        return (
          <div key={key}>
            {token.tokens.map((t: Tokens.Generic, i: number) =>
              renderBlockToken(t, `${key}-${i}`, depth)
            )}
          </div>
        );
      }
      return token.text ? (
        <p key={key} className="leading-relaxed mb-2 last:mb-0">
          {token.text}
        </p>
      ) : null;
  }
}

export function MarkdownRenderer({
  content,
  className = "",
  depth = 0,
}: MarkdownRendererProps) {
  if (!content || !content.trim()) {
    return null;
  }

  // Use marked.lexer to produce structured tokens synchronously and safely
  const tokens = marked.lexer(content);

  return (
    <div
      className={`text-sm leading-relaxed break-words text-foreground ${className}`}
      data-testid="markdown-content"
    >
      {tokens.map((token, idx) => renderBlockToken(token, idx, depth))}
    </div>
  );
}
