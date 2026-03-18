import { describe, expect, it } from "vitest";
import { CategoryRegistry } from "../../src/domain/service/category-registry.js";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";
import { DomainError } from "../../src/domain/error/index.js";

const registry = new CategoryRegistry(DEFAULT_CATEGORIES);

describe("CategoryRegistry", () => {
  it("has() returns true for a valid category ID", () => {
    expect(registry.has("n01")).toBe(true);
    expect(registry.has("w06")).toBe(true);
    expect(registry.has("inc01")).toBe(true);
  });

  it("has() returns false for an unknown ID", () => {
    expect(registry.has("nonexistent")).toBe(false);
    expect(registry.has("")).toBe(false);
  });

  it("assertValid() does not throw for a valid ID", () => {
    expect(() => registry.assertValid("n02")).not.toThrow();
  });

  it("assertValid() throws DomainError for an unknown ID", () => {
    expect(() => registry.assertValid("bad")).toThrow(DomainError);
    expect(() => registry.assertValid("bad")).toThrow(/Unknown category ID/);
  });

  it("includes all DEFAULT_CATEGORIES", () => {
    for (const cat of DEFAULT_CATEGORIES) {
      expect(registry.has(cat.id)).toBe(true);
    }
  });

  it("works with a custom category set", () => {
    const custom = new CategoryRegistry([
      { group: "NEEDS" as never, id: "x01" as never, name: "Test" },
    ]);
    expect(custom.has("x01")).toBe(true);
    expect(custom.has("x02")).toBe(false);
  });

  it("nameOf() returns the display name for a known ID", () => {
    expect(registry.nameOf("n01")).toBe("Rent");
    expect(registry.nameOf("w06")).toBe("Subscriptions");
    expect(registry.nameOf("inc01")).toBe("Salary");
  });

  it("nameOf() returns undefined for an unknown ID", () => {
    expect(registry.nameOf("nonexistent")).toBeUndefined();
    expect(registry.nameOf("")).toBeUndefined();
  });

  it("categoryToGroupMap() returns a map with group and name for every category", () => {
    const map = registry.categoryToGroupMap();
    expect(map.size).toBe(DEFAULT_CATEGORIES.length);
    const entry = map.get("n02");
    expect(entry?.name).toBe("Groceries");
    expect(entry?.group).toBe("NEEDS");
  });

  it("allCategories() returns the full category list", () => {
    expect(registry.allCategories()).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(registry.allCategories()[0]).toBe(DEFAULT_CATEGORIES[0]);
  });
});
