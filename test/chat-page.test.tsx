import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ChatPage from "@/app/chat/page";

describe("ChatPage UI (/chat)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("prompts unauthenticated users to sign in", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: false, user: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    render(<ChatPage />);

    await waitFor(() => {
      expect(screen.getByText("Authentication Required")).toBeInTheDocument();
    });

    expect(screen.getByText("Customer Access Only")).toBeInTheDocument();
    const signInLink = screen.getByRole("link", { name: /sign in to access chat/i });
    expect(signInLink).toHaveAttribute("href", "/auth/signin?returnTo=/chat");
  });

  it("renders customer chat workspace when authenticated", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/auth/session")) {
        return new Response(
          JSON.stringify({
            authenticated: true,
            user: {
              id: "usr_cust_123",
              email: "alex@example.com",
              name: "Alex Customer",
              role: "customer",
              provider: "credentials",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not found", { status: 404 });
    });

    render(<ChatPage />);

    await waitFor(() => {
      expect(screen.getByText("alex@example.com")).toBeInTheDocument();
    });

    expect(screen.getByText("customer")).toBeInTheDocument();
    expect(screen.getByText(/Spike Land Agent Harness/i)).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /chat input message/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new session/i })).toBeInTheDocument();
  });

  it("sends message to /api/chat and renders agent response with tools used", async () => {
    let chatPayload: any = null;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/auth/session")) {
        return new Response(
          JSON.stringify({
            authenticated: true,
            user: {
              id: "usr_cust_123",
              email: "alex@example.com",
              name: "Alex Customer",
              role: "customer",
              provider: "credentials",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/api/chat")) {
        chatPayload = JSON.parse(init?.body as string);
        return new Response(
          JSON.stringify({
            sessionId: "sess_custom_test_123",
            response: "I discovered 3 scraping tools and mounted the web server.",
            messages: [
              { role: "user", content: chatPayload.message },
              {
                role: "assistant",
                content: "I discovered 3 scraping tools and mounted the web server.",
              },
            ],
            turns: 2,
            toolsUsed: ["discover_tools", "mount_mcp_server"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response("Not found", { status: 404 });
    });

    render(<ChatPage />);

    await waitFor(() => {
      expect(screen.getByText("alex@example.com")).toBeInTheDocument();
    });

    const textarea = screen.getByRole("textbox", { name: /chat input message/i });
    fireEvent.change(textarea, { target: { value: "Help me find web tools" } });

    const sendBtn = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(
        screen.getByText("I discovered 3 scraping tools and mounted the web server.")
      ).toBeInTheDocument();
    });

    expect(chatPayload).toBeDefined();
    expect(chatPayload.message).toBe("Help me find web tools");
    expect(screen.getByText("discover_tools")).toBeInTheDocument();
    expect(screen.getByText("mount_mcp_server")).toBeInTheDocument();
    expect(screen.getByText("2 turns")).toBeInTheDocument();
  });

  it("allows clicking a suggested prompt chip to initiate chat", async () => {
    let chatCalled = false;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/auth/session")) {
        return new Response(
          JSON.stringify({
            authenticated: true,
            user: {
              id: "usr_cust_123",
              email: "alex@example.com",
              name: "Alex Customer",
              role: "customer",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/api/chat")) {
        chatCalled = true;
        return new Response(
          JSON.stringify({
            sessionId: "sess_suggested_123",
            response: "Position-zero caching ensures prefix reuse with 0 extra tokens.",
            messages: [],
            turns: 1,
            toolsUsed: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response("Not found", { status: 404 });
    });

    render(<ChatPage />);

    await waitFor(() => {
      expect(screen.getByText("Position-Zero Prompt Caching")).toBeInTheDocument();
    });

    const promptBtn = screen.getByText("Position-Zero Prompt Caching");
    fireEvent.click(promptBtn);

    await waitFor(() => {
      expect(chatCalled).toBe(true);
      expect(
        screen.getByText(
          "Position-zero caching ensures prefix reuse with 0 extra tokens."
        )
      ).toBeInTheDocument();
    });
  });

  it("displays error message if /api/chat returns an error", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/auth/session")) {
        return new Response(
          JSON.stringify({
            authenticated: true,
            user: {
              id: "usr_cust_123",
              email: "alex@example.com",
              name: "Alex Customer",
              role: "customer",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/api/chat")) {
        return new Response(
          JSON.stringify({ error: "Agent capacity spike. Please try again." }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response("Not found", { status: 404 });
    });

    render(<ChatPage />);

    await waitFor(() => {
      expect(screen.getByText("alex@example.com")).toBeInTheDocument();
    });

    const textarea = screen.getByRole("textbox", { name: /chat input message/i });
    fireEvent.change(textarea, { target: { value: "Trigger error test" } });

    const sendBtn = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText("Agent Execution Error")).toBeInTheDocument();
      expect(
        screen.getByText(/Agent capacity spike\. Please try again\./i)
      ).toBeInTheDocument();
    });

    // Now test Retry Last Request: mock chat returning success on retry
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/auth/session")) {
        return new Response(
          JSON.stringify({
            authenticated: true,
            user: {
              id: "usr_cust_123",
              email: "alex@example.com",
              name: "Alex Customer",
              role: "customer",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/api/chat")) {
        return new Response(
          JSON.stringify({
            sessionId: "sess_recovered",
            response: "Recovered successfully on retry!",
            messages: [],
            turns: 1,
            toolsUsed: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response("Not found", { status: 404 });
    });

    const retryBtn = screen.getByRole("button", { name: /retry last request/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.queryByText("Agent Execution Error")).not.toBeInTheDocument();
      expect(screen.getByText("Recovered successfully on retry!")).toBeInTheDocument();
    });
  });

  it("resets conversation and generates a new session ID when clicking New Session", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/auth/session")) {
        return new Response(
          JSON.stringify({
            authenticated: true,
            user: {
              id: "usr_cust_123",
              email: "alex@example.com",
              name: "Alex Customer",
              role: "customer",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/api/chat")) {
        return new Response(
          JSON.stringify({
            sessionId: "sess_round_1",
            response: "First round response",
            messages: [],
            turns: 1,
            toolsUsed: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response("Not found", { status: 404 });
    });

    render(<ChatPage />);

    await waitFor(() => {
      expect(screen.getByText("alex@example.com")).toBeInTheDocument();
    });

    const textarea = screen.getByRole("textbox", { name: /chat input message/i });
    fireEvent.change(textarea, { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText("First round response")).toBeInTheDocument();
    });

    // Click New Session
    const newSessionBtn = screen.getByRole("button", { name: /new session/i });
    fireEvent.click(newSessionBtn);

    await waitFor(() => {
      expect(screen.queryByText("First round response")).not.toBeInTheDocument();
      expect(screen.getByText(/Spike Land Agent Harness/i)).toBeInTheDocument();
    });
  });

  it("displays formatted md output when agent returns an md file response in a code block", async () => {
    const mdFileResponse =
      "Here is the requested README.md documentation:\n\n```markdown:README.md\n# Spike Land Architecture\n\nHigh-performance Meta-MCP Gateway.\n\n## Features\n- Dynamic tool mounting\n- Position-zero caching\n```";

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/auth/session")) {
        return new Response(
          JSON.stringify({
            authenticated: true,
            user: {
              id: "usr_cust_123",
              email: "alex@example.com",
              name: "Alex Customer",
              role: "customer",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/api/chat")) {
        return new Response(
          JSON.stringify({
            sessionId: "sess_md_test",
            response: mdFileResponse,
            messages: [],
            turns: 1,
            toolsUsed: ["browser_markdown"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response("Not found", { status: 404 });
    });

    const { container } = render(<ChatPage />);

    await waitFor(() => {
      expect(screen.getByText("alex@example.com")).toBeInTheDocument();
    });

    const textarea = screen.getByRole("textbox", { name: /chat input message/i });
    fireEvent.change(textarea, { target: { value: "Show me README.md" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    // Wait for the formatted response to be rendered
    await waitFor(() => {
      expect(screen.getByText("README.md")).toBeInTheDocument();
      expect(screen.getByText("md file")).toBeInTheDocument();
    });

    // Verify formatted headings and list items are rendered inside the formatted output
    expect(
      screen.getByRole("heading", { level: 1, name: "Spike Land Architecture" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Features" })
    ).toBeInTheDocument();
    expect(screen.getByText("Dynamic tool mounting")).toBeInTheDocument();
    expect(screen.getByText("Position-zero caching")).toBeInTheDocument();

    // Verify the Formatted / Raw toggle is available and functional
    const rawBtn = screen.getByRole("button", { name: /view raw markdown/i });
    const formattedBtn = screen.getByRole("button", { name: /view formatted markdown/i });
    expect(rawBtn).toBeInTheDocument();
    expect(formattedBtn).toBeInTheDocument();

    // Switch to Raw view
    fireEvent.click(rawBtn);
    expect(container.querySelector("code")?.textContent).toContain(
      "# Spike Land Architecture"
    );

    // Switch back to Formatted view
    fireEvent.click(formattedBtn);
    expect(
      screen.getByRole("heading", { level: 1, name: "Spike Land Architecture" })
    ).toBeInTheDocument();
  });

  it("displays formatted md output when agent returns a raw markdown response", async () => {
    const rawMdResponse = `# Executive Summary

This is **high priority** for the agent.

| Metric | Target |
|---|---|
| Latency | <50ms |
| Tokens | 0% overhead |

> Zero-overhead prompt caching verified.`;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/auth/session")) {
        return new Response(
          JSON.stringify({
            authenticated: true,
            user: {
              id: "usr_cust_123",
              email: "alex@example.com",
              name: "Alex Customer",
              role: "customer",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/api/chat")) {
        return new Response(
          JSON.stringify({
            sessionId: "sess_raw_md",
            response: rawMdResponse,
            messages: [],
            turns: 1,
            toolsUsed: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response("Not found", { status: 404 });
    });

    render(<ChatPage />);

    await waitFor(() => {
      expect(screen.getByText("alex@example.com")).toBeInTheDocument();
    });

    const textarea = screen.getByRole("textbox", { name: /chat input message/i });
    fireEvent.change(textarea, { target: { value: "Summarize metrics" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Executive Summary" })
      ).toBeInTheDocument();
    });

    expect(screen.getByText("high priority")).toHaveClass("font-bold");
    expect(screen.getByText("Metric")).toBeInTheDocument();
    expect(screen.getByText("<50ms")).toBeInTheDocument();
    expect(screen.getByText("Zero-overhead prompt caching verified.")).toBeInTheDocument();
  });
});
