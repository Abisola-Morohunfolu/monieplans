// Real SQLite transactions emulate D1 batch atomicity for ledger integration tests.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
export function testD1() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  sqlite.exec(
    readFileSync('drizzle/migrations/0000_fearless_genesis.sql', 'utf8'),
  );
  sqlite.exec(
    readFileSync('drizzle/migrations/0001_flexible_buckets.sql', 'utf8'),
  );
  class Statement {
    constructor(
      readonly sql: string,
      readonly values: (string | number | null)[] = [],
    ) {}
    bind(...values: (string | number | null)[]) {
      return new Statement(this.sql, values);
    }
    async first(column?: string) {
      const row = sqlite.prepare(this.sql).get(...this.values);
      return column ? (row?.[column] ?? null) : (row ?? null);
    }
    execute() {
      const query = sqlite.prepare(this.sql),
        results = query.all(...this.values);
      return {
        success: true,
        results,
        meta: {
          changes: Number(sqlite.prepare('SELECT changes() n').get()!.n),
        },
      };
    }
    async all() {
      return this.execute();
    }
    async run() {
      const result = sqlite.prepare(this.sql).run(...this.values);
      return {
        success: true,
        results: [],
        meta: { changes: Number(result.changes) },
      };
    }
    async raw() {
      return sqlite
        .prepare(this.sql)
        .all(...this.values)
        .map((row) => Object.values(row));
    }
  }
  const db = {
    prepare: (sql: string) => new Statement(sql),
    batch: async (queries: Statement[]) => {
      sqlite.exec('BEGIN');
      try {
        const results = queries.map((q) => q.execute());
        sqlite.exec('COMMIT');
        return results;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  } as unknown as D1Database;
  return { db, sqlite };
}
