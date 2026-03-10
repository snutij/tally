import type { Budget } from "./budget.js";
import type { Transaction } from "./transaction.js";
import { CategoryGroup } from "../value-object/category-group.js";
import type { DateOnly } from "../value-object/date-only.js";
import { Money } from "../value-object/money.js";
import type { Month } from "../value-object/month.js";

const EXPENSE_GROUPS: CategoryGroup[] = [
  CategoryGroup.NEEDS,
  CategoryGroup.WANTS,
  CategoryGroup.INVESTMENTS,
];

/** Get value from a pre-initialized map (all keys guaranteed present). */
function mapGet<K, V>(map: Map<K, V>, key: K): V {
  return map.get(key) as V;
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

    const totalExpenseBudgeted = EXPENSE_GROUPS.reduce(
      (sum, g) => sum.add(budget.totalByGroup(g)),
      Money.zero(),
    );
    const totalExpenseActual = EXPENSE_GROUPS.reduce(
      (sum, g) => sum.add(mapGet(actualByGroup, g)),
      Money.zero(),
    );
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

    const net = transactions.reduce((sum, txn) => sum.add(txn.amount), Money.zero());

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
    ? null
    : pct(totalIncomeActual.cents - totalExpenseActual.cents, totalIncomeActual.cents);

  const fiftyThirtyTwenty = incomeZero
    ? { investments: null, needs: null, wants: null }
    : {
        investments: pct(
          mapGet(actualByGroup, CategoryGroup.INVESTMENTS).cents,
          totalIncomeActual.cents,
        ),
        needs: pct(mapGet(actualByGroup, CategoryGroup.NEEDS).cents, totalIncomeActual.cents),
        wants: pct(mapGet(actualByGroup, CategoryGroup.WANTS).cents, totalIncomeActual.cents),
      };

  const expenseLines = budget.lines.filter((l) => l.category.group !== CategoryGroup.INCOME);
  const adherenceRate =
    expenseLines.length === 0
      ? null
      : pct(
          expenseLines.filter((l) => {
            const actual = actualByCategory.get(l.category.id) ?? Money.zero();
            return actual.cents <= l.amount.cents;
          }).length,
          expenseLines.length,
        );

  const topSpendingCategories = categories
    .filter((c) => c.group !== CategoryGroup.INCOME)
    .toSorted((a, b) => b.actual.cents - a.actual.cents)
    .slice(0, 5)
    .map((c) => ({
      actual: c.actual,
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      group: c.group,
    }));

  const dailyAverageSpending = Money.fromCents(
    Math.round(totalExpenseActual.cents / budget.month.daysInMonth()),
  );

  const largestExpenses = transactions
    .filter((t) => t.amount.isNegative())
    .toSorted((a, b) => a.amount.cents - b.amount.cents)
    .slice(0, 5)
    .map((t) => ({
      amount: t.amount,
      date: t.date,
      id: t.id,
      label: t.label,
    }));

  const uncategorizedRatio =
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

function computeCategoryVariance(categories: CategorySummary[]): {
  overruns: CategoryVarianceEntry[];
  underruns: CategoryVarianceEntry[];
} {
  const expenseCategories = categories.filter((c) => c.group !== CategoryGroup.INCOME);

  const overruns = expenseCategories
    .filter((c) => c.actual.cents > c.budgeted.cents)
    .toSorted((a, b) => b.actual.cents - b.budgeted.cents - (a.actual.cents - a.budgeted.cents))
    .slice(0, 3)
    .map(varianceOf);

  const underruns = expenseCategories
    .filter((c) => c.actual.cents < c.budgeted.cents)
    .toSorted((a, b) => a.actual.cents - a.budgeted.cents - (b.actual.cents - b.budgeted.cents))
    .slice(0, 3)
    .map(varianceOf);

  return { overruns, underruns };
}

function pct(n: number, d: number): number {
  return Math.round((n / d) * 10_000) / 100;
}

function varianceOf(c: CategorySummary): CategoryVarianceEntry {
  return {
    actual: c.actual,
    budgeted: c.budgeted,
    categoryId: c.categoryId,
    categoryName: c.categoryName,
    variance: c.actual.subtract(c.budgeted),
  };
}
