import { EventDispatcher, TransactionCategorized } from "../../domain/event/index.js";
import type { RuleBookRepository } from "../gateway/rule-book-repository.js";
import type { TransactionDto } from "../dto/transaction-dto.js";
import { TransactionId } from "../../domain/value-object/transaction-id.js";

export class ApplyCategoryRules {
  private readonly ruleBookRepository: RuleBookRepository;
  private readonly eventDispatcher: EventDispatcher;

  constructor(ruleBookRepository: RuleBookRepository, eventDispatcher = new EventDispatcher()) {
    this.ruleBookRepository = ruleBookRepository;
    this.eventDispatcher = eventDispatcher;
  }

  apply(transactions: TransactionDto[]): {
    matched: TransactionDto[];
    unmatched: TransactionDto[];
  } {
    const ruleBook = this.ruleBookRepository.load();
    const matched: TransactionDto[] = [];
    const unmatched: TransactionDto[] = [];

    for (const txn of transactions) {
      const match = ruleBook.match(txn.label);
      if (match === undefined) {
        unmatched.push(txn);
      } else {
        matched.push({ ...txn, categoryId: match.categoryId });
        this.eventDispatcher.dispatch(
          TransactionCategorized(TransactionId(txn.id), match.categoryId, match.ruleId),
        );
      }
    }

    return { matched, unmatched };
  }
}
