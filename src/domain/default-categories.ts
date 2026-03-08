import { Category } from "./entity/category.js";
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

export const DEFAULT_CATEGORIES: Category[] = [
  // NEEDS
  cat("rent", "Rent", N),
  cat("groceries", "Groceries", N),
  cat("insurance", "Insurance", N),
  cat("fuel", "Fuel", N),
  cat("transport", "Transport", N),
  cat("mortgage-interest", "Mortgage interest", N),
  cat("phone", "Phone", N),
  cat("internet", "Internet", N),
  cat("electricity", "Electricity", N),
  cat("gas", "Gas", N),
  cat("water", "Water", N),
  cat("taxes", "Taxes", N),
  cat("health", "Health", N),
  cat("consumer-loans", "Consumer loans", N),
  cat("other-needs", "Other needs", N),
  // WANTS
  cat("shopping", "Shopping", W),
  cat("dining-out", "Dining out", W),
  cat("travel", "Travel", W),
  cat("beauty", "Beauty", W),
  cat("subscriptions", "Subscriptions", W),
  cat("gifts", "Gifts", W),
  cat("other-wants", "Other wants", W),
  // INVESTMENTS
  cat("mortgage-repayment", "Mortgage repayment", I),
  cat("emergency-fund", "Emergency fund", I),
  cat("pea", "PEA", I),
  cat("brokerage", "Brokerage", I),
  cat("life-insurance", "Life insurance", I),
];
