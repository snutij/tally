import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { DemoDataGeneratorImpl } from "../../src/infrastructure/mock/demo-data-generator-impl.js";
import { InvalidMonth } from "../../src/domain/error/index.js";
import { SeedMockData } from "../../src/application/usecase/seed-mock-data.js";
import { Sha256IdGenerator } from "../../src/infrastructure/id/sha256-id-generator.js";
import { join } from "node:path";
import { openDatabase } from "../../src/infrastructure/persistence/sqlite-repository.js";
import { tmpdir } from "node:os";

describe("SeedMockData", () => {
  let tmpDir: string;
  let close: () => void;
  let seedMockData: SeedMockData;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "tally-mock-"));
    const { close: closeDb, txnRepository } = openDatabase(
      join(tmpDir, "test.db"),
      new Sha256IdGenerator(),
    );
    close = closeDb;
    seedMockData = new SeedMockData(txnRepository, new DemoDataGeneratorImpl());
  });

  afterEach(() => {
    close();
    rmSync(tmpDir, { recursive: true });
  });

  it("saves transactions and returns count", () => {
    const result = seedMockData.execute("2026-03");
    expect(result.transactionCount).toBeGreaterThanOrEqual(15);
  });

  it("throws InvalidMonth for invalid month string", () => {
    expect(() => seedMockData.execute("not-a-month")).toThrow(InvalidMonth);
  });

  it("is idempotent — re-running succeeds", () => {
    seedMockData.execute("2026-03");
    const result = seedMockData.execute("2026-03");
    expect(result.transactionCount).toBeGreaterThanOrEqual(15);
  });
});
