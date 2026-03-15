import { beforeEach, describe, expect, it, vi } from "vitest";
import { Budget } from "../../src/domain/entity/budget.js";
import { Command } from "commander";
import { Month } from "../../src/domain/value-object/month.js";
import type { PlanBudget } from "../../src/application/usecase/plan-budget.js";
import { createBudgetCommand } from "../../src/presentation/command/budget-command.js";

describe("createBudgetCommand", () => {
  const mockPlanBudget = {
    get: vi.fn(),
    initFromDefaults: vi.fn(),
  };
  const mockRenderer = { render: vi.fn((data: unknown) => JSON.stringify(data)) };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  function run(...args: string[]): Promise<unknown> {
    const cmd = createBudgetCommand(mockPlanBudget as unknown as PlanBudget, mockRenderer);
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
    // eslint-disable-next-line unicorn/no-null -- simulates BudgetRepository returning null for missing budget
    mockPlanBudget.get.mockReturnValue(null);

    await run("show", "2026-03");

    expect(console.error).toHaveBeenCalledWith("No budget found for 2026-03");
    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;
  });
});
