import { Command } from "commander";
import select from "@inquirer/select";
import { Transaction } from "../../domain/entity/transaction.js";
import { TransactionRepository } from "../../application/gateway/transaction-repository.js";
import { DEFAULT_CATEGORIES } from "../../domain/default-categories.js";
import { CategoryGroup } from "../../domain/value-object/category-group.js";
import { Month } from "../../domain/value-object/month.js";
import { Renderer } from "../renderer/renderer.js";

const GROUP_LABELS: Record<CategoryGroup, string> = {
  NEEDS: "— Needs —",
  WANTS: "— Wants —",
  INVESTMENTS: "— Investments —",
};

function buildCategoryChoices() {
  const choices: Array<
    | { value: string; name: string }
    | { type: "separator"; separator: string }
  > = [];

  for (const group of Object.values(CategoryGroup)) {
    choices.push({ type: "separator" as const, separator: GROUP_LABELS[group] });
    for (const cat of DEFAULT_CATEGORIES.filter((c) => c.group === group)) {
      choices.push({ value: cat.id, name: cat.name });
    }
  }

  choices.push({ type: "separator" as const, separator: "" });
  choices.push({ value: "__skip__", name: "(skip)" });

  return choices;
}

function serializeTransaction(txn: Transaction) {
  return {
    id: txn.id,
    date: txn.date.toISOString().slice(0, 10),
    label: txn.label,
    amount: txn.amount.toEuros(),
    categoryId: txn.categoryId ?? null,
    sourceBank: txn.sourceBank,
  };
}

export function createTransactionsCommand(
  txnRepo: TransactionRepository,
  renderer: Renderer,
): Command {
  const cmd = new Command("transactions").description(
    "List and manage transactions",
  );

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
        console.log(renderer.render({ message: "All transactions are categorized", total: transactions.length }));
        return;
      }

      const choices = buildCategoryChoices();
      const updated: Transaction[] = [];

      for (let i = 0; i < uncategorized.length; i++) {
        const txn = uncategorized[i];
        const sign = txn.amount.isNegative() ? "" : "+";
        const header = `${i + 1}/${uncategorized.length}  ${sign}${txn.amount.format()}  ${txn.label}  (${txn.date.toISOString().slice(0, 10)})`;

        const answer = await select({
          message: header,
          choices,
          loop: true,
        });

        if (answer !== "__skip__") {
          updated.push({ ...txn, categoryId: answer });
        }
      }

      if (updated.length > 0) {
        txnRepo.saveAll(updated);
      }

      console.log(
        renderer.render({
          categorized: updated.length,
          skipped: uncategorized.length - updated.length,
          total: transactions.length,
        }),
      );
    });

  return cmd;
}
