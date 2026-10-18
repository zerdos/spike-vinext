import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPage from "@/app/settings/page";

describe("SettingsPage UI", () => {
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

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Authentication Required")).toBeInTheDocument();
    });

    const signInLink = screen.getByRole("link", { name: /go to sign in/i });
    expect(signInLink).toHaveAttribute("href", "/auth/signin?returnTo=/settings");
  });

  it("renders password change form and API tokens configuration for authenticated admin@spike.land", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/auth/session")) {
        return new Response(
          JSON.stringify({
            authenticated: true,
            user: {
              id: "usr_admin_spike_land",
              email: "admin@spike.land",
              name: "Spike Admin",
              role: "admin",
              provider: "credentials",
              providerAccountId: "usr_admin_spike_land",
              emailVerified: true,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/api/settings/tokens")) {
        return new Response(
          JSON.stringify({
            tokens: [
              {
                id: "tok_admin_default_1",
                userId: "usr_admin_spike_land",
                name: "Default Admin MCP Key",
                tokenValue: "spk_live_admin_master_2026_key_9f8a7b6c",
                tokenPrefix: "spk_live_adm...",
                provider: "spike",
                scopes: ["mcp:tools:read", "mcp:tools:execute"],
                createdAt: "2026-01-01T00:00:00.000Z",
              },
            ],
            providerTokens: {
              SPIKE_API_KEY: "spk_live_admin_master_2026_key_9f8a7b6c",
              OPENAI_API_KEY: "sk-proj-initial",
              ANTHROPIC_API_KEY: "",
              GITHUB_TOKEN: "",
              CLOUDFLARE_API_TOKEN: "",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({}), { status: 200 });
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getAllByText("admin@spike.land").length).toBeGreaterThan(0);
    });

    expect(screen.getByText("API Tokens Configuration")).toBeInTheDocument();
    expect(screen.getByText("Change Password")).toBeInTheDocument();
    expect(screen.getByText("Personal MCP Tokens")).toBeInTheDocument();
    expect(screen.getByText("Default Admin MCP Key")).toBeInTheDocument();
  });

  it("allows changing password and saving API tokens", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/auth/session")) {
        return new Response(
          JSON.stringify({
            authenticated: true,
            user: {
              id: "usr_admin_spike_land",
              email: "admin@spike.land",
              name: "Spike Admin",
              role: "admin",
              provider: "credentials",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/api/settings/tokens") && (!init || !init.method || init.method === "GET")) {
        return new Response(
          JSON.stringify({
            tokens: [],
            providerTokens: {
              SPIKE_API_KEY: "spk_live_admin",
              OPENAI_API_KEY: "",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/api/settings/password") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Password updated successfully.",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/api/settings/tokens") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            success: true,
            message: "API tokens saved successfully.",
            providerTokens: {
              SPIKE_API_KEY: "spk_live_admin",
              OPENAI_API_KEY: "sk-proj-updated-key",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({}), { status: 200 });
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Change Password")).toBeInTheDocument();
    });

    // Submit password change
    fireEvent.change(screen.getByLabelText("Current Password"), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "newadminpass" },
    });
    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: "newadminpass" },
    });

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText("Password updated successfully.")).toBeInTheDocument();
    });

    // Update OpenAI API key and save
    fireEvent.change(screen.getByLabelText("OpenAI API Key"), {
      target: { value: "sk-proj-updated-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save api tokens/i }));

    await waitFor(() => {
      expect(screen.getByText("API tokens saved successfully.")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalled();
  });
});
