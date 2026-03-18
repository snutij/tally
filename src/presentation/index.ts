import {
  DEFAULT_LOCALE,
  getDefaultPrefixesForLocale,
} from "../infrastructure/config/category-rules/index.js";
import { VALID_FORMATS, createRenderer } from "./renderer/create-renderer.js";
import { dataDir, dbPath } from "../infrastructure/persistence/data-dir.js";
import { existsSync, mkdirSync } from "node:fs";
import { AddRule } from "../application/usecase/add-rule.js";
import { ApplyCategoryRules } from "../application/usecase/apply-category-rules.js";
import { CategoryRegistry } from "../domain/service/category-registry.js";
import { Command } from "commander";
import { CsvColumnMapping } from "../infrastructure/csv/csv-column-mapping.js";
import { CsvFormatDetectorImpl } from "../infrastructure/csv/csv-format-detector-impl.js";
import { CsvTransactionParser } from "../infrastructure/csv/csv-transaction-parser.js";
import { DEFAULT_CATEGORIES } from "../domain/default-categories.js";
import { DomainError } from "../application/error.js";
import { ExitPromptError } from "@inquirer/core";
import { FindUncategorizedTransactions } from "../application/usecase/find-uncategorized-transactions.js";
import { GenerateReport } from "../application/usecase/generate-report.js";
import { ImportCsvWorkflow } from "../application/usecase/import-csv-workflow.js";
import { ImportTransactions } from "../application/usecase/import-transactions.js";
import { LearnCategoryRules } from "../application/usecase/learn-category-rules.js";
import { ListRules } from "../application/usecase/list-rules.js";
import { ListTransactions } from "../application/usecase/list-transactions.js";
import { MockDataGeneratorImpl } from "../infrastructure/mock/mock-data-generator-impl.js";
import { RemoveRule } from "../application/usecase/remove-rule.js";
import { SaveCategorizedTransactions } from "../application/usecase/save-categorized-transactions.js";
import { SeedMockData } from "../application/usecase/seed-mock-data.js";
import { Sha256IdGenerator } from "../infrastructure/id/sha256-id-generator.js";
import { buildCategoryChoices } from "../application/category-choices.js";
import { createDbCommand } from "./command/db-command.js";
import { createImportCommand } from "./command/import-command.js";
import { createReportCommand } from "./command/report-command.js";
import { createRulesCommand } from "./command/rules-command.js";
import { createTransactionsCommand } from "./command/transactions-command.js";
import { openDatabase } from "../infrastructure/persistence/sqlite-gateway.js";

// --- Data directory (XDG convention) ---
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// --- Composition root ---
const categoryRegistry = new CategoryRegistry(DEFAULT_CATEGORIES);
const categoryChoiceGroups = buildCategoryChoices(categoryRegistry.allCategories());
const { txnGateway, ruleGateway, unitOfWork } = openDatabase(dbPath, categoryRegistry);

const idGenerator = new Sha256IdGenerator();
const mockDataGenerator = new MockDataGeneratorImpl();
const csvFormatDetector = new CsvFormatDetectorImpl();
const importTransactions = new ImportTransactions(txnGateway);
const generateReport = new GenerateReport(txnGateway, categoryRegistry);
const seedMockData = new SeedMockData(txnGateway, mockDataGenerator);
const applyCategoryRules = new ApplyCategoryRules(ruleGateway);
const learnCategoryRules = new LearnCategoryRules(
  ruleGateway,
  getDefaultPrefixesForLocale(DEFAULT_LOCALE),
  idGenerator,
  categoryRegistry,
);
const importCsvWorkflow = new ImportCsvWorkflow(
  importTransactions,
  applyCategoryRules,
  learnCategoryRules,
  unitOfWork,
);
const listTransactions = new ListTransactions(txnGateway);
const findUncategorizedTransactions = new FindUncategorizedTransactions(txnGateway);
const saveCategorizedTransactions = new SaveCategorizedTransactions(txnGateway, categoryRegistry);
const listRules = new ListRules(ruleGateway, categoryRegistry);
const addRule = new AddRule(ruleGateway, idGenerator, categoryRegistry);
const removeRule = new RemoveRule(ruleGateway);

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
  createImportCommand(importTransactions, seedMockData, importCsvWorkflow, {
    choiceGroups: categoryChoiceGroups,
    csvFormatDetector,
    parserFactory: (params) => new CsvTransactionParser(new CsvColumnMapping(params)),
    renderer,
  }),
);
program.addCommand(createReportCommand(generateReport, renderer));
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
  if (error instanceof ExitPromptError) {
    // Ctrl+C during any interactive prompt — exit cleanly
  } else if (error instanceof DomainError) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
