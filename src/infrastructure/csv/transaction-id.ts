import { TransactionId } from "../../domain/value-object/transaction-id.js";
import { createHash } from "node:crypto";

export function deterministicTransactionId(
  source: string,
  date: string,
  label: string,
  amountCents: number,
  seq: number,
): TransactionId {
  const input = `${source}|${date}|${label}|${amountCents}|${seq}`;
  return TransactionId(createHash("sha256").update(input).digest("hex").slice(0, 32));
}
