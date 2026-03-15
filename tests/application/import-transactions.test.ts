import { beforeEach, describe, expect, it } from "vitest";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { ImportTransactions } from "../../src/application/usecase/import-transactions.js";
import { InMemoryTransactionRepository } from "../helpers/in-memory-repositories.js";
import { Money } from "../../src/domain/value-object/money.js";
import type { Transaction } from "../../src/domain/entity/transaction.js";
import type { TransactionParser } from "../../src/application/gateway/transaction-parser.js";

class StubParser implements TransactionParser {
  // eslint-disable-next-line class-methods-use-this -- implements TransactionParser interface
  parse(_filePath: string): Transaction[] {
    return [
      {
        amount: Money.fromEuros(-42.5),
        date: DateOnly.from("2026-03-01"),
        id: "tx-1",
        label: "Test transaction",
        source: "csv",
      },
      {
        amount: Money.fromEuros(-10),
        date: DateOnly.from("2026-03-15"),
        id: "tx-2",
        label: "Another transaction",
        source: "csv",
      },
    ];
  }
}

describe("ImportTransactions", () => {
  let txnRepo: InMemoryTransactionRepository;
  let useCase: ImportTransactions;
  let parser: StubParser;

  beforeEach(() => {
    parser = new StubParser();
    txnRepo = new InMemoryTransactionRepository();
    useCase = new ImportTransactions(txnRepo);
  });

  it("parses transactions via parser", () => {
    const transactions = useCase.parse(parser, "dummy.csv");
    expect(transactions).toHaveLength(2);
  });

  it("saves transactions and returns count", () => {
    const transactions = useCase.parse(parser, "dummy.csv");
    const result = useCase.save(transactions);
    expect(result.count).toBe(2);
    expect(txnRepo.saved).toHaveLength(2);
  });

  it("splits by category status", () => {
    const categorized: Transaction = {
      amount: Money.fromEuros(-42.5),
      categoryId: "n01",
      date: DateOnly.from("2026-03-01"),
      id: "tx-1",
      label: "Test transaction",
      source: "csv",
    };
    txnRepo.saveAll([categorized]);

    const parsed = useCase.parse(parser, "dummy.csv");
    const { alreadyCategorized, uncategorized } = useCase.splitByCategoryStatus(parsed);

    expect(alreadyCategorized).toHaveLength(1);
    expect(alreadyCategorized[0]?.categoryId).toBe("n01");
    expect(uncategorized).toHaveLength(1);
    expect(uncategorized[0]?.id).toBe("tx-2");
  });
});
