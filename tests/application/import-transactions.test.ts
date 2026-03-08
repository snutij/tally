import { describe, it, expect, beforeEach } from "vitest";
import { ImportTransactions } from "../../src/application/usecase/import-transactions.js";
import { BankImportGateway } from "../../src/application/gateway/bank-import.js";
import { TransactionRepository } from "../../src/application/gateway/transaction-repository.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import { Month } from "../../src/domain/value-object/month.js";
import { Money } from "../../src/domain/value-object/money.js";
import { UnknownBankAdapter } from "../../src/domain/error/index.js";

class StubImporter implements BankImportGateway {
  readonly bankName = "test-bank";
  parse(_filePath: string): Transaction[] {
    return [
      {
        id: "tx-1",
        date: new Date("2026-03-01"),
        label: "Test transaction",
        amount: Money.fromEuros(-42.5),
        sourceBank: "test-bank",
      },
      {
        id: "tx-2",
        date: new Date("2026-03-15"),
        label: "Another transaction",
        amount: Money.fromEuros(-10),
        sourceBank: "test-bank",
      },
    ];
  }
}

class InMemoryTransactionRepository implements TransactionRepository {
  readonly saved: Transaction[] = [];

  saveAll(transactions: Transaction[]): void {
    this.saved.push(...transactions);
  }

  findByMonth(_month: Month): Transaction[] {
    return this.saved;
  }
}

describe("ImportTransactions", () => {
  let txnRepo: InMemoryTransactionRepository;
  let useCase: ImportTransactions;

  beforeEach(() => {
    const importer = new StubImporter();
    txnRepo = new InMemoryTransactionRepository();
    useCase = new ImportTransactions(
      new Map([[importer.bankName, importer]]),
      txnRepo,
    );
  });

  it("parses and saves transactions", () => {
    const result = useCase.execute("test-bank", "dummy.csv");
    expect(result.count).toBe(2);
    expect(txnRepo.saved).toHaveLength(2);
  });

  it("throws UnknownBankAdapter for unknown bank", () => {
    expect(() => useCase.execute("unknown-bank", "dummy.csv")).toThrow(
      UnknownBankAdapter,
    );
  });

  it("lists available banks", () => {
    expect(useCase.listBanks()).toEqual(["test-bank"]);
  });
});
