import Database from "better-sqlite3";
import { InfrastructureError } from "../error.js";
import type { SqlQueryRunner } from "../../application/gateway/sql-query-runner.js";

const DISALLOWED_KEYWORDS =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|TRUNCATE|ATTACH|DETACH)\b/i;

export class SqliteQueryRunner implements SqlQueryRunner {
  private readonly dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  executeReadOnly(sql: string): Promise<Record<string, unknown>[]> {
    const trimmed = sql.trim();

    if (DISALLOWED_KEYWORDS.test(trimmed)) {
      return Promise.reject(
        new InfrastructureError(
          "Query contains disallowed statements. Only SELECT queries are permitted.",
        ),
      );
    }

    const db = new Database(this.dbPath, { readonly: true });
    try {
      const stmt = db.prepare(trimmed);
      return Promise.resolve(stmt.all() as Record<string, unknown>[]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return Promise.reject(new InfrastructureError(`SQL query failed: ${msg}`));
    } finally {
      db.close();
    }
  }
}
