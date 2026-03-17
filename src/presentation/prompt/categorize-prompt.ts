import { ExitPromptError } from "@inquirer/core";
import type { TransactionDto } from "../../application/dto/transaction-dto.js";
import { getCategoryChoiceGroups } from "../../application/category-choices.js";
import select from "@inquirer/select";

type Choice = { value: string; name: string } | { type: "separator"; separator: string };

export function buildCategoryChoices(): Choice[] {
  const choices: Choice[] = [];

  for (const group of getCategoryChoiceGroups()) {
    choices.push({ separator: group.label, type: "separator" as const });
    for (const cat of group.categories) {
      choices.push({ name: cat.name, value: cat.id });
    }
  }

  choices.push({ separator: "", type: "separator" as const });
  choices.push({ name: "(skip)", value: "__skip__" });

  return choices;
}

export interface CategorizeResult {
  categorized: TransactionDto[];
  interrupted: boolean;
}

export async function categorizePrompt(transactions: TransactionDto[]): Promise<CategorizeResult> {
  const choices = buildCategoryChoices();
  const result: TransactionDto[] = [];

  try {
    for (let idx = 0; idx < transactions.length; idx += 1) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- idx bounded by transactions.length
      const txn = transactions[idx]!;
      const sign = txn.amount < 0 ? "" : "+";
      const formatted = `${sign}${Math.abs(txn.amount).toFixed(2)}`;
      const header = `${idx + 1}/${transactions.length}  ${formatted} €  ${txn.label}  (${txn.date})`;

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
