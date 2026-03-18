import type { CategoryChoiceGroup } from "../../application/category-choices.js";
import { Command } from "commander";
import type { FindUncategorizedTransactions } from "../../application/usecase/find-uncategorized-transactions.js";
import type { ListTransactions } from "../../application/usecase/list-transactions.js";
import type { Renderer } from "../renderer/renderer.js";
import type { SaveCategorizedTransactions } from "../../application/usecase/save-categorized-transactions.js";
import { categorizePrompt } from "../prompt/categorize-prompt.js";

export function createTransactionsCommand(
  listTransactions: ListTransactions,
  findUncategorizedTransactions: FindUncategorizedTransactions,
  saveCategorizedTransactions: SaveCategorizedTransactions,
  renderer: Renderer,
  choiceGroups: CategoryChoiceGroup[],
): Command {
  const cmd = new Command("transactions").description("List and manage transactions");

  cmd
    .argument("<month>", "Month in YYYY-MM format")
    .description("List transactions for a month")
    .action((monthStr: string) => {
      const transactions = listTransactions.execute(monthStr);
      console.log(renderer.render(transactions));
    });

  cmd
    .command("categorize")
    .argument("<month>", "Month in YYYY-MM format")
    .description("Interactively categorize uncategorized transactions")
    .action(async (monthStr: string) => {
      const { all, uncategorized } = findUncategorizedTransactions.execute(monthStr);

      if (uncategorized.length === 0) {
        console.log(
          renderer.render({
            message: "All transactions are categorized",
            total: all.length,
          }),
        );
        return;
      }

      const { categorized, interrupted } = await categorizePrompt(uncategorized, choiceGroups);

      const assignments = categorized
        .filter((txn) => txn.categoryId !== null)
        .map((txn) => ({ categoryId: txn.categoryId as string, id: txn.id }));

      if (assignments.length > 0) {
        saveCategorizedTransactions.execute(assignments);
      }

      if (interrupted) {
        console.log(
          `\nInterrupted — saved ${assignments.length} of ${uncategorized.length} uncategorized transactions.`,
        );
      } else {
        console.log(
          renderer.render({
            categorized: assignments.length,
            skipped: uncategorized.length - assignments.length,
            total: all.length,
          }),
        );
      }
    });

  return cmd;
}
