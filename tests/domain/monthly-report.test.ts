import { describe, expect, it } from "vitest";
import { CategoryGroup } from "../../src/domain/value-object/category-group.js";
import { DEFAULT_SPENDING_TARGETS } from "../../src/domain/config/spending-targets.js";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Month } from "../../src/domain/value-object/month.js";
import { MonthlyReport } from "../../src/domain/entity/monthly-report.js";
import { Transaction } from "../../src/domain/entity/transaction.js";

// DEFAULT_SPENDING_TARGETS = 50/30/20
const targets = DEFAULT_SPENDING_TARGETS;
const month = Month.from("2026-03");

function txn(id: string, amount: number, categoryId?: string, date = "2026-03-01"): Transaction {
  return Transaction.create({
    amount: Money.fromEuros(amount),
    categoryId,
    date: DateOnly.from(date),
    id,
    label: `txn-${id}`,
    source: "csv",
  });
}

describe("MonthlyReport", () => {
  it("computes group totals from DEFAULT_CATEGORIES mapping", () => {
    const transactions = [
      txn("1", -800, "n01"), // Rent → NEEDS
      txn("2", -150, "w02"), // Eating out → WANTS
    ];

    const report = MonthlyReport.compute(month, targets, transactions);

    const needs = report.groups.find((grp) => grp.group === CategoryGroup.NEEDS);
    expect(needs?.actual.cents).toBe(80_000);

    const wants = report.groups.find((grp) => grp.group === CategoryGroup.WANTS);
    expect(wants?.actual.cents).toBe(15_000);

    expect(report.totalExpenseActual.cents).toBe(95_000);
    expect(report.net.cents).toBe(-95_000);
    expect(report.transactionCount).toBe(2);
    expect(report.uncategorized.cents).toBe(0);
  });

  it("computes group targets as income × percentage", () => {
    const transactions = [
      txn("1", 3000, "inc01"), // Salary → INCOME
    ];

    const report = MonthlyReport.compute(month, targets, transactions);

    expect(report.totalIncomeActual.cents).toBe(300_000);

    const needs = report.groups.find((grp) => grp.group === CategoryGroup.NEEDS);
    expect(needs?.budgeted.cents).toBe(150_000); // 3000 × 50%

    const wants = report.groups.find((grp) => grp.group === CategoryGroup.WANTS);
    expect(wants?.budgeted.cents).toBe(90_000); // 3000 × 30%

    const invest = report.groups.find((grp) => grp.group === CategoryGroup.INVESTMENTS);
    expect(invest?.budgeted.cents).toBe(60_000); // 3000 × 20%

    expect(report.totalExpenseTarget.cents).toBe(300_000);
  });

  it("budgetedPercent equals the target percentage for expense groups", () => {
    const report = MonthlyReport.compute(month, targets, []);

    const needs = report.groups.find((grp) => grp.group === CategoryGroup.NEEDS);
    expect(needs?.budgetedPercent).toBe(50);

    const wants = report.groups.find((grp) => grp.group === CategoryGroup.WANTS);
    expect(wants?.budgetedPercent).toBe(30);

    const invest = report.groups.find((grp) => grp.group === CategoryGroup.INVESTMENTS);
    expect(invest?.budgetedPercent).toBe(20);

    const income = report.groups.find((grp) => grp.group === CategoryGroup.INCOME);
    expect(income?.budgetedPercent).toBe(0);
  });

  it("targets are zero when no income", () => {
    const report = MonthlyReport.compute(month, targets, [txn("1", -100, "n01")]);

    const needs = report.groups.find((grp) => grp.group === CategoryGroup.NEEDS);
    expect(needs?.budgeted.cents).toBe(0); // 0 income × 50%
    expect(report.totalExpenseTarget.cents).toBe(0);
  });

  it("tracks uncategorized transactions separately", () => {
    const transactions = [
      txn("1", -75), // no categoryId → uncategorized
      txn("2", -800, "n01"), // known category
    ];

    const report = MonthlyReport.compute(month, targets, transactions);

    expect(report.uncategorized.cents).toBe(7500);
    expect(report.totalExpenseActual.cents).toBe(80_000);
    expect(report.net.cents).toBe(-87_500);
  });

  it("transactions with unknown categoryIds are treated as uncategorized", () => {
    const transactions = [txn("1", -50, "custom-not-in-defaults")];

    const report = MonthlyReport.compute(month, targets, transactions);

    expect(report.uncategorized.cents).toBe(5000);
    expect(report.totalExpenseActual.cents).toBe(0);
  });

  it("handles empty transactions", () => {
    const report = MonthlyReport.compute(month, targets, []);

    expect(report.totalExpenseActual.cents).toBe(0);
    expect(report.uncategorized.cents).toBe(0);
    expect(report.net.cents).toBe(0);
    expect(report.transactionCount).toBe(0);
    expect(report.totalExpenseTarget.cents).toBe(0);
  });

  it("income transactions do not count as expenses", () => {
    const transactions = [
      txn("1", 2500, "inc01"), // Salary → INCOME
      txn("2", -800, "n01"), // Rent → NEEDS
    ];

    const report = MonthlyReport.compute(month, targets, transactions);

    expect(report.totalIncomeActual.cents).toBe(250_000);
    expect(report.totalExpenseActual.cents).toBe(80_000);
    expect(report.net.cents).toBe(170_000);
  });

  it("has no categories field (only group-level summary)", () => {
    const report = MonthlyReport.compute(month, targets, []);
    expect("categories" in report).toBe(false);
  });

  describe("KPIs", () => {
    it("computes savings rate", () => {
      const transactions = [txn("1", 3000, "inc01"), txn("2", -800, "n01")];
      const report = MonthlyReport.compute(month, targets, transactions);
      expect(report.kpis.savingsRate).toBeCloseTo(73.33, 1);
    });

    it("savings rate is null when income is zero", () => {
      const report = MonthlyReport.compute(month, targets, []);
      expect(report.kpis.savingsRate).toBeNull();
    });

    it("computes fiftyThirtyTwenty breakdown", () => {
      const transactions = [
        txn("1", 3000, "inc01"),
        txn("2", -900, "n01"), // 30% of income on needs
        txn("3", -600, "w02"), // 20% of income on wants
      ];
      const report = MonthlyReport.compute(month, targets, transactions);
      expect(report.kpis.fiftyThirtyTwenty.needs).toBeCloseTo(30, 0);
      expect(report.kpis.fiftyThirtyTwenty.wants).toBeCloseTo(20, 0);
    });

    it("builds topSpendingCategories from actual spending (excluding income)", () => {
      const transactions = [
        txn("1", 3000, "inc01"), // income — excluded
        txn("2", -800, "n01"), // Rent
        txn("3", -150, "w02"), // Eating out
      ];
      const report = MonthlyReport.compute(month, targets, transactions);

      const top = report.kpis.topSpendingCategories;
      expect(top.length).toBeGreaterThan(0);
      expect(top[0]?.categoryId).toBe("n01"); // largest expense
      expect(top[0]?.actual.cents).toBe(80_000);
      expect(top[0]?.group).toBe(CategoryGroup.NEEDS);
    });

    it("computes uncategorized ratio", () => {
      const transactions = [
        txn("1", -50), // uncategorized
        txn("2", -800, "n01"), // categorized
        txn("3", -200, "w02"), // categorized
      ];
      const report = MonthlyReport.compute(month, targets, transactions);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- non-null asserted in test
      expect(report.kpis.uncategorizedRatio!).toBeCloseTo(33.33, 1);
    });

    it("uncategorized ratio is null when no transactions", () => {
      const report = MonthlyReport.compute(month, targets, []);
      expect(report.kpis.uncategorizedRatio).toBeNull();
    });

    it("has no adherenceRate or categoryVariance KPIs", () => {
      const report = MonthlyReport.compute(month, targets, []);
      expect("adherenceRate" in report.kpis).toBe(false);
      expect("categoryVariance" in report.kpis).toBe(false);
    });
  });
});
