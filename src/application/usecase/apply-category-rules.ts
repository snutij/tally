import type { CategoryRule } from "../../domain/entity/category-rule.js";
import type { CategoryRuleRepository } from "../gateway/category-rule-repository.js";
import type { TransactionDto } from "../dto/transaction-dto.js";

function firstMatch(label: string, rules: CategoryRule[]): string | undefined {
  for (const rule of rules) {
    let regex: RegExp;
    try {
      regex = new RegExp(rule.pattern, "i");
    } catch {
      // invalid stored pattern — skip gracefully
      // eslint-disable-next-line no-continue -- intentional skip of invalid patterns
      continue;
    }
    if (regex.test(label)) {
      return rule.categoryId;
    }
  }
  return undefined;
}

export class ApplyCategoryRules {
  private readonly ruleRepo: CategoryRuleRepository;

  constructor(ruleRepo: CategoryRuleRepository) {
    this.ruleRepo = ruleRepo;
  }

  apply(transactions: TransactionDto[]): {
    matched: TransactionDto[];
    unmatched: TransactionDto[];
  } {
    const all = this.ruleRepo.findAll();
    // Learned rules take precedence: try them before defaults
    const sorted: CategoryRule[] = [
      ...all.filter((rule) => rule.source === "learned"),
      ...all.filter((rule) => rule.source === "default"),
    ];

    const matched: TransactionDto[] = [];
    const unmatched: TransactionDto[] = [];

    for (const txn of transactions) {
      const categoryId = firstMatch(txn.label, sorted);
      if (categoryId === undefined) {
        unmatched.push(txn);
      } else {
        matched.push({ ...txn, categoryId });
      }
    }

    return { matched, unmatched };
  }
}
