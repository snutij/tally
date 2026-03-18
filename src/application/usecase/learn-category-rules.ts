import { CategoryId } from "../../domain/value-object/category-id.js";
import type { CategoryRegistry } from "../../domain/service/category-registry.js";
import { CategoryRule } from "../../domain/entity/category-rule.js";
import type { CategoryRuleGateway } from "../gateway/category-rule-gateway.js";
import type { IdGenerator } from "../gateway/id-generator.js";
import type { TransactionDto } from "../dto/transaction-dto.js";
import { extractPattern } from "../../domain/service/extract-pattern.js";

export class LearnCategoryRules {
  private readonly ruleGateway: CategoryRuleGateway;
  private readonly bankPrefixes: string[];
  private readonly idGenerator: IdGenerator;
  private readonly registry: CategoryRegistry;

  constructor(
    ruleGateway: CategoryRuleGateway,
    bankPrefixes: string[],
    idGenerator: IdGenerator,
    registry: CategoryRegistry,
  ) {
    this.ruleGateway = ruleGateway;
    this.bankPrefixes = bankPrefixes;
    this.idGenerator = idGenerator;
    this.registry = registry;
  }

  learn(transactions: TransactionDto[]): void {
    for (const txn of transactions) {
      if (txn.categoryId) {
        this.learnOne(txn.label, txn.categoryId);
      }
    }
  }

  private learnOne(label: string, categoryId: string): void {
    // Skip if category ID is not valid — don't propagate corrupted data into rules
    if (!this.registry.has(categoryId)) {
      return;
    }

    const pattern = extractPattern(label, this.bankPrefixes);
    if (!pattern) {
      return;
    }

    const brandedCategoryId = CategoryId(categoryId);
    const existing = this.ruleGateway.findByPattern(pattern);
    // Skip only if the same learned rule already exists (no change needed)
    if (existing?.source === "learned" && existing.categoryId === brandedCategoryId) {
      return;
    }

    // Otherwise upsert: create a new learned rule (replaces any existing default for this pattern)
    const id = this.idGenerator.fromPattern(pattern);
    const rule = CategoryRule.create(id, pattern, categoryId, "learned", this.registry);
    this.ruleGateway.save(rule);
  }
}
