import { CategoryId } from "../../domain/value-object/category-id.js";
import type { CategoryRuleRepository } from "../gateway/category-rule-repository.js";
import type { TransactionDto } from "../dto/transaction-dto.js";
import { createCategoryRule } from "../../domain/entity/category-rule.js";
import { extractPattern } from "../../domain/service/extract-pattern.js";

export class LearnCategoryRules {
  private readonly ruleRepo: CategoryRuleRepository;
  private readonly bankPrefixes: string[];

  constructor(ruleRepo: CategoryRuleRepository, bankPrefixes: string[]) {
    this.ruleRepo = ruleRepo;
    this.bankPrefixes = bankPrefixes;
  }

  learn(transactions: TransactionDto[]): void {
    for (const txn of transactions) {
      if (txn.categoryId) {
        this.learnOne(txn.label, txn.categoryId);
      }
    }
  }

  private learnOne(label: string, categoryId: string): void {
    const pattern = extractPattern(label, this.bankPrefixes);
    if (!pattern) {
      return;
    }

    const brandedCategoryId = CategoryId(categoryId);
    const existing = this.ruleRepo.findByPattern(pattern);
    // Skip only if the same learned rule already exists (no change needed)
    if (existing?.source === "learned" && existing.categoryId === brandedCategoryId) {
      return;
    }

    // Otherwise upsert: create a new learned rule (replaces any existing default for this pattern)
    const rule = createCategoryRule(pattern, categoryId, "learned");
    this.ruleRepo.save(rule);
  }
}
