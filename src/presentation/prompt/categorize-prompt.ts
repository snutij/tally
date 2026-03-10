import select from "@inquirer/select";
import { ExitPromptError } from "@inquirer/core";
import type { Transaction } from "../../domain/entity/transaction.js";
import { DEFAULT_CATEGORIES } from "../../domain/default-categories.js";
import { CategoryGroup } from "../../domain/value-object/category-group.js";

const GROUP_LABELS: Record<CategoryGroup, string> = {
  INCOME: "— Income —",
  INVESTMENTS: "— Investments —",
  NEEDS: "— Needs —",
  WANTS: "— Wants —",
};

type Choice = { value: string; name: string } | { type: "separator"; separator: string };

export function buildCategoryChoices(): Choice[] {
  const choices: Choice[] = [];

  for (const group of Object.values(CategoryGroup)) {
    choices.push({ separator: GROUP_LABELS[group], type: "separator" as const });
    for (const cat of DEFAULT_CATEGORIES.filter((c) => c.group === group)) {
      choices.push({ name: cat.name, value: cat.id });
    }
  }

  choices.push({ separator: "", type: "separator" as const });
  choices.push({ name: "(skip)", value: "__skip__" });

  return choices;
}

export interface CategorizeResult {
  categorized: Transaction[];
  interrupted: boolean;
}

export async function categorizePrompt(transactions: Transaction[]): Promise<CategorizeResult> {
  const choices = buildCategoryChoices();
  const result: Transaction[] = [];

  try {
    for (let i = 0; i < transactions.length; i += 1) {
      const txn = transactions[i];
      const sign = txn.amount.isNegative() ? "" : "+";
      const header = `${i + 1}/${transactions.length}  ${sign}${txn.amount.format()}  ${txn.label}  (${txn.date})`;

      const answer = await select({
        choices,
        loop: true,
        message: header,
      });

      if (answer === "__skip__") {
        result.push(txn);
      } else {
        result.push({ ...txn, categoryId: answer });
      }
    }
  } catch (error) {
    if (error instanceof ExitPromptError) {
      return { categorized: result, interrupted: true };
    }
    throw error;
  }

  return { categorized: result, interrupted: false };
}
