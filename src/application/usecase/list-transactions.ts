import { type TransactionDto, toTransactionDto } from "../dto/transaction-dto.js";
import { InvalidMonth } from "../../domain/error/index.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";

export class ListTransactions {
  private readonly txnRepository: TransactionRepository;

  constructor(txnRepository: TransactionRepository) {
    this.txnRepository = txnRepository;
  }

  execute(monthStr: string): TransactionDto[] {
    let month: Temporal.PlainYearMonth;
    try {
      month = Temporal.PlainYearMonth.from(monthStr);
    } catch {
      throw new InvalidMonth(monthStr);
    }
    return this.txnRepository.findByMonth(month).map((txn) => toTransactionDto(txn));
  }
}
