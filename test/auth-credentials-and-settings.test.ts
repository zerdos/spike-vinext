import { describe, it, expect, beforeEach } from "vitest";
import {
  resetInMemoryUsersState,
  findUserByIdentifier,
  authenticateWithPassword,
  updateUserPassword,
  updateUserProviderTokens,
  listUserApiTokens,
  createUserApiToken,
  revokeUserApiToken,
  ADMIN_DEFAULT_API_TOKEN,
} from "@/lib/auth/users-db";
import { POST as credentialsSignIn } from "@/app/api/auth/signin/credentials/route";
import { POST as changePasswordPost } from "@/app/api/settings/password/route";
import {
  GET as getTokens,
  POST as postTokens,
  DELETE as deleteTokens,
} from "@/app/api/settings/tokens/route";
import { GET as getSession } from "@/app/api/auth/session/route";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

describe("Credentials Auth (admin@spike.land) & Settings API", () => {
  beforeEach(async () => {
    await resetInMemoryUsersState();
  });

  describe("lib/auth/users-db", () => {
    it("seeds admin@spike.land with password 'admin' by default", async () => {
      const adminByEmail = await findUserByIdentifier("admin@spike.land");
      expect(adminByEmail).not.toBeNull();
      expect(adminByEmail?.email).toBe("admin@spike.land");
      expect(adminByEmail?.role).toBe("admin");

      const authSuccess = await authenticateWithPassword("admin@spike.land", "admin");
      expect(authSuccess).not.toBeNull();
      expect(authSuccess?.email).toBe("admin@spike.land");

      // Also supports 'admin' username shorthand
      const authShort = await authenticateWithPassword("admin", "admin");
      expect(authShort).not.toBeNull();
      expect(authShort?.email).toBe("admin@spike.land");

      const authFail = await authenticateWithPassword("admin@spike.land", "wrong-password");
      expect(authFail).toBeNull();
    });

    it("allows changing user password and verifying with the new password", async () => {
      const admin = await findUserByIdentifier("admin@spike.land");
      expect(admin).not.toBeNull();

      // Wrong current password should fail
      const failRes = await updateUserPassword(admin!.id, "wrong", "newpass123");
      expect(failRes.success).toBe(false);

      // Valid current password should succeed
      const okRes = await updateUserPassword(admin!.id, "admin", "newpass123");
      expect(okRes.success).toBe(true);

      // Old password no longer works
      expect(await authenticateWithPassword("admin@spike.land", "admin")).toBeNull();
      // New password works
      const reAuthed = await authenticateWithPassword("admin@spike.land", "newpass123");
      expect(reAuthed).not.toBeNull();
      expect(reAuthed?.email).toBe("admin@spike.land");
    });

    it("manages provider API tokens and personal MCP tokens", async () => {
      const admin = await findUserByIdentifier("admin@spike.land");
      expect(admin).not.toBeNull();

      const initialTokens = await listUserApiTokens(admin!.id);
      expect(initialTokens.length).toBe(1);
      expect(initialTokens[0].tokenValue).toBe(ADMIN_DEFAULT_API_TOKEN);

      // Create new token
      const created = await createUserApiToken(admin!.id, {
        name: "CI Pipeline Key",
        customTokenValue: "spk_live_ci_test_token_12345",
      });
      expect(created.name).toBe("CI Pipeline Key");
      expect(created.tokenValue).toBe("spk_live_ci_test_token_12345");

      const afterCreate = await listUserApiTokens(admin!.id);
      expect(afterCreate.length).toBe(2);

      // Update provider tokens
      const updatedProviders = await updateUserProviderTokens(admin!.id, {
        OPENAI_API_KEY: "sk-test-openai-999",
        GITHUB_TOKEN: "ghp_test_github_888",
      });
      expect(updatedProviders.success).toBe(true);
      expect(updatedProviders.providerTokens?.OPENAI_API_KEY).toBe("sk-test-openai-999");
      expect(updatedProviders.providerTokens?.GITHUB_TOKEN).toBe("ghp_test_github_888");

      // Revoke token
      const revoked = await revokeUserApiToken(admin!.id, created.id);
      expect(revoked).toBe(true);

      const afterRevoke = await listUserApiTokens(admin!.id);
      expect(afterRevoke.length).toBe(1);
    });
  });

  describe("POST /api/auth/signin/credentials", () => {
    it("authenticates admin@spike.land with password 'admin' and returns session cookie + token", async () => {
      const req = new Request("https://spike.land/api/auth/signin/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          username: "admin@spike.land",
          password: "admin",
          returnTo: "/settings",
        }),
      });

      const res = await credentialsSignIn(req);
      expect(res.status).toBe(200);

      const setCookie = res.headers.get("Set-Cookie");
      expect(setCookie).toBeTruthy();
      expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);

      const data = (await res.json()) as {
        success: boolean;
        authenticated: boolean;
        token: string;
        returnTo: string;
        user: { email: string; role: string; provider: string };
      };
      expect(data.success).toBe(true);
      expect(data.authenticated).toBe(true);
      expect(data.user.email).toBe("admin@spike.land");
      expect(data.user.role).toBe("admin");
      expect(data.user.provider).toBe("credentials");
      expect(data.returnTo).toBe("/settings");

      // Verify /api/auth/session recognizes the issued token
      const sessionRes = await getSession(
        new Request("https://spike.land/api/auth/session", {
          headers: {
            Authorization: `Bearer ${data.token}`,
          },
        })
      );
      const sessionJson = (await sessionRes.json()) as {
        authenticated: boolean;
        user: { email: string };
      };
      expect(sessionJson.authenticated).toBe(true);
      expect(sessionJson.user.email).toBe("admin@spike.land");
    });

    it("rejects invalid password with 401", async () => {
      const req = new Request("https://spike.land/api/auth/signin/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          username: "admin@spike.land",
          password: "wrong-password",
        }),
      });

      const res = await credentialsSignIn(req);
      expect(res.status).toBe(401);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe("invalid_credentials");
    });
  });

  describe("/api/settings/password & /api/settings/tokens", () => {
    async function getAdminAuthToken(): Promise<string> {
      const res = await credentialsSignIn(
        new Request("https://spike.land/api/auth/signin/credentials", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            username: "admin@spike.land",
            password: "admin",
          }),
        })
      );
      const data = (await res.json()) as { token: string };
      return data.token;
    }

    it("requires authentication for password and token endpoints", async () => {
      const pRes = await changePasswordPost(
        new Request("https://spike.land/api/settings/password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword: "admin", newPassword: "newpassword" }),
        })
      );
      expect(pRes.status).toBe(401);

      const tRes = await getTokens(new Request("https://spike.land/api/settings/tokens"));
      expect(tRes.status).toBe(401);
    });

    it("updates password via POST /api/settings/password and allows login with new password", async () => {
      const token = await getAdminAuthToken();

      const pRes = await changePasswordPost(
        new Request("https://spike.land/api/settings/password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword: "admin",
            newPassword: "supersecret2026",
            confirmPassword: "supersecret2026",
          }),
        })
      );
      expect(pRes.status).toBe(200);
      const pData = (await pRes.json()) as { success: boolean };
      expect(pData.success).toBe(true);

      // Login with new password succeeds
      const loginRes = await credentialsSignIn(
        new Request("https://spike.land/api/auth/signin/credentials", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            username: "admin@spike.land",
            password: "supersecret2026",
          }),
        })
      );
      expect(loginRes.status).toBe(200);
    });

    it("gets, creates, saves provider tokens, and deletes API tokens via /api/settings/tokens", async () => {
      const token = await getAdminAuthToken();

      // 1. GET tokens
      const getRes = await getTokens(
        new Request("https://spike.land/api/settings/tokens", {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      expect(getRes.status).toBe(200);
      const getData = (await getRes.json()) as {
        tokens: Array<{ id: string; name: string }>;
        providerTokens: Record<string, string>;
      };
      expect(getData.tokens.length).toBe(1);
      expect(getData.providerTokens.SPIKE_API_KEY).toBe(ADMIN_DEFAULT_API_TOKEN);

      // 2. POST save provider tokens
      const saveProvRes = await postTokens(
        new Request("https://spike.land/api/settings/tokens", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: "save_provider_tokens",
            providerTokens: {
              OPENAI_API_KEY: "sk-live-123",
              ANTHROPIC_API_KEY: "sk-ant-456",
            },
          }),
        })
      );
      expect(saveProvRes.status).toBe(200);
      const saveProvData = (await saveProvRes.json()) as {
        success: boolean;
        providerTokens: Record<string, string>;
      };
      expect(saveProvData.success).toBe(true);
      expect(saveProvData.providerTokens.OPENAI_API_KEY).toBe("sk-live-123");
      expect(saveProvData.providerTokens.ANTHROPIC_API_KEY).toBe("sk-ant-456");

      // 3. POST create personal token
      const createRes = await postTokens(
        new Request("https://spike.land/api/settings/tokens", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: "create_token",
            name: "Desktop CLI Key",
            customTokenValue: "spk_live_desktop_cli_777",
          }),
        })
      );
      expect(createRes.status).toBe(201);
      const createData = (await createRes.json()) as {
        success: boolean;
        token: { id: string; name: string; tokenValue: string };
      };
      expect(createData.success).toBe(true);
      expect(createData.token.tokenValue).toBe("spk_live_desktop_cli_777");

      // 4. DELETE created token
      const delRes = await deleteTokens(
        new Request(
          `https://spike.land/api/settings/tokens?id=${encodeURIComponent(createData.token.id)}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        )
      );
      expect(delRes.status).toBe(200);
    });
  });
});
