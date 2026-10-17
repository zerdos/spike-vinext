import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/auth/session/route";
import { signSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

describe("GET /api/auth/session", () => {
  const mockUser = {
    id: "google_12345",
    email: "test@spike.land",
    name: "Test Developer",
    picture: "https://spike.land/avatar.png",
    provider: "google" as const,
    providerAccountId: "12345",
    emailVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("returns { authenticated: false, user: null } when unauthenticated", async () => {
    const request = new Request("https://spike.land/api/auth/session");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = (await response.json()) as Record<string, unknown>;
    expect(data.authenticated).toBe(false);
    expect(data.user).toBeNull();
  });

  it("returns authenticated user when valid session cookie is provided", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signSessionToken({
      user: mockUser,
      createdAt: now,
      expiresAt: now + 3600,
    });

    const request = new Request("https://spike.land/api/auth/session", {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = (await response.json()) as Record<string, unknown>;
    expect(data.authenticated).toBe(true);
    expect((data.user as Record<string, unknown>).email).toBe("test@spike.land");
    expect((data.user as Record<string, unknown>).name).toBe("Test Developer");
    expect((data.user as Record<string, unknown>).provider).toBe("google");
  });

  it("returns authenticated user when Authorization Bearer token is provided", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signSessionToken({
      user: mockUser,
      createdAt: now,
      expiresAt: now + 3600,
    });

    const request = new Request("https://spike.land/api/auth/session", {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = (await response.json()) as Record<string, unknown>;
    expect(data.authenticated).toBe(true);
    expect((data.user as Record<string, unknown>).email).toBe("test@spike.land");
  });

  it("returns { authenticated: false, user: null } when expired token is provided", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signSessionToken({
      user: mockUser,
      createdAt: now - 7200,
      expiresAt: now - 3600, // Expired 1 hour ago
    });

    const request = new Request("https://spike.land/api/auth/session", {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
    });

    const response = await GET(request);
    const data = (await response.json()) as Record<string, unknown>;
    expect(data.authenticated).toBe(false);
    expect(data.user).toBeNull();
  });
});
