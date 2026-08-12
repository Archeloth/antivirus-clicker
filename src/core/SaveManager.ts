import type { Game, GameSaveData } from "./Game";

const SAVE_KEY = "antivirus-clicker-save";

export class SaveManager {
    public save(game: Game): void {
        try {
            const data = game.serialize();
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error("Failed to save game:", error);
        }
    }

    public load(): GameSaveData | null {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return null;
            return JSON.parse(raw) as GameSaveData;
        } catch (error) {
            console.error("Failed to load game:", error);
            return null;
        }
    }

    public hasSave(): boolean {
        return localStorage.getItem(SAVE_KEY) !== null;
    }

    public clear(): void {
        localStorage.removeItem(SAVE_KEY);
    }
}