import { type TransactionDto, toTransactionDto } from "../dto/transaction-dto.js";
import { Month } from "../../domain/value-object/month.js";
import type { TransactionRepository } from "../gateway/transaction-repository.js";

export class ListTransactions {
  private readonly txnRepository: TransactionRepository;

  constructor(txnRepository: TransactionRepository) {
    this.txnRepository = txnRepository;
  }

  execute(monthStr: string): TransactionDto[] {
    const month = Month.from(monthStr);
    return this.txnRepository.findByMonth(month).map((txn) => toTransactionDto(txn));
  }
}
