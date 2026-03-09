import { describe, expect, it } from "vitest";
import { Month } from "../../src/domain/value-object/month.js";
import { InvalidMonth } from "../../src/domain/error/index.js";

describe("Month", () => {
  it("creates from valid string", () => {
    const m = Month.from("2026-03");
    expect(m.value).toBe("2026-03");
    expect(m.year).toBe(2026);
    expect(m.month).toBe(3);
  });

  it("rejects invalid format", () => {
    expect(() => Month.from("2026-3")).toThrow(InvalidMonth);
    expect(() => Month.from("2026/03")).toThrow(InvalidMonth);
    expect(() => Month.from("march-2026")).toThrow(InvalidMonth);
    expect(() => Month.from("")).toThrow(InvalidMonth);
  });

  it("rejects invalid month numbers", () => {
    expect(() => Month.from("2026-00")).toThrow(InvalidMonth);
    expect(() => Month.from("2026-13")).toThrow(InvalidMonth);
  });

  it("compares equality", () => {
    expect(Month.from("2026-03").equals(Month.from("2026-03"))).toBe(true);
    expect(Month.from("2026-03").equals(Month.from("2026-04"))).toBe(false);
  });

  it("converts to string", () => {
    expect(Month.from("2026-03").toString()).toBe("2026-03");
  });

  it("returns days in month for regular months", () => {
    expect(Month.from("2024-01").daysInMonth()).toBe(31);
    expect(Month.from("2024-04").daysInMonth()).toBe(30);
    expect(Month.from("2024-06").daysInMonth()).toBe(30);
    expect(Month.from("2024-12").daysInMonth()).toBe(31);
  });

  it("returns 29 for February in a leap year", () => {
    expect(Month.from("2024-02").daysInMonth()).toBe(29);
  });

  it("returns 28 for February in a non-leap year", () => {
    expect(Month.from("2025-02").daysInMonth()).toBe(28);
  });
});
