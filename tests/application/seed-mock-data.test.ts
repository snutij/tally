import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type Database from "better-sqlite3";
import { openDatabase } from "../../src/infrastructure/persistence/sqlite-repository.js";
import { SeedMockData } from "../../src/application/usecase/seed-mock-data.js";
import { PlanBudget } from "../../src/application/usecase/plan-budget.js";
import { Month } from "../../src/domain/value-object/month.js";

describe("SeedMockData", () => {
  let tmpDir: string;
  let db: Database.Database;
  let seedMockData: SeedMockData;
  let planBudget: PlanBudget;

  const month = Month.from("2026-03");

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "tally-mock-"));
    const { db: database, budgetRepo, txnRepo } = openDatabase(join(tmpDir, "test.db"));
    db = database;
    seedMockData = new SeedMockData(txnRepo, budgetRepo);
    planBudget = new PlanBudget(budgetRepo);
  });

  afterEach(() => {
    db.close();
    rmSync(tmpDir, { recursive: true });
  });

  it("saves transactions and creates budget on fresh DB", () => {
    const result = seedMockData.execute(month);

    expect(result.transactionCount).toBeGreaterThanOrEqual(15);
    expect(result.budgetCreated).toBe(true);

    const budget = planBudget.get(month);
    expect(budget).not.toBeNull();
    if (!budget) {
      return;
    }
    expect(budget.lines.some((l) => l.amount.cents > 0)).toBe(true);
  });

  it("skips budget creation when budget already exists", () => {
    planBudget.initFromDefaults(month);

    const result = seedMockData.execute(month);

    expect(result.transactionCount).toBeGreaterThanOrEqual(15);
    expect(result.budgetCreated).toBe(false);
  });

  it("is idempotent — re-running succeeds", () => {
    seedMockData.execute(month);
    const result = seedMockData.execute(month);

    expect(result.transactionCount).toBeGreaterThanOrEqual(15);
    expect(result.budgetCreated).toBe(false);
  });
});
