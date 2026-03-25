import { beforeEach, describe, expect, it } from "vitest";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { CategoryRegistry } from "../../src/domain/service/category-registry.js";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";
import { GenerateUnifiedReport } from "../../src/application/usecase/generate-unified-report.js";
import { InMemoryTransactionRepository } from "../helpers/in-memory-repositories.js";
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

describe("GenerateUnifiedReport", () => {
  let txnGateway: InMemoryTransactionRepository;
  let useCase: GenerateUnifiedReport;

  beforeEach(() => {
    txnGateway = new InMemoryTransactionRepository();
    useCase = new GenerateUnifiedReport(txnGateway, new CategoryRegistry(DEFAULT_CATEGORIES));
  });

  it("returns empty report when no transactions exist", () => {
    const result = useCase.execute();
    expect(result._type).toBe("UnifiedReportDto");
    expect(result.months).toHaveLength(0);
    expect(result.range).toBeNull();
    expect(result.trend).toBeNull();
  });

  it("returns single-month report with trend null", () => {
    txnGateway.saveAll([
      makeTxn("1", 3000, "2026-03-01", "inc01"),
      makeTxn("2", -800, "2026-03-05", "n01"),
    ]);
    const result = useCase.execute();
    expect(result.months).toHaveLength(1);
    expect(result.range?.start).toBe("2026-03");
    expect(result.range?.end).toBe("2026-03");
    expect(result.trend).toBeNull();
    expect(result.months[0]?.totalIncomeActual).toBe(3000);
    expect(result.months[0]?.totalExpenseActual).toBe(800);
  });

  it("returns multi-month report with trend analytics", () => {
    txnGateway.saveAll([
      makeTxn("1", 3000, "2026-01-01", "inc01"),
      makeTxn("2", -900, "2026-01-10", "n01"),
      makeTxn("3", 3000, "2026-02-01", "inc01"),
      makeTxn("4", -600, "2026-02-10", "n01"),
      makeTxn("5", 3000, "2026-03-01", "inc01"),
      makeTxn("6", -750, "2026-03-10", "n01"),
    ]);
    const result = useCase.execute();
    expect(result.months).toHaveLength(3);
    expect(result.range?.start).toBe("2026-01");
    expect(result.range?.end).toBe("2026-03");
    expect(result.trend).not.toBeNull();
    expect(result.trend?.savingsRateSeries).toHaveLength(3);
    expect(result.trend?.monthOverMonthDeltas).toHaveLength(2);
    expect(result.trend?.groupOvershootFrequency.length).toBeGreaterThan(0);
  });

  it("months are ordered chronologically", () => {
    txnGateway.saveAll([
      makeTxn("3", -100, "2026-03-01", "n01"),
      makeTxn("1", -100, "2026-01-01", "n01"),
      makeTxn("2", -100, "2026-02-01", "n01"),
    ]);
    const result = useCase.execute();
    expect(result.months.map((mo) => mo.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
  });

  it("applies custom spending targets across all months", () => {
    txnGateway.saveAll([
      makeTxn("1", 2000, "2026-01-01", "inc01"),
      makeTxn("2", 2000, "2026-02-01", "inc01"),
    ]);
    const result = useCase.execute({ invest: 10, needs: 60, wants: 30 });
    for (const month of result.months) {
      const needs = month.groups.find((grp) => grp.group === "NEEDS");
      expect(needs?.budgeted).toBeCloseTo(1200, 2); // 2000 * 60%
    }
  });
});
