import { type TransactionDto, toTransactionDto } from "../dto/transaction-dto.js";
import { Month } from "../../domain/value-object/month.js";
import type { TransactionGateway } from "../gateway/transaction-gateway.js";

export class ListTransactions {
  private readonly txnGateway: TransactionGateway;

  constructor(txnGateway: TransactionGateway) {
    this.txnGateway = txnGateway;
  }

  execute(monthStr: string): TransactionDto[] {
    const month = Month.from(monthStr);
    return this.txnGateway.findByMonth(month).map((txn) => toTransactionDto(txn));
  }
}
