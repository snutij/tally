import { Money } from "../value-object/money.js";

export interface Transaction {
  readonly id: string;
  readonly date: Date;
  readonly label: string;
  readonly amount: Money;
  readonly categoryId?: string;
  readonly sourceBank: string;
}
