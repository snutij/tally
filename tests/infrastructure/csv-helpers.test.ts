import { describe, it, expect } from "vitest";
import {
  parseFrenchDate,
  parseEuroAmount,
} from "../../src/infrastructure/bank/csv-helpers.js";
import { InvalidCsvData } from "../../src/domain/error/index.js";

describe("parseFrenchDate", () => {
  it("parses DD/MM/YYYY into Date and isoDate", () => {
    const result = parseFrenchDate("15/03/2026");
    expect(result.isoDate).toBe("2026-03-15");
    expect(result.date.toISOString()).toBe("2026-03-15T00:00:00.000Z");
  });

  it("throws InvalidCsvData for malformed date", () => {
    expect(() => parseFrenchDate("2026-03-15")).toThrow(InvalidCsvData);
  });

  it("throws InvalidCsvData for non-numeric parts", () => {
    expect(() => parseFrenchDate("ab/cd/efgh")).toThrow(InvalidCsvData);
  });
});

describe("parseEuroAmount", () => {
  it("parses comma-decimal amount", () => {
    expect(parseEuroAmount("1 234,56")).toBe(1234.56);
  });

  it("parses negative amount", () => {
    expect(parseEuroAmount("-42,50")).toBe(-42.5);
  });

  it("parses dot-decimal amount", () => {
    expect(parseEuroAmount("10.99")).toBe(10.99);
  });

  it("throws InvalidCsvData on non-numeric string", () => {
    expect(() => parseEuroAmount("abc")).toThrow(InvalidCsvData);
  });

  it("throws InvalidCsvData on empty string", () => {
    expect(() => parseEuroAmount("")).toThrow(InvalidCsvData);
  });
});
