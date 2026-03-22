import type { GroupSummary, MonthlyReport } from "../../../src/domain/read-model/monthly-report.js";
import { describe, expect, it } from "vitest";
import { CategoryGroup } from "../../../src/domain/value-object/category-group.js";
import { Money } from "../../../src/domain/value-object/money.js";
import { computeTrendReport } from "../../../src/domain/service/compute-trend-report.js";

function makeRange(
  start: string,
  end: string,
): { end: Temporal.PlainYearMonth; start: Temporal.PlainYearMonth } {
  return { end: Temporal.PlainYearMonth.from(end), start: Temporal.PlainYearMonth.from(start) };
}

// ── Test helpers ────────────────────────────────────────────────────────

function euros(amount: number): Money {
  return Money.fromEuros(amount);
}

function makeGroupSummary(
  group: CategoryGroup,
  budgetedEuros: number,
  actualEuros: number,
): GroupSummary {
  const budgeted = euros(budgetedEuros);
  const actual = euros(actualEuros);
  return {
    actual,
    actualPercent: 0,
    budgeted,
    budgetedPercent: 0,
    delta: budgeted.subtract(actual),
    group,
  };
}

function makeReport(
  monthStr: string,
  opts: {
    savingsRate?: number | null;
    netEuros?: number;
    needsActual?: number;
    needsBudget?: number;
    wantsActual?: number;
    wantsBudget?: number;
    investActual?: number;
    investBudget?: number;
  } = {},
): MonthlyReport {
  const {
    savingsRate = null,
    netEuros = 0,
    needsActual = 500,
    needsBudget = 600,
    wantsActual = 300,
    wantsBudget = 300,
    investActual = 200,
    investBudget = 200,
  } = opts;

  return {
    groups: [
      makeGroupSummary(CategoryGroup.INCOME, 0, 1000),
      makeGroupSummary(CategoryGroup.NEEDS, needsBudget, needsActual),
      makeGroupSummary(CategoryGroup.WANTS, wantsBudget, wantsActual),
      makeGroupSummary(CategoryGroup.INVESTMENTS, investBudget, investActual),
    ],
    kpis: {
      dailyAverageSpending: euros(33),
      fiftyThirtyTwenty: { investments: null, needs: null, wants: null },
      largestExpenses: [],
      savingsRate,
      topSpendingCategories: [],
      uncategorizedRatio: null,
    },
    month: Temporal.PlainYearMonth.from(monthStr),
    net: euros(netEuros),
    totalExpenseActual: euros(1000),
    totalExpenseTarget: euros(1000),
    totalIncomeActual: euros(1000),
    transactionCount: 10,
    uncategorized: euros(0),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("computeTrendReport", () => {
  const range = makeRange("2026-01", "2026-03");

  describe("savingsRateSeries", () => {
    it("maps savings rate per month", () => {
      const months = [
        makeReport("2026-01", { savingsRate: 20 }),
        makeReport("2026-02", { savingsRate: 25 }),
        makeReport("2026-03", { savingsRate: 30 }),
      ];
      const trend = computeTrendReport(range, months);
      const [jan, feb, mar] = trend.savingsRateSeries;

      expect(jan?.rate).toBe(20);
      expect(feb?.rate).toBe(25);
      expect(mar?.rate).toBe(30);
    });

    it("preserves null for zero-income months", () => {
      const months = [makeReport("2026-01", { savingsRate: null })];
      const singleRange = makeRange("2026-01", "2026-01");
      const trend = computeTrendReport(singleRange, months);
      const [entry] = trend.savingsRateSeries;

      expect(entry?.rate).toBeNull();
    });
  });

  describe("groupOvershootFrequency", () => {
    it("counts months where actual exceeded budget (negative delta)", () => {
      const months = [
        makeReport("2026-01", { wantsActual: 400, wantsBudget: 300 }), // overshoot
        makeReport("2026-02", { wantsActual: 250, wantsBudget: 300 }), // under budget
        makeReport("2026-03", { wantsActual: 350, wantsBudget: 300 }), // overshoot
      ];
      const trend = computeTrendReport(range, months);
      const wants = trend.groupOvershootFrequency.find((grp) => grp.group === CategoryGroup.WANTS);

      expect(wants).toEqual({ count: 2, group: CategoryGroup.WANTS, totalMonths: 3 });
    });

    it("reports zero count when no overshoot occurs", () => {
      const months = [
        makeReport("2026-01", { needsActual: 400, needsBudget: 600 }),
        makeReport("2026-02", { needsActual: 450, needsBudget: 600 }),
        makeReport("2026-03", { needsActual: 600, needsBudget: 600 }),
      ];
      const trend = computeTrendReport(range, months);
      const needs = trend.groupOvershootFrequency.find((grp) => grp.group === CategoryGroup.NEEDS);

      expect(needs).toEqual({ count: 0, group: CategoryGroup.NEEDS, totalMonths: 3 });
    });

    it("excludes INCOME group from overshoot tracking", () => {
      const months = [makeReport("2026-01")];
      const singleRange = makeRange("2026-01", "2026-01");
      const trend = computeTrendReport(singleRange, months);
      const groups = trend.groupOvershootFrequency.map((entry) => entry.group);

      expect(groups).not.toContain(CategoryGroup.INCOME);
      expect(groups).toContain(CategoryGroup.NEEDS);
      expect(groups).toContain(CategoryGroup.WANTS);
      expect(groups).toContain(CategoryGroup.INVESTMENTS);
    });
  });

  describe("monthOverMonthDeltas", () => {
    it("computes positive netDelta when spending improves", () => {
      // net month1 = -500, net month2 = -300 → delta = +200 (improvement)
      const months = [
        makeReport("2026-01", { netEuros: -500 }),
        makeReport("2026-02", { netEuros: -300 }),
        makeReport("2026-03", { netEuros: -400 }),
      ];
      const trend = computeTrendReport(range, months);
      const [feb, mar] = trend.monthOverMonthDeltas;

      expect(feb?.netDelta.toEuros()).toBe(200);
      expect(mar?.netDelta.toEuros()).toBe(-100);
    });

    it("assigns the delta to the current (later) month", () => {
      const months = [
        makeReport("2026-01", { netEuros: -500 }),
        makeReport("2026-02", { netEuros: -300 }),
      ];
      const twoMonthRange = makeRange("2026-01", "2026-02");
      const trend = computeTrendReport(twoMonthRange, months);
      const [first] = trend.monthOverMonthDeltas;

      expect(first?.month.toString()).toBe("2026-02");
    });

    it("produces no deltas for a single-month range", () => {
      const months = [makeReport("2026-03")];
      const singleRange = makeRange("2026-03", "2026-03");
      const trend = computeTrendReport(singleRange, months);

      expect(trend.monthOverMonthDeltas).toHaveLength(0);
    });

    it("computes positive group delta when spending increases", () => {
      const months = [
        makeReport("2026-01", { needsActual: 500 }),
        makeReport("2026-02", { needsActual: 600 }),
      ];
      const twoMonthRange = makeRange("2026-01", "2026-02");
      const trend = computeTrendReport(twoMonthRange, months);
      const [first] = trend.monthOverMonthDeltas;
      const needsDelta = first?.groupDeltas.find((dd) => dd.group === CategoryGroup.NEEDS);

      expect(needsDelta?.delta.toEuros()).toBe(100);
    });
  });

  describe("structure", () => {
    it("passes through range and months references", () => {
      const months = [makeReport("2026-01"), makeReport("2026-02"), makeReport("2026-03")];
      const trend = computeTrendReport(range, months);

      expect(trend.range).toBe(range);
      expect(trend.months).toBe(months);
    });
  });
});
