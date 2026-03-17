import { DEFAULT_CATEGORIES, DEFAULT_CATEGORY_REGISTRY } from "../../domain/default-categories.js";
import { DEFAULT_LOCALE, getDefaultRulesForLocale } from "../config/category-rules/index.js";
import { CategoryId } from "../../domain/value-object/category-id.js";
import { CategoryRule } from "../../domain/entity/category-rule.js";
import type { CategoryRuleRepository } from "../../application/gateway/category-rule-repository.js";
import Database from "better-sqlite3";
import { DateOnly } from "../../domain/value-object/date-only.js";
import { Money } from "../../domain/value-object/money.js";
import type { Month } from "../../domain/value-object/month.js";
import { Sha256IdGenerator } from "../id/sha256-id-generator.js";
import { Transaction } from "../../domain/entity/transaction.js";
import { TransactionId } from "../../domain/value-object/transaction-id.js";
import type { TransactionRepository } from "../../application/gateway/transaction-repository.js";
import type { UnitOfWork } from "../../application/gateway/unit-of-work.js";

interface TransactionRow {
  id: string;
  date: string;
  label: string;
  amount_cents: number;
  category_id: string | null;
  source: string;
}

function rowToTransaction(row: TransactionRow): Transaction {
  return Transaction.create({
    amount: Money.fromCents(row.amount_cents),
    categoryId: row.category_id ? CategoryId(row.category_id) : undefined,
    date: DateOnly.from(row.date),
    id: TransactionId(row.id),
    label: row.label,
    source: row.source as Transaction["source"],
  });
}

function migrateSchema(db: Database.Database): void {
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
}

function seedDefaults(db: Database.Database): void {
  const upsertCat = db.prepare(
    `INSERT OR REPLACE INTO categories (id, name, "group") VALUES (?, ?, ?)`,
  );
  for (const cat of DEFAULT_CATEGORIES) {
    upsertCat.run(cat.id, cat.name, cat.group);
  }

  const insertRule = db.prepare(
    `INSERT OR IGNORE INTO category_rules (id, pattern, category_id, source) VALUES (?, ?, ?, ?)`,
  );
  const idGenerator = new Sha256IdGenerator();
  for (const entry of getDefaultRulesForLocale(DEFAULT_LOCALE)) {
    const id = idGenerator.fromPattern(entry.pattern);
    const rule = CategoryRule.create(
      id,
      entry.pattern,
      entry.categoryId,
      "default",
      DEFAULT_CATEGORY_REGISTRY,
    );
    insertRule.run(rule.id, rule.pattern, rule.categoryId, rule.source);
  }
}

class SqliteTransactionRepository implements TransactionRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  saveAll(transactions: Transaction[]): void {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO transactions (id, date, label, amount_cents, category_id, source)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (const txn of transactions) {
      stmt.run(
        txn.id,
        txn.date.toString(),
        txn.label,
        txn.amount.cents,
        // eslint-disable-next-line unicorn/no-null -- SQLite requires null for missing column values
        txn.categoryId ?? null,
        txn.source,
      );
    }
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
      .all(...ids) as TransactionRow[];

    return rows.map((row) => rowToTransaction(row));
  }

  findByMonth(month: Month): Transaction[] {
    const pattern = `${month.value}-%`;
    const rows = this.db
      .prepare(
        `SELECT id, date, label, amount_cents, category_id, source
         FROM transactions WHERE date LIKE ?`,
      )
      .all(pattern) as TransactionRow[];

    return rows.map((row) => rowToTransaction(row));
  }
}

class SqliteCategoryRuleRepository implements CategoryRuleRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  save(rule: CategoryRule): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO category_rules (id, pattern, category_id, source) VALUES (?, ?, ?, ?)`,
      )
      .run(rule.id, rule.pattern, rule.categoryId, rule.source);
  }

  findAll(): CategoryRule[] {
    const rows = this.db
      .prepare(`SELECT id, pattern, category_id, source FROM category_rules`)
      .all() as { id: string; pattern: string; category_id: string; source: string }[];
    return rows.map((row) =>
      CategoryRule.create(
        row.id,
        row.pattern,
        row.category_id,
        row.source as CategoryRule["source"],
        DEFAULT_CATEGORY_REGISTRY,
      ),
    );
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
    return CategoryRule.create(
      row.id,
      row.pattern,
      row.category_id,
      row.source as CategoryRule["source"],
      DEFAULT_CATEGORY_REGISTRY,
    );
  }

  removeByPattern(pattern: string): void {
    this.db.prepare(`DELETE FROM category_rules WHERE pattern = ?`).run(pattern);
  }
}

export function openDatabase(dbPath: string): {
  txnRepo: TransactionRepository;
  ruleRepo: CategoryRuleRepository;
  unitOfWork: UnitOfWork;
  close(): void;
} {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrateSchema(db);
  seedDefaults(db);
  return {
    close: () => db.close(),
    ruleRepo: new SqliteCategoryRuleRepository(db),
    txnRepo: new SqliteTransactionRepository(db),
    unitOfWork: { runInTransaction: (fn) => db.transaction(fn)() },
  };
}
