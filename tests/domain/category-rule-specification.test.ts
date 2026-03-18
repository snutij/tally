import { describe, expect, it } from "vitest";
import { CategoryRule } from "../../src/domain/entity/category-rule.js";
import { CategoryRuleSpecification } from "../../src/domain/value-object/category-rule-specification.js";

function rule(pattern: string, categoryId = "n02"): CategoryRule {
  return CategoryRule.create("rule-id", pattern, categoryId, "default");
}

describe("CategoryRuleSpecification", () => {
  describe("isSatisfiedBy()", () => {
    it("returns true when label matches pattern", () => {
      const spec = new CategoryRuleSpecification(rule(String.raw`\bcarrefour\b`));
      expect(spec.isSatisfiedBy("CARTE CB CARREFOUR CITY PARIS")).toBe(true);
    });

    it("returns false when label does not match", () => {
      const spec = new CategoryRuleSpecification(rule(String.raw`\bcarrefour\b`));
      expect(spec.isSatisfiedBy("CARTE CB LECLERC LYON")).toBe(false);
    });

    it("is case-insensitive", () => {
      const spec = new CategoryRuleSpecification(rule(String.raw`\bcarrefour\b`));
      expect(spec.isSatisfiedBy("carte cb carrefour city")).toBe(true);
    });

    it("returns false for invalid regex pattern (no throw)", () => {
      const invalidRule = CategoryRule.reconstitute("x", "[unclosed", "n02", "default");
      const spec = new CategoryRuleSpecification(invalidRule);
      expect(spec.isSatisfiedBy("anything")).toBe(false);
    });
  });

  describe("accessors", () => {
    it("exposes categoryId from the wrapped rule", () => {
      const spec = new CategoryRuleSpecification(rule(String.raw`\bspotify\b`, "w06"));
      expect(spec.categoryId).toBe("w06");
    });

    it("exposes ruleId from the wrapped rule", () => {
      const spotify = CategoryRule.create("my-rule-id", String.raw`\bspotify\b`, "w06", "default");
      const spec = new CategoryRuleSpecification(spotify);
      expect(spec.ruleId).toBe("my-rule-id");
    });
  });
});
