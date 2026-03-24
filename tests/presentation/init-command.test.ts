import { beforeEach, describe, expect, it, vi } from "vitest";
import { Command } from "commander";

vi.mock("node:fs", async () => {
  const actual: Record<string, unknown> = await vi.importActual("node:fs");
  return { ...actual, existsSync: vi.fn() };
});

import { existsSync } from "node:fs";
import { createInitCommand } from "../../src/presentation/command/init-command.js";

const FAKE_MODEL_PATH = "/fake/models/qwen2.5-3b-instruct-q4_k_m.gguf";

describe("createInitCommand", () => {
  const mockDownloader = vi.fn();

  beforeEach(() => {
    vi.mocked(existsSync).mockReset();
    mockDownloader.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => {});
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

  it("calls downloader and prints success on first-time init", async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    mockDownloader.mockResolvedValue();

    await run();

    expect(mockDownloader).toHaveBeenCalledOnce();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("successfully"));
  });
});
