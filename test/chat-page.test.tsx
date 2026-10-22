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
});
