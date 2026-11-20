import {
  ACHIEVEMENT_BONUS,
  BASE_MAX_HP,
  ROOT_KEY_BONUS,
} from '../data/balance';
import { F } from '../data/upgrades';

export interface Stats {
  kills: number;
  hacks: number;
  crits: number;
  packets: number;
  creditsEarned: number;
  bossesKilled: number;
  flawlessWaves: number;
  trojansCaught: number;
  prestiges: number;
  playTime: number;
}

export interface Settings {
  volume: number;
  muted: boolean;
  damageNumbers: boolean;
  reducedMotion: boolean;
  autoStart: boolean;
  buyMax: boolean;
}

export const SAVE_VERSION = 3;

export interface SaveData {
  v: typeof SAVE_VERSION;
  credits: number;
  level: number;
  highestLevel: number;
  rootKeys: number;
  victory: boolean;
  upgrades: Record<string, number>;
  achievements: string[];
  seen: string[];
  stats: Stats;
  settings: Settings;
  savedAt: number;
}

const DEFAULT_STATS: Stats = {
  kills: 0,
  hacks: 0,
  crits: 0,
  packets: 0,
  creditsEarned: 0,
  bossesKilled: 0,
  flawlessWaves: 0,
  trojansCaught: 0,
  prestiges: 0,
  playTime: 0,
};

const DEFAULT_SETTINGS: Settings = {
  volume: 0.5,
  muted: false,
  damageNumbers: true,
  reducedMotion: false,
  autoStart: false,
  buyMax: false,
};

/**
 * Everything persistent about the player, plus the stats derived from upgrades.
 * Pure logic — no DOM, no storage.
 */
export class PlayerState {
  credits = 0;
  /** The level the next wave will be played at. */
  level = 1;
  /** Highest level unlocked (cleared + 1). */
  highestLevel = 1;
  rootKeys = 0;
  victory = false;
  upgrades = new Map<string, number>();
  achievements = new Set<string>();
  /** Threat kinds encountered (Threat DB). */
  seen = new Set<string>();
  stats: Stats = { ...DEFAULT_STATS };
  settings: Settings = { ...DEFAULT_SETTINGS };

  // Runtime-only (not saved)
  hp = BASE_MAX_HP;
  overdrive = 0;
  firewall = 0;

  lvl(id: string): number {
    return this.upgrades.get(id) ?? 0;
  }

  // ── Derived stats ────────────────────────────────────────
  get keyMult(): number {
    return 1 + ROOT_KEY_BONUS * this.rootKeys;
  }

  get damageMult(): number {
    return F.rootMult(this.lvl('root')) * this.keyMult * (this.overdrive > 0 ? 2 : 1);
  }

  get hackDamage(): number {
    return F.hackBase(this.lvl('kb')) * F.macroMult(this.lvl('macro')) * this.damageMult;
  }

  /** Hits per second while holding hack. */
  get hackRate(): number {
    return F.hackRate(this.lvl('macro-keys'));
  }

  /** Maximum focus multiplier from staying on one target. */
  get focusCap(): number {
    return F.focusCap(this.lvl('inspection'));
  }

  get hasTargetLock(): boolean {
    return this.lvl('target-lock') > 0;
  }

  get critChance(): number {
    return F.critChance(this.lvl('overflow'));
  }

  get daemonDamage(): number {
    return F.daemonBase(this.lvl('overclock')) * this.damageMult;
  }

  get daemonInterval(): number {
    return F.daemonInterval(this.lvl('turbo'));
  }

  get daemonSize(): number {
    return F.daemonSize(this.lvl('wan'));
  }

  get heuristicInterval(): number {
    return F.heuristicInterval(this.lvl('heuristic'));
  }

  get chainChance(): number {
    return F.chainChance(this.lvl('injection'));
  }

  get creditMult(): number {
    return (
      F.miningMult(this.lvl('mining')) *
      this.keyMult *
      (1 + ACHIEVEMENT_BONUS * this.achievements.size)
    );
  }

  get maxHp(): number {
    return BASE_MAX_HP * F.kernelMult(this.lvl('kernel'));
  }

  get regenPerSecond(): number {
    return F.regenFraction(this.lvl('repair')) * this.maxHp;
  }

  get packetBonus(): number {
    return F.packetBonus(this.lvl('sniffer'));
  }

  // ── Mutations ────────────────────────────────────────────
  addCredits(amount: number): void {
    this.credits += amount;
    if (amount > 0) this.stats.creditsEarned += amount;
  }

  spend(amount: number): boolean {
    if (this.credits < amount) return false;
    this.credits -= amount;
    return true;
  }

  /** Take up to `amount` credits; returns what was actually taken. */
  drain(amount: number): number {
    const taken = Math.min(this.credits, amount);
    this.credits -= taken;
    return taken;
  }

  restoreHp(): void {
    this.hp = this.maxHp;
  }

  tickBuffs(dt: number): void {
    this.overdrive = Math.max(0, this.overdrive - dt);
    this.firewall = Math.max(0, this.firewall - dt);
  }

  clearBuffs(): void {
    this.overdrive = 0;
    this.firewall = 0;
  }

  /** "Reinstall OS": wipe the run, keep keys, achievements, lifetime stats, settings. */
  prestige(keysGained: number): void {
    this.rootKeys += keysGained;
    this.credits = 0;
    this.level = 1;
    this.highestLevel = 1;
    this.victory = false;
    this.upgrades.clear();
    this.stats.prestiges++;
    this.clearBuffs();
    this.restoreHp();
  }

  // ── Persistence ──────────────────────────────────────────
  toSave(): SaveData {
    return {
      v: SAVE_VERSION,
      credits: this.credits,
      level: this.level,
      highestLevel: this.highestLevel,
      rootKeys: this.rootKeys,
      victory: this.victory,
      upgrades: Object.fromEntries(this.upgrades),
      achievements: [...this.achievements],
      seen: [...this.seen],
      stats: { ...this.stats },
      settings: { ...this.settings },
      savedAt: Date.now(),
    };
  }

  /** Accepts any parsed JSON; migrates v1 saves and ignores garbage. Returns false if unusable. */
  fromSave(raw: unknown): boolean {
    if (!raw || typeof raw !== 'object') return false;
    const data = raw as Record<string, unknown>;

    // v1 (pre-overhaul) saves: only credits and level carry over.
    if (data.v === undefined && typeof data.playerState === 'object' && data.playerState) {
      const old = data.playerState as Record<string, unknown>;
      this.reset();
      this.credits = num(old.credits, 0);
      this.highestLevel = Math.max(1, Math.floor(num(old.securityLevel, 1)));
      this.level = this.highestLevel;
      return true;
    }

    if (data.v !== SAVE_VERSION && data.v !== 2) return false;
    const save = data as Partial<SaveData>;
    if (data.v === 2) migrateV2(save);
    this.reset();
    this.credits = num(save.credits, 0);
    this.highestLevel = Math.max(1, Math.floor(num(save.highestLevel, 1)));
    this.level = clamp(Math.floor(num(save.level, 1)), 1, this.highestLevel);
    this.rootKeys = Math.max(0, Math.floor(num(save.rootKeys, 0)));
    this.victory = save.victory === true;
    for (const [id, level] of Object.entries(save.upgrades ?? {})) {
      if (typeof level === 'number' && level > 0) this.upgrades.set(id, Math.floor(level));
    }
    this.achievements = new Set((save.achievements ?? []).filter((s) => typeof s === 'string'));
    this.seen = new Set((save.seen ?? []).filter((s) => typeof s === 'string'));
    this.stats = { ...DEFAULT_STATS, ...pickNumbers(save.stats) } as Stats;
    this.settings = { ...DEFAULT_SETTINGS, ...(save.settings ?? {}) };
    this.restoreHp();
    return true;
  }

  reset(): void {
    this.credits = 0;
    this.level = 1;
    this.highestLevel = 1;
    this.rootKeys = 0;
    this.victory = false;
    this.upgrades.clear();
    this.achievements.clear();
    this.seen.clear();
    this.stats = { ...DEFAULT_STATS };
    this.settings = { ...DEFAULT_SETTINGS };
    this.clearBuffs();
    this.restoreHp();
  }
}

/** v2 → v3: clicking became hacking (keyboard-first controls). */
function migrateV2(save: Partial<SaveData>): void {
  const stats = save.stats as unknown as Record<string, unknown> | undefined;
  if (stats && typeof stats.clicks === 'number') {
    stats.hacks = stats.clicks;
    delete stats.clicks;
  }
  if (save.achievements) {
    save.achievements = save.achievements.map((id) => (id === 'clicks-1000' ? 'hacks-1000' : id));
  }
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pickNumbers(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (value && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) {
      if (typeof v === 'number' && Number.isFinite(v)) out[key] = v;
    }
  }
  return out;
}
