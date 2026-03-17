import { beforeEach, describe, expect, it } from "vitest";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { ImportTransactions } from "../../src/application/usecase/import-transactions.js";
import { InMemoryTransactionRepository } from "../helpers/in-memory-repositories.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import type { TransactionDto } from "../../src/application/dto/transaction-dto.js";
import { TransactionId } from "../../src/domain/value-object/transaction-id.js";

function dto(id: string, categoryId?: string): TransactionDto {
  return {
    amount: -42.5,
    categoryId,
    date: "2026-03-01",
    id,
    label: "Test transaction",
    source: "csv",
  };
}

describe("ImportTransactions", () => {
  let txnRepo: InMemoryTransactionRepository;
  let useCase: ImportTransactions;

  beforeEach(() => {
    txnRepo = new InMemoryTransactionRepository();
    useCase = new ImportTransactions(txnRepo);
  });

  it("saves transactions and returns count", () => {
    const result = useCase.save([dto("tx-1"), dto("tx-2")]);
    expect(result.count).toBe(2);
    expect(txnRepo.saved).toHaveLength(2);
  });

  it("splits by category status", () => {
    // Pre-save a categorized transaction in the repository
    const categorizedEntity = Transaction.create({
      amount: Money.fromEuros(-42.5),
      categoryId: CategoryId("n01"),
      date: DateOnly.from("2026-03-01"),
      id: TransactionId("tx-1"),
      label: "Test transaction",
      source: "csv",
    });
    txnRepo.saveAll([categorizedEntity]);

    const transactions = [dto("tx-1"), dto("tx-2")];
    const { alreadyCategorized, uncategorized } = useCase.splitByCategoryStatus(transactions);

    expect(alreadyCategorized).toHaveLength(1);
    expect(alreadyCategorized[0]?.categoryId).toBe("n01");
    expect(uncategorized).toHaveLength(1);
    expect(uncategorized[0]?.id).toBe("tx-2");
  });
});
