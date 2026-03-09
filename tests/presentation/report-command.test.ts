import { describe, it, expect, vi, beforeEach } from "vitest";
import { Command } from "commander";
import { createReportCommand } from "../../src/presentation/command/report-command.js";
import { MonthlyReport } from "../../src/domain/entity/monthly-report.js";
import { Budget } from "../../src/domain/entity/budget.js";
import { Month } from "../../src/domain/value-object/month.js";

describe("createReportCommand", () => {
  const mockGenerateReport = { execute: vi.fn() };
  const mockRenderer = { render: vi.fn((d: unknown) => JSON.stringify(d)) };

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
});
