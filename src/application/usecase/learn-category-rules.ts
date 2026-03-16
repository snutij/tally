import type { CategoryId } from "../../domain/value-object/category-id.js";
import type { CategoryRuleRepository } from "../gateway/category-rule-repository.js";
import type { Transaction } from "../../domain/entity/transaction.js";
import { createCategoryRule } from "../../domain/entity/category-rule.js";
import { extractPattern } from "../../domain/service/extract-pattern.js";

export class LearnCategoryRules {
  private readonly ruleRepo: CategoryRuleRepository;

  constructor(ruleRepo: CategoryRuleRepository) {
    this.ruleRepo = ruleRepo;
  }

  learn(transactions: Transaction[]): void {
    for (const txn of transactions) {
      if (txn.categoryId) {
        this.learnOne(txn.label, txn.categoryId);
      }
    }
  }

  private learnOne(label: string, categoryId: CategoryId): void {
    const pattern = extractPattern(label);
    if (!pattern) {
      return;
    }

    const existing = this.ruleRepo.findByPattern(pattern);
    // Skip only if the same learned rule already exists (no change needed)
    if (existing?.source === "learned" && existing.categoryId.equals(categoryId)) {
      return;
    }

    // Otherwise upsert: create a new learned rule (replaces any existing default for this pattern)
    const rule = createCategoryRule(pattern, categoryId.value, "learned");
    this.ruleRepo.save(rule);
  }
}
