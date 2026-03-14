import {
  InMemoryBudgetRepository,
  InMemoryTransactionRepository,
} from "../helpers/in-memory-repositories.js";
import { beforeEach, describe, expect, it } from "vitest";
import { Budget } from "../../src/domain/entity/budget.js";
import { CategoryGroup } from "../../src/domain/value-object/category-group.js";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { GenerateReport } from "../../src/application/usecase/generate-report.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Month } from "../../src/domain/value-object/month.js";

describe("GenerateReport", () => {
  let budgetRepo: InMemoryBudgetRepository;
  let txnRepo: InMemoryTransactionRepository;
  let useCase: GenerateReport;

  beforeEach(() => {
    budgetRepo = new InMemoryBudgetRepository();
    txnRepo = new InMemoryTransactionRepository();
    useCase = new GenerateReport(budgetRepo, txnRepo);
  });

  it("generates report with budget and transactions", () => {
    const month = Month.from("2026-03");
    const budget = new Budget(month, [
      {
        amount: Money.fromEuros(800),
        category: { group: CategoryGroup.NEEDS, id: "rent", name: "Rent" },
      },
    ]);
    budgetRepo.save(budget);
    txnRepo.saveAll([
      {
        amount: Money.fromEuros(-800),
        categoryId: "rent",
        date: DateOnly.from("2026-03-01"),
        id: "1",
        label: "Rent",
        sourceBank: "test",
      },
    ]);

    const report = useCase.execute(month);
    expect(report.totalExpenseBudgeted.cents).toBe(80_000);
    expect(report.totalExpenseActual.cents).toBe(80_000);
  });

  it("returns empty report when no budget exists", () => {
    const month = Month.from("2026-03");
    const report = useCase.execute(month);
    expect(report.totalExpenseBudgeted.cents).toBe(0);
    expect(report.totalExpenseActual.cents).toBe(0);
  });

  it("only includes transactions from the requested month", () => {
    const march = Month.from("2026-03");
    budgetRepo.save(
      new Budget(march, [
        {
          amount: Money.fromEuros(800),
          category: { group: CategoryGroup.NEEDS, id: "rent", name: "Rent" },
        },
      ]),
    );
    txnRepo.saveAll([
      {
        amount: Money.fromEuros(-800),
        categoryId: "rent",
        date: DateOnly.from("2026-03-01"),
        id: "1",
        label: "March Rent",
        sourceBank: "test",
      },
      {
        amount: Money.fromEuros(-800),
        categoryId: "rent",
        date: DateOnly.from("2026-04-01"),
        id: "2",
        label: "April Rent",
        sourceBank: "test",
      },
    ]);

    const report = useCase.execute(march);
    expect(report.transactionCount).toBe(1);
    expect(report.totalExpenseActual.cents).toBe(80_000);
  });

  it("handles uncategorized transactions gracefully", () => {
    const month = Month.from("2026-03");
    budgetRepo.save(new Budget(month, []));
    txnRepo.saveAll([
      {
        amount: Money.fromEuros(-50),
        date: DateOnly.from("2026-03-15"),
        id: "1",
        label: "Mystery",
        sourceBank: "test",
      },
    ]);

    const report = useCase.execute(month);
    expect(report.transactionCount).toBe(1);
    expect(report.uncategorized.cents).toBe(5000);
    expect(report.totalExpenseActual.cents).toBe(0);
  });
});
