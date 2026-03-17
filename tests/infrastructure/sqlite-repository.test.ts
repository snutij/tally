import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { CategoryRule } from "../../src/domain/entity/category-rule.js";
import type { CategoryRuleRepository } from "../../src/application/gateway/category-rule-repository.js";
import { DEFAULT_CATEGORY_REGISTRY } from "../../src/domain/default-categories.js";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Month } from "../../src/domain/value-object/month.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import { TransactionId } from "../../src/domain/value-object/transaction-id.js";
import type { TransactionRepository } from "../../src/application/gateway/transaction-repository.js";
import type { UnitOfWork } from "../../src/application/gateway/unit-of-work.js";

function makeTestRule(
  pattern: string,
  categoryId: string,
  source: "default" | "learned",
): CategoryRule {
  return CategoryRule.create(
    `id-${pattern}`.slice(0, 32),
    pattern,
    categoryId,
    source,
    DEFAULT_CATEGORY_REGISTRY,
  );
}
import { join } from "node:path";
import { openDatabase } from "../../src/infrastructure/persistence/sqlite-repository.js";
import { tmpdir } from "node:os";

describe("SqliteRepository", () => {
  let tmpDir: string;
  let close: () => void;
  let txnRepo: TransactionRepository;
  let ruleRepo: CategoryRuleRepository;
  let unitOfWork: UnitOfWork;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "tally-test-"));
    ({ close, txnRepo, ruleRepo, unitOfWork } = openDatabase(join(tmpDir, "test.db")));
  });

  afterEach(() => {
    close();
    rmSync(tmpDir, { recursive: true });
  });

  describe("CategoryRuleRepository", () => {
    it("seeds default rules on open", () => {
      const rules = ruleRepo.findAll();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every((rule) => rule.source === "default")).toBe(true);
    });

    it("saves and retrieves a learned rule", () => {
      // Use a pattern not in the default ruleset to avoid conflicts
      const rule = makeTestRule(String.raw`\bcustommerchant\b`, "w06", "learned");
      ruleRepo.save(rule);
      const found = ruleRepo.findByPattern(String.raw`\bcustommerchant\b`);
      expect(found).toBeDefined();
      expect(found?.categoryId).toBe("w06");
      expect(found?.source).toBe("learned");
    });

    it("upserts an existing rule (learned overrides default)", () => {
      // spotify is a default rule → w06; override it with a learned rule → w01
      const learnedRule = makeTestRule(String.raw`\bspotify\b`, "w01", "learned");
      ruleRepo.save(learnedRule);
      const found = ruleRepo.findByPattern(String.raw`\bspotify\b`);
      expect(found?.source).toBe("learned");
      expect(found?.categoryId).toBe("w01");
    });

    it("findByPattern returns undefined for unknown pattern", () => {
      expect(ruleRepo.findByPattern(String.raw`\bnonexistent\b`)).toBeUndefined();
    });

    it("removeByPattern deletes the rule", () => {
      const rule = makeTestRule(String.raw`\btoremove\b`, "w01", "learned");
      ruleRepo.save(rule);
      ruleRepo.removeByPattern(String.raw`\btoremove\b`);
      expect(ruleRepo.findByPattern(String.raw`\btoremove\b`)).toBeUndefined();
    });

    it("re-opening DB does not overwrite learned rule with default", () => {
      const dbPath = join(tmpDir, "test.db");
      const learnedRule = makeTestRule(String.raw`\bcarrefour\b`, "w02", "learned");
      ruleRepo.removeByPattern(String.raw`\bcarrefour\b`);
      ruleRepo.save(learnedRule);
      close();

      const result2 = openDatabase(dbPath);
      const found = result2.ruleRepo.findByPattern(String.raw`\bcarrefour\b`);
      expect(found?.source).toBe("learned");
      expect(found?.categoryId).toBe("w02");
      result2.close();
    });
  });

  describe("TransactionRepository", () => {
    it("saves and retrieves transactions by month", () => {
      txnRepo.saveAll([
        Transaction.create({
          amount: Money.fromEuros(-800),
          date: DateOnly.from("2026-03-01"),
          id: TransactionId("tx-1"),
          label: "Rent",
          source: "csv",
        }),
        Transaction.create({
          amount: Money.fromEuros(-800),
          date: DateOnly.from("2026-04-01"),
          id: TransactionId("tx-2"),
          label: "Rent April",
          source: "csv",
        }),
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

  describe("UnitOfWork", () => {
    it("commits multiple operations atomically", () => {
      unitOfWork.runInTransaction(() => {
        txnRepo.saveAll([
          Transaction.create({
            amount: Money.fromEuros(-10),
            date: DateOnly.from("2026-03-01"),
            id: TransactionId("tx-uow"),
            label: "UoW test",
            source: "csv",
          }),
        ]);
        ruleRepo.save(makeTestRule(String.raw`\buow\b`, "w01", "learned"));
      });
      expect(txnRepo.findByMonth(Month.from("2026-03"))).toHaveLength(1);
      expect(ruleRepo.findByPattern(String.raw`\buow\b`)).toBeDefined();
    });
  });
});
