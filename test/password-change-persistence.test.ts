// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { env } from "cloudflare:workers";
import {
  resetInMemoryUsersState,
  ensureUsersTables,
  findUserByIdentifier,
  authenticateWithPassword,
  updateUserPassword,
} from "@/lib/auth/users-db";
import { POST as credentialsSignIn } from "@/app/api/auth/signin/credentials/route";
import { POST as changePasswordPost } from "@/app/api/settings/password/route";
import { createSqliteD1, type SqliteD1 } from "./helpers/sqlite-d1";

/**
 * Regression tests for "changing password doesn't work".
 *
 * Root cause: the users schema was created with a multi-line `db.exec()`, which
 * D1 runs line-by-line, so CREATE TABLE failed ("incomplete input") and the
 * error was swallowed. Every user read/write then fell back to per-isolate
 * memory, so a changed password vanished as soon as a request hit another
 * Worker isolate (or the isolate was recycled).
 */

/** Simulate a request landing on a fresh Worker isolate: memory is wiped, D1 is kept. */
async function simulateNewIsolate() {
  await resetInMemoryUsersState();
}

function signIn(password: string) {
  return credentialsSignIn(
    new Request("https://spike.land/api/auth/signin/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username: "admin@spike.land", password }),
    })
  );
}

async function signInToken(password: string): Promise<string> {
  const res = await signIn(password);
  expect(res.status).toBe(200);
  return ((await res.json()) as { token: string }).token;
}

function changePassword(token: string, currentPassword: string, newPassword: string) {
  return changePasswordPost(
    new Request("https://spike.land/api/settings/password", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword: newPassword }),
    })
  );
}

describe("password change persistence (D1-backed)", () => {
  let db: SqliteD1;

  beforeEach(async () => {
    db = createSqliteD1();
    (env as { DB?: D1Database }).DB = db;
    await resetInMemoryUsersState();
  });

  afterEach(() => {
    delete (env as { DB?: D1Database }).DB;
  });

  describe("lib/auth/users-db", () => {
    it("creates the users and api_tokens tables in D1", async () => {
      await ensureUsersTables(db);

      const tables = db.raw
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
        .all()
        .map((r) => (r as { name: string }).name);
      expect(tables).toEqual(expect.arrayContaining(["users", "api_tokens"]));
    });

    it("seeds the admin account into D1", async () => {
      await ensureUsersTables(db);

      const row = db.raw
        .prepare("SELECT email, role FROM users WHERE email = ?")
        .get("admin@spike.land") as { email: string; role: string } | undefined;
      expect(row).toEqual({ email: "admin@spike.land", role: "admin" });
    });

    it("writes the new password hash to D1", async () => {
      const admin = await findUserByIdentifier("admin@spike.land", db);
      const before = (db.raw
        .prepare("SELECT password_hash FROM users WHERE id = ?")
        .get(admin!.id) as { password_hash: string }).password_hash;

      const res = await updateUserPassword(admin!.id, "admin", "newpass123", db);
      expect(res.success).toBe(true);

      const after = (db.raw
        .prepare("SELECT password_hash FROM users WHERE id = ?")
        .get(admin!.id) as { password_hash: string }).password_hash;
      expect(after).not.toBe(before);
      expect(after).toBe(res.user!.passwordHash);
    });

    it("keeps the new password after the in-memory cache is lost (new isolate)", async () => {
      const admin = await findUserByIdentifier("admin@spike.land", db);
      expect((await updateUserPassword(admin!.id, "admin", "newpass123", db)).success).toBe(true);

      await simulateNewIsolate();

      expect(await authenticateWithPassword("admin@spike.land", "admin", db)).toBeNull();
      expect(await authenticateWithPassword("admin@spike.land", "newpass123", db)).not.toBeNull();
    });

    it("persists the password even when the user row is missing from D1 (upsert)", async () => {
      const admin = await findUserByIdentifier("admin@spike.land", db);
      db.raw.prepare("DELETE FROM users WHERE id = ?").run(admin!.id);

      const res = await updateUserPassword(admin!.id, "admin", "newpass123", db);
      expect(res.success).toBe(true);

      const row = db.raw.prepare("SELECT email FROM users WHERE id = ?").get(admin!.id);
      expect(row).toEqual({ email: "admin@spike.land" });
    });

    it("reports failure and keeps the old password when the D1 write fails", async () => {
      const admin = await findUserByIdentifier("admin@spike.land", db);
      db.failWrites = true;

      const res = await updateUserPassword(admin!.id, "admin", "newpass123", db);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/could not save/i);

      // Neither the durable store nor this isolate's cache should have changed.
      db.failWrites = false;
      expect(await authenticateWithPassword("admin@spike.land", "admin", db)).not.toBeNull();
      expect(await authenticateWithPassword("admin@spike.land", "newpass123", db)).toBeNull();
    });

    it("still rejects an incorrect current password", async () => {
      const admin = await findUserByIdentifier("admin@spike.land", db);
      const res = await updateUserPassword(admin!.id, "wrong", "newpass123", db);
      expect(res).toEqual({ success: false, error: "Current password is incorrect." });
    });
  });

  describe("POST /api/settings/password", () => {
    it("changes the password end-to-end and it survives a new isolate", async () => {
      const token = await signInToken("admin");

      const res = await changePassword(token, "admin", "supersecret2026");
      expect(res.status).toBe(200);
      expect(((await res.json()) as { success: boolean }).success).toBe(true);

      await simulateNewIsolate();

      expect((await signIn("admin")).status).toBe(401);
      expect((await signIn("supersecret2026")).status).toBe(200);
    });

    it("allows changing the password a second time using the new password", async () => {
      const token = await signInToken("admin");
      expect((await changePassword(token, "admin", "second-pass")).status).toBe(200);

      await simulateNewIsolate();
      const token2 = await signInToken("second-pass");
      expect((await changePassword(token2, "second-pass", "third-pass")).status).toBe(200);

      await simulateNewIsolate();
      expect((await signIn("second-pass")).status).toBe(401);
      expect((await signIn("third-pass")).status).toBe(200);
    });

    it("returns an error instead of a false success when persistence fails", async () => {
      const token = await signInToken("admin");
      db.failWrites = true;

      const res = await changePassword(token, "admin", "supersecret2026");
      expect(res.status).toBe(400);
      const data = (await res.json()) as { success?: boolean; error: string };
      expect(data.success).toBeUndefined();
      expect(data.error).toBe("password_update_failed");

      db.failWrites = false;
      expect((await signIn("admin")).status).toBe(200);
    });
  });
});
