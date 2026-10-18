import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import SignInPage from "@/app/auth/signin/page";

describe("SignInPage", () => {
  it("renders username and password login form", async () => {
    const page = await SignInPage({});
    render(page);

    const usernameInput = screen.getByLabelText(/username or email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const signInButton = screen.getByRole("button", { name: /^sign in$/i });

    expect(usernameInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(signInButton).toBeInTheDocument();
  });

  it("submits credentials to /api/auth/signin/credentials", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          authenticated: true,
          returnTo: "/settings",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const page = await SignInPage({
      searchParams: Promise.resolve({ returnTo: "/settings" }),
    });
    render(page);

    fireEvent.change(screen.getByLabelText(/username or email/i), {
      target: { value: "admin@spike.land" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "admin" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/auth/signin/credentials",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          username: "admin@spike.land",
          password: "admin",
          returnTo: "/settings",
        }),
      })
    );
    fetchSpy.mockRestore();
  });

  it("renders WorkOS sign-in button linking to /login", async () => {
    const page = await SignInPage({});
    render(page);

    const workosButton = screen.getByRole("link", { name: /continue with workos/i });
    expect(workosButton).toBeInTheDocument();
    expect(workosButton).toHaveAttribute("href", "/login");
  });

  it("renders Google sign-in button linking to /api/auth/signin/google", async () => {
    const page = await SignInPage({});
    render(page);

    expect(screen.getByText("Welcome to Spike Land")).toBeInTheDocument();

    const googleButton = screen.getByRole("link", { name: /continue with google/i });
    expect(googleButton).toBeInTheDocument();
    expect(googleButton).toHaveAttribute("href", "/api/auth/signin/google");
  });

  it("renders error message when error searchParam is present", async () => {
    const page = await SignInPage({
      searchParams: Promise.resolve({
        error: "access_denied",
        message: "You cancelled the Google sign-in request",
      }),
    });
    render(page);

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Authentication Failed")).toBeInTheDocument();
    expect(screen.getByText("You cancelled the Google sign-in request")).toBeInTheDocument();
  });

  it("renders back to home and terms links", async () => {
    const page = await SignInPage({});
    render(page);

    expect(screen.getByText("← Back to home")).toHaveAttribute("href", "/");
    expect(screen.getByText("Terms")).toHaveAttribute("href", "/terms");
    expect(screen.getByText("Privacy Policy")).toHaveAttribute("href", "/privacy");
  });
});
