import { describe, expect, it } from "vitest";
import { getDefaultRulesForLocale } from "../../src/domain/default-category-rules/index.js";

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
