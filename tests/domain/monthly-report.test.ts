import { describe, expect, it } from "vitest";
import { Budget } from "../../src/domain/entity/budget.js";
import { CategoryGroup } from "../../src/domain/value-object/category-group.js";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Month } from "../../src/domain/value-object/month.js";
import { MonthlyReport } from "../../src/domain/entity/monthly-report.js";
import type { Transaction } from "../../src/domain/entity/transaction.js";

describe("MonthlyReport", () => {
  const month = Month.from("2026-03");

  const budget = new Budget(month, [
    {
      amount: Money.fromEuros(800),
      category: { group: CategoryGroup.NEEDS, id: "n01", name: "Rent" },
    },
    {
      amount: Money.fromEuros(200),
      category: { group: CategoryGroup.WANTS, id: "w02", name: "Eating out" },
    },
    {
      amount: Money.fromEuros(500),
      category: { group: CategoryGroup.INVESTMENTS, id: "i03", name: "Stock market" },
    },
  ]);

  it("computes totals per group with matching transactions", () => {
    const transactions: Transaction[] = [
      {
        amount: Money.fromEuros(-800),
        categoryId: "n01",
        date: DateOnly.from("2026-03-01"),
        id: "1",
        label: "Rent March",
        source: "credit-mutuel",
      },
      {
        amount: Money.fromEuros(-150),
        categoryId: "w02",
        date: DateOnly.from("2026-03-15"),
        id: "2",
        label: "Restaurant",
        source: "credit-mutuel",
      },
    ];

    const report = MonthlyReport.compute(budget, transactions);

    const needs = report.groups.find((grp) => grp.group === CategoryGroup.NEEDS);
    expect(needs).toBeDefined();
    if (!needs) {
      return;
    }
    expect(needs.budgeted.cents).toBe(80_000);
    expect(needs.actual.cents).toBe(80_000);
    expect(needs.delta.cents).toBe(0);

    const wants = report.groups.find((grp) => grp.group === CategoryGroup.WANTS);
    expect(wants).toBeDefined();
    if (!wants) {
      return;
    }
    expect(wants.budgeted.cents).toBe(20_000);
    expect(wants.actual.cents).toBe(15_000);
    expect(wants.delta.cents).toBe(5000);

    expect(report.uncategorized.cents).toBe(0);
    expect(report.totalExpenseBudgeted.cents).toBe(150_000);
    expect(report.totalExpenseActual.cents).toBe(95_000);
    expect(report.net.cents).toBe(-95_000);
    expect(report.transactionCount).toBe(2);
  });

  it("tracks uncategorized transactions separately", () => {
    const transactions: Transaction[] = [
      {
        amount: Money.fromEuros(-75),
        date: DateOnly.from("2026-03-05"),
        id: "1",
        label: "Unknown store",
        source: "credit-mutuel",
      },
      {
        amount: Money.fromEuros(-800),
        categoryId: "n01",
        date: DateOnly.from("2026-03-10"),
        id: "2",
        label: "Rent March",
        source: "credit-mutuel",
      },
    ];

    const report = MonthlyReport.compute(budget, transactions);

    expect(report.uncategorized.cents).toBe(7500);
    expect(report.totalExpenseActual.cents).toBe(80_000);
    expect(report.net.cents).toBe(-87_500);
    expect(report.transactionCount).toBe(2);
  });

  it("handles empty transactions", () => {
    const report = MonthlyReport.compute(budget, []);

    expect(report.totalExpenseActual.cents).toBe(0);
    expect(report.uncategorized.cents).toBe(0);
    expect(report.totalExpenseBudgeted.cents).toBe(150_000);
    expect(report.net.cents).toBe(0);
    expect(report.transactionCount).toBe(0);
  });

  it("handles empty budget", () => {
    const emptyBudget = new Budget(month, []);
    const report = MonthlyReport.compute(emptyBudget, []);

    expect(report.totalExpenseBudgeted.cents).toBe(0);
    expect(report.totalExpenseActual.cents).toBe(0);
    expect(report.groups.every((grp) => grp.budgetedPercent === 0)).toBe(true);
  });

  it("computes expense percentage against expense totals only", () => {
    const report = MonthlyReport.compute(budget, []);

    const needs = report.groups.find((grp) => grp.group === CategoryGroup.NEEDS);
    expect(needs).toBeDefined();
    if (!needs) {
      return;
    }
    // 800 / 1500 = 53.33%
    expect(needs.budgetedPercent).toBeCloseTo(53.33, 1);
  });

  it("separates income from expenses in totals", () => {
    const budgetWithIncome = new Budget(month, [
      {
        amount: Money.fromEuros(800),
        category: { group: CategoryGroup.NEEDS, id: "n01", name: "Rent" },
      },
      {
        amount: Money.fromEuros(2500),
        category: { group: CategoryGroup.INCOME, id: "inc01", name: "Salary" },
      },
    ]);

    const transactions: Transaction[] = [
      {
        amount: Money.fromEuros(-800),
        categoryId: "n01",
        date: DateOnly.from("2026-03-01"),
        id: "1",
        label: "Rent March",
        source: "credit-mutuel",
      },
      {
        amount: Money.fromEuros(2500),
        categoryId: "inc01",
        date: DateOnly.from("2026-03-05"),
        id: "2",
        label: "Salary",
        source: "credit-mutuel",
      },
    ];

    const report = MonthlyReport.compute(budgetWithIncome, transactions);

    expect(report.totalIncomeBudgeted.cents).toBe(250_000);
    expect(report.totalIncomeActual.cents).toBe(250_000);
    expect(report.totalExpenseBudgeted.cents).toBe(80_000);
    expect(report.totalExpenseActual.cents).toBe(80_000);
    expect(report.net.cents).toBe(170_000);

    const income = report.groups.find((grp) => grp.group === CategoryGroup.INCOME);
    expect(income).toBeDefined();
    if (!income) {
      return;
    }
    expect(income.budgetedPercent).toBe(100);
    expect(income.actualPercent).toBe(100);

    const needs = report.groups.find((grp) => grp.group === CategoryGroup.NEEDS);
    expect(needs).toBeDefined();
    if (!needs) {
      return;
    }
    expect(needs.budgetedPercent).toBe(100);
  });

  it("uses budget categories for group mapping, not hardcoded defaults", () => {
    const customBudget = new Budget(month, [
      {
        amount: Money.fromEuros(100),
        category: { group: CategoryGroup.WANTS, id: "custom-1", name: "Custom" },
      },
    ]);

    const transactions: Transaction[] = [
      {
        amount: Money.fromEuros(-50),
        categoryId: "custom-1",
        date: DateOnly.from("2026-03-01"),
        id: "1",
        label: "Custom purchase",
        source: "test",
      },
    ];

    const report = MonthlyReport.compute(customBudget, transactions);

    const wants = report.groups.find((grp) => grp.group === CategoryGroup.WANTS);
    expect(wants).toBeDefined();
    if (!wants) {
      return;
    }
    expect(wants.actual.cents).toBe(5000);
    expect(report.uncategorized.cents).toBe(0);
  });

  describe("categories", () => {
    it("computes per-category summary from budget and transactions", () => {
      const transactions: Transaction[] = [
        {
          amount: Money.fromEuros(-750),
          categoryId: "n01",
          date: DateOnly.from("2026-03-01"),
          id: "1",
          label: "Rent",
          source: "cm",
        },
        {
          amount: Money.fromEuros(-120),
          categoryId: "w02",
          date: DateOnly.from("2026-03-10"),
          id: "2",
          label: "Dinner",
          source: "cm",
        },
      ];

      const report = MonthlyReport.compute(budget, transactions);

      expect(report.categories).toHaveLength(3);

      const rent = report.categories.find((cat) => cat.categoryId === "n01");
      expect(rent).toBeDefined();
      if (!rent) {
        return;
      }
      expect(rent.categoryName).toBe("Rent");
      expect(rent.group).toBe(CategoryGroup.NEEDS);
      expect(rent.budgeted.cents).toBe(80_000);
      expect(rent.actual.cents).toBe(75_000);
      expect(rent.delta.cents).toBe(5000);

      const eating = report.categories.find((cat) => cat.categoryId === "w02");
      expect(eating).toBeDefined();
      if (!eating) {
        return;
      }
      expect(eating.actual.cents).toBe(12_000);
      expect(eating.delta.cents).toBe(8000);

      const stock = report.categories.find((cat) => cat.categoryId === "i03");
      expect(stock).toBeDefined();
      if (!stock) {
        return;
      }
      expect(stock.actual.cents).toBe(0);
      expect(stock.delta.cents).toBe(50_000);
    });

    it("returns empty categories for empty budget", () => {
      const emptyBudget = new Budget(month, []);
      const report = MonthlyReport.compute(emptyBudget, []);
      expect(report.categories).toHaveLength(0);
    });
  });

  describe("kpis", () => {
    const budgetWithIncome = new Budget(month, [
      {
        amount: Money.fromEuros(800),
        category: { group: CategoryGroup.NEEDS, id: "n01", name: "Rent" },
      },
      {
        amount: Money.fromEuros(400),
        category: { group: CategoryGroup.NEEDS, id: "n02", name: "Groceries" },
      },
      {
        amount: Money.fromEuros(200),
        category: { group: CategoryGroup.WANTS, id: "w01", name: "Eating out" },
      },
      {
        amount: Money.fromEuros(500),
        category: {
          group: CategoryGroup.INVESTMENTS,
          id: "i01",
          name: "Stock market",
        },
      },
      {
        amount: Money.fromEuros(3000),
        category: { group: CategoryGroup.INCOME, id: "inc01", name: "Salary" },
      },
    ]);

    const fullTransactions: Transaction[] = [
      {
        amount: Money.fromEuros(3000),
        categoryId: "inc01",
        date: DateOnly.from("2026-03-01"),
        id: "1",
        label: "Salary",
        source: "cm",
      },
      {
        amount: Money.fromEuros(-800),
        categoryId: "n01",
        date: DateOnly.from("2026-03-02"),
        id: "2",
        label: "Rent",
        source: "cm",
      },
      {
        amount: Money.fromEuros(-350),
        categoryId: "n02",
        date: DateOnly.from("2026-03-05"),
        id: "3",
        label: "Groceries",
        source: "cm",
      },
      {
        amount: Money.fromEuros(-150),
        categoryId: "w01",
        date: DateOnly.from("2026-03-10"),
        id: "4",
        label: "Restaurant",
        source: "cm",
      },
      {
        amount: Money.fromEuros(-300),
        categoryId: "i01",
        date: DateOnly.from("2026-03-15"),
        id: "5",
        label: "ETF",
        source: "cm",
      },
      {
        amount: Money.fromEuros(-50),
        date: DateOnly.from("2026-03-20"),
        id: "6",
        label: "Mystery",
        source: "cm",
      },
    ];

    it("computes savings rate", () => {
      const report = MonthlyReport.compute(budgetWithIncome, fullTransactions);
      // income=3000, expenses=800+350+150+300=1600, savings=(3000-1600)/3000*100=46.67
      expect(report.kpis.savingsRate).toBeCloseTo(46.67, 1);
    });

    it("returns null savings rate when no income", () => {
      const report = MonthlyReport.compute(budget, []);
      expect(report.kpis.savingsRate).toBeNull();
    });

    it("computes 50/30/20 breakdown", () => {
      const report = MonthlyReport.compute(budgetWithIncome, fullTransactions);
      // needs=(800+350)/3000=38.33, wants=150/3000=5, investments=300/3000=10
      expect(report.kpis.fiftyThirtyTwenty.needs).toBeCloseTo(38.33, 1);
      expect(report.kpis.fiftyThirtyTwenty.wants).toBe(5);
      expect(report.kpis.fiftyThirtyTwenty.investments).toBe(10);
    });

    it("returns null 50/30/20 when no income", () => {
      const report = MonthlyReport.compute(budget, []);
      expect(report.kpis.fiftyThirtyTwenty.needs).toBeNull();
      expect(report.kpis.fiftyThirtyTwenty.wants).toBeNull();
      expect(report.kpis.fiftyThirtyTwenty.investments).toBeNull();
    });

    it("computes budget adherence rate", () => {
      const report = MonthlyReport.compute(budgetWithIncome, fullTransactions);
      // n01: 800<=800 ✓, n02: 350<=400 ✓, w01: 150<=200 ✓, i01: 300<=500 ✓ → 4/4=100
      expect(report.kpis.adherenceRate).toBe(100);
    });

    it("computes adherence with overruns", () => {
      const txns: Transaction[] = [
        {
          amount: Money.fromEuros(-900),
          categoryId: "n01",
          date: DateOnly.from("2026-03-01"),
          id: "1",
          label: "Rent",
          source: "cm",
        },
      ];
      const report = MonthlyReport.compute(budget, txns);
      // n01: 900>800 ✗, w02: 0<=200 ✓, i03: 0<=500 ✓ → 2/3=66.67
      expect(report.kpis.adherenceRate).toBeCloseTo(66.67, 1);
    });

    it("returns null adherence rate for empty budget", () => {
      const emptyBudget = new Budget(month, []);
      const report = MonthlyReport.compute(emptyBudget, []);
      expect(report.kpis.adherenceRate).toBeNull();
    });

    it("computes top 5 spending categories", () => {
      const report = MonthlyReport.compute(budgetWithIncome, fullTransactions);
      const top = report.kpis.topSpendingCategories;
      expect(top).toHaveLength(4); // 4 expense categories
      expect(top[0].categoryId).toBe("n01"); // 800
      expect(top[1].categoryId).toBe("n02"); // 350
      expect(top[2].categoryId).toBe("i01"); // 300
      expect(top[3].categoryId).toBe("w01"); // 150
    });

    it("returns empty top spending for no expense categories", () => {
      const incomeBudget = new Budget(month, [
        {
          amount: Money.fromEuros(3000),
          category: {
            group: CategoryGroup.INCOME,
            id: "inc01",
            name: "Salary",
          },
        },
      ]);
      const report = MonthlyReport.compute(incomeBudget, []);
      expect(report.kpis.topSpendingCategories).toHaveLength(0);
    });

    it("computes daily average spending", () => {
      const report = MonthlyReport.compute(budgetWithIncome, fullTransactions);
      // total expenses = 1600, March has 31 days → 1600/31 ≈ 51.61
      expect(report.kpis.dailyAverageSpending.toEuros()).toBeCloseTo(1600 / 31, 1);
    });

    it("returns zero daily average when no expenses", () => {
      const report = MonthlyReport.compute(budget, []);
      expect(report.kpis.dailyAverageSpending.cents).toBe(0);
    });

    it("computes largest 5 expenses", () => {
      const report = MonthlyReport.compute(budgetWithIncome, fullTransactions);
      const top = report.kpis.largestExpenses;
      expect(top).toHaveLength(5); // 5 negative transactions
      expect(top[0].label).toBe("Rent"); // -800
      expect(top[1].label).toBe("Groceries"); // -350
      expect(top[2].label).toBe("ETF"); // -300
      expect(top[3].label).toBe("Restaurant"); // -150
      expect(top[4].label).toBe("Mystery"); // -50
    });

    it("returns empty largest expenses when all income", () => {
      const txns: Transaction[] = [
        {
          amount: Money.fromEuros(3000),
          categoryId: "inc01",
          date: DateOnly.from("2026-03-01"),
          id: "1",
          label: "Salary",
          source: "cm",
        },
      ];
      const report = MonthlyReport.compute(budgetWithIncome, txns);
      expect(report.kpis.largestExpenses).toHaveLength(0);
    });

    it("computes uncategorized ratio", () => {
      const report = MonthlyReport.compute(budgetWithIncome, fullTransactions);
      // 1 uncategorized out of 6 → 16.67
      expect(report.kpis.uncategorizedRatio).toBeCloseTo(16.67, 1);
    });

    it("returns null uncategorized ratio for no transactions", () => {
      const report = MonthlyReport.compute(budget, []);
      expect(report.kpis.uncategorizedRatio).toBeNull();
    });

    it("computes category variance overruns and underruns", () => {
      const txns: Transaction[] = [
        {
          amount: Money.fromEuros(-900),
          categoryId: "n01",
          date: DateOnly.from("2026-03-01"),
          id: "1",
          label: "Rent",
          source: "cm",
        },
        {
          amount: Money.fromEuros(-50),
          categoryId: "w02",
          date: DateOnly.from("2026-03-05"),
          id: "2",
          label: "Dinner",
          source: "cm",
        },
      ];
      const report = MonthlyReport.compute(budget, txns);

      // n01: 900 > 800 → overrun of 100
      expect(report.kpis.categoryVariance.overruns).toHaveLength(1);
      expect(report.kpis.categoryVariance.overruns[0].categoryId).toBe("n01");
      expect(report.kpis.categoryVariance.overruns[0].variance.cents).toBe(10_000);

      // w02: 50 < 200 → underrun of -150; i03: 0 < 500 → underrun of -500
      expect(report.kpis.categoryVariance.underruns).toHaveLength(2);
      expect(report.kpis.categoryVariance.underruns[0].categoryId).toBe("i03"); // biggest underrun
      expect(report.kpis.categoryVariance.underruns[0].variance.cents).toBe(-50_000);
    });

    it("returns empty variance for empty budget", () => {
      const emptyBudget = new Budget(month, []);
      const report = MonthlyReport.compute(emptyBudget, []);
      expect(report.kpis.categoryVariance.overruns).toHaveLength(0);
      expect(report.kpis.categoryVariance.underruns).toHaveLength(0);
    });

    it("returns null adherence rate for income-only budget", () => {
      const incomeBudget = new Budget(month, [
        {
          amount: Money.fromEuros(3000),
          category: {
            group: CategoryGroup.INCOME,
            id: "inc01",
            name: "Salary",
          },
        },
      ]);
      const report = MonthlyReport.compute(incomeBudget, []);
      expect(report.kpis.adherenceRate).toBeNull();
    });
  });
});
