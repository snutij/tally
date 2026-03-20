import { beforeEach, describe, expect, it } from "vitest";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { CategoryRegistry } from "../../src/domain/service/category-registry.js";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";

import { GenerateReport } from "../../src/application/usecase/generate-report.js";
import { InMemoryTransactionRepository } from "../helpers/in-memory-repositories.js";
import { InvalidMonth } from "../../src/domain/error/index.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import { TransactionId } from "../../src/domain/value-object/transaction-id.js";

function makeTxn(id: string, amount: number, date: string, categoryId?: string): Transaction {
  return Transaction.create({
    amount: Money.fromEuros(amount),
    categoryId: categoryId ? CategoryId(categoryId) : undefined,
    date: Temporal.PlainDate.from(date),
    id: TransactionId(id),
    label: `txn-${id}`,
    source: "csv",
  });
}

describe("GenerateReport", () => {
  let txnGateway: InMemoryTransactionRepository;
  let useCase: GenerateReport;

  beforeEach(() => {
    txnGateway = new InMemoryTransactionRepository();
    useCase = new GenerateReport(txnGateway, new CategoryRegistry(DEFAULT_CATEGORIES));
  });

  it("generates report with transactions (no budget needed)", () => {
    txnGateway.saveAll([
      makeTxn("1", 3000, "2026-03-01", "inc01"),
      makeTxn("2", -800, "2026-03-05", "n01"),
    ]);

    const report = useCase.execute("2026-03");
    expect(report.totalIncomeActual).toBe(3000);
    expect(report.totalExpenseActual).toBe(800);
    expect(report.transactionCount).toBe(2);
  });

  it("returns empty report when no transactions exist", () => {
    const report = useCase.execute("2026-03");
    expect(report.totalExpenseActual).toBe(0);
    expect(report.transactionCount).toBe(0);
  });

  it("only includes transactions from the requested month", () => {
    txnGateway.saveAll([
      makeTxn("1", -800, "2026-03-01", "n01"),
      makeTxn("2", -800, "2026-04-01", "n01"),
    ]);

    const report = useCase.execute("2026-03");
    expect(report.transactionCount).toBe(1);
    expect(report.totalExpenseActual).toBe(800);
  });

  it("handles uncategorized transactions gracefully", () => {
    txnGateway.saveAll([makeTxn("1", -50, "2026-03-15")]);

    const report = useCase.execute("2026-03");
    expect(report.transactionCount).toBe(1);
    expect(report.uncategorized).toBe(50);
    expect(report.totalExpenseActual).toBe(0);
  });

  it("throws InvalidMonth for invalid month string", () => {
    expect(() => useCase.execute("not-a-month")).toThrow(InvalidMonth);
  });

  it("accepts custom spending targets", () => {
    txnGateway.saveAll([makeTxn("1", 2000, "2026-03-01", "inc01")]);

    const report = useCase.execute("2026-03", { invest: 10, needs: 60, wants: 30 });
    const needs = report.groups.find((grp) => grp.group === "NEEDS");
    expect(needs?.budgeted).toBe(1200); // 2000 × 60%
  });
});
