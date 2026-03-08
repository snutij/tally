import { Command } from "commander";
import { ImportTransactions } from "../../application/usecase/import-transactions.js";
import { Renderer } from "../renderer/renderer.js";

export function createImportCommand(
  importTransactions: ImportTransactions,
  renderer: Renderer,
): Command {
  const cmd = new Command("import").description("Import bank transactions");

  cmd
    .command("list")
    .description("List available bank adapters")
    .action(() => {
      const banks = importTransactions.listBanks();
      console.log(renderer.render({ banks }));
    });

  cmd
    .argument("[bank]", "Bank adapter name")
    .argument("[file]", "Path to CSV file")
    .action((bank?: string, file?: string) => {
      if (!bank || !file) return;
      const result = importTransactions.execute(bank, file);
      console.log(renderer.render(result));
    });

  return cmd;
}
