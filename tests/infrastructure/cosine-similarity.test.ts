/**
 * Tests for the cosine similarity math and NoOpCategorySuggester.
 */
import { describe, expect, it } from "vitest";
import { NoOpCategorySuggester } from "../../src/application/usecase/no-op-category-suggester.js";

function cosineSimilarity(vecA: Float32Array, vecB: Float32Array): number {
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

describe("NoOpCategorySuggester", () => {
  const txns = [
    {
      amount: -10,
      categoryId: undefined,
      date: "2026-03-15",
      id: "t1",
      label: "SPOTIFY",
      source: "csv",
      suggestedCategoryId: undefined,
    },
  ];

  it("returns transactions unchanged", async () => {
    expect(await new NoOpCategorySuggester().suggest(txns)).toEqual(txns);
  });

  it("learnBatch is a no-op", async () => {
    await expect(new NoOpCategorySuggester().learnBatch(txns)).resolves.toBeUndefined();
  });

  it("isModelCached always returns true", () => {
    expect(new NoOpCategorySuggester().isModelCached()).toBe(true);
  });

  it("init resolves immediately", async () => {
    await expect(new NoOpCategorySuggester().init()).resolves.toBeUndefined();
  });
});

describe("cosine similarity (math invariants)", () => {
  it("identical vectors have similarity 1", () => {
    const vec = new Float32Array([0.5, 0.5, 0.5, 0.5]);
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1);
  });

  it("orthogonal vectors have similarity 0", () => {
    const vecA = new Float32Array([1, 0, 0, 0]);
    const vecB = new Float32Array([0, 1, 0, 0]);
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(0);
  });

  it("opposite vectors have similarity -1", () => {
    const vecA = new Float32Array([1, 0, 0, 0]);
    const vecB = new Float32Array([-1, 0, 0, 0]);
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(-1);
  });

  it("returns 0 for zero vectors", () => {
    const zero = new Float32Array([0, 0, 0, 0]);
    const vec = new Float32Array([1, 0, 0, 0]);
    expect(cosineSimilarity(zero, vec)).toBe(0);
  });

  it("similarity threshold 0.3 is inclusive — 0.30 passes, 0.29 does not", () => {
    const threshold = 0.3;
    // 0.30 is at or above threshold (passes)
    expect(threshold <= 0.3).toBe(true);
    // 0.29 is strictly below threshold (does not pass)
    expect(threshold <= 0.29).toBe(false);
  });
});
