import { describe, expect, it } from "vitest";
import { Money } from "../../src/domain/value-object/money.js";

describe("Money", () => {
  it("creates from cents", () => {
    const m = Money.fromCents(1050);
    expect(m.cents).toBe(1050);
  });

  it("creates from euros", () => {
    const m = Money.fromEuros(10.5);
    expect(m.cents).toBe(1050);
  });

  it("rejects non-integer cents", () => {
    expect(() => Money.fromCents(10.5)).toThrow();
  });

  it("adds two amounts", () => {
    const a = Money.fromCents(100);
    const b = Money.fromCents(250);
    expect(a.add(b).cents).toBe(350);
  });

  it("subtracts two amounts", () => {
    const a = Money.fromCents(500);
    const b = Money.fromCents(200);
    expect(a.subtract(b).cents).toBe(300);
  });

  it("formats as EUR string", () => {
    expect(Money.fromCents(1050).format()).toBe("10.50 €");
    expect(Money.fromCents(-1050).format()).toBe("-10.50 €");
    expect(Money.zero().format()).toBe("0.00 €");
  });

  it("converts to euros", () => {
    expect(Money.fromCents(1050).toEuros()).toBe(10.5);
  });

  it("compares equality", () => {
    expect(Money.fromCents(100).equals(Money.fromCents(100))).toBe(true);
    expect(Money.fromCents(100).equals(Money.fromCents(200))).toBe(false);
  });

  it("checks zero/positive/negative", () => {
    expect(Money.zero().isZero()).toBe(true);
    expect(Money.fromCents(100).isPositive()).toBe(true);
    expect(Money.fromCents(-100).isNegative()).toBe(true);
  });

  it("negates a positive amount", () => {
    expect(Money.fromEuros(5).negate().toEuros()).toBe(-5);
  });

  it("avoids floating point issues with fromEuros", () => {
    // 0.1 + 0.2 = 0.30000000000000004 in JS
    const m = Money.fromEuros(0.1).add(Money.fromEuros(0.2));
    expect(m.cents).toBe(30);
  });
});
