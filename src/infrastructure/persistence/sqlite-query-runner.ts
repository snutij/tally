import nodeSqlParser, { type Parser as ParserType } from "node-sql-parser";
import Database from "better-sqlite3";
import { InfrastructureError } from "../error.js";
import type { SqlQueryRunner } from "../../application/gateway/sql-query-runner.js";

// node-sql-parser is CommonJS — Parser lives on the default export at runtime
const { Parser } = nodeSqlParser as unknown as { Parser: new () => ParserType };

const ALLOWED_TABLES = new Set(["transactions", "categories", "category_rules"]);
const BLOCKED_TABLES = new Set([
  "sqlite_master",
  "sqlite_sequence",
  "sqlite_stat1",
  "sqlite_stat4",
]);
const MAX_EXECUTION_ROWS = 500;

const parser = new Parser();

function validateAndPrepare(sql: string): string {
  let ast: ReturnType<typeof parser.astify>;

  try {
    ast = parser.astify(sql, { database: "SQLite" });
  } catch {
    throw new InfrastructureError(
      "SQL could not be parsed. Only valid SELECT queries are permitted.",
    );
  }

  // Reject multi-statement input (e.g. "SELECT 1; DROP TABLE ...")
  if (Array.isArray(ast)) {
    throw new InfrastructureError("Multi-statement queries are not permitted.");
  }

  if (ast.type !== "select") {
    throw new InfrastructureError(
      `Query type '${ast.type}' is not permitted. Only SELECT queries are allowed.`,
    );
  }

  // Validate all referenced tables
  const referencedTables = parser
    .tableList(sql, { database: "SQLite" })
    .map((entry: string) => entry.split("::")[2].toLowerCase());

  for (const table of referencedTables) {
    if (BLOCKED_TABLES.has(table)) {
      throw new InfrastructureError(`Access to table '${table}' is not permitted.`);
    }
    if (!ALLOWED_TABLES.has(table)) {
      throw new InfrastructureError(`Table '${table}' is not in the allowed table set.`);
    }
  }

  // Inject LIMIT if absent
  if (ast.limit === null || ast.limit === undefined) {
    ast.limit = { seperator: "", value: [{ type: "number", value: MAX_EXECUTION_ROWS }] };
  }

  return parser.sqlify(ast, { database: "SQLite" });
}

export class SqliteQueryRunner implements SqlQueryRunner {
  private readonly dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  executeReadOnly(sql: string): Promise<Record<string, unknown>[]> {
    let preparedSql: string;
    try {
      preparedSql = validateAndPrepare(sql.trim());
    } catch (error) {
      return Promise.reject(error);
    }

    const db = new Database(this.dbPath, { readonly: true });
    try {
      const stmt = db.prepare(preparedSql);
      return Promise.resolve(stmt.all() as Record<string, unknown>[]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return Promise.reject(new InfrastructureError(`SQL query failed: ${msg}`));
    } finally {
      db.close();
    }
  }
}
