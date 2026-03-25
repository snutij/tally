import { type MonthlyReportDto, toMonthlyReportDto } from "../../src/application/dto/report-dto.js";
import type {
  TrendAnalyticsDto,
  UnifiedReportDto,
} from "../../src/application/dto/unified-report-dto.js";
import { describe, expect, it } from "vitest";
import { CategoryRegistry } from "../../src/domain/service/category-registry.js";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";
import { DEFAULT_SPENDING_TARGETS } from "../../src/domain/config/spending-targets.js";
import { HtmlRenderer } from "../../src/presentation/renderer/html-renderer.js";
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

function makeUnifiedDto(
  months: MonthlyReportDto[],
  trend: TrendAnalyticsDto | null = null,
): UnifiedReportDto {
  const range =
    months.length > 0
      ? {
          end: (months.at(-1) as MonthlyReportDto).month,
          start: (months.at(0) as MonthlyReportDto).month,
        }
      : null;
  return { _type: "UnifiedReportDto", months, range, trend };
}

const txns = [makeTxn("1", 3000, "2026-03-01", "inc01"), makeTxn("2", -750, "2026-03-02", "n01")];

describe("HtmlRenderer", () => {
  const renderer = new HtmlRenderer();

  describe("render(UnifiedReportDto single month)", () => {
    const report = toMonthlyReportDto(
      computeMonthlyReport(Temporal.PlainYearMonth.from("2026-03"), targets, txns, categoryMap),
    );
    const html = renderer.render(makeUnifiedDto([report]));

    it("produces a valid HTML5 document", () => {
      expect(html).toMatch(/^<!DOCTYPE html>/);
      expect(html).toContain("<html");
      expect(html).toContain("<head>");
      expect(html).toContain("<body>");
    });

    it("includes inline styles", () => {
      expect(html).toContain("<style>");
      expect(html).not.toContain('<link rel="stylesheet"');
    });

    it("contains KPI section without Budget Adherence", () => {
      expect(html).toContain("Key Indicators");
      expect(html).toContain("Savings Rate");
      expect(html).not.toContain("Budget Adherence");
      expect(html).toContain("Daily Avg Spending");
    });

    it("renders tooltip trigger and content for remaining KPIs", () => {
      for (const label of ["Savings Rate", "Daily Avg Spending", "Uncategorized"]) {
        expect(html).toContain(`aria-label="About ${label}"`);
      }
      expect(html).toContain("Percentage of income kept after all expenses");
      expect(html).toContain("tally transactions categorize");
    });

    it("contains group summary table", () => {
      expect(html).toContain("Group Summary");
      expect(html).toContain("NEEDS");
      expect(html).toContain("INCOME");
    });

    it("does not contain category breakdown table", () => {
      expect(html).not.toContain("Category Breakdown");
    });

    it("footer shows Expense Target instead of Budgeted labels", () => {
      expect(html).toContain("Expense Target");
      expect(html).not.toContain("Income (Budgeted)");
      expect(html).not.toContain("Expenses (Budgeted)");
    });

    it("uses Intl.NumberFormat for amounts", () => {
      expect(html).toContain("750,00\u00A0€");
    });

    it("does not include filter bar for single month", () => {
      expect(html).not.toContain('id="month-from"');
    });
  });

  describe("render(UnifiedReportDto) — no transactions", () => {
    it("omits insights section when there are no expense transactions", () => {
      const report = toMonthlyReportDto(
        computeMonthlyReport(Temporal.PlainYearMonth.from("2026-03"), targets, [], categoryMap),
      );
      const html = renderer.render(makeUnifiedDto([report]));
      const [, body] = html.split("<body>");
      expect(body).not.toContain("Top Spending");
      expect(body).not.toContain("Largest Expenses");
    });
  });

  describe("render(UnifiedReportDto) — insights edge cases", () => {
    it("shows largest expenses but no top spending when all uncategorized", () => {
      const report = toMonthlyReportDto(
        computeMonthlyReport(
          Temporal.PlainYearMonth.from("2026-03"),
          targets,
          [makeTxn("1", -200, "2026-03-05")],
          categoryMap,
        ),
      );
      const html = renderer.render(makeUnifiedDto([report]));
      const [, body] = html.split("<body>");
      expect(body).toContain("Largest Expenses");
      expect(body).not.toContain("Top Spending");
    });

    it("shows top spending but no largest expenses when only refunds", () => {
      const report = toMonthlyReportDto(
        computeMonthlyReport(
          Temporal.PlainYearMonth.from("2026-03"),
          targets,
          [makeTxn("1", 100, "2026-03-05", "n01")],
          categoryMap,
        ),
      );
      const html = renderer.render(makeUnifiedDto([report]));
      const [, body] = html.split("<body>");
      expect(body).toContain("Top Spending");
      expect(body).not.toContain("Largest Expenses");
    });
  });

  describe("render(UnifiedReportDto) — uncategorized", () => {
    it("shows uncategorized section when non-zero", () => {
      const report = toMonthlyReportDto(
        computeMonthlyReport(
          Temporal.PlainYearMonth.from("2026-03"),
          targets,
          [makeTxn("3", -100, "2026-03-05")],
          categoryMap,
        ),
      );
      const html = renderer.render(makeUnifiedDto([report]));
      expect(html).toContain("Uncategorized");
      expect(html).toContain("100,00\u00A0€");
    });

    it("omits uncategorized section when zero", () => {
      const report = toMonthlyReportDto(
        computeMonthlyReport(Temporal.PlainYearMonth.from("2026-03"), targets, txns, categoryMap),
      );
      const html = renderer.render(makeUnifiedDto([report]));
      expect(html).not.toContain('class="uncategorized"');
    });
  });

  describe("render(UnifiedReportDto multi-month)", () => {
    const monthDto = toMonthlyReportDto(
      computeMonthlyReport(Temporal.PlainYearMonth.from("2026-01"), targets, txns, categoryMap),
    );
    const monthDto2 = toMonthlyReportDto(
      computeMonthlyReport(Temporal.PlainYearMonth.from("2026-02"), targets, txns, categoryMap),
    );
    const trend: TrendAnalyticsDto = {
      groupOvershootFrequency: [
        { count: 1, group: "NEEDS", totalMonths: 2 },
        { count: 0, group: "WANTS", totalMonths: 2 },
        { count: 0, group: "INVESTMENTS", totalMonths: 2 },
      ],
      monthOverMonthDeltas: [
        {
          groupDeltas: [
            { delta: 100, group: "NEEDS" },
            { delta: 0, group: "WANTS" },
            { delta: 0, group: "INVESTMENTS" },
          ],
          month: "2026-02",
          netDelta: 50,
        },
      ],
      savingsRateSeries: [
        { month: "2026-01", rate: 25 },
        { month: "2026-02", rate: null },
      ],
    };
    const dto: UnifiedReportDto = {
      _type: "UnifiedReportDto",
      months: [monthDto, monthDto2],
      range: { end: "2026-02", start: "2026-01" },
      trend,
    };
    const html = renderer.render(dto);

    it("produces a valid HTML5 document with report title", () => {
      expect(html).toMatch(/^<!DOCTYPE html>/);
      expect(html).toContain("Financial Report");
    });

    it("contains savings rate evolution section", () => {
      expect(html).toContain("Savings Rate Evolution");
    });

    it("contains group overshoot frequency section", () => {
      expect(html).toContain("Group Overshoot Frequency");
      expect(html).toContain("NEEDS");
    });

    it("contains month-over-month net section", () => {
      expect(html).toContain("Month-over-Month Net");
    });

    it("formats non-zero net delta with sign and zero net delta without sign", () => {
      const modifiedTrend: TrendAnalyticsDto = {
        ...trend,
        monthOverMonthDeltas: [
          { groupDeltas: [], month: "2026-01", netDelta: 50 },
          { groupDeltas: [], month: "2026-02", netDelta: 0 },
          { groupDeltas: [], month: "2026-03", netDelta: -30 },
        ],
      };
      const out = renderer.render({ ...dto, trend: modifiedTrend });
      expect(out).toContain("+50,00\u00A0€");
      expect(out).toContain("0,00\u00A0€");
      expect(out).not.toContain("+0,00\u00A0€");
      expect(out).toContain("-30,00\u00A0€");
    });

    it("contains month sections for each month", () => {
      expect(html).toContain('class="month-section"');
    });

    it("includes filter bar for multi-month report", () => {
      expect(html).toContain('id="month-from"');
    });

    it("omits savings rate section when series is empty", () => {
      const out = renderer.render({ ...dto, trend: { ...trend, savingsRateSeries: [] } });
      expect(out).not.toContain("Savings Rate Evolution");
    });

    it("omits overshoot section when frequency list is empty", () => {
      const out = renderer.render({ ...dto, trend: { ...trend, groupOvershootFrequency: [] } });
      expect(out).not.toContain("Group Overshoot Frequency");
    });

    it("omits month-over-month section when no deltas", () => {
      const out = renderer.render({ ...dto, trend: { ...trend, monthOverMonthDeltas: [] } });
      expect(out).not.toContain("Month-over-Month Net");
    });

    it("renders no month sections when months array is empty", () => {
      const out = renderer.render({ ...dto, months: [] });
      expect(out).not.toContain('class="month-section"');
    });

    it("applies over-budget class when group overspent", () => {
      const negativeNet = toMonthlyReportDto(
        computeMonthlyReport(
          Temporal.PlainYearMonth.from("2026-01"),
          targets,
          [makeTxn("1", -500, "2026-01-05", "n01")],
          categoryMap,
        ),
      );
      const out = renderer.render({ ...dto, months: [negativeNet] });
      expect(out).toContain("over-budget");
    });
  });

  it("renders empty report when range is null", () => {
    const html = renderer.render({
      _type: "UnifiedReportDto",
      months: [],
      range: null,
      trend: null,
    });
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("Financial Report");
    expect(html).toContain("No Data");
  });

  it("passes through plain objects as JSON pre block", () => {
    const html = renderer.render({ foo: "bar" });
    expect(html).toContain("<pre>");
    expect(html).toContain("foo");
  });

  describe("HTML escaping", () => {
    it('escapes & < > " in expense labels', () => {
      const txnWithSpecialLabel = Transaction.create({
        amount: Money.fromEuros(-100),
        categoryId: "n01",
        date: Temporal.PlainDate.from("2026-03-01"),
        id: "special-1",
        label: '<script>alert("xss")</script>',
        source: "csv",
      });
      const report = toMonthlyReportDto(
        computeMonthlyReport(
          Temporal.PlainYearMonth.from("2026-03"),
          targets,
          [txnWithSpecialLabel],
          categoryMap,
        ),
      );
      const html = renderer.render(makeUnifiedDto([report]));
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("escapes expense.date containing HTML special chars", () => {
      const baseDto = toMonthlyReportDto(
        computeMonthlyReport(
          Temporal.PlainYearMonth.from("2026-03"),
          targets,
          [
            Transaction.create({
              amount: Money.fromEuros(-99),
              categoryId: "n01",
              date: Temporal.PlainDate.from("2026-03-05"),
              id: "d1",
              label: "test",
              source: "csv",
            }),
          ],
          categoryMap,
        ),
      );
      const injectedDto = makeUnifiedDto([
        {
          ...baseDto,
          kpis: {
            ...baseDto.kpis,
            largestExpenses: [{ amount: 99, date: "<b>2026-03-05</b>", id: "d1", label: "test" }],
          },
        },
      ]);
      const html = renderer.render(injectedDto);
      expect(html).not.toContain("<b>2026-03-05</b>");
      expect(html).toContain("&lt;b&gt;2026-03-05&lt;/b&gt;");
    });

    it("contains no @import directives in the style block", () => {
      const report = toMonthlyReportDto(
        computeMonthlyReport(Temporal.PlainYearMonth.from("2026-03"), targets, txns, categoryMap),
      );
      const html = renderer.render(makeUnifiedDto([report]));
      expect(html).not.toContain("@import");
    });

    it("uses system font stacks instead of Google Fonts", () => {
      const report = toMonthlyReportDto(
        computeMonthlyReport(Temporal.PlainYearMonth.from("2026-03"), targets, txns, categoryMap),
      );
      const html = renderer.render(makeUnifiedDto([report]));
      expect(html).not.toContain("fonts.googleapis.com");
      expect(html).not.toContain("Cormorant Garamond");
      expect(html).not.toContain("Libre Franklin");
      expect(html).not.toContain("IBM Plex Mono");
    });
  });
});
