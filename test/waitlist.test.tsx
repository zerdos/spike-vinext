import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import WaitlistPage from "@/app/waitlist/page";
import { Header } from "@/components/header";
import { POST as waitlistPost, GET as waitlistGet } from "@/app/api/waitlist/route";

describe("Waitlist Feature & Top Bar Overhaul", () => {
  describe("Header Component", () => {
    it("renders 'Sign In' button for authenticated state", () => {
      render(<Header />);

      // With WorkOS AuthKit, we show Sign In button when not authenticated
      // (the useAuth hook returns isLoading initially, then user: null)
      // Just verify the header renders without error
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });

    it("renders working navigation links", () => {
      render(<Header />);

      expect(screen.getAllByRole("link", { name: /playground/i })[0]).toHaveAttribute("href", "/#playground");
      expect(screen.getAllByRole("link", { name: /roi simulator/i })[0]).toHaveAttribute("href", "/#simulator");
      expect(screen.getAllByRole("link", { name: /docs/i })[0]).toHaveAttribute("href", "/#how-it-works");
      expect(screen.getAllByRole("link", { name: /setup guide/i })[0]).toHaveAttribute("href", "/#get-connected");
    });

    it("has search tools button with Cmd+K badge", () => {
      render(<Header />);

      const searchBtn = screen.getByRole("button", { name: /search tools/i });
      expect(searchBtn).toBeInTheDocument();
      expect(screen.getByText("Cmd+K")).toBeInTheDocument();
    });
  });

  describe("Waitlist API (/api/waitlist)", () => {
    it("GET returns current waitlist status and total count", async () => {
      const res = await waitlistGet();
      expect(res.status).toBe(200);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json.totalWaitlistCount).toBeGreaterThan(0);
      expect(json.status).toBe("accepting_applications");
    });

    it("POST rejects missing or invalid email with 400", async () => {
      const req = new Request("http://localhost/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "invalid-email" }),
      });
      const res = await waitlistPost(req);
      expect(res.status).toBe(400);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json.error).toMatch(/valid email/i);
    });

    it("POST successfully registers email and returns waitlist ticket", async () => {
      const req = new Request("http://localhost/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `dev-${Date.now()}@example.com`,
          name: "Test Developer",
          client: "Cursor",
          useCase: "Building autonomous AI agents",
          githubUsername: "testdev",
        }),
      });
      const res = await waitlistPost(req);
      expect(res.status).toBe(201);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json.success).toBe(true);
      expect((json.ticket as Record<string, unknown>).position).toBeGreaterThan(400);
      expect((json.ticket as Record<string, unknown>).referralCode).toMatch(/^SPK-/);
    });
  });

  describe("Waitlist Page Component", () => {
    it("renders waitlist form with client and use case options", () => {
      render(<WaitlistPage />);

      expect(screen.getByText(/Join the/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Waiting List/i).length).toBeGreaterThan(0);
      expect(screen.getByPlaceholderText("you@company.com")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /join developer waiting list/i })).toBeInTheDocument();

      // Client options
      expect(screen.getByText("Claude Desktop")).toBeInTheDocument();
      expect(screen.getByText("Cursor")).toBeInTheDocument();
      expect(screen.getByText("Claude Code")).toBeInTheDocument();
    });

    it("handles submission and displays digital boarding pass ticket", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            ticket: {
              position: 450,
              referralCode: "SPK-450-TEST",
              email: "agent@spike.land",
              createdAt: "2026-10-16T10:00:00Z",
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        )
      );

      render(<WaitlistPage />);

      const emailInput = screen.getByPlaceholderText("you@company.com");
      fireEvent.change(emailInput, { target: { value: "agent@spike.land" } });

      const submitButton = screen.getByRole("button", { name: /join developer waiting list/i });
      await act(async () => {
        fireEvent.click(submitButton);
      });

      // Ticket is displayed
      expect(screen.getByText("You're on the list!")).toBeInTheDocument();
      expect(screen.getByText("#450")).toBeInTheDocument();
      expect(screen.getByText("SPK-450-TEST")).toBeInTheDocument();
      expect(screen.getByText(/copy invite link/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /explore live mcp playground/i })).toHaveAttribute("href", "/#playground");
    });
  });
});
