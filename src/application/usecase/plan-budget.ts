import { Budget } from "../../domain/entity/budget.js";
import { BudgetAlreadyExists } from "../../domain/error/index.js";
import type { BudgetRepository } from "../gateway/budget-repository.js";
import { DEFAULT_CATEGORIES } from "../../domain/default-categories.js";
import { Money } from "../../domain/value-object/money.js";
import type { Month } from "../../domain/value-object/month.js";

export class PlanBudget {
  private budgetRepo: BudgetRepository;

  constructor(budgetRepo: BudgetRepository) {
    this.budgetRepo = budgetRepo;
  }

  initFromDefaults(month: Month): Budget {
    if (this.budgetRepo.exists(month)) {
      throw new BudgetAlreadyExists(month.value);
    }

    const budget = new Budget(
      month,
      DEFAULT_CATEGORIES.map((category) => ({
        amount: Money.zero(),
        category,
      })),
    );

    this.budgetRepo.save(budget);
    return budget;
  }

  get(month: Month): Budget | null {
    return this.budgetRepo.findByMonth(month);
  }
}
