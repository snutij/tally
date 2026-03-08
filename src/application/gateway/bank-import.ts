import { Transaction } from "../../domain/entity/transaction.js";

export interface BankImportGateway {
  readonly bankName: string;
  parse(filePath: string): Transaction[];
}
