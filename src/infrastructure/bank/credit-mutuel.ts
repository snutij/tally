import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { Transaction } from "../../domain/entity/transaction.js";
import { Money } from "../../domain/value-object/money.js";
import { BankImportGateway } from "../../application/gateway/bank-import.js";
import { deterministicTransactionId } from "./transaction-id.js";

export class CreditMutuelImporter implements BankImportGateway {
  readonly bankName = "credit-mutuel";

  parse(filePath: string): Transaction[] {
    // Credit Mutuel CSVs may be encoded in Latin-1/ISO-8859-1
    const raw = readFileSync(filePath);
    const content = this.decode(raw);

    const records = parse(content, {
      columns: true,
      delimiter: ";",
      skip_empty_lines: true,
      trim: true,
    }) as Array<Record<string, string>>;

    const seen = new Map<string, number>();

    return records.map((row) => {
      // Real format: Date;Date de valeur;Montant;Libellé;Solde
      const dateStr = row["Date"];
      const label = this.findColumn(row, ["Libellé", "Libelle"]);
      const montant = this.findColumn(row, ["Montant"]);

      const [day, month, year] = dateStr.split("/");
      const date = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)));

      const amount = Money.fromEuros(
        parseFloat(montant.replace(/\s/g, "").replace(",", ".")) || 0,
      );

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

  private findColumn(row: Record<string, string>, candidates: string[]): string {
    for (const key of candidates) {
      if (row[key] !== undefined) return row[key];
    }
    // Fallback: fuzzy match for encoding issues (e.g. Libell\xe9 vs Libellé)
    const rowKeys = Object.keys(row);
    for (const candidate of candidates) {
      const normalized = candidate.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const match = rowKeys.find(
        (k) =>
          k.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normalized,
      );
      if (match) return row[match];
    }
    return "";
  }

  private decode(buffer: Buffer): string {
    const utf8 = buffer.toString("utf-8");
    // If UTF-8 decoding produces replacement characters, try Latin-1
    if (utf8.includes("\ufffd")) {
      return buffer.toString("latin1");
    }
    return utf8;
  }
}
