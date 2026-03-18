import { Transaction, type TransactionSource } from "../../domain/entity/transaction.js";
import { DateOnly } from "../../domain/value-object/date-only.js";
import type { DomainEventPublisher } from "../gateway/domain-event-publisher.js";
import { Money } from "../../domain/value-object/money.js";
import type { RuleBookRepository } from "../gateway/rule-book-repository.js";
import type { TransactionDto } from "../dto/transaction-dto.js";
import { TransactionId } from "../../domain/value-object/transaction-id.js";

export class ApplyCategoryRules {
  private readonly ruleBookRepository: RuleBookRepository;
  private readonly eventPublisher: DomainEventPublisher;

  constructor(ruleBookRepository: RuleBookRepository, eventPublisher: DomainEventPublisher) {
    this.ruleBookRepository = ruleBookRepository;
    this.eventPublisher = eventPublisher;
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
        // Create a temporary entity to record the TransactionCategorized event
        const entity = Transaction.create({
          amount: Money.fromEuros(txn.amount),
          categoryId: undefined,
          date: DateOnly.from(txn.date),
          id: TransactionId(txn.id),
          label: txn.label,
          source: txn.source as TransactionSource,
        });
        const categorized = entity.categorize(match.categoryId, match.ruleId);
        for (const event of categorized.pullDomainEvents()) {
          this.eventPublisher.publish(event);
        }
        matched.push({ ...txn, categoryId: match.categoryId });
      }
    }

    return { matched, unmatched };
  }
}
