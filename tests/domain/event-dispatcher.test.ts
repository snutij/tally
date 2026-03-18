import { describe, expect, it, vi } from "vitest";
import type { DomainEvent } from "../../src/domain/event/domain-event.js";
import { EventDispatcher } from "../../src/domain/event/event-dispatcher.js";

function makeEvent(eventType: string): DomainEvent {
  return { eventType, occurredAt: new Date() };
}

describe("EventDispatcher", () => {
  it("calls registered handler when event is dispatched", () => {
    const dispatcher = new EventDispatcher();
    const handler = vi.fn();
    dispatcher.on("Foo", handler);
    const event = makeEvent("Foo");
    dispatcher.dispatch(event);
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(event);
  });

  it("calls multiple handlers in registration order", () => {
    const dispatcher = new EventDispatcher();
    const order: number[] = [];
    dispatcher.on("Foo", () => order.push(1));
    dispatcher.on("Foo", () => order.push(2));
    dispatcher.dispatch(makeEvent("Foo"));
    expect(order).toEqual([1, 2]);
  });

  it("does not call handler for different event type", () => {
    const dispatcher = new EventDispatcher();
    const handler = vi.fn();
    dispatcher.on("Foo", handler);
    dispatcher.dispatch(makeEvent("Bar"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("completes without error when no handler is registered", () => {
    const dispatcher = new EventDispatcher();
    expect(() => dispatcher.dispatch(makeEvent("Unhandled"))).not.toThrow();
  });

  it("passes the exact event object to the handler", () => {
    const dispatcher = new EventDispatcher();
    let received: DomainEvent | undefined;
    dispatcher.on("Foo", (event) => {
      received = event;
    });
    const dispatched = makeEvent("Foo");
    dispatcher.dispatch(dispatched);
    expect(received).toBe(dispatched);
  });
});
