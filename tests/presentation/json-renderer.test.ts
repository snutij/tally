import { describe, expect, it } from "vitest";
import { CategoryGroup } from "../../src/domain/value-object/category-group.js";
import { CategoryRegistry } from "../../src/domain/service/category-registry.js";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";
import { DEFAULT_SPENDING_TARGETS } from "../../src/domain/config/spending-targets.js";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { JsonRenderer } from "../../src/presentation/renderer/json-renderer.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Month } from "../../src/domain/value-object/month.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import { computeMonthlyReport } from "../../src/domain/service/compute-monthly-report.js";
import { toMonthlyReportDto } from "../../src/application/dto/report-dto.js";

const targets = DEFAULT_SPENDING_TARGETS;
const categoryMap = new CategoryRegistry(DEFAULT_CATEGORIES).categoryToGroupMap();

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

describe("JsonRenderer", () => {
  const renderer = new JsonRenderer();

  it("serializes a MonthlyReportDto", () => {
    const report = toMonthlyReportDto(
      computeMonthlyReport(Month.from("2026-03"), targets, [], categoryMap),
    );
    const parsed = JSON.parse(renderer.render(report));
    expect(parsed.month).toBe("2026-03");
    expect(parsed.groups).toHaveLength(4);
    expect(parsed.net).toBe(0);
    expect(parsed.transactionCount).toBe(0);
  });

  it("serializes totalExpenseTarget instead of totalExpenseBudgeted", () => {
    const report = toMonthlyReportDto(
      computeMonthlyReport(
        Month.from("2026-03"),
        targets,
        [makeTxn("1", 3000, "2026-03-01", "inc01")],
        categoryMap,
      ),
    );
    const parsed = JSON.parse(renderer.render(report));
    expect(parsed.totalExpenseTarget).toBe(3000); // 50+30+20 = 100% of income
    expect("totalExpenseBudgeted" in parsed).toBe(false);
    expect("categories" in parsed).toBe(false);
    expect("totalIncomeBudgeted" in parsed).toBe(false);
  });

  it("serializes kpis without adherenceRate or categoryVariance", () => {
    const report = toMonthlyReportDto(
      computeMonthlyReport(
        Month.from("2026-03"),
        targets,
        [makeTxn("1", 3000, "2026-03-01", "inc01"), makeTxn("2", -800, "2026-03-02", "n01")],
        categoryMap,
      ),
    );
    const parsed = JSON.parse(renderer.render(report));

    expect(parsed.kpis).toBeDefined();
    expect(parsed.kpis.savingsRate).toBeCloseTo(73.33, 1);
    expect(parsed.kpis.fiftyThirtyTwenty.needs).toBeCloseTo(26.67, 1);
    expect(parsed.kpis.topSpendingCategories).toHaveLength(1);
    expect(parsed.kpis.topSpendingCategories[0].actual).toBe(800);
    expect(parsed.kpis.topSpendingCategories[0].group).toBe(CategoryGroup.NEEDS);
    expect(parsed.kpis.largestExpenses).toHaveLength(1);
    expect(parsed.kpis.largestExpenses[0].label).toBe("txn-2");
    expect(parsed.kpis.uncategorizedRatio).toBe(0);
    expect("adherenceRate" in parsed.kpis).toBe(false);
    expect("categoryVariance" in parsed.kpis).toBe(false);
  });

  it("passes through plain objects", () => {
    const data = { foo: "bar" };
    expect(JSON.parse(renderer.render(data))).toEqual({ foo: "bar" });
  });
});
