import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Home from "@/app/page";

describe("Landing Page (MCP Server - Spike Land)", () => {
  it("renders header, hero headline, and key metric counters", () => {
    render(<Home />);

    // Headline and brand
    expect(screen.getByText(/455 AI Tools\./i)).toBeInTheDocument();
    expect(screen.getByText(/One Protocol\./i)).toBeInTheDocument();
    expect(screen.getByText(/Progressive Disclosure MCP/i)).toBeInTheDocument();
    expect(screen.getByText(/Position-Zero Broker Meta-Tools/i)).toBeInTheDocument();

    // Metrics
    expect(screen.getByText("455")).toBeInTheDocument();
    expect(screen.getByText("88")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Gateway Tools")).toBeInTheDocument();
  });

  it("renders How It Works section with 3 progressive disclosure steps and architectural comparison table", () => {
    render(<Home />);

    expect(screen.getByText("How It Works")).toBeInTheDocument();
    expect(screen.getByText("Connect")).toBeInTheDocument();
    expect(screen.getByText("Discover")).toBeInTheDocument();
    expect(screen.getByText("Activate")).toBeInTheDocument();
    expect(
      screen.getByText(/Why Stateful tools\/list Mutation Fails Under MCP 2026-07-28/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Deterministic Capability Packs & Virtual Gateways/i)
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
    expect(screen.getByText(/455 AI Tools\./i)).toBeInTheDocument();
    expect(screen.getByText("Interactive Playground")).toBeInTheDocument();
  });
});

