import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET, POST } from "@/app/api/auth/callback/google/route";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

describe("GET & POST /api/auth/callback/google", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Mock global fetch for Google OAuth token and userinfo endpoints
    globalThis.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("oauth2.googleapis.com/token")) {
        return new Response(
          JSON.stringify({
            access_token: "mock-google-access-token",
            expires_in: 3600,
            token_type: "Bearer",
            scope: "openid email profile",
            id_token: "mock.id.token",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (urlStr.includes("googleapis.com/oauth2/v3/userinfo")) {
        return new Response(
          JSON.stringify({
            sub: "google-1092837465",
            email: "user@spike.land",
            name: "Zoltan User",
            picture: "https://spike.land/user.png",
            email_verified: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not found", { status: 404 });
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("handles the user callback example URL and issues a session cookie with 302 redirect", async () => {
    const callbackUrl =
      "https://spike.land/api/auth/callback/google?iss=https%3A%2F%2Faccounts.google.com&code=4%2F0AXlqoi5Dj4L4d6O1Utq6gwFvBo4asmTgOtX0kM2lGa7WBAP6BUlIMLekbpG20H6bOIjHjA&scope=email+profile+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile+openid+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email&authuser=0&prompt=none";

    const request = new Request(callbackUrl, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml",
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://spike.land/");

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Path=/");

    // Extract token and verify it contains the authenticated user
    const tokenMatch = setCookie?.match(/spike_session=([^;]+)/);
    expect(tokenMatch).not.toBeNull();
    const token = tokenMatch![1];

    const session = await verifySessionToken(token);
    expect(session?.user.email).toBe("user@spike.land");
    expect(session?.user.name).toBe("Zoltan User");
    expect(session?.user.provider).toBe("google");
    expect(session?.user.providerAccountId).toBe("google-1092837465");
  });

  it("redirects to the specified returnTo path from state parameter", async () => {
    const state = encodeURIComponent(JSON.stringify({ returnTo: "/create/matrix-rain" }));
    const callbackUrl = `https://spike.land/api/auth/callback/google?code=valid-code&state=${state}`;

    const request = new Request(callbackUrl, {
      method: "GET",
    });

    const response = await GET(request);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://spike.land/create/matrix-rain");
    expect(response.headers.get("Set-Cookie")).toContain(SESSION_COOKIE_NAME);
  });

  it("returns JSON when requested via Accept header", async () => {
    const callbackUrl = "https://spike.land/api/auth/callback/google?code=valid-code";

    const request = new Request(callbackUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = (await response.json()) as Record<string, unknown>;

    expect(data.success).toBe(true);
    expect((data.user as Record<string, unknown>).email).toBe("user@spike.land");
    expect(data.token).toBeDefined();
    expect(response.headers.get("Set-Cookie")).toContain(SESSION_COOKIE_NAME);
  });

  it("redirects to /auth/signin when Google returns an error", async () => {
    const callbackUrl =
      "https://spike.land/api/auth/callback/google?error=access_denied&error_description=User%20denied%20access";

    const request = new Request(callbackUrl, {
      method: "GET",
    });

    const response = await GET(request);

    expect(response.status).toBe(302);
    const location = response.headers.get("Location")!;
    expect(location).toContain("/auth/signin");
    expect(location).toContain("error=access_denied");
  });

  it("returns 400 JSON on Google error when Accept is application/json", async () => {
    const callbackUrl = "https://spike.land/api/auth/callback/google?error=access_denied";

    const request = new Request(callbackUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = (await response.json()) as Record<string, unknown>;
    expect(data.error).toBe("google_oauth_error");
  });

  it("redirects to /auth/signin when code parameter is missing", async () => {
    const request = new Request("https://spike.land/api/auth/callback/google", {
      method: "GET",
    });

    const response = await GET(request);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("error=missing_code");
  });

  it("handles token exchange network/auth failure gracefully", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid_grant" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    );

    const request = new Request("https://spike.land/api/auth/callback/google?code=invalid-code", {
      method: "GET",
    });

    const response = await GET(request);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("error=auth_failed");
  });

  describe("POST /api/auth/callback/google", () => {
    it("allows programmatic code exchange via POST body", async () => {
      const request = new Request("https://spike.land/api/auth/callback/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: "programmatic-auth-code",
          state: JSON.stringify({ returnTo: "/store" }),
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = (await response.json()) as Record<string, unknown>;

      expect(data.success).toBe(true);
      expect((data.user as Record<string, unknown>).email).toBe("user@spike.land");
      expect(data.token).toBeDefined();
      expect(data.returnTo).toBe("/store");
      expect(response.headers.get("Set-Cookie")).toContain(SESSION_COOKIE_NAME);
    });

    it("returns 400 when code is missing in POST body", async () => {
      const request = new Request("https://spike.land/api/auth/callback/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = (await response.json()) as Record<string, unknown>;
      expect(data.error).toBe("missing_code");
    });
  });
});
