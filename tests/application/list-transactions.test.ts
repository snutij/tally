import { beforeEach, describe, expect, it } from "vitest";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { InMemoryTransactionRepository } from "../helpers/in-memory-repositories.js";
import { ListTransactions } from "../../src/application/usecase/list-transactions.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Month } from "../../src/domain/value-object/month.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import { TransactionId } from "../../src/domain/value-object/transaction-id.js";

function txn(id: string, date: string): Transaction {
  return Transaction.create({
    amount: Money.fromEuros(-10),
    date: DateOnly.from(date),
    id: TransactionId(id),
    label: "TEST",
    source: "csv",
  });
}

describe("ListTransactions", () => {
  let txnRepo: InMemoryTransactionRepository;
  let useCase: ListTransactions;

  beforeEach(() => {
    txnRepo = new InMemoryTransactionRepository();
    useCase = new ListTransactions(txnRepo);
  });

  it("returns transactions for the given month", () => {
    txnRepo.saveAll([txn("t1", "2026-03-01"), txn("t2", "2026-03-15")]);
    const result = useCase.findByMonth(Month.from("2026-03"));
    expect(result).toHaveLength(2);
  });

  it("excludes transactions from other months", () => {
    txnRepo.saveAll([txn("t1", "2026-03-01"), txn("t2", "2026-04-01")]);
    const result = useCase.findByMonth(Month.from("2026-03"));
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("t1");
  });

  it("returns empty array when no transactions exist for the month", () => {
    const result = useCase.findByMonth(Month.from("2026-03"));
    expect(result).toHaveLength(0);
  });
});
