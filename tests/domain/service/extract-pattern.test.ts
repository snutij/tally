import { describe, expect, it } from "vitest";
import { extractPattern } from "../../../src/domain/service/extract-pattern.js";

describe("extractPattern", () => {
  it("extracts first 2 words from a plain label", () => {
    const result = extractPattern("CARREFOUR CITY PARIS 15/03");
    expect(result).toBe(String.raw`\bcarrefour\s+city\b`);
  });

  it("strips trailing date noise and extracts words", () => {
    const result = extractPattern("FREE MOBILE 15/03/2026");
    expect(result).toBe(String.raw`\bfree\s+mobile\b`);
  });

  it("handles a single-word label", () => {
    const result = extractPattern("SPOTIFY");
    expect(result).toBe(String.raw`\bspotify\b`);
  });

  it("returns undefined for label with no extractable words", () => {
    const result = extractPattern("15/03/2026");
    expect(result).toBeUndefined();
  });

  it("strips trailing card reference", () => {
    const result = extractPattern("AMAZON CB*4567");
    expect(result).toBe(String.raw`\bamazon\b`);
  });

  it("is case-insensitive on input (always uppercased internally)", () => {
    const upper = extractPattern("SPOTIFY");
    const lower = extractPattern("spotify");
    expect(upper).toBe(lower);
  });

  it("takes at most 2 words", () => {
    const result = extractPattern("UBER EATS PARIS EXTRA");
    expect(result).toBe(String.raw`\buber\s+eats\b`);
  });
});
