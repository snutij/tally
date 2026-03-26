import { beforeEach, describe, expect, it, vi } from "vitest";
import { Command } from "commander";
import type { GenerateReport } from "../../src/application/usecase/generate-report.js";
import { createReportCommand } from "../../src/presentation/command/report-command.js";

describe("createReportCommand", () => {
  const mockGenerateReport = { execute: vi.fn() };
  const mockRenderer = { render: vi.fn((data: unknown) => JSON.stringify(data)) };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.exitCode = 0;
    mockGenerateReport.execute.mockReturnValue({
      _type: "ReportDto",
      months: [],
      range: null,
      trend: null,
    });
  });

  function run(...args: string[]): Promise<unknown> {
    const cmd = createReportCommand(mockGenerateReport as unknown as GenerateReport, mockRenderer);
    return new Command().addCommand(cmd).parseAsync(["node", "tally", "report", ...args]);
  }

  it("calls execute with no arguments and renders result", async () => {
    await run();

    expect(mockGenerateReport.execute).toHaveBeenCalledWith();
    expect(console.log).toHaveBeenCalled();
  });
});
