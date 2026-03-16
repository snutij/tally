import { beforeEach, describe, expect, it } from "vitest";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { GenerateReport } from "../../src/application/usecase/generate-report.js";
import { InMemoryTransactionRepository } from "../helpers/in-memory-repositories.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Month } from "../../src/domain/value-object/month.js";
import { Transaction } from "../../src/domain/entity/transaction.js";

function makeTxn(id: string, amount: number, date: string, categoryId?: string): Transaction {
  return Transaction.create({
    amount: Money.fromEuros(amount),
    categoryId,
    date: DateOnly.from(date),
    id,
    label: `txn-${id}`,
    source: "csv",
  });
}

describe("GenerateReport", () => {
  let txnRepo: InMemoryTransactionRepository;
  let useCase: GenerateReport;

  beforeEach(() => {
    txnRepo = new InMemoryTransactionRepository();
    useCase = new GenerateReport(txnRepo);
  });

  it("generates report with transactions (no budget needed)", () => {
    const month = Month.from("2026-03");
    txnRepo.saveAll([
      makeTxn("1", 3000, "2026-03-01", "inc01"),
      makeTxn("2", -800, "2026-03-05", "n01"),
    ]);

    const report = useCase.execute(month);
    expect(report.totalIncomeActual.cents).toBe(300_000);
    expect(report.totalExpenseActual.cents).toBe(80_000);
    expect(report.transactionCount).toBe(2);
  });

  it("returns empty report when no transactions exist", () => {
    const month = Month.from("2026-03");
    const report = useCase.execute(month);
    expect(report.totalExpenseActual.cents).toBe(0);
    expect(report.transactionCount).toBe(0);
  });

  it("only includes transactions from the requested month", () => {
    const march = Month.from("2026-03");
    txnRepo.saveAll([
      makeTxn("1", -800, "2026-03-01", "n01"),
      makeTxn("2", -800, "2026-04-01", "n01"),
    ]);

    const report = useCase.execute(march);
    expect(report.transactionCount).toBe(1);
    expect(report.totalExpenseActual.cents).toBe(80_000);
  });

  it("handles uncategorized transactions gracefully", () => {
    const month = Month.from("2026-03");
    txnRepo.saveAll([makeTxn("1", -50, "2026-03-15")]);

    const report = useCase.execute(month);
    expect(report.transactionCount).toBe(1);
    expect(report.uncategorized.cents).toBe(5000);
    expect(report.totalExpenseActual.cents).toBe(0);
  });

  it("accepts custom spending targets", () => {
    const month = Month.from("2026-03");
    txnRepo.saveAll([makeTxn("1", 2000, "2026-03-01", "inc01")]);

    const report = useCase.execute(month, { invest: 10, needs: 60, wants: 30 });
    const needs = report.groups.find((grp) => grp.group === "NEEDS");
    expect(needs?.budgeted.cents).toBe(120_000); // 2000 × 60%
  });
});
