import {
  type MonthlyReportDto,
  type ReportDto,
  toMonthlyReportDto,
} from "../../src/application/dto/report-dto.js";
import { describe, expect, it } from "vitest";
import { CategoryGroup } from "../../src/domain/value-object/category-group.js";
import { CategoryRegistry } from "../../src/domain/service/category-registry.js";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";
import { DEFAULT_SPENDING_TARGETS } from "../../src/domain/config/spending-targets.js";
import { JsonRenderer } from "../../src/presentation/renderer/json-renderer.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import { computeMonthlyReport } from "../../src/domain/service/compute-monthly-report.js";

const targets = DEFAULT_SPENDING_TARGETS;
const categoryMap = new CategoryRegistry(DEFAULT_CATEGORIES).categoryToGroupMap();

function makeTxn(id: string, amount: number, date: string, categoryId?: string): Transaction {
  return Transaction.create({
    amount: Money.fromEuros(amount),
    categoryId,
    date: Temporal.PlainDate.from(date),
    id,
    label: `txn-${id}`,
    source: "csv",
  });
}

function makeReportDto(monthDtos: MonthlyReportDto[], extra: Partial<ReportDto> = {}): ReportDto {
  const range =
    monthDtos.length > 0
      ? {
          end: (monthDtos.at(-1) as MonthlyReportDto).month,
          start: (monthDtos.at(0) as MonthlyReportDto).month,
        }
      : null;
  return { _type: "ReportDto", months: monthDtos, range, trend: null, ...extra };
}

describe("JsonRenderer", () => {
  const renderer = new JsonRenderer();

  it("serializes a single-month ReportDto", () => {
    const monthDto = toMonthlyReportDto(
      computeMonthlyReport(Temporal.PlainYearMonth.from("2026-03"), targets, [], categoryMap),
    );
    const dto = makeReportDto([monthDto]);
    const parsed = JSON.parse(renderer.render(dto));

    expect(parsed.range.start).toBe("2026-03");
    expect(parsed.range.end).toBe("2026-03");
    expect(parsed.months).toHaveLength(1);
    expect(parsed.months[0].month).toBe("2026-03");
    expect(parsed.months[0].groups).toHaveLength(4);
    expect(parsed.months[0].net).toBe(0);
    expect("_type" in parsed).toBe(false);
  });

  it("serializes totalExpenseTarget and omits _type from month entries", () => {
    const monthDto = toMonthlyReportDto(
      computeMonthlyReport(
        Temporal.PlainYearMonth.from("2026-03"),
        targets,
        [makeTxn("1", 3000, "2026-03-01", "inc01")],
        categoryMap,
      ),
    );
    const parsed = JSON.parse(renderer.render(makeReportDto([monthDto])));

    expect(parsed.months[0].totalExpenseTarget).toBe(3000);
    expect("_type" in parsed.months[0]).toBe(false);
    expect("totalExpenseBudgeted" in parsed.months[0]).toBe(false);
  });

  it("serializes kpis correctly", () => {
    const monthDto = toMonthlyReportDto(
      computeMonthlyReport(
        Temporal.PlainYearMonth.from("2026-03"),
        targets,
        [makeTxn("1", 3000, "2026-03-01", "inc01"), makeTxn("2", -800, "2026-03-02", "n01")],
        categoryMap,
      ),
    );
    const parsed = JSON.parse(renderer.render(makeReportDto([monthDto])));
    const [firstMonth] = parsed.months;
    const { kpis } = firstMonth;

    expect(kpis.savingsRate).toBeCloseTo(73.33, 1);
    expect(kpis.topSpendingCategories[0].actual).toBe(800);
    expect(kpis.topSpendingCategories[0].group).toBe(CategoryGroup.NEEDS);
    expect(kpis.largestExpenses[0].label).toBe("txn-2");
    expect("adherenceRate" in kpis).toBe(false);
  });

  it("serializes multi-month ReportDto with trend", () => {
    const dto: ReportDto = {
      _type: "ReportDto",
      months: [
        toMonthlyReportDto(
          computeMonthlyReport(Temporal.PlainYearMonth.from("2026-01"), targets, [], categoryMap),
        ),
        toMonthlyReportDto(
          computeMonthlyReport(Temporal.PlainYearMonth.from("2026-02"), targets, [], categoryMap),
        ),
      ],
      range: { end: "2026-02", start: "2026-01" },
      trend: {
        groupOvershootFrequency: [],
        monthOverMonthDeltas: [{ groupDeltas: [], month: "2026-02", netDelta: 0 }],
        savingsRateSeries: [
          { month: "2026-01", rate: null },
          { month: "2026-02", rate: null },
        ],
      },
    };
    const parsed = JSON.parse(renderer.render(dto));

    expect(parsed.range.start).toBe("2026-01");
    expect(parsed.range.end).toBe("2026-02");
    expect(parsed.months).toHaveLength(2);
    expect(parsed.trend.savingsRateSeries).toHaveLength(2);
    expect("_type" in parsed).toBe(false);
  });

  it("passes through plain objects", () => {
    const data = { foo: "bar" };
    expect(JSON.parse(renderer.render(data))).toEqual({ foo: "bar" });
  });
});
