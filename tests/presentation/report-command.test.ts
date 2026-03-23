import { beforeEach, describe, expect, it, vi } from "vitest";
import { Command } from "commander";
import { DEFAULT_SPENDING_TARGETS } from "../../src/domain/config/spending-targets.js";
import type { GenerateReport } from "../../src/application/usecase/generate-report.js";
import { createReportCommand } from "../../src/presentation/command/report-command.js";

describe("createReportCommand", () => {
  const mockGenerateReport = { execute: vi.fn(), executeAll: vi.fn() };
  const mockRenderer = { render: vi.fn((data: unknown) => JSON.stringify(data)) };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.exitCode = 0;
    mockGenerateReport.execute.mockReturnValue({ _type: "MonthlyReportDto" });
    mockGenerateReport.executeAll.mockReturnValue([{ _type: "MonthlyReportDto" }]);
  });

  function run(...args: string[]): Promise<unknown> {
    const cmd = createReportCommand(mockGenerateReport as unknown as GenerateReport, mockRenderer);
    return new Command().addCommand(cmd).parseAsync(["node", "tally", "report", ...args]);
  }

  it("calls executeAll with default targets when no flags", async () => {
    await run();

    expect(mockGenerateReport.executeAll).toHaveBeenCalledWith(DEFAULT_SPENDING_TARGETS);
    expect(console.log).toHaveBeenCalled();
  });

  it("passes custom targets to executeAll when all three flags provided", async () => {
    await run("--needs", "60", "--wants", "20", "--invest", "20");

    expect(mockGenerateReport.executeAll).toHaveBeenCalledWith({
      invest: 20,
      needs: 60,
      wants: 20,
    });
  });

  it("errors when percentages do not sum to 100", async () => {
    await run("--needs", "50", "--wants", "30", "--invest", "30");

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("sum to 100"));
    expect(process.exitCode).toBe(1);
  });

  it("errors when only some flags are provided", async () => {
    await run("--needs", "60");

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("must be provided together"),
    );
    expect(process.exitCode).toBe(1);
  });

  it("supports monthly sub-view via report month <month>", async () => {
    await run("month", "2026-03");

    expect(mockGenerateReport.execute).toHaveBeenCalledWith("2026-03", DEFAULT_SPENDING_TARGETS);
  });

  it("throws on invalid month format in monthly sub-view", async () => {
    mockGenerateReport.execute.mockImplementation(() => {
      throw new Error("Invalid month");
    });
    await expect(run("month", "not-a-month")).rejects.toThrow();
  });
});
