import { Budget } from "../../domain/entity/budget.js";
import {
  CategorySummary,
  GroupSummary,
  MonthlyReport,
  ReportKpis,
} from "../../domain/entity/monthly-report.js";
import { CategoryGroup } from "../../domain/value-object/category-group.js";
import { Money } from "../../domain/value-object/money.js";
import type { Renderer } from "./renderer.js";

export class HtmlRenderer implements Renderer {
  render(data: unknown): string {
    if (data instanceof MonthlyReport) {
      return this.renderReport(data);
    }
    if (data instanceof Budget) {
      return this.renderBudget(data);
    }
    return this.wrapHtml("Data", `<pre>${esc(JSON.stringify(data, null, 2))}</pre>`);
  }

  private renderReport(r: MonthlyReport): string {
    const sections = [
      this.kpiSection(r.kpis),
      this.groupTable(r.groups),
      this.categoryTable(r.categories),
      this.uncategorizedSection(r.uncategorized),
      this.reportFooter(r),
    ];
    return this.wrapHtml(
      `Monthly Report — ${r.month}`,
      sections.join("\n"),
    );
  }

  private renderBudget(b: Budget): string {
    const rows = b.lines
      .map(
        (l) =>
          `<tr><td>${esc(l.category.name)}</td><td class="num">${l.amount.format()}</td></tr>`,
      )
      .join("\n");
    const body = `
<h2>Budget — ${b.month}</h2>
<table>
  <thead><tr><th>Category</th><th>Amount</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr><th>Total</th><td class="num">${b.total().format()}</td></tr></tfoot>
</table>`;
    return this.wrapHtml(`Budget — ${b.month}`, body);
  }

  // --- Sections ---

  private kpiSection(kpis: ReportKpis): string {
    const card = (label: string, value: string) =>
      `<div class="kpi"><div class="kpi-value">${value}</div><div class="kpi-label">${label}</div></div>`;

    const fmtPct = (v: number | null) => (v === null ? "N/A" : `${v}%`);

    const cards = [
      card("Savings Rate", fmtPct(kpis.savingsRate)),
      card("Needs", fmtPct(kpis.fiftyThirtyTwenty.needs)),
      card("Wants", fmtPct(kpis.fiftyThirtyTwenty.wants)),
      card("Investments", fmtPct(kpis.fiftyThirtyTwenty.investments)),
      card("Budget Adherence", fmtPct(kpis.adherenceRate)),
      card("Daily Avg Spending", kpis.dailyAverageSpending.format()),
      card("Uncategorized", fmtPct(kpis.uncategorizedRatio)),
    ];

    return `<section class="kpis"><h2>Key Indicators</h2><div class="kpi-grid">${cards.join("")}</div></section>`;
  }

  private groupTable(groups: GroupSummary[]): string {
    const rows = groups
      .map((g) => {
        const isExpense = g.group !== CategoryGroup.INCOME;
        const deltaClass = isExpense ? deltaColor(g.delta) : "";
        return `<tr>
  <td>${esc(g.group)}</td>
  <td class="num">${g.budgeted.format()}</td>
  <td class="num">${g.actual.format()}</td>
  <td class="num ${deltaClass}">${g.delta.format()}</td>
</tr>`;
      })
      .join("\n");

    return `
<section>
<h2>Group Summary</h2>
<table>
  <thead><tr><th>Group</th><th>Budgeted</th><th>Actual</th><th>Delta</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</section>`;
  }

  private categoryTable(categories: CategorySummary[]): string {
    const rows = categories
      .map((c) => {
        const isExpense = c.group !== CategoryGroup.INCOME;
        const deltaClass = isExpense ? deltaColor(c.delta) : "";
        return `<tr>
  <td>${esc(c.categoryName)}</td>
  <td>${esc(c.group)}</td>
  <td class="num">${c.budgeted.format()}</td>
  <td class="num">${c.actual.format()}</td>
  <td class="num ${deltaClass}">${c.delta.format()}</td>
</tr>`;
      })
      .join("\n");

    return `
<section>
<h2>Category Breakdown</h2>
<table>
  <thead><tr><th>Category</th><th>Group</th><th>Budgeted</th><th>Actual</th><th>Delta</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</section>`;
  }

  private uncategorizedSection(amount: Money): string {
    if (amount.isZero()) return "";
    return `<section class="uncategorized"><h2>Uncategorized</h2><p>Total uncategorized: <strong>${amount.format()}</strong></p></section>`;
  }

  private reportFooter(r: MonthlyReport): string {
    return `
<section class="footer-totals">
<table>
  <tr><th>Income (Budgeted)</th><td class="num">${r.totalIncomeBudgeted.format()}</td></tr>
  <tr><th>Income (Actual)</th><td class="num">${r.totalIncomeActual.format()}</td></tr>
  <tr><th>Expenses (Budgeted)</th><td class="num">${r.totalExpenseBudgeted.format()}</td></tr>
  <tr><th>Expenses (Actual)</th><td class="num">${r.totalExpenseActual.format()}</td></tr>
  <tr><th>Net</th><td class="num">${r.net.format()}</td></tr>
  <tr><th>Transactions</th><td class="num">${r.transactionCount}</td></tr>
</table>
</section>`;
  }

  // --- Shell ---

  private wrapHtml(title: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
  h1 { border-bottom: 2px solid #e5e7eb; padding-bottom: .5rem; }
  h2 { margin-top: 2rem; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  th, td { padding: .5rem .75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
  thead th { background: #f9fafb; font-weight: 600; }
  tfoot th, tfoot td { font-weight: 600; border-top: 2px solid #d1d5db; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .over-budget { color: #dc2626; }
  .under-budget { color: #16a34a; }
  .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; }
  .kpi { background: #f9fafb; border-radius: 8px; padding: 1rem; text-align: center; }
  .kpi-value { font-size: 1.5rem; font-weight: 700; }
  .kpi-label { font-size: .85rem; color: #6b7280; margin-top: .25rem; }
  .uncategorized { background: #fef3c7; border-left: 4px solid #f59e0b; padding: .75rem 1rem; border-radius: 4px; }
</style>
</head>
<body>
<h1>${esc(title)}</h1>
${body}
</body>
</html>`;
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Returns CSS class based on budget delta (positive = under budget). */
function deltaColor(delta: Money): string {
  if (delta.isPositive()) return "under-budget";
  if (delta.isNegative()) return "over-budget";
  return "";
}
