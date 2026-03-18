import type { RuleBookRepository } from "../gateway/rule-book-repository.js";
import type { TransactionDto } from "../dto/transaction-dto.js";

export class ApplyCategoryRules {
  private readonly ruleBookRepository: RuleBookRepository;

  constructor(ruleBookRepository: RuleBookRepository) {
    this.ruleBookRepository = ruleBookRepository;
  }

  apply(transactions: TransactionDto[]): {
    matched: TransactionDto[];
    unmatched: TransactionDto[];
  } {
    const ruleBook = this.ruleBookRepository.load();
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
