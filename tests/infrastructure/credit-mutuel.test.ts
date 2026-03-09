import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { CreditMutuelImporter } from "../../src/infrastructure/bank/credit-mutuel.js";

describe("CreditMutuelImporter", () => {
  const importer = new CreditMutuelImporter();
  const fixturePath = join(import.meta.dirname, "../fixtures/credit-mutuel-sample.csv");

  it("has correct bank name", () => {
    expect(importer.bankName).toBe("credit-mutuel");
  });

  it("parses CSV into transactions", () => {
    const transactions = importer.parse(fixturePath);
    expect(transactions).toHaveLength(4);
  });

  it("parses debit amounts as negative", () => {
    const transactions = importer.parse(fixturePath);
    const rent = transactions[0];
    expect(rent.amount.cents).toBe(-80000);
    expect(rent.label).toBe("RENT MARCH 2026");
  });

  it("parses credit amounts as positive", () => {
    const transactions = importer.parse(fixturePath);
    const salary = transactions[2];
    expect(salary.amount.cents).toBe(250000);
    expect(salary.label).toBe("SALARY TRANSFER");
  });

  it("parses dates correctly", () => {
    const transactions = importer.parse(fixturePath);
    expect(transactions[0].date.toString()).toBe("2026-03-01");
  });

  it("sets sourceBank", () => {
    const transactions = importer.parse(fixturePath);
    expect(transactions[0].sourceBank).toBe("credit-mutuel");
  });

  it("decodes Latin-1 encoded CSV", () => {
    const latin1Path = join(import.meta.dirname, "../fixtures/credit-mutuel-latin1.csv");
    const transactions = importer.parse(latin1Path);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].label).toBe("LOYER MARS 2026");
    expect(transactions[0].amount.cents).toBe(-80000);
  });

  it("uses fuzzy column match when header has decomposed accent", () => {
    const fuzzyPath = join(import.meta.dirname, "../fixtures/credit-mutuel-fuzzy.csv");
    const transactions = importer.parse(fuzzyPath);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].label).toBe("LOYER MARS 2026");
  });

  it("returns empty string when column is not found", () => {
    const missingColPath = join(import.meta.dirname, "../fixtures/credit-mutuel-missing-col.csv");
    const transactions = importer.parse(missingColPath);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].label).toBe("");
  });
});
