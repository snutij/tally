import { describe, it, expect } from "vitest";
import { MonthlyReport } from "../../src/domain/entity/monthly-report.js";
import { Budget } from "../../src/domain/entity/budget.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import { CategoryGroup } from "../../src/domain/value-object/category-group.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Month } from "../../src/domain/value-object/month.js";

describe("MonthlyReport", () => {
  const month = Month.from("2026-03");

  const budget = new Budget(month, [
    {
      category: { id: "rent", name: "Rent", group: CategoryGroup.NEEDS },
      amount: Money.fromEuros(800),
    },
    {
      category: { id: "dining-out", name: "Dining out", group: CategoryGroup.WANTS },
      amount: Money.fromEuros(200),
    },
    {
      category: { id: "pea", name: "PEA", group: CategoryGroup.INVESTMENTS },
      amount: Money.fromEuros(500),
    },
  ]);

  it("computes totals per group with matching transactions", () => {
    const transactions: Transaction[] = [
      {
        id: "1",
        date: new Date("2026-03-01"),
        label: "Rent March",
        amount: Money.fromEuros(-800),
        categoryId: "rent",
        sourceBank: "credit-mutuel",
      },
      {
        id: "2",
        date: new Date("2026-03-15"),
        label: "Restaurant",
        amount: Money.fromEuros(-150),
        categoryId: "dining-out",
        sourceBank: "credit-mutuel",
      },
    ];

    const report = MonthlyReport.compute(budget, transactions);

    const needs = report.groups.find(
      (g) => g.group === CategoryGroup.NEEDS,
    )!;
    expect(needs.budgeted.cents).toBe(80000);
    expect(needs.actual.cents).toBe(80000);
    expect(needs.delta.cents).toBe(0);

    const wants = report.groups.find(
      (g) => g.group === CategoryGroup.WANTS,
    )!;
    expect(wants.budgeted.cents).toBe(20000);
    expect(wants.actual.cents).toBe(15000);
    expect(wants.delta.cents).toBe(5000);

    expect(report.totalBudgeted.cents).toBe(150000);
    expect(report.totalActual.cents).toBe(95000);
    expect(report.totalDelta.cents).toBe(55000);
  });

  it("handles empty transactions", () => {
    const report = MonthlyReport.compute(budget, []);

    expect(report.totalActual.cents).toBe(0);
    expect(report.totalDelta.cents).toBe(150000);
  });

  it("handles empty budget", () => {
    const emptyBudget = new Budget(month, []);
    const report = MonthlyReport.compute(emptyBudget, []);

    expect(report.totalBudgeted.cents).toBe(0);
    expect(report.totalActual.cents).toBe(0);
    expect(report.groups.every((g) => g.budgetedPercent === 0)).toBe(true);
  });

  it("computes percentage breakdown", () => {
    const report = MonthlyReport.compute(budget, []);

    const needs = report.groups.find(
      (g) => g.group === CategoryGroup.NEEDS,
    )!;
    // 800 / 1500 = 53.33%
    expect(needs.budgetedPercent).toBeCloseTo(53.33, 1);
  });
});
