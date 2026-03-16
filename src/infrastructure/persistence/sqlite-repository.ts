import { type CategoryRule, createCategoryRule } from "../../domain/entity/category-rule.js";
import {
  DEFAULT_LOCALE,
  getDefaultRulesForLocale,
} from "../../domain/default-category-rules/index.js";
import { CategoryId } from "../../domain/value-object/category-id.js";
import type { CategoryRuleRepository } from "../../application/gateway/category-rule-repository.js";
import { DEFAULT_CATEGORIES } from "../../domain/default-categories.js";
import Database from "better-sqlite3";
import { DateOnly } from "../../domain/value-object/date-only.js";
import { Money } from "../../domain/value-object/money.js";
import type { Month } from "../../domain/value-object/month.js";
import { Transaction } from "../../domain/entity/transaction.js";
import { TransactionId } from "../../domain/value-object/transaction-id.js";
import type { TransactionRepository } from "../../application/gateway/transaction-repository.js";

function migrate(db: Database.Database): void {
  // Drop obsolete budget tables from previous schema
  db.exec(`
    DROP TABLE IF EXISTS budget_lines;
    DROP TABLE IF EXISTS budgets;
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      "group" TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      label TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      category_id TEXT,
      source TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS category_rules (
      id TEXT PRIMARY KEY,
      pattern TEXT NOT NULL UNIQUE,
      category_id TEXT NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('default', 'learned')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
  `);

  try {
    db.exec("ALTER TABLE transactions RENAME COLUMN source_bank TO source");
  } catch {
    // Column already named `source` on fresh databases
  }

  const upsertCat = db.prepare(
    `INSERT OR REPLACE INTO categories (id, name, "group") VALUES (?, ?, ?)`,
  );
  for (const cat of DEFAULT_CATEGORIES) {
    upsertCat.run(cat.id.value, cat.name, cat.group);
  }

  const insertRule = db.prepare(
    `INSERT OR IGNORE INTO category_rules (id, pattern, category_id, source) VALUES (?, ?, ?, ?)`,
  );
  for (const entry of getDefaultRulesForLocale(DEFAULT_LOCALE)) {
    const rule = createCategoryRule(entry.pattern, entry.categoryId, "default");
    insertRule.run(rule.id, rule.pattern, rule.categoryId.value, rule.source);
  }
}

export class SqliteTransactionRepository implements TransactionRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  saveAll(transactions: Transaction[]): void {
    const runTx = this.db.transaction(() => {
      const stmt = this.db.prepare(
        `INSERT OR REPLACE INTO transactions (id, date, label, amount_cents, category_id, source)
         VALUES (?, ?, ?, ?, ?, ?)`,
      );
      for (const txn of transactions) {
        stmt.run(
          txn.id.value,
          txn.date.toString(),
          txn.label,
          txn.amount.cents,
          // eslint-disable-next-line unicorn/no-null -- SQLite requires null for missing column values
          txn.categoryId?.value ?? null,
          txn.source,
        );
      }
    });
    runTx();
  }

  findByIds(ids: TransactionId[]): Transaction[] {
    if (ids.length === 0) {
      return [];
    }
    const placeholders = ids.map(() => "?").join(", ");
    const rows = this.db
      .prepare(
        `SELECT id, date, label, amount_cents, category_id, source
         FROM transactions WHERE id IN (${placeholders})`,
      )
      .all(...ids.map((id) => id.value)) as {
      id: string;
      date: string;
      label: string;
      amount_cents: number;
      category_id: string | null;
      source: string;
    }[];

    return rows.map((dbRow) =>
      Transaction.create({
        amount: Money.fromCents(dbRow.amount_cents),
        categoryId: dbRow.category_id ? CategoryId.from(dbRow.category_id) : undefined,
        date: DateOnly.from(dbRow.date),
        id: TransactionId.from(dbRow.id),
        label: dbRow.label,
        source: dbRow.source as Transaction["source"],
      }),
    );
  }

  findByMonth(month: Month): Transaction[] {
    const pattern = `${month.value}-%`;
    const rows = this.db
      .prepare(
        `SELECT id, date, label, amount_cents, category_id, source
         FROM transactions WHERE date LIKE ?`,
      )
      .all(pattern) as {
      id: string;
      date: string;
      label: string;
      amount_cents: number;
      category_id: string | null;
      source: string;
    }[];

    return rows.map((dbRow) =>
      Transaction.create({
        amount: Money.fromCents(dbRow.amount_cents),
        categoryId: dbRow.category_id ? CategoryId.from(dbRow.category_id) : undefined,
        date: DateOnly.from(dbRow.date),
        id: TransactionId.from(dbRow.id),
        label: dbRow.label,
        source: dbRow.source as Transaction["source"],
      }),
    );
  }
}

export class SqliteCategoryRuleRepository implements CategoryRuleRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  save(rule: CategoryRule): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO category_rules (id, pattern, category_id, source) VALUES (?, ?, ?, ?)`,
      )
      .run(rule.id, rule.pattern, rule.categoryId.value, rule.source);
  }

  findAll(): CategoryRule[] {
    const rows = this.db
      .prepare(`SELECT id, pattern, category_id, source FROM category_rules`)
      .all() as { id: string; pattern: string; category_id: string; source: string }[];
    return rows.map((row) => ({
      categoryId: CategoryId.from(row.category_id),
      id: row.id,
      pattern: row.pattern,
      source: row.source as CategoryRule["source"],
    }));
  }

  findByPattern(pattern: string): CategoryRule | undefined {
    const row = this.db
      .prepare(`SELECT id, pattern, category_id, source FROM category_rules WHERE pattern = ?`)
      .get(pattern) as
      | { id: string; pattern: string; category_id: string; source: string }
      | undefined;
    if (!row) {
      return undefined;
    }
    return {
      categoryId: CategoryId.from(row.category_id),
      id: row.id,
      pattern: row.pattern,
      source: row.source as CategoryRule["source"],
    };
  }

  removeByPattern(pattern: string): void {
    this.db.prepare(`DELETE FROM category_rules WHERE pattern = ?`).run(pattern);
  }
}

export function openDatabase(dbPath: string): {
  db: Database.Database;
  txnRepo: SqliteTransactionRepository;
  ruleRepo: SqliteCategoryRuleRepository;
} {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return {
    db,
    ruleRepo: new SqliteCategoryRuleRepository(db),
    txnRepo: new SqliteTransactionRepository(db),
  };
}
