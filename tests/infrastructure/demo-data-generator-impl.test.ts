import { describe, expect, it } from "vitest";
import { DemoDataGeneratorImpl } from "../../src/infrastructure/mock/demo-data-generator-impl.js";

describe("DemoDataGeneratorImpl", () => {
  const generator = new DemoDataGeneratorImpl();

  it("returns transactions for a known demo month", () => {
    const txns = generator.generate(2026, 1);
    expect(txns.length).toBeGreaterThan(0);
  });

  it("returns empty array for a year outside the demo range", () => {
    const txns = generator.generate(2020, 1);
    expect(txns).toEqual([]);
  });

  it("returns empty array for a month outside the demo range (year 2026)", () => {
    const txns = generator.generate(2026, 7);
    expect(txns).toEqual([]);
  });

  it("all transactions have valid amounts and dates", () => {
    for (const month of [1, 2, 3, 4, 5, 6]) {
      const txns = generator.generate(2026, month);
      for (const txn of txns) {
        expect(txn.amount.toEuros()).not.toBeNaN();
        expect(txn.date.year).toBe(2026);
        expect(txn.date.month).toBe(month);
      }
    }
  });
});
