import type {
  CategorizedResult,
  TransactionCategorizer,
} from "../../application/gateway/transaction-categorizer.js";
import type { CategoryDto } from "../../application/dto/category-dto.js";
import type { LlmGateway } from "../../application/gateway/llm-gateway.js";
import type { TransactionDto } from "../../application/dto/transaction-dto.js";

const MAX_LABELS_PER_BATCH = 50;

const SYSTEM_PROMPT = `You are a personal finance transaction categorizer.
Given a list of transaction labels and available categories, assign each label to the most appropriate category ID.
Respond with valid JSON only — no explanation, no markdown.`;

function buildUserPrompt(labels: string[], categories: CategoryDto[]): string {
  const categoryList = categories
    .map((cat) => `- id: ${cat.id}, name: ${cat.name}, group: ${cat.group}`)
    .join("\n");

  const labelList = labels.map((label, idx) => `${idx + 1}. ${label}`).join("\n");

  return `Categories:\n${categoryList}\n\nTransaction labels to categorize:\n${labelList}\n\nRespond with a JSON object mapping each label to a category ID, e.g.: {"LABEL": "categoryId"}`;
}

const RESPONSE_SCHEMA = {
  additionalProperties: { type: "string" },
  type: "object",
};

export class LlmTransactionCategorizer implements TransactionCategorizer {
  private readonly llmGateway: LlmGateway;

  constructor(llmGateway: LlmGateway) {
    this.llmGateway = llmGateway;
  }

  async categorize(
    transactions: TransactionDto[],
    categories: CategoryDto[],
  ): Promise<CategorizedResult[]> {
    if (transactions.length === 0) {
      return [];
    }

    const validCategoryIds = new Set(categories.map((cat) => cat.id));

    // Deduplicate labels
    const uniqueLabels = [...new Set(transactions.map((txn) => txn.label))];

    // Chunk into batches of MAX_LABELS_PER_BATCH
    const batches: string[][] = [];
    for (let idx = 0; idx < uniqueLabels.length; idx += MAX_LABELS_PER_BATCH) {
      batches.push(uniqueLabels.slice(idx, idx + MAX_LABELS_PER_BATCH));
    }

    // Collect label → categoryId mappings from all batches
    const labelToCategory = new Map<string, string>();
    for (const batch of batches) {
      const response = await this.llmGateway.complete<Record<string, string>>(
        SYSTEM_PROMPT,
        buildUserPrompt(batch, categories),
        RESPONSE_SCHEMA,
      );
      for (const [label, categoryId] of Object.entries(response)) {
        if (validCategoryIds.has(categoryId)) {
          labelToCategory.set(label, categoryId);
        }
      }
    }

    // Map back to transactions
    const results: CategorizedResult[] = [];
    for (const txn of transactions) {
      const categoryId = labelToCategory.get(txn.label);
      if (categoryId) {
        results.push({ categoryId, transactionId: txn.id });
      }
    }
    return results;
  }
}
