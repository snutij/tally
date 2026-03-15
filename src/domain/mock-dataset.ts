import { DateOnly } from "./value-object/date-only.js";
import { Money } from "./value-object/money.js";
import type { Transaction } from "./entity/transaction.js";

type DateFn = (day: number) => DateOnly;

function incomeTransactions(prefix: string, dateFn: DateFn, bank: string): Transaction[] {
  return [
    {
      amount: Money.fromEuros(3200),
      categoryId: "inc01",
      date: dateFn(1),
      id: `${prefix}-inc-1`,
      label: "Salary",
      source: bank,
    },
    {
      amount: Money.fromEuros(750),
      categoryId: "inc02",
      date: dateFn(15),
      id: `${prefix}-inc-2`,
      label: "Rental income",
      source: bank,
    },
  ];
}

function needsTransactions(prefix: string, dateFn: DateFn, bank: string): Transaction[] {
  return [
    {
      amount: Money.fromEuros(-950),
      categoryId: "n01",
      date: dateFn(1),
      id: `${prefix}-n-1`,
      label: "Rent payment",
      source: bank,
    },
    {
      amount: Money.fromEuros(-87.5),
      categoryId: "n02",
      date: dateFn(3),
      id: `${prefix}-n-2`,
      label: "Groceries Carrefour",
      source: bank,
    },
    {
      amount: Money.fromEuros(-62.3),
      categoryId: "n02",
      date: dateFn(10),
      id: `${prefix}-n-3`,
      label: "Groceries Lidl",
      source: bank,
    },
    {
      amount: Money.fromEuros(-85),
      categoryId: "n12",
      date: dateFn(5),
      id: `${prefix}-n-4`,
      label: "EDF electricity",
      source: bank,
    },
    {
      amount: Money.fromEuros(-19.99),
      categoryId: "n10",
      date: dateFn(5),
      id: `${prefix}-n-5`,
      label: "Mobile phone",
      source: bank,
    },
    {
      amount: Money.fromEuros(-120),
      categoryId: "n06",
      date: dateFn(8),
      id: `${prefix}-n-6`,
      label: "Health insurance",
      source: bank,
    },
    {
      amount: Money.fromEuros(-65),
      categoryId: "n07",
      date: dateFn(12),
      id: `${prefix}-n-7`,
      label: "Gas station",
      source: bank,
    },
  ];
}

function wantsTransactions(prefix: string, dateFn: DateFn, bank: string): Transaction[] {
  return [
    {
      amount: Money.fromEuros(-45),
      categoryId: "w02",
      date: dateFn(7),
      id: `${prefix}-w-1`,
      label: "Restaurant La Belle",
      source: bank,
    },
    {
      amount: Money.fromEuros(-22),
      categoryId: "w03",
      date: dateFn(14),
      id: `${prefix}-w-2`,
      label: "Cinema tickets",
      source: bank,
    },
    {
      amount: Money.fromEuros(-13.49),
      categoryId: "w06",
      date: dateFn(20),
      id: `${prefix}-w-3`,
      label: "Netflix subscription",
      source: bank,
    },
    {
      amount: Money.fromEuros(-67.8),
      categoryId: "w01",
      date: dateFn(25),
      id: `${prefix}-w-4`,
      label: "Amazon shopping",
      source: bank,
    },
  ];
}

function investmentTransactions(prefix: string, dateFn: DateFn, bank: string): Transaction[] {
  return [
    {
      amount: Money.fromEuros(-850),
      categoryId: "i01",
      date: dateFn(2),
      id: `${prefix}-i-1`,
      label: "Mortgage repayment",
      source: bank,
    },
    {
      amount: Money.fromEuros(-200),
      categoryId: "i03",
      date: dateFn(10),
      id: `${prefix}-i-2`,
      label: "ETF monthly buy",
      source: bank,
    },
  ];
}

function uncategorizedTransactions(prefix: string, dateFn: DateFn, bank: string): Transaction[] {
  return [
    {
      amount: Money.fromEuros(-35),
      date: dateFn(18),
      id: `${prefix}-u-1`,
      label: "Unknown transfer",
      source: bank,
    },
    {
      amount: Money.fromEuros(-60),
      date: dateFn(22),
      id: `${prefix}-u-2`,
      label: "ATM withdrawal",
      source: bank,
    },
  ];
}

/**
 * Pre-categorized mock transactions for a given month.
 * Category IDs reference DEFAULT_CATEGORIES (stable, never change).
 * Includes 2 uncategorized transactions for edge-case testing.
 */
export function mockTransactions(year: number, month: number): Transaction[] {
  function dateFn(day: number): DateOnly {
    return DateOnly.from(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    );
  }
  const bank = "mock";
  const prefix = `mock-${year}${month}`;

  return [
    ...incomeTransactions(prefix, dateFn, bank),
    ...needsTransactions(prefix, dateFn, bank),
    ...wantsTransactions(prefix, dateFn, bank),
    ...investmentTransactions(prefix, dateFn, bank),
    ...uncategorizedTransactions(prefix, dateFn, bank),
  ];
}
