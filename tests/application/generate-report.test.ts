import { beforeEach, describe, expect, it } from "vitest";
import { GenerateReport } from "../../src/application/usecase/generate-report.js";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Month } from "../../src/domain/value-object/month.js";
import { Budget } from "../../src/domain/entity/budget.js";
import { CategoryGroup } from "../../src/domain/value-object/category-group.js";
import {
  InMemoryBudgetRepository,
  InMemoryTransactionRepository,
} from "../helpers/in-memory-repositories.js";

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
        category: { id: "rent", name: "Rent", group: CategoryGroup.NEEDS },
        amount: Money.fromEuros(800),
      },
    ]);
    budgetRepo.save(budget);
    txnRepo.saveAll([
      {
        id: "1",
        date: DateOnly.from("2026-03-01"),
        label: "Rent",
        amount: Money.fromEuros(-800),
        categoryId: "rent",
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
          category: { id: "rent", name: "Rent", group: CategoryGroup.NEEDS },
          amount: Money.fromEuros(800),
        },
      ]),
    );
    txnRepo.saveAll([
      {
        id: "1",
        date: DateOnly.from("2026-03-01"),
        label: "March Rent",
        amount: Money.fromEuros(-800),
        categoryId: "rent",
        sourceBank: "test",
      },
      {
        id: "2",
        date: DateOnly.from("2026-04-01"),
        label: "April Rent",
        amount: Money.fromEuros(-800),
        categoryId: "rent",
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
        id: "1",
        date: DateOnly.from("2026-03-15"),
        label: "Mystery",
        amount: Money.fromEuros(-50),
        sourceBank: "test",
      },
    ]);

    const report = useCase.execute(month);
    expect(report.transactionCount).toBe(1);
    expect(report.uncategorized.cents).toBe(5000);
    expect(report.totalExpenseActual.cents).toBe(0);
  });
});
