import { beforeEach, describe, expect, it, vi } from "vitest";
import { Command } from "commander";

vi.mock("node:fs", async () => {
  const actual: Record<string, unknown> = await vi.importActual("node:fs");
  return { ...actual, existsSync: vi.fn() };
});

const mockSpinner = {
  fail: vi.fn(),
  start: vi.fn().mockReturnThis(),
  succeed: vi.fn(),
  text: "",
};
vi.mock("ora", () => ({ default: vi.fn(() => mockSpinner) }));

import { existsSync } from "node:fs";
import { createInitCommand } from "../../src/presentation/command/init-command.js";

const FAKE_MODEL_PATH = "/fake/models/qwen2.5-3b-instruct-q4_k_m.gguf";

describe("createInitCommand", () => {
  const mockDownloader = vi.fn();

  beforeEach(() => {
    vi.mocked(existsSync).mockReset();
    mockDownloader.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => {});
    mockSpinner.fail.mockReset();
    mockSpinner.start.mockReset().mockReturnThis();
    mockSpinner.succeed.mockReset();
  });

  function run(): Promise<unknown> {
    const cmd = createInitCommand({
      downloaderCallback: mockDownloader,
      modelPath: FAKE_MODEL_PATH,
    });
    const program = new Command().addCommand(cmd);
    return program.parseAsync(["node", "tally", "init"]);
  }

  it("prints 'Already initialized' and skips download when model exists", async () => {
    vi.mocked(existsSync).mockReturnValue(true);

    await run();

    expect(mockDownloader).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("Already initialized.");
  });

  it("calls downloader and shows success on first-time init", async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    mockDownloader.mockResolvedValue();

    await run();

    expect(mockDownloader).toHaveBeenCalledOnce();
    expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining("successfully"));
  });

  it("updates spinner text with MB progress during download", async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    mockDownloader.mockImplementation((onProgress: (downloaded: number, total: number) => void) => {
      onProgress(500_000_000, 2_100_000_000); // 500 MB / 2.1 GB
      return Promise.resolve();
    });

    await run();

    expect(mockSpinner.text).toContain("500 MB");
    expect(mockSpinner.text).toContain("2.1 GB");
  });

  it("shows failure and rethrows when downloader throws", async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    mockDownloader.mockRejectedValue(new Error("network error"));

    await expect(run()).rejects.toThrow("network error");
    expect(mockSpinner.fail).toHaveBeenCalledWith("Download failed.");
  });
});
