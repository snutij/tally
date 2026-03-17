import {
  type GroupSummary,
  type MonthlyReport,
  type ReportKpis,
  isMonthlyReport,
} from "../../domain/read-model/monthly-report.js";
import { CategoryGroup } from "../../domain/value-object/category-group.js";
import type { Money } from "../../domain/value-object/money.js";
import type { Renderer } from "./renderer.js";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ── Helpers ─────────────────────────────────────────────

function esc(str: string): string {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function deltaColor(delta: Money): string {
  if (delta.isPositive()) {
    return "under-budget";
  }
  if (delta.isNegative()) {
    return "over-budget";
  }
  return "";
}

// eslint-disable-next-line unicorn/no-null -- null comes from domain ReportKpis interface
function fmtPct(val: number | null): string {
  // eslint-disable-next-line unicorn/no-null -- null comparison required by domain model
  return val === null ? "N/A" : `${val}%`;
}

interface TooltipContent {
  purpose: string;
  target: string;
  tip: string;
}

const KPI_TOOLTIPS: Record<string, TooltipContent> = {
  "Daily Avg Spending": {
    purpose: "Total monthly expenses divided by days in the month",
    target: "Keep below your daily income equivalent",
    tip: "Track daily purchases and set a daily spending cap",
  },
  "Savings Rate": {
    purpose: "Percentage of income kept after all expenses",
    target: "Aim for 20%+",
    tip: "Reduce discretionary spending or increase income",
  },
  Uncategorized: {
    purpose: "Percentage of transactions not assigned to any category",
    target: "Aim for 0%",
    tip: "Run 'tally transactions categorize' to assign categories",
  },
};

function card(label: string, value: string, highlight = false): string {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- label always matches a KPI_TOOLTIPS key
  const tooltip = KPI_TOOLTIPS[label]!;
  const tooltipHtml = `<span class="kpi-help-wrap"><button class="kpi-help" aria-label="About ${esc(label)}" type="button">?</button><div class="kpi-tooltip" role="tooltip"><strong>${esc(tooltip.purpose)}</strong><br>${esc(tooltip.target)}<br><em>${esc(tooltip.tip)}</em></div></span>`;
  return `<div class="kpi${highlight ? " kpi-highlight" : ""}">${tooltipHtml}<div class="kpi-value">${value}</div><div class="kpi-label">${label}</div></div>`;
}

function item(label: string, value: string, cls = ""): string {
  return `<div class="total-item"><span class="total-label">${label}</span><span class="total-value${cls ? ` ${cls}` : ""}">${value}</span></div>`;
}

function fmt(money: Money): string {
  return `${money.format()} €`;
}

function fmtDelta(delta: Money, signed: boolean): string {
  if (!signed || delta.isZero()) {
    return fmt(delta);
  }
  if (delta.isPositive()) {
    return `+${fmt(delta)}`;
  }
  return fmt(delta);
}

export class HtmlRenderer implements Renderer {
  // eslint-disable-next-line class-methods-use-this -- implements Renderer interface
  render(data: unknown): string {
    if (isMonthlyReport(data)) {
      return HtmlRenderer.renderReport(data);
    }
    return HtmlRenderer.wrapHtml("Data", `<pre>${esc(JSON.stringify(data, undefined, 2))}</pre>`);
  }

  // ── Report ─────────────────────────────────────────────

  private static renderReport(report: MonthlyReport): string {
    const sections = [
      HtmlRenderer.heroHeader(report, "Financial Report"),
      HtmlRenderer.kpiSection(report.kpis),
      HtmlRenderer.groupTable(report.groups),
      HtmlRenderer.insightsSection(report.kpis),
      HtmlRenderer.uncategorizedSection(report.uncategorized),
      HtmlRenderer.reportFooter(report),
    ].filter(Boolean);

    return HtmlRenderer.wrapHtml(`Monthly Report — ${report.month}`, sections.join("\n"));
  }

  private static heroHeader(ref: { month: unknown }, eyebrow: string): string {
    const [year, monthNum] = `${ref.month}`.split("-") as [string, string];
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- monthNum is 01-12, always valid index
    const monthName = MONTH_NAMES[Number.parseInt(monthNum, 10) - 1]!;
    return `<header class="hero">
  <div class="hero-eyebrow">${esc(eyebrow)}</div>
  <h1 class="hero-month">${esc(monthName)} ${esc(year)}</h1>
</header>`;
  }

  private static kpiSection(kpis: ReportKpis): string {
    const cards = [
      card("Savings Rate", fmtPct(kpis.savingsRate), true),
      card("Daily Avg Spending", fmt(kpis.dailyAverageSpending)),
      card("Uncategorized", fmtPct(kpis.uncategorizedRatio)),
    ];

    return `<section>
  <h2>Key Indicators</h2>
  <div class="kpi-grid">${cards.join("")}</div>
  ${HtmlRenderer.allocationBar(kpis)}
</section>`;
  }

  private static allocationBar(kpis: ReportKpis): string {
    const needsPct = kpis.fiftyThirtyTwenty.needs ?? 0;
    const wantsPct = kpis.fiftyThirtyTwenty.wants ?? 0;
    const inv = kpis.fiftyThirtyTwenty.investments ?? 0;
    if (needsPct === 0 && wantsPct === 0 && inv === 0) {
      return "";
    }

    return `<div class="allocation">
  <div class="alloc-title">50 / 30 / 20 Allocation</div>
  <div class="bar-track">
    <div class="bar-fill bar-needs" style="width:${needsPct}%"></div>
    <div class="bar-fill bar-wants" style="width:${wantsPct}%"></div>
    <div class="bar-fill bar-investments" style="width:${inv}%"></div>
  </div>
  <div class="bar-legend">
    <span class="legend-needs">Needs ${fmtPct(kpis.fiftyThirtyTwenty.needs)}</span>
    <span class="legend-wants">Wants ${fmtPct(kpis.fiftyThirtyTwenty.wants)}</span>
    <span class="legend-inv">Investments ${fmtPct(kpis.fiftyThirtyTwenty.investments)}</span>
  </div>
</div>`;
  }

  private static groupTable(groups: GroupSummary[]): string {
    const rows = groups
      .map((grp) => {
        const isExpense = grp.group !== CategoryGroup.INCOME;
        const cls = isExpense ? deltaColor(grp.delta) : "";
        return `<tr>
  <td>${esc(grp.group)}</td>
  <td class="num">${fmt(grp.budgeted)}</td>
  <td class="num">${fmt(grp.actual)}</td>
  <td class="num ${cls}">${fmtDelta(grp.delta, isExpense)}</td>
</tr>`;
      })
      .join("\n");

    return `<section>
<h2>Group Summary</h2>
<table>
  <thead><tr><th>Group</th><th class="num">Budgeted</th><th class="num">Actual</th><th class="num">Delta</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</section>`;
  }

  private static insightsSection(kpis: ReportKpis): string {
    const hasSpending = kpis.topSpendingCategories.length > 0;
    const hasExpenses = kpis.largestExpenses.length > 0;
    if (!hasSpending && !hasExpenses) {
      return "";
    }

    const spending = hasSpending
      ? `<div class="insight-card"><h3>Top Spending</h3>${kpis.topSpendingCategories
          .map(
            (cat, idx) =>
              `<div class="insight-item"><span class="insight-rank">${idx + 1}</span><span class="insight-label">${esc(cat.categoryName)}</span><span class="insight-value">${fmt(cat.actual)}</span></div>`,
          )
          .join("")}</div>`
      : "";

    const expenses = hasExpenses
      ? `<div class="insight-card"><h3>Largest Expenses</h3>${kpis.largestExpenses
          .map(
            (expense, idx) =>
              `<div class="insight-item"><span class="insight-rank">${idx + 1}</span><span class="insight-label">${esc(expense.label)}<span class="insight-date">${expense.date}</span></span><span class="insight-value">${fmt(expense.amount)}</span></div>`,
          )
          .join("")}</div>`
      : "";

    return `<section>
<h2>Insights</h2>
<div class="insights-grid">${spending}${expenses}</div>
</section>`;
  }

  private static uncategorizedSection(amount: Money): string {
    if (amount.isZero()) {
      return "";
    }
    return `<section class="uncategorized"><span class="uncat-dot"></span><p>Uncategorized transactions total: <strong>${fmt(amount)}</strong></p></section>`;
  }

  private static reportFooter(report: MonthlyReport): string {
    let netCls = "";
    if (report.net.isPositive()) {
      netCls = "positive";
    } else if (report.net.isNegative()) {
      netCls = "negative";
    }

    return `<footer class="footer-totals">
  <div class="totals-grid">
    ${item("Income (Actual)", fmt(report.totalIncomeActual))}
    ${item("Expense Target", fmt(report.totalExpenseTarget))}
    ${item("Expenses (Actual)", fmt(report.totalExpenseActual))}
    ${item("Net", fmt(report.net), netCls)}
    ${item("Transactions", `${report.transactionCount}`)}
  </div>
</footer>
<div class="attribution">Generated by Tally</div>`;
  }

  // ── Chrome ─────────────────────────────────────────────

  private static wrapHtml(title: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0d1017">
<title>${esc(title)}</title>
<style>
${HtmlRenderer.cssBase()}
${HtmlRenderer.cssHero()}
${HtmlRenderer.cssHeadings()}
${HtmlRenderer.cssKpiGrid()}
${HtmlRenderer.cssAllocationBar()}
${HtmlRenderer.cssTables()}
${HtmlRenderer.cssInsights()}
${HtmlRenderer.cssUncategorized()}
${HtmlRenderer.cssFooter()}
${HtmlRenderer.cssPre()}
${HtmlRenderer.cssPrint()}
</style>
</head>
<body>
${body}
</body>
</html>`;
  }

  private static cssBase(): string {
    return `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Libre+Franklin:wght@300;400;500;600&display=swap');

*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --font-display: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
  --font-body: 'Libre Franklin', 'Helvetica Neue', Helvetica, sans-serif;
  --font-mono: 'IBM Plex Mono', 'SF Mono', 'Fira Code', Consolas, monospace;
  --bg: #0d1017;
  --bg-card: #151a24;
  --bg-hover: #181d28;
  --text: #e4dfd6;
  --text-secondary: #958f84;
  --text-dim: #5c5750;
  --accent: #c8a652;
  --green: #4fad6a;
  --red: #d4544e;
  --blue: #5b8fd9;
  --purple: #b07ed4;
  --border: #222838;
}

body {
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--text);
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 2rem 3rem;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body::before {
  content: '';
  display: block;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--accent), var(--blue), var(--purple), var(--accent));
  margin-bottom: 2.5rem;
}

/* ── Animation ── */
@keyframes enter { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
body > * { animation: enter 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
body > :nth-child(2) { animation-delay: 0s; }
body > :nth-child(3) { animation-delay: 0.06s; }
body > :nth-child(4) { animation-delay: 0.12s; }
body > :nth-child(5) { animation-delay: 0.18s; }
body > :nth-child(6) { animation-delay: 0.24s; }
body > :nth-child(7) { animation-delay: 0.30s; }
body > :nth-child(8) { animation-delay: 0.36s; }
body > :nth-child(9) { animation-delay: 0.42s; }
body > :nth-child(10) { animation-delay: 0.48s; }`;
  }

  private static cssHero(): string {
    return `/* ── Hero ── */
.hero {
  margin-bottom: 2.5rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border);
}
.hero-eyebrow {
  font-family: var(--font-body);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--accent);
}
.hero-month {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 1.1;
  margin-top: 0.2rem;
  color: var(--text);
}`;
  }

  private static cssHeadings(): string {
    return `/* ── Section headings ── */
h2 {
  font-family: var(--font-body);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 1.2rem;
}

section { margin-bottom: 2.5rem; }`;
  }

  private static cssKpiGrid(): string {
    return `/* ── KPI Grid ── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: 10px;
}
.kpi {
  background: var(--bg-card);
  padding: 1.25rem 1rem;
  text-align: center;
}
.kpi-value {
  font-family: var(--font-mono);
  font-size: 1.4rem;
  font-weight: 600;
  line-height: 1;
  color: var(--text);
}
.kpi-label {
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-top: 0.45rem;
}
.kpi-highlight .kpi-value {
  font-size: 2rem;
  color: var(--accent);
}
.kpi { position: relative; overflow: visible; }
.kpi:first-child { border-radius: 10px 0 0 10px; }
.kpi:last-child { border-radius: 0 10px 10px 0; }
.kpi-help-wrap {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
}
.kpi-help {
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 50%;
  border: 1px solid var(--text-dim);
  background: transparent;
  color: var(--text-dim);
  font-size: 0.6rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
  transition: border-color 0.15s, color 0.15s;
}
.kpi-help:hover, .kpi-help:focus { border-color: var(--accent); color: var(--accent); outline: none; }
.kpi-tooltip {
  display: none;
  position: absolute;
  top: 50%;
  left: calc(100% + 0.5rem);
  transform: translateY(-50%);
  z-index: 10;
  width: max-content;
  max-width: 240px;
  padding: 0.65rem 0.85rem;
  border-radius: 8px;
  background: var(--bg);
  border: 1px solid var(--border);
  font-size: 0.72rem;
  line-height: 1.5;
  text-align: left;
  color: var(--text-secondary);
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.kpi-help:hover + .kpi-tooltip, .kpi-help:focus + .kpi-tooltip { display: block; }`;
  }

  private static cssAllocationBar(): string {
    return `/* ── Allocation Bar ── */
.allocation { margin-top: 1.4rem; }
.alloc-title {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 0.6rem;
}
.bar-track {
  display: flex;
  height: 7px;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(255,255,255,0.04);
}
.bar-fill { transition: width 0.7s cubic-bezier(0.22, 1, 0.36, 1); }
.bar-needs { background: var(--blue); }
.bar-wants { background: var(--purple); }
.bar-investments { background: var(--accent); }
.bar-legend {
  display: flex;
  gap: 1.5rem;
  margin-top: 0.6rem;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--text-secondary);
}
.bar-legend span { display: flex; align-items: center; gap: 0.4rem; }
.bar-legend span::before {
  content: '';
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
}
.legend-needs::before { background: var(--blue); }
.legend-wants::before { background: var(--purple); }
.legend-inv::before { background: var(--accent); }`;
  }

  private static cssTables(): string {
    return `/* ── Tables ── */
table { width: 100%; border-collapse: collapse; }
thead th {
  font-family: var(--font-body);
  font-size: 0.63rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-dim);
  padding: 0 1rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}
td {
  font-size: 0.85rem;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid rgba(34, 40, 56, 0.5);
  transition: background 0.12s;
}
tbody tr:hover td { background: var(--bg-hover); }
.num {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
tfoot th, tfoot td {
  font-weight: 600;
  padding-top: 0.85rem;
  border-top: 1px solid var(--border);
  border-bottom: none;
}
.group-badge {
  display: inline-block;
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  padding: 0.15rem 0.45rem;
  border-radius: 3px;
  background: rgba(255,255,255,0.04);
  color: var(--text-secondary);
}
.group-row td {
  font-size: 0.63rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-dim);
  padding-top: 1.25rem;
  border-bottom: none;
}
.under-budget { color: var(--green); }
.over-budget { color: var(--red); }`;
  }

  private static cssInsights(): string {
    return `/* ── Insights ── */
.insights-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
@media (max-width: 640px) { .insights-grid { grid-template-columns: 1fr; } }
.insight-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1.15rem 1.25rem;
}
.insight-card h3 {
  font-size: 0.63rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 0.85rem;
}
.insight-item {
  display: flex;
  align-items: baseline;
  padding: 0.35rem 0;
  font-size: 0.8rem;
}
.insight-item + .insight-item { border-top: 1px solid rgba(34, 40, 56, 0.4); }
.insight-rank {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--text-dim);
  width: 1.5rem;
  flex-shrink: 0;
}
.insight-label { flex: 1; color: var(--text); }
.insight-date {
  font-size: 0.68rem;
  color: var(--text-dim);
  margin-left: 0.4rem;
}
.insight-value {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--text-secondary);
  flex-shrink: 0;
  margin-left: 0.75rem;
}`;
  }

  private static cssUncategorized(): string {
    return `/* ── Uncategorized ── */
.uncategorized {
  background: rgba(212, 84, 78, 0.07);
  border: 1px solid rgba(212, 84, 78, 0.18);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.uncat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--red);
  flex-shrink: 0;
}
.uncategorized p { font-size: 0.85rem; }`;
  }

  private static cssFooter(): string {
    return `/* ── Footer ── */
.footer-totals {
  border-top: 1px solid var(--border);
  padding-top: 2rem;
  margin-top: 1rem;
}
.totals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1.5rem 2rem;
}
.total-item { display: flex; flex-direction: column; gap: 0.1rem; }
.total-label {
  font-size: 0.63rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-dim);
}
.total-value {
  font-family: var(--font-mono);
  font-size: 1.15rem;
  font-weight: 500;
}
.total-value.positive { color: var(--green); }
.total-value.negative { color: var(--red); }

.attribution {
  text-align: center;
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
  font-size: 0.65rem;
  color: var(--text-dim);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}`;
  }

  private static cssPre(): string {
    return `pre {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1.5rem;
  overflow-x: auto;
  line-height: 1.65;
  color: var(--text-secondary);
}`;
  }

  private static cssPrint(): string {
    return `/* ── Print ── */
@media print {
  body { background: #fff; color: #1a1a1a; padding: 1rem; }
  body::before { display: none; }
  body > * { animation: none !important; }
  .hero-eyebrow, h2, .kpi-label, thead th, .total-label,
  .insight-card h3, .alloc-title, .bar-legend, .insight-date,
  .insight-rank, .group-badge { color: #666; }
  .hero-month, .kpi-value, .total-value, td { color: #1a1a1a; }
  .kpi-highlight .kpi-value { color: #8b6f2e; }
  .kpi, .insight-card { background: #f7f7f5; border-color: #e0e0e0; }
  .kpi-grid { background: #e0e0e0; border-color: #e0e0e0; }
  .under-budget { color: #0a7c2e; }
  .over-budget { color: #c41e1e; }
  .uncategorized { background: #fff6e0; border-color: #ddb84e; }
  td, thead th { border-color: #e5e7eb; }
  .num, .insight-value { color: #333; }
  .kpi-help, .kpi-tooltip { display: none !important; }
  .attribution { display: none; }
}`;
  }
}
