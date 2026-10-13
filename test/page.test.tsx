import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

describe("Home Page", () => {
  it("renders page header and main content", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        name: /Build Next\.js-style apps with Vite and deploy them to the edge\./i,
      })
    ).toBeInTheDocument();

    expect(screen.getByText("vinext + Cloudflare Workers")).toBeInTheDocument();
    expect(screen.getByText("Develop")).toBeInTheDocument();
    expect(screen.getByText("Build")).toBeInTheDocument();
    expect(screen.getByText("Deploy")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /vinext/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /API route/i })).toBeInTheDocument();
  });
});
