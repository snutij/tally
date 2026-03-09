import type { Transaction } from "./entity/transaction.js";
import { DateOnly } from "./value-object/date-only.js";
import { Money } from "./value-object/money.js";

/**
 * Pre-categorized mock transactions for a given month.
 * Category IDs reference DEFAULT_CATEGORIES (stable, never change).
 * Includes 2 uncategorized transactions for edge-case testing.
 */
export function mockTransactions(year: number, month: number): Transaction[] {
  const d = (day: number) =>
    DateOnly.from(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  const bank = "mock";

  return [
    // INCOME
    {
      id: `mock-${year}${month}-inc-1`,
      date: d(1),
      label: "Salary",
      amount: Money.fromEuros(3200),
      categoryId: "inc01",
      sourceBank: bank,
    },
    {
      id: `mock-${year}${month}-inc-2`,
      date: d(15),
      label: "Rental income",
      amount: Money.fromEuros(750),
      categoryId: "inc02",
      sourceBank: bank,
    },

    // NEEDS
    {
      id: `mock-${year}${month}-n-1`,
      date: d(1),
      label: "Rent payment",
      amount: Money.fromEuros(-950),
      categoryId: "n01",
      sourceBank: bank,
    },
    {
      id: `mock-${year}${month}-n-2`,
      date: d(3),
      label: "Groceries Carrefour",
      amount: Money.fromEuros(-87.5),
      categoryId: "n02",
      sourceBank: bank,
    },
    {
      id: `mock-${year}${month}-n-3`,
      date: d(10),
      label: "Groceries Lidl",
      amount: Money.fromEuros(-62.3),
      categoryId: "n02",
      sourceBank: bank,
    },
    {
      id: `mock-${year}${month}-n-4`,
      date: d(5),
      label: "EDF electricity",
      amount: Money.fromEuros(-85),
      categoryId: "n12",
      sourceBank: bank,
    },
    {
      id: `mock-${year}${month}-n-5`,
      date: d(5),
      label: "Mobile phone",
      amount: Money.fromEuros(-19.99),
      categoryId: "n10",
      sourceBank: bank,
    },
    {
      id: `mock-${year}${month}-n-6`,
      date: d(8),
      label: "Health insurance",
      amount: Money.fromEuros(-120),
      categoryId: "n06",
      sourceBank: bank,
    },
    {
      id: `mock-${year}${month}-n-7`,
      date: d(12),
      label: "Gas station",
      amount: Money.fromEuros(-65),
      categoryId: "n07",
      sourceBank: bank,
    },

    // WANTS
    {
      id: `mock-${year}${month}-w-1`,
      date: d(7),
      label: "Restaurant La Belle",
      amount: Money.fromEuros(-45),
      categoryId: "w02",
      sourceBank: bank,
    },
    {
      id: `mock-${year}${month}-w-2`,
      date: d(14),
      label: "Cinema tickets",
      amount: Money.fromEuros(-22),
      categoryId: "w03",
      sourceBank: bank,
    },
    {
      id: `mock-${year}${month}-w-3`,
      date: d(20),
      label: "Netflix subscription",
      amount: Money.fromEuros(-13.49),
      categoryId: "w06",
      sourceBank: bank,
    },
    {
      id: `mock-${year}${month}-w-4`,
      date: d(25),
      label: "Amazon shopping",
      amount: Money.fromEuros(-67.8),
      categoryId: "w01",
      sourceBank: bank,
    },

    // INVESTMENTS
    {
      id: `mock-${year}${month}-i-1`,
      date: d(2),
      label: "Mortgage repayment",
      amount: Money.fromEuros(-850),
      categoryId: "i01",
      sourceBank: bank,
    },
    {
      id: `mock-${year}${month}-i-2`,
      date: d(10),
      label: "ETF monthly buy",
      amount: Money.fromEuros(-200),
      categoryId: "i03",
      sourceBank: bank,
    },

    // UNCATEGORIZED
    {
      id: `mock-${year}${month}-u-1`,
      date: d(18),
      label: "Unknown transfer",
      amount: Money.fromEuros(-35),
      sourceBank: bank,
    },
    {
      id: `mock-${year}${month}-u-2`,
      date: d(22),
      label: "ATM withdrawal",
      amount: Money.fromEuros(-60),
      sourceBank: bank,
    },
  ];
}

/**
 * Realistic budget amounts per category ID (euros).
 * Only includes categories used in mockTransactions.
 */
export const MOCK_BUDGET_AMOUNTS: Record<string, number> = {
  // INCOME
  inc01: 3200,
  inc02: 750,
  // NEEDS
  n01: 950,
  n02: 200,
  n06: 120,
  n07: 80,
  n10: 20,
  n12: 90,
  // WANTS
  w01: 100,
  w02: 60,
  w03: 30,
  w06: 15,
  // INVESTMENTS
  i01: 850,
  i03: 200,
};
