import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/auth/signin/google/route";
import { GOOGLE_AUTH_ENDPOINT } from "@/lib/auth/google";

describe("GET & POST /api/auth/signin/google", () => {
  it("redirects with 302 to Google authorization URL", async () => {
    const request = new Request("https://spike.land/api/auth/signin/google");
    const response = await GET(request);

    expect(response.status).toBe(302);
    const location = response.headers.get("Location");
    expect(location).toBeDefined();

    const targetUrl = new URL(location!);
    expect(targetUrl.origin + targetUrl.pathname).toBe(GOOGLE_AUTH_ENDPOINT);
    expect(targetUrl.searchParams.get("client_id")).toBeDefined();
    expect(targetUrl.searchParams.get("redirect_uri")).toBe("https://spike.land/api/auth/callback/google");
    expect(targetUrl.searchParams.get("response_type")).toBe("code");
    expect(targetUrl.searchParams.get("scope")).toContain("openid");
  });

  it("encodes custom returnTo into state parameter", async () => {
    const request = new Request("https://spike.land/api/auth/signin/google?returnTo=%2Fcreate%2Fcube");
    const response = await GET(request);

    const location = response.headers.get("Location")!;
    const targetUrl = new URL(location);
    const state = targetUrl.searchParams.get("state")!;
    expect(state).toContain("/create/cube");
  });

  it("preserves prompt and login_hint query parameters", async () => {
    const request = new Request(
      "https://spike.land/api/auth/signin/google?prompt=select_account&login_hint=coder%40spike.land"
    );
    const response = await GET(request);

    const location = response.headers.get("Location")!;
    const targetUrl = new URL(location);
    expect(targetUrl.searchParams.get("prompt")).toBe("select_account");
    expect(targetUrl.searchParams.get("login_hint")).toBe("coder@spike.land");
  });

  it("POST /api/auth/signin/google returns JSON containing authorization URL", async () => {
    const request = new Request("https://spike.land/api/auth/signin/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnTo: "/store", prompt: "consent" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.url).toBeDefined();
    expect(data.url).toContain(GOOGLE_AUTH_ENDPOINT);
    expect(data.url).toContain("store");
    expect(data.url).toContain("consent");
  });
});
