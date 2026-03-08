import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { randomUUID } from "node:crypto";
import { Transaction } from "../../domain/entity/transaction.js";
import { Money } from "../../domain/value-object/money.js";
import { BankImportGateway } from "../../application/gateway/bank-import.js";

export class CreditMutuelImporter implements BankImportGateway {
  readonly bankName = "credit-mutuel";

  parse(filePath: string): Transaction[] {
    const content = readFileSync(filePath, "utf-8");
    const records = parse(content, {
      columns: true,
      delimiter: ";",
      skip_empty_lines: true,
      trim: true,
    }) as Array<Record<string, string>>;

    return records.map((row) => {
      // Credit Mutuel CSV columns (French headers): Date;Libellé;Débit;Crédit
      const dateStr = row["Date"];
      const label = row["Libellé"] ?? row["Libelle"] ?? "";
      const debit = row["Débit"] ?? row["Debit"] ?? "";
      const credit = row["Crédit"] ?? row["Credit"] ?? "";

      const [day, month, year] = dateStr.split("/");
      const date = new Date(`${year}-${month}-${day}`);

      const debitAmount = debit ? parseFloat(debit.replace(",", ".")) : 0;
      const creditAmount = credit ? parseFloat(credit.replace(",", ".")) : 0;
      const amount = Money.fromEuros(creditAmount - Math.abs(debitAmount));

      return {
        id: randomUUID(),
        date,
        label,
        amount,
        sourceBank: this.bankName,
      };
    });
  }
}
