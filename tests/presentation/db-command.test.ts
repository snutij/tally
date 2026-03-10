import { beforeEach, describe, expect, it, vi } from "vitest";
import { Command } from "commander";

vi.mock("node:fs", async () => {
  const actual: typeof import("node:fs") = await vi.importActual("node:fs");
  return { ...actual, existsSync: vi.fn(), unlinkSync: vi.fn() };
});

vi.mock("../../src/infrastructure/persistence/data-dir.js", () => ({
  dbPath: "/fake/tally.db",
}));

import { existsSync, unlinkSync } from "node:fs";
import { createDbCommand } from "../../src/presentation/command/db-command.js";

describe("createDbCommand", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(existsSync).mockReset();
    vi.mocked(unlinkSync).mockReset();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  function run(...args: string[]): Promise<unknown> {
    const cmd = createDbCommand();
    const program = new Command().addCommand(cmd);
    return program.parseAsync(["node", "tally", "db", ...args]);
  }

  it("reset deletes DB when it exists", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    await run("reset");
    expect(unlinkSync).toHaveBeenCalledWith("/fake/tally.db");
    expect(console.log).toHaveBeenCalledWith("Deleted /fake/tally.db");
  });

  it("reset logs message when no DB exists", async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    await run("reset");
    expect(unlinkSync).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("No database found — nothing to reset.");
  });

  it("path logs the dbPath", async () => {
    await run("path");
    expect(console.log).toHaveBeenCalledWith("/fake/tally.db");
  });
});
