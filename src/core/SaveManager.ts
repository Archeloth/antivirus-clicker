const SAVE_KEY = 'antivirus-clicker-save';

/**
 * Thin, failure-tolerant wrapper around localStorage. Saves only persistent
 * progress (PlayerState), never mid-wave grid state: reloading always lands
 * in the intermission screen.
 */
export class SaveManager {
  write(data: unknown): boolean {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to save game:', error);
      return false;
    }
  }

  read(): unknown {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('Failed to load game:', error);
      return null;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // storage unavailable — nothing to clear
    }
  }

  static encode(data: unknown): string {
    return btoa(encodeURIComponent(JSON.stringify(data)));
  }

  static decode(text: string): unknown {
    try {
      return JSON.parse(decodeURIComponent(atob(text.trim())));
    } catch {
      return null;
    }
  }
}
