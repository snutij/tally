import { Budget } from "../../domain/entity/budget.js";
import { Month } from "../../domain/value-object/month.js";

export interface BudgetRepository {
  save(budget: Budget): void;
  findByMonth(month: Month): Budget | null;
  exists(month: Month): boolean;
}
