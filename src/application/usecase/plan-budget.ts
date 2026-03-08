import { Budget } from "../../domain/entity/budget.js";
import { BudgetAlreadyExists } from "../../domain/error/index.js";
import { DEFAULT_CATEGORIES } from "../../domain/default-categories.js";
import { Money } from "../../domain/value-object/money.js";
import { Month } from "../../domain/value-object/month.js";
import { BudgetRepository } from "../gateway/budget-repository.js";

export class PlanBudget {
  constructor(private budgetRepo: BudgetRepository) {}

  initFromDefaults(month: Month): Budget {
    if (this.budgetRepo.exists(month)) {
      throw new BudgetAlreadyExists(month.value);
    }

    const budget = new Budget(
      month,
      DEFAULT_CATEGORIES.map((category) => ({
        category,
        amount: Money.zero(),
      })),
    );

    this.budgetRepo.save(budget);
    return budget;
  }

  get(month: Month): Budget | null {
    return this.budgetRepo.findByMonth(month);
  }
}
