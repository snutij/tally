import type { DomainEvent } from "../../domain/event/domain-event.js";
import type { DomainEventPublisher } from "../../application/gateway/domain-event-publisher.js";

type Handler<TEvent extends DomainEvent> = (event: TEvent) => void;

export class InProcessEventDispatcher implements DomainEventPublisher {
  private readonly handlers = new Map<string, Handler<DomainEvent>[]>();

  on<TEvent extends DomainEvent>(eventType: string, handler: Handler<TEvent>): void {
    const list = this.handlers.get(eventType) ?? [];
    list.push(handler as Handler<DomainEvent>);
    this.handlers.set(eventType, list);
  }

  publish(event: DomainEvent): void {
    const list = this.handlers.get(event.eventType) ?? [];
    for (const handler of list) {
      handler(event);
    }
  }
}
