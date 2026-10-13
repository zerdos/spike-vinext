import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/hello/route";

describe("GET /api/hello", () => {
  it("returns a 200 response with correct content-type header", async () => {
    const response = GET();

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("returns the expected JSON greeting payload", async () => {
    const response = GET();
    const data = await response.json();

    expect(data).toEqual({
      message: "Hello from vinext on Cloudflare Workers",
    });
  });
});
