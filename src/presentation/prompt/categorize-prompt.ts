import type { CategoryChoiceGroup } from "../../application/category-choices.js";
import { ExitPromptError } from "@inquirer/core";
import type { TransactionDto } from "../../application/dto/transaction-dto.js";
import select from "@inquirer/select";

type Choice = { value: string; name: string } | { type: "separator"; separator: string };

function buildInquirerChoices(choiceGroups: CategoryChoiceGroup[]): Choice[] {
  const choices: Choice[] = [];

  for (const group of choiceGroups) {
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

export async function categorizePrompt(
  transactions: TransactionDto[],
  choiceGroups: CategoryChoiceGroup[],
): Promise<CategorizeResult> {
  const choices = buildInquirerChoices(choiceGroups);
  const result: TransactionDto[] = [];

  try {
    for (const [idx, txn] of transactions.entries()) {
      const sign = txn.amount < 0 ? "" : "+";
      const formatted = `${sign}${Math.abs(txn.amount).toFixed(2)}`;
      const aiIndicator = txn.suggestedCategoryId === undefined ? "" : " [AI]";
      const header = `${idx + 1}/${transactions.length}  ${formatted} €  ${txn.label}  (${txn.date})${aiIndicator}`;

      const answer = await select({
        choices,
        default: txn.suggestedCategoryId,
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
