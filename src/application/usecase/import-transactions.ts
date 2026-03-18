import { Transaction, type TransactionSource } from "../../domain/entity/transaction.js";
import { type TransactionDto, toTransactionDto } from "../dto/transaction-dto.js";
import { CategoryId } from "../../domain/value-object/category-id.js";
import { DateOnly } from "../../domain/value-object/date-only.js";
import { Money } from "../../domain/value-object/money.js";
import type { TransactionGateway } from "../gateway/transaction-gateway.js";
import { TransactionId } from "../../domain/value-object/transaction-id.js";

function dtoToTransaction(dto: TransactionDto): Transaction {
  return Transaction.create({
    amount: Money.fromEuros(dto.amount),
    categoryId: dto.categoryId ? CategoryId(dto.categoryId) : undefined,
    date: DateOnly.from(dto.date),
    id: TransactionId(dto.id),
    label: dto.label,
    source: dto.source as TransactionSource,
  });
}

export class ImportTransactions {
  private readonly txnGateway: TransactionGateway;

  constructor(txnGateway: TransactionGateway) {
    this.txnGateway = txnGateway;
  }

  splitByCategoryStatus(transactions: TransactionDto[]): {
    alreadyCategorized: TransactionDto[];
    uncategorized: TransactionDto[];
  } {
    const ids = transactions.map((dto) => TransactionId(dto.id));
    const existing = this.txnGateway.findByIds(ids);
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
    this.txnGateway.saveAll(transactions.map((dto) => dtoToTransaction(dto)));
    return { count: transactions.length };
  }
}
