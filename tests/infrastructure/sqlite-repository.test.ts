import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Database from "better-sqlite3";
import {
  openDatabase,
  SqliteBudgetRepository,
  SqliteTransactionRepository,
} from "../../src/infrastructure/persistence/sqlite-repository.js";
import { Budget } from "../../src/domain/entity/budget.js";
import { CategoryGroup } from "../../src/domain/value-object/category-group.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Month } from "../../src/domain/value-object/month.js";

describe("SqliteRepository", () => {
  let tmpDir: string;
  let db: Database.Database;
  let budgetRepo: SqliteBudgetRepository;
  let txnRepo: SqliteTransactionRepository;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "tally-test-"));
    const result = openDatabase(join(tmpDir, "test.db"));
    db = result.db;
    budgetRepo = result.budgetRepo;
    txnRepo = result.txnRepo;
  });

  afterEach(() => {
    db.close();
    rmSync(tmpDir, { recursive: true });
  });

  describe("BudgetRepository", () => {
    const month = Month.from("2026-03");

    it("saves and retrieves a budget", () => {
      const budget = new Budget(month, [
        {
          category: { id: "rent", name: "Rent", group: CategoryGroup.NEEDS },
          amount: Money.fromEuros(800),
        },
      ]);

      budgetRepo.save(budget);
      const found = budgetRepo.findByMonth(month);

      expect(found).not.toBeNull();
      expect(found!.month.value).toBe("2026-03");
      expect(found!.lines).toHaveLength(1);
      expect(found!.lines[0].category.id).toBe("rent");
      expect(found!.lines[0].amount.cents).toBe(80000);
    });

    it("returns null for non-existent month", () => {
      expect(budgetRepo.findByMonth(month)).toBeNull();
    });

    it("checks existence", () => {
      expect(budgetRepo.exists(month)).toBe(false);
      budgetRepo.save(new Budget(month, []));
      expect(budgetRepo.exists(month)).toBe(true);
    });
  });

  describe("TransactionRepository", () => {
    it("saves and retrieves transactions by month", () => {
      txnRepo.saveAll([
        {
          id: "tx-1",
          date: new Date("2026-03-01"),
          label: "Rent",
          amount: Money.fromEuros(-800),
          sourceBank: "credit-mutuel",
        },
        {
          id: "tx-2",
          date: new Date("2026-04-01"),
          label: "Rent April",
          amount: Money.fromEuros(-800),
          sourceBank: "credit-mutuel",
        },
      ]);

      const marchTxns = txnRepo.findByMonth(Month.from("2026-03"));
      expect(marchTxns).toHaveLength(1);
      expect(marchTxns[0].id).toBe("tx-1");

      const aprilTxns = txnRepo.findByMonth(Month.from("2026-04"));
      expect(aprilTxns).toHaveLength(1);
      expect(aprilTxns[0].id).toBe("tx-2");
    });

    it("returns empty array for month with no transactions", () => {
      expect(txnRepo.findByMonth(Month.from("2026-03"))).toEqual([]);
    });
  });
});
