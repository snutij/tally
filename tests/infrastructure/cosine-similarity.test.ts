import { describe, expect, it } from "vitest";
import { cosineSimilarity } from "../../src/infrastructure/ai/cosine-similarity.js";

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
});
