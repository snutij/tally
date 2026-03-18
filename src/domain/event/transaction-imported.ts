import type { DateOnly } from "../value-object/date-only.js";
import type { DomainEvent } from "./domain-event.js";
import type { TransactionId } from "../value-object/transaction-id.js";

export interface TransactionImported extends DomainEvent {
  readonly eventType: "TransactionImported";
  readonly transactionId: TransactionId;
  readonly label: string;
  readonly amountCents: number;
  readonly date: DateOnly;
}

export function TransactionImported(
  transactionId: TransactionId,
  label: string,
  amountCents: number,
  date: DateOnly,
): TransactionImported {
  return {
    amountCents,
    date,
    eventType: "TransactionImported",
    label,
    occurredAt: new Date(),
    transactionId,
  };
}
