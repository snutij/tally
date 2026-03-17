import { describe, expect, it } from "vitest";
import { DomainError } from "../../src/domain/error/index.js";
import { createCategoryRule } from "../../src/domain/entity/category-rule.js";

describe("createCategoryRule", () => {
  it("creates a valid rule with the provided id", () => {
    const rule = createCategoryRule(
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
    const ruleA = createCategoryRule("id-a", String.raw`\bspotify\b`, "w06", "default");
    const ruleB = createCategoryRule("id-b", String.raw`\bspotify\b`, "w06", "learned");
    expect(ruleA.id).toBe("id-a");
    expect(ruleB.id).toBe("id-b");
  });

  it("throws DomainError for invalid regex", () => {
    expect(() => createCategoryRule("test-id", "[unclosed", "n02", "default")).toThrow(DomainError);
  });
});
