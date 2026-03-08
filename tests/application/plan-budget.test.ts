import { describe, it, expect, beforeEach } from "vitest";
import { PlanBudget } from "../../src/application/usecase/plan-budget.js";
import { BudgetRepository } from "../../src/application/gateway/budget-repository.js";
import { Budget } from "../../src/domain/entity/budget.js";
import { Month } from "../../src/domain/value-object/month.js";
import { BudgetAlreadyExists } from "../../src/domain/error/index.js";
import { DEFAULT_CATEGORIES } from "../../src/domain/default-categories.js";

class InMemoryBudgetRepository implements BudgetRepository {
  private store = new Map<string, Budget>();

  save(budget: Budget): void {
    this.store.set(budget.month.value, budget);
  }

  findByMonth(month: Month): Budget | null {
    return this.store.get(month.value) ?? null;
  }

  exists(month: Month): boolean {
    return this.store.has(month.value);
  }
}

describe("PlanBudget", () => {
  let repo: InMemoryBudgetRepository;
  let useCase: PlanBudget;

  beforeEach(() => {
    repo = new InMemoryBudgetRepository();
    useCase = new PlanBudget(repo);
  });

  it("creates budget with all default categories", () => {
    const month = Month.from("2026-03");
    const budget = useCase.initFromDefaults(month);

    expect(budget.lines).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(budget.month.value).toBe("2026-03");
    // All amounts are zero
    expect(budget.total().cents).toBe(0);
  });

  it("throws BudgetAlreadyExists if called twice", () => {
    const month = Month.from("2026-03");
    useCase.initFromDefaults(month);

    expect(() => useCase.initFromDefaults(month)).toThrow(BudgetAlreadyExists);
  });

  it("gets a saved budget", () => {
    const month = Month.from("2026-03");
    useCase.initFromDefaults(month);

    const found = useCase.get(month);
    expect(found).not.toBeNull();
    expect(found!.month.value).toBe("2026-03");
  });

  it("returns null for non-existent budget", () => {
    expect(useCase.get(Month.from("2026-03"))).toBeNull();
  });
});
