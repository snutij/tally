import { Budget } from "./budget.js";
import { Transaction } from "./transaction.js";
import { CategoryGroup } from "../value-object/category-group.js";
import { Money } from "../value-object/money.js";
import { Month } from "../value-object/month.js";
import { DEFAULT_CATEGORIES } from "../default-categories.js";

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
    readonly totalBudgeted: Money,
    readonly totalActual: Money,
    readonly totalDelta: Money,
    readonly transactionCount: number,
  ) {}

  static compute(budget: Budget, transactions: Transaction[]): MonthlyReport {
    const actualByGroup = new Map<CategoryGroup, Money>();

    for (const group of Object.values(CategoryGroup)) {
      actualByGroup.set(group, Money.zero());
    }

    const categoryGroupMap = new Map<string, CategoryGroup>();
    for (const cat of DEFAULT_CATEGORIES) {
      categoryGroupMap.set(cat.id, cat.group);
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

    const totalBudgeted = budget.total();
    const categorizedActual = [...actualByGroup.values()].reduce(
      (sum, m) => sum.add(m),
      Money.zero(),
    );
    const totalActual = categorizedActual.add(uncategorized);

    const groups: GroupSummary[] = Object.values(CategoryGroup).map(
      (group) => {
        const budgeted = budget.totalByGroup(group);
        const actual = actualByGroup.get(group)!;
        return {
          group,
          budgeted,
          actual,
          delta: budgeted.subtract(actual),
          budgetedPercent: totalBudgeted.isZero()
            ? 0
            : Math.round((budgeted.cents / totalBudgeted.cents) * 10000) / 100,
          actualPercent: totalActual.isZero()
            ? 0
            : Math.round((actual.cents / totalActual.cents) * 10000) / 100,
        };
      },
    );

    return new MonthlyReport(
      budget.month,
      groups,
      uncategorized,
      totalBudgeted,
      totalActual,
      totalBudgeted.subtract(totalActual),
      transactions.length,
    );
  }
}
