import type { CategoryRuleGateway } from "../gateway/category-rule-gateway.js";
import { RuleBook } from "../../domain/aggregate/rule-book.js";
import type { TransactionDto } from "../dto/transaction-dto.js";

export class ApplyCategoryRules {
  private readonly ruleGateway: CategoryRuleGateway;

  constructor(ruleGateway: CategoryRuleGateway) {
    this.ruleGateway = ruleGateway;
  }

  apply(transactions: TransactionDto[]): {
    matched: TransactionDto[];
    unmatched: TransactionDto[];
  } {
    const ruleBook = new RuleBook(this.ruleGateway.findAll());
    const matched: TransactionDto[] = [];
    const unmatched: TransactionDto[] = [];

    for (const txn of transactions) {
      const categoryId = ruleBook.match(txn.label);
      if (categoryId === undefined) {
        unmatched.push(txn);
      } else {
        matched.push({ ...txn, categoryId });
      }
    }

    return { matched, unmatched };
  }
}
