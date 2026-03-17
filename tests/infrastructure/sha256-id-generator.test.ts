import { describe, expect, it } from "vitest";
import { Sha256IdGenerator } from "../../src/infrastructure/id/sha256-id-generator.js";

describe("Sha256IdGenerator", () => {
  const generator = new Sha256IdGenerator();

  it("generates a 32-character id", () => {
    expect(generator.fromPattern(String.raw`\bspotify\b`)).toHaveLength(32);
  });

  it("generates a deterministic id from pattern", () => {
    const idA = generator.fromPattern(String.raw`\bspotify\b`);
    const idB = generator.fromPattern(String.raw`\bspotify\b`);
    expect(idA).toBe(idB);
  });

  it("generates different ids for different patterns", () => {
    const idA = generator.fromPattern(String.raw`\bspotify\b`);
    const idB = generator.fromPattern(String.raw`\bnetflix\b`);
    expect(idA).not.toBe(idB);
  });
});
