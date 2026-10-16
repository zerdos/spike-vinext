import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/auth/signout/route";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

describe("GET & POST /api/auth/signout", () => {
  it("GET redirects to / and clears the session cookie", async () => {
    const request = new Request("https://spike.land/api/auth/signout");
    const response = await GET(request);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://spike.land/");

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=;`);
    expect(setCookie).toContain("Max-Age=0");
  });

  it("GET preserves custom returnTo destination", async () => {
    const request = new Request("https://spike.land/api/auth/signout?returnTo=%2Fpricing");
    const response = await GET(request);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://spike.land/pricing");
  });

  it("GET returns JSON when Accept: application/json is set", async () => {
    const request = new Request("https://spike.land/api/auth/signout", {
      headers: { Accept: "application/json" },
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });

  it("POST returns JSON and clears session cookie", async () => {
    const request = new Request("https://spike.land/api/auth/signout", {
      method: "POST",
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });
});
