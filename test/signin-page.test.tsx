import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SignInPage from "@/app/auth/signin/page";

describe("SignInPage", () => {
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
