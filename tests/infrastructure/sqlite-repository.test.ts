import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import type { CategoryRepository } from "../../src/application/gateway/category-repository.js";
import { CategoryRule } from "../../src/domain/entity/category-rule.js";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";
import { Money } from "../../src/domain/value-object/money.js";
import type { RuleBookRepository } from "../../src/application/gateway/rule-book-repository.js";
import { Sha256IdGenerator } from "../../src/infrastructure/id/sha256-id-generator.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import { TransactionId } from "../../src/domain/value-object/transaction-id.js";
import type { TransactionRepository } from "../../src/application/gateway/transaction-repository.js";
import type { UnitOfWork } from "../../src/application/gateway/unit-of-work.js";
import { join } from "node:path";
import { openDatabase } from "../../src/infrastructure/persistence/sqlite-repository.js";
import { tmpdir } from "node:os";

const idGenerator = new Sha256IdGenerator();

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
    ({ close, categoryRepository } = openDatabase(join(tmpDir, "test.db"), idGenerator));
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
      idGenerator,
    ));
  });

  afterEach(() => {
    close();
    rmSync(tmpDir, { recursive: true });
  });

  describe("RuleBookRepository", () => {
    it("seeds default rules on open", () => {
      const rules = ruleBookRepository.load().allRules();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every((rule) => rule.source === "default")).toBe(true);
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

    it("upserts an existing rule (learned overrides default)", () => {
      // \bspotify\b is a seeded default rule → w06; override with learned → w01
      const ruleBook = ruleBookRepository.load();
      ruleBook.removeByPattern(String.raw`\bspotify\b`);
      ruleBook.addRule(makeTestRule(String.raw`\bspotify\b`, "w01", "learned"));
      ruleBookRepository.save(ruleBook);

      const found = ruleBookRepository.load().findByPattern(String.raw`\bspotify\b`);
      expect(found?.source).toBe("learned");
      expect(found?.categoryId).toBe("w01");
    });

    it("findByPattern returns undefined for unknown pattern", () => {
      expect(ruleBookRepository.load().findByPattern(String.raw`\bnonexistent\b`)).toBeUndefined();
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

    it("re-opening DB does not overwrite learned rule with default", () => {
      const dbPath = join(tmpDir, "test.db");

      // Override \bcarrefour\b (default n02) with a learned rule → w02
      const ruleBook = ruleBookRepository.load();
      ruleBook.removeByPattern(String.raw`\bcarrefour\b`);
      ruleBook.addRule(makeTestRule(String.raw`\bcarrefour\b`, "w02", "learned"));
      ruleBookRepository.save(ruleBook);
      close();

      const result2 = openDatabase(dbPath, idGenerator);
      const found = result2.ruleBookRepository.load().findByPattern(String.raw`\bcarrefour\b`);
      expect(found?.source).toBe("learned");
      expect(found?.categoryId).toBe("w02");
      result2.close();
    });
  });

  describe("TransactionRepository", () => {
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
