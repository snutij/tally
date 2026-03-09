import { describe, it, expect } from "vitest";
import {
  DomainError,
  InvalidMonth,
  BudgetAlreadyExists,
  UnknownBankAdapter,
  InvalidCsvData,
} from "../../src/domain/error/index.js";

describe("DomainError hierarchy", () => {
  const cases: Array<[string, DomainError]> = [
    ["InvalidMonth", new InvalidMonth("bad")],
    ["BudgetAlreadyExists", new BudgetAlreadyExists("2026-03")],
    ["UnknownBankAdapter", new UnknownBankAdapter("nope")],
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
