import { Transaction, type TransactionSource } from "../../domain/entity/transaction.js";
import { type TransactionDto, toTransactionDto } from "../dto/transaction-dto.js";
import { CategoryId } from "../../domain/value-object/category-id.js";
import { DateOnly } from "../../domain/value-object/date-only.js";
import type { DomainEventPublisher } from "../gateway/domain-event-publisher.js";
import { Money } from "../../domain/value-object/money.js";
import { TransactionId } from "../../domain/value-object/transaction-id.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";

function dtoToImportedTransaction(dto: TransactionDto): Transaction {
  return Transaction.import({
    amount: Money.fromEuros(dto.amount),
    categoryId: dto.categoryId ? CategoryId(dto.categoryId) : undefined,
    date: DateOnly.from(dto.date),
    id: TransactionId(dto.id),
    label: dto.label,
    source: dto.source as TransactionSource,
  });
}

export class ImportTransactions {
  private readonly txnRepository: TransactionRepository;
  private readonly eventPublisher: DomainEventPublisher;

  constructor(txnRepository: TransactionRepository, eventPublisher: DomainEventPublisher) {
    this.txnRepository = txnRepository;
    this.eventPublisher = eventPublisher;
  }

  splitByCategoryStatus(transactions: TransactionDto[]): {
    alreadyCategorized: TransactionDto[];
    uncategorized: TransactionDto[];
  } {
    const ids = transactions.map((dto) => TransactionId(dto.id));
    const existing = this.txnRepository.findByIds(ids);
    const categorizedIds = new Set(
      existing.filter((txn) => txn.isCategorized).map((txn) => txn.id),
    );
    const alreadyCategorized: TransactionDto[] = [];
    const uncategorized: TransactionDto[] = [];
    for (const dto of transactions) {
      const match = categorizedIds.has(dto.id)
        ? existing.find((ex) => ex.id === dto.id)
        : undefined;
      if (match) {
        alreadyCategorized.push(toTransactionDto(match));
      } else {
        uncategorized.push(dto);
      }
    }
    return { alreadyCategorized, uncategorized };
  }

  save(transactions: TransactionDto[]): { count: number } {
    const domain = transactions.map((dto) => dtoToImportedTransaction(dto));
    this.txnRepository.saveAll(domain);
    for (const txn of domain) {
      for (const event of txn.pullDomainEvents()) {
        this.eventPublisher.publish(event);
      }
    }
    return { count: transactions.length };
  }
}
