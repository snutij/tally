import { describe, expect, it } from "vitest";
import { detectDateFormat } from "../../../src/infrastructure/csv/detect-date-format.js";

describe("detectDateFormat", () => {
  it("detects YYYY-MM-DD confidently", () => {
    const result = detectDateFormat(["2026-03-15", "2026-04-01"]);
    expect(result.value).toBe("YYYY-MM-DD");
    expect(result.confident).toBe(true);
  });

  it("detects DD/MM/YYYY when day > 12", () => {
    const result = detectDateFormat(["15/03/2026", "20/04/2026"]);
    expect(result.value).toBe("DD/MM/YYYY");
    expect(result.confident).toBe(true);
  });

  it("detects MM/DD/YYYY when month-position component > 12", () => {
    const result = detectDateFormat(["03/15/2026", "04/20/2026"]);
    expect(result.value).toBe("MM/DD/YYYY");
    expect(result.confident).toBe(true);
  });

  it("returns DD/MM/YYYY (not confident) when ambiguous", () => {
    // all values have day and month ≤ 12
    const result = detectDateFormat(["01/03/2026", "05/06/2026"]);
    expect(result.value).toBe("DD/MM/YYYY");
    expect(result.confident).toBe(false);
  });

  it("detects DD-MM-YYYY when day > 12 with dash separator", () => {
    const result = detectDateFormat(["15-03-2026"]);
    expect(result.value).toBe("DD-MM-YYYY");
    expect(result.confident).toBe(true);
  });

  it("returns DD-MM-YYYY (not confident) when ambiguous with dashes", () => {
    const result = detectDateFormat(["01-03-2026", "05-06-2026"]);
    expect(result.value).toBe("DD-MM-YYYY");
    expect(result.confident).toBe(false);
  });

  it("returns default when no samples", () => {
    const result = detectDateFormat([]);
    expect(result.confident).toBe(false);
  });
});
