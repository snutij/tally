import { describe, expect, it } from "vitest";
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

  it("rejects invalid format", () => {
    expect(() => DateOnly.from("garbage")).toThrow("Invalid date format");
    expect(() => DateOnly.from("15/03/2026")).toThrow("Invalid date format");
    expect(() => DateOnly.from("2026-3-15")).toThrow("Invalid date format");
  });

  it("rejects impossible dates", () => {
    expect(() => DateOnly.from("2026-02-30")).toThrow("does not exist");
    expect(() => DateOnly.from("2026-04-31")).toThrow("does not exist");
    expect(() => DateOnly.from("2026-13-01")).toThrow("does not exist");
  });

  it("accepts leap year Feb 29", () => {
    const d = DateOnly.from("2024-02-29");
    expect(d.toString()).toBe("2024-02-29");
  });

  it("rejects non-leap year Feb 29", () => {
    expect(() => DateOnly.from("2025-02-29")).toThrow("does not exist");
  });

  it("rejects invalid Date object", () => {
    expect(() => DateOnly.from(new Date("not-a-date"))).toThrow("Invalid Date object");
  });
});
