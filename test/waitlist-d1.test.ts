import { describe, it, expect, beforeEach } from "vitest";
import {
  getWaitlistStats,
  getWaitlistEntryByEmail,
  getNextWaitlistPosition,
  saveWaitlistEntry,
  ensureWaitlistTable,
  resetInMemoryWaitlistState,
  WaitlistSubmission,
} from "@/lib/waitlist-db";
import { POST as waitlistPost, GET as waitlistGet } from "@/app/api/waitlist/route";
import { env } from "cloudflare:workers";

interface FakeRow {
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

function createMockD1(): D1Database {
  const rows: FakeRow[] = [];

  const mockDb: Partial<D1Database> = {
    exec: async (_sql: string) => ({ count: 0, duration: 0 }),
    prepare: (sql: string) => {
      let boundParams: unknown[] = [];

      const stmt: Partial<D1PreparedStatement> = {
        bind: (...params: unknown[]) => {
          boundParams = params;
          return stmt as D1PreparedStatement;
        },
        first: async <T = Record<string, unknown>>(colName?: string): Promise<T | null> => {
          if (sql.includes("SELECT COUNT(*) as count, MAX(position) as max_position")) {
            const count = rows.length;
            const maxPos = rows.reduce(
              (max, r) => (r.position > max ? r.position : max),
              count > 0 ? rows[0].position : 428
            );
            const res = { count, max_position: count > 0 ? maxPos : null };
            return (colName ? (res as Record<string, unknown>)[colName] : res) as T;
          }

          if (sql.includes("SELECT MAX(position) as max_position")) {
            const maxPos = rows.length > 0 ? Math.max(...rows.map((r) => r.position)) : null;
            const res = { max_position: maxPos };
            return (colName ? (res as Record<string, unknown>)[colName] : res) as T;
          }

          if (sql.includes("SELECT * FROM waitlist WHERE email = ?")) {
            const email = boundParams[0] as string;
            const found = rows.find((r) => r.email === email);
            return (found || null) as T;
          }

          return null;
        },
        all: async <T = Record<string, unknown>>(): Promise<D1Result<T>> => {
          return {
            results: rows as unknown as T[],
            success: true,
            meta: {} as D1Response["meta"],
          };
        },
        run: async <T = Record<string, unknown>>(): Promise<D1Result<T>> => {
          if (sql.includes("INSERT INTO waitlist")) {
            rows.push({
              id: boundParams[0] as string,
              email: boundParams[1] as string,
              name: (boundParams[2] as string) || null,
              company: (boundParams[3] as string) || null,
              client: (boundParams[4] as string) || null,
              use_case: (boundParams[5] as string) || null,
              github_username: (boundParams[6] as string) || null,
              referral_code: boundParams[7] as string,
              position: boundParams[8] as number,
              created_at: boundParams[9] as string,
            });
          }
          return {
            results: [] as T[],
            success: true,
            meta: {
              duration: 1,
              served_by: "mock",
              changes: 1,
              last_row_id: rows.length,
              changed_db: true,
              size_after: 100,
              rows_read: 0,
              rows_written: 1,
            },
          };
        },
      };

      return stmt as D1PreparedStatement;
    },
  };

  return mockDb as D1Database;
}

describe("D1 Database Waitlist Integration", () => {
  let mockDb: D1Database;

  beforeEach(() => {
    resetInMemoryWaitlistState();
    mockDb = createMockD1();
    env.DB = mockDb;
  });

  it("ensures waitlist schema table", async () => {
    await expect(ensureWaitlistTable(mockDb)).resolves.not.toThrow();
  });

  it("retrieves baseline stats when database is empty", async () => {
    const stats = await getWaitlistStats(mockDb);
    expect(stats.totalWaitlistCount).toBe(428);
    expect(stats.status).toBe("accepting_applications");
  });

  it("calculates next waitlist position accurately", async () => {
    const nextPos = await getNextWaitlistPosition(mockDb);
    expect(nextPos).toBe(429);
  });

  it("saves a new waitlist entry to D1 and retrieves it by email", async () => {
    const entry: WaitlistSubmission = {
      id: "wlt_test_1",
      email: "engineer@cloudflare.com",
      name: "Cloudflare Engineer",
      company: "Cloudflare",
      client: "Cursor",
      useCase: "Edge AI workflows",
      githubUsername: "cf-dev",
      referralCode: "SPK-429-CFENG",
      position: 429,
      createdAt: new Date().toISOString(),
    };

    await saveWaitlistEntry(entry, mockDb);

    const retrieved = await getWaitlistEntryByEmail("engineer@cloudflare.com", mockDb);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.email).toBe("engineer@cloudflare.com");
    expect(retrieved?.position).toBe(429);
    expect(retrieved?.referralCode).toBe("SPK-429-CFENG");
    expect(retrieved?.company).toBe("Cloudflare");

    const stats = await getWaitlistStats(mockDb);
    expect(stats.totalWaitlistCount).toBe(429);
  });

  it("waitlist API route interacts directly with D1 database", async () => {
    // 1. Initial GET
    const getRes = await waitlistGet();
    const getJson = (await getRes.json()) as { totalWaitlistCount: number };
    expect(getJson.totalWaitlistCount).toBe(428);

    // 2. POST registration
    const postReq = new Request("http://localhost/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "d1-tester@example.com",
        name: "D1 Tester",
        client: "Claude Desktop",
        useCase: "MCP tool agent",
      }),
    });

    const postRes = await waitlistPost(postReq);
    expect(postRes.status).toBe(201);
    const postJson = (await postRes.json()) as { success: boolean; ticket: { position: number; email: string } };
    expect(postJson.success).toBe(true);
    expect(postJson.ticket.position).toBe(429);
    expect(postJson.ticket.email).toBe("d1-tester@example.com");

    // 3. Confirm entry exists in D1 database
    const inDb = await getWaitlistEntryByEmail("d1-tester@example.com", mockDb);
    expect(inDb).not.toBeNull();
    expect(inDb?.email).toBe("d1-tester@example.com");
    expect(inDb?.position).toBe(429);

    // 4. Duplicate POST returns already registered ticket
    const dupRes = await waitlistPost(
      new Request("http://localhost/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "d1-tester@example.com",
        }),
      })
    );
    expect(dupRes.status).toBe(200);
    const dupJson = (await dupRes.json()) as { alreadyRegistered: boolean; ticket: { position: number } };
    expect(dupJson.alreadyRegistered).toBe(true);
    expect(dupJson.ticket.position).toBe(429);
  });
});
