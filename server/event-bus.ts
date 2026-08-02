import type { PropCopiaEventMap } from './event-bus-types';

export type EventHandler<T> = (payload: T) => void;

export class EventBus<Events extends object> {
  private listeners = new Map<keyof Events, Set<EventHandler<any>>>();

  publish<K extends keyof Events>(eventName: K, payload: Events[K]): void {
    const handlers = this.listeners.get(eventName);
    if (!handlers) {
      return;
    }

    for (const handler of Array.from(handlers)) {
      handler(payload);
    }
  }

  subscribe<K extends keyof Events>(
    eventName: K,
    handler: EventHandler<Events[K]>
  ): void {
    const existingHandlers = this.listeners.get(eventName);
    if (existingHandlers) {
      existingHandlers.add(handler as EventHandler<any>);
      return;
    }

    this.listeners.set(eventName, new Set([handler as EventHandler<any>]));
  }

  unsubscribe<K extends keyof Events>(
    eventName: K,
    handler: EventHandler<Events[K]>
  ): void {
    const handlers = this.listeners.get(eventName);
    if (!handlers) {
      return;
    }

    handlers.delete(handler as EventHandler<any>);

    if (handlers.size === 0) {
      this.listeners.delete(eventName);
    }
  }

  once<K extends keyof Events>(
    eventName: K,
    handler: EventHandler<Events[K]>
  ): void {
    const onceHandler: EventHandler<Events[K]> = (payload) => {
      this.unsubscribe(eventName, onceHandler);
      handler(payload);
    };

    this.subscribe(eventName, onceHandler);
  }

  removeAllListeners<K extends keyof Events>(eventName?: K): void {
    if (eventName === undefined) {
      this.listeners.clear();
      return;
    }

    this.listeners.delete(eventName);
  }
}

export class PropCopiaEventBus extends EventBus<PropCopiaEventMap> {}

export const propCopiaEventBus = new PropCopiaEventBus();
