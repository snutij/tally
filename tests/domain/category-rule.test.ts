import { describe, expect, it } from "vitest";
import { DomainError } from "../../src/domain/error/index.js";
import { createCategoryRule } from "../../src/domain/entity/category-rule.js";

describe("createCategoryRule", () => {
  it("creates a valid rule", () => {
    const rule = createCategoryRule(String.raw`\bcarrefour\b`, "n02", "default");
    expect(rule.pattern).toBe(String.raw`\bcarrefour\b`);
    expect(rule.categoryId).toBe("n02");
    expect(rule.source).toBe("default");
    expect(rule.id).toHaveLength(32);
  });

  it("generates a deterministic id from pattern", () => {
    const ruleA = createCategoryRule(String.raw`\bspotify\b`, "w06", "default");
    const ruleB = createCategoryRule(String.raw`\bspotify\b`, "w06", "learned");
    expect(ruleA.id).toBe(ruleB.id);
  });

  it("generates different ids for different patterns", () => {
    const ruleA = createCategoryRule(String.raw`\bspotify\b`, "w06", "default");
    const ruleB = createCategoryRule(String.raw`\bnetflix\b`, "w06", "default");
    expect(ruleA.id).not.toBe(ruleB.id);
  });

  it("throws DomainError for invalid regex", () => {
    expect(() => createCategoryRule("[unclosed", "n02", "default")).toThrow(DomainError);
  });
});
