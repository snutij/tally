#!/usr/bin/env npx tsx
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { Command } from "commander";

import { openDatabase } from "../infrastructure/persistence/sqlite-repository.js";
import { CreditMutuelImporter } from "../infrastructure/bank/credit-mutuel.js";
import { FortuneoImporter } from "../infrastructure/bank/fortuneo.js";
import { PlanBudget } from "../application/usecase/plan-budget.js";
import { ImportTransactions } from "../application/usecase/import-transactions.js";
import { GenerateReport } from "../application/usecase/generate-report.js";
import { JsonRenderer } from "./renderer/json-renderer.js";
import { createBudgetCommand } from "./command/budget-command.js";
import { createImportCommand } from "./command/import-command.js";
import { createReportCommand } from "./command/report-command.js";
import { createTransactionsCommand } from "./command/transactions-command.js";
import { BankImportGateway } from "../application/gateway/bank-import.js";
import { DomainError } from "../domain/error/index.js";

// --- Data directory (XDG convention) ---
const dataDir = join(homedir(), ".local", "share", "tally");
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}
const dbPath = join(dataDir, "tally.db");

// --- Composition root ---
const { budgetRepo, txnRepo } = openDatabase(dbPath);
const renderer = new JsonRenderer();

const creditMutuel = new CreditMutuelImporter();
const fortuneo = new FortuneoImporter();
const importers = new Map<string, BankImportGateway>([
  [creditMutuel.bankName, creditMutuel],
  [fortuneo.bankName, fortuneo],
]);

const planBudget = new PlanBudget(budgetRepo);
const importTransactions = new ImportTransactions(importers, txnRepo);
const generateReport = new GenerateReport(budgetRepo, txnRepo);

// --- CLI ---
const program = new Command();
program
  .name("tally")
  .description("Personal finance CLI — budget tracking & reporting")
  .version("0.1.0");

program.addCommand(createBudgetCommand(planBudget, renderer));
program.addCommand(createImportCommand(importTransactions, renderer));
program.addCommand(createReportCommand(generateReport, renderer));
program.addCommand(createTransactionsCommand(txnRepo, renderer));

program.parseAsync().catch((error: unknown) => {
  if (error instanceof DomainError) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    throw error;
  }
});
