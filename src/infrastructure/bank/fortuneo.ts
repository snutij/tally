import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { Transaction } from "../../domain/entity/transaction.js";
import { Money } from "../../domain/value-object/money.js";
import { BankImportGateway } from "../../application/gateway/bank-import.js";
import { deterministicTransactionId } from "./transaction-id.js";

export class FortuneoImporter implements BankImportGateway {
  readonly bankName = "fortuneo";

  parse(filePath: string): Transaction[] {
    const content = readFileSync(filePath, "utf-8");
    const records = parse(content, {
      columns: true,
      delimiter: ";",
      skip_empty_lines: true,
      trim: true,
    }) as Array<Record<string, string>>;

    const seen = new Map<string, number>();

    return records.map((row) => {
      // Fortuneo CSV columns (French headers): Date opération;Libellé;Débit;Crédit
      const dateStr =
        row["Date opération"] ?? row["Date operation"] ?? row["Date"] ?? "";
      const label = row["Libellé"] ?? row["Libelle"] ?? "";
      const debit = row["Débit"] ?? row["Debit"] ?? "";
      const credit = row["Crédit"] ?? row["Credit"] ?? "";

      const [day, month, year] = dateStr.split("/");
      const date = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)));

      const debitAmount = debit ? parseFloat(debit.replace(",", ".")) : 0;
      const creditAmount = credit ? parseFloat(credit.replace(",", ".")) : 0;
      const amount = Money.fromEuros(creditAmount - Math.abs(debitAmount));

      const isoDate = `${year}-${month}-${day}`;
      const key = `${this.bankName}|${isoDate}|${label}|${amount.cents}`;
      const seq = seen.get(key) ?? 0;
      seen.set(key, seq + 1);

      return {
        id: deterministicTransactionId(this.bankName, isoDate, label, amount.cents, seq),
        date,
        label,
        amount,
        sourceBank: this.bankName,
      };
    });
  }
}
