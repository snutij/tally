import { Command } from "commander";
import { ImportTransactions } from "../../application/usecase/import-transactions.js";
import { SeedMockData } from "../../application/usecase/seed-mock-data.js";
import { Month } from "../../domain/value-object/month.js";
import { Renderer } from "../renderer/renderer.js";
import { categorizePrompt } from "../prompt/categorize-prompt.js";

export function createImportCommand(
  importTransactions: ImportTransactions,
  seedMockData: SeedMockData,
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
    .command("mock")
    .description("Seed DB with pre-categorized mock data for testing")
    .argument("[month]", "Month in YYYY-MM format (defaults to current month)")
    .action((monthStr?: string) => {
      const month = Month.from(
        monthStr ?? new Date().toISOString().slice(0, 7),
      );
      const result = seedMockData.execute(month);
      console.log(
        renderer.render({
          mock: true,
          month: month.value,
          transactionCount: result.transactionCount,
          budgetCreated: result.budgetCreated,
        }),
      );
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
