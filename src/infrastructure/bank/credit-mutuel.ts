import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import type { Transaction } from "../../domain/entity/transaction.js";
import { Money } from "../../domain/value-object/money.js";
import type { BankImportGateway } from "../../application/gateway/bank-import.js";
import { deterministicTransactionId } from "./transaction-id.js";
import { parseEuroAmount, parseFrenchDate } from "./csv-helpers.js";

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
    }) as Record<string, string>[];

    const seen = new Map<string, number>();

    return records.map((row) => {
      // Real format: Date;Date de valeur;Montant;Libellé;Solde
      const dateStr = row["Date"];
      const label = this.findColumn(row, ["Libellé", "Libelle"]);
      const montant = this.findColumn(row, ["Montant"]);

      const date = parseFrenchDate(dateStr);
      const amount = Money.fromEuros(parseEuroAmount(montant));

      const isoDate = date.toString();
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
      if (row[key] !== undefined) {
        return row[key];
      }
    }
    // Fallback: fuzzy match for encoding issues (e.g. Libell\xe9 vs Libellé)
    const rowKeys = Object.keys(row);
    for (const candidate of candidates) {
      const normalized = candidate.normalize("NFD").replaceAll(/[\u0300-\u036F]/g, "");
      const match = rowKeys.find(
        (k) => k.normalize("NFD").replaceAll(/[\u0300-\u036F]/g, "") === normalized,
      );
      if (match) {
        return row[match];
      }
    }
    return "";
  }

  private decode(buffer: Buffer): string {
    const utf8 = buffer.toString("utf8");
    // If UTF-8 decoding produces replacement characters, try Latin-1
    if (utf8.includes("\uFFFD")) {
      return buffer.toString("latin1");
    }
    return utf8;
  }
}
