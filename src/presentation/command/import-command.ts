import type { ApplyCategoryRules } from "../../application/usecase/apply-category-rules.js";
import { Command } from "commander";
import type { CsvColumnMappingParams } from "../../infrastructure/csv/csv-column-mapping.js";
import type { ImportTransactions } from "../../application/usecase/import-transactions.js";
import type { LearnCategoryRules } from "../../application/usecase/learn-category-rules.js";
import type { Renderer } from "../renderer/renderer.js";
import type { SeedMockData } from "../../application/usecase/seed-mock-data.js";
import type { TransactionParser } from "../../application/gateway/transaction-parser.js";
import type { UnitOfWork } from "../../application/gateway/unit-of-work.js";
import { categorizePrompt } from "../prompt/categorize-prompt.js";
import { collectColumnMapping } from "../prompt/column-mapping-prompt.js";
import { toTransactionDto } from "../../application/dto/transaction-dto.js";

interface ImportCommandDeps {
  parserFactory: (mapping: CsvColumnMappingParams) => TransactionParser;
  renderer: Renderer;
  unitOfWork: UnitOfWork;
}

export function createImportCommand(
  importTransactions: ImportTransactions,
  seedMockData: SeedMockData,
  applyCategoryRules: ApplyCategoryRules,
  learnCategoryRules: LearnCategoryRules,
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

      const mapping = await collectColumnMapping(file);
      const parser = deps.parserFactory(mapping);
      const parsed = parser.parse(file).map((txn) => toTransactionDto(txn));

      if (!opts.categorize) {
        let result: { count: number } = { count: 0 };
        deps.unitOfWork.runInTransaction(() => {
          result = importTransactions.save(parsed);
        });
        console.log(deps.renderer.render(result));
        return;
      }

      const { alreadyCategorized, uncategorized } =
        importTransactions.splitByCategoryStatus(parsed);

      if (alreadyCategorized.length > 0) {
        console.log(`Skipping ${alreadyCategorized.length} already-categorized transactions.`);
      }

      // Auto-categorize with learned + default rules
      const { matched, unmatched } = applyCategoryRules.apply(uncategorized);
      if (matched.length > 0) {
        console.log(`Auto-categorized ${matched.length} of ${uncategorized.length} transactions.`);
      }

      const { categorized, interrupted } = await categorizePrompt(unmatched);

      const toSave = [...alreadyCategorized, ...matched, ...categorized];
      let result: { count: number } = { count: 0 };
      deps.unitOfWork.runInTransaction(() => {
        result = importTransactions.save(toSave);
        // Learn rules from what the user just categorized manually
        learnCategoryRules.learn(categorized);
      });

      if (interrupted) {
        console.log(`\nInterrupted — saved ${result.count} of ${parsed.length} transactions.`);
      } else {
        console.log(deps.renderer.render(result));
      }
    });

  return cmd;
}
