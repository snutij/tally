import { describe, expect, it } from "vitest";
import { detectDelimiter } from "../../../src/infrastructure/csv/detect-delimiter.js";

describe("detectDelimiter", () => {
  it("detects semicolon delimiter confidently", () => {
    const lines = ["Date;Label;Amount", "01/03/2026;Rent;-800,00", "05/03/2026;Groceries;-42,50"];
    const result = detectDelimiter(lines);
    expect(result.value).toBe(";");
    expect(result.confident).toBe(true);
  });

  it("detects comma delimiter confidently", () => {
    const lines = ["Date,Label,Amount", "2026-03-01,Rent,-800.00", "2026-03-05,Groceries,-42.50"];
    const result = detectDelimiter(lines);
    expect(result.value).toBe(",");
    expect(result.confident).toBe(true);
  });

  it("detects tab delimiter confidently", () => {
    const lines = ["Date\tLabel\tAmount", "2026-03-01\tRent\t-800.00"];
    const result = detectDelimiter(lines);
    expect(result.value).toBe("\t");
    expect(result.confident).toBe(true);
  });

  it("returns not confident when ambiguous", () => {
    // A CSV where both ; and , produce consistent columns (e.g., a single-column file with neither)
    const lines = ["just one value", "another value"];
    const result = detectDelimiter(lines);
    expect(result.confident).toBe(false);
  });

  it("handles empty lines gracefully", () => {
    const result = detectDelimiter([]);
    expect(result.confident).toBe(false);
  });

  it("ignores blank lines when detecting", () => {
    const lines = ["Date;Label;Amount", "", "01/03/2026;Rent;-800,00"];
    const result = detectDelimiter(lines);
    expect(result.value).toBe(";");
    expect(result.confident).toBe(true);
  });

  it("picks delimiter with most columns when multiple are consistent", () => {
    // Both semicolon and comma are consistent, but comma produces more columns
    const lines = ["a;b,c,d;e,f,g", "h;i,j,k;l,m,n"];
    const result = detectDelimiter(lines);
    expect(result.value).toBe(",");
    expect(result.confident).toBe(false);
  });
});
