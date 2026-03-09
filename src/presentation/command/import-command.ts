import { Command } from "commander";
import { ImportTransactions } from "../../application/usecase/import-transactions.js";
import { Renderer } from "../renderer/renderer.js";
import { categorizePrompt } from "../prompt/categorize-prompt.js";

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
    .option("--no-categorize", "Skip interactive categorization")
    .action(async (bank?: string, file?: string, opts?: { categorize: boolean }) => {
      if (!bank || !file) return;

      const parsed = importTransactions.parse(bank, file);

      if (opts?.categorize === false || !process.stdout.isTTY) {
        const result = importTransactions.save(parsed);
        console.log(renderer.render(result));
        return;
      }

      const { alreadyCategorized, uncategorized } =
        importTransactions.splitByCategoryStatus(parsed);

      if (alreadyCategorized.length > 0) {
        console.log(`Skipping ${alreadyCategorized.length} already-categorized transactions.`);
      }

      const { categorized, interrupted } = await categorizePrompt(uncategorized);

      const toSave = [...alreadyCategorized, ...categorized];
      const result = importTransactions.save(toSave);

      if (interrupted) {
        console.log(`\nInterrupted — saved ${result.count} of ${parsed.length} transactions.`);
      } else {
        console.log(renderer.render(result));
      }
    });

  return cmd;
}
