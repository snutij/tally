import { CategoryRule, type CategoryRuleSource } from "../../domain/entity/category-rule.js";
import { CategoryId } from "../../domain/value-object/category-id.js";
import type { CategoryRegistry } from "../../domain/service/category-registry.js";
import type { IdGenerator } from "../gateway/id-generator.js";
import type { RuleBookRepository } from "../gateway/rule-book-repository.js";
import type { TransactionDto } from "../dto/transaction-dto.js";
import { extractPattern } from "../../domain/service/extract-pattern.js";

export class LearnCategoryRules {
  private readonly ruleBookRepository: RuleBookRepository;
  private readonly bankPrefixes: string[];
  private readonly idGenerator: IdGenerator;
  private readonly registry: CategoryRegistry;

  constructor(
    ruleBookRepository: RuleBookRepository,
    bankPrefixes: string[],
    idGenerator: IdGenerator,
    registry: CategoryRegistry,
  ) {
    this.ruleBookRepository = ruleBookRepository;
    this.bankPrefixes = bankPrefixes;
    this.idGenerator = idGenerator;
    this.registry = registry;
  }

  learn(transactions: TransactionDto[]): void {
    const relevant = transactions.filter(
      (txn): txn is TransactionDto & { categoryId: string } =>
        txn.categoryId !== undefined && this.registry.has(txn.categoryId),
    );
    if (relevant.length === 0) {
      return;
    }

    const ruleBook = this.ruleBookRepository.load();
    let changed = false;

    for (const txn of relevant) {
      const { categoryId } = txn;
      const pattern = extractPattern(txn.label, this.bankPrefixes);
      if (pattern) {
        const source = this.resolveSource(txn);
        const brandedCategoryId = CategoryId(categoryId);
        const existing = ruleBook.findByPattern(pattern);
        // Skip if an identical learned or suggested rule already exists
        const alreadyLearned =
          (existing?.source === "learned" || existing?.source === "suggested") &&
          existing.categoryId === brandedCategoryId;
        if (!alreadyLearned) {
          // Upsert: remove old (if any), add new rule
          if (existing) {
            ruleBook.removeByPattern(pattern);
          }
          const id = this.idGenerator.fromPattern(pattern);
          const rule = CategoryRule.create(id, pattern, categoryId, source);
          ruleBook.addRule(rule);
          changed = true;
        }
      }
    }

    if (changed) {
      this.ruleBookRepository.save(ruleBook);
    }
  }

  /**
   * Determines rule source based on whether the user confirmed an AI suggestion:
   * - `suggestedCategoryId` defined and matches final `categoryId` → "suggested"
   * - `suggestedCategoryId` defined but differs from `categoryId` → "learned" (overrode AI)
   * - `suggestedCategoryId` undefined → "learned" (manual categorization)
   */
  private resolveSource(txn: TransactionDto & { categoryId: string }): CategoryRuleSource {
    if (txn.suggestedCategoryId !== undefined && txn.suggestedCategoryId === txn.categoryId) {
      return "suggested";
    }
    return "learned";
  }
}
