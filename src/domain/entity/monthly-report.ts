import { CategoryGroup } from "../value-object/category-group.js";
import { CategoryId } from "../value-object/category-id.js";
import { DEFAULT_CATEGORIES } from "../default-categories.js";
import type { DateOnly } from "../value-object/date-only.js";
import { Money } from "../value-object/money.js";
import type { Month } from "../value-object/month.js";
import type { SpendingTargets } from "../config/spending-targets.js";
import type { Transaction } from "./transaction.js";
import type { TransactionId } from "../value-object/transaction-id.js";

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
  /** For expense groups: the target percentage (50/30/20). For income: 0. */
  readonly budgetedPercent: number;
  readonly actualPercent: number;
}

export interface TopSpendingEntry {
  readonly categoryId: CategoryId;
  readonly categoryName: string;
  readonly group: CategoryGroup;
  readonly actual: Money;
}

export interface LargestExpenseEntry {
  readonly id: TransactionId;
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
  readonly topSpendingCategories: TopSpendingEntry[];
  readonly dailyAverageSpending: Money;
  readonly largestExpenses: LargestExpenseEntry[];
  readonly uncategorizedRatio: number | null;
}

interface MonthlyReportData {
  readonly groups: GroupSummary[];
  readonly kpis: ReportKpis;
  readonly month: Month;
  readonly net: Money;
  readonly totalExpenseActual: Money;
  readonly totalExpenseTarget: Money;
  readonly totalIncomeActual: Money;
  readonly transactionCount: number;
  readonly uncategorized: Money;
}

// ── Helper functions ──────────────────────────────────────

function pct(numerator: number, denominator: number): number {
  return Math.round((numerator / denominator) * 10_000) / 100;
}

// Build category→group map from DEFAULT_CATEGORIES (domain knowledge, not budget-derived)
const CATEGORY_GROUP_MAP: ReadonlyMap<string, CategoryGroup> = new Map(
  DEFAULT_CATEGORIES.map((cat) => [cat.id.value, cat.group]),
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
    const group = txn.categoryId ? CATEGORY_GROUP_MAP.get(txn.categoryId.value) : undefined;
    const absAmount = Money.fromCents(Math.abs(txn.amount.cents));
    if (group !== undefined && txn.categoryId) {
      actualByGroup.set(group, mapGet(actualByGroup, group).add(absAmount));
      const prev = actualByCategory.get(txn.categoryId.value) ?? Money.zero();
      actualByCategory.set(txn.categoryId.value, prev.add(absAmount));
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
      const category = DEFAULT_CATEGORIES.find((cat) => cat.id.value === categoryId);
      if (!category || category.group === CategoryGroup.INCOME) {
        return [];
      }
      return [
        {
          actual,
          categoryId: CategoryId.from(categoryId),
          categoryName: category.name,
          group: category.group,
        },
      ];
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

// ── Main class ────────────────────────────────────────────

export class MonthlyReport {
  readonly groups: GroupSummary[];
  readonly kpis: ReportKpis;
  readonly month: Month;
  readonly net: Money;
  readonly totalExpenseActual: Money;
  readonly totalExpenseTarget: Money;
  readonly totalIncomeActual: Money;
  readonly transactionCount: number;
  readonly uncategorized: Money;

  private constructor(data: MonthlyReportData) {
    this.groups = data.groups;
    this.kpis = data.kpis;
    this.month = data.month;
    this.net = data.net;
    this.totalExpenseActual = data.totalExpenseActual;
    this.totalExpenseTarget = data.totalExpenseTarget;
    this.totalIncomeActual = data.totalIncomeActual;
    this.transactionCount = data.transactionCount;
    this.uncategorized = data.uncategorized;
  }

  static compute(
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

    const targetPctByGroup = new Map<CategoryGroup, number>([
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

    return new MonthlyReport({
      groups,
      kpis,
      month,
      net,
      totalExpenseActual,
      totalExpenseTarget,
      totalIncomeActual,
      transactionCount: transactions.length,
      uncategorized,
    });
  }
}
