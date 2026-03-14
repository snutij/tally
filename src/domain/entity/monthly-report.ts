import type { Budget } from "./budget.js";
import { CategoryGroup } from "../value-object/category-group.js";
import type { DateOnly } from "../value-object/date-only.js";
import { Money } from "../value-object/money.js";
import type { Month } from "../value-object/month.js";
import type { Transaction } from "./transaction.js";

const EXPENSE_GROUPS: CategoryGroup[] = [
  CategoryGroup.NEEDS,
  CategoryGroup.WANTS,
  CategoryGroup.INVESTMENTS,
];

/** Get value from a pre-initialized map (all keys guaranteed present). */
function mapGet<TK, TV>(map: Map<TK, TV>, key: TK): TV {
  return map.get(key) as TV;
}

export interface GroupSummary {
  readonly group: CategoryGroup;
  readonly budgeted: Money;
  readonly actual: Money;
  readonly delta: Money;
  readonly budgetedPercent: number;
  readonly actualPercent: number;
}

export interface CategorySummary {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly group: CategoryGroup;
  readonly budgeted: Money;
  readonly actual: Money;
  readonly delta: Money;
}

export interface CategoryVarianceEntry {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly budgeted: Money;
  readonly actual: Money;
  readonly variance: Money;
}

export interface TopSpendingEntry {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly group: CategoryGroup;
  readonly actual: Money;
}

export interface LargestExpenseEntry {
  readonly id: string;
  readonly date: DateOnly;
  readonly label: string;
  readonly amount: Money;
}

export interface ReportKpis {
  readonly savingsRate: number | null;
  readonly fiftyThirtyTwenty: {
    readonly needs: number | null;
    readonly wants: number | null;
    readonly investments: number | null;
  };
  readonly adherenceRate: number | null;
  readonly topSpendingCategories: TopSpendingEntry[];
  readonly dailyAverageSpending: Money;
  readonly largestExpenses: LargestExpenseEntry[];
  readonly uncategorizedRatio: number | null;
  readonly categoryVariance: {
    readonly overruns: CategoryVarianceEntry[];
    readonly underruns: CategoryVarianceEntry[];
  };
}

interface MonthlyReportData {
  readonly categories: CategorySummary[];
  readonly groups: GroupSummary[];
  readonly kpis: ReportKpis;
  readonly month: Month;
  readonly net: Money;
  readonly totalExpenseActual: Money;
  readonly totalExpenseBudgeted: Money;
  readonly totalIncomeActual: Money;
  readonly totalIncomeBudgeted: Money;
  readonly transactionCount: number;
  readonly uncategorized: Money;
}

// ── Helper functions (declared before use) ─────────────────

function pct(numerator: number, denominator: number): number {
  return Math.round((numerator / denominator) * 10_000) / 100;
}

function varianceOf(cat: CategorySummary): CategoryVarianceEntry {
  return {
    actual: cat.actual,
    budgeted: cat.budgeted,
    categoryId: cat.categoryId,
    categoryName: cat.categoryName,
    variance: cat.actual.subtract(cat.budgeted),
  };
}

interface Actuals {
  actualByCategory: Map<string, Money>;
  actualByGroup: Map<CategoryGroup, Money>;
  uncategorized: Money;
  uncategorizedCount: number;
}

function accumulateActuals(budget: Budget, transactions: Transaction[]): Actuals {
  const actualByGroup = new Map<CategoryGroup, Money>();
  for (const group of Object.values(CategoryGroup)) {
    actualByGroup.set(group, Money.zero());
  }

  const categoryGroupMap = new Map<string, CategoryGroup>();
  for (const line of budget.lines) {
    categoryGroupMap.set(line.category.id, line.category.group);
  }

  let uncategorized = Money.zero();
  const actualByCategory = new Map<string, Money>();
  let uncategorizedCount = 0;

  for (const txn of transactions) {
    const group = txn.categoryId ? categoryGroupMap.get(txn.categoryId) : undefined;
    const absAmount = Money.fromCents(Math.abs(txn.amount.cents));
    if (group && txn.categoryId) {
      const current = mapGet(actualByGroup, group);
      actualByGroup.set(group, current.add(absAmount));
      const prev = actualByCategory.get(txn.categoryId) ?? Money.zero();
      actualByCategory.set(txn.categoryId, prev.add(absAmount));
    } else {
      uncategorized = uncategorized.add(absAmount);
      uncategorizedCount += 1;
    }
  }

  return { actualByCategory, actualByGroup, uncategorized, uncategorizedCount };
}

function computeCategoryVariance(categories: CategorySummary[]): {
  overruns: CategoryVarianceEntry[];
  underruns: CategoryVarianceEntry[];
} {
  const expenseCategories = categories.filter((cat) => cat.group !== CategoryGroup.INCOME);

  const overruns = expenseCategories
    .filter((cat) => cat.actual.cents > cat.budgeted.cents)
    .toSorted(
      (ca, cb) => cb.actual.cents - cb.budgeted.cents - (ca.actual.cents - ca.budgeted.cents),
    )
    .slice(0, 3)
    .map((cat) => varianceOf(cat));

  const underruns = expenseCategories
    .filter((cat) => cat.actual.cents < cat.budgeted.cents)
    .toSorted(
      (ca, cb) => ca.actual.cents - ca.budgeted.cents - (cb.actual.cents - cb.budgeted.cents),
    )
    .slice(0, 3)
    .map((cat) => varianceOf(cat));

  return { overruns, underruns };
}

function computeKpis(ctx: {
  budget: Budget;
  transactions: Transaction[];
  categories: CategorySummary[];
  actualByGroup: Map<CategoryGroup, Money>;
  actualByCategory: Map<string, Money>;
  totalIncomeActual: Money;
  totalExpenseActual: Money;
  uncategorizedCount: number;
}): ReportKpis {
  const {
    budget,
    transactions,
    categories,
    actualByGroup,
    actualByCategory,
    totalIncomeActual,
    totalExpenseActual,
    uncategorizedCount,
  } = ctx;

  const incomeZero = totalIncomeActual.isZero();

  const savingsRate = incomeZero
    ? null // eslint-disable-line unicorn/no-null -- ReportKpis interface contract uses null for absent ratios
    : pct(totalIncomeActual.cents - totalExpenseActual.cents, totalIncomeActual.cents);

  const fiftyThirtyTwenty = incomeZero
    ? { investments: null, needs: null, wants: null } // eslint-disable-line unicorn/no-null -- ReportKpis interface contract uses null
    : {
        investments: pct(
          mapGet(actualByGroup, CategoryGroup.INVESTMENTS).cents,
          totalIncomeActual.cents,
        ),
        needs: pct(mapGet(actualByGroup, CategoryGroup.NEEDS).cents, totalIncomeActual.cents),
        wants: pct(mapGet(actualByGroup, CategoryGroup.WANTS).cents, totalIncomeActual.cents),
      };

  const expenseLines = budget.lines.filter((ln) => ln.category.group !== CategoryGroup.INCOME);
  const adherenceRate =
    expenseLines.length === 0
      ? null // eslint-disable-line unicorn/no-null -- ReportKpis interface contract uses null for absent ratios
      : pct(
          expenseLines.filter((ln) => {
            const actual = actualByCategory.get(ln.category.id) ?? Money.zero();
            return actual.cents <= ln.amount.cents;
          }).length,
          expenseLines.length,
        );

  const topSpendingCategories = categories
    .filter((cat) => cat.group !== CategoryGroup.INCOME)
    .toSorted((ca, cb) => cb.actual.cents - ca.actual.cents)
    .slice(0, 5)
    .map((cat) => ({
      actual: cat.actual,
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
      group: cat.group,
    }));

  const dailyAverageSpending = Money.fromCents(
    Math.round(totalExpenseActual.cents / budget.month.daysInMonth()),
  );

  const largestExpenses = transactions
    .filter((txn) => txn.amount.isNegative())
    .toSorted((ta, tb) => ta.amount.cents - tb.amount.cents)
    .slice(0, 5)
    .map((txn) => ({
      amount: txn.amount,
      date: txn.date,
      id: txn.id,
      label: txn.label,
    }));

  const uncategorizedRatio =
    // eslint-disable-next-line unicorn/no-null -- ReportKpis interface contract uses null for absent ratios
    transactions.length === 0 ? null : pct(uncategorizedCount, transactions.length);

  const categoryVariance = computeCategoryVariance(categories);

  return {
    adherenceRate,
    categoryVariance,
    dailyAverageSpending,
    fiftyThirtyTwenty,
    largestExpenses,
    savingsRate,
    topSpendingCategories,
    uncategorizedRatio,
  };
}

// ── Main class ─────────────────────────────────────────────

export class MonthlyReport {
  readonly categories: CategorySummary[];
  readonly groups: GroupSummary[];
  readonly kpis: ReportKpis;
  readonly month: Month;
  readonly net: Money;
  readonly totalExpenseActual: Money;
  readonly totalExpenseBudgeted: Money;
  readonly totalIncomeActual: Money;
  readonly totalIncomeBudgeted: Money;
  readonly transactionCount: number;
  readonly uncategorized: Money;

  private constructor(data: MonthlyReportData) {
    this.categories = data.categories;
    this.groups = data.groups;
    this.kpis = data.kpis;
    this.month = data.month;
    this.net = data.net;
    this.totalExpenseActual = data.totalExpenseActual;
    this.totalExpenseBudgeted = data.totalExpenseBudgeted;
    this.totalIncomeActual = data.totalIncomeActual;
    this.totalIncomeBudgeted = data.totalIncomeBudgeted;
    this.transactionCount = data.transactionCount;
    this.uncategorized = data.uncategorized;
  }

  static compute(budget: Budget, transactions: Transaction[]): MonthlyReport {
    const { actualByCategory, actualByGroup, uncategorized, uncategorizedCount } =
      accumulateActuals(budget, transactions);

    let totalExpenseBudgeted = Money.zero();
    for (const grp of EXPENSE_GROUPS) {
      totalExpenseBudgeted = totalExpenseBudgeted.add(budget.totalByGroup(grp));
    }
    let totalExpenseActual = Money.zero();
    for (const grp of EXPENSE_GROUPS) {
      totalExpenseActual = totalExpenseActual.add(mapGet(actualByGroup, grp));
    }
    const totalIncomeBudgeted = budget.totalByGroup(CategoryGroup.INCOME);
    const totalIncomeActual = mapGet(actualByGroup, CategoryGroup.INCOME);

    const groups: GroupSummary[] = Object.values(CategoryGroup).map((group) => {
      const budgeted = budget.totalByGroup(group);
      const actual = mapGet(actualByGroup, group);
      const isIncome = group === CategoryGroup.INCOME;
      const typeBudgetTotal = isIncome ? totalIncomeBudgeted : totalExpenseBudgeted;
      const typeActualTotal = isIncome ? totalIncomeActual : totalExpenseActual;

      return {
        actual,
        actualPercent: typeActualTotal.isZero()
          ? 0
          : Math.round((actual.cents / typeActualTotal.cents) * 10_000) / 100,
        budgeted,
        budgetedPercent: typeBudgetTotal.isZero()
          ? 0
          : Math.round((budgeted.cents / typeBudgetTotal.cents) * 10_000) / 100,
        delta: budgeted.subtract(actual),
        group,
      };
    });

    const categories: CategorySummary[] = budget.lines.map((line) => {
      const actual = actualByCategory.get(line.category.id) ?? Money.zero();
      return {
        actual,
        budgeted: line.amount,
        categoryId: line.category.id,
        categoryName: line.category.name,
        delta: line.amount.subtract(actual),
        group: line.category.group,
      };
    });

    let net = Money.zero();
    for (const txn of transactions) {
      net = net.add(txn.amount);
    }

    const kpis = computeKpis({
      actualByCategory,
      actualByGroup,
      budget,
      categories,
      totalExpenseActual,
      totalIncomeActual,
      transactions,
      uncategorizedCount,
    });

    return new MonthlyReport({
      categories,
      groups,
      kpis,
      month: budget.month,
      net,
      totalExpenseActual,
      totalExpenseBudgeted,
      totalIncomeActual,
      totalIncomeBudgeted,
      transactionCount: transactions.length,
      uncategorized,
    });
  }
}
