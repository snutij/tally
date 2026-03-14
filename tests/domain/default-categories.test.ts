import { describe, expect, it } from "vitest";
import { CategoryGroup } from "../../src/domain/value-object/category-group.js";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";

describe("Default Categories", () => {
  it("has 33 categories", () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(33);
  });

  it("has 17 NEEDS categories", () => {
    const needs = DEFAULT_CATEGORIES.filter((cat) => cat.group === CategoryGroup.NEEDS);
    expect(needs).toHaveLength(17);
  });

  it("has 8 WANTS categories", () => {
    const wants = DEFAULT_CATEGORIES.filter((cat) => cat.group === CategoryGroup.WANTS);
    expect(wants).toHaveLength(8);
  });

  it("has 4 INVESTMENTS categories", () => {
    const investments = DEFAULT_CATEGORIES.filter((cat) => cat.group === CategoryGroup.INVESTMENTS);
    expect(investments).toHaveLength(4);
  });

  it("has 4 INCOME categories", () => {
    const income = DEFAULT_CATEGORIES.filter((cat) => cat.group === CategoryGroup.INCOME);
    expect(income).toHaveLength(4);
  });

  it("has unique IDs", () => {
    const ids = DEFAULT_CATEGORIES.map((cat) => cat.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
