import { describe, it, expect } from "vitest";
import { DateOnly } from "../../src/domain/value-object/date-only.js";

describe("DateOnly", () => {
  it("creates from ISO string", () => {
    const d = DateOnly.from("2026-03-15");
    expect(d.toString()).toBe("2026-03-15");
  });

  it("creates from Date object", () => {
    const d = DateOnly.from(new Date("2026-03-15"));
    expect(d.toString()).toBe("2026-03-15");
  });

  it("converts to Date", () => {
    const d = DateOnly.from("2026-03-15");
    expect(d.toDate()).toEqual(new Date("2026-03-15"));
  });

  it("serializes via toJSON", () => {
    const d = DateOnly.from("2026-03-15");
    expect(JSON.stringify(d)).toBe('"2026-03-15"');
  });
});
