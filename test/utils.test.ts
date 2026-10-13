import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn utility", () => {
  it("merges multiple single class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("handles conditional class names properly", () => {
    const isPrimary = true;
    const isSecondary = false;
    expect(cn("base", isPrimary && "text-primary", isSecondary && "text-secondary")).toBe(
      "base text-primary"
    );
  });

  it("resolves conflicting Tailwind classes with tailwind-merge precedence", () => {
    expect(cn("px-2 text-red-500", "px-4 text-blue-500")).toBe("px-4 text-blue-500");
  });

  it("handles undefined, null, and empty inputs gracefully", () => {
    expect(cn(undefined, null, false, "", "rounded-md")).toBe("rounded-md");
  });
});
