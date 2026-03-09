import type { Category } from "./entity/category.js";
import { CategoryGroup } from "./value-object/category-group.js";

function cat(
  id: string,
  name: string,
  group: CategoryGroup,
): Category {
  return { id, name, group };
}

const N = CategoryGroup.NEEDS;
const W = CategoryGroup.WANTS;
const I = CategoryGroup.INVESTMENTS;
const Inc = CategoryGroup.INCOME;

// IDs are stable and must NEVER change — they are stored in the DB.
// Rename display names freely. Add new categories at the end of each group.
export const DEFAULT_CATEGORIES: Category[] = [
  // NEEDS
  cat("n01", "Rent", N),
  cat("n02", "Groceries", N),
  cat("n03", "Shared expenses", N),
  cat("n04", "Baby", N),
  cat("n05", "Household", N),
  cat("n06", "Insurance", N),
  cat("n07", "Fuel", N),
  cat("n08", "Transport", N),
  cat("n09", "Mortgage interest", N),
  cat("n10", "Phone", N),
  cat("n11", "Internet", N),
  cat("n12", "Electricity", N),
  cat("n13", "Gas", N),
  cat("n14", "Water", N),
  cat("n15", "Taxes", N),
  cat("n16", "Health", N),
  cat("n17", "Other needs", N),
  // WANTS
  cat("w01", "Shopping", W),
  cat("w02", "Eating out", W),
  cat("w03", "Entertainment", W),
  cat("w04", "Travel", W),
  cat("w05", "Beauty", W),
  cat("w06", "Subscriptions", W),
  cat("w07", "Gifts", W),
  cat("w08", "Other wants", W),
  // INVESTMENTS
  cat("i01", "Mortgage repayment", I),
  cat("i02", "Savings", I),
  cat("i03", "Stock market", I),
  cat("i04", "Life insurance", I),
  // INCOME
  cat("inc01", "Salary", Inc),
  cat("inc02", "Rental income", Inc),
  cat("inc03", "Allowances & Benefits", Inc),
  cat("inc04", "Refund", Inc),
];
