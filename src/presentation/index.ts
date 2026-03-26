import "temporal-polyfill/global";
import { dataDir, dbPath } from "../infrastructure/persistence/data-dir.js";
import { existsSync, mkdirSync } from "node:fs";
import {
  resolveModelPath,
  resolveModelUri,
  resolveModelsDir,
} from "../infrastructure/llm/default-model.js";
import { ApplicationError } from "../application/error.js";
import { ApplyCategoryRules } from "../application/usecase/apply-category-rules.js";
import { AskQuestionUseCase } from "../application/usecase/ask-question.js";
import { CategoryRegistry } from "../domain/service/category-registry.js";
import { Command } from "commander";
import { CsvColumnMapping } from "../infrastructure/csv/csv-column-mapping.js";
import { CsvFormatDetectorImpl } from "../infrastructure/csv/csv-format-detector-impl.js";
import { CsvTransactionParser } from "../infrastructure/csv/csv-transaction-parser.js";
import { DomainError } from "../domain/error/index.js";
import { GenerateReport } from "../application/usecase/generate-report.js";
import { ImportCsvWorkflow } from "../application/usecase/import-csv-workflow.js";
import { ImportTransactions } from "../application/usecase/import-transactions.js";
import { InfrastructureError } from "../infrastructure/error.js";
import { LearnCategoryRules } from "../application/usecase/learn-category-rules.js";
import { LlmCsvColumnMapper } from "../infrastructure/llm/llm-csv-column-mapper.js";
import { LlmQuestionAnswerer } from "../infrastructure/llm/llm-question-answerer.js";
import { LlmTransactionCategorizer } from "../infrastructure/llm/llm-transaction-categorizer.js";
import { NodeLlamaCppGateway } from "../infrastructure/llm/node-llama-cpp-gateway.js";
import { Sha256IdGenerator } from "../infrastructure/id/sha256-id-generator.js";
import { SqliteQueryRunner } from "../infrastructure/persistence/sqlite-query-runner.js";
import { SqliteSchemaIntrospector } from "../infrastructure/persistence/sqlite-schema-introspector.js";
import { createAskCommand } from "./command/ask-command.js";
import { createImportCommand } from "./command/import-command.js";
import { createInitCommand } from "./command/init-command.js";
import { createRenderer } from "./renderer/create-renderer.js";
import { createReportCommand } from "./command/report-command.js";
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
const { txnRepository, ruleBookRepository, categoryRepository, unitOfWork } = openDatabase(dbPath);
const categoryRegistry = new CategoryRegistry(categoryRepository.findAll());

const csvFormatDetector = new CsvFormatDetectorImpl();
const importTransactions = new ImportTransactions(txnRepository);
const generateReport = new GenerateReport(txnRepository, categoryRegistry);
const applyCategoryRules = new ApplyCategoryRules(ruleBookRepository);
const learnCategoryRules = new LearnCategoryRules(
  ruleBookRepository,
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
const sqlQueryRunner = new SqliteQueryRunner(dbPath);
const schemaIntrospector = new SqliteSchemaIntrospector(dbPath);
const questionAnswerer = new LlmQuestionAnswerer(llmGateway, sqlQueryRunner, schemaIntrospector);
const askQuestion = new AskQuestionUseCase(questionAnswerer);

// --- Renderer ---
const renderer = createRenderer();

// --- CLI ---
const program = new Command();
program
  .name("tally")
  .description("Personal finance CLI — budget tracking & reporting")
  .version("0.1.0");

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
  createImportCommand(importCsvWorkflow, {
    csvColumnMapper,
    csvFormatDetector,
    parserFactory: (params) => new CsvTransactionParser(new CsvColumnMapping(params)),
    renderer,
  }),
);
program.addCommand(createReportCommand(generateReport, renderer));
program.addCommand(createAskCommand(askQuestion));

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
