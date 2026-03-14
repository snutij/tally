import { Command } from "commander";
import { Month } from "../../domain/value-object/month.js";
import type { PlanBudget } from "../../application/usecase/plan-budget.js";
import type { Renderer } from "../renderer/renderer.js";

export function createBudgetCommand(planBudget: PlanBudget, renderer: Renderer): Command {
  const budget = new Command("budget").description("Manage monthly budgets");

  budget
    .command("init")
    .argument("<month>", "Month in YYYY-MM format")
    .description("Create a budget from default categories")
    .action((monthStr: string) => {
      const month = Month.from(monthStr);
      const result = planBudget.initFromDefaults(month);
      console.log(renderer.render(result));
    });

  budget
    .command("show")
    .argument("<month>", "Month in YYYY-MM format")
    .description("Display a budget")
    .action((monthStr: string) => {
      const month = Month.from(monthStr);
      const result = planBudget.get(month);
      if (!result) {
        console.error(`No budget found for ${monthStr}`);
        process.exitCode = 1;
        return;
      }
      console.log(renderer.render(result));
    });

  return budget;
}
