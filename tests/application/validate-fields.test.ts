import { describe, expect, it } from "vitest";
import { validateFields } from "../../src/application/dto/csv-mapping-config.js";

describe("validateFields", () => {
  it("returns error when date column is missing", () => {
    expect(validateFields(["label", "amount"])).toBe("Column mapping must include a 'date' column");
  });

  it("returns error when label column is missing", () => {
    expect(validateFields(["date", "amount"])).toBe("Column mapping must include a 'label' column");
  });

  it("returns error when no amount/expense/income column is present", () => {
    expect(validateFields(["date", "label"])).toBe(
      "Column mapping must include an 'amount', 'expense', or 'income' column",
    );
  });

  it("returns undefined for valid mapping with amount", () => {
    expect(validateFields(["date", "label", "amount"])).toBeUndefined();
  });

  it("returns undefined for valid mapping with expense", () => {
    expect(validateFields(["date", "label", "expense"])).toBeUndefined();
  });

  it("returns undefined for valid mapping with income", () => {
    expect(validateFields(["date", "label", "income"])).toBeUndefined();
  });

  it("returns undefined when extra ignored columns are present", () => {
    expect(validateFields(["date", "label", "amount", "ignore"])).toBeUndefined();
  });
});
