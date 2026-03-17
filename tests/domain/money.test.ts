import { describe, expect, it } from "vitest";
import { Money } from "../../src/domain/value-object/money.js";

describe("Money", () => {
  it("creates from cents", () => {
    const amt = Money.fromCents(1050);
    expect(amt.cents).toBe(1050);
  });

  it("creates from euros", () => {
    const amt = Money.fromEuros(10.5);
    expect(amt.cents).toBe(1050);
  });

  it("rejects non-integer cents", () => {
    expect(() => Money.fromCents(10.5)).toThrow();
  });

  it("adds two amounts", () => {
    const m1 = Money.fromCents(100);
    const m2 = Money.fromCents(250);
    expect(m1.add(m2).cents).toBe(350);
  });

  it("subtracts two amounts", () => {
    const m1 = Money.fromCents(500);
    const m2 = Money.fromCents(200);
    expect(m1.subtract(m2).cents).toBe(300);
  });

  it("formats as number string without currency symbol", () => {
    expect(Money.fromCents(1050).format()).toBe("10.50");
    expect(Money.fromCents(-1050).format()).toBe("-10.50");
    expect(Money.zero().format()).toBe("0.00");
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
    const sum = Money.fromEuros(0.1).add(Money.fromEuros(0.2));
    expect(sum.cents).toBe(30);
  });
});
