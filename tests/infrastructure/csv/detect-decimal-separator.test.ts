import { describe, expect, it } from "vitest";
import { detectDecimalSeparator } from "../../../src/infrastructure/csv/detect-decimal-separator.js";

describe("detectDecimalSeparator", () => {
  it("detects comma as decimal separator (European format)", () => {
    const result = detectDecimalSeparator(["1 234,56", "-42,50"]);
    expect(result.value).toBe(",");
    expect(result.confident).toBe(true);
  });

  it("detects dot as decimal separator (Anglo-Saxon format)", () => {
    const result = detectDecimalSeparator(["1,234.56", "-42.50"]);
    expect(result.value).toBe(".");
    expect(result.confident).toBe(true);
  });

  it("detects comma from simple negative amount", () => {
    const result = detectDecimalSeparator(["-25,00"]);
    expect(result.value).toBe(",");
    expect(result.confident).toBe(true);
  });

  it("detects dot from simple positive amount", () => {
    const result = detectDecimalSeparator(["100.00"]);
    expect(result.value).toBe(".");
    expect(result.confident).toBe(true);
  });

  it("defaults to dot for integer amounts", () => {
    const result = detectDecimalSeparator(["1234", "-42", "0"]);
    expect(result.value).toBe(".");
    expect(result.confident).toBe(true);
  });

  it("handles empty samples", () => {
    const result = detectDecimalSeparator([]);
    expect(result.value).toBe(".");
  });

  it("strips currency symbols before detecting", () => {
    const result = detectDecimalSeparator(["€ 1 234,56"]);
    expect(result.value).toBe(",");
    expect(result.confident).toBe(true);
  });
});
