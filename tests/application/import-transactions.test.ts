import { beforeEach, describe, expect, it } from "vitest";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { ImportTransactions } from "../../src/application/usecase/import-transactions.js";
import { InMemoryTransactionRepository } from "../helpers/in-memory-repositories.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import { TransactionId } from "../../src/domain/value-object/transaction-id.js";

function txn(id: string, categoryId?: string): Transaction {
  return Transaction.create({
    amount: Money.fromEuros(-42.5),
    categoryId: categoryId ? CategoryId(categoryId) : undefined,
    date: DateOnly.from("2026-03-01"),
    id: TransactionId(id),
    label: "Test transaction",
    source: "csv",
  });
}

describe("ImportTransactions", () => {
  let txnRepo: InMemoryTransactionRepository;
  let useCase: ImportTransactions;

  beforeEach(() => {
    txnRepo = new InMemoryTransactionRepository();
    useCase = new ImportTransactions(txnRepo);
  });

  it("saves transactions and returns count", () => {
    const result = useCase.save([txn("tx-1"), txn("tx-2")]);
    expect(result.count).toBe(2);
    expect(txnRepo.saved).toHaveLength(2);
  });

  it("splits by category status", () => {
    const categorized = txn("tx-1", "n01");
    txnRepo.saveAll([categorized]);

    const transactions = [txn("tx-1"), txn("tx-2")];
    const { alreadyCategorized, uncategorized } = useCase.splitByCategoryStatus(transactions);

    expect(alreadyCategorized).toHaveLength(1);
    expect(alreadyCategorized[0]?.categoryId).toBe("n01");
    expect(uncategorized).toHaveLength(1);
    expect(uncategorized[0]?.id).toBe("tx-2");
  });
});
