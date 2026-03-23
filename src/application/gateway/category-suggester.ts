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
   * Returns the same transactions, enriching each with `suggestedCategoryId`
   * where the embedding model finds a high-confidence match (≥ 0.3 cosine
   * similarity). Transactions with no match are returned unchanged.
   */
  suggest(transactions: TransactionDto[]): Promise<TransactionDto[]>;

  /**
   * Updates the embedding index with newly categorized transaction labels.
   * Should be called after the user completes manual categorization.
   */
  learnBatch(transactions: TransactionDto[]): Promise<void>;

  /**
   * Returns true if the underlying model is cached and ready to use.
   * Always true for no-op implementations (no model required).
   */
  isModelCached(): boolean;

  /**
   * Initializes the suggester (loads model, seeds index if empty).
   * Must be called before `suggest()` or `learnBatch()`.
   * No-op implementations can implement this as an instant resolve.
   */
  init(onProgress?: (message: string) => void): Promise<void>;
}
