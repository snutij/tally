import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import Database from "better-sqlite3";
import { InfrastructureError } from "../../src/infrastructure/error.js";
import { Sha256IdGenerator } from "../../src/infrastructure/id/sha256-id-generator.js";
import { SqliteQueryRunner } from "../../src/infrastructure/persistence/sqlite-query-runner.js";
import { SqliteSchemaIntrospector } from "../../src/infrastructure/persistence/sqlite-schema-introspector.js";
import { join } from "node:path";
import { openDatabase } from "../../src/infrastructure/persistence/sqlite-repository.js";
import { tmpdir } from "node:os";

const idGenerator = new Sha256IdGenerator();

describe("SqliteQueryRunner", () => {
  let tmpDir: string;
  let dbPath: string;
  let runner: SqliteQueryRunner;
  let close: () => void;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "tally-query-runner-test-"));
    dbPath = join(tmpDir, "test.db");
    ({ close } = openDatabase(dbPath, idGenerator));
    runner = new SqliteQueryRunner(dbPath);
  });

  afterEach(() => {
    close();
    rmSync(tmpDir, { recursive: true });
  });

  it("executes a valid SELECT query and returns rows", async () => {
    const rows = await runner.executeReadOnly("SELECT id, name FROM categories LIMIT 3");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("id");
    expect(rows[0]).toHaveProperty("name");
  });

  it("returns empty array for a valid SELECT with no results", async () => {
    const rows = await runner.executeReadOnly(
      "SELECT * FROM transactions WHERE date = '1900-01-01'",
    );
    expect(rows).toEqual([]);
  });

  it("rejects INSERT statement", async () => {
    await expect(
      runner.executeReadOnly("INSERT INTO categories (id, name, \"group\") VALUES ('x', 'y', 'z')"),
    ).rejects.toThrow(InfrastructureError);
    await expect(
      runner.executeReadOnly("INSERT INTO categories (id, name, \"group\") VALUES ('x', 'y', 'z')"),
    ).rejects.toThrow("disallowed statements");
  });

  it("rejects UPDATE statement", async () => {
    await expect(
      runner.executeReadOnly("UPDATE categories SET name = 'foo' WHERE id = 'n01'"),
    ).rejects.toThrow(InfrastructureError);
  });

  it("rejects DELETE statement", async () => {
    await expect(runner.executeReadOnly("DELETE FROM categories WHERE id = 'n01'")).rejects.toThrow(
      InfrastructureError,
    );
  });

  it("rejects DROP statement", async () => {
    await expect(runner.executeReadOnly("DROP TABLE categories")).rejects.toThrow(
      InfrastructureError,
    );
  });

  it("rejects multi-statement SELECT followed by DROP", async () => {
    await expect(runner.executeReadOnly("SELECT 1; DROP TABLE categories")).rejects.toThrow(
      InfrastructureError,
    );
  });

  it("rejects CREATE statement", async () => {
    await expect(runner.executeReadOnly("CREATE TABLE foo (id TEXT)")).rejects.toThrow(
      InfrastructureError,
    );
  });

  it("throws InfrastructureError for invalid SQL syntax", async () => {
    await expect(runner.executeReadOnly("SELECT * FROM nonexistent_table")).rejects.toThrow(
      InfrastructureError,
    );
  });

  it("handles non-Error thrown by prepare using String()", async () => {
    class FakeException {
      override toString(): string {
        return "raw string error";
      }
    }
    const spy = vi.spyOn(Database.prototype, "prepare").mockImplementationOnce(() => {
      throw new FakeException();
    });
    try {
      await expect(runner.executeReadOnly("SELECT 1")).rejects.toThrow(InfrastructureError);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("SqliteSchemaIntrospector", () => {
  let tmpDir: string;
  let dbPath: string;
  let introspector: SqliteSchemaIntrospector;
  let close: () => void;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "tally-introspector-test-"));
    dbPath = join(tmpDir, "test.db");
    ({ close } = openDatabase(dbPath, idGenerator));
    introspector = new SqliteSchemaIntrospector(dbPath);
  });

  afterEach(() => {
    close();
    rmSync(tmpDir, { recursive: true });
  });

  it("returns schema context containing table DDL", async () => {
    const context = await introspector.getSchemaContext();
    expect(context).toContain("CREATE TABLE");
    expect(context).toContain("transactions");
    expect(context).toContain("categories");
    expect(context).toContain("category_rules");
  });

  it("returns schema context containing category taxonomy", async () => {
    const context = await introspector.getSchemaContext();
    expect(context).toContain("## Categories");
    expect(context).toContain("n01");
    expect(context).toContain("Groceries");
  });

  it("returns schema context with NEEDS/WANTS/INVESTMENTS groups", async () => {
    const context = await introspector.getSchemaContext();
    expect(context).toContain("NEEDS");
    expect(context).toContain("WANTS");
    expect(context).toContain("INVESTMENTS");
  });
});
