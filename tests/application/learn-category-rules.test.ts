import { beforeEach, describe, expect, it } from "vitest";
import { CategoryRegistry } from "../../src/domain/service/category-registry.js";
import { CategoryRule } from "../../src/domain/entity/category-rule.js";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";
import { FR_BANK_PREFIXES } from "../../src/infrastructure/config/category-rules/fr.js";
import type { IdGenerator } from "../../src/application/gateway/id-generator.js";
import { InMemoryCategoryRuleGateway } from "../helpers/in-memory-repositories.js";
import { LearnCategoryRules } from "../../src/application/usecase/learn-category-rules.js";
import type { TransactionDto } from "../../src/application/dto/transaction-dto.js";

const stubIdGenerator: IdGenerator = {
  fromPattern: (pattern: string) => `id-${pattern}`.slice(0, 32).padEnd(32, "-"),
};

function makeRule(
  pattern: string,
  categoryId: string,
  source: "default" | "learned",
): CategoryRule {
  return CategoryRule.create(
    stubIdGenerator.fromPattern(pattern),
    pattern,
    categoryId,
    source,
    new CategoryRegistry(DEFAULT_CATEGORIES),
  );
}

function txn(label: string, categoryId?: string, id = "t1"): TransactionDto {
  return {
    amount: -10,
    categoryId,
    date: "2026-03-15",
    id,
    label,
    source: "csv",
  };
}

describe("LearnCategoryRules", () => {
  let ruleGateway: InMemoryCategoryRuleGateway;
  let useCase: LearnCategoryRules;

  beforeEach(() => {
    ruleGateway = new InMemoryCategoryRuleGateway();
    useCase = new LearnCategoryRules(
      ruleGateway,
      FR_BANK_PREFIXES,
      stubIdGenerator,
      new CategoryRegistry(DEFAULT_CATEGORIES),
    );
  });

  it("creates a learned rule from a categorized transaction", () => {
    useCase.learn([txn("PRLV SEPA SPOTIFY", "w06")]);
    const rule = ruleGateway.findByPattern(String.raw`\bspotify\b`);
    expect(rule).toBeDefined();
    expect(rule?.categoryId).toBe("w06");
    expect(rule?.source).toBe("learned");
  });

  it("does not create a rule for uncategorized (skipped) transactions", () => {
    useCase.learn([txn("SOME MERCHANT")]);
    expect(ruleGateway.findAll()).toHaveLength(0);
  });

  it("skips transactions with unknown category IDs", () => {
    // Simulate a DTO with an invalid categoryId (e.g., from corrupted data)
    useCase.learn([
      {
        amount: -10,
        categoryId: "nonexistent",
        date: "2026-03-15",
        id: "t1",
        label: "PRLV SEPA SPOTIFY",
        source: "csv",
      },
    ]);
    expect(ruleGateway.findAll()).toHaveLength(0);
  });

  it("does not create a duplicate learned rule if same learned pattern+category already exists", () => {
    ruleGateway.save(makeRule(String.raw`\bspotify\b`, "w06", "learned"));
    useCase.learn([txn("PRLV SEPA SPOTIFY", "w06")]);
    // Still just 1 rule — no duplicate
    expect(ruleGateway.findAll()).toHaveLength(1);
  });

  it("upserts a learned rule over an existing default rule for the same extracted pattern", () => {
    ruleGateway.save(makeRule(String.raw`\bcarrefour\s+city\b`, "n02", "default"));
    useCase.learn([txn("CARTE CB CARREFOUR CITY", "w02")]);
    const rule = ruleGateway.findByPattern(String.raw`\bcarrefour\s+city\b`);
    expect(rule?.source).toBe("learned");
    expect(rule?.categoryId).toBe("w02");
  });

  it("does not create a rule when no meaningful pattern can be extracted", () => {
    useCase.learn([txn("VIR 15/03/2026", "n01")]);
    expect(ruleGateway.findAll()).toHaveLength(0);
  });

  it("creates multiple rules for multiple distinct transactions", () => {
    useCase.learn([
      txn("PRLV SEPA SPOTIFY", "w06", "t1"),
      txn("CARTE CB CARREFOUR CITY", "n02", "t2"),
    ]);
    expect(ruleGateway.findAll()).toHaveLength(2);
  });
});
