import type { Category } from "./value-object/category.js";
import { CategoryGroup } from "./value-object/category-group.js";
import { CategoryId } from "./value-object/category-id.js";

function cat(id: string, name: string, group: CategoryGroup): Category {
  return { group, id: CategoryId(id), name };
}

const { NEEDS, WANTS, INVESTMENTS: INVEST, INCOME: INC } = CategoryGroup;

// IDs are stable and must NEVER change — they are stored in the DB.
// Rename display names freely. Add new categories at the end of each group.
export const DEFAULT_CATEGORIES: Category[] = [
  // NEEDS
  cat("n01", "Rent", NEEDS),
  cat("n02", "Groceries", NEEDS),
  cat("n03", "Shared expenses", NEEDS),
  cat("n04", "Baby", NEEDS),
  cat("n05", "Household", NEEDS),
  cat("n06", "Insurance", NEEDS),
  cat("n07", "Fuel", NEEDS),
  cat("n08", "Transport", NEEDS),
  cat("n09", "Mortgage interest", NEEDS),
  cat("n10", "Phone", NEEDS),
  cat("n11", "Internet", NEEDS),
  cat("n12", "Electricity", NEEDS),
  cat("n13", "Gas", NEEDS),
  cat("n14", "Water", NEEDS),
  cat("n15", "Taxes", NEEDS),
  cat("n16", "Health", NEEDS),
  cat("n17", "Other needs", NEEDS),
  // WANTS
  cat("w01", "Shopping", WANTS),
  cat("w02", "Eating out", WANTS),
  cat("w03", "Entertainment", WANTS),
  cat("w04", "Travel", WANTS),
  cat("w05", "Beauty", WANTS),
  cat("w06", "Subscriptions", WANTS),
  cat("w07", "Gifts", WANTS),
  cat("w08", "Other wants", WANTS),
  // INVESTMENTS
  cat("i01", "Mortgage repayment", INVEST),
  cat("i02", "Savings", INVEST),
  cat("i03", "Stock market", INVEST),
  cat("i04", "Life insurance", INVEST),
  // INCOME
  cat("inc01", "Salary", INC),
  cat("inc02", "Rental income", INC),
  cat("inc03", "Allowances & Benefits", INC),
  cat("inc04", "Refund", INC),
];
