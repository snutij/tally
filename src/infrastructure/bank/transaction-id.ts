import { createHash } from "node:crypto";

export function deterministicTransactionId(
  bank: string,
  date: string,
  label: string,
  amountCents: number,
  seq: number,
): string {
  const input = `${bank}|${date}|${label}|${amountCents}|${seq}`;
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}
