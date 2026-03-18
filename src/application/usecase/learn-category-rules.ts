import { CategoryId } from "../../domain/value-object/category-id.js";
import type { CategoryRegistry } from "../../domain/service/category-registry.js";
import { CategoryRule } from "../../domain/entity/category-rule.js";
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
      (txn) => txn.categoryId !== undefined && this.registry.has(txn.categoryId),
    );
    if (relevant.length === 0) {
      return;
    }

    const ruleBook = this.ruleBookRepository.load();
    let changed = false;

    for (const txn of relevant) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- filtered above
      const categoryId = txn.categoryId!;
      const pattern = extractPattern(txn.label, this.bankPrefixes);
      if (pattern) {
        const brandedCategoryId = CategoryId(categoryId);
        const existing = ruleBook.findByPattern(pattern);
        // Only upsert when the existing rule differs (avoid no-op writes)
        const alreadyLearned =
          existing?.source === "learned" && existing.categoryId === brandedCategoryId;
        if (!alreadyLearned) {
          // Upsert: remove old (if any), add new learned rule
          if (existing) {
            ruleBook.removeByPattern(pattern);
          }
          const id = this.idGenerator.fromPattern(pattern);
          const rule = CategoryRule.create(id, pattern, categoryId, "learned");
          ruleBook.addRule(rule);
          changed = true;
        }
      }
    }

    if (changed) {
      this.ruleBookRepository.save(ruleBook);
    }
  }
}
