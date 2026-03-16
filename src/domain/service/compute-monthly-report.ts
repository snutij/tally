import type { GroupSummary, MonthlyReport, ReportKpis } from "../read-model/monthly-report.js";
import { CategoryGroup } from "../value-object/category-group.js";
import { DEFAULT_CATEGORIES } from "../default-categories.js";
import { Money } from "../value-object/money.js";
import type { Month } from "../value-object/month.js";
import type { SpendingTargets } from "../config/spending-targets.js";
import type { Transaction } from "../entity/transaction.js";

const EXPENSE_GROUPS: CategoryGroup[] = [
  CategoryGroup.NEEDS,
  CategoryGroup.WANTS,
  CategoryGroup.INVESTMENTS,
];

/** Get value from a pre-initialized map (all keys guaranteed present). */
function mapGet<TK, TV>(map: Map<TK, TV>, key: TK): TV {
  return map.get(key) as TV;
}

function pct(numerator: number, denominator: number): number {
  return Math.round((numerator / denominator) * 10_000) / 100;
}

// Build category→group map from DEFAULT_CATEGORIES (domain knowledge, not budget-derived)
const CATEGORY_GROUP_MAP: ReadonlyMap<string, CategoryGroup> = new Map(
  DEFAULT_CATEGORIES.map((cat) => [cat.id, cat.group]),
);

interface Actuals {
  actualByCategory: Map<string, Money>;
  actualByGroup: Map<CategoryGroup, Money>;
  uncategorized: Money;
  uncategorizedCount: number;
}

function accumulateActuals(transactions: Transaction[]): Actuals {
  const actualByGroup = new Map<CategoryGroup, Money>();
  for (const group of Object.values(CategoryGroup)) {
    actualByGroup.set(group, Money.zero());
  }

  let uncategorized = Money.zero();
  const actualByCategory = new Map<string, Money>();
  let uncategorizedCount = 0;

  for (const txn of transactions) {
    const group = txn.categoryId ? CATEGORY_GROUP_MAP.get(txn.categoryId) : undefined;
    const absAmount = Money.fromCents(Math.abs(txn.amount.cents));
    if (group !== undefined && txn.categoryId) {
      actualByGroup.set(group, mapGet(actualByGroup, group).add(absAmount));
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
  actualByCategory: Map<string, Money>;
  actualByGroup: Map<CategoryGroup, Money>;
  month: Month;
  totalIncomeActual: Money;
  totalExpenseActual: Money;
  transactions: Transaction[];
  uncategorizedCount: number;
}): ReportKpis {
  const {
    actualByCategory,
    actualByGroup,
    month,
    totalIncomeActual,
    totalExpenseActual,
    transactions,
    uncategorizedCount,
  } = ctx;

  const incomeZero = totalIncomeActual.isZero();

  const savingsRate = incomeZero
    ? null // eslint-disable-line unicorn/no-null -- ReportKpis interface contract uses null
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

  const topSpendingCategories = [...actualByCategory.entries()]
    .flatMap(([categoryId, actual]) => {
      const category = DEFAULT_CATEGORIES.find((cat) => cat.id === categoryId);
      if (!category || category.group === CategoryGroup.INCOME) {
        return [];
      }
      return [{ actual, categoryId, categoryName: category.name, group: category.group }];
    })
    .toSorted((ca, cb) => cb.actual.cents - ca.actual.cents)
    .slice(0, 5);

  const dailyAverageSpending = Money.fromCents(
    Math.round(totalExpenseActual.cents / month.daysInMonth()),
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
    // eslint-disable-next-line unicorn/no-null -- ReportKpis interface contract uses null
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
  month: Month,
  targets: SpendingTargets,
  transactions: Transaction[],
): MonthlyReport {
  const { actualByCategory, actualByGroup, uncategorized, uncategorizedCount } =
    accumulateActuals(transactions);

  const totalIncomeActual = mapGet(actualByGroup, CategoryGroup.INCOME);

  let totalExpenseActual = Money.zero();
  for (const grp of EXPENSE_GROUPS) {
    totalExpenseActual = totalExpenseActual.add(mapGet(actualByGroup, grp));
  }

  // Group-level targets: income × percentage
  const targetByGroup = new Map<CategoryGroup, Money>([
    [
      CategoryGroup.NEEDS,
      Money.fromCents(Math.round((totalIncomeActual.cents * targets.needs) / 100)),
    ],
    [
      CategoryGroup.WANTS,
      Money.fromCents(Math.round((totalIncomeActual.cents * targets.wants) / 100)),
    ],
    [
      CategoryGroup.INVESTMENTS,
      Money.fromCents(Math.round((totalIncomeActual.cents * targets.invest) / 100)),
    ],
    [CategoryGroup.INCOME, Money.zero()],
  ]);

  const totalExpenseTarget = mapGet(targetByGroup, CategoryGroup.NEEDS)
    .add(mapGet(targetByGroup, CategoryGroup.WANTS))
    .add(mapGet(targetByGroup, CategoryGroup.INVESTMENTS));

  const targetPctByGroup: ReadonlyMap<CategoryGroup, number> = new Map([
    [CategoryGroup.NEEDS, targets.needs],
    [CategoryGroup.WANTS, targets.wants],
    [CategoryGroup.INVESTMENTS, targets.invest],
    [CategoryGroup.INCOME, 0],
  ]);

  const groups: GroupSummary[] = Object.values(CategoryGroup).map((group) => {
    const budgeted = mapGet(targetByGroup, group);
    const actual = mapGet(actualByGroup, group);
    const isIncome = group === CategoryGroup.INCOME;
    const typeActualTotal = isIncome ? totalIncomeActual : totalExpenseActual;

    return {
      actual,
      actualPercent: typeActualTotal.isZero()
        ? 0
        : Math.round((actual.cents / typeActualTotal.cents) * 10_000) / 100,
      budgeted,
      budgetedPercent: mapGet(targetPctByGroup, group),
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
    month,
    totalExpenseActual,
    totalIncomeActual,
    transactions,
    uncategorizedCount,
  });

  return {
    _type: "MonthlyReport",
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
