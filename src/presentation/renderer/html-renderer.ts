import {
  type GroupSummaryDto,
  type MonthOverMonthDeltaDto,
  type MonthlyReportDto,
  type ReportDto,
  type ReportKpisDto,
  type SavingsRateEntryDto,
  type TrendAnalyticsDto,
  isReportDto,
} from "../../application/dto/report-dto.js";
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

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// ── Formatters ──────────────────────────────────────────

const fmtCurrency = new Intl.NumberFormat("fr-FR", { currency: "EUR", style: "currency" });
const fmtCurrencySigned = new Intl.NumberFormat("fr-FR", {
  currency: "EUR",
  signDisplay: "exceptZero",
  style: "currency",
});
const fmtPercent = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0, style: "percent" });

// ── Helpers ─────────────────────────────────────────────

function esc(str: string): string {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function deltaColor(delta: number): string {
  if (delta > 0) {
    return "under-budget";
  }
  if (delta < 0) {
    return "over-budget";
  }
  return "";
}

function fmtPct(val: number | null): string {
  return val === null ? "N/A" : fmtPercent.format(val / 100);
}

function monthLabel(monthStr: string): string {
  const parts = monthStr.split("-");
  const year = parts[0] ?? "";
  const monthNum = parts[1] ?? "";
  const abbr = MONTH_SHORT[Number.parseInt(monthNum, 10) - 1] ?? monthNum;
  return `${abbr} '${year.slice(2)}`;
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

interface KpiCardData {
  badge: string;
  context: string;
  label: string;
  progress: { fill: number; target: number } | null;
  status: "good" | "warn" | "bad" | "neutral";
  value: string;
}

function kpiCard(data: KpiCardData): string {
  const tooltip = KPI_TOOLTIPS[data.label];
  const tooltipHtml = tooltip
    ? `<button class="kpi-help" aria-label="About ${esc(data.label)}" type="button">?</button><div class="kpi-tooltip" role="tooltip"><strong>${esc(tooltip.purpose)}</strong><br>${esc(tooltip.target)}<br><em>${esc(tooltip.tip)}</em></div>`
    : "";
  const badgeHtml = data.badge
    ? `<span class="kpi-badge kpi-badge-${data.status}">${esc(data.badge)}</span>`
    : "";
  const progressHtml = data.progress
    ? `<div class="kpi-progress"><div class="kpi-prog-fill kpi-prog-${data.status}" style="width:${data.progress.fill}%"></div><div class="kpi-prog-target" style="left:${data.progress.target}%"></div></div>`
    : "";
  return `<div class="kpi kpi-${data.status}">
  <div class="kpi-head">
    <span class="kpi-label">${esc(data.label)}</span>
    <span class="kpi-actions">${tooltipHtml}</span>
  </div>
  <div class="kpi-body">
    <span class="kpi-value">${esc(data.value)}</span>
    ${badgeHtml}
  </div>
  <div class="kpi-context">${esc(data.context)}</div>
  ${progressHtml}
</div>`;
}

function item(label: string, value: string, cls = ""): string {
  return `<div class="total-item"><span class="total-label">${esc(label)}</span><span class="total-value${cls ? ` ${cls}` : ""}">${esc(value)}</span></div>`;
}

export class HtmlRenderer implements Renderer {
  render(data: unknown): string {
    if (isReportDto(data)) {
      return HtmlRenderer.renderUnified(data);
    }
    throw new Error(`HtmlRenderer: unexpected data type`);
  }

  // ── Unified ────────────────────────────────────────────

  private static renderUnified(dto: ReportDto): string {
    const title = HtmlRenderer.unifiedTitle(dto);
    const sections: string[] = [HtmlRenderer.unifiedHeader(dto)];

    if (dto.trend === null) {
      for (const month of dto.months) {
        sections.push(HtmlRenderer.monthSection(month));
      }
      return HtmlRenderer.wrapHtml(title, sections.filter(Boolean).join("\n"));
    }

    // Multi-month: overall analytics FIRST (primary view)
    sections.push(HtmlRenderer.savingsRateSection(dto.trend.savingsRateSeries));
    sections.push(HtmlRenderer.trendPairSection(dto.trend));
    // Monthly breakdown secondary — wrapped with filter
    sections.push(HtmlRenderer.monthlyBreakdown(dto.months));

    const body = sections.filter(Boolean).join("\n");
    return HtmlRenderer.wrapHtml(title, body, HtmlRenderer.filterScript());
  }

  private static unifiedTitle(dto: ReportDto): string {
    if (dto.range === null) {
      return "Financial Report";
    }
    if (dto.range.start === dto.range.end) {
      return `Financial Report — ${dto.range.start}`;
    }
    return `Financial Report — ${dto.range.start} to ${dto.range.end}`;
  }

  private static unifiedHeader(dto: ReportDto): string {
    if (dto.range === null) {
      return `<header class="hero"><div class="hero-eyebrow">Financial Report</div><h1 class="hero-title">No Data</h1></header>`;
    }
    if (dto.range.start === dto.range.end) {
      const parts = dto.range.start.split("-");
      const year = parts[0] ?? "";
      const monthNum = parts[1] ?? "";
      const monthName = MONTH_NAMES[Number.parseInt(monthNum, 10) - 1] ?? monthNum;
      return `<header class="hero">
  <div class="hero-eyebrow">Financial Report</div>
  <h1 class="hero-title">${esc(monthName)} <span class="hero-year">${esc(year)}</span></h1>
</header>`;
    }
    // Multi-month: aggregate stats + interactive month strip
    const totalNet = dto.months.reduce((sum, mo) => sum + mo.net, 0);
    const validRates = dto.months
      .map((mo) => mo.kpis.savingsRate)
      .filter((rate): rate is number => rate !== null);
    const avgRate =
      validRates.length === 0
        ? null
        : validRates.reduce((sum, rate) => sum + rate, 0) / validRates.length;
    const netCls = totalNet >= 0 ? "hero-pos" : "hero-neg";
    let rateCls = "";
    if (avgRate !== null) {
      rateCls = avgRate >= 20 ? "hero-pos" : "hero-neg";
    }
    const avgRateLabel = avgRate === null ? "N/A" : `${Math.round(avgRate)}%`;
    return `<header class="hero">
  <div class="hero-top">
    <span class="hero-eyebrow">Financial Report</span>
    <span class="hero-range">${esc(dto.range.start)} → ${esc(dto.range.end)}</span>
  </div>
  <div class="hero-stats">
    <div class="hero-stat">
      <span class="hero-stat-label">Total saved</span>
      <span class="hero-stat-value ${netCls}">${fmtCurrencySigned.format(totalNet)}</span>
    </div>
    <span class="hero-rule" aria-hidden="true"></span>
    <div class="hero-stat">
      <span class="hero-stat-label">Avg savings rate</span>
      <span class="hero-stat-value ${rateCls}">${esc(avgRateLabel)}</span>
    </div>
  </div>
  ${HtmlRenderer.monthStrip(dto.months)}
</header>`;
  }

  private static monthStrip(months: MonthlyReportDto[]): string {
    if (months.length < 2) {
      return "";
    }
    const options = months
      .map((mo) => `<option value="${esc(mo.month)}">${esc(mo.month)}</option>`)
      .join("");
    const maxAbs = Math.max(...months.map((mo) => Math.abs(mo.net)), 1);
    const pills = months
      .map((mo) => {
        const pct = Math.min(100, Math.round((Math.abs(mo.net) / maxAbs) * 100));
        const cls = mo.net >= 0 ? "ms-pos" : "ms-neg";
        return `<button class="ms-pill" data-month="${esc(mo.month)}" type="button">
  <span class="ms-bar"><span class="ms-fill ${cls}" style="height:${pct}%"></span></span>
  <span class="ms-label">${esc(monthLabel(mo.month))}</span>
</button>`;
      })
      .join("");
    return `<nav class="month-strip" aria-label="Filter by month">
  <select class="sr-only" id="month-from"><option value="">All</option>${options}</select>
  <select class="sr-only" id="month-to"><option value="">All</option>${options}</select>
  <div class="ms-pills">
    ${pills}
    <button class="ms-pill ms-pill-all ms-active" data-month="" type="button">
      <span class="ms-bar"></span>
      <span class="ms-label">All</span>
    </button>
  </div>
</nav>`;
  }

  // ── Trend primary view ─────────────────────────────────

  private static trendPairSection(dto: TrendAnalyticsDto): string {
    const overshoot = HtmlRenderer.overshootInner(dto);
    const mom = HtmlRenderer.momDeltaInner(dto.monthOverMonthDeltas);
    if (overshoot === "" && mom === "") {
      return "";
    }
    const cols = [
      overshoot ? `<div class="pair-col">${overshoot}</div>` : "",
      mom ? `<div class="pair-col">${mom}</div>` : "",
    ]
      .filter(Boolean)
      .join("");
    return `<div class="pair-grid">${cols}</div>`;
  }

  private static overshootInner(dto: TrendAnalyticsDto): string {
    if (dto.groupOvershootFrequency.length === 0) {
      return "";
    }
    const rows = dto.groupOvershootFrequency
      .map((entry) => {
        const freq = entry.totalMonths === 0 ? 0 : entry.count / entry.totalMonths;
        const pct = Math.round(freq * 100);
        const cls = entry.count > 0 ? "over-budget" : "under-budget";
        const fmtd = fmtPercent.format(freq);
        return `<div class="freq-row">
  <span class="freq-group">${esc(entry.group)}</span>
  <div class="freq-track"><div class="freq-fill ${cls}" style="width:${pct}%"></div></div>
  <span class="freq-count ${cls}">${entry.count}/${entry.totalMonths} · ${fmtd}</span>
</div>`;
      })
      .join("\n");
    return `<div class="pair-panel">
<h2>Group Overshoot Frequency</h2>
<div class="freq-chart">${rows}</div>
</div>`;
  }

  private static momDeltaInner(deltas: MonthOverMonthDeltaDto[]): string {
    if (deltas.length === 0) {
      return "";
    }
    const rows = deltas
      .map((delta) => {
        const netCls = delta.netDelta >= 0 ? "under-budget" : "over-budget";
        const groupPills = delta.groupDeltas
          .filter((gd) => gd.delta !== 0)
          .map((gd) => {
            const sign = gd.delta > 0 ? "+" : "";
            const cls = gd.delta > 0 ? "pill-positive" : "pill-negative";
            return `<span class="mom-pill ${cls}">${esc(gd.group.charAt(0) + gd.group.slice(1).toLowerCase())} ${sign}${fmtCurrencySigned.format(gd.delta)}</span>`;
          })
          .join("");
        return `<div class="mom-row">
  <span class="mom-month">${esc(monthLabel(delta.month))}</span>
  <span class="mom-net ${netCls}">${fmtCurrencySigned.format(delta.netDelta)}</span>
  ${groupPills ? `<div class="mom-pills">${groupPills}</div>` : ""}
</div>`;
      })
      .join("\n");
    return `<div class="pair-panel">
<h2>Month-over-Month Net</h2>
<div class="mom-list">${rows}</div>
</div>`;
  }

  // ── Monthly breakdown (secondary) ─────────────────────

  private static monthlyBreakdown(months: MonthlyReportDto[]): string {
    if (months.length === 0) {
      return "";
    }
    const monthSections = months.map((mo) => HtmlRenderer.monthSection(mo)).join("\n");
    return `<div class="breakdown-zone">
<div class="breakdown-header"><span class="breakdown-label">Monthly Detail</span></div>
${monthSections}
</div>`;
  }

  private static monthSection(report: MonthlyReportDto): string {
    const inner = [
      HtmlRenderer.heroHeader(report, "Monthly Report"),
      HtmlRenderer.kpiSection(report.kpis),
      HtmlRenderer.groupTable(report.groups),
      HtmlRenderer.insightsSection(report.kpis),
      HtmlRenderer.uncategorizedSection(report.uncategorized),
      HtmlRenderer.reportFooter(report),
    ]
      .filter(Boolean)
      .join("\n");
    return `<div class="month-section" data-month="${esc(report.month)}">${inner}</div>`;
  }

  private static filterScript(): string {
    return `
(function() {
  var fromSel = document.getElementById('month-from');
  var toSel   = document.getElementById('month-to');
  function applyFilter() {
    var from = fromSel.value;
    var to   = toSel.value;
    document.querySelectorAll('.month-section').forEach(function(el) {
      var m = el.dataset.month;
      var afterFrom = !from || m >= from;
      var beforeTo  = !to   || m <= to;
      el.style.display = (afterFrom && beforeTo) ? '' : 'none';
    });
    var single = from && from === to;
    document.querySelectorAll('.ms-pill').forEach(function(btn) {
      var bm = btn.dataset.month;
      var active = bm === '' ? (!from && !to) : (single && bm === from);
      btn.classList.toggle('ms-active', active);
    });
  }
  document.querySelectorAll('.ms-pill').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var mo = btn.dataset.month;
      if (mo === '') {
        fromSel.value = '';
        toSel.value   = '';
      } else if (fromSel.value === mo && toSel.value === mo) {
        fromSel.value = '';
        toSel.value   = '';
      } else {
        fromSel.value = mo;
        toSel.value   = mo;
      }
      applyFilter();
    });
  });
  fromSel.addEventListener('change', applyFilter);
  toSel.addEventListener('change',   applyFilter);
})();`;
  }

  private static savingsRateSection(series: SavingsRateEntryDto[]): string {
    if (series.length === 0) {
      return "";
    }
    const maxRate = Math.max(...series.map((entry) => entry.rate ?? 0), 40);
    const rows = series
      .map((entry, idx) => {
        const { rate } = entry;
        const pct = rate === null ? 0 : Math.round((rate / maxRate) * 100);
        const isGood = rate !== null && rate >= 20;
        const cls = isGood ? "sr-good" : "sr-low";
        const label = rate === null ? "N/A" : `${Math.round(rate)}%`;
        const delay = (idx * 0.07).toFixed(2);
        return `<div class="sr-row">
  <span class="sr-month">${esc(monthLabel(entry.month))}</span>
  <div class="sr-track">
    <div class="sr-fill ${cls}" style="--bar-pct:${pct}%;--bar-delay:${delay}s"></div>
  </div>
  <span class="sr-val${rate !== null && rate < 20 ? " sr-val-low" : ""}">${esc(label)}</span>
</div>`;
      })
      .join("\n");

    return `<section class="sr-section">
<h2>Savings Rate Evolution</h2>
<div class="sr-chart">${rows}</div>
<div class="sr-legend"><span class="sr-dot sr-good"></span>≥ 20 % target &ensp;<span class="sr-dot sr-low"></span>Below target</div>
</section>`;
  }

  // ── Report ─────────────────────────────────────────────

  private static heroHeader(ref: { month: string }, eyebrow: string): string {
    const parts = ref.month.split("-");
    const year = parts[0] ?? "";
    const monthNum = parts[1] ?? "";
    const monthName = MONTH_NAMES[Number.parseInt(monthNum, 10) - 1] ?? monthNum;
    return `<header class="month-hero">
  <div class="month-eyebrow">${esc(eyebrow)}</div>
  <h1 class="month-heading">${esc(monthName)} <span class="month-year">${esc(year)}</span></h1>
</header>`;
  }

  private static kpiSection(kpis: ReportKpisDto): string {
    const { savingsRate, uncategorizedRatio, dailyAverageSpending } = kpis;

    // ── Savings Rate status ──
    let srStatus: KpiCardData["status"] = "neutral";
    let srBadge = "";
    let srContext = "No income recorded";
    const srFill = savingsRate === null ? 0 : Math.min(100, Math.round((savingsRate / 40) * 100));
    if (savingsRate === null) {
      srStatus = "neutral";
    } else if (savingsRate >= 20) {
      srStatus = "good";
      srBadge = "On target";
      srContext = `+${Math.round(savingsRate - 20)}% above the 20% goal`;
    } else {
      srStatus = savingsRate >= 10 ? "warn" : "bad";
      srBadge = savingsRate >= 10 ? "Below target" : "Needs work";
      srContext = `${Math.round(20 - savingsRate)}% short of the 20% goal`;
    }

    // ── Uncategorized status ──
    let ucStatus: KpiCardData["status"] = "neutral";
    let ucBadge = "";
    let ucContext = "No data";
    if (uncategorizedRatio === null) {
      ucStatus = "neutral";
    } else if (uncategorizedRatio === 0) {
      ucStatus = "good";
      ucBadge = "All clear";
      ucContext = "All transactions categorized";
    } else {
      ucStatus = uncategorizedRatio < 15 ? "warn" : "bad";
      ucBadge = "Needs review";
      ucContext = `${fmtPct(uncategorizedRatio)} of transactions need attention`;
    }

    const cards = [
      kpiCard({
        badge: srBadge,
        context: srContext,
        label: "Savings Rate",
        progress: { fill: srFill, target: 50 },
        status: srStatus,
        value: fmtPct(savingsRate),
      }),
      kpiCard({
        badge: "",
        context: "average per day this month",
        label: "Daily Avg Spending",
        progress: null,
        status: "neutral",
        value: fmtCurrency.format(dailyAverageSpending),
      }),
      kpiCard({
        badge: ucBadge,
        context: ucContext,
        label: "Uncategorized",
        progress: null,
        status: ucStatus,
        value: fmtPct(uncategorizedRatio),
      }),
    ].join("");

    return `<section>
  <h2>Key Indicators</h2>
  <div class="kpi-grid">${cards}</div>
  ${HtmlRenderer.allocationBar(kpis)}
</section>`;
  }

  private static allocationBar(kpis: ReportKpisDto): string {
    const needsPct = kpis.fiftyThirtyTwenty.needs ?? 0;
    const wantsPct = kpis.fiftyThirtyTwenty.wants ?? 0;
    const inv = kpis.fiftyThirtyTwenty.investments ?? 0;
    if (needsPct === 0 && wantsPct === 0 && inv === 0) {
      return "";
    }

    return `<div class="allocation">
  <div class="alloc-title">50 / 30 / 20 Allocation</div>
  <div class="bar-track">
    <div class="bar-fill bar-needs" style="width:${needsPct}%"><span class="bar-inside-label">${needsPct > 8 ? "Needs" : ""}</span></div>
    <div class="bar-fill bar-wants" style="width:${wantsPct}%"><span class="bar-inside-label">${wantsPct > 8 ? "Wants" : ""}</span></div>
    <div class="bar-fill bar-investments" style="width:${inv}%"><span class="bar-inside-label">${inv > 8 ? "Invest" : ""}</span></div>
  </div>
  <div class="bar-legend">
    <span class="legend-needs">Needs ${fmtPct(kpis.fiftyThirtyTwenty.needs)}</span>
    <span class="legend-wants">Wants ${fmtPct(kpis.fiftyThirtyTwenty.wants)}</span>
    <span class="legend-inv">Investments ${fmtPct(kpis.fiftyThirtyTwenty.investments)}</span>
  </div>
</div>`;
  }

  private static groupTable(groups: GroupSummaryDto[]): string {
    const rows = groups
      .map((grp) => {
        const isExpense = grp.group !== "INCOME";
        const cls = isExpense ? deltaColor(grp.delta) : "";
        return `<tr>
  <td>${esc(grp.group)}</td>
  <td class="num">${fmtCurrency.format(grp.budgeted)}</td>
  <td class="num">${fmtCurrency.format(grp.actual)}</td>
  <td class="num ${cls}">${isExpense ? fmtCurrencySigned.format(grp.delta) : fmtCurrency.format(grp.delta)}</td>
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

  private static insightsSection(kpis: ReportKpisDto): string {
    const hasSpending = kpis.topSpendingCategories.length > 0;
    const hasExpenses = kpis.largestExpenses.length > 0;
    if (!hasSpending && !hasExpenses) {
      return "";
    }

    const spending = hasSpending
      ? `<div class="insight-card"><h3>Top Spending</h3>${kpis.topSpendingCategories
          .map(
            (cat, idx) =>
              `<div class="insight-item"><span class="insight-rank">${idx + 1}</span><span class="insight-label">${esc(cat.categoryName)}</span><span class="insight-value">${fmtCurrency.format(cat.actual)}</span></div>`,
          )
          .join("")}</div>`
      : "";

    const expenses = hasExpenses
      ? `<div class="insight-card"><h3>Largest Expenses</h3>${kpis.largestExpenses
          .map(
            (expense, idx) =>
              `<div class="insight-item"><span class="insight-rank">${idx + 1}</span><span class="insight-label">${esc(expense.label)}<span class="insight-date">${esc(expense.date)}</span></span><span class="insight-value">${fmtCurrency.format(expense.amount)}</span></div>`,
          )
          .join("")}</div>`
      : "";

    return `<section>
<h2>Insights</h2>
<div class="insights-grid">${spending}${expenses}</div>
</section>`;
  }

  private static uncategorizedSection(amount: number): string {
    if (amount === 0) {
      return "";
    }
    return `<section class="uncategorized"><span class="uncat-dot"></span><p>Uncategorized transactions total: <strong>${fmtCurrency.format(amount)}</strong></p></section>`;
  }

  private static reportFooter(report: MonthlyReportDto): string {
    let netCls = "";
    if (report.net > 0) {
      netCls = "positive";
    } else if (report.net < 0) {
      netCls = "negative";
    }

    return `<footer class="footer-totals">
  <div class="totals-grid">
    ${item("Income (Actual)", fmtCurrency.format(report.totalIncomeActual))}
    ${item("Expense Target", fmtCurrency.format(report.totalExpenseTarget))}
    ${item("Expenses (Actual)", fmtCurrency.format(report.totalExpenseActual))}
    ${item("Net", fmtCurrency.format(report.net), netCls)}
    ${item("Transactions", `${report.transactionCount}`)}
  </div>
</footer>
<div class="attribution">Generated by Tally</div>`;
  }

  // ── Chrome ─────────────────────────────────────────────

  private static themeInitScript(): string {
    return `(function(){try{var s=localStorage.getItem('tally-theme');if(s){document.documentElement.setAttribute('data-theme',s);}else if(window.matchMedia('(prefers-color-scheme:dark)').matches){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`;
  }

  private static themeToggleScript(): string {
    return `(function(){
var btn=document.getElementById('theme-toggle');
function sync(){
  var dark=document.documentElement.getAttribute('data-theme')==='dark';
  btn.textContent=dark?'\u2600 Light':'\u25D1 Dark';
}
btn.addEventListener('click',function(){
  var next=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',next);
  try{localStorage.setItem('tally-theme',next);}catch(e){}
  sync();
});
sync();
})();`;
  }

  private static wrapHtml(title: string, body: string, script = ""): string {
    // Theme toggle button + JS only for multi-month reports (which already embed a filter script).
    // Single-month reports remain script-free; dark mode is handled purely by prefers-color-scheme.
    const hasScript = script !== "";
    const themeHeadScript = hasScript ? `<script>${HtmlRenderer.themeInitScript()}</script>\n` : "";
    const toggleBtn = hasScript
      ? `<button class="theme-toggle" id="theme-toggle" type="button" aria-label="Toggle theme">&#9681; Dark</button>\n`
      : "";
    const themeBodyScript = hasScript
      ? `\n<script>${HtmlRenderer.themeToggleScript()}</script>`
      : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${themeHeadScript}<style>
${HtmlRenderer.cssBase()}
${HtmlRenderer.cssThemes()}
${HtmlRenderer.cssHero()}
${HtmlRenderer.cssHeadings()}
${HtmlRenderer.cssKpiGrid()}
${HtmlRenderer.cssKpiDetails()}
${HtmlRenderer.cssAllocationBar()}
${HtmlRenderer.cssTables()}
${HtmlRenderer.cssInsights()}
${HtmlRenderer.cssUncategorized()}
${HtmlRenderer.cssFooter()}
${HtmlRenderer.cssPre()}
${HtmlRenderer.cssSavingsChart()}
${HtmlRenderer.cssTrendPair()}
${HtmlRenderer.cssMonthStrip()}
${HtmlRenderer.cssBreakdown()}
${HtmlRenderer.cssThemeToggle()}
${HtmlRenderer.cssPrint()}
</style>
</head>
<body>
${toggleBtn}${body}
${script ? `<script>${script}</script>` : ""}${themeBodyScript}
</body>
</html>`;
  }

  // ── CSS ────────────────────────────────────────────────

  private static cssBase(): string {
    return `*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { font-size: 20px; }

/* ── Light theme (default) ── */
:root {
  --font-display: Georgia, 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  --font-body: 'Optima', 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
  --font-mono: 'SF Mono', SFMono-Regular, Consolas, 'Courier New', monospace;

  --bg:          #faf8f4;
  --bg-card:     #ffffff;
  --bg-tinted:   #f4f1eb;
  --text:        #1a1410;
  --text-mid:    #4a4035;
  --text-dim:    #8a7e6e;
  --accent:      #1f5c44;
  --accent-light:#2d7a5c;
  --accent-pale: #e8f5ef;
  --red:         #8b2e2e;
  --red-pale:    #fdf0f0;
  --amber:       #c27c1a;
  --amber-pale:  #fdf6e8;
  --border:      #e4ddd2;
  --border-mid:  #cfc5b5;
  --grad-a:      #1f5c44;
  --grad-b:      #2d7a5c;
  --grad-c:      #c27c1a;
}

body {
  font-family: var(--font-body);
  background-color: var(--bg);
  color: var(--text);
  max-width: 1040px;
  margin: 0 auto;
  padding: 0 2rem 5rem;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  transition: background-color 0.25s, color 0.25s;
}

body::before {
  content: '';
  display: block;
  height: 3px;
  background: linear-gradient(90deg,
    var(--grad-a) 0%,
    var(--grad-b) 40%,
    var(--grad-c) 100%);
  margin-bottom: 0;
}

@keyframes rise {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
body > * { animation: rise 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
body > :nth-child(2)  { animation-delay: 0.00s; }
body > :nth-child(3)  { animation-delay: 0.06s; }
body > :nth-child(4)  { animation-delay: 0.12s; }
body > :nth-child(5)  { animation-delay: 0.18s; }
body > :nth-child(6)  { animation-delay: 0.24s; }
body > :nth-child(7)  { animation-delay: 0.30s; }
body > :nth-child(8)  { animation-delay: 0.36s; }
body > :nth-child(9)  { animation-delay: 0.42s; }
body > :nth-child(10) { animation-delay: 0.48s; }`;
  }

  private static cssThemes(): string {
    const darkVars = `
  --bg:          #13100d;
  --bg-card:     #1c1915;
  --bg-tinted:   #24201a;
  --text:        #ede4d0;
  --text-mid:    #c4b49a;
  --text-dim:    #7a6a54;
  --accent:      #e8a530;
  --accent-light:#f4c84a;
  --accent-pale: rgba(232,165,48,0.12);
  --red:         #d86050;
  --red-pale:    rgba(216,96,80,0.12);
  --amber:       #e8a530;
  --amber-pale:  rgba(232,165,48,0.10);
  --border:      #26201a;
  --border-mid:  #332a20;
  --grad-a:      #e8a530;
  --grad-b:      #f4c84a;
  --grad-c:      #9a7ab8;`;
    return `/* ── Dark theme (manual override) ── */
:root[data-theme="dark"] {${darkVars}
}
/* ── Dark theme (OS preference, not overridden) ── */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {${darkVars}
  }
}`;
  }

  private static cssHero(): string {
    return `/* ── Hero ── */
.hero {
  padding: 3.5rem 0 2.5rem;
  border-bottom: 2px solid var(--text);
  margin-bottom: 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.hero-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.hero-eyebrow {
  font-family: var(--font-mono);
  font-size: 0.77rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--accent);
}
.hero-range {
  font-family: var(--font-mono);
  font-size: 0.77rem;
  letter-spacing: 0.1em;
  color: var(--text-dim);
}
.hero-title {
  font-family: var(--font-display);
  font-size: clamp(2.6rem, 6vw, 4.2rem);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.05;
  color: var(--text);
}
.hero-year { color: var(--text-dim); font-weight: 400; }
.hero-stats {
  display: flex;
  align-items: center;
  gap: 2.5rem;
  flex-wrap: wrap;
}
.hero-stat { display: flex; flex-direction: column; gap: 0.35rem; }
.hero-stat-label {
  font-family: var(--font-mono);
  font-size: 0.73rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-dim);
}
.hero-stat-value {
  font-family: var(--font-display);
  font-size: clamp(2.2rem, 5vw, 3.6rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--text);
}
.hero-pos { color: var(--accent); }
.hero-neg { color: var(--red); }
.hero-rule {
  width: 1px;
  height: 3.5rem;
  background: var(--border-mid);
  flex-shrink: 0;
}
/* ── Month hero (inside month section) ── */
.month-hero { padding: 2rem 0 1.5rem; border-bottom: 1px solid var(--border-mid); margin-bottom: 2rem; }
.month-eyebrow { font-family: var(--font-mono); font-size: 0.73rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--text-dim); margin-bottom: 0.35rem; }
.month-heading { font-family: var(--font-display); font-size: clamp(1.8rem, 4vw, 2.6rem); font-weight: 700; letter-spacing: -0.02em; color: var(--text); }
.month-year { color: var(--text-dim); font-weight: 400; }`;
  }

  private static cssMonthStrip(): string {
    return `/* ── Month strip nav ── */
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border-width: 0; }
.month-strip { display: flex; flex-direction: column; gap: 0.4rem; }
.ms-pills { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.ms-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.75rem 0.6rem;
  min-width: 4.5rem;
  border: 1px solid var(--border);
  background: var(--bg-card);
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
}
.ms-pill:hover { border-color: var(--accent-light); background: var(--bg-tinted); }
.ms-pill.ms-active { border-color: var(--accent); background: var(--accent-pale); }
.ms-bar {
  width: 100%;
  height: 2rem;
  display: flex;
  align-items: flex-end;
}
.ms-fill { width: 100%; display: block; min-height: 2px; }
.ms-pos { background: var(--accent); }
.ms-neg { background: var(--red); }
.ms-label {
  font-family: var(--font-mono);
  font-size: 0.73rem;
  color: var(--text-dim);
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.ms-pill.ms-active .ms-label { color: var(--accent); }
.ms-pill-all .ms-bar { justify-content: center; align-items: center; }`;
  }

  private static cssHeadings(): string {
    return `/* ── Section headings ── */
h2 {
  font-family: var(--font-mono);
  font-size: 0.76rem;
  font-weight: 400;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 1.4rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}
section { margin-bottom: 3rem; }`;
  }

  private static cssKpiGrid(): string {
    return `/* ── KPI Grid ── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}
.kpi {
  background: var(--bg-card);
  border: 1px solid var(--border);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.kpi-good    { border-left: 3px solid var(--accent); }
.kpi-warn    { border-left: 3px solid var(--amber); }
.kpi-bad     { border-left: 3px solid var(--red); }
.kpi-neutral { border-left: 3px solid var(--border-mid); }
.kpi-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.kpi-label {
  font-family: var(--font-mono);
  font-size: 0.73rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-dim);
}
.kpi-actions { position: relative; display: flex; align-items: center; flex-shrink: 0; }
.kpi-body { display: flex; align-items: baseline; gap: 0.8rem; flex-wrap: wrap; }
.kpi-value {
  font-family: var(--font-display);
  font-size: 2.4rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--text);
}
.kpi-good .kpi-value { color: var(--accent); }
.kpi-warn .kpi-value { color: var(--amber); }
.kpi-bad  .kpi-value { color: var(--red); }`;
  }

  private static cssKpiDetails(): string {
    return `/* ── KPI badges, context, progress, tooltip ── */
.kpi-badge {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.2rem 0.6rem;
  white-space: nowrap;
  align-self: center;
}
.kpi-badge-good { background: var(--accent-pale); color: var(--accent); border: 1px solid rgba(31,92,68,0.2); }
.kpi-badge-warn { background: var(--amber-pale); color: var(--amber); border: 1px solid rgba(194,124,26,0.25); }
.kpi-badge-bad  { background: var(--red-pale); color: var(--red); border: 1px solid rgba(139,46,46,0.2); }
.kpi-context { font-size: 0.8rem; color: var(--text-dim); line-height: 1.4; }
.kpi-progress {
  height: 4px;
  background: var(--bg-tinted);
  border: 1px solid var(--border);
  position: relative;
  overflow: visible;
  margin-top: 0.1rem;
}
.kpi-prog-fill { position: absolute; top: -1px; left: 0; height: calc(100% + 2px); }
.kpi-prog-good { background: var(--accent); }
.kpi-prog-warn { background: var(--amber); }
.kpi-prog-bad  { background: var(--red); }
.kpi-prog-target {
  position: absolute;
  top: -5px;
  height: calc(100% + 10px);
  width: 2px;
  background: var(--text);
  transform: translateX(-50%);
  opacity: 0.4;
}
.kpi-help {
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 50%;
  border: 1px solid var(--border-mid);
  background: transparent;
  color: var(--text-dim);
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
  transition: border-color 0.12s, color 0.12s;
}
.kpi-help:hover, .kpi-help:focus { border-color: var(--accent); color: var(--accent); outline: none; }
.kpi-tooltip {
  display: none;
  position: absolute;
  bottom: calc(100% + 0.5rem);
  right: 0;
  z-index: 10;
  background: var(--text);
  color: var(--bg);
  font-family: var(--font-body);
  font-size: 0.9rem;
  line-height: 1.5;
  padding: 0.9rem 1.1rem;
  border-radius: 4px;
  min-width: 210px;
  max-width: 260px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.18);
}
.kpi-help:hover + .kpi-tooltip,
.kpi-help:focus + .kpi-tooltip { display: block; }
.kpi-tooltip strong { display: block; margin-bottom: 0.25rem; }
.kpi-tooltip em { opacity: 0.7; }`;
  }

  private static cssAllocationBar(): string {
    return `/* ── Allocation bar ── */
.allocation { margin-top: 0.5rem; }
.alloc-title {
  font-family: var(--font-mono);
  font-size: 0.73rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 0.6rem;
}
.bar-track {
  height: 8px;
  background: var(--bg-tinted);
  border: 1px solid var(--border);
  display: flex;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.bar-inside-label {
  font-size: 0.44rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.85);
}
.bar-needs       { background: var(--text); }
.bar-wants       { background: var(--text-mid); }
.bar-investments { background: var(--accent); }
.bar-legend {
  display: flex;
  gap: 1.5rem;
  margin-top: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.76rem;
  letter-spacing: 0.06em;
}
.legend-needs { color: var(--text-mid); }
.legend-wants { color: var(--text-dim); }
.legend-inv   { color: var(--accent); }`;
  }

  private static cssTables(): string {
    return `/* ── Tables ── */
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.97rem;
}
thead tr { border-bottom: 2px solid var(--text); }
th {
  font-family: var(--font-mono);
  font-size: 0.73rem;
  font-weight: 400;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-dim);
  padding: 0 0 0.75rem;
  text-align: left;
}
td {
  padding: 0.7rem 0;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}
tbody tr:last-child td { border-bottom: none; }
tbody tr:hover td { background: var(--bg-tinted); }
.num {
  text-align: right;
  font-family: var(--font-mono);
  font-size: 0.94rem;
  letter-spacing: 0.02em;
}
th.num { text-align: right; }
.under-budget { color: var(--accent); }
.over-budget  { color: var(--red); }`;
  }

  private static cssInsights(): string {
    return `/* ── Insights ── */
.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}
.insight-card {
  border: 1px solid var(--border);
  background: var(--bg-card);
  padding: 1.25rem 1.5rem;
}
.insight-card h3 {
  font-family: var(--font-mono);
  font-size: 0.73rem;
  font-weight: 400;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 1rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--border);
}
.insight-item {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.95rem;
}
.insight-item:last-child { border-bottom: none; }
.insight-rank {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-dim);
  min-width: 1.2rem;
}
.insight-label {
  flex: 1;
  color: var(--text);
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.insight-date {
  font-family: var(--font-mono);
  font-size: 0.77rem;
  color: var(--text-dim);
}
.insight-value {
  font-family: var(--font-mono);
  font-size: 0.94rem;
  color: var(--text-mid);
  white-space: nowrap;
}`;
  }

  private static cssUncategorized(): string {
    return `/* ── Uncategorized ── */
.uncategorized {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.9rem 1.2rem;
  background: var(--amber-pale);
  border: 1px solid rgba(194,124,26,0.25);
  font-size: 0.95rem;
  margin-bottom: 2rem;
}
.uncat-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--amber);
  flex-shrink: 0;
}
.uncategorized p { color: var(--text-mid); }
.uncategorized strong { color: var(--amber); }`;
  }

  private static cssFooter(): string {
    return `/* ── Footer totals ── */
.footer-totals {
  margin-top: 2rem;
  padding-top: 1.25rem;
  border-top: 2px solid var(--text);
}
.totals-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
}
.total-item {
  flex: 1 1 120px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  border-right: 1px solid var(--border);
}
.total-item:first-child { padding-left: 0; }
.total-item:last-child { border-right: none; }
.total-label {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-dim);
}
.total-value {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.01em;
}
.total-value.positive { color: var(--accent); }
.total-value.negative { color: var(--red); }
.attribution {
  text-align: right;
  font-family: var(--font-mono);
  font-size: 0.73rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--border-mid);
  margin-top: 1rem;
  padding-bottom: 0.5rem;
}`;
  }

  private static cssPre(): string {
    return `/* ── Pre ── */
pre {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  background: var(--bg-tinted);
  border: 1px solid var(--border);
  padding: 1.25rem 1.5rem;
  overflow-x: auto;
  line-height: 1.7;
}`;
  }

  private static cssSavingsChart(): string {
    return `/* ── Savings Rate chart ── */
.sr-section { margin-bottom: 3rem; }
.sr-chart {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.sr-row {
  display: grid;
  grid-template-columns: 4.5rem 1fr 3.5rem;
  align-items: center;
  gap: 0.75rem;
}
.sr-month {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  color: var(--text-dim);
  text-align: right;
}
.sr-track {
  height: 20px;
  background: var(--bg-tinted);
  border: 1px solid var(--border);
  overflow: hidden;
}
@keyframes barGrow {
  from { width: 0; }
  to   { width: var(--bar-pct); }
}
.sr-fill {
  height: 100%;
  animation: barGrow 0.65s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--bar-delay, 0s);
}
.sr-fill.sr-good { background: var(--accent); }
.sr-fill.sr-low  { background: var(--border-mid); }
.sr-val {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  color: var(--accent);
  letter-spacing: 0.02em;
}
.sr-val.sr-val-low { color: var(--text-dim); }
.sr-legend {
  font-family: var(--font-mono);
  font-size: 0.76rem;
  color: var(--text-dim);
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.sr-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
}
.sr-dot.sr-good { background: var(--accent); }
.sr-dot.sr-low  { background: var(--border-mid); }`;
  }

  private static cssTrendPair(): string {
    return `/* ── Trend pair layout ── */
.pair-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}
.freq-chart {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.freq-row {
  display: grid;
  grid-template-columns: 6rem 1fr 7rem;
  align-items: center;
  gap: 0.75rem;
}
.freq-group {
  font-family: var(--font-mono);
  font-size: 0.77rem;
  letter-spacing: 0.1em;
  color: var(--text-mid);
  text-align: right;
}
.freq-track {
  height: 6px;
  background: var(--bg-tinted);
  border: 1px solid var(--border);
  overflow: hidden;
}
.freq-fill { height: 100%; }
.freq-fill.over-budget  { background: var(--red); }
.freq-fill.under-budget { background: var(--accent); }
.freq-count {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  letter-spacing: 0.02em;
}
.freq-count.over-budget  { color: var(--red); }
.freq-count.under-budget { color: var(--accent); }
.mom-list {
  display: flex;
  flex-direction: column;
}
.mom-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.mom-row:last-child { border-bottom: none; }
.mom-month {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-dim);
  min-width: 3.5rem;
  letter-spacing: 0.05em;
}
.mom-net {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.mom-net.under-budget { color: var(--accent); }
.mom-net.over-budget  { color: var(--red); }
.mom-pills { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-left: auto; }
.mom-pill {
  font-family: var(--font-mono);
  font-size: 0.76rem;
  padding: 0.2rem 0.5rem;
  letter-spacing: 0.04em;
}
.pill-positive {
  background: var(--accent-pale);
  color: var(--accent);
  border: 1px solid rgba(31,92,68,0.2);
}
:root[data-theme="dark"] .pill-positive,
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .pill-positive {
  border-color: rgba(232,165,48,0.2);
} }
.pill-negative {
  background: var(--red-pale);
  color: var(--red);
  border: 1px solid rgba(139,46,46,0.2);
}`;
  }

  private static cssBreakdown(): string {
    return `/* ── Monthly breakdown zone ── */
.breakdown-zone { margin-top: 1rem; }
.breakdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1.25rem 0;
  border-top: 2px solid var(--text);
  border-bottom: 1px solid var(--border);
  margin-bottom: 2.5rem;
}
.breakdown-label {
  font-family: var(--font-mono);
  font-size: 0.76rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-dim);
}
.month-section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  padding: 0 2rem 1.5rem;
  margin-bottom: 2rem;
}
.month-section:last-child { margin-bottom: 0; }`;
  }

  private static cssThemeToggle(): string {
    return `/* ── Theme toggle ── */
.theme-toggle {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 200;
  font-family: var(--font-mono);
  font-size: 0.76rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.35rem 0.8rem;
  background: var(--bg-card);
  color: var(--text-dim);
  border: 1px solid var(--border-mid);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.25s;
  outline: none;
  border-radius: 2px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.theme-toggle:hover {
  color: var(--accent);
  border-color: var(--accent);
}`;
  }

  private static cssPrint(): string {
    return `/* ── Print ── */
@media print {
  body { max-width: none; padding: 1.5cm; }
  body::before { display: none; }
  .theme-toggle { display: none; }
  .month-strip { display: none; }
  .month-section { break-inside: avoid; border: none; padding: 0; }
  .sr-fill { animation: none !important; width: var(--bar-pct) !important; }
}`;
  }
}
