import { describe, it, expect, vi } from "vitest";
import {
  getGoogleConfig,
  createGoogleAuthorizationUrl,
  parseState,
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  decodeGoogleIdToken,
  normalizeGoogleUser,
  processGoogleCallback,
  GOOGLE_AUTH_ENDPOINT,
} from "@/lib/auth/google";

describe("lib/auth/google", () => {
  describe("getGoogleConfig", () => {
    it("returns default config when env variables are not provided", () => {
      const config = getGoogleConfig({});
      expect(config.clientId).toBeDefined();
      expect(config.clientSecret).toBeDefined();
      expect(config.redirectUri).toContain("/api/auth/callback/google");
    });

    it("uses provided custom environment variables", () => {
      const config = getGoogleConfig({
        GOOGLE_CLIENT_ID: "custom-client-id",
        GOOGLE_CLIENT_SECRET: "custom-client-secret",
        APP_URL: "https://custom.spike.land",
        GOOGLE_REDIRECT_URI: "https://custom.spike.land/oauth/google",
      });

      expect(config.clientId).toBe("custom-client-id");
      expect(config.clientSecret).toBe("custom-client-secret");
      expect(config.redirectUri).toBe("https://custom.spike.land/oauth/google");
    });
  });

  describe("createGoogleAuthorizationUrl", () => {
    it("generates valid Google OAuth authorization URL with required parameters", () => {
      const urlString = createGoogleAuthorizationUrl({
        config: {
          clientId: "test-client-id",
          redirectUri: "https://spike.land/api/auth/callback/google",
        },
      });

      const url = new URL(urlString);
      expect(url.origin + url.pathname).toBe(GOOGLE_AUTH_ENDPOINT);
      expect(url.searchParams.get("client_id")).toBe("test-client-id");
      expect(url.searchParams.get("redirect_uri")).toBe("https://spike.land/api/auth/callback/google");
      expect(url.searchParams.get("response_type")).toBe("code");
      expect(url.searchParams.get("scope")).toContain("openid");
      expect(url.searchParams.get("scope")).toContain("email");
      expect(url.searchParams.get("scope")).toContain("profile");
      expect(url.searchParams.get("access_type")).toBe("offline");
    });

    it("includes custom returnTo in state parameter", () => {
      const urlString = createGoogleAuthorizationUrl({
        returnTo: "/create/project-123",
      });

      const url = new URL(urlString);
      const state = url.searchParams.get("state");
      expect(state).toBeDefined();

      const parsed = parseState(state);
      expect(parsed.returnTo).toBe("/create/project-123");
    });

    it("includes prompt and login_hint options", () => {
      const urlString = createGoogleAuthorizationUrl({
        prompt: "select_account",
        loginHint: "user@example.com",
      });

      const url = new URL(urlString);
      expect(url.searchParams.get("prompt")).toBe("select_account");
      expect(url.searchParams.get("login_hint")).toBe("user@example.com");
    });
  });

  describe("parseState", () => {
    it("parses valid JSON state with returnTo", () => {
      const state = JSON.stringify({ returnTo: "/dashboard", csrf: "abc" });
      const result = parseState(state);
      expect(result.returnTo).toBe("/dashboard");
    });

    it("handles path string as returnTo directly", () => {
      const result = parseState("/create/app");
      expect(result.returnTo).toBe("/create/app");
    });

    it("returns empty object for null or undefined", () => {
      expect(parseState(null)).toEqual({});
      expect(parseState(undefined)).toEqual({});
    });

    it("handles non-JSON arbitrary string without crashing", () => {
      const result = parseState("arbitrary-random-state-123");
      expect(result.raw).toBe("arbitrary-random-state-123");
      expect(result.returnTo).toBeUndefined();
    });
  });

  describe("exchangeGoogleCode", () => {
    it("successfully exchanges auth code for tokens", async () => {
      const mockTokens = {
        access_token: "mock-access-token",
        expires_in: 3600,
        token_type: "Bearer",
        scope: "openid email profile",
        id_token: "mock.id.token",
        refresh_token: "mock-refresh-token",
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokens,
      });

      const tokens = await exchangeGoogleCode("mock-auth-code", {
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(tokens.access_token).toBe("mock-access-token");
      expect(tokens.expires_in).toBe(3600);
      expect(tokens.id_token).toBe("mock.id.token");
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain("oauth2.googleapis.com/token");
      expect(init.method).toBe("POST");
      expect(init.body).toContain("code=mock-auth-code");
      expect(init.body).toContain("grant_type=authorization_code");
    });

    it("throws descriptive error when Google returns OAuth error", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: "invalid_grant",
          error_description: "Bad Request: Invalid authorization code",
        }),
      });

      await expect(
        exchangeGoogleCode("bad-code", { fetchFn: mockFetch as unknown as typeof fetch })
      ).rejects.toThrow("Bad Request: Invalid authorization code");
    });
  });

  describe("fetchGoogleUserInfo", () => {
    it("successfully fetches and returns user profile", async () => {
      const mockProfile = {
        sub: "10987654321",
        email: "alex@spike.land",
        email_verified: true,
        name: "Alex River",
        picture: "https://lh3.googleusercontent.com/avatar.jpg",
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockProfile,
      });

      const profile = await fetchGoogleUserInfo("test-access-token", {
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(profile.sub).toBe("10987654321");
      expect(profile.email).toBe("alex@spike.land");
      expect(profile.name).toBe("Alex River");

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers.Authorization).toBe("Bearer test-access-token");
    });

    it("throws when Google returns non-200 or missing sub/email", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(
        fetchGoogleUserInfo("expired-token", { fetchFn: mockFetch as unknown as typeof fetch })
      ).rejects.toThrow("Failed to fetch Google user profile");
    });
  });

  describe("decodeGoogleIdToken", () => {
    it("decodes a standard JWT payload safely without network requests", () => {
      const payload = {
        sub: "11223344",
        email: "decoded@spike.land",
        name: "Decoded User",
      };
      const encodedPayload = btoa(JSON.stringify(payload));
      const sampleJwt = `header.${encodedPayload}.signature`;

      const decoded = decodeGoogleIdToken(sampleJwt);
      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe("11223344");
      expect(decoded?.email).toBe("decoded@spike.land");
      expect(decoded?.name).toBe("Decoded User");
    });

    it("returns null for malformed tokens", () => {
      expect(decodeGoogleIdToken("")).toBeNull();
      expect(decodeGoogleIdToken("invalid")).toBeNull();
    });
  });

  describe("normalizeGoogleUser", () => {
    it("normalizes user info with sub, email, and name", () => {
      const user = normalizeGoogleUser({
        sub: "google-sub-99",
        email: "Test.User@Spike.land",
        name: "Test User",
        email_verified: true,
        picture: "https://avatar.google.com/pic",
      });

      expect(user.id).toBe("google_google-sub-99");
      expect(user.email).toBe("test.user@spike.land");
      expect(user.name).toBe("Test User");
      expect(user.provider).toBe("google");
      expect(user.providerAccountId).toBe("google-sub-99");
      expect(user.emailVerified).toBe(true);
      expect(user.picture).toBe("https://avatar.google.com/pic");
    });

    it("falls back to given/family name or email prefix when name is omitted", () => {
      const user = normalizeGoogleUser({
        sub: "sub-100",
        email: "coder@spike.land",
        given_name: "Ada",
        family_name: "Lovelace",
      });

      expect(user.name).toBe("Ada Lovelace");

      const user2 = normalizeGoogleUser({
        sub: "sub-101",
        email: "mystery@spike.land",
      });

      expect(user2.name).toBe("mystery");
    });
  });

  describe("processGoogleCallback", () => {
    it("orchestrates the entire callback flow successfully", async () => {
      const mockTokens = {
        access_token: "token-abc",
        expires_in: 3600,
        token_type: "Bearer",
        scope: "openid email",
      };
      const mockProfile = {
        sub: "user-456",
        email: "user456@spike.land",
        name: "Spike User 456",
        email_verified: true,
      };

      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("token")) {
          return { ok: true, json: async () => mockTokens };
        }
        if (url.includes("userinfo")) {
          return { ok: true, json: async () => mockProfile };
        }
        return { ok: false, status: 404 };
      });

      const result = await processGoogleCallback(
        {
          code: "valid-code-789",
          state: JSON.stringify({ returnTo: "/create" }),
          iss: "https://accounts.google.com",
        },
        {
          fetchFn: mockFetch as unknown as typeof fetch,
        }
      );

      expect(result.user.email).toBe("user456@spike.land");
      expect(result.user.provider).toBe("google");
      expect(result.returnTo).toBe("/create");
      expect(result.sessionToken).toBeDefined();
      expect(result.session.user.id).toBe("google_user-456");
    });

    it("throws if Google error is passed", async () => {
      await expect(
        processGoogleCallback({
          error: "access_denied",
          errorDescription: "User cancelled consent",
        })
      ).rejects.toThrow("Google authentication failed: access_denied: User cancelled consent");
    });

    it("throws if code is missing", async () => {
      await expect(
        processGoogleCallback({
          code: null,
        })
      ).rejects.toThrow("Missing authorization code");
    });
  });
});
