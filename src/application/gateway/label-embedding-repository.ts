export interface LabelEmbeddingRecord {
  label: string;
  categoryId: string;
  embedding: Float32Array;
  modelId: string;
}

export interface LabelEmbeddingRepository {
  upsert(label: string, categoryId: string, embedding: Float32Array, modelId: string): void;
  findAllByModel(modelId: string): LabelEmbeddingRecord[];
  deleteByModelMismatch(modelId: string): void;
}
