import select from "@inquirer/select";
import { ExitPromptError } from "@inquirer/core";
import { Transaction } from "../../domain/entity/transaction.js";
import { DEFAULT_CATEGORIES } from "../../domain/default-categories.js";
import { CategoryGroup } from "../../domain/value-object/category-group.js";

const GROUP_LABELS: Record<CategoryGroup, string> = {
  NEEDS: "— Needs —",
  WANTS: "— Wants —",
  INVESTMENTS: "— Investments —",
};

type Choice =
  | { value: string; name: string }
  | { type: "separator"; separator: string };

function buildCategoryChoices(includeIncome: boolean): Choice[] {
  const choices: Choice[] = [];

  for (const group of Object.values(CategoryGroup)) {
    choices.push({ type: "separator" as const, separator: GROUP_LABELS[group] });
    for (const cat of DEFAULT_CATEGORIES.filter((c) => c.group === group)) {
      choices.push({ value: cat.id, name: cat.name });
    }
  }

  choices.push({ type: "separator" as const, separator: "" });
  choices.push({ value: "__skip__", name: "(skip)" });
  if (includeIncome) {
    choices.push({ value: "__income__", name: "(income — no category)" });
  }

  return choices;
}

export interface CategorizeResult {
  categorized: Transaction[];
  interrupted: boolean;
}

export async function categorizePrompt(
  transactions: Transaction[],
  opts: { includeIncome: boolean } = { includeIncome: false },
): Promise<CategorizeResult> {
  const choices = buildCategoryChoices(opts.includeIncome);
  const result: Transaction[] = [];

  try {
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
  } catch (err) {
    if (err instanceof ExitPromptError) {
      return { categorized: result, interrupted: true };
    }
    throw err;
  }

  return { categorized: result, interrupted: false };
}
