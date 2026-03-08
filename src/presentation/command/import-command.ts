import { Command } from "commander";
import select from "@inquirer/select";
import { ImportTransactions } from "../../application/usecase/import-transactions.js";
import { Transaction } from "../../domain/entity/transaction.js";
import { DEFAULT_CATEGORIES } from "../../domain/default-categories.js";
import { CategoryGroup } from "../../domain/value-object/category-group.js";
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
  choices.push({ value: "__income__", name: "(income — no category)" });

  return choices;
}

async function categorizeInteractively(
  transactions: Transaction[],
): Promise<Transaction[]> {
  const choices = buildCategoryChoices();
  const result: Transaction[] = [];

  for (let i = 0; i < transactions.length; i++) {
    const txn = transactions[i];
    const sign = txn.amount.isNegative() ? "" : "+";
    const header = `${i + 1}/${transactions.length}  ${sign}${txn.amount.format()}  ${txn.label}  (${txn.date.toISOString().slice(0, 10)})`;

    const answer = await select({
      message: header,
      choices,
      loop: true,
    });

    if (answer === "__skip__" || answer === "__income__") {
      result.push(txn);
    } else {
      result.push({ ...txn, categoryId: answer });
    }
  }

  return result;
}

export function createImportCommand(
  importTransactions: ImportTransactions,
  renderer: Renderer,
): Command {
  const cmd = new Command("import").description("Import bank transactions");

  cmd
    .command("list")
    .description("List available bank adapters")
    .action(() => {
      const banks = importTransactions.listBanks();
      console.log(renderer.render({ banks }));
    });

  cmd
    .argument("[bank]", "Bank adapter name")
    .argument("[file]", "Path to CSV file")
    .option("--no-categorize", "Skip interactive categorization")
    .action(async (bank?: string, file?: string, opts?: { categorize: boolean }) => {
      if (!bank || !file) return;

      const transactions = importTransactions.parse(bank, file);

      let categorized: Transaction[];
      if (opts?.categorize !== false && process.stdout.isTTY) {
        categorized = await categorizeInteractively(transactions);
      } else {
        categorized = transactions;
      }

      const result = importTransactions.save(categorized);
      console.log(renderer.render(result));
    });

  return cmd;
}
