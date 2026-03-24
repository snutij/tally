import { Command } from "commander";
import { existsSync } from "node:fs";
import ora from "ora";

export interface InitCommandDeps {
  downloaderCallback: (onProgress: (downloaded: number, total: number) => void) => Promise<void>;
  modelPath: string;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) {
    return `${(bytes / 1e9).toFixed(1)} GB`;
  }
  return `${(bytes / 1e6).toFixed(0)} MB`;
}

export function createInitCommand(deps: InitCommandDeps): Command {
  return new Command("init")
    .description("Download the AI model for local inference")
    .action(async () => {
      if (existsSync(deps.modelPath)) {
        console.log("Already initialized.");
        return;
      }
      const spinner = ora("Downloading AI model…").start();
      try {
        await deps.downloaderCallback((downloaded, total) => {
          const pct = total > 0 ? Math.round((downloaded / total) * 100) : 0;
          spinner.text = `Downloading AI model… ${formatBytes(downloaded)} / ${formatBytes(total)} (${pct}%)`;
        });
        spinner.succeed("Model downloaded successfully. You're all set!");
      } catch (error) {
        spinner.fail("Download failed.");
        throw error;
      }
    });
}
