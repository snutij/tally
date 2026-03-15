import { DomainError, InvalidCsvData, InvalidMonth } from "../../src/domain/error/index.js";
import { describe, expect, it } from "vitest";

describe("DomainError hierarchy", () => {
  const cases: [string, DomainError][] = [
    ["InvalidMonth", new InvalidMonth("bad")],
    ["InvalidCsvData", new InvalidCsvData("broken")],
  ];

  it.each(cases)("%s is instanceof DomainError", (_name, error) => {
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(Error);
  });

  it.each(cases)("%s has correct name", (name, error) => {
    expect(error.name).toBe(name);
  });
});
