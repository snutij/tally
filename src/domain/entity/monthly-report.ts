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

export class MonthlyReport {
  private constructor(
    readonly month: Month,
    readonly groups: GroupSummary[],
    readonly categories: CategorySummary[],
    readonly uncategorized: Money,
    readonly totalIncomeBudgeted: Money,
    readonly totalIncomeActual: Money,
    readonly totalExpenseBudgeted: Money,
    readonly totalExpenseActual: Money,
    readonly net: Money,
    readonly transactionCount: number,
    readonly kpis: ReportKpis,
  ) {}

  static compute(budget: Budget, transactions: Transaction[]): MonthlyReport {
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
      const group = txn.categoryId
        ? categoryGroupMap.get(txn.categoryId)
        : undefined;
      const absAmount = Money.fromCents(Math.abs(txn.amount.cents));
      if (group) {
        actualByGroup.set(group, actualByGroup.get(group)!.add(absAmount));
        const prev = actualByCategory.get(txn.categoryId!) ?? Money.zero();
        actualByCategory.set(txn.categoryId!, prev.add(absAmount));
      } else {
        uncategorized = uncategorized.add(absAmount);
        uncategorizedCount++;
      }
    }

    const totalExpenseBudgeted = EXPENSE_GROUPS.reduce(
      (sum, g) => sum.add(budget.totalByGroup(g)),
      Money.zero(),
    );
    const totalExpenseActual = EXPENSE_GROUPS.reduce(
      (sum, g) => sum.add(actualByGroup.get(g)!),
      Money.zero(),
    );
    const totalIncomeBudgeted = budget.totalByGroup(CategoryGroup.INCOME);
    const totalIncomeActual = actualByGroup.get(CategoryGroup.INCOME)!;

    const groups: GroupSummary[] = Object.values(CategoryGroup).map(
      (group) => {
        const budgeted = budget.totalByGroup(group);
        const actual = actualByGroup.get(group)!;
        const isIncome = group === CategoryGroup.INCOME;
        const typeBudgetTotal = isIncome
          ? totalIncomeBudgeted
          : totalExpenseBudgeted;
        const typeActualTotal = isIncome
          ? totalIncomeActual
          : totalExpenseActual;

        return {
          group,
          budgeted,
          actual,
          delta: budgeted.subtract(actual),
          budgetedPercent: typeBudgetTotal.isZero()
            ? 0
            : Math.round(
                (budgeted.cents / typeBudgetTotal.cents) * 10_000,
              ) / 100,
          actualPercent: typeActualTotal.isZero()
            ? 0
            : Math.round((actual.cents / typeActualTotal.cents) * 10_000) /
              100,
        };
      },
    );

    const categories: CategorySummary[] = budget.lines.map((line) => {
      const actual = actualByCategory.get(line.category.id) ?? Money.zero();
      return {
        categoryId: line.category.id,
        categoryName: line.category.name,
        group: line.category.group,
        budgeted: line.amount,
        actual,
        delta: line.amount.subtract(actual),
      };
    });

    const net = transactions.reduce(
      (sum, txn) => sum.add(txn.amount),
      Money.zero(),
    );

    const kpis = computeKpis({
      budget,
      transactions,
      categories,
      actualByGroup,
      actualByCategory,
      totalIncomeActual,
      totalExpenseActual,
      uncategorizedCount,
    });

    return new MonthlyReport(
      budget.month,
      groups,
      categories,
      uncategorized,
      totalIncomeBudgeted,
      totalIncomeActual,
      totalExpenseBudgeted,
      totalExpenseActual,
      net,
      transactions.length,
      kpis,
    );
  }
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
    : pct(
        totalIncomeActual.cents - totalExpenseActual.cents,
        totalIncomeActual.cents,
      );

  const fiftyThirtyTwenty = incomeZero
    ? { needs: null, wants: null, investments: null }
    : {
        needs: pct(
          actualByGroup.get(CategoryGroup.NEEDS)!.cents,
          totalIncomeActual.cents,
        ),
        wants: pct(
          actualByGroup.get(CategoryGroup.WANTS)!.cents,
          totalIncomeActual.cents,
        ),
        investments: pct(
          actualByGroup.get(CategoryGroup.INVESTMENTS)!.cents,
          totalIncomeActual.cents,
        ),
      };

  const expenseLines = budget.lines.filter(
    (l) => l.category.group !== CategoryGroup.INCOME,
  );
  const adherenceRate =
    expenseLines.length === 0
      ? null
      : pct(
          expenseLines.filter((l) => {
            const actual =
              actualByCategory.get(l.category.id) ?? Money.zero();
            return actual.cents <= l.amount.cents;
          }).length,
          expenseLines.length,
        );

  const topSpendingCategories = categories
    .filter((c) => c.group !== CategoryGroup.INCOME)
    .toSorted((a, b) => b.actual.cents - a.actual.cents)
    .slice(0, 5)
    .map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      group: c.group,
      actual: c.actual,
    }));

  const dailyAverageSpending = Money.fromCents(
    Math.round(totalExpenseActual.cents / budget.month.daysInMonth()),
  );

  const largestExpenses = transactions
    .filter((t) => t.amount.isNegative())
    .toSorted((a, b) => a.amount.cents - b.amount.cents)
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      date: t.date,
      label: t.label,
      amount: t.amount,
    }));

  const uncategorizedRatio =
    transactions.length === 0
      ? null
      : pct(uncategorizedCount, transactions.length);

  const expenseCategories = categories.filter(
    (c) => c.group !== CategoryGroup.INCOME,
  );

  const overruns = expenseCategories
    .filter((c) => c.actual.cents > c.budgeted.cents)
    .toSorted(
      (a, b) =>
        b.actual.cents - b.budgeted.cents - (a.actual.cents - a.budgeted.cents),
    )
    .slice(0, 3)
    .map(varianceOf);

  const underruns = expenseCategories
    .filter((c) => c.actual.cents < c.budgeted.cents)
    .toSorted(
      (a, b) =>
        a.actual.cents - a.budgeted.cents - (b.actual.cents - b.budgeted.cents),
    )
    .slice(0, 3)
    .map(varianceOf);

  return {
    savingsRate,
    fiftyThirtyTwenty,
    adherenceRate,
    topSpendingCategories,
    dailyAverageSpending,
    largestExpenses,
    uncategorizedRatio,
    categoryVariance: { overruns, underruns },
  };
}

function pct(n: number, d: number): number {
  return Math.round((n / d) * 10_000) / 100;
}

function varianceOf(c: CategorySummary) {
  return {
    categoryId: c.categoryId,
    categoryName: c.categoryName,
    budgeted: c.budgeted,
    actual: c.actual,
    variance: c.actual.subtract(c.budgeted),
  };
}
