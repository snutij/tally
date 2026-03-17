import { describe, expect, it } from "vitest";
import {
  getDefaultPrefixesForLocale,
  getDefaultRulesForLocale,
} from "../../src/infrastructure/config/category-rules/index.js";

describe("getDefaultRulesForLocale", () => {
  it("returns French rules for locale 'fr'", () => {
    const rules = getDefaultRulesForLocale("fr");
    expect(rules.length).toBeGreaterThan(100);
  });

  it("returns empty array for unknown locale", () => {
    const rules = getDefaultRulesForLocale("zz");
    expect(rules).toEqual([]);
  });
});

describe("getDefaultPrefixesForLocale", () => {
  it("returns French bank prefixes for locale 'fr'", () => {
    const prefixes = getDefaultPrefixesForLocale("fr");
    expect(prefixes.length).toBeGreaterThan(0);
    expect(prefixes).toContain("CARTE CB");
  });

  it("returns empty array for unknown locale", () => {
    const prefixes = getDefaultPrefixesForLocale("zz");
    expect(prefixes).toEqual([]);
  });
});
