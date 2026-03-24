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

export function createImportCommand(
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
          onLlmCategorized: (count) => {
            spinner.succeed(`AI categorized ${count} transactions.`);
          },
          onUncategorized: (count) => {
            spinner.warn(`${count} transactions could not be categorized automatically.`);
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
