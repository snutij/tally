import { Command } from "commander";
import type { CsvColumnMapper } from "../../application/gateway/csv-column-mapper.js";
import type { CsvFormatDetector } from "../../application/gateway/csv-format-detector.js";
import type { CsvMappingConfig } from "../../application/dto/csv-mapping-config.js";
import type { ImportCsvWorkflow } from "../../application/usecase/import-csv-workflow.js";
import type { Renderer } from "../renderer/renderer.js";
import type { SeedMockData } from "../../application/usecase/seed-mock-data.js";
import type { TransactionParser } from "../../application/gateway/transaction-parser.js";
import { collectColumnMapping } from "../prompt/column-mapping-prompt.js";
import ora from "ora";
import { toTransactionDto } from "../../application/dto/transaction-dto.js";

export interface ImportCommandDeps {
  csvColumnMapper: CsvColumnMapper;
  csvFormatDetector: CsvFormatDetector;
  parserFactory: (mapping: CsvMappingConfig) => TransactionParser;
  renderer: Renderer;
}

const DEMO_MONTHS: [number, number][] = [
  [2026, 1],
  [2026, 2],
  [2026, 3],
  [2026, 4],
  [2026, 5],
  [2026, 6],
];

export function createImportCommand(
  seedDemoData: SeedMockData,
  importCsvWorkflow: ImportCsvWorkflow,
  deps: ImportCommandDeps,
): Command {
  const cmd = new Command("import").description("Import bank transactions");

  cmd
    .command("demo")
    .description("Seed DB with a 6-month pre-categorized demo dataset (Jan–Jun 2026)")
    .action(() => {
      let total = 0;
      for (const [year, month] of DEMO_MONTHS) {
        const monthStr = `${year}-${String(month).padStart(2, "0")}`;
        total += seedDemoData.execute(monthStr).transactionCount;
      }
      console.log(deps.renderer.render({ demo: true, transactionCount: total }));
    });

  cmd
    .command("csv")
    .description("Import transactions from any CSV file")
    .argument("<file>", "Path to CSV file")
    .action(async (file: string) => {
      const mapping = await collectColumnMapping(
        file,
        deps.csvFormatDetector,
        deps.csvColumnMapper,
      );
      const parser = deps.parserFactory(mapping);
      const parsed = parser.parse(file).map((txn) => toTransactionDto(txn));

      const spinner = ora("Categorizing transactions…").start();
      let result;
      try {
        result = await importCsvWorkflow.execute({
          onAlreadyCategorized: (count) => {
            spinner.info(`Skipping ${count} already-categorized transactions.`);
            spinner.start("Categorizing transactions…");
          },
          onAutoMatched: (matchedCount, totalUncategorized) => {
            spinner.info(`Auto-categorized ${matchedCount} of ${totalUncategorized} transactions.`);
            spinner.start("Categorizing transactions…");
          },
          onInvalidCategoryIds: (count) => {
            spinner.warn(`AI returned ${count} invalid category IDs (ignored).`);
            spinner.start("Categorizing transactions…");
          },
          onLlmCategorized: (count) => {
            spinner.succeed(`AI categorized ${count} transactions.`);
            spinner.start("Categorizing transactions…");
          },
          onUncategorized: (transactions) => {
            const month = transactions[0]?.date.slice(0, 7) ?? "";
            spinner.warn(
              `${transactions.length} transaction(s) could not be categorized automatically:`,
            );
            for (const txn of transactions) {
              console.log(`  · ${txn.label}`);
            }
            console.log(`\nRun: tally transactions categorize ${month}`);
          },
          transactions: parsed,
        });
      } catch (error) {
        spinner.fail("Categorization failed.");
        throw error;
      }

      console.log(deps.renderer.render({ count: result.savedCount }));
    });

  return cmd;
}
