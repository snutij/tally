import {
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORY_REGISTRY,
} from "../../src/domain/default-categories.js";
import { describe, expect, it } from "vitest";
import { CategoryRegistry } from "../../src/domain/service/category-registry.js";
import { DomainError } from "../../src/domain/error/index.js";

describe("CategoryRegistry", () => {
  it("has() returns true for a valid category ID", () => {
    expect(DEFAULT_CATEGORY_REGISTRY.has("n01")).toBe(true);
    expect(DEFAULT_CATEGORY_REGISTRY.has("w06")).toBe(true);
    expect(DEFAULT_CATEGORY_REGISTRY.has("inc01")).toBe(true);
  });

  it("has() returns false for an unknown ID", () => {
    expect(DEFAULT_CATEGORY_REGISTRY.has("nonexistent")).toBe(false);
    expect(DEFAULT_CATEGORY_REGISTRY.has("")).toBe(false);
  });

  it("assertValid() does not throw for a valid ID", () => {
    expect(() => DEFAULT_CATEGORY_REGISTRY.assertValid("n02")).not.toThrow();
  });

  it("assertValid() throws DomainError for an unknown ID", () => {
    expect(() => DEFAULT_CATEGORY_REGISTRY.assertValid("bad")).toThrow(DomainError);
    expect(() => DEFAULT_CATEGORY_REGISTRY.assertValid("bad")).toThrow(/Unknown category ID/);
  });

  it("includes all DEFAULT_CATEGORIES", () => {
    for (const cat of DEFAULT_CATEGORIES) {
      expect(DEFAULT_CATEGORY_REGISTRY.has(cat.id)).toBe(true);
    }
  });

  it("works with a custom category set", () => {
    const registry = new CategoryRegistry([
      { group: "NEEDS" as never, id: "x01" as never, name: "Test" },
    ]);
    expect(registry.has("x01")).toBe(true);
    expect(registry.has("x02")).toBe(false);
  });
});
