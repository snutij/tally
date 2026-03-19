import { beforeEach, describe, expect, it } from "vitest";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { CategoryRegistry } from "../../src/domain/service/category-registry.js";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { GenerateTrend } from "../../src/application/usecase/generate-trend.js";
import { InMemoryTransactionRepository } from "../helpers/in-memory-repositories.js";
import { InvalidMonthRange } from "../../src/domain/error/index.js";
import { Money } from "../../src/domain/value-object/money.js";
import { Transaction } from "../../src/domain/entity/transaction.js";
import { TransactionId } from "../../src/domain/value-object/transaction-id.js";

function makeTxn(id: string, amount: number, date: string, categoryId?: string): Transaction {
  return Transaction.create({
    amount: Money.fromEuros(amount),
    categoryId: categoryId ? CategoryId(categoryId) : undefined,
    date: DateOnly.from(date),
    id: TransactionId(id),
    label: `txn-${id}`,
    source: "csv",
  });
}

describe("GenerateTrend", () => {
  let txnRepo: InMemoryTransactionRepository;
  let useCase: GenerateTrend;

  beforeEach(() => {
    txnRepo = new InMemoryTransactionRepository();
    useCase = new GenerateTrend(txnRepo, new CategoryRegistry(DEFAULT_CATEGORIES));
  });

  it("fetches transactions for every month in the range", () => {
    txnRepo.saveAll([
      makeTxn("1", 1000, "2026-01-15", "inc01"),
      makeTxn("2", -200, "2026-02-10", "n01"),
      makeTxn("3", 500, "2026-03-20", "inc01"),
    ]);

    const dto = useCase.execute("2026-01", "2026-03");
    const [jan, feb, mar] = dto.months;

    expect(dto.months).toHaveLength(3);
    expect(jan?.month).toBe("2026-01");
    expect(feb?.month).toBe("2026-02");
    expect(mar?.month).toBe("2026-03");
  });

  it("throws InvalidMonthRange when start is after end", () => {
    expect(() => useCase.execute("2026-06", "2026-01")).toThrow(InvalidMonthRange);
  });

  it("throws for invalid month format", () => {
    expect(() => useCase.execute("2026-13", "2026-06")).toThrow();
  });

  it("returns correct DTO shape", () => {
    txnRepo.saveAll([makeTxn("1", 1000, "2026-01-01", "inc01")]);

    const dto = useCase.execute("2026-01", "2026-01");

    expect(dto._type).toBe("TrendReportDto");
    expect(dto.start).toBe("2026-01");
    expect(dto.end).toBe("2026-01");
    expect(dto.months).toHaveLength(1);
    expect(dto.savingsRateSeries).toHaveLength(1);
    expect(dto.groupOvershootFrequency).toHaveLength(3); // NEEDS, WANTS, INVESTMENTS
    expect(dto.monthOverMonthDeltas).toHaveLength(0); // no deltas for single month
  });

  it("accepts custom spending targets", () => {
    txnRepo.saveAll([makeTxn("1", 2000, "2026-01-01", "inc01")]);

    const dto = useCase.execute("2026-01", "2026-01", { invest: 10, needs: 60, wants: 30 });
    const [jan] = dto.months;
    const needs = jan?.groups.find((grp) => grp.group === "NEEDS");

    expect(needs?.budgeted).toBe(1200); // 2000 × 60%
  });
});
