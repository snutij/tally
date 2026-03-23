import type { TransactionDto } from "../dto/transaction-dto.js";

/**
 * Enriches transactions with AI-based category suggestions derived from
 * embedding similarity over previously categorized labels.
 *
 * This is an enrichment interface — not a filter. All input transactions are
 * returned, some with `suggestedCategoryId` populated. The user always
 * confirms suggestions via the interactive prompt; no auto-categorization.
 */
export interface CategorySuggester {
  /**
   * Initializes the suggester (loads model, seeds index if empty).
   * Must be called before `suggest()` or `learnBatch()`.
   */
  init(onProgress?: (message: string) => void): Promise<void>;

  /**
   * Returns the same transactions, enriching each with `suggestedCategoryId`
   * where the embedding model finds a high-confidence match (>= 0.3 cosine
   * similarity). Transactions with no match are returned unchanged.
   */
  suggest(transactions: TransactionDto[]): Promise<TransactionDto[]>;

  /**
   * Updates the embedding index with newly categorized labels.
   * Should be called after the user completes manual categorization.
   */
  learnBatch(items: readonly { label: string; categoryId: string }[]): Promise<void>;
}
