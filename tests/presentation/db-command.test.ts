import { beforeEach, describe, expect, it, vi } from "vitest";
import { Command } from "commander";

vi.mock("node:fs", async () => {
  const actual: Record<string, unknown> = await vi.importActual("node:fs");
  return { ...actual, existsSync: vi.fn(), unlinkSync: vi.fn() };
});

import { existsSync, unlinkSync } from "node:fs";
import { createDbCommand } from "../../src/presentation/command/db-command.js";

const FAKE_DB_PATH = "/fake/tally.db";

describe("createDbCommand", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(existsSync).mockReset();
    vi.mocked(unlinkSync).mockReset();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  function run(...args: string[]): Promise<unknown> {
    const cmd = createDbCommand(FAKE_DB_PATH);
    const program = new Command().addCommand(cmd);
    return program.parseAsync(["node", "tally", "db", ...args]);
  }

  it("reset deletes DB when it exists", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    await run("reset");
    expect(unlinkSync).toHaveBeenCalledWith(FAKE_DB_PATH);
    expect(console.log).toHaveBeenCalledWith(`Deleted ${FAKE_DB_PATH}`);
  });

  it("reset logs message when no DB exists", async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    await run("reset");
    expect(unlinkSync).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("No database found — nothing to reset.");
  });

  it("path logs the dbPath", async () => {
    await run("path");
    expect(console.log).toHaveBeenCalledWith(FAKE_DB_PATH);
  });
});
