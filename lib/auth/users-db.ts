import { env } from "cloudflare:workers";
import { AuthUser } from "./types";

export interface UserAccount {
  id: string;
  email: string;
  username: string;
  name: string;
  passwordHash: string;
  role: "admin" | "user";
  providerTokens: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface ApiTokenRecord {
  id: string;
  userId: string;
  name: string;
  tokenValue: string;
  tokenPrefix: string;
  provider: string;
  scopes: string[];
  lastUsedAt?: string;
  createdAt: string;
}

interface UserDbRow {
  id: string;
  email: string;
  username: string;
  name: string;
  password_hash: string;
  role: string;
  api_tokens_json: string;
  created_at: string;
  updated_at: string;
}

interface ApiTokenDbRow {
  id: string;
  user_id: string;
  name: string;
  token_value: string;
  token_prefix: string;
  provider: string;
  scopes: string;
  last_used_at: string | null;
  created_at: string;
}

const PASSWORD_SALT = "spike_land_pwd_salt_2026";

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${PASSWORD_SALT}:${password}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === storedHash;
}

export function getAuthDatabase(): D1Database | null {
  try {
    if (env && "DB" in env && (env as { DB?: D1Database }).DB) {
      return (env as { DB: D1Database }).DB;
    }
  } catch {
    // Ignore when cloudflare:workers binding is unavailable
  }

  if (typeof (globalThis as unknown as { DB?: D1Database }).DB !== "undefined") {
    return (globalThis as unknown as { DB: D1Database }).DB;
  }

  return null;
}

// Precomputed SHA-256 hash for "admin" with salt "spike_land_pwd_salt_2026"
// Computed dynamically on init as well to ensure exact match
const ADMIN_USER_ID = "usr_admin_spike_land";
const ADMIN_DEFAULT_API_TOKEN_ID = "tok_admin_default_1";
export const ADMIN_DEFAULT_API_TOKEN = "spk_live_admin_master_2026_key_9f8a7b6c";

const inMemoryUsers = new Map<string, UserAccount>();
const inMemoryApiTokens = new Map<string, ApiTokenRecord>();
let adminSeededInMemory = false;
let d1UsersSchemaEnsured = false;

export async function seedDefaultAdminInMemory(): Promise<UserAccount> {
  const existing = inMemoryUsers.get(ADMIN_USER_ID);
  if (existing && adminSeededInMemory) {
    return existing;
  }

  const adminPasswordHash = await hashPassword("admin");
  const now = "2026-01-01T00:00:00.000Z";
  const adminAccount: UserAccount = {
    id: ADMIN_USER_ID,
    email: "admin@spike.land",
    username: "admin@spike.land",
    name: "Spike Admin",
    passwordHash: adminPasswordHash,
    role: "admin",
    providerTokens: {
      SPIKE_API_KEY: ADMIN_DEFAULT_API_TOKEN,
      OPENAI_API_KEY: "",
      ANTHROPIC_API_KEY: "",
      GITHUB_TOKEN: "",
      CLOUDFLARE_API_TOKEN: "",
    },
    createdAt: now,
    updatedAt: now,
  };

  inMemoryUsers.set(ADMIN_USER_ID, adminAccount);

  if (!inMemoryApiTokens.has(ADMIN_DEFAULT_API_TOKEN_ID)) {
    inMemoryApiTokens.set(ADMIN_DEFAULT_API_TOKEN_ID, {
      id: ADMIN_DEFAULT_API_TOKEN_ID,
      userId: ADMIN_USER_ID,
      name: "Default Admin MCP Key",
      tokenValue: ADMIN_DEFAULT_API_TOKEN,
      tokenPrefix: "spk_live_adm...",
      provider: "spike",
      scopes: ["mcp:tools:read", "mcp:tools:execute", "mcp:categories:configure", "mcp:step_up:write"],
      createdAt: now,
    });
  }

  adminSeededInMemory = true;
  return adminAccount;
}

export async function resetInMemoryUsersState(): Promise<void> {
  inMemoryUsers.clear();
  inMemoryApiTokens.clear();
  adminSeededInMemory = false;
  d1UsersSchemaEnsured = false;
  await seedDefaultAdminInMemory();
}

export async function ensureUsersTables(customDb?: D1Database | null): Promise<void> {
  await seedDefaultAdminInMemory();
  const db = customDb !== undefined ? customDb : getAuthDatabase();
  if (!db) return;

  if (!d1UsersSchemaEnsured) {
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          username TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          api_tokens_json TEXT NOT NULL DEFAULT '{}',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

        CREATE TABLE IF NOT EXISTS api_tokens (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          token_value TEXT NOT NULL,
          token_prefix TEXT NOT NULL,
          provider TEXT NOT NULL DEFAULT 'spike',
          scopes TEXT NOT NULL DEFAULT 'mcp:tools:read,mcp:tools:execute',
          last_used_at TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_api_tokens_value ON api_tokens(token_value);
      `);
      d1UsersSchemaEnsured = true;
    } catch {
      d1UsersSchemaEnsured = true;
    }
  }

  // Ensure admin@spike.land exists in D1
  try {
    const existingAdmin = await db
      .prepare("SELECT * FROM users WHERE email = ? LIMIT 1")
      .bind("admin@spike.land")
      .first<UserDbRow>();

    if (!existingAdmin) {
      const memAdmin = await seedDefaultAdminInMemory();
      await db
        .prepare(
          `INSERT INTO users (id, email, username, name, password_hash, role, api_tokens_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          memAdmin.id,
          memAdmin.email,
          memAdmin.username,
          memAdmin.name,
          memAdmin.passwordHash,
          memAdmin.role,
          JSON.stringify(memAdmin.providerTokens),
          memAdmin.createdAt,
          memAdmin.updatedAt
        )
        .run();

      await db
        .prepare(
          `INSERT INTO api_tokens (id, user_id, name, token_value, token_prefix, provider, scopes, last_used_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          ADMIN_DEFAULT_API_TOKEN_ID,
          memAdmin.id,
          "Default Admin MCP Key",
          ADMIN_DEFAULT_API_TOKEN,
          "spk_live_adm...",
          "spike",
          "mcp:tools:read,mcp:tools:execute,mcp:categories:configure,mcp:step_up:write",
          null,
          memAdmin.createdAt
        )
        .run();
    }
  } catch {
    // Fallback to in-memory gracefully
  }
}

function mapRowToUserAccount(row: UserDbRow): UserAccount {
  let providerTokens: Record<string, string> = {};
  try {
    providerTokens = JSON.parse(row.api_tokens_json || "{}");
  } catch {
    providerTokens = {};
  }
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    name: row.name,
    passwordHash: row.password_hash,
    role: row.role === "admin" ? "admin" : "user",
    providerTokens,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToApiToken(row: ApiTokenDbRow): ApiTokenRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    tokenValue: row.token_value,
    tokenPrefix: row.token_prefix,
    provider: row.provider || "spike",
    scopes: row.scopes ? row.scopes.split(",").filter(Boolean) : [],
    lastUsedAt: row.last_used_at || undefined,
    createdAt: row.created_at,
  };
}

export function toAuthUser(account: UserAccount): AuthUser {
  return {
    id: account.id,
    email: account.email,
    username: account.username,
    name: account.name,
    role: account.role,
    provider: "credentials",
    providerAccountId: account.id,
    emailVerified: true,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export async function findUserByIdentifier(
  identifier: string,
  customDb?: D1Database | null
): Promise<UserAccount | null> {
  await ensureUsersTables(customDb);
  const normalized = identifier.trim().toLowerCase();
  if (!normalized) return null;

  // Support "admin" shorthand resolving to "admin@spike.land"
  const emailCandidate = normalized === "admin" ? "admin@spike.land" : normalized;

  const db = customDb !== undefined ? customDb : getAuthDatabase();
  if (db) {
    try {
      const row = await db
        .prepare("SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1")
        .bind(emailCandidate, normalized)
        .first<UserDbRow>();
      if (row) {
        const mapped = mapRowToUserAccount(row);
        inMemoryUsers.set(mapped.id, mapped);
        return mapped;
      }
    } catch {
      // Fallback to in-memory
    }
  }

  for (const user of inMemoryUsers.values()) {
    if (
      user.email.toLowerCase() === emailCandidate ||
      user.username.toLowerCase() === normalized ||
      (normalized === "admin" && user.email.toLowerCase() === "admin@spike.land")
    ) {
      return user;
    }
  }

  return null;
}

export async function findUserById(
  userId: string,
  customDb?: D1Database | null
): Promise<UserAccount | null> {
  await ensureUsersTables(customDb);
  const db = customDb !== undefined ? customDb : getAuthDatabase();

  if (db) {
    try {
      const row = await db
        .prepare("SELECT * FROM users WHERE id = ? LIMIT 1")
        .bind(userId)
        .first<UserDbRow>();
      if (row) {
        const mapped = mapRowToUserAccount(row);
        inMemoryUsers.set(mapped.id, mapped);
        return mapped;
      }
    } catch {
      // Fallback
    }
  }

  return inMemoryUsers.get(userId) || null;
}

export async function authenticateWithPassword(
  identifier: string,
  password: string,
  customDb?: D1Database | null
): Promise<UserAccount | null> {
  const user = await findUserByIdentifier(identifier, customDb);
  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  return user;
}

export async function updateUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  customDb?: D1Database | null
): Promise<{ success: boolean; error?: string; user?: UserAccount }> {
  const user = await findUserById(userId, customDb);
  if (!user) {
    return { success: false, error: "User account not found." };
  }

  const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isCurrentValid) {
    return { success: false, error: "Current password is incorrect." };
  }

  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: "New password must be at least 4 characters long." };
  }

  const newHash = await hashPassword(newPassword);
  const now = new Date().toISOString();

  const updatedUser: UserAccount = {
    ...user,
    passwordHash: newHash,
    updatedAt: now,
  };

  inMemoryUsers.set(userId, updatedUser);

  const db = customDb !== undefined ? customDb : getAuthDatabase();
  if (db) {
    try {
      await db
        .prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
        .bind(newHash, now, userId)
        .run();
    } catch {
      // In-memory already updated
    }
  }

  return { success: true, user: updatedUser };
}

export async function updateUserProviderTokens(
  userId: string,
  providerTokens: Record<string, string>,
  customDb?: D1Database | null
): Promise<{ success: boolean; error?: string; providerTokens?: Record<string, string> }> {
  let user = await findUserById(userId, customDb);
  if (!user) {
    // If logged in via OAuth/WorkOS and not yet in users table, create a record
    const now = new Date().toISOString();
    user = {
      id: userId,
      email: `${userId}@spike.land`,
      username: userId,
      name: "Developer",
      passwordHash: await hashPassword(crypto.randomUUID()),
      role: "user",
      providerTokens: {},
      createdAt: now,
      updatedAt: now,
    };
  }

  const mergedTokens: Record<string, string> = {
    ...user.providerTokens,
  };

  for (const [key, val] of Object.entries(providerTokens)) {
    const cleanKey = key.trim();
    if (!cleanKey) continue;
    mergedTokens[cleanKey] = typeof val === "string" ? val.trim() : "";
  }

  const now = new Date().toISOString();
  const updatedUser: UserAccount = {
    ...user,
    providerTokens: mergedTokens,
    updatedAt: now,
  };

  inMemoryUsers.set(user.id, updatedUser);

  const db = customDb !== undefined ? customDb : getAuthDatabase();
  if (db) {
    try {
      await db
        .prepare("UPDATE users SET api_tokens_json = ?, updated_at = ? WHERE id = ?")
        .bind(JSON.stringify(mergedTokens), now, user.id)
        .run();
    } catch {
      // In-memory already updated
    }
  }

  return { success: true, providerTokens: mergedTokens };
}

export async function listUserApiTokens(
  userId: string,
  customDb?: D1Database | null
): Promise<ApiTokenRecord[]> {
  await ensureUsersTables(customDb);
  const db = customDb !== undefined ? customDb : getAuthDatabase();

  if (db) {
    try {
      const res = await db
        .prepare("SELECT * FROM api_tokens WHERE user_id = ? ORDER BY created_at DESC")
        .bind(userId)
        .all<ApiTokenDbRow>();
      if (res.results && res.results.length > 0) {
        const list = res.results.map(mapRowToApiToken);
        for (const item of list) {
          inMemoryApiTokens.set(item.id, item);
        }
        return list;
      }
    } catch {
      // Fallback
    }
  }

  const tokens: ApiTokenRecord[] = [];
  for (const tok of inMemoryApiTokens.values()) {
    if (tok.userId === userId) {
      tokens.push(tok);
    }
  }
  return tokens.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createUserApiToken(
  userId: string,
  opts: {
    name: string;
    provider?: string;
    customTokenValue?: string;
    scopes?: string[];
  },
  customDb?: D1Database | null
): Promise<ApiTokenRecord> {
  await ensureUsersTables(customDb);
  const name = opts.name.trim() || "MCP Gateway Key";
  const provider = (opts.provider || "spike").trim();
  const scopes = opts.scopes || ["mcp:tools:read", "mcp:tools:execute"];

  const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const tokenValue = opts.customTokenValue?.trim() || `spk_live_${randomHex}`;
  const tokenPrefix =
    tokenValue.length > 12 ? `${tokenValue.slice(0, 12)}...` : tokenValue;
  const id = `tok_${Date.now()}_${randomHex.slice(0, 6)}`;
  const now = new Date().toISOString();

  const record: ApiTokenRecord = {
    id,
    userId,
    name,
    tokenValue,
    tokenPrefix,
    provider,
    scopes,
    createdAt: now,
  };

  inMemoryApiTokens.set(id, record);

  const db = customDb !== undefined ? customDb : getAuthDatabase();
  if (db) {
    try {
      await db
        .prepare(
          `INSERT INTO api_tokens (id, user_id, name, token_value, token_prefix, provider, scopes, last_used_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          record.id,
          record.userId,
          record.name,
          record.tokenValue,
          record.tokenPrefix,
          record.provider,
          record.scopes.join(","),
          null,
          record.createdAt
        )
        .run();
    } catch {
      // Fallback in memory
    }
  }

  return record;
}

export async function revokeUserApiToken(
  userId: string,
  tokenId: string,
  customDb?: D1Database | null
): Promise<boolean> {
  await ensureUsersTables(customDb);
  const existing = inMemoryApiTokens.get(tokenId);
  let deleted = false;

  if (existing && existing.userId === userId) {
    inMemoryApiTokens.delete(tokenId);
    deleted = true;
  }

  const db = customDb !== undefined ? customDb : getAuthDatabase();
  if (db) {
    try {
      await db
        .prepare("DELETE FROM api_tokens WHERE id = ? AND user_id = ?")
        .bind(tokenId, userId)
        .run();
      deleted = true;
    } catch {
      // Ignore
    }
  }

  return deleted;
}
