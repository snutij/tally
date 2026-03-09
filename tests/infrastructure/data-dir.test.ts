import { describe, it, expect } from "vitest";
import { dataDir, dbPath } from "../../src/infrastructure/persistence/data-dir.js";

describe("data-dir", () => {
  it("dataDir ends with .local/share/tally", () => {
    expect(dataDir).toMatch(/\.local\/share\/tally$/);
  });

  it("dbPath ends with .local/share/tally/tally.db", () => {
    expect(dbPath).toMatch(/\.local\/share\/tally\/tally\.db$/);
  });
});
