#!/usr/bin/env npx tsx
import { existsSync, mkdirSync } from "node:fs";
import { Command } from "commander";

import { dataDir, dbPath } from "../infrastructure/persistence/data-dir.js";
import { openDatabase } from "../infrastructure/persistence/sqlite-repository.js";
import { CreditMutuelImporter } from "../infrastructure/bank/credit-mutuel.js";
import { PlanBudget } from "../application/usecase/plan-budget.js";
import { ImportTransactions } from "../application/usecase/import-transactions.js";
import { GenerateReport } from "../application/usecase/generate-report.js";
import { SeedMockData } from "../application/usecase/seed-mock-data.js";
import { JsonRenderer } from "./renderer/json-renderer.js";
import { createBudgetCommand } from "./command/budget-command.js";
import { createImportCommand } from "./command/import-command.js";
import { createReportCommand } from "./command/report-command.js";
import { createTransactionsCommand } from "./command/transactions-command.js";
import { createDbCommand } from "./command/db-command.js";
import { BankImportGateway } from "../application/gateway/bank-import.js";
import { DomainError } from "../domain/error/index.js";

// --- Data directory (XDG convention) ---
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// --- Composition root ---
const { budgetRepo, txnRepo } = openDatabase(dbPath);
const renderer = new JsonRenderer();

const creditMutuel = new CreditMutuelImporter();
const importers = new Map<string, BankImportGateway>([
  [creditMutuel.bankName, creditMutuel],
]);

const planBudget = new PlanBudget(budgetRepo);
const importTransactions = new ImportTransactions(importers, txnRepo);
const generateReport = new GenerateReport(budgetRepo, txnRepo);
const seedMockData = new SeedMockData(txnRepo, budgetRepo);

// --- CLI ---
const program = new Command();
program
  .name("tally")
  .description("Personal finance CLI — budget tracking & reporting")
  .version("0.1.0");

program.addCommand(createBudgetCommand(planBudget, renderer));
program.addCommand(createImportCommand(importTransactions, seedMockData, renderer));
program.addCommand(createReportCommand(generateReport, renderer));
program.addCommand(createTransactionsCommand(txnRepo, renderer));
program.addCommand(createDbCommand());

program.parseAsync().catch((error: unknown) => {
  if (error instanceof DomainError) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    throw error;
  }
});
