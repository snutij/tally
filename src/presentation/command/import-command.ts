import { Command } from "commander";
import type { CsvFormatDetector } from "../../application/gateway/csv-format-detector.js";
import type { CsvMappingConfig } from "../../application/dto/csv-mapping-config.js";
import type { ImportCsvWorkflow } from "../../application/usecase/import-csv-workflow.js";
import type { ImportTransactions } from "../../application/usecase/import-transactions.js";
import type { Renderer } from "../renderer/renderer.js";
import type { SeedMockData } from "../../application/usecase/seed-mock-data.js";
import type { TransactionParser } from "../../application/gateway/transaction-parser.js";
import { categorizePrompt } from "../prompt/categorize-prompt.js";
import { collectColumnMapping } from "../prompt/column-mapping-prompt.js";
import { toTransactionDto } from "../../application/dto/transaction-dto.js";

interface ImportCommandDeps {
  csvFormatDetector: CsvFormatDetector;
  parserFactory: (mapping: CsvMappingConfig) => TransactionParser;
  renderer: Renderer;
}

export function createImportCommand(
  importTransactions: ImportTransactions,
  seedMockData: SeedMockData,
  importCsvWorkflow: ImportCsvWorkflow,
  deps: ImportCommandDeps,
): Command {
  const cmd = new Command("import").description("Import bank transactions");

  cmd
    .command("mock")
    .description("Seed DB with pre-categorized mock data for testing")
    .argument("[month]", "Month in YYYY-MM format (defaults to current month)")
    .action((monthStr?: string) => {
      const monthValue = monthStr ?? new Date().toISOString().slice(0, 7);
      const result = seedMockData.execute(monthValue);
      console.log(
        deps.renderer.render({
          mock: true,
          month: monthValue,
          transactionCount: result.transactionCount,
        }),
      );
    });

  cmd
    .command("csv")
    .description("Import transactions from any CSV file")
    .argument("<file>", "Path to CSV file")
    .option("--no-categorize", "Skip interactive categorization")
    .action(async (file: string, opts: { categorize: boolean }) => {
      if (!process.stdout.isTTY) {
        console.error("Interactive mapping requires a TTY.");
        process.exitCode = 1;
        return;
      }

      const mapping = await collectColumnMapping(file, deps.csvFormatDetector);
      const parser = deps.parserFactory(mapping);
      const parsed = parser.parse(file).map((txn) => toTransactionDto(txn));

      if (!opts.categorize) {
        const result = importTransactions.save(parsed);
        console.log(deps.renderer.render(result));
        return;
      }

      const result = await importCsvWorkflow.execute({
        onAlreadyCategorized: (count) => {
          console.log(`Skipping ${count} already-categorized transactions.`);
        },
        onAutoMatched: (matchedCount, totalUncategorized) => {
          console.log(`Auto-categorized ${matchedCount} of ${totalUncategorized} transactions.`);
        },
        promptFn: categorizePrompt,
        transactions: parsed,
      });

      if (result.interrupted) {
        console.log(`\nInterrupted — saved ${result.savedCount} of ${parsed.length} transactions.`);
      } else {
        console.log(deps.renderer.render({ count: result.savedCount }));
      }
    });

  return cmd;
}
