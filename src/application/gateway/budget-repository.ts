import type { Budget } from "../../domain/entity/budget.js";
import type { Month } from "../../domain/value-object/month.js";

export interface BudgetRepository {
  save(budget: Budget): void;
  findByMonth(month: Month): Budget | null;
  exists(month: Month): boolean;
}
