import { UnknownBankAdapter } from "../../domain/error/index.js";
import { BankImportGateway } from "../gateway/bank-import.js";
import { TransactionRepository } from "../gateway/transaction-repository.js";

export class ImportTransactions {
  constructor(
    private importers: Map<string, BankImportGateway>,
    private txnRepo: TransactionRepository,
  ) {}

  execute(
    bankName: string,
    filePath: string,
  ): { count: number } {
    const importer = this.importers.get(bankName);
    if (!importer) {
      throw new UnknownBankAdapter(bankName);
    }

    const transactions = importer.parse(filePath);
    this.txnRepo.saveAll(transactions);
    return { count: transactions.length };
  }

  listBanks(): string[] {
    return [...this.importers.keys()];
  }
}
