import { describe, expect, it } from "vitest";
import { InvalidMonthRange } from "../../src/domain/error/index.js";
import { MonthRange } from "../../src/domain/value-object/month-range.js";

describe("MonthRange", () => {
  describe("from()", () => {
    it("creates a valid range", () => {
      const range = MonthRange.from("2026-01", "2026-03");
      expect(range.start.value).toBe("2026-01");
      expect(range.end.value).toBe("2026-03");
    });

    it("accepts equal start and end (single-month range)", () => {
      const range = MonthRange.from("2026-06", "2026-06");
      expect(range.start.value).toBe("2026-06");
      expect(range.end.value).toBe("2026-06");
    });

    it("throws InvalidMonthRange when start is after end", () => {
      expect(() => MonthRange.from("2026-06", "2026-01")).toThrow(InvalidMonthRange);
    });

    it("throws InvalidMonth for invalid month strings", () => {
      expect(() => MonthRange.from("2026-13", "2026-06")).toThrow();
    });
  });

  describe("months()", () => {
    it("iterates a standard range", () => {
      const months = MonthRange.from("2026-01", "2026-03").months();
      expect(months.map((mo) => mo.value)).toEqual(["2026-01", "2026-02", "2026-03"]);
    });

    it("returns a single month for a single-month range", () => {
      const months = MonthRange.from("2026-03", "2026-03").months();
      expect(months.map((mo) => mo.value)).toEqual(["2026-03"]);
    });

    it("crosses year boundaries correctly", () => {
      const months = MonthRange.from("2025-11", "2026-02").months();
      expect(months.map((mo) => mo.value)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    });

    it("handles December → January increment", () => {
      const months = MonthRange.from("2025-12", "2026-01").months();
      expect(months.map((mo) => mo.value)).toEqual(["2025-12", "2026-01"]);
    });
  });
});
