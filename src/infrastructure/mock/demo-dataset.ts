import { Transaction, type TransactionSource } from "../../domain/entity/transaction.js";
import { CategoryId } from "../../domain/value-object/category-id.js";
import { Money } from "../../domain/value-object/money.js";
import { TransactionId } from "../../domain/value-object/transaction-id.js";

const SOURCE: TransactionSource = "mock";

function mkDate(year: number, month: number, day: number): Temporal.PlainDate {
  return Temporal.PlainDate.from(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  );
}

function txn(
  id: string,
  date: Temporal.PlainDate,
  euros: number,
  label: string,
  categoryId?: string,
): Transaction {
  return Transaction.create({
    amount: Money.fromEuros(euros),
    categoryId: categoryId === undefined ? undefined : CategoryId(categoryId),
    date,
    id: TransactionId(id),
    label,
    source: SOURCE,
  });
}

/**
 * January 2026 — winter, year-end bonus, heating bills high.
 * 22 transactions.
 */
function jan2026(): Transaction[] {
  const prefix = "demo-202601";
  function dayOf(day: number): Temporal.PlainDate {
    return mkDate(2026, 1, day);
  }
  return [
    // Income
    txn(`${prefix}-inc-1`, dayOf(1), 3200, "Salaire janvier", "inc01"),
    txn(`${prefix}-inc-2`, dayOf(31), 800, "Prime annuelle", "inc03"),
    // Needs
    txn(`${prefix}-n-1`, dayOf(1), -950, "Loyer janvier", "n01"),
    txn(`${prefix}-n-2`, dayOf(4), -92, "Carrefour Market", "n02"),
    txn(`${prefix}-n-3`, dayOf(15), -58, "Lidl", "n02"),
    txn(`${prefix}-n-4`, dayOf(5), -110, "EDF electricite", "n12"),
    txn(`${prefix}-n-5`, dayOf(6), -75, "Engie gaz", "n13"),
    txn(`${prefix}-n-6`, dayOf(5), -19.99, "Free Mobile", "n10"),
    txn(`${prefix}-n-7`, dayOf(6), -35, "SFR Box internet", "n11"),
    txn(`${prefix}-n-8`, dayOf(8), -120, "Mutuelle sante", "n06"),
    txn(`${prefix}-n-9`, dayOf(3), -86, "RATP Navigo mensuel", "n08"),
    // Wants
    txn(`${prefix}-w-1`, dayOf(8), -45, "Restaurant La Belle", "w02"),
    txn(`${prefix}-w-2`, dayOf(12), -12, "McDonald's", "w02"),
    txn(`${prefix}-w-3`, dayOf(20), -13.49, "Netflix", "w06"),
    txn(`${prefix}-w-4`, dayOf(20), -9.99, "Spotify", "w06"),
    txn(`${prefix}-w-5`, dayOf(25), -67.8, "Amazon", "w01"),
    // Investments
    txn(`${prefix}-i-1`, dayOf(2), -850, "Credit immobilier", "i01"),
    txn(`${prefix}-i-2`, dayOf(10), -200, "Achat ETF World", "i03"),
    txn(`${prefix}-i-3`, dayOf(4), -500, "Virement Livret A", "i02"),
    // Edge cases
    txn(`${prefix}-e-1`, dayOf(26), 35, "Remboursement Amazon", "inc04"),
    txn(`${prefix}-e-2`, dayOf(18), -80, "Retrait DAB"), // uncategorized
    txn(`${prefix}-e-3`, dayOf(22), -50, "Virement divers"), // uncategorized
  ];
}

/**
 * February 2026 — winter, Valentine's dinner.
 * 19 transactions.
 */
function feb2026(): Transaction[] {
  const prefix = "demo-202602";
  function dayOf(day: number): Temporal.PlainDate {
    return mkDate(2026, 2, day);
  }
  return [
    // Income
    txn(`${prefix}-inc-1`, dayOf(1), 3200, "Salaire fevrier", "inc01"),
    // Needs
    txn(`${prefix}-n-1`, dayOf(1), -950, "Loyer fevrier", "n01"),
    txn(`${prefix}-n-2`, dayOf(5), -85, "Carrefour Market", "n02"),
    txn(`${prefix}-n-3`, dayOf(14), -55, "Lidl", "n02"),
    txn(`${prefix}-n-4`, dayOf(4), -105, "EDF electricite", "n12"),
    txn(`${prefix}-n-5`, dayOf(5), -70, "Engie gaz", "n13"),
    txn(`${prefix}-n-6`, dayOf(5), -19.99, "Free Mobile", "n10"),
    txn(`${prefix}-n-7`, dayOf(5), -35, "SFR Box internet", "n11"),
    txn(`${prefix}-n-8`, dayOf(8), -120, "Mutuelle sante", "n06"),
    txn(`${prefix}-n-9`, dayOf(3), -86, "RATP Navigo mensuel", "n08"),
    // Wants
    txn(`${prefix}-w-1`, dayOf(14), -65, "Restaurant Le Petit Bistrot", "w02"),
    txn(`${prefix}-w-2`, dayOf(18), -9.5, "McDonald's", "w02"),
    txn(`${prefix}-w-3`, dayOf(20), -13.49, "Netflix", "w06"),
    txn(`${prefix}-w-4`, dayOf(20), -9.99, "Spotify", "w06"),
    txn(`${prefix}-w-5`, dayOf(22), -89, "Decathlon", "w01"),
    // Investments
    txn(`${prefix}-i-1`, dayOf(2), -850, "Credit immobilier", "i01"),
    txn(`${prefix}-i-2`, dayOf(10), -200, "Achat ETF World", "i03"),
    // Edge cases
    txn(`${prefix}-e-1`, dayOf(17), -60, "Retrait DAB"), // uncategorized
    txn(`${prefix}-e-2`, dayOf(23), -35, "Virement tiers"), // uncategorized
  ];
}

/**
 * March 2026 — spring, freelance income, heating tapering off.
 * 21 transactions.
 */
function mar2026(): Transaction[] {
  const prefix = "demo-202603";
  function dayOf(day: number): Temporal.PlainDate {
    return mkDate(2026, 3, day);
  }
  return [
    // Income
    txn(`${prefix}-inc-1`, dayOf(1), 3200, "Salaire mars", "inc01"),
    txn(`${prefix}-inc-2`, dayOf(15), 450, "Prestation freelance", "inc03"),
    // Needs
    txn(`${prefix}-n-1`, dayOf(1), -950, "Loyer mars", "n01"),
    txn(`${prefix}-n-2`, dayOf(5), -88, "Carrefour Market", "n02"),
    txn(`${prefix}-n-3`, dayOf(14), -52, "Lidl", "n02"),
    txn(`${prefix}-n-4`, dayOf(4), -85, "EDF electricite", "n12"),
    txn(`${prefix}-n-5`, dayOf(5), -45, "Engie gaz", "n13"),
    txn(`${prefix}-n-6`, dayOf(5), -19.99, "Free Mobile", "n10"),
    txn(`${prefix}-n-7`, dayOf(5), -35, "SFR Box internet", "n11"),
    txn(`${prefix}-n-8`, dayOf(8), -120, "Mutuelle sante", "n06"),
    txn(`${prefix}-n-9`, dayOf(3), -86, "RATP Navigo mensuel", "n08"),
    // Wants
    txn(`${prefix}-w-1`, dayOf(8), -38, "Restaurant Le Comptoir", "w02"),
    txn(`${prefix}-w-2`, dayOf(21), -15.5, "KFC", "w02"),
    txn(`${prefix}-w-3`, dayOf(20), -13.49, "Netflix", "w06"),
    txn(`${prefix}-w-4`, dayOf(20), -9.99, "Spotify", "w06"),
    txn(`${prefix}-w-5`, dayOf(25), -55, "Amazon", "w01"),
    // Investments
    txn(`${prefix}-i-1`, dayOf(2), -850, "Credit immobilier", "i01"),
    txn(`${prefix}-i-2`, dayOf(10), -200, "Achat ETF World", "i03"),
    // Edge cases
    txn(`${prefix}-e-1`, dayOf(26), 28, "Remboursement Fnac", "inc04"),
    txn(`${prefix}-e-2`, dayOf(16), -60, "Retrait DAB"), // uncategorized
    txn(`${prefix}-e-3`, dayOf(23), -45, "Virement divers"), // uncategorized
  ];
}

/**
 * April 2026 — vacation month (Booking.com + SNCF).
 * Spending spike in Wants, lower transport (less commuting).
 * 22 transactions.
 */
function apr2026(): Transaction[] {
  const prefix = "demo-202604";
  function dayOf(day: number): Temporal.PlainDate {
    return mkDate(2026, 4, day);
  }
  return [
    // Income
    txn(`${prefix}-inc-1`, dayOf(1), 3200, "Salaire avril", "inc01"),
    // Needs (no heating in spring)
    txn(`${prefix}-n-1`, dayOf(1), -950, "Loyer avril", "n01"),
    txn(`${prefix}-n-2`, dayOf(5), -72, "Carrefour Market", "n02"),
    txn(`${prefix}-n-3`, dayOf(20), -44, "Lidl", "n02"),
    txn(`${prefix}-n-4`, dayOf(4), -65, "EDF electricite", "n12"),
    txn(`${prefix}-n-5`, dayOf(5), -19.99, "Free Mobile", "n10"),
    txn(`${prefix}-n-6`, dayOf(5), -35, "SFR Box internet", "n11"),
    txn(`${prefix}-n-7`, dayOf(8), -120, "Mutuelle sante", "n06"),
    txn(`${prefix}-n-8`, dayOf(3), -30, "RATP Navigo mensuel", "n08"),
    // Wants (vacation spike)
    txn(`${prefix}-w-1`, dayOf(3), -1100, "Booking.com", "w04"),
    txn(`${prefix}-w-2`, dayOf(3), -280, "SNCF", "w04"),
    txn(`${prefix}-w-3`, dayOf(10), -75, "Restaurant La Bonne Table", "w02"),
    txn(`${prefix}-w-4`, dayOf(15), -12.5, "Starbucks", "w02"),
    txn(`${prefix}-w-5`, dayOf(22), -22, "Uber Eats", "w02"),
    txn(`${prefix}-w-6`, dayOf(20), -13.49, "Netflix", "w06"),
    txn(`${prefix}-w-7`, dayOf(20), -9.99, "Spotify", "w06"),
    txn(`${prefix}-w-8`, dayOf(2), -65, "Decathlon", "w01"),
    // Investments
    txn(`${prefix}-i-1`, dayOf(2), -850, "Credit immobilier", "i01"),
    txn(`${prefix}-i-2`, dayOf(10), -200, "Achat ETF World", "i03"),
    // Edge cases
    txn(`${prefix}-e-1`, dayOf(15), 45, "Remboursement Decathlon", "inc04"),
    txn(`${prefix}-e-2`, dayOf(7), -120, "Retrait DAB"), // uncategorized — travel cash
    txn(`${prefix}-e-3`, dayOf(25), -35, "Virement particulier"), // uncategorized
  ];
}

/**
 * May 2026 — back to normal, Sephora purchase + refund.
 * 21 transactions.
 */
function may2026(): Transaction[] {
  const prefix = "demo-202605";
  function dayOf(day: number): Temporal.PlainDate {
    return mkDate(2026, 5, day);
  }
  return [
    // Income
    txn(`${prefix}-inc-1`, dayOf(1), 3200, "Salaire mai", "inc01"),
    // Needs
    txn(`${prefix}-n-1`, dayOf(1), -950, "Loyer mai", "n01"),
    txn(`${prefix}-n-2`, dayOf(5), -90, "Carrefour Market", "n02"),
    txn(`${prefix}-n-3`, dayOf(14), -58, "Lidl", "n02"),
    txn(`${prefix}-n-4`, dayOf(20), -26, "Picard", "n02"),
    txn(`${prefix}-n-5`, dayOf(4), -55, "EDF electricite", "n12"),
    txn(`${prefix}-n-6`, dayOf(5), -19.99, "Free Mobile", "n10"),
    txn(`${prefix}-n-7`, dayOf(5), -35, "SFR Box internet", "n11"),
    txn(`${prefix}-n-8`, dayOf(8), -120, "Mutuelle sante", "n06"),
    txn(`${prefix}-n-9`, dayOf(3), -86, "RATP Navigo mensuel", "n08"),
    // Wants
    txn(`${prefix}-w-1`, dayOf(9), -48, "Sushi Shop", "w02"),
    txn(`${prefix}-w-2`, dayOf(17), -19.9, "Deliveroo", "w02"),
    txn(`${prefix}-w-3`, dayOf(20), -13.49, "Netflix", "w06"),
    txn(`${prefix}-w-4`, dayOf(20), -9.99, "Spotify", "w06"),
    txn(`${prefix}-w-5`, dayOf(25), -83, "Amazon", "w01"),
    txn(`${prefix}-w-6`, dayOf(12), -42, "Sephora", "w05"),
    // Investments
    txn(`${prefix}-i-1`, dayOf(2), -850, "Credit immobilier", "i01"),
    txn(`${prefix}-i-2`, dayOf(10), -200, "Achat ETF World", "i03"),
    // Edge cases
    txn(`${prefix}-e-1`, dayOf(19), 42, "Remboursement Sephora", "inc04"),
    txn(`${prefix}-e-2`, dayOf(18), -80, "Retrait DAB"), // uncategorized
    txn(`${prefix}-e-3`, dayOf(27), -55, "Virement divers"), // uncategorized
  ];
}

/**
 * June 2026 — early summer, second freelance month, lowest utility bills.
 * 20 transactions.
 */
function jun2026(): Transaction[] {
  const prefix = "demo-202606";
  function dayOf(day: number): Temporal.PlainDate {
    return mkDate(2026, 6, day);
  }
  return [
    // Income
    txn(`${prefix}-inc-1`, dayOf(1), 3200, "Salaire juin", "inc01"),
    txn(`${prefix}-inc-2`, dayOf(15), 480, "Prestation freelance", "inc03"),
    // Needs
    txn(`${prefix}-n-1`, dayOf(1), -950, "Loyer juin", "n01"),
    txn(`${prefix}-n-2`, dayOf(5), -94, "Carrefour Market", "n02"),
    txn(`${prefix}-n-3`, dayOf(14), -48, "Lidl", "n02"),
    txn(`${prefix}-n-4`, dayOf(4), -48, "EDF electricite", "n12"),
    txn(`${prefix}-n-5`, dayOf(5), -19.99, "Free Mobile", "n10"),
    txn(`${prefix}-n-6`, dayOf(5), -35, "SFR Box internet", "n11"),
    txn(`${prefix}-n-7`, dayOf(8), -120, "Mutuelle sante", "n06"),
    txn(`${prefix}-n-8`, dayOf(3), -86, "RATP Navigo mensuel", "n08"),
    // Wants
    txn(`${prefix}-w-1`, dayOf(13), -52, "Restaurant Le Marais", "w02"),
    txn(`${prefix}-w-2`, dayOf(20), -18.5, "Wolt", "w02"),
    txn(`${prefix}-w-3`, dayOf(20), -13.49, "Netflix", "w06"),
    txn(`${prefix}-w-4`, dayOf(20), -9.99, "Spotify", "w06"),
    txn(`${prefix}-w-5`, dayOf(25), -61, "Amazon", "w01"),
    // Investments
    txn(`${prefix}-i-1`, dayOf(2), -850, "Credit immobilier", "i01"),
    txn(`${prefix}-i-2`, dayOf(10), -200, "Achat ETF World", "i03"),
    // Edge cases
    txn(`${prefix}-e-1`, dayOf(28), 29, "Remboursement Amazon", "inc04"),
    txn(`${prefix}-e-2`, dayOf(17), -60, "Retrait DAB"), // uncategorized
    txn(`${prefix}-e-3`, dayOf(24), -40, "Virement tiers"), // uncategorized
  ];
}

/**
 * Full demo dataset: 6 months of pre-categorized transactions covering a
 * realistic French household budget (Jan → Jun 2026).
 *
 * Returns transactions for the requested month, or [] for months outside
 * the demo range. Category IDs reference DEFAULT_CATEGORIES (stable, never change).
 *
 * Each month includes 2+ uncategorized transactions to exercise the
 * manual categorization workflow.
 */
export function demoTransactions(year: number, month: number): Transaction[] {
  if (year !== 2026) {
    return [];
  }
  switch (month) {
    case 1: {
      return jan2026();
    }
    case 2: {
      return feb2026();
    }
    case 3: {
      return mar2026();
    }
    case 4: {
      return apr2026();
    }
    case 5: {
      return may2026();
    }
    case 6: {
      return jun2026();
    }
    default: {
      return [];
    }
  }
}
