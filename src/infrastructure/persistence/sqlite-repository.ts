import { Budget, type BudgetLine } from "../../domain/entity/budget.js";
import type { BudgetRepository } from "../../application/gateway/budget-repository.js";
import { CategoryGroup } from "../../domain/value-object/category-group.js";
import { DEFAULT_CATEGORIES } from "../../domain/default-categories.js";
import Database from "better-sqlite3";
import { DateOnly } from "../../domain/value-object/date-only.js";
import { Money } from "../../domain/value-object/money.js";
import type { Month } from "../../domain/value-object/month.js";
import type { Transaction } from "../../domain/entity/transaction.js";
import type { TransactionRepository } from "../../application/gateway/transaction-repository.js";

const VALID_GROUPS = new Set<string>(Object.values(CategoryGroup));

function assertCategoryGroup(value: string): CategoryGroup {
  if (!VALID_GROUPS.has(value)) {
    throw new Error(`Invalid CategoryGroup in database: "${value}"`);
  }
  return value as CategoryGroup;
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      "group" TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budgets (
      month TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS budget_lines (
      month TEXT NOT NULL,
      category_id TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      PRIMARY KEY (month, category_id),
      FOREIGN KEY (month) REFERENCES budgets(month),
      FOREIGN KEY (category_id) REFERENCES categories(id)
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
  `);

  try {
    db.exec("ALTER TABLE transactions RENAME COLUMN source_bank TO source");
  } catch {
    // Column already named `source` on fresh databases
  }

  const upsert = db.prepare(
    `INSERT OR REPLACE INTO categories (id, name, "group") VALUES (?, ?, ?)`,
  );
  for (const cat of DEFAULT_CATEGORIES) {
    upsert.run(cat.id, cat.name, cat.group);
  }
}

export class SqliteBudgetRepository implements BudgetRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  save(budget: Budget): void {
    const runTx = this.db.transaction(() => {
      const upsertCat = this.db.prepare(
        `INSERT OR REPLACE INTO categories (id, name, "group") VALUES (?, ?, ?)`,
      );
      for (const line of budget.lines) {
        upsertCat.run(line.category.id, line.category.name, line.category.group);
      }

      this.db.prepare(`INSERT OR REPLACE INTO budgets (month) VALUES (?)`).run(budget.month.value);

      this.db.prepare(`DELETE FROM budget_lines WHERE month = ?`).run(budget.month.value);

      const insertLine = this.db.prepare(
        `INSERT INTO budget_lines (month, category_id, amount_cents) VALUES (?, ?, ?)`,
      );
      for (const line of budget.lines) {
        insertLine.run(budget.month.value, line.category.id, line.amount.cents);
      }
    });
    runTx();
  }

  findByMonth(month: Month): Budget | null {
    const row = this.db.prepare(`SELECT month FROM budgets WHERE month = ?`).get(month.value) as
      | { month: string }
      | undefined;

    if (!row) {
      // eslint-disable-next-line unicorn/no-null -- BudgetRepository interface contract returns null
      return null;
    }

    const lineRows = this.db
      .prepare(
        `SELECT bl.category_id, bl.amount_cents, c.name, c."group"
         FROM budget_lines bl
         JOIN categories c ON c.id = bl.category_id
         WHERE bl.month = ?`,
      )
      .all(month.value) as {
      category_id: string;
      amount_cents: number;
      name: string;
      group: string;
    }[];

    const lines: BudgetLine[] = lineRows.map((lineRow) => ({
      amount: Money.fromCents(lineRow.amount_cents),
      category: {
        group: assertCategoryGroup(lineRow.group),
        id: lineRow.category_id,
        name: lineRow.name,
      },
    }));

    return new Budget(month, lines);
  }

  exists(month: Month): boolean {
    const row = this.db.prepare(`SELECT 1 FROM budgets WHERE month = ?`).get(month.value);
    return row !== undefined;
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
          txn.id,
          txn.date.toString(),
          txn.label,
          txn.amount.cents,
          // eslint-disable-next-line unicorn/no-null -- SQLite requires null for missing column values
          txn.categoryId ?? null,
          txn.source,
        );
      }
    });
    runTx();
  }

  findByIds(ids: string[]): Transaction[] {
    if (ids.length === 0) {
      return [];
    }
    const placeholders = ids.map(() => "?").join(", ");
    const rows = this.db
      .prepare(
        `SELECT id, date, label, amount_cents, category_id, source
         FROM transactions WHERE id IN (${placeholders})`,
      )
      .all(...ids) as {
      id: string;
      date: string;
      label: string;
      amount_cents: number;
      category_id: string | null;
      source: string;
    }[];

    return rows.map((dbRow) => ({
      amount: Money.fromCents(dbRow.amount_cents),
      categoryId: dbRow.category_id ?? undefined,
      date: DateOnly.from(dbRow.date),
      id: dbRow.id,
      label: dbRow.label,
      source: dbRow.source,
    }));
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

    return rows.map((dbRow) => ({
      amount: Money.fromCents(dbRow.amount_cents),
      categoryId: dbRow.category_id ?? undefined,
      date: DateOnly.from(dbRow.date),
      id: dbRow.id,
      label: dbRow.label,
      source: dbRow.source,
    }));
  }
}

export function openDatabase(dbPath: string): {
  db: Database.Database;
  budgetRepo: SqliteBudgetRepository;
  txnRepo: SqliteTransactionRepository;
} {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return {
    budgetRepo: new SqliteBudgetRepository(db),
    db,
    txnRepo: new SqliteTransactionRepository(db),
  };
}
