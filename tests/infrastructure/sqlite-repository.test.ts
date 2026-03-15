import {
  type SqliteBudgetRepository,
  type SqliteCategoryRuleRepository,
  type SqliteTransactionRepository,
  openDatabase,
} from "../../src/infrastructure/persistence/sqlite-repository.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { Budget } from "../../src/domain/entity/budget.js";
import { CategoryGroup } from "../../src/domain/value-object/category-group.js";
import type Database from "better-sqlite3";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Month } from "../../src/domain/value-object/month.js";
import { createCategoryRule } from "../../src/domain/entity/category-rule.js";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("SqliteRepository", () => {
  let tmpDir: string;
  let db: Database.Database;
  let budgetRepo: SqliteBudgetRepository;
  let txnRepo: SqliteTransactionRepository;
  let ruleRepo: SqliteCategoryRuleRepository;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "tally-test-"));
    const result = openDatabase(join(tmpDir, "test.db"));
    ({ db } = result);
    ({ budgetRepo } = result);
    ({ txnRepo } = result);
    ({ ruleRepo } = result);
  });

  afterEach(() => {
    db.close();
    rmSync(tmpDir, { recursive: true });
  });

  describe("BudgetRepository", () => {
    const month = Month.from("2026-03");

    it("saves and retrieves a budget", () => {
      const budget = new Budget(month, [
        {
          amount: Money.fromEuros(800),
          category: { group: CategoryGroup.NEEDS, id: "rent", name: "Rent" },
        },
      ]);

      budgetRepo.save(budget);
      const found = budgetRepo.findByMonth(month);

      expect(found).not.toBeNull();
      if (!found) {
        return;
      }
      expect(found.month.value).toBe("2026-03");
      expect(found.lines).toHaveLength(1);
      expect(found.lines[0]?.category.id).toBe("rent");
      expect(found.lines[0]?.amount.cents).toBe(80_000);
    });

    it("returns null for non-existent month", () => {
      expect(budgetRepo.findByMonth(month)).toBeNull();
    });

    it("checks existence", () => {
      expect(budgetRepo.exists(month)).toBe(false);
      budgetRepo.save(new Budget(month, []));
      expect(budgetRepo.exists(month)).toBe(true);
    });

    it("throws on corrupted CategoryGroup in DB", () => {
      budgetRepo.save(new Budget(month, []));

      // Directly corrupt the DB
      db.prepare(
        `INSERT INTO categories (id, name, "group") VALUES ('bad', 'Bad', 'INVALID_GROUP')`,
      ).run();
      db.prepare(
        `INSERT INTO budget_lines (month, category_id, amount_cents) VALUES ('2026-03', 'bad', 100)`,
      ).run();

      expect(() => budgetRepo.findByMonth(month)).toThrow("Invalid CategoryGroup");
    });
  });

  describe("CategoryRuleRepository", () => {
    it("seeds default rules on open", () => {
      const rules = ruleRepo.findAll();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every((rule) => rule.source === "default")).toBe(true);
    });

    it("saves and retrieves a learned rule", () => {
      // Use a pattern not in the default ruleset to avoid conflicts
      const rule = createCategoryRule(String.raw`\bcustommerchant\b`, "w06", "learned");
      ruleRepo.save(rule);
      const found = ruleRepo.findByPattern(String.raw`\bcustommerchant\b`);
      expect(found).toBeDefined();
      expect(found?.categoryId).toBe("w06");
      expect(found?.source).toBe("learned");
    });

    it("upserts an existing rule (learned overrides default)", () => {
      // spotify is a default rule → w06; override it with a learned rule → w01
      const learnedRule = createCategoryRule(String.raw`\bspotify\b`, "w01", "learned");
      ruleRepo.save(learnedRule);
      const found = ruleRepo.findByPattern(String.raw`\bspotify\b`);
      expect(found?.source).toBe("learned");
      expect(found?.categoryId).toBe("w01");
    });

    it("findByPattern returns undefined for unknown pattern", () => {
      expect(ruleRepo.findByPattern(String.raw`\bnonexistent\b`)).toBeUndefined();
    });

    it("removeByPattern deletes the rule", () => {
      const rule = createCategoryRule(String.raw`\btoremove\b`, "w01", "learned");
      ruleRepo.save(rule);
      ruleRepo.removeByPattern(String.raw`\btoremove\b`);
      expect(ruleRepo.findByPattern(String.raw`\btoremove\b`)).toBeUndefined();
    });

    it("re-opening DB does not overwrite learned rule with default", () => {
      // Override the default rule for carrefour with a learned rule
      const dbPath = join(tmpDir, "test.db");
      const learnedRule = createCategoryRule(String.raw`\bcarrefour\b`, "w02", "learned");
      // The default rule already exists — save would fail (UNIQUE constraint).
      // Remove default first, then save learned.
      ruleRepo.removeByPattern(String.raw`\bcarrefour\b`);
      ruleRepo.save(learnedRule);
      db.close();

      // Reopen: migration should NOT overwrite with INSERT OR IGNORE
      const result2 = openDatabase(dbPath);
      const found = result2.ruleRepo.findByPattern(String.raw`\bcarrefour\b`);
      expect(found?.source).toBe("learned");
      expect(found?.categoryId).toBe("w02");
      result2.db.close();
    });
  });

  describe("TransactionRepository", () => {
    it("saves and retrieves transactions by month", () => {
      txnRepo.saveAll([
        {
          amount: Money.fromEuros(-800),
          date: DateOnly.from("2026-03-01"),
          id: "tx-1",
          label: "Rent",
          source: "credit-mutuel",
        },
        {
          amount: Money.fromEuros(-800),
          date: DateOnly.from("2026-04-01"),
          id: "tx-2",
          label: "Rent April",
          source: "credit-mutuel",
        },
      ]);

      const marchTxns = txnRepo.findByMonth(Month.from("2026-03"));
      expect(marchTxns).toHaveLength(1);
      expect(marchTxns[0]?.id).toBe("tx-1");

      const aprilTxns = txnRepo.findByMonth(Month.from("2026-04"));
      expect(aprilTxns).toHaveLength(1);
      expect(aprilTxns[0]?.id).toBe("tx-2");
    });

    it("returns empty array when findByIds called with empty array", () => {
      expect(txnRepo.findByIds([])).toEqual([]);
    });

    it("returns empty array for month with no transactions", () => {
      expect(txnRepo.findByMonth(Month.from("2026-03"))).toEqual([]);
    });
  });
});
