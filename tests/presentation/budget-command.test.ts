import { describe, it, expect, vi, beforeEach } from "vitest";
import { Command } from "commander";
import { createBudgetCommand } from "../../src/presentation/command/budget-command.js";
import { Budget } from "../../src/domain/entity/budget.js";
import { Month } from "../../src/domain/value-object/month.js";

describe("createBudgetCommand", () => {
  const mockPlanBudget = {
    initFromDefaults: vi.fn(),
    get: vi.fn(),
  };
  const mockRenderer = { render: vi.fn((d: unknown) => JSON.stringify(d)) };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  function run(...args: string[]) {
    const cmd = createBudgetCommand(mockPlanBudget, mockRenderer);
    const program = new Command().addCommand(cmd);
    return program.parseAsync(["node", "tally", "budget", ...args]);
  }

  it("init calls initFromDefaults and logs result", async () => {
    const budget = new Budget(Month.from("2026-03"), []);
    mockPlanBudget.initFromDefaults.mockReturnValue(budget);

    await run("init", "2026-03");

    expect(mockPlanBudget.initFromDefaults).toHaveBeenCalledWith(Month.from("2026-03"));
    expect(console.log).toHaveBeenCalled();
  });

  it("show logs rendered budget when found", async () => {
    const budget = new Budget(Month.from("2026-03"), []);
    mockPlanBudget.get.mockReturnValue(budget);

    await run("show", "2026-03");

    expect(mockPlanBudget.get).toHaveBeenCalledWith(Month.from("2026-03"));
    expect(console.log).toHaveBeenCalled();
  });

  it("show logs error and sets exitCode when no budget", async () => {
    mockPlanBudget.get.mockReturnValue(null);

    await run("show", "2026-03");

    expect(console.error).toHaveBeenCalledWith("No budget found for 2026-03");
    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;
  });
});
