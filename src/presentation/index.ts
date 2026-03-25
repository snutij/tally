import "temporal-polyfill/global";
import {
  DEFAULT_LOCALE,
  getDefaultPrefixesForLocale,
} from "../infrastructure/config/category-rules/index.js";
import { VALID_FORMATS, createRenderer } from "./renderer/create-renderer.js";
import { dataDir, dbPath } from "../infrastructure/persistence/data-dir.js";
import { existsSync, mkdirSync } from "node:fs";
import {
  resolveModelPath,
  resolveModelUri,
  resolveModelsDir,
} from "../infrastructure/llm/default-model.js";
import { AddRule } from "../application/usecase/add-rule.js";
import { ApplicationError } from "../application/error.js";
import { ApplyCategoryRules } from "../application/usecase/apply-category-rules.js";
import { CategoryRegistry } from "../domain/service/category-registry.js";
import { Command } from "commander";
import { CsvColumnMapping } from "../infrastructure/csv/csv-column-mapping.js";
import { CsvFormatDetectorImpl } from "../infrastructure/csv/csv-format-detector-impl.js";
import { CsvTransactionParser } from "../infrastructure/csv/csv-transaction-parser.js";
import { DomainError } from "../domain/error/index.js";
import { FindUncategorizedTransactions } from "../application/usecase/find-uncategorized-transactions.js";
import { GenerateUnifiedReport } from "../application/usecase/generate-unified-report.js";
import { ImportCsvWorkflow } from "../application/usecase/import-csv-workflow.js";
import { ImportTransactions } from "../application/usecase/import-transactions.js";
import { InfrastructureError } from "../infrastructure/error.js";
import { LearnCategoryRules } from "../application/usecase/learn-category-rules.js";
import { ListRules } from "../application/usecase/list-rules.js";
import { ListTransactions } from "../application/usecase/list-transactions.js";
import { LlmCsvColumnMapper } from "../infrastructure/llm/llm-csv-column-mapper.js";
import { LlmTransactionCategorizer } from "../infrastructure/llm/llm-transaction-categorizer.js";
import { MockDataGeneratorImpl } from "../infrastructure/mock/mock-data-generator-impl.js";
import { NodeLlamaCppGateway } from "../infrastructure/llm/node-llama-cpp-gateway.js";
import { RemoveRule } from "../application/usecase/remove-rule.js";
import { SaveCategorizedTransactions } from "../application/usecase/save-categorized-transactions.js";
import { SeedMockData } from "../application/usecase/seed-mock-data.js";
import { Sha256IdGenerator } from "../infrastructure/id/sha256-id-generator.js";
import { buildCategoryChoices } from "../application/category-choices.js";
import { createDbCommand } from "./command/db-command.js";
import { createImportCommand } from "./command/import-command.js";
import { createInitCommand } from "./command/init-command.js";
import { createReportCommand } from "./command/report-command.js";
import { createRulesCommand } from "./command/rules-command.js";
import { createTransactionsCommand } from "./command/transactions-command.js";
import { openDatabase } from "../infrastructure/persistence/sqlite-repository.js";

// --- Data directory (XDG convention) ---
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// --- Model path resolution ---
const modelsDir = resolveModelsDir();
const resolvedModelPath = resolveModelPath();

// --- LLM infrastructure ---
const llmGateway = new NodeLlamaCppGateway();
const transactionCategorizer = new LlmTransactionCategorizer(llmGateway);
const csvColumnMapper = new LlmCsvColumnMapper(llmGateway);

// --- Composition root ---
const idGenerator = new Sha256IdGenerator();
const { txnRepository, ruleBookRepository, categoryRepository, unitOfWork } = openDatabase(
  dbPath,
  idGenerator,
);
const categoryRegistry = new CategoryRegistry(categoryRepository.findAll());
const categoryChoiceGroups = buildCategoryChoices(categoryRegistry.allCategories());

const mockDataGenerator = new MockDataGeneratorImpl();
const csvFormatDetector = new CsvFormatDetectorImpl();
const importTransactions = new ImportTransactions(txnRepository);
const generateUnifiedReport = new GenerateUnifiedReport(txnRepository, categoryRegistry);
const seedMockData = new SeedMockData(txnRepository, mockDataGenerator);
const applyCategoryRules = new ApplyCategoryRules(ruleBookRepository);
const learnCategoryRules = new LearnCategoryRules(
  ruleBookRepository,
  getDefaultPrefixesForLocale(DEFAULT_LOCALE),
  idGenerator,
  categoryRegistry,
);
const importCsvWorkflow = new ImportCsvWorkflow({
  applyCategoryRules,
  categoryRegistry,
  importTransactions,
  learnCategoryRules,
  transactionCategorizer,
  unitOfWork,
});
const listTransactions = new ListTransactions(txnRepository);
const findUncategorizedTransactions = new FindUncategorizedTransactions(txnRepository);
const saveCategorizedTransactions = new SaveCategorizedTransactions(
  txnRepository,
  categoryRegistry,
);
const listRules = new ListRules(ruleBookRepository, categoryRegistry);
const addRule = new AddRule(ruleBookRepository, idGenerator, categoryRegistry);
const removeRule = new RemoveRule(ruleBookRepository);

// --- CLI ---
const program = new Command();
program
  .name("tally")
  .description("Personal finance CLI — budget tracking & reporting")
  .version("0.1.0")
  .option("--format <type>", `Output format (${VALID_FORMATS.join(", ")})`, "json");

// Lazy renderer — resolved after Commander parses --format
let _renderer: ReturnType<typeof createRenderer> | undefined;
const renderer = {
  render(data: unknown): string {
    _renderer ??= createRenderer(program.opts()["format"]);
    return _renderer.render(data);
  },
};

program.addCommand(
  createInitCommand({
    downloaderCallback: async (onProgress) => {
      const { createModelDownloader } = await import("node-llama-cpp");
      mkdirSync(modelsDir, { recursive: true });
      const downloader = await createModelDownloader({
        dirPath: modelsDir,
        modelUri: resolveModelUri(),
      });
      const interval = setInterval(() => {
        onProgress(downloader.downloadedSize, downloader.totalSize);
      }, 250);
      try {
        await downloader.download();
      } finally {
        clearInterval(interval);
      }
    },
    modelPath: resolvedModelPath,
  }),
);
program.addCommand(
  createImportCommand(seedMockData, importCsvWorkflow, {
    csvColumnMapper,
    csvFormatDetector,
    parserFactory: (params) => new CsvTransactionParser(new CsvColumnMapping(params)),
    renderer,
  }),
);
program.addCommand(createReportCommand(generateUnifiedReport, renderer));
program.addCommand(
  createTransactionsCommand(
    listTransactions,
    findUncategorizedTransactions,
    saveCategorizedTransactions,
    renderer,
    categoryChoiceGroups,
  ),
);
program.addCommand(createRulesCommand(listRules, addRule, removeRule, renderer));
program.addCommand(createDbCommand(dbPath));

try {
  await program.parseAsync();
} catch (error: unknown) {
  if (
    error instanceof ApplicationError ||
    error instanceof InfrastructureError ||
    error instanceof DomainError
  ) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
