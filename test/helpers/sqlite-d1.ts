import { DatabaseSync } from "node:sqlite";

/**
 * Minimal D1Database implementation backed by a real in-memory SQLite database
 * (Node's built-in `node:sqlite`). Unlike hand-rolled mocks that pattern-match
 * on SQL strings, this executes real SQL, so schema/statement bugs surface in
 * tests the same way they do on Cloudflare D1.
 *
 * `exec()` deliberately mirrors D1/workerd semantics: the input is split on
 * newlines and each line is executed as its own statement.
 */
export interface SqliteD1 extends D1Database {
  /** Direct access to the underlying SQLite handle for assertions. */
  raw: DatabaseSync;
  /** Make every subsequent write (INSERT/UPDATE/DELETE) throw. */
  failWrites: boolean;
}

export function createSqliteD1(): SqliteD1 {
  const sqlite = new DatabaseSync(":memory:");

  const isWrite = (sql: string) => /^\s*(INSERT|UPDATE|DELETE)/i.test(sql);

  const makeStatement = (sql: string, params: unknown[] = []): D1PreparedStatement => {
    const stmt = {
      bind: (...next: unknown[]) => makeStatement(sql, next),
      first: async <T>(colName?: string): Promise<T | null> => {
        const row = sqlite.prepare(sql).get(...(params as never[])) as
          | Record<string, unknown>
          | undefined;
        if (!row) return null;
        return (colName ? row[colName] : row) as T;
      },
      all: async <T>() => {
        const results = sqlite.prepare(sql).all(...(params as never[])) as T[];
        return { results, success: true, meta: {} } as unknown as D1Result<T>;
      },
      run: async () => {
        if (isWrite(sql) && db.failWrites) {
          throw new Error("D1_ERROR: simulated write failure");
        }
        const info = sqlite.prepare(sql).run(...(params as never[]));
        return {
          results: [],
          success: true,
          meta: { changes: Number(info.changes) },
        } as unknown as D1Result;
      },
      raw: async () => {
        throw new Error("raw() not implemented in sqlite-d1 test double");
      },
    };
    return stmt as unknown as D1PreparedStatement;
  };

  const db = {
    raw: sqlite,
    failWrites: false,
    prepare: (sql: string) => makeStatement(sql),
    batch: async (statements: D1PreparedStatement[]) => {
      const results: D1Result[] = [];
      sqlite.exec("BEGIN");
      try {
        for (const s of statements) results.push(await s.run());
        sqlite.exec("COMMIT");
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
      return results;
    },
    exec: async (query: string) => {
      // Mirrors workerd's D1 implementation: one statement per line.
      const lines = query.trim().split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        try {
          sqlite.exec(line);
        } catch (error) {
          throw new Error(
            `D1_EXEC_ERROR: Error in line ${i + 1}: ${line}: ${(error as Error).message}`
          );
        }
      }
      return { count: lines.length, duration: 0 };
    },
  };

  return db as unknown as SqliteD1;
}
