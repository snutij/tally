import { Transaction, type TransactionSource } from "../../domain/entity/transaction.js";
import { CategoryId } from "../../domain/value-object/category-id.js";
import { Money } from "../../domain/value-object/money.js";
import { TransactionId } from "../../domain/value-object/transaction-id.js";

type DateFn = (day: number) => Temporal.PlainDate;

function incomeTransactions(
  prefix: string,
  dateFn: DateFn,
  source: TransactionSource,
): Transaction[] {
  return [
    Transaction.create({
      amount: Money.fromEuros(3200),
      categoryId: CategoryId("inc01"),
      date: dateFn(1),
      id: TransactionId(`${prefix}-inc-1`),
      label: "Salary",
      source,
    }),
    Transaction.create({
      amount: Money.fromEuros(750),
      categoryId: CategoryId("inc02"),
      date: dateFn(15),
      id: TransactionId(`${prefix}-inc-2`),
      label: "Rental income",
      source,
    }),
  ];
}

function needsTransactions(
  prefix: string,
  dateFn: DateFn,
  source: TransactionSource,
): Transaction[] {
  return [
    Transaction.create({
      amount: Money.fromEuros(-950),
      categoryId: CategoryId("n01"),
      date: dateFn(1),
      id: TransactionId(`${prefix}-n-1`),
      label: "Rent payment",
      source,
    }),
    Transaction.create({
      amount: Money.fromEuros(-87.5),
      categoryId: CategoryId("n02"),
      date: dateFn(3),
      id: TransactionId(`${prefix}-n-2`),
      label: "Groceries Carrefour",
      source,
    }),
    Transaction.create({
      amount: Money.fromEuros(-62.3),
      categoryId: CategoryId("n02"),
      date: dateFn(10),
      id: TransactionId(`${prefix}-n-3`),
      label: "Groceries Lidl",
      source,
    }),
    Transaction.create({
      amount: Money.fromEuros(-85),
      categoryId: CategoryId("n12"),
      date: dateFn(5),
      id: TransactionId(`${prefix}-n-4`),
      label: "EDF electricity",
      source,
    }),
    Transaction.create({
      amount: Money.fromEuros(-19.99),
      categoryId: CategoryId("n10"),
      date: dateFn(5),
      id: TransactionId(`${prefix}-n-5`),
      label: "Mobile phone",
      source,
    }),
    Transaction.create({
      amount: Money.fromEuros(-120),
      categoryId: CategoryId("n06"),
      date: dateFn(8),
      id: TransactionId(`${prefix}-n-6`),
      label: "Health insurance",
      source,
    }),
    Transaction.create({
      amount: Money.fromEuros(-65),
      categoryId: CategoryId("n07"),
      date: dateFn(12),
      id: TransactionId(`${prefix}-n-7`),
      label: "Gas station",
      source,
    }),
  ];
}

function wantsTransactions(
  prefix: string,
  dateFn: DateFn,
  source: TransactionSource,
): Transaction[] {
  return [
    Transaction.create({
      amount: Money.fromEuros(-45),
      categoryId: CategoryId("w02"),
      date: dateFn(7),
      id: TransactionId(`${prefix}-w-1`),
      label: "Restaurant La Belle",
      source,
    }),
    Transaction.create({
      amount: Money.fromEuros(-22),
      categoryId: CategoryId("w03"),
      date: dateFn(14),
      id: TransactionId(`${prefix}-w-2`),
      label: "Cinema tickets",
      source,
    }),
    Transaction.create({
      amount: Money.fromEuros(-13.49),
      categoryId: CategoryId("w06"),
      date: dateFn(20),
      id: TransactionId(`${prefix}-w-3`),
      label: "Netflix subscription",
      source,
    }),
    Transaction.create({
      amount: Money.fromEuros(-67.8),
      categoryId: CategoryId("w01"),
      date: dateFn(25),
      id: TransactionId(`${prefix}-w-4`),
      label: "Amazon shopping",
      source,
    }),
  ];
}

function investmentTransactions(
  prefix: string,
  dateFn: DateFn,
  source: TransactionSource,
): Transaction[] {
  return [
    Transaction.create({
      amount: Money.fromEuros(-850),
      categoryId: CategoryId("i01"),
      date: dateFn(2),
      id: TransactionId(`${prefix}-i-1`),
      label: "Mortgage repayment",
      source,
    }),
    Transaction.create({
      amount: Money.fromEuros(-200),
      categoryId: CategoryId("i03"),
      date: dateFn(10),
      id: TransactionId(`${prefix}-i-2`),
      label: "ETF monthly buy",
      source,
    }),
  ];
}

function uncategorizedTransactions(
  prefix: string,
  dateFn: DateFn,
  source: TransactionSource,
): Transaction[] {
  return [
    Transaction.create({
      amount: Money.fromEuros(-35),
      date: dateFn(18),
      id: TransactionId(`${prefix}-u-1`),
      label: "Unknown transfer",
      source,
    }),
    Transaction.create({
      amount: Money.fromEuros(-60),
      date: dateFn(22),
      id: TransactionId(`${prefix}-u-2`),
      label: "ATM withdrawal",
      source,
    }),
  ];
}

/**
 * Pre-categorized mock transactions for a given month.
 * Category IDs reference DEFAULT_CATEGORIES (stable, never change).
 * Includes 2 uncategorized transactions for edge-case testing.
 */
export function mockTransactions(year: number, month: number): Transaction[] {
  function dateFn(day: number): Temporal.PlainDate {
    return Temporal.PlainDate.from(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    );
  }
  const source: TransactionSource = "mock";
  const prefix = `mock-${year}${month}`;

  return [
    ...incomeTransactions(prefix, dateFn, source),
    ...needsTransactions(prefix, dateFn, source),
    ...wantsTransactions(prefix, dateFn, source),
    ...investmentTransactions(prefix, dateFn, source),
    ...uncategorizedTransactions(prefix, dateFn, source),
  ];
}
