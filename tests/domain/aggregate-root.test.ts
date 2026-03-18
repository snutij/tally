import { Transaction, type TransactionParams } from "../../src/domain/entity/transaction.js";
import { describe, expect, it } from "vitest";
import { CategoryId } from "../../src/domain/value-object/category-id.js";
import { DateOnly } from "../../src/domain/value-object/date-only.js";
import { Money } from "../../src/domain/value-object/money.js";
import { TransactionId } from "../../src/domain/value-object/transaction-id.js";

function makeParams(id = "tx-1"): TransactionParams {
  return {
    amount: Money.fromEuros(-10),
    date: DateOnly.from("2026-03-15"),
    id: TransactionId(id),
    label: "PRLV SEPA SPOTIFY",
    source: "csv",
  };
}

describe("AggregateRoot via Transaction", () => {
  it("fresh aggregate has no events", () => {
    const txn = Transaction.create(makeParams());
    expect(txn.pullDomainEvents()).toHaveLength(0);
  });

  it("pullDomainEvents clears the list after reading", () => {
    const txn = Transaction.import(makeParams());
    txn.pullDomainEvents(); // consume
    expect(txn.pullDomainEvents()).toHaveLength(0);
  });

  it("events are isolated per instance", () => {
    const txnA = Transaction.import(makeParams("tx-a"));
    const txnB = Transaction.import(makeParams("tx-b"));
    expect(txnA.pullDomainEvents()).toHaveLength(1);
    expect(txnB.pullDomainEvents()).toHaveLength(1);
  });
});

describe("Transaction.import()", () => {
  it("records a TransactionImported event", () => {
    const txn = Transaction.import(makeParams());
    const events = txn.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe("TransactionImported");
  });

  it("event payload matches transaction data", () => {
    const txn = Transaction.import(makeParams());
    const [event] = txn.pullDomainEvents() as [{ label: string; amountCents: number }];
    expect(event.label).toBe("PRLV SEPA SPOTIFY");
    expect(event.amountCents).toBe(-1000);
  });
});

describe("Transaction.create()", () => {
  it("does not record any events (reconstitution path)", () => {
    const txn = Transaction.create(makeParams());
    expect(txn.pullDomainEvents()).toHaveLength(0);
  });
});

describe("Transaction.categorize()", () => {
  it("records a TransactionCategorized event on the returned instance", () => {
    const txn = Transaction.create(makeParams());
    const categorized = txn.categorize(CategoryId("w06"));
    const events = categorized.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe("TransactionCategorized");
  });

  it("event carries ruleId when provided", () => {
    const txn = Transaction.create(makeParams());
    const categorized = txn.categorize(CategoryId("w06"), "rule-1" as never);
    const [event] = categorized.pullDomainEvents() as [{ ruleId: string | undefined }];
    expect(event.ruleId).toBe("rule-1");
  });

  it("event has undefined ruleId when categorized manually", () => {
    const txn = Transaction.create(makeParams());
    const categorized = txn.categorize(CategoryId("w06"));
    const [event] = categorized.pullDomainEvents() as [{ ruleId: string | undefined }];
    expect(event.ruleId).toBeUndefined();
  });

  it("original transaction retains no events after categorize()", () => {
    const txn = Transaction.create(makeParams());
    txn.categorize(CategoryId("w06"));
    expect(txn.pullDomainEvents()).toHaveLength(0);
  });
});
