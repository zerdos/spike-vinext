import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Home from "@/app/page";

describe("Landing Page (MCP Server - Spike Land)", () => {
  it("renders header, hero headline, and key metric counters", () => {
    render(<Home />);

    // Headline and brand
    expect(screen.getByRole("heading", { level: 1, name: /Add a new MCP server mid-chat\./i })).toBeInTheDocument();
    expect(screen.getByText(/Mid-chat mounting — now in preview/i)).toBeInTheDocument();
    expect(screen.getByText(/The only tools your AI ever sees/i)).toBeInTheDocument();
    expect(screen.getAllByText("mount_mcp_server").length).toBeGreaterThan(0);

    // Metrics
    expect(screen.getByText("455")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("Gateway Tools")).toBeInTheDocument();
  });

  it("renders How It Works section with 3 progressive disclosure steps and architectural comparison table", () => {
    render(<Home />);

    expect(screen.getByText("How It Works")).toBeInTheDocument();
    expect(screen.getByText("Connect")).toBeInTheDocument();
    expect(screen.getByText("Discover")).toBeInTheDocument();
    expect(screen.getByText("Activate")).toBeInTheDocument();
    expect(
      screen.getByText(/Why we never change the tool list your AI sees/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ready-made tool packs, plus a link for each team/i)
    ).toBeInTheDocument();
  });

  it("allows switching tabs in the Get Connected section including Virtual Gateway (Pattern C)", () => {
    render(<Home />);

    expect(screen.getByText("Get Connected")).toBeInTheDocument();

    // Default tab is Claude Desktop
    expect(screen.getByText(/claude_desktop_config\.json/i)).toBeInTheDocument();

    // Click Claude Code tab
    const claudeCodeTab = screen.getByRole("tab", { name: /Claude Code/i });
    fireEvent.click(claudeCodeTab);
    expect(screen.getByText(/claude mcp add spike-land/i)).toBeInTheDocument();

    // Click Cursor tab
    const cursorTab = screen.getByRole("tab", { name: /Cursor/i });
    fireEvent.click(cursorTab);
    expect(screen.getByText(/cursor-mcp-settings\.json/i)).toBeInTheDocument();

    // Click Virtual Gateway tab
    const vgTab = screen.getByRole("tab", { name: /Virtual Gateway/i });
    fireEvent.click(vgTab);
    expect(screen.getByText(/virtual-gateway-mcp\.json/i)).toBeInTheDocument();

    // Click HTTP tab
    const httpTab = screen.getByRole("tab", { name: /HTTP/i });
    fireEvent.click(httpTab);
    expect(screen.getByText(/curl request/i)).toBeInTheDocument();
  });

  it("renders interactive playground and allows tool execution", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: {
            content: [{ type: "text", text: JSON.stringify({ status: "success" }) }],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    render(<Home />);

    expect(screen.getByText("Interactive Playground")).toBeInTheDocument();
    expect(screen.getAllByText("Platform Core").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Code Mode").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Meeting Notes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Browser Run").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MCP Registry").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SerpApi Search").length).toBeGreaterThan(0);

    // Verify mock-only categories are NOT in the playground
    expect(screen.queryByText("AI & Creative")).not.toBeInTheDocument();
    expect(screen.queryByText("First-Party Apps")).not.toBeInTheDocument();
    expect(screen.queryByText("Agents & Automation")).not.toBeInTheDocument();
    expect(screen.queryByText("Content & Media")).not.toBeInTheDocument();
    expect(screen.queryByText("Marketing & Growth")).not.toBeInTheDocument();
    expect(screen.queryByText("Commerce & Admin")).not.toBeInTheDocument();

    // Execute tool button
    const executeButton = screen.getByRole("button", { name: /Execute Tool/i });
    expect(executeButton).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(executeButton);
    });

    expect(screen.getByText("Interactive Playground")).toBeInTheDocument();
  });

  it("renders footer and newsletter subscription form", () => {
    render(<Home />);

    expect(screen.getByText("Subscribe to updates")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Subscribe/i })).toBeInTheDocument();
    expect(screen.getByText(/© 2026 Spike Land\. All rights reserved\./i)).toBeInTheDocument();
  });

  it("renders McpPage at /mcp route correctly", async () => {
    const { default: McpPage } = await import("@/app/mcp/page");
    render(<McpPage />);
    expect(screen.getByRole("heading", { level: 1, name: /mid-chat/i })).toBeInTheDocument();
    expect(screen.getByText("Interactive Playground")).toBeInTheDocument();
  });

  it("walks through mounting a server mid-chat", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /Your agent plugs in the server and keeps working/i })
    ).toBeInTheDocument();

    // Defaults to the mount step
    const mountStep = screen.getByRole("button", { name: /It plugs the server in/i });
    expect(mountStep).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Mounted "postgres-mcp" as pg \(14 tools\)/)).toBeInTheDocument();

    // Advance to the schema lookup
    fireEvent.click(screen.getByRole("button", { name: /Next step/i }));
    expect(screen.getByRole("button", { name: /It looks up one tool/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Columns, types and indexes for a table/)).toBeInTheDocument();

    // Jump straight to running it
    fireEvent.click(screen.getByRole("button", { name: /It runs it/i }));
    expect(screen.getByRole("button", { name: /Start again/i })).toBeInTheDocument();

    // Honest limits are spelled out
    expect(screen.getByText(/Servers that only run on your laptop stay there/i)).toBeInTheDocument();
    expect(screen.getByText(/Your keys never go into the chat/i)).toBeInTheDocument();
  });
});

