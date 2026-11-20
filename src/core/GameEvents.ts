import type { Cell } from './Cell';
import type { Virus } from '../entities/Virus';

export type DamageSource = 'hack' | 'daemon' | 'chain' | 'ability' | 'explosion' | 'purge';
export type LogKind = 'info' | 'warn' | 'alert' | 'good' | 'system';

/**
 * Discrete game events. Continuous state (HP, credits, positions) is NOT
 * broadcast: the UI reads it directly once per frame.
 */
export type GameEvents = {
  virusSpawned: { cell: Cell; virus: Virus };
  virusDamaged: { cell: Cell; virus: Virus; amount: number; source: DamageSource; crit: boolean };
  virusKilled: { cell: Cell; virus: Virus; source: DamageSource; credits: number };
  damageBlocked: { cell: Cell; reason: string };
  playerHit: { amount: number; cell?: Cell; heavy: boolean };
  pickupCollected: { cell: Cell; value: number };
  daemonPulse: undefined;
  abilityUsed: { id: string };
  waveStarted: { level: number; boss: boolean };
  waveCleared: { level: number; bonus: number };
  waveFailed: { level: number };
  bossSpawned: { name: string };
  bossKilled: { name: string };
  purchased: { id: string; level: number };
  achievement: { id: string; name: string };
  victory: undefined;
  prestige: { keys: number };
  /** Whole state replaced (load / prestige / hard reset): UI should rebuild caches. */
  stateReset: undefined;
  log: { text: string; kind: LogKind };
};
