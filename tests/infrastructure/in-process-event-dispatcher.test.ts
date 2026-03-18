import { describe, expect, it, vi } from "vitest";
import type { DomainEvent } from "../../src/domain/event/domain-event.js";
import { InProcessEventDispatcher } from "../../src/infrastructure/event/in-process-event-dispatcher.js";

function makeEvent(eventType: string): DomainEvent {
  return { eventType, occurredAt: new Date() };
}

describe("InProcessEventDispatcher", () => {
  it("calls registered handler when event is published", () => {
    const dispatcher = new InProcessEventDispatcher();
    const handler = vi.fn();
    dispatcher.on("Foo", handler);
    const event = makeEvent("Foo");
    dispatcher.publish(event);
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(event);
  });

  it("calls multiple handlers in registration order", () => {
    const dispatcher = new InProcessEventDispatcher();
    const order: number[] = [];
    dispatcher.on("Foo", () => order.push(1));
    dispatcher.on("Foo", () => order.push(2));
    dispatcher.publish(makeEvent("Foo"));
    expect(order).toEqual([1, 2]);
  });

  it("does not call handler for different event type", () => {
    const dispatcher = new InProcessEventDispatcher();
    const handler = vi.fn();
    dispatcher.on("Foo", handler);
    dispatcher.publish(makeEvent("Bar"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("completes without error when no handler is registered", () => {
    const dispatcher = new InProcessEventDispatcher();
    expect(() => dispatcher.publish(makeEvent("Unhandled"))).not.toThrow();
  });

  it("passes the exact event object to the handler", () => {
    const dispatcher = new InProcessEventDispatcher();
    let received: DomainEvent | undefined;
    dispatcher.on("Foo", (event) => {
      received = event;
    });
    const published = makeEvent("Foo");
    dispatcher.publish(published);
    expect(received).toBe(published);
  });
});
