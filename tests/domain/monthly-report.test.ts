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
      category: { id: "n01", name: "Rent", group: CategoryGroup.NEEDS },
      amount: Money.fromEuros(800),
    },
    {
      category: { id: "w02", name: "Eating out", group: CategoryGroup.WANTS },
      amount: Money.fromEuros(200),
    },
    {
      category: { id: "i03", name: "Stock market", group: CategoryGroup.INVESTMENTS },
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
        categoryId: "n01",
        sourceBank: "credit-mutuel",
      },
      {
        id: "2",
        date: new Date("2026-03-15"),
        label: "Restaurant",
        amount: Money.fromEuros(-150),
        categoryId: "w02",
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

    expect(report.uncategorized.cents).toBe(0);
    expect(report.totalExpenseBudgeted.cents).toBe(150000);
    expect(report.totalExpenseActual.cents).toBe(95000);
    expect(report.net.cents).toBe(-95000);
    expect(report.transactionCount).toBe(2);
  });

  it("tracks uncategorized transactions separately", () => {
    const transactions: Transaction[] = [
      {
        id: "1",
        date: new Date("2026-03-05"),
        label: "Unknown store",
        amount: Money.fromEuros(-75),
        sourceBank: "credit-mutuel",
      },
      {
        id: "2",
        date: new Date("2026-03-10"),
        label: "Rent March",
        amount: Money.fromEuros(-800),
        categoryId: "n01",
        sourceBank: "credit-mutuel",
      },
    ];

    const report = MonthlyReport.compute(budget, transactions);

    expect(report.uncategorized.cents).toBe(7500);
    expect(report.totalExpenseActual.cents).toBe(80000);
    expect(report.net.cents).toBe(-87500);
    expect(report.transactionCount).toBe(2);
  });

  it("handles empty transactions", () => {
    const report = MonthlyReport.compute(budget, []);

    expect(report.totalExpenseActual.cents).toBe(0);
    expect(report.uncategorized.cents).toBe(0);
    expect(report.totalExpenseBudgeted.cents).toBe(150000);
    expect(report.net.cents).toBe(0);
    expect(report.transactionCount).toBe(0);
  });

  it("handles empty budget", () => {
    const emptyBudget = new Budget(month, []);
    const report = MonthlyReport.compute(emptyBudget, []);

    expect(report.totalExpenseBudgeted.cents).toBe(0);
    expect(report.totalExpenseActual.cents).toBe(0);
    expect(report.groups.every((g) => g.budgetedPercent === 0)).toBe(true);
  });

  it("computes expense percentage against expense totals only", () => {
    const report = MonthlyReport.compute(budget, []);

    const needs = report.groups.find(
      (g) => g.group === CategoryGroup.NEEDS,
    )!;
    // 800 / 1500 = 53.33%
    expect(needs.budgetedPercent).toBeCloseTo(53.33, 1);
  });

  it("separates income from expenses in totals", () => {
    const budgetWithIncome = new Budget(month, [
      {
        category: { id: "n01", name: "Rent", group: CategoryGroup.NEEDS },
        amount: Money.fromEuros(800),
      },
      {
        category: { id: "inc01", name: "Salary", group: CategoryGroup.INCOME },
        amount: Money.fromEuros(2500),
      },
    ]);

    const transactions: Transaction[] = [
      {
        id: "1",
        date: new Date("2026-03-01"),
        label: "Rent March",
        amount: Money.fromEuros(-800),
        categoryId: "n01",
        sourceBank: "credit-mutuel",
      },
      {
        id: "2",
        date: new Date("2026-03-05"),
        label: "Salary",
        amount: Money.fromEuros(2500),
        categoryId: "inc01",
        sourceBank: "credit-mutuel",
      },
    ];

    const report = MonthlyReport.compute(budgetWithIncome, transactions);

    expect(report.totalIncomeBudgeted.cents).toBe(250000);
    expect(report.totalIncomeActual.cents).toBe(250000);
    expect(report.totalExpenseBudgeted.cents).toBe(80000);
    expect(report.totalExpenseActual.cents).toBe(80000);
    expect(report.net.cents).toBe(170000);

    const income = report.groups.find(
      (g) => g.group === CategoryGroup.INCOME,
    )!;
    expect(income.budgetedPercent).toBe(100);
    expect(income.actualPercent).toBe(100);

    const needs = report.groups.find(
      (g) => g.group === CategoryGroup.NEEDS,
    )!;
    expect(needs.budgetedPercent).toBe(100);
  });

  it("uses budget categories for group mapping, not hardcoded defaults", () => {
    const customBudget = new Budget(month, [
      {
        category: { id: "custom-1", name: "Custom", group: CategoryGroup.WANTS },
        amount: Money.fromEuros(100),
      },
    ]);

    const transactions: Transaction[] = [
      {
        id: "1",
        date: new Date("2026-03-01"),
        label: "Custom purchase",
        amount: Money.fromEuros(-50),
        categoryId: "custom-1",
        sourceBank: "test",
      },
    ];

    const report = MonthlyReport.compute(customBudget, transactions);

    const wants = report.groups.find(
      (g) => g.group === CategoryGroup.WANTS,
    )!;
    expect(wants.actual.cents).toBe(5000);
    expect(report.uncategorized.cents).toBe(0);
  });
});
