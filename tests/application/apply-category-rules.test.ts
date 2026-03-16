import { beforeEach, describe, expect, it } from "vitest";
import { ApplyCategoryRules } from "../../src/application/usecase/apply-category-rules.js";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { InMemoryCategoryRuleRepository } from "../helpers/in-memory-repositories.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import { TransactionId } from "../../src/domain/value-object/transaction-id.js";
import { createCategoryRule } from "../../src/domain/entity/category-rule.js";

function txn(label: string, id = "t1"): Transaction {
  return Transaction.create({
    amount: Money.fromEuros(-10),
    date: DateOnly.from("2026-03-15"),
    id: TransactionId.from(id),
    label,
    source: "csv",
  });
}

describe("ApplyCategoryRules", () => {
  let ruleRepo: InMemoryCategoryRuleRepository;
  let useCase: ApplyCategoryRules;

  beforeEach(() => {
    ruleRepo = new InMemoryCategoryRuleRepository();
    useCase = new ApplyCategoryRules(ruleRepo);
  });

  it("auto-categorizes a matching transaction", () => {
    ruleRepo.save(createCategoryRule(String.raw`\bspotify\b`, "w06", "default"));
    const { matched, unmatched } = useCase.apply([txn("PRLV SEPA SPOTIFY")]);
    expect(matched).toHaveLength(1);
    expect(matched[0]?.categoryId?.value).toBe("w06");
    expect(unmatched).toHaveLength(0);
  });

  it("leaves non-matching transactions in unmatched", () => {
    ruleRepo.save(createCategoryRule(String.raw`\bspotify\b`, "w06", "default"));
    const { matched, unmatched } = useCase.apply([txn("SOME UNKNOWN MERCHANT")]);
    expect(matched).toHaveLength(0);
    expect(unmatched).toHaveLength(1);
  });

  it("learned rules take precedence over default rules", () => {
    ruleRepo.save(createCategoryRule(String.raw`\bcarrefour\b`, "n02", "default"));
    ruleRepo.save(createCategoryRule(String.raw`\bcarrefour\b`, "w02", "learned"));
    const { matched } = useCase.apply([txn("CARREFOUR CITY PARIS")]);
    expect(matched[0]?.categoryId?.value).toBe("w02");
  });

  it("skips rules with invalid regex without crashing", () => {
    // Manually inject an invalid pattern (bypassing factory validation)
    ruleRepo["store"].set("[bad", {
      categoryId: CategoryId.from("n02"),
      id: "x",
      pattern: "[bad",
      source: "default",
    });
    ruleRepo.save(createCategoryRule(String.raw`\bspotify\b`, "w06", "default"));
    const { matched } = useCase.apply([txn("PRLV SEPA SPOTIFY")]);
    expect(matched[0]?.categoryId?.value).toBe("w06");
  });

  it("matching is case-insensitive", () => {
    ruleRepo.save(createCategoryRule(String.raw`\bcarrefour\b`, "n02", "default"));
    const { matched } = useCase.apply([txn("carte cb carrefour city")]);
    expect(matched[0]?.categoryId?.value).toBe("n02");
  });

  it("matched transactions are Transaction instances", () => {
    ruleRepo.save(createCategoryRule(String.raw`\bspotify\b`, "w06", "default"));
    const { matched } = useCase.apply([txn("PRLV SEPA SPOTIFY")]);
    expect(matched[0]).toBeInstanceOf(Transaction);
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
