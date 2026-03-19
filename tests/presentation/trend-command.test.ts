import { beforeEach, describe, expect, it, vi } from "vitest";
import { Command } from "commander";
import { DEFAULT_SPENDING_TARGETS } from "../../src/domain/config/spending-targets.js";
import type { GenerateTrend } from "../../src/application/usecase/generate-trend.js";
import { createTrendCommand } from "../../src/presentation/command/trend-command.js";

describe("createTrendCommand", () => {
  const mockGenerateTrend = { execute: vi.fn() };
  const mockRenderer = { render: vi.fn((data: unknown) => JSON.stringify(data)) };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.exitCode = 0;
    mockGenerateTrend.execute.mockReturnValue({ _type: "TrendReportDto" });
  });

  function run(...args: string[]): Promise<unknown> {
    const cmd = createTrendCommand(mockGenerateTrend as unknown as GenerateTrend, mockRenderer);
    return new Command().addCommand(cmd).parseAsync(["node", "tally", "trend", ...args]);
  }

  it("calls execute with start, end and default targets", async () => {
    await run("2026-01", "2026-03");

    expect(mockGenerateTrend.execute).toHaveBeenCalledWith(
      "2026-01",
      "2026-03",
      DEFAULT_SPENDING_TARGETS,
    );
    expect(console.log).toHaveBeenCalled();
  });

  it("passes custom targets when all three flags provided", async () => {
    await run("2026-01", "2026-03", "--needs", "60", "--wants", "20", "--invest", "20");

    expect(mockGenerateTrend.execute).toHaveBeenCalledWith("2026-01", "2026-03", {
      invest: 20,
      needs: 60,
      wants: 20,
    });
  });

  it("errors when percentages do not sum to 100", async () => {
    await run("2026-01", "2026-03", "--needs", "50", "--wants", "30", "--invest", "30");

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("sum to 100"));
    expect(process.exitCode).toBe(1);
  });

  it("errors when only some flags are provided", async () => {
    await run("2026-01", "2026-03", "--needs", "60");

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("must be provided together"),
    );
    expect(process.exitCode).toBe(1);
  });
});
