import type { CategoryChoiceGroup } from "../../application/category-choices.js";
import type { CategorySuggester } from "../../application/gateway/category-suggester.js";
import { Command } from "commander";
import type { CsvFormatDetector } from "../../application/gateway/csv-format-detector.js";
import type { CsvMappingConfig } from "../../application/dto/csv-mapping-config.js";
import type { ImportCsvWorkflow } from "../../application/usecase/import-csv-workflow.js";
import type { ImportTransactions } from "../../application/usecase/import-transactions.js";
import { NoOpCategorySuggester } from "../../application/usecase/no-op-category-suggester.js";
import type { Renderer } from "../renderer/renderer.js";
import type { SeedMockData } from "../../application/usecase/seed-mock-data.js";
import type { TransactionParser } from "../../application/gateway/transaction-parser.js";
import { categorizePrompt } from "../prompt/categorize-prompt.js";
import { collectColumnMapping } from "../prompt/column-mapping-prompt.js";
import { smartConsentPrompt } from "../prompt/smart-consent-prompt.js";
import { toTransactionDto } from "../../application/dto/transaction-dto.js";

interface ImportCommandDeps {
  choiceGroups: CategoryChoiceGroup[];
  csvFormatDetector: CsvFormatDetector;
  parserFactory: (mapping: CsvMappingConfig) => TransactionParser;
  renderer: Renderer;
  /**
   * Factory for creating the embedding-based CategorySuggester.
   * Returns undefined if the feature is not available in this environment.
   */
  makeSuggester?: () => CategorySuggester;
}

/**
 * Resolves the CategorySuggester to use for this import.
 *
 * Flow:
 * 1. If --no-smart is set or no factory provided → NoOp immediately
 * 2. Create the suggester via factory
 * 3. If model not cached → show first-run consent prompt
 * 4. If declined → NoOp
 * 5. Initialize the suggester (loads model, seeds index)
 * 6. On error → NoOp with warning
 */
async function resolveSuggester(
  makeSuggester: (() => CategorySuggester) | undefined,
  smartEnabled: boolean,
): Promise<CategorySuggester> {
  if (!smartEnabled || !makeSuggester) {
    return new NoOpCategorySuggester();
  }

  const suggester = makeSuggester();

  if (!suggester.isModelCached()) {
    const consented = await smartConsentPrompt();
    if (!consented) {
      return new NoOpCategorySuggester();
    }
  }

  try {
    await suggester.init((msg) => console.log(msg));
    return suggester;
  } catch (error) {
    console.warn(`Smart categorization unavailable: ${String(error)}`);
    return new NoOpCategorySuggester();
  }
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
    .option("--no-smart", "Disable AI-based category suggestions")
    .action(async (file: string, opts: { categorize: boolean; smart: boolean }) => {
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

      // Resolve category suggester: respect --no-smart and handle consent flow
      const categorySuggester = await resolveSuggester(deps.makeSuggester, opts.smart);

      const result = await importCsvWorkflow.execute({
        categorySuggester,
        onAlreadyCategorized: (count) => {
          console.log(`Skipping ${count} already-categorized transactions.`);
        },
        onAutoMatched: (matchedCount, totalUncategorized) => {
          console.log(`Auto-categorized ${matchedCount} of ${totalUncategorized} transactions.`);
        },
        onSuggested: (suggestedCount) => {
          console.log(`AI suggested ${suggestedCount} categories (shown as [AI] in prompts).`);
        },
        promptFn: (txns) => categorizePrompt(txns, deps.choiceGroups),
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
