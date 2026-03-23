export function cosineSimilarity(vecA: Float32Array, vecB: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let idx = 0; idx < vecA.length; idx += 1) {
    const ai = vecA[idx] ?? 0;
    const bi = vecB[idx] ?? 0;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
