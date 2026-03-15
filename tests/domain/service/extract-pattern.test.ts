import { describe, expect, it } from "vitest";
import { extractPattern } from "../../../src/domain/service/extract-pattern.js";

describe("extractPattern", () => {
  it("strips CARTE CB prefix and extracts first 2 merchant words", () => {
    const result = extractPattern("CARTE CB CARREFOUR CITY PARIS 15/03");
    expect(result).toBe(String.raw`\bcarrefour\s+city\b`);
  });

  it("strips PRLV SEPA prefix", () => {
    const result = extractPattern("PRLV SEPA FREE MOBILE 123456");
    expect(result).toBe(String.raw`\bfree\s+mobile\b`);
  });

  it("handles a single-word label with no prefix", () => {
    const result = extractPattern("SPOTIFY");
    expect(result).toBe(String.raw`\bspotify\b`);
  });

  it("returns undefined for label that is pure noise after stripping", () => {
    const result = extractPattern("VIR 15/03/2026");
    expect(result).toBeUndefined();
  });

  it("strips VIR prefix", () => {
    const result = extractPattern("VIR RECU SNCF PARIS");
    expect(result).toBe(String.raw`\bsncf\s+paris\b`);
  });

  it("strips trailing card reference", () => {
    const result = extractPattern("PAIEMENT CB AMAZON CB*4567");
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
