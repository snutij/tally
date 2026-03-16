import { beforeEach, describe, expect, it } from "vitest";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { InMemoryCategoryRuleRepository } from "../helpers/in-memory-repositories.js";
import { LearnCategoryRules } from "../../src/application/usecase/learn-category-rules.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import { TransactionId } from "../../src/domain/value-object/transaction-id.js";
import { createCategoryRule } from "../../src/domain/entity/category-rule.js";

function txn(label: string, categoryId?: string, id = "t1"): Transaction {
  return Transaction.create({
    amount: Money.fromEuros(-10),
    categoryId: categoryId ? CategoryId(categoryId) : undefined,
    date: DateOnly.from("2026-03-15"),
    id: TransactionId(id),
    label,
    source: "csv",
  });
}

describe("LearnCategoryRules", () => {
  let ruleRepo: InMemoryCategoryRuleRepository;
  let useCase: LearnCategoryRules;

  beforeEach(() => {
    ruleRepo = new InMemoryCategoryRuleRepository();
    useCase = new LearnCategoryRules(ruleRepo);
  });

  it("creates a learned rule from a categorized transaction", () => {
    useCase.learn([txn("PRLV SEPA SPOTIFY", "w06")]);
    const rule = ruleRepo.findByPattern(String.raw`\bspotify\b`);
    expect(rule).toBeDefined();
    expect(rule?.categoryId).toBe("w06");
    expect(rule?.source).toBe("learned");
  });

  it("does not create a rule for uncategorized (skipped) transactions", () => {
    useCase.learn([txn("SOME MERCHANT")]);
    expect(ruleRepo.findAll()).toHaveLength(0);
  });

  it("does not create a duplicate learned rule if same learned pattern+category already exists", () => {
    ruleRepo.save(createCategoryRule(String.raw`\bspotify\b`, "w06", "learned"));
    useCase.learn([txn("PRLV SEPA SPOTIFY", "w06")]);
    // Still just 1 rule — no duplicate
    expect(ruleRepo.findAll()).toHaveLength(1);
  });

  it("upserts a learned rule over an existing default rule for the same extracted pattern", () => {
    // extractPattern("CARTE CB CARREFOUR CITY") → "\\bcarrefour\\s+city\\b"
    ruleRepo.save(createCategoryRule(String.raw`\bcarrefour\s+city\b`, "n02", "default"));
    useCase.learn([txn("CARTE CB CARREFOUR CITY", "w02")]);
    const rule = ruleRepo.findByPattern(String.raw`\bcarrefour\s+city\b`);
    expect(rule?.source).toBe("learned");
    expect(rule?.categoryId).toBe("w02");
  });

  it("does not create a rule when no meaningful pattern can be extracted", () => {
    useCase.learn([txn("VIR 15/03/2026", "n01")]);
    expect(ruleRepo.findAll()).toHaveLength(0);
  });

  it("creates multiple rules for multiple distinct transactions", () => {
    useCase.learn([
      txn("PRLV SEPA SPOTIFY", "w06", "t1"),
      txn("CARTE CB CARREFOUR CITY", "n02", "t2"),
    ]);
    expect(ruleRepo.findAll()).toHaveLength(2);
  });
});
