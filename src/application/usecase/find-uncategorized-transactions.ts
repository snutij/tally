import { type TransactionDto, toTransactionDto } from "../dto/transaction-dto.js";
import { Month } from "../../domain/value-object/month.js";
import type { TransactionGateway } from "../gateway/transaction-gateway.js";

export class FindUncategorizedTransactions {
  private readonly txnGateway: TransactionGateway;

  constructor(txnGateway: TransactionGateway) {
    this.txnGateway = txnGateway;
  }

  execute(monthStr: string): { all: TransactionDto[]; uncategorized: TransactionDto[] } {
    const month = Month.from(monthStr);
    const all = this.txnGateway.findByMonth(month);
    return {
      all: all.map((txn) => toTransactionDto(txn)),
      uncategorized: all.filter((txn) => !txn.categoryId).map((txn) => toTransactionDto(txn)),
    };
  }
}
