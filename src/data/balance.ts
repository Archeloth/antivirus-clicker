/**
 * Global balance knobs. Every tunable number that isn't specific to one
 * enemy / upgrade / ability lives here. Run `npm run sim` after changing.
 */

export const GRID_W = 8;
export const GRID_H = 8;

/** Fixed simulation step (seconds). The loop runs as many steps as real time requires. */
export const STEP = 1 / 60;

export const BASE_MAX_HP = 100;
export const BOSS_EVERY = 5;
export const FINAL_LEVEL = 20;
export const CRIT_MULTIPLIER = 3;
export const SHIELD_REDUCTION = 0.6;
/** Armor can never reduce a hit below this fraction of its raw value. */
export const ARMOR_FLOOR = 0.15;
export const AUTO_START_DELAY = 3;
/** Levels that must be cleared before a "Reinstall OS" pays out. */
export const PRESTIGE_UNLOCK = 10;

export function hpScale(level: number): number {
  return Math.pow(1.28, level - 1);
}

export function rewardScale(level: number): number {
  return Math.pow(1.17, level - 1);
}

export function dpsScale(level: number): number {
  return Math.pow(1.14, level - 1);
}

export function isBossLevel(level: number): boolean {
  return level % BOSS_EVERY === 0;
}

/** Number of regular threats a wave spawns (boss waves spawn half, plus the boss). */
export function waveSize(level: number): number {
  return Math.min(40, 10 + Math.floor(level * 1.5));
}

/** Seconds between spawns. */
export function spawnInterval(level: number): number {
  return Math.max(0.35, 1.5 * Math.pow(0.95, level - 1));
}

/** Bonus paid for clearing a wave, before the credit multiplier. */
export function waveClearBonus(level: number): number {
  return 12 * rewardScale(level) * (isBossLevel(level) ? 3 : 1);
}

/** Root keys earned by a "Reinstall OS" after clearing `cleared` levels this run. */
export function rootKeysFor(cleared: number): number {
  return cleared < PRESTIGE_UNLOCK ? 0 : Math.floor(3 * Math.pow(1.18, cleared - PRESTIGE_UNLOCK));
}

export const ROOT_KEY_BONUS = 0.05; // +5% damage & credits per key
export const ACHIEVEMENT_BONUS = 0.02; // +2% credits per achievement

/** Armor grows slower than HP so big hits stay meaningful instead of hitting the floor. */
export function armorScale(level: number): number {
  return Math.pow(hpScale(level), 0.75);
}
