import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { Month } from "../../src/domain/value-object/month.js";
import { SeedMockData } from "../../src/application/usecase/seed-mock-data.js";
import { join } from "node:path";
import { openDatabase } from "../../src/infrastructure/persistence/sqlite-repository.js";
import { tmpdir } from "node:os";

describe("SeedMockData", () => {
  let tmpDir: string;
  let close: () => void;
  let seedMockData: SeedMockData;

  const month = Month.from("2026-03");

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "tally-mock-"));
    const { close: closeDb, txnRepo } = openDatabase(join(tmpDir, "test.db"));
    close = closeDb;
    seedMockData = new SeedMockData(txnRepo);
  });

  afterEach(() => {
    close();
    rmSync(tmpDir, { recursive: true });
  });

  it("saves transactions and returns count", () => {
    const result = seedMockData.execute(month);
    expect(result.transactionCount).toBeGreaterThanOrEqual(15);
  });

  it("is idempotent — re-running succeeds", () => {
    seedMockData.execute(month);
    const result = seedMockData.execute(month);
    expect(result.transactionCount).toBeGreaterThanOrEqual(15);
  });
});
