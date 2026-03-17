import { describe, expect, it } from "vitest";
import { CategoryRule } from "../../src/domain/entity/category-rule.js";
import { DEFAULT_CATEGORY_REGISTRY } from "../../src/domain/default-categories.js";
import { DomainError } from "../../src/domain/error/index.js";

describe("CategoryRule.create()", () => {
  it("creates a valid rule with the provided id", () => {
    const rule = CategoryRule.create(
      "test-id-32chars-xxxxxxxxxxx",
      String.raw`\bcarrefour\b`,
      "n02",
      "default",
      DEFAULT_CATEGORY_REGISTRY,
    );
    expect(rule.pattern).toBe(String.raw`\bcarrefour\b`);
    expect(rule.categoryId).toBe("n02");
    expect(rule.source).toBe("default");
    expect(rule.id).toBe("test-id-32chars-xxxxxxxxxxx");
  });

  it("stores whatever id the caller provides", () => {
    const ruleA = CategoryRule.create(
      "id-a",
      String.raw`\bspotify\b`,
      "w06",
      "default",
      DEFAULT_CATEGORY_REGISTRY,
    );
    const ruleB = CategoryRule.create(
      "id-b",
      String.raw`\bspotify\b`,
      "w06",
      "learned",
      DEFAULT_CATEGORY_REGISTRY,
    );
    expect(ruleA.id).toBe("id-a");
    expect(ruleB.id).toBe("id-b");
  });

  it("throws DomainError for empty pattern", () => {
    expect(() =>
      CategoryRule.create("test-id", "", "n02", "default", DEFAULT_CATEGORY_REGISTRY),
    ).toThrow(DomainError);
  });

  it("throws DomainError for blank pattern", () => {
    expect(() =>
      CategoryRule.create("test-id", "   ", "n02", "default", DEFAULT_CATEGORY_REGISTRY),
    ).toThrow(DomainError);
  });

  it("throws DomainError for invalid regex", () => {
    expect(() =>
      CategoryRule.create("test-id", "[unclosed", "n02", "default", DEFAULT_CATEGORY_REGISTRY),
    ).toThrow(DomainError);
  });

  it("throws DomainError for unknown category ID", () => {
    expect(() =>
      CategoryRule.create(
        "test-id",
        String.raw`\bfoo\b`,
        "nonexistent",
        "default",
        DEFAULT_CATEGORY_REGISTRY,
      ),
    ).toThrow(DomainError);
  });

  it("two rules with the same id are equal", () => {
    const r1 = CategoryRule.create(
      "id-x",
      String.raw`\bspotify\b`,
      "w06",
      "default",
      DEFAULT_CATEGORY_REGISTRY,
    );
    const r2 = CategoryRule.create(
      "id-x",
      String.raw`\bspotify\b`,
      "w06",
      "default",
      DEFAULT_CATEGORY_REGISTRY,
    );
    const r3 = CategoryRule.create(
      "id-y",
      String.raw`\bnetflix\b`,
      "w06",
      "default",
      DEFAULT_CATEGORY_REGISTRY,
    );
    expect(r1.equals(r2)).toBe(true);
    expect(r1.equals(r3)).toBe(false);
  });
});
