import { VALID_FORMATS, createRenderer } from "./renderer/create-renderer.js";
import { dataDir, dbPath } from "../infrastructure/persistence/data-dir.js";
import { existsSync, mkdirSync } from "node:fs";
import { ApplyCategoryRules } from "../application/usecase/apply-category-rules.js";
import { Command } from "commander";
import { DomainError } from "../domain/error/index.js";
import { ExitPromptError } from "@inquirer/core";
import { GenerateReport } from "../application/usecase/generate-report.js";
import { ImportTransactions } from "../application/usecase/import-transactions.js";
import { LearnCategoryRules } from "../application/usecase/learn-category-rules.js";
import { PlanBudget } from "../application/usecase/plan-budget.js";
import { SeedMockData } from "../application/usecase/seed-mock-data.js";
import { createBudgetCommand } from "./command/budget-command.js";
import { createDbCommand } from "./command/db-command.js";
import { createImportCommand } from "./command/import-command.js";
import { createReportCommand } from "./command/report-command.js";
import { createRulesCommand } from "./command/rules-command.js";
import { createTransactionsCommand } from "./command/transactions-command.js";
import { openDatabase } from "../infrastructure/persistence/sqlite-repository.js";

// --- Data directory (XDG convention) ---
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// --- Composition root ---
const { budgetRepo, txnRepo, ruleRepo } = openDatabase(dbPath);

const planBudget = new PlanBudget(budgetRepo);
const importTransactions = new ImportTransactions(txnRepo);
const generateReport = new GenerateReport(budgetRepo, txnRepo);
const seedMockData = new SeedMockData(txnRepo, budgetRepo);
const applyCategoryRules = new ApplyCategoryRules(ruleRepo);
const learnCategoryRules = new LearnCategoryRules(ruleRepo);

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

program.addCommand(createBudgetCommand(planBudget, renderer));
program.addCommand(
  createImportCommand(
    importTransactions,
    seedMockData,
    applyCategoryRules,
    learnCategoryRules,
    renderer,
  ),
);
program.addCommand(createReportCommand(generateReport, renderer));
program.addCommand(createTransactionsCommand(txnRepo, renderer));
program.addCommand(createRulesCommand(ruleRepo, renderer));
program.addCommand(createDbCommand());

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
