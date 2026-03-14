import type { Category } from "./category.js";
import type { CategoryGroup } from "../value-object/category-group.js";
import { Money } from "../value-object/money.js";
import type { Month } from "../value-object/month.js";

export interface BudgetLine {
  readonly category: Category;
  readonly amount: Money;
}

export class Budget {
  readonly month: Month;
  readonly lines: BudgetLine[];

  constructor(month: Month, lines: BudgetLine[]) {
    this.month = month;
    this.lines = lines;
  }

  totalByGroup(group: CategoryGroup): Money {
    let sum = Money.zero();
    for (const line of this.lines) {
      if (line.category.group === group) {
        sum = sum.add(line.amount);
      }
    }
    return sum;
  }

  total(): Money {
    let sum = Money.zero();
    for (const line of this.lines) {
      sum = sum.add(line.amount);
    }
    return sum;
  }
}
