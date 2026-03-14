import { beforeEach, describe, expect, it, vi } from "vitest";
import { Budget } from "../../src/domain/entity/budget.js";
import { Command } from "commander";
import { Month } from "../../src/domain/value-object/month.js";
import { MonthlyReport } from "../../src/domain/entity/monthly-report.js";
import { createReportCommand } from "../../src/presentation/command/report-command.js";

describe("createReportCommand", () => {
  const mockGenerateReport = { execute: vi.fn() };
  const mockRenderer = { render: vi.fn((data: unknown) => JSON.stringify(data)) };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("calls execute and logs rendered report", async () => {
    const report = MonthlyReport.compute(new Budget(Month.from("2026-03"), []), []);
    mockGenerateReport.execute.mockReturnValue(report);

    const cmd = createReportCommand(mockGenerateReport, mockRenderer);
    const program = new Command().addCommand(cmd);
    await program.parseAsync(["node", "tally", "report", "2026-03"]);

    expect(mockGenerateReport.execute).toHaveBeenCalledWith(Month.from("2026-03"));
    expect(console.log).toHaveBeenCalled();
  });

  it("throws on invalid month format", async () => {
    const cmd = createReportCommand(mockGenerateReport, mockRenderer);
    const program = new Command().addCommand(cmd);
    program.exitOverride();

    await expect(program.parseAsync(["node", "tally", "report", "not-a-month"])).rejects.toThrow();
  });

  it("works with empty report (no data)", async () => {
    const emptyReport = MonthlyReport.compute(new Budget(Month.from("2026-01"), []), []);
    mockGenerateReport.execute.mockReturnValue(emptyReport);

    const cmd = createReportCommand(mockGenerateReport, mockRenderer);
    const program = new Command().addCommand(cmd);
    await program.parseAsync(["node", "tally", "report", "2026-01"]);

    expect(mockGenerateReport.execute).toHaveBeenCalledWith(Month.from("2026-01"));
    expect(mockRenderer.render).toHaveBeenCalledWith(emptyReport);
  });
});
