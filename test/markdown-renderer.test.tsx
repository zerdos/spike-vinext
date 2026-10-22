import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  MarkdownRenderer,
  CodeBlock,
  parseLangAndFilename,
} from "@/components/markdown-renderer";

describe("MarkdownRenderer & CodeBlock", () => {
  describe("parseLangAndFilename", () => {
    it("handles plain language", () => {
      expect(parseLangAndFilename("markdown")).toEqual({ language: "markdown" });
      expect(parseLangAndFilename("ts")).toEqual({ language: "ts" });
    });

    it("handles colon syntax for filename", () => {
      expect(parseLangAndFilename("markdown:README.md")).toEqual({
        language: "markdown",
        filename: "README.md",
      });
      expect(parseLangAndFilename("md:spec.md")).toEqual({
        language: "md",
        filename: "spec.md",
      });
    });

    it("handles space syntax for filename", () => {
      expect(parseLangAndFilename("markdown README.md")).toEqual({
        language: "markdown",
        filename: "README.md",
      });
      expect(parseLangAndFilename('md file="guide.md"')).toEqual({
        language: "md",
        filename: "guide.md",
      });
    });

    it("defaults to code for empty input", () => {
      expect(parseLangAndFilename("")).toEqual({ language: "code" });
      expect(parseLangAndFilename(undefined)).toEqual({ language: "code" });
    });
  });

  describe("CodeBlock for Markdown files", () => {
    it("defaults to Formatted view for markdown language and allows toggling to Raw", () => {
      const mdContent = "# Project Setup\n\nRun the following:\n- Step 1\n- Step 2";
      const { container } = render(<CodeBlock code={mdContent} language="markdown" />);

      // Should render formatted heading
      const heading = screen.getByRole("heading", { level: 1, name: "Project Setup" });
      expect(heading).toBeInTheDocument();

      // List items should be rendered as list elements
      expect(screen.getByText("Step 1")).toBeInTheDocument();
      expect(screen.getByText("Step 2")).toBeInTheDocument();

      // Buttons for Formatted and Raw view mode
      const rawBtn = screen.getByRole("button", { name: /view raw markdown/i });
      const formattedBtn = screen.getByRole("button", { name: /view formatted markdown/i });
      expect(rawBtn).toBeInTheDocument();
      expect(formattedBtn).toBeInTheDocument();

      // Click Raw to switch to code view
      fireEvent.click(rawBtn);

      // Now pre/code contains the raw content
      expect(container.querySelector("code")?.textContent).toContain("# Project Setup");

      // Click Formatted to switch back
      fireEvent.click(formattedBtn);
      expect(
        screen.getByRole("heading", { level: 1, name: "Project Setup" })
      ).toBeInTheDocument();
    });

    it("displays filename and md file badge when filename is provided", () => {
      render(
        <CodeBlock
          code="# Readme Content"
          language="markdown:README.md"
        />
      );

      expect(screen.getByText("README.md")).toBeInTheDocument();
      expect(screen.getByText("md file")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { level: 1, name: "Readme Content" })
      ).toBeInTheDocument();
    });

    it("copies markdown code to clipboard on copy click", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(<CodeBlock code="# Copiable Doc" language="md" />);

      const copyBtn = screen.getByRole("button", { name: /copy code to clipboard/i });
      fireEvent.click(copyBtn);

      expect(writeTextMock).toHaveBeenCalledWith("# Copiable Doc");
      expect(await screen.findByText("Copied")).toBeInTheDocument();
    });

    it("defaults to raw view for non-markdown code blocks", () => {
      const pyCode = 'def hello():\n    print("world")';
      const { container } = render(<CodeBlock code={pyCode} language="python" />);

      expect(screen.getByText("PYTHON")).toBeInTheDocument();
      expect(container.querySelector("code")?.textContent).toContain("def hello():");
      // Non-markdown code block does not show Formatted/Raw toggle
      expect(
        screen.queryByRole("button", { name: /view formatted markdown/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("MarkdownRenderer document formatting", () => {
    it("renders headings at appropriate levels", () => {
      const doc = "# H1 Title\n## H2 Subtitle\n### H3 Section\n#### H4 Subsection";
      render(<MarkdownRenderer content={doc} />);

      expect(screen.getByRole("heading", { level: 1, name: "H1 Title" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: "H2 Subtitle" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 3, name: "H3 Section" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 4, name: "H4 Subsection" })).toBeInTheDocument();
    });

    it("renders formatted lists (ordered and unordered)", () => {
      const doc = "- Bullet Alpha\n- Bullet Beta\n\n1. Numbered One\n2. Numbered Two";
      render(<MarkdownRenderer content={doc} />);

      expect(screen.getByText("Bullet Alpha")).toBeInTheDocument();
      expect(screen.getByText("Bullet Beta")).toBeInTheDocument();
      expect(screen.getByText("Numbered One")).toBeInTheDocument();
      expect(screen.getByText("Numbered Two")).toBeInTheDocument();
    });

    it("renders task list with checkboxes", () => {
      const doc = "- [x] Finished task\n- [ ] Pending task";
      render(<MarkdownRenderer content={doc} />);

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes).toHaveLength(2);
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();
    });

    it("renders bold, italic, inline code, and links", () => {
      const doc = "Here is **bold text**, *italic text*, `inline_code()`, and [Spike Land](https://spike.land).";
      render(<MarkdownRenderer content={doc} />);

      expect(screen.getByText("bold text")).toHaveClass("font-bold");
      expect(screen.getByText("italic text")).toHaveClass("italic");
      expect(screen.getByText("inline_code()")).toHaveClass("font-mono");

      const link = screen.getByRole("link", { name: /spike land/i });
      expect(link).toHaveAttribute("href", "https://spike.land");
      expect(link).toHaveAttribute("target", "_blank");
    });

    it("renders blockquotes with citation formatting", () => {
      const doc = "> Spike position-zero prompt caching eliminates 98.7% of redundant input tokens.";
      render(<MarkdownRenderer content={doc} />);

      const quote = screen.getByText(/Spike position-zero prompt caching eliminates/i);
      expect(quote.closest("blockquote")).toBeInTheDocument();
    });

    it("renders markdown tables with headers and rows", () => {
      const doc = `| Tool Name | Latency | Tokens |
|---|---|---|
| discover_tools | 12ms | 140 |
| mount_mcp_server | 45ms | 210 |`;

      render(<MarkdownRenderer content={doc} />);

      expect(screen.getByText("Tool Name")).toBeInTheDocument();
      expect(screen.getByText("Latency")).toBeInTheDocument();
      expect(screen.getByText("Tokens")).toBeInTheDocument();
      expect(screen.getByText("discover_tools")).toBeInTheDocument();
      expect(screen.getByText("12ms")).toBeInTheDocument();
      expect(screen.getByText("mount_mcp_server")).toBeInTheDocument();
    });

    it("renders horizontal rules", () => {
      const { container } = render(
        <MarkdownRenderer content={"Section 1\n\n---\n\nSection 2"} />
      );
      expect(container.querySelector("hr")).toBeInTheDocument();
    });

    it("safely sanitizes malicious javascript: links", () => {
      const doc = "[Click for free tokens](javascript:alert('pwned'))";
      render(<MarkdownRenderer content={doc} />);

      const link = screen.getByRole("link", { name: "Click for free tokens" });
      expect(link).toHaveAttribute("href", "#");
    });

    it("safely escapes raw HTML scripts to prevent XSS", () => {
      const doc = "Normal text <script>window.__hacked = true;</script>";
      render(<MarkdownRenderer content={doc} />);

      expect(screen.getByText(/Normal text/)).toBeInTheDocument();
      // Script tags must not be executed or injected as DOM elements
      expect(document.querySelector("script")).toBeNull();
    });

    it("returns null for empty or whitespace-only content", () => {
      const { container: c1 } = render(<MarkdownRenderer content="" />);
      expect(c1.firstChild).toBeNull();

      const { container: c2 } = render(<MarkdownRenderer content={"   \n\t  "} />);
      expect(c2.firstChild).toBeNull();
    });

    it("renders strikethrough (del) text", () => {
      render(<MarkdownRenderer content="~~deprecated tool~~" />);
      const delEl = screen.getByText("deprecated tool");
      expect(delEl.tagName).toBe("DEL");
      expect(delEl).toHaveClass("line-through");
    });

    it("differentiates internal and external links", () => {
      render(
        <MarkdownRenderer content="[Local Settings](/settings) and [Email](mailto:hi@spike.land)" />
      );

      const localLink = screen.getByRole("link", { name: "Local Settings" });
      expect(localLink).toHaveAttribute("href", "/settings");
      expect(localLink).not.toHaveAttribute("target");

      const mailtoLink = screen.getByRole("link", { name: "Email" });
      expect(mailtoLink).toHaveAttribute("href", "mailto:hi@spike.land");
      expect(mailtoLink).not.toHaveAttribute("target");
    });

    it("renders images with title and sanitized src", () => {
      render(
        <MarkdownRenderer content='![Diagram](https://spike.land/arch.png "Architecture") and ![Bad](javascript:alert(1))' />
      );

      const goodImg = screen.getByAltText("Diagram");
      expect(goodImg).toHaveAttribute("src", "https://spike.land/arch.png");
      expect(goodImg).toHaveAttribute("title", "Architecture");

      const badImg = screen.getByAltText("Bad");
      expect(badImg).toHaveAttribute("src", "#");
    });

    it("supports ordered list with non-1 starting number", () => {
      render(<MarkdownRenderer content={"5. Fifth step\n6. Sixth step"} />);
      const ol = screen.getByRole("list");
      expect(ol.tagName).toBe("OL");
      expect(ol).toHaveAttribute("start", "5");
      expect(screen.getByText("Fifth step")).toBeInTheDocument();
    });

    it("renders table with column alignment styles", () => {
      const tableMd = `| Left | Center | Right |
| :--- | :---: | ---: |
| L1 | C1 | R1 |`;

      const { container } = render(<MarkdownRenderer content={tableMd} />);
      const headers = container.querySelectorAll("th");
      expect(headers[0].style.textAlign).toBe("left");
      expect(headers[1].style.textAlign).toBe("center");
      expect(headers[2].style.textAlign).toBe("right");

      const cells = container.querySelectorAll("td");
      expect(cells[0].style.textAlign).toBe("left");
      expect(cells[1].style.textAlign).toBe("center");
      expect(cells[2].style.textAlign).toBe("right");
    });

    it("handles clipboard failure gracefully in CodeBlock", async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error("Permission denied")),
        },
      });

      render(<CodeBlock code="const x = 1;" language="typescript" />);
      const copyBtn = screen.getByRole("button", { name: /copy code to clipboard/i });

      // Should not throw
      expect(() => fireEvent.click(copyBtn)).not.toThrow();
    });

    it("caps recursion depth for deeply nested markdown code blocks", () => {
      const deepNested = "```markdown\n# Level 1\n```markdown\n# Level 2\n```\n```";
      const { container } = render(<MarkdownRenderer content={deepNested} depth={2} />);
      expect(container).toBeInTheDocument();
    });
  });
});
