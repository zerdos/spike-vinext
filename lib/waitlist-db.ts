import { env } from "cloudflare:workers";

export interface WaitlistSubmission {
  id: string;
  email: string;
  name?: string;
  company?: string;
  client?: string;
  useCase?: string;
  githubUsername?: string;
  referralCode: string;
  position: number;
  createdAt: string;
}

export interface WaitlistStats {
  totalWaitlistCount: number;
  status: string;
  batchName: string;
  nextReleaseDate: string;
}

interface WaitlistDbRow {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  client: string | null;
  use_case: string | null;
  github_username: string | null;
  referral_code: string;
  position: number;
  created_at: string;
}

// In-memory fallback for testing or when D1 is unattached
const inMemoryStore: WaitlistSubmission[] = [];
let inMemoryPositionCounter = 428;

export function resetInMemoryWaitlistState(initialPosition = 428): void {
  inMemoryStore.length = 0;
  inMemoryPositionCounter = initialPosition;
}

export function getWaitlistDatabase(): D1Database | null {
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

function mapRowToSubmission(row: WaitlistDbRow): WaitlistSubmission {
  return {
    id: row.id,
    email: row.email,
    name: row.name || undefined,
    company: row.company || undefined,
    client: row.client || undefined,
    useCase: row.use_case || undefined,
    githubUsername: row.github_username || undefined,
    referralCode: row.referral_code,
    position: Number(row.position),
    createdAt: row.created_at,
  };
}

let tableSchemaEnsured = false;

export async function ensureWaitlistTable(db: D1Database): Promise<void> {
  if (tableSchemaEnsured) return;
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        company TEXT,
        client TEXT,
        use_case TEXT,
        github_username TEXT,
        referral_code TEXT NOT NULL,
        position INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
      CREATE INDEX IF NOT EXISTS idx_waitlist_position ON waitlist(position);
    `);
    tableSchemaEnsured = true;
  } catch (error) {
    // If exec is not supported or already exists, continue gracefully
    console.warn("Notice: ensureWaitlistTable check completed:", error);
    tableSchemaEnsured = true;
  }
}

export async function getWaitlistEntryByEmail(
  email: string,
  customDb?: D1Database | null
): Promise<WaitlistSubmission | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const db = customDb !== undefined ? customDb : getWaitlistDatabase();

  if (db) {
    try {
      const row = await db
        .prepare("SELECT * FROM waitlist WHERE email = ? LIMIT 1")
        .bind(normalizedEmail)
        .first<WaitlistDbRow>();

      if (row) {
        return mapRowToSubmission(row);
      }
    } catch (err) {
      console.warn("D1 query failed in getWaitlistEntryByEmail, falling back to memory:", err);
    }
  }

  const existing = inMemoryStore.find((e) => e.email === normalizedEmail);
  return existing || null;
}

export async function getWaitlistStats(
  customDb?: D1Database | null
): Promise<WaitlistStats> {
  const db = customDb !== undefined ? customDb : getWaitlistDatabase();

  if (db) {
    try {
      const res = await db
        .prepare("SELECT COUNT(*) as count, MAX(position) as max_position FROM waitlist")
        .first<{ count: number; max_position: number | null }>();

      const count = Number(res?.count || 0);
      const maxPosition = res?.max_position != null ? Number(res.max_position) : null;
      const totalWaitlistCount = Math.max(428 + count, maxPosition ?? 428);

      return {
        totalWaitlistCount,
        status: "accepting_applications",
        batchName: "Alpha Cohort 2",
        nextReleaseDate: "2026-11-01",
      };
    } catch (err) {
      console.warn("D1 query failed in getWaitlistStats, falling back to memory:", err);
    }
  }

  return {
    totalWaitlistCount: inMemoryPositionCounter + inMemoryStore.length,
    status: "accepting_applications",
    batchName: "Alpha Cohort 2",
    nextReleaseDate: "2026-11-01",
  };
}

export async function getNextWaitlistPosition(
  customDb?: D1Database | null
): Promise<number> {
  const db = customDb !== undefined ? customDb : getWaitlistDatabase();

  if (db) {
    try {
      const res = await db
        .prepare("SELECT MAX(position) as max_position FROM waitlist")
        .first<{ max_position: number | null }>();

      const currentMax =
        res?.max_position != null && Number(res.max_position) >= 428
          ? Number(res.max_position)
          : 428;
      return currentMax + 1;
    } catch (err) {
      console.warn("D1 query failed in getNextWaitlistPosition, falling back to memory:", err);
    }
  }

  inMemoryPositionCounter += 1;
  return inMemoryPositionCounter;
}

export async function saveWaitlistEntry(
  entry: WaitlistSubmission,
  customDb?: D1Database | null
): Promise<WaitlistSubmission> {
  const db = customDb !== undefined ? customDb : getWaitlistDatabase();

  if (db) {
    try {
      await db
        .prepare(
          `INSERT INTO waitlist (
            id, email, name, company, client, use_case, github_username, referral_code, position, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          entry.id,
          entry.email,
          entry.name ?? null,
          entry.company ?? null,
          entry.client ?? null,
          entry.useCase ?? null,
          entry.githubUsername ?? null,
          entry.referralCode,
          entry.position,
          entry.createdAt
        )
        .run();
    } catch (err) {
      console.warn("D1 insert failed in saveWaitlistEntry, updating memory fallback:", err);
    }
  }

  // Also mirror in in-memory store
  const existingIdx = inMemoryStore.findIndex((e) => e.email === entry.email);
  if (existingIdx >= 0) {
    inMemoryStore[existingIdx] = entry;
  } else {
    inMemoryStore.push(entry);
  }

  return entry;
}
