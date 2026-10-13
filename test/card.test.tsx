import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

describe("Card component", () => {
  it("renders card primitives with content and classes", () => {
    render(
      <Card data-testid="card-root">
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card body content</p>
        </CardContent>
        <CardFooter>
          <span>Card footer</span>
        </CardFooter>
      </Card>
    );

    const card = screen.getByTestId("card-root");
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass("rounded-xl", "border", "bg-card");

    expect(screen.getByText("Card Title")).toBeInTheDocument();
    expect(screen.getByText("Card Description")).toBeInTheDocument();
    expect(screen.getByText("Card body content")).toBeInTheDocument();
    expect(screen.getByText("Card footer")).toBeInTheDocument();
  });
});
