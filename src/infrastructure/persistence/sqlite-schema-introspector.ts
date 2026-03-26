import Database from "better-sqlite3";
import type { SchemaIntrospector } from "../../application/gateway/schema-introspector.js";

const SCHEMA_TABLES = ["transactions", "categories", "category_rules"];

export class SqliteSchemaIntrospector implements SchemaIntrospector {
  private readonly dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  getSchemaContext(): Promise<string> {
    const db = new Database(this.dbPath, { readonly: true });
    try {
      const placeholders = SCHEMA_TABLES.map(() => "?").join(", ");
      const ddlRows = db
        .prepare(
          `SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name IN (${placeholders}) ORDER BY name`,
        )
        .all(...SCHEMA_TABLES) as { name: string; sql: string }[];

      const ddl = ddlRows.map((row) => `${row.sql};`).join("\n\n");

      const categories = db
        .prepare(`SELECT id, name, "group" FROM categories ORDER BY "group", id`)
        .all() as { id: string; name: string; group: string }[];

      const categoryList = categories
        .map((cat) => `  ${cat.id}: ${cat.name} (${cat.group})`)
        .join("\n");

      return Promise.resolve(`## Database Schema\n\n${ddl}\n\n## Categories\n\n${categoryList}`);
    } finally {
      db.close();
    }
  }
}
