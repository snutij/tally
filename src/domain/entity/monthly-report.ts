import { Budget } from "./budget.js";
import { Transaction } from "./transaction.js";
import { CategoryGroup } from "../value-object/category-group.js";
import { Money } from "../value-object/money.js";
import { Month } from "../value-object/month.js";

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

export class MonthlyReport {
  private constructor(
    readonly month: Month,
    readonly groups: GroupSummary[],
    readonly uncategorized: Money,
    readonly totalIncomeBudgeted: Money,
    readonly totalIncomeActual: Money,
    readonly totalExpenseBudgeted: Money,
    readonly totalExpenseActual: Money,
    readonly net: Money,
    readonly transactionCount: number,
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

    for (const txn of transactions) {
      const group = txn.categoryId
        ? categoryGroupMap.get(txn.categoryId)
        : undefined;
      const absAmount = Money.fromCents(Math.abs(txn.amount.cents));
      if (group) {
        actualByGroup.set(group, actualByGroup.get(group)!.add(absAmount));
      } else {
        uncategorized = uncategorized.add(absAmount);
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
                (budgeted.cents / typeBudgetTotal.cents) * 10000,
              ) / 100,
          actualPercent: typeActualTotal.isZero()
            ? 0
            : Math.round((actual.cents / typeActualTotal.cents) * 10000) /
              100,
        };
      },
    );

    const net = transactions.reduce(
      (sum, txn) => sum.add(txn.amount),
      Money.zero(),
    );

    return new MonthlyReport(
      budget.month,
      groups,
      uncategorized,
      totalIncomeBudgeted,
      totalIncomeActual,
      totalExpenseBudgeted,
      totalExpenseActual,
      net,
      transactions.length,
    );
  }
}
