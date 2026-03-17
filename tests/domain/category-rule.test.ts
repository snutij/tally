import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORY_REGISTRY } from "../../src/domain/default-categories.js";
import { DomainError } from "../../src/domain/error/index.js";
import { createCategoryRule } from "../../src/domain/entity/category-rule.js";

describe("createCategoryRule", () => {
  it("creates a valid rule with the provided id", () => {
    const rule = createCategoryRule(
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
    const ruleA = createCategoryRule(
      "id-a",
      String.raw`\bspotify\b`,
      "w06",
      "default",
      DEFAULT_CATEGORY_REGISTRY,
    );
    const ruleB = createCategoryRule(
      "id-b",
      String.raw`\bspotify\b`,
      "w06",
      "learned",
      DEFAULT_CATEGORY_REGISTRY,
    );
    expect(ruleA.id).toBe("id-a");
    expect(ruleB.id).toBe("id-b");
  });

  it("throws DomainError for invalid regex", () => {
    expect(() =>
      createCategoryRule("test-id", "[unclosed", "n02", "default", DEFAULT_CATEGORY_REGISTRY),
    ).toThrow(DomainError);
  });

  it("throws DomainError for unknown category ID", () => {
    expect(() =>
      createCategoryRule(
        "test-id",
        String.raw`\bfoo\b`,
        "nonexistent",
        "default",
        DEFAULT_CATEGORY_REGISTRY,
      ),
    ).toThrow(DomainError);
  });
});
