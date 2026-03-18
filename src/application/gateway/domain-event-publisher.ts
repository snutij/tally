import type { DomainEvent } from "../../domain/event/domain-event.js";

export interface DomainEventPublisher {
  publish(event: DomainEvent): void;
}
