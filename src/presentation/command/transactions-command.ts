import { Command } from "commander";
import type { Transaction } from "../../domain/entity/transaction.js";
import type { TransactionRepository } from "../../application/gateway/transaction-repository.js";
import { Month } from "../../domain/value-object/month.js";
import type { Renderer } from "../renderer/renderer.js";
import { categorizePrompt } from "../prompt/categorize-prompt.js";

function serializeTransaction(txn: Transaction): Record<string, unknown> {
  return {
    amount: txn.amount.toEuros(),
    categoryId: txn.categoryId ?? null,
    date: txn.date,
    id: txn.id,
    label: txn.label,
    sourceBank: txn.sourceBank,
  };
}

export function createTransactionsCommand(
  txnRepo: TransactionRepository,
  renderer: Renderer,
): Command {
  const cmd = new Command("transactions").description("List and manage transactions");

  cmd
    .argument("<month>", "Month in YYYY-MM format")
    .description("List transactions for a month")
    .action((monthStr: string) => {
      const month = Month.from(monthStr);
      const transactions = txnRepo.findByMonth(month);
      console.log(renderer.render(transactions.map(serializeTransaction)));
    });

  cmd
    .command("categorize")
    .argument("<month>", "Month in YYYY-MM format")
    .description("Interactively categorize uncategorized transactions")
    .action(async (monthStr: string) => {
      const month = Month.from(monthStr);
      const transactions = txnRepo.findByMonth(month);
      const uncategorized = transactions.filter((t) => !t.categoryId);

      if (uncategorized.length === 0) {
        console.log(
          renderer.render({
            message: "All transactions are categorized",
            total: transactions.length,
          }),
        );
        return;
      }

      const { categorized, interrupted } = await categorizePrompt(uncategorized);

      const updated = categorized.filter((t) => t.categoryId);
      txnRepo.saveAll(updated);

      if (interrupted) {
        console.log(
          `\nInterrupted — saved ${updated.length} of ${uncategorized.length} uncategorized transactions.`,
        );
      } else {
        console.log(
          renderer.render({
            categorized: updated.length,
            skipped: uncategorized.length - updated.length,
            total: transactions.length,
          }),
        );
      }
    });

  return cmd;
}
