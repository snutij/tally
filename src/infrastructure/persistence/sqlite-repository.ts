import { DEFAULT_LOCALE, getDefaultRulesForLocale } from "../config/category-rules/index.js";
import type {
  LabelEmbeddingRecord,
  LabelEmbeddingRepository,
} from "../../application/gateway/label-embedding-repository.js";
import type { Category } from "../../domain/value-object/category.js";
import type { CategoryGroup } from "../../domain/value-object/category-group.js";
import { CategoryId } from "../../domain/value-object/category-id.js";
import type { CategoryRepository } from "../../application/gateway/category-repository.js";
import { CategoryRule } from "../../domain/entity/category-rule.js";
import { DEFAULT_CATEGORIES } from "../../domain/default-categories.js";
import Database from "better-sqlite3";
import type { IdGenerator } from "../../application/gateway/id-generator.js";
import { Money } from "../../domain/value-object/money.js";
import { RuleBook } from "../../domain/aggregate/rule-book.js";
import type { RuleBookRepository } from "../../application/gateway/rule-book-repository.js";
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
    date: Temporal.PlainDate.from(row.date),
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
      source TEXT NOT NULL CHECK(source IN ('default', 'learned', 'suggested')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS label_embeddings (
      label TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      embedding BLOB NOT NULL,
      model_id TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
  `);

  try {
    db.exec("ALTER TABLE transactions RENAME COLUMN source_bank TO source");
  } catch {
    // Column already named `source` on fresh databases
  }

  // Migrate category_rules CHECK constraint to include 'suggested'
  const ruleSchema = (
    db
      .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='category_rules'`)
      .get() as { sql: string } | undefined
  )?.sql;
  /* v8 ignore next 2 -- one-time migration for databases created before 'suggested' source was added */
  if (ruleSchema && !ruleSchema.includes("suggested")) {
    db.transaction(() => {
      db.exec(`
        ALTER TABLE category_rules RENAME TO _category_rules_old;
        CREATE TABLE category_rules (
          id TEXT PRIMARY KEY,
          pattern TEXT NOT NULL UNIQUE,
          category_id TEXT NOT NULL,
          source TEXT NOT NULL CHECK(source IN ('default', 'learned', 'suggested')),
          FOREIGN KEY (category_id) REFERENCES categories(id)
        );
        INSERT INTO category_rules SELECT * FROM _category_rules_old;
        DROP TABLE _category_rules_old;
      `);
    })();
  }
}

function seedDefaults(db: Database.Database, idGenerator: IdGenerator): void {
  const upsertCat = db.prepare(
    `INSERT OR REPLACE INTO categories (id, name, "group") VALUES (?, ?, ?)`,
  );
  for (const cat of DEFAULT_CATEGORIES) {
    upsertCat.run(cat.id, cat.name, cat.group);
  }

  const insertRule = db.prepare(
    `INSERT OR IGNORE INTO category_rules (id, pattern, category_id, source) VALUES (?, ?, ?, ?)`,
  );
  for (const entry of getDefaultRulesForLocale(DEFAULT_LOCALE)) {
    const id = idGenerator.fromPattern(entry.pattern);
    const rule = CategoryRule.create(id, entry.pattern, entry.categoryId, "default");
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

  findByMonth(month: Temporal.PlainYearMonth): Transaction[] {
    const pattern = `${month.toString()}-%`;
    const rows = this.db
      .prepare(
        `SELECT id, date, label, amount_cents, category_id, source
         FROM transactions WHERE date LIKE ?`,
      )
      .all(pattern) as TransactionRow[];

    return rows.map((row) => rowToTransaction(row));
  }

  findAllCategorized(): Transaction[] {
    const rows = this.db
      .prepare(
        `SELECT id, date, label, amount_cents, category_id, source
         FROM transactions WHERE category_id IS NOT NULL`,
      )
      .all() as TransactionRow[];

    return rows.map((row) => rowToTransaction(row));
  }
}

class SqliteRuleBookRepository implements RuleBookRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  load(): RuleBook {
    const rows = this.db
      .prepare(`SELECT id, pattern, category_id, source FROM category_rules`)
      .all() as { id: string; pattern: string; category_id: string; source: string }[];
    const rules = rows.map((row) =>
      CategoryRule.reconstitute(
        row.id,
        row.pattern,
        row.category_id,
        row.source as CategoryRule["source"],
      ),
    );
    return new RuleBook(rules);
  }

  save(ruleBook: RuleBook): void {
    const rules = ruleBook.allRules();
    const deleteAll = this.db.prepare(`DELETE FROM category_rules`);
    const insert = this.db.prepare(
      `INSERT OR REPLACE INTO category_rules (id, pattern, category_id, source) VALUES (?, ?, ?, ?)`,
    );
    this.db.transaction(() => {
      deleteAll.run();
      for (const rule of rules) {
        insert.run(rule.id, rule.pattern, rule.categoryId, rule.source);
      }
    })();
  }
}

class SqliteLabelEmbeddingRepository implements LabelEmbeddingRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  upsert(label: string, categoryId: string, embedding: Float32Array, modelId: string): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO label_embeddings (label, category_id, embedding, model_id)
         VALUES (?, ?, ?, ?)`,
      )
      .run(label, categoryId, Buffer.from(embedding.buffer), modelId);
  }

  findAllByModel(modelId: string): LabelEmbeddingRecord[] {
    const rows = this.db
      .prepare(
        `SELECT label, category_id, embedding, model_id
         FROM label_embeddings WHERE model_id = ?`,
      )
      .all(modelId) as {
      label: string;
      category_id: string;
      embedding: Buffer;
      model_id: string;
    }[];
    return rows.map((row) => ({
      categoryId: row.category_id,
      embedding: new Float32Array(
        row.embedding.buffer,
        row.embedding.byteOffset,
        row.embedding.length / 4,
      ),
      label: row.label,
      modelId: row.model_id,
    }));
  }

  deleteByModelMismatch(modelId: string): void {
    this.db.prepare(`DELETE FROM label_embeddings WHERE model_id != ?`).run(modelId);
  }
}

class SqliteCategoryRepository implements CategoryRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  findAll(): Category[] {
    const rows = this.db.prepare(`SELECT id, name, "group" FROM categories`).all() as {
      id: string;
      name: string;
      group: string;
    }[];
    return rows.map((row) => ({
      group: row.group as CategoryGroup,
      id: CategoryId(row.id),
      name: row.name,
    }));
  }
}

export function openDatabase(
  dbPath: string,
  idGenerator: IdGenerator,
): {
  txnRepository: TransactionRepository;
  ruleBookRepository: RuleBookRepository;
  categoryRepository: CategoryRepository;
  labelEmbeddingRepository: LabelEmbeddingRepository;
  unitOfWork: UnitOfWork;
  close(): void;
} {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrateSchema(db);
  seedDefaults(db, idGenerator);
  return {
    categoryRepository: new SqliteCategoryRepository(db),
    close: () => db.close(),
    labelEmbeddingRepository: new SqliteLabelEmbeddingRepository(db),
    ruleBookRepository: new SqliteRuleBookRepository(db),
    txnRepository: new SqliteTransactionRepository(db),
    unitOfWork: { runInTransaction: (fn) => db.transaction(fn)() },
  };
}
