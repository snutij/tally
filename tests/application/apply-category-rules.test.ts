import { beforeEach, describe, expect, it } from "vitest";
import { ApplyCategoryRules } from "../../src/application/usecase/apply-category-rules.js";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { DEFAULT_CATEGORY_REGISTRY } from "../../src/domain/default-categories.js";
import { InMemoryCategoryRuleRepository } from "../helpers/in-memory-repositories.js";
import type { TransactionDto } from "../../src/application/dto/transaction-dto.js";
import { createCategoryRule } from "../../src/domain/entity/category-rule.js";

function rule(
  pattern: string,
  categoryId: string,
  source: "default" | "learned",
): ReturnType<typeof createCategoryRule> {
  return createCategoryRule(
    `id-${pattern}`.slice(0, 32),
    pattern,
    categoryId,
    source,
    DEFAULT_CATEGORY_REGISTRY,
  );
}

function txn(label: string, id = "t1"): TransactionDto {
  return {
    amount: -10,
    categoryId: undefined,
    date: "2026-03-15",
    id,
    label,
    source: "csv",
  };
}

describe("ApplyCategoryRules", () => {
  let ruleRepo: InMemoryCategoryRuleRepository;
  let useCase: ApplyCategoryRules;

  beforeEach(() => {
    ruleRepo = new InMemoryCategoryRuleRepository();
    useCase = new ApplyCategoryRules(ruleRepo);
  });

  it("auto-categorizes a matching transaction", () => {
    ruleRepo.save(rule(String.raw`\bspotify\b`, "w06", "default"));
    const { matched, unmatched } = useCase.apply([txn("PRLV SEPA SPOTIFY")]);
    expect(matched).toHaveLength(1);
    expect(matched[0]?.categoryId).toBe("w06");
    expect(unmatched).toHaveLength(0);
  });

  it("leaves non-matching transactions in unmatched", () => {
    ruleRepo.save(rule(String.raw`\bspotify\b`, "w06", "default"));
    const { matched, unmatched } = useCase.apply([txn("SOME UNKNOWN MERCHANT")]);
    expect(matched).toHaveLength(0);
    expect(unmatched).toHaveLength(1);
  });

  it("learned rules take precedence over default rules", () => {
    ruleRepo.save(rule(String.raw`\bcarrefour\b`, "n02", "default"));
    ruleRepo.save(rule(String.raw`\bcarrefour\b`, "w02", "learned"));
    const { matched } = useCase.apply([txn("CARREFOUR CITY PARIS")]);
    expect(matched[0]?.categoryId).toBe("w02");
  });

  it("skips rules with invalid regex without crashing", () => {
    // Manually inject an invalid pattern (bypassing factory validation)
    ruleRepo["store"].set("[bad", {
      categoryId: CategoryId("n02"),
      id: "x",
      pattern: "[bad",
      source: "default",
    });
    ruleRepo.save(rule(String.raw`\bspotify\b`, "w06", "default"));
    const { matched } = useCase.apply([txn("PRLV SEPA SPOTIFY")]);
    expect(matched[0]?.categoryId).toBe("w06");
  });

  it("matching is case-insensitive", () => {
    ruleRepo.save(rule(String.raw`\bcarrefour\b`, "n02", "default"));
    const { matched } = useCase.apply([txn("carte cb carrefour city")]);
    expect(matched[0]?.categoryId).toBe("n02");
  });

  it("matched transactions are DTOs with categoryId set", () => {
    ruleRepo.save(rule(String.raw`\bspotify\b`, "w06", "default"));
    const { matched } = useCase.apply([txn("PRLV SEPA SPOTIFY")]);
    const [dto] = matched;
    expect(typeof dto?.categoryId).toBe("string");
    expect(typeof dto?.amount).toBe("number");
  });

  it("handles empty transaction list", () => {
    const { matched, unmatched } = useCase.apply([]);
    expect(matched).toHaveLength(0);
    expect(unmatched).toHaveLength(0);
  });

  it("handles empty rule list", () => {
    const { unmatched } = useCase.apply([txn("CARREFOUR")]);
    expect(unmatched).toHaveLength(1);
  });
});
