import { Command } from "commander";
import { existsSync } from "node:fs";

export interface InitCommandDeps {
  downloaderCallback: () => Promise<void>;
  modelPath: string;
}

export function createInitCommand(deps: InitCommandDeps): Command {
  return new Command("init")
    .description("Download the AI model for local inference")
    .action(async () => {
      if (existsSync(deps.modelPath)) {
        console.log("Already initialized.");
        return;
      }
      console.log("Downloading AI model (this may take a while)...");
      await deps.downloaderCallback();
      console.log("Model downloaded successfully. You're all set!");
    });
}
