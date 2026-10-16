import { describe, it, expect } from "vitest";
import {
  signSessionToken,
  verifySessionToken,
  createSessionCookie,
  createClearSessionCookie,
  parseCookies,
  getSessionFromRequest,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { AuthSession } from "@/lib/auth/types";

describe("lib/auth/session", () => {
  const mockUser = {
    id: "google_123456789",
    email: "dev@spike.land",
    name: "Spike Developer",
    picture: "https://spike.land/avatar.png",
    provider: "google" as const,
    providerAccountId: "123456789",
    emailVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const createMockSession = (expiresInSeconds = 3600): AuthSession => {
    const now = Math.floor(Date.now() / 1000);
    return {
      user: mockUser,
      createdAt: now,
      expiresAt: now + expiresInSeconds,
    };
  };

  describe("signSessionToken & verifySessionToken", () => {
    it("successfully signs and verifies a valid session token", async () => {
      const session = createMockSession(3600);
      const token = await signSessionToken(session);

      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3);

      const verified = await verifySessionToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.user.id).toBe(mockUser.id);
      expect(verified?.user.email).toBe(mockUser.email);
      expect(verified?.user.provider).toBe("google");
    });

    it("verifies with custom secret and fails with a different secret", async () => {
      const session = createMockSession(3600);
      const secretA = "custom-secret-alpha-2026";
      const secretB = "custom-secret-beta-2026";

      const token = await signSessionToken(session, secretA);
      const verifiedA = await verifySessionToken(token, secretA);
      expect(verifiedA).not.toBeNull();

      const verifiedB = await verifySessionToken(token, secretB);
      expect(verifiedB).toBeNull();
    });

    it("rejects expired tokens", async () => {
      const expiredSession = createMockSession(-10); // Expired 10 seconds ago
      const token = await signSessionToken(expiredSession);

      const verified = await verifySessionToken(token);
      expect(verified).toBeNull();
    });

    it("rejects tampered tokens", async () => {
      const session = createMockSession(3600);
      const token = await signSessionToken(session);
      const parts = token.split(".");

      // Tamper with payload
      const tamperedToken = `${parts[0]}.${parts[1]}xyz.${parts[2]}`;
      const verified = await verifySessionToken(tamperedToken);
      expect(verified).toBeNull();
    });

    it("rejects malformed token strings", async () => {
      expect(await verifySessionToken("not-a-token")).toBeNull();
      expect(await verifySessionToken("")).toBeNull();
      expect(await verifySessionToken("a.b")).toBeNull();
    });
  });

  describe("Cookie utilities", () => {
    it("creates a properly configured session cookie", () => {
      const cookie = createSessionCookie("sample-token", 86400, true);

      expect(cookie).toContain(`${SESSION_COOKIE_NAME}=sample-token`);
      expect(cookie).toContain("Path=/");
      expect(cookie).toContain("Max-Age=86400");
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=Lax");
      expect(cookie).toContain("Secure");
    });

    it("creates cookie without Secure when secure is false (for local dev)", () => {
      const cookie = createSessionCookie("sample-token", 3600, false);
      expect(cookie).not.toContain("Secure");
    });

    it("creates clear session cookie with Max-Age=0", () => {
      const clearCookie = createClearSessionCookie();

      expect(clearCookie).toContain(`${SESSION_COOKIE_NAME}=;`);
      expect(clearCookie).toContain("Max-Age=0");
      expect(clearCookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    });

    it("parses multiple cookies correctly", () => {
      const header = "theme=dark; spike_session=token-1234; other=value%201";
      const cookies = parseCookies(header);

      expect(cookies["spike_session"]).toBe("token-1234");
      expect(cookies["theme"]).toBe("dark");
      expect(cookies["other"]).toBe("value 1");
    });

    it("handles empty or null cookie headers", () => {
      expect(parseCookies(null)).toEqual({});
      expect(parseCookies("")).toEqual({});
    });
  });

  describe("getSessionFromRequest", () => {
    it("extracts session from Cookie header", async () => {
      const session = createMockSession(3600);
      const token = await signSessionToken(session);

      const request = new Request("https://spike.land/api/auth/session", {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${token}`,
        },
      });

      const extracted = await getSessionFromRequest(request);
      expect(extracted).not.toBeNull();
      expect(extracted?.user.email).toBe(mockUser.email);
    });

    it("extracts session from Authorization Bearer header", async () => {
      const session = createMockSession(3600);
      const token = await signSessionToken(session);

      const request = new Request("https://spike.land/api/auth/session", {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      const extracted = await getSessionFromRequest(request);
      expect(extracted).not.toBeNull();
      expect(extracted?.user.email).toBe(mockUser.email);
    });

    it("returns null if no session header is present", async () => {
      const request = new Request("https://spike.land/api/auth/session");
      const extracted = await getSessionFromRequest(request);
      expect(extracted).toBeNull();
    });

    it("returns null if invalid token is provided", async () => {
      const request = new Request("https://spike.land/api/auth/session", {
        headers: {
          authorization: "Bearer invalid.token.signature",
        },
      });
      const extracted = await getSessionFromRequest(request);
      expect(extracted).toBeNull();
    });
  });
});
