import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import type { CategoryRepository } from "../../src/application/gateway/category-repository.js";
import { CategoryRule } from "../../src/domain/entity/category-rule.js";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";
import { Money } from "../../src/domain/value-object/money.js";
import type { RuleBookRepository } from "../../src/application/gateway/rule-book-repository.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import { TransactionId } from "../../src/domain/value-object/transaction-id.js";
import type { TransactionRepository } from "../../src/application/gateway/transaction-repository.js";
import type { UnitOfWork } from "../../src/application/gateway/unit-of-work.js";
import { join } from "node:path";
import { openDatabase } from "../../src/infrastructure/persistence/sqlite-repository.js";
import { tmpdir } from "node:os";

function makeTestRule(
  pattern: string,
  categoryId: string,
  source: "default" | "learned",
): CategoryRule {
  return CategoryRule.create(`id-${pattern}`.slice(0, 32), pattern, categoryId, source);
}

describe("SqliteCategoryRepository", () => {
  let tmpDir: string;
  let close: () => void;
  let categoryRepository: CategoryRepository;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "tally-cat-test-"));
    ({ close, categoryRepository } = openDatabase(join(tmpDir, "test.db")));
  });

  afterEach(() => {
    close();
    rmSync(tmpDir, { recursive: true });
  });

  it("returns all DEFAULT_CATEGORIES after seeding", () => {
    const categories = categoryRepository.findAll();
    expect(categories).toHaveLength(DEFAULT_CATEGORIES.length);
    const ids = categories.map((cat) => cat.id);
    for (const defaultCat of DEFAULT_CATEGORIES) {
      expect(ids).toContain(defaultCat.id);
    }
  });

  it("returns categories with correct id, name, and group", () => {
    const categories = categoryRepository.findAll();
    const [first] = DEFAULT_CATEGORIES;
    const found = categories.find((cat) => cat.id === first?.id);
    expect(found?.name).toBe(first?.name);
    expect(found?.group).toBe(first?.group);
  });
});

describe("SqliteRepository", () => {
  let tmpDir: string;
  let close: () => void;
  let txnRepository: TransactionRepository;
  let ruleBookRepository: RuleBookRepository;
  let unitOfWork: UnitOfWork;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "tally-test-"));
    ({ close, txnRepository, ruleBookRepository, unitOfWork } = openDatabase(
      join(tmpDir, "test.db"),
    ));
  });

  afterEach(() => {
    close();
    rmSync(tmpDir, { recursive: true });
  });

  describe("RuleBookRepository", () => {
    it("starts with an empty rule book on a new database", () => {
      const rules = ruleBookRepository.load().allRules();
      expect(rules).toHaveLength(0);
    });

    it("saves and retrieves a learned rule", () => {
      const ruleBook = ruleBookRepository.load();
      ruleBook.addRule(makeTestRule(String.raw`\bcustommerchant\b`, "w06", "learned"));
      ruleBookRepository.save(ruleBook);

      const found = ruleBookRepository.load().findByPattern(String.raw`\bcustommerchant\b`);
      expect(found).toBeDefined();
      expect(found?.categoryId).toBe("w06");
      expect(found?.source).toBe("learned");
    });

    it("upserts a learned rule (same pattern, new category)", () => {
      const ruleBook = ruleBookRepository.load();
      ruleBook.addRule(makeTestRule(String.raw`\bspotify\b`, "w06", "learned"));
      ruleBookRepository.save(ruleBook);

      const ruleBook2 = ruleBookRepository.load();
      ruleBook2.removeByPattern(String.raw`\bspotify\b`);
      ruleBook2.addRule(makeTestRule(String.raw`\bspotify\b`, "w01", "learned"));
      ruleBookRepository.save(ruleBook2);

      const found = ruleBookRepository.load().findByPattern(String.raw`\bspotify\b`);
      expect(found?.source).toBe("learned");
      expect(found?.categoryId).toBe("w01");
    });

    it("findByPattern returns undefined for unknown pattern", () => {
      expect(ruleBookRepository.load().findByPattern(String.raw`\bnonexistent\b`)).toBeUndefined();
    });

    it("filters out rules with invalid regex on load and logs a warning", async () => {
      const dbPath = join(tmpDir, "test.db");

      const { default: BetterSqlite3 } = await import("better-sqlite3");
      const rawDb = new BetterSqlite3(dbPath);
      rawDb
        .prepare(
          `INSERT INTO category_rules (id, pattern, category_id, source) VALUES (?, ?, ?, ?)`,
        )
        .run("corrupt-id-xxx", "[unclosed", "n01", "default");
      rawDb.close();

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        const loaded = ruleBookRepository.load();
        expect(loaded.findByPattern("[unclosed")).toBeUndefined();
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("[unclosed"));
      } finally {
        warnSpy.mockRestore();
      }
    });

    it("removeByPattern deletes the rule", () => {
      const ruleBook = ruleBookRepository.load();
      ruleBook.addRule(makeTestRule(String.raw`\btoremove\b`, "w01", "learned"));
      ruleBookRepository.save(ruleBook);

      const ruleBook2 = ruleBookRepository.load();
      ruleBook2.removeByPattern(String.raw`\btoremove\b`);
      ruleBookRepository.save(ruleBook2);

      expect(ruleBookRepository.load().findByPattern(String.raw`\btoremove\b`)).toBeUndefined();
    });

    it("re-opening DB preserves learned rules", () => {
      const dbPath = join(tmpDir, "test.db");

      const ruleBook = ruleBookRepository.load();
      ruleBook.addRule(makeTestRule(String.raw`\bcarrefour\b`, "w02", "learned"));
      ruleBookRepository.save(ruleBook);
      close();

      const result2 = openDatabase(dbPath);
      const found = result2.ruleBookRepository.load().findByPattern(String.raw`\bcarrefour\b`);
      expect(found?.source).toBe("learned");
      expect(found?.categoryId).toBe("w02");
      result2.close();
    });
  });

  describe("TransactionRepository", () => {
    it("distinctMonths returns empty array when no transactions", () => {
      expect(txnRepository.distinctMonths()).toEqual([]);
    });

    it("distinctMonths returns single month", () => {
      txnRepository.saveAll([
        Transaction.create({
          amount: Money.fromEuros(-10),
          date: Temporal.PlainDate.from("2026-03-01"),
          id: TransactionId("tx-dm-1"),
          label: "A",
          source: "csv",
        }),
      ]);
      const months = txnRepository.distinctMonths();
      expect(months).toHaveLength(1);
      expect(months[0]?.toString()).toBe("2026-03");
    });

    it("distinctMonths returns multiple months in chronological order", () => {
      txnRepository.saveAll([
        Transaction.create({
          amount: Money.fromEuros(-10),
          date: Temporal.PlainDate.from("2026-05-01"),
          id: TransactionId("tx-dm-3"),
          label: "C",
          source: "csv",
        }),
        Transaction.create({
          amount: Money.fromEuros(-10),
          date: Temporal.PlainDate.from("2026-03-01"),
          id: TransactionId("tx-dm-2"),
          label: "B",
          source: "csv",
        }),
        Transaction.create({
          amount: Money.fromEuros(-10),
          date: Temporal.PlainDate.from("2026-03-15"),
          id: TransactionId("tx-dm-4"),
          label: "D",
          source: "csv",
        }),
      ]);
      const months = txnRepository.distinctMonths();
      expect(months).toHaveLength(2);
      expect(months[0]?.toString()).toBe("2026-03");
      expect(months[1]?.toString()).toBe("2026-05");
    });

    it("saves and retrieves transactions by month", () => {
      txnRepository.saveAll([
        Transaction.create({
          amount: Money.fromEuros(-800),
          date: Temporal.PlainDate.from("2026-03-01"),
          id: TransactionId("tx-1"),
          label: "Rent",
          source: "csv",
        }),
        Transaction.create({
          amount: Money.fromEuros(-800),
          date: Temporal.PlainDate.from("2026-04-01"),
          id: TransactionId("tx-2"),
          label: "Rent April",
          source: "csv",
        }),
      ]);

      const marchTxns = txnRepository.findByMonth(Temporal.PlainYearMonth.from("2026-03"));
      expect(marchTxns).toHaveLength(1);
      expect(marchTxns[0]?.id).toBe("tx-1");

      const aprilTxns = txnRepository.findByMonth(Temporal.PlainYearMonth.from("2026-04"));
      expect(aprilTxns).toHaveLength(1);
      expect(aprilTxns[0]?.id).toBe("tx-2");
    });

    it("returns empty array when findByIds called with empty array", () => {
      expect(txnRepository.findByIds([])).toEqual([]);
    });

    it("returns empty array for month with no transactions", () => {
      expect(txnRepository.findByMonth(Temporal.PlainYearMonth.from("2026-03"))).toEqual([]);
    });
  });

  describe("UnitOfWork", () => {
    it("commits multiple operations atomically", () => {
      unitOfWork.runInTransaction(() => {
        txnRepository.saveAll([
          Transaction.create({
            amount: Money.fromEuros(-10),
            date: Temporal.PlainDate.from("2026-03-01"),
            id: TransactionId("tx-uow"),
            label: "UoW test",
            source: "csv",
          }),
        ]);
        const ruleBook = ruleBookRepository.load();
        ruleBook.addRule(makeTestRule(String.raw`\buow\b`, "w01", "learned"));
        ruleBookRepository.save(ruleBook);
      });
      expect(txnRepository.findByMonth(Temporal.PlainYearMonth.from("2026-03"))).toHaveLength(1);
      expect(ruleBookRepository.load().findByPattern(String.raw`\buow\b`)).toBeDefined();
    });
  });
});
