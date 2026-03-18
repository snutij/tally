import type { DomainEvent } from "./domain-event.js";

type Handler<TEvent extends DomainEvent> = (event: TEvent) => void;

export class EventDispatcher {
  private readonly handlers = new Map<string, Handler<DomainEvent>[]>();

  on<TEvent extends DomainEvent>(eventType: string, handler: Handler<TEvent>): void {
    const list = this.handlers.get(eventType) ?? [];
    list.push(handler as Handler<DomainEvent>);
    this.handlers.set(eventType, list);
  }

  dispatch(event: DomainEvent): void {
    const list = this.handlers.get(event.eventType) ?? [];
    for (const handler of list) {
      handler(event);
    }
  }
}
