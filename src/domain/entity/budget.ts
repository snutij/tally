import { Category } from "./category.js";
import { CategoryGroup } from "../value-object/category-group.js";
import { Money } from "../value-object/money.js";
import { Month } from "../value-object/month.js";

export interface BudgetLine {
  readonly category: Category;
  readonly amount: Money;
}

export class Budget {
  constructor(
    readonly month: Month,
    readonly lines: BudgetLine[],
  ) {}

  totalByGroup(group: CategoryGroup): Money {
    return this.lines
      .filter((line) => line.category.group === group)
      .reduce((sum, line) => sum.add(line.amount), Money.zero());
  }

  total(): Money {
    return this.lines.reduce((sum, line) => sum.add(line.amount), Money.zero());
  }
}
