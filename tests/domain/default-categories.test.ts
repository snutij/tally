import { describe, it, expect } from "vitest";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";
import { CategoryGroup } from "../../src/domain/value-object/category-group.js";

describe("Default Categories", () => {
  it("has 27 categories", () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(27);
  });

  it("has 15 NEEDS categories", () => {
    const needs = DEFAULT_CATEGORIES.filter(
      (c) => c.group === CategoryGroup.NEEDS,
    );
    expect(needs).toHaveLength(15);
  });

  it("has 7 WANTS categories", () => {
    const wants = DEFAULT_CATEGORIES.filter(
      (c) => c.group === CategoryGroup.WANTS,
    );
    expect(wants).toHaveLength(7);
  });

  it("has 5 INVESTMENTS categories", () => {
    const investments = DEFAULT_CATEGORIES.filter(
      (c) => c.group === CategoryGroup.INVESTMENTS,
    );
    expect(investments).toHaveLength(5);
  });

  it("has unique IDs", () => {
    const ids = DEFAULT_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
