import { describe, expect, it } from "vitest";
import { CategoryId } from "../../src/domain/value-object/category-id.js";

describe("CategoryId", () => {
  it("creates a CategoryId from a string", () => {
    const id = CategoryId.from("n01");
    expect(id.value).toBe("n01");
  });

  it("equals returns true for same value", () => {
    const idA = CategoryId.from("inc01");
    const idB = CategoryId.from("inc01");
    expect(idA.equals(idB)).toBe(true);
  });

  it("equals returns false for different values", () => {
    const idA = CategoryId.from("n01");
    const idB = CategoryId.from("w02");
    expect(idA.equals(idB)).toBe(false);
  });

  it("toString returns the raw value", () => {
    expect(CategoryId.from("w06").toString()).toBe("w06");
  });

  it("toJSON returns the raw value", () => {
    expect(CategoryId.from("i03").toJSON()).toBe("i03");
  });

  it("serializes correctly inside JSON.stringify", () => {
    const obj = { categoryId: CategoryId.from("n02") };
    expect(JSON.stringify(obj)).toBe('{"categoryId":"n02"}');
  });
});
