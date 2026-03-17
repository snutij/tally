import { DEFAULT_CATEGORIES, buildCategoryMap } from "../../src/domain/default-categories.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Command } from "commander";
import { DEFAULT_SPENDING_TARGETS } from "../../src/domain/config/spending-targets.js";
import type { GenerateReport } from "../../src/application/usecase/generate-report.js";
import { Month } from "../../src/domain/value-object/month.js";
import { computeMonthlyReport } from "../../src/domain/service/compute-monthly-report.js";
import { createReportCommand } from "../../src/presentation/command/report-command.js";

const categoryMap = buildCategoryMap(DEFAULT_CATEGORIES);

describe("createReportCommand", () => {
  const mockGenerateReport = { execute: vi.fn() };
  const mockRenderer = { render: vi.fn((data: unknown) => JSON.stringify(data)) };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.exitCode = 0;
  });

  function run(...args: string[]): Promise<unknown> {
    const cmd = createReportCommand(mockGenerateReport as unknown as GenerateReport, mockRenderer);
    return new Command().addCommand(cmd).parseAsync(["node", "tally", "report", ...args]);
  }

  it("calls execute with default targets when no flags", async () => {
    const report = computeMonthlyReport(
      Month.from("2026-03"),
      DEFAULT_SPENDING_TARGETS,
      [],
      categoryMap,
    );
    mockGenerateReport.execute.mockReturnValue(report);

    await run("2026-03");

    expect(mockGenerateReport.execute).toHaveBeenCalledWith(
      Month.from("2026-03"),
      DEFAULT_SPENDING_TARGETS,
    );
    expect(console.log).toHaveBeenCalled();
  });

  it("passes custom targets when all three flags provided", async () => {
    const report = computeMonthlyReport(
      Month.from("2026-03"),
      DEFAULT_SPENDING_TARGETS,
      [],
      categoryMap,
    );
    mockGenerateReport.execute.mockReturnValue(report);

    await run("2026-03", "--needs", "60", "--wants", "20", "--invest", "20");

    expect(mockGenerateReport.execute).toHaveBeenCalledWith(Month.from("2026-03"), {
      invest: 20,
      needs: 60,
      wants: 20,
    });
  });

  it("errors when percentages do not sum to 100", async () => {
    await run("2026-03", "--needs", "50", "--wants", "30", "--invest", "30");

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("sum to 100"));
    expect(process.exitCode).toBe(1);
  });

  it("errors when only some flags are provided", async () => {
    await run("2026-03", "--needs", "60");

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("must be provided together"),
    );
    expect(process.exitCode).toBe(1);
  });

  it("throws on invalid month format", async () => {
    const cmd = createReportCommand(mockGenerateReport as unknown as GenerateReport, mockRenderer);
    const program = new Command().addCommand(cmd);
    program.exitOverride();
    await expect(program.parseAsync(["node", "tally", "report", "not-a-month"])).rejects.toThrow();
  });
});
