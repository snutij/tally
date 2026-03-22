import { CategoryGroup, EXPENSE_GROUPS } from "../value-object/category-group.js";
import type { GroupSummary, MonthlyReport, ReportKpis } from "../read-model/monthly-report.js";
import type { CategoryMapEntry } from "./category-registry.js";
import { Money } from "../value-object/money.js";

import type { SpendingTargets } from "../config/spending-targets.js";
import type { Transaction } from "../entity/transaction.js";

function pct(numerator: number, denominator: number): number {
  return Math.round((numerator / denominator) * 10_000) / 100;
}

interface Actuals {
  actualByCategory: Record<string, Money>;
  actualByGroup: Record<CategoryGroup, Money>;
  uncategorized: Money;
  uncategorizedCount: number;
}

function accumulateActuals(
  transactions: Transaction[],
  categoryMap: ReadonlyMap<string, CategoryMapEntry>,
): Actuals {
  interface Annotated {
    absAmount: Money;
    categoryId: string;
    group: CategoryGroup;
  }

  let uncategorized = Money.zero();
  let uncategorizedCount = 0;

  const annotated = transactions.flatMap((txn): Annotated[] => {
    const group = txn.categoryId ? categoryMap.get(txn.categoryId)?.group : undefined;
    const absAmount = Money.fromCents(Math.abs(txn.amount.cents));
    if (group === undefined || !txn.categoryId) {
      uncategorized = uncategorized.add(absAmount);
      uncategorizedCount += 1;
      return [];
    }
    return [{ absAmount, categoryId: txn.categoryId, group }];
  });

  const byGroup = Object.groupBy(annotated, (item) => item.group);
  const byCategory = Object.groupBy(annotated, (item) => item.categoryId);

  const actualByGroup: Record<CategoryGroup, Money> = Object.fromEntries(
    Object.values(CategoryGroup).map((group) => {
      let total = Money.zero();
      for (const item of byGroup[group] ?? []) {
        total = total.add(item.absAmount);
      }
      return [group, total];
    }),
  ) as Record<CategoryGroup, Money>;

  const actualByCategory: Record<string, Money> = Object.fromEntries(
    Object.entries(byCategory).map(([categoryId, items]) => {
      let total = Money.zero();
      for (const item of items ?? []) {
        total = total.add(item.absAmount);
      }
      return [categoryId, total];
    }),
  );

  return { actualByCategory, actualByGroup, uncategorized, uncategorizedCount };
}

function computeKpis(ctx: {
  actualByCategory: Record<string, Money>;
  actualByGroup: Record<CategoryGroup, Money>;
  categoryMap: ReadonlyMap<string, CategoryMapEntry>;
  month: Temporal.PlainYearMonth;
  totalExpenseActual: Money;
  totalIncomeActual: Money;
  transactions: Transaction[];
  uncategorizedCount: number;
}): ReportKpis {
  const {
    actualByCategory,
    actualByGroup,
    categoryMap,
    month,
    totalExpenseActual,
    totalIncomeActual,
    transactions,
    uncategorizedCount,
  } = ctx;

  const incomeZero = totalIncomeActual.isZero();

  const savingsRate = incomeZero
    ? null
    : pct(totalIncomeActual.cents - totalExpenseActual.cents, totalIncomeActual.cents);

  const fiftyThirtyTwenty = incomeZero
    ? { investments: null, needs: null, wants: null }
    : {
        investments: pct(actualByGroup[CategoryGroup.INVESTMENTS].cents, totalIncomeActual.cents),
        needs: pct(actualByGroup[CategoryGroup.NEEDS].cents, totalIncomeActual.cents),
        wants: pct(actualByGroup[CategoryGroup.WANTS].cents, totalIncomeActual.cents),
      };

  const topSpendingCategories = Object.entries(actualByCategory)
    .flatMap(([categoryId, actual]) => {
      const entry = categoryMap.get(categoryId);
      if (!entry || entry.group === CategoryGroup.INCOME) {
        return [];
      }
      return [{ actual, categoryId, categoryName: entry.name, group: entry.group }];
    })
    .toSorted((ca, cb) => cb.actual.cents - ca.actual.cents)
    .slice(0, 5);

  const dailyAverageSpending = Money.fromCents(
    Math.round(totalExpenseActual.cents / month.daysInMonth),
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
    transactions.length === 0 ? null : pct(uncategorizedCount, transactions.length);

  return {
    dailyAverageSpending,
    fiftyThirtyTwenty,
    largestExpenses,
    savingsRate,
    topSpendingCategories,
    uncategorizedRatio,
  };
}

export function computeMonthlyReport(
  month: Temporal.PlainYearMonth,
  targets: SpendingTargets,
  transactions: Transaction[],
  categoryMap: ReadonlyMap<string, CategoryMapEntry>,
): MonthlyReport {
  const { actualByCategory, actualByGroup, uncategorized, uncategorizedCount } = accumulateActuals(
    transactions,
    categoryMap,
  );

  const totalIncomeActual = actualByGroup[CategoryGroup.INCOME];

  let totalExpenseActual = Money.zero();
  for (const grp of EXPENSE_GROUPS) {
    totalExpenseActual = totalExpenseActual.add(actualByGroup[grp]);
  }

  const targetByGroup: Record<CategoryGroup, Money> = {
    [CategoryGroup.INCOME]: Money.zero(),
    [CategoryGroup.INVESTMENTS]: Money.fromCents(
      Math.round((totalIncomeActual.cents * targets.invest) / 100),
    ),
    [CategoryGroup.NEEDS]: Money.fromCents(
      Math.round((totalIncomeActual.cents * targets.needs) / 100),
    ),
    [CategoryGroup.WANTS]: Money.fromCents(
      Math.round((totalIncomeActual.cents * targets.wants) / 100),
    ),
  };

  const totalExpenseTarget = targetByGroup[CategoryGroup.NEEDS]
    .add(targetByGroup[CategoryGroup.WANTS])
    .add(targetByGroup[CategoryGroup.INVESTMENTS]);

  const targetPctByGroup: Record<CategoryGroup, number> = {
    [CategoryGroup.INCOME]: 0,
    [CategoryGroup.INVESTMENTS]: targets.invest,
    [CategoryGroup.NEEDS]: targets.needs,
    [CategoryGroup.WANTS]: targets.wants,
  };

  const groups: GroupSummary[] = Object.values(CategoryGroup).map((group) => {
    const budgeted = targetByGroup[group];
    const actual = actualByGroup[group];
    const isIncome = group === CategoryGroup.INCOME;
    const typeActualTotal = isIncome ? totalIncomeActual : totalExpenseActual;

    return {
      actual,
      actualPercent: typeActualTotal.isZero()
        ? 0
        : Math.round((actual.cents / typeActualTotal.cents) * 10_000) / 100,
      budgeted,
      budgetedPercent: targetPctByGroup[group],
      delta: budgeted.subtract(actual),
      group,
    };
  });

  let net = Money.zero();
  for (const txn of transactions) {
    net = net.add(txn.amount);
  }

  const kpis = computeKpis({
    actualByCategory,
    actualByGroup,
    categoryMap,
    month,
    totalExpenseActual,
    totalIncomeActual,
    transactions,
    uncategorizedCount,
  });

  return {
    groups,
    kpis,
    month,
    net,
    totalExpenseActual,
    totalExpenseTarget,
    totalIncomeActual,
    transactionCount: transactions.length,
    uncategorized,
  };
}
