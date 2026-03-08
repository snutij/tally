import { describe, it, expect } from "vitest";
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
});
