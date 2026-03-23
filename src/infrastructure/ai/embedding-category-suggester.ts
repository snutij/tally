import type {
  LabelEmbeddingRecord,
  LabelEmbeddingRepository,
} from "../../application/gateway/label-embedding-repository.js";
import { env, pipeline } from "@huggingface/transformers";
import type { CategorySuggester } from "../../application/gateway/category-suggester.js";
import type { TransactionDto } from "../../application/dto/transaction-dto.js";
import type { TransactionRepository } from "../../application/gateway/transaction-repository.js";
import { cosineSimilarity } from "./cosine-similarity.js";
import { mkdirSync } from "node:fs";

type FeatureExtractionPipeline = Awaited<ReturnType<typeof pipeline<"feature-extraction">>>;

/** Pinned model version — changing this triggers automatic index rebuild. */
const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

/** Cosine similarity threshold below which no suggestion is made (inclusive: >= 0.3). */
const SIMILARITY_THRESHOLD = 0.3;

/**
 * Embedding-based category suggester using all-MiniLM-L6-v2 (43 MB, multilingual).
 *
 * Uses brute-force k-NN (cosine similarity) over stored label embeddings.
 * Scales well for typical personal-finance use cases (< 1000 unique labels).
 *
 * Call `init()` once before using `suggest()` or `learnBatch()`.
 */
export class EmbeddingCategorySuggester implements CategorySuggester {
  private readonly labelEmbeddingRepository: LabelEmbeddingRepository;
  private readonly transactionRepository: TransactionRepository;
  private readonly modelsDir: string;
  private embedder: FeatureExtractionPipeline | null = null;
  private cachedEmbeddings: LabelEmbeddingRecord[] = [];

  constructor(
    labelEmbeddingRepository: LabelEmbeddingRepository,
    transactionRepository: TransactionRepository,
    modelsDir: string,
  ) {
    this.labelEmbeddingRepository = labelEmbeddingRepository;
    this.transactionRepository = transactionRepository;
    this.modelsDir = modelsDir;
  }

  /**
   * Initializes the suggester:
   * 1. Configures model cache directory
   * 2. Loads the embedding model (downloads on first run)
   * 3. Invalidates stored embeddings if model version changed
   * 4. Seeds the embedding index from existing categorized transactions if empty
   * 5. Loads all embeddings into memory for fast similarity search
   */
  async init(onProgress?: (message: string) => void): Promise<void> {
    mkdirSync(this.modelsDir, { recursive: true });

    env.cacheDir = this.modelsDir;
    this.embedder = await pipeline("feature-extraction", MODEL_ID, { device: "cpu" });

    // Invalidate stale embeddings from a previous model version
    this.labelEmbeddingRepository.deleteByModelMismatch(MODEL_ID);

    // Seed from existing categorized transactions if index is empty
    const existing = this.labelEmbeddingRepository.findAllByModel(MODEL_ID);
    if (existing.length === 0) {
      await this.seedFromHistory(onProgress);
    } else {
      this.cachedEmbeddings = existing;
    }
  }

  async suggest(transactions: TransactionDto[]): Promise<TransactionDto[]> {
    if (this.embedder === null || this.cachedEmbeddings.length === 0) {
      return transactions;
    }

    const result: TransactionDto[] = [];
    for (const txn of transactions) {
      const embedding = await this.embed(txn.label);
      const best = this.findBestMatch(embedding);
      if (best === undefined) {
        result.push(txn);
      } else {
        result.push({ ...txn, suggestedCategoryId: best.categoryId });
      }
    }
    return result;
  }

  async learnBatch(items: readonly { label: string; categoryId: string }[]): Promise<void> {
    if (this.embedder === null) {
      return;
    }

    for (const { label, categoryId } of items) {
      const embedding = await this.embed(label);
      this.labelEmbeddingRepository.upsert(label, categoryId, embedding, MODEL_ID);
      // Update in-memory cache
      const existingIdx = this.cachedEmbeddings.findIndex((rec) => rec.label === label);
      const record: LabelEmbeddingRecord = {
        categoryId,
        embedding,
        label,
        modelId: MODEL_ID,
      };
      if (existingIdx === -1) {
        this.cachedEmbeddings.push(record);
      } else {
        this.cachedEmbeddings[existingIdx] = record;
      }
    }
  }

  static get modelId(): string {
    return MODEL_ID;
  }

  private async embed(label: string): Promise<Float32Array> {
    if (this.embedder === null) {
      throw new Error("EmbeddingCategorySuggester not initialized. Call init() first.");
    }
    const output = await this.embedder(label, { normalize: true, pooling: "mean" });
    return output.data as Float32Array;
  }

  private findBestMatch(embedding: Float32Array): LabelEmbeddingRecord | undefined {
    let bestSimilarity = -1;
    let bestRecord: LabelEmbeddingRecord | undefined;

    for (const record of this.cachedEmbeddings) {
      const similarity = cosineSimilarity(embedding, record.embedding);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestRecord = record;
      }
    }

    return bestSimilarity >= SIMILARITY_THRESHOLD ? bestRecord : undefined;
  }

  private async seedFromHistory(onProgress?: (message: string) => void): Promise<void> {
    const uniqueLabels = this.transactionRepository.findUniqueCategorizedLabels();
    if (uniqueLabels.length === 0) {
      return;
    }

    onProgress?.(`Seeding embedding index from ${uniqueLabels.length} categorized labels...`);
    let count = 0;
    for (const { label, categoryId } of uniqueLabels) {
      const embedding = await this.embed(label);
      this.labelEmbeddingRepository.upsert(label, categoryId, embedding, MODEL_ID);
      this.cachedEmbeddings.push({ categoryId, embedding, label, modelId: MODEL_ID });
      count += 1;
      if (count % 50 === 0) {
        onProgress?.(`  ${count}/${uniqueLabels.length} labels indexed...`);
      }
    }
  }
}
