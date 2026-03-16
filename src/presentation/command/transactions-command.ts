import type { CategorizeTransactions } from "../../application/usecase/categorize-transactions.js";
import { Command } from "commander";
import type { ListTransactions } from "../../application/usecase/list-transactions.js";
import { Month } from "../../domain/value-object/month.js";
import type { Renderer } from "../renderer/renderer.js";
import type { Transaction } from "../../domain/entity/transaction.js";
import { categorizePrompt } from "../prompt/categorize-prompt.js";

function serializeTransaction(txn: Transaction): Record<string, unknown> {
  return {
    amount: txn.amount.toEuros(),
    categoryId: txn.categoryId ?? undefined,
    date: txn.date,
    id: txn.id,
    label: txn.label,
    source: txn.source,
  };
}

export function createTransactionsCommand(
  listTransactions: ListTransactions,
  categorizeTransactions: CategorizeTransactions,
  renderer: Renderer,
): Command {
  const cmd = new Command("transactions").description("List and manage transactions");

  cmd
    .argument("<month>", "Month in YYYY-MM format")
    .description("List transactions for a month")
    .action((monthStr: string) => {
      const month = Month.from(monthStr);
      const transactions = listTransactions.findByMonth(month);
      console.log(renderer.render(transactions.map((txn) => serializeTransaction(txn))));
    });

  cmd
    .command("categorize")
    .argument("<month>", "Month in YYYY-MM format")
    .description("Interactively categorize uncategorized transactions")
    .action(async (monthStr: string) => {
      const month = Month.from(monthStr);
      const { all, uncategorized } = categorizeTransactions.findUncategorized(month);

      if (uncategorized.length === 0) {
        console.log(
          renderer.render({
            message: "All transactions are categorized",
            total: all.length,
          }),
        );
        return;
      }

      const { categorized, interrupted } = await categorizePrompt(uncategorized);

      const updated = categorized.filter((txn) => txn.categoryId);
      categorizeTransactions.saveCategorized(updated);

      if (interrupted) {
        console.log(
          `\nInterrupted — saved ${updated.length} of ${uncategorized.length} uncategorized transactions.`,
        );
      } else {
        console.log(
          renderer.render({
            categorized: updated.length,
            skipped: uncategorized.length - updated.length,
            total: all.length,
          }),
        );
      }
    });

  return cmd;
}
