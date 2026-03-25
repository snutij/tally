import { describe, expect, it } from "vitest";
import { CategoryRule } from "../../src/domain/entity/category-rule.js";
import { DomainError } from "../../src/domain/error/index.js";

describe("CategoryRule.create()", () => {
  it("creates a valid rule with the provided id", () => {
    const rule = CategoryRule.create(
      "test-id-32chars-xxxxxxxxxxx",
      String.raw`\bcarrefour\b`,
      "n02",
      "default",
    );
    expect(rule.pattern).toBe(String.raw`\bcarrefour\b`);
    expect(rule.categoryId).toBe("n02");
    expect(rule.source).toBe("default");
    expect(rule.id).toBe("test-id-32chars-xxxxxxxxxxx");
  });

  it("stores whatever id the caller provides", () => {
    const ruleA = CategoryRule.create("id-a", String.raw`\bspotify\b`, "w06", "default");
    const ruleB = CategoryRule.create("id-b", String.raw`\bspotify\b`, "w06", "learned");
    expect(ruleA.id).toBe("id-a");
    expect(ruleB.id).toBe("id-b");
  });

  it("throws DomainError for empty pattern", () => {
    expect(() => CategoryRule.create("test-id", "", "n02", "default")).toThrow(DomainError);
  });

  it("throws DomainError for blank pattern", () => {
    expect(() => CategoryRule.create("test-id", "   ", "n02", "default")).toThrow(DomainError);
  });

  it("throws DomainError for invalid regex", () => {
    expect(() => CategoryRule.create("test-id", "[unclosed", "n02", "default")).toThrow(
      DomainError,
    );
  });

  it("two rules with the same id are equal", () => {
    const r1 = CategoryRule.create("id-x", String.raw`\bspotify\b`, "w06", "default");
    const r2 = CategoryRule.create("id-x", String.raw`\bspotify\b`, "w06", "default");
    const r3 = CategoryRule.create("id-y", String.raw`\bnetflix\b`, "w06", "default");
    expect(r1.equals(r2)).toBe(true);
    expect(r1.equals(r3)).toBe(false);
  });
});

describe("CategoryRule.reconstitute()", () => {
  it("creates a rule from DB data for a valid pattern", () => {
    const rule = CategoryRule.reconstitute("id-1", String.raw`\bspotify\b`, "w06", "default");
    expect(rule).toBeDefined();
    expect(rule?.id).toBe("id-1");
    expect(rule?.pattern).toBe(String.raw`\bspotify\b`);
    expect(rule?.categoryId).toBe("w06");
    expect(rule?.source).toBe("default");
  });

  it("does not throw for unknown category IDs (DB FK is trusted)", () => {
    expect(() =>
      CategoryRule.reconstitute("id-1", String.raw`\bfoo\b`, "nonexistent", "default"),
    ).not.toThrow();
  });

  it("returns undefined for an invalid regex pattern", () => {
    expect(CategoryRule.reconstitute("id-1", "[unclosed", "n02", "default")).toBeUndefined();
  });

  it("returns undefined for another invalid regex pattern", () => {
    expect(CategoryRule.reconstitute("id-1", "(?P<bad>)", "n02", "learned")).toBeUndefined();
  });
});
