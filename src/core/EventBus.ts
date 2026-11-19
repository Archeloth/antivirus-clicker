import type { GameEvents } from './GameEvents';

type Callback<T> = (data: T) => void;

export class EventBus {
  private readonly listeners = new Map<keyof GameEvents, Callback<never>[]>();

  on<K extends keyof GameEvents>(event: K, callback: Callback<GameEvents[K]>): void {
    const callbacks = this.listeners.get(event) ?? [];
    callbacks.push(callback as Callback<never>);
    this.listeners.set(event, callbacks);
  }

  emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]): void {
    const callbacks = this.listeners.get(event) as Callback<GameEvents[K]>[] | undefined;
    if (!callbacks) return;
    for (const callback of callbacks) callback(data);
  }
}
