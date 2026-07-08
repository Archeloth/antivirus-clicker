import type { GameEvents } from "./GameEvents";

type EventCallback<T> = (data: T) => void;

export class EventBus {
    private listeners = new Map<
        keyof GameEvents,
        EventCallback<any>[]
    >();

    public on<K extends keyof GameEvents>(
        event: K,
        callback: EventCallback<GameEvents[K]>,
    ): void {
        const callbacks = this.listeners.get(event) ?? [];

        callbacks.push(callback);

        this.listeners.set(event, callbacks);
    }

    public emit<K extends keyof GameEvents>(
        event: K,
        data: GameEvents[K],
    ): void {
        const callbacks = this.listeners.get(event);

        if (!callbacks) return;

        callbacks.forEach(callback => {
            callback(data);
        });
    }
}