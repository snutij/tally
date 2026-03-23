import type { CategorySuggester } from "../gateway/category-suggester.js";
import type { TransactionDto } from "../dto/transaction-dto.js";

/**
 * No-op CategorySuggester — used when `--no-smart` is set or no model is available.
 * Returns all transactions unchanged; never adds `suggestedCategoryId`.
 */
export class NoOpCategorySuggester implements CategorySuggester {
  isModelCached(): boolean {
    return true;
  }

  init(_onProgress?: (message: string) => void): Promise<void> {
    return Promise.resolve();
  }

  suggest(transactions: TransactionDto[]): Promise<TransactionDto[]> {
    return Promise.resolve(transactions);
  }

  learnBatch(_transactions: TransactionDto[]): Promise<void> {
    return Promise.resolve();
  }
}
