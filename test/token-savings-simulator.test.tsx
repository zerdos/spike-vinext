import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { TokenSavingsSimulator } from "@/components/token-savings-simulator";

describe("TokenSavingsSimulator Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it("renders simulator title, presets, and main result metrics", () => {
    render(<TokenSavingsSimulator />);

    expect(screen.getByText("Interactive Unit Economics Simulator")).toBeInTheDocument();
    expect(screen.getByText(/AI Agent Token Bills/i)).toBeInTheDocument();
    expect(screen.getByText("Seed Stage")).toBeInTheDocument();
    expect(screen.getByText("Series A Scale")).toBeInTheDocument();
    expect(screen.getByText("Enterprise Fleet")).toBeInTheDocument();

    expect(screen.getByText(/Team Size/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Tools in Catalog/i)).toBeInTheDocument();
    expect(screen.getByText(/Status Quo \(Static MCP\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Spike Land Edge Gateway/i)).toBeInTheDocument();
  });

  it("switches to Enterprise Fleet preset when clicked", () => {
    render(<TokenSavingsSimulator />);

    const enterpriseBtn = screen.getByRole("button", { name: /Enterprise Fleet/i });
    fireEvent.click(enterpriseBtn);

    expect(screen.getAllByText("100 devs").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("220 turns/day")).toBeInTheDocument();
    expect(screen.getByText("750 tools")).toBeInTheDocument();
  });

  it("switches to Seed Stage preset when clicked", () => {
    render(<TokenSavingsSimulator />);

    const seedBtn = screen.getByRole("button", { name: /Seed Stage/i });
    fireEvent.click(seedBtn);

    expect(screen.getByText("5 devs")).toBeInTheDocument();
    expect(screen.getByText("80 turns/day")).toBeInTheDocument();
    expect(screen.getByText("85 tools")).toBeInTheDocument();
  });

  it("allows selecting different LLM models", () => {
    render(<TokenSavingsSimulator />);

    const gpt6Btn = screen.getByRole("button", { name: /GPT-6 Astra/i });
    fireEvent.click(gpt6Btn);

    expect(screen.getByText("OpenAI")).toBeInTheDocument();
  });

  it("copies investor summary to clipboard when copy button is clicked", async () => {
    render(<TokenSavingsSimulator />);

    const copyBtn = screen.getByRole("button", { name: /Copy Investor One-Pager/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
