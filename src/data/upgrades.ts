import { fmt, fmtPct } from '../utils/format';

/**
 * Stat formulas, keyed by upgrade level. PlayerState derives every stat from
 * these, and the shop uses them to preview "now → next", so the two never drift.
 */
export const F = {
  clickBase: (l: number) => 5 + 3 * l,
  macroMult: (l: number) => Math.pow(1.25, l),
  critChance: (l: number) => 0.03 * l,
  packetBonus: (l: number) => 1 + 0.25 * l,
  daemonBase: (l: number) => 2 + 1.5 * l,
  daemonInterval: (l: number) => Math.pow(0.9, l),
  daemonSize: (l: number) => 1 + l,
  /** 0 = auto-targeting disabled. */
  heuristicInterval: (l: number) => (l === 0 ? 0 : 3.6 - 0.6 * l),
  chainChance: (l: number) => 0.05 * l,
  miningMult: (l: number) => 1 + 0.15 * l,
  kernelMult: (l: number) => Math.pow(1.12, l),
  regenFraction: (l: number) => 0.01 * l,
  rootMult: (l: number) => Math.pow(1.25, l),
};

export type UpgradeCategory = 'click' | 'daemon' | 'system' | 'ability';

export interface UpgradeDef {
  id: string;
  name: string;
  category: UpgradeCategory;
  description: string;
  baseCost: number;
  costGrowth: number;
  /** Omitted = uncapped. */
  max?: number;
  requires?: readonly { id: string; level: number }[];
  /** Highest security level the player must have reached. */
  requiresLevel?: number;
  /** Human-readable stat value at a given upgrade level (for "now → next"). */
  effect?: (level: number) => string;
}

export const UPGRADES: readonly UpgradeDef[] = [
  // ── CLICK ────────────────────────────────────────────────
  {
    id: 'kb',
    name: 'Mechanical Keyboard',
    category: 'click',
    description: '+3 base click damage. Clicky switches, clicky kills.',
    baseCost: 10,
    costGrowth: 1.17,
    effect: (l) => `${fmt(F.clickBase(l))} dmg`,
  },
  {
    id: 'sniffer',
    name: 'Packet Sniffer',
    category: 'click',
    description: 'Data packets spawn more often and are worth more.',
    baseCost: 50,
    costGrowth: 1.5,
    max: 10,
    requires: [{ id: 'kb', level: 3 }],
    effect: (l) => `×${F.packetBonus(l).toFixed(2)}`,
  },
  {
    id: 'overflow',
    name: 'Buffer Overflow',
    category: 'click',
    description: '+3% chance for a click to crit for ×3 damage.',
    baseCost: 60,
    costGrowth: 1.45,
    max: 15,
    requires: [{ id: 'kb', level: 5 }],
    effect: (l) => `${fmtPct(F.critChance(l))} crit`,
  },
  {
    id: 'macro',
    name: 'Macro Scripts',
    category: 'click',
    description: '×1.25 click damage. Automate the boring parts.',
    baseCost: 300,
    costGrowth: 2.6,
    requires: [{ id: 'kb', level: 10 }],
    effect: (l) => `×${fmt(F.macroMult(l))}`,
  },

  // ── DAEMON ───────────────────────────────────────────────
  {
    id: 'overclock',
    name: 'Overclock',
    category: 'daemon',
    description: '+1.5 base daemon damage per tick.',
    baseCost: 15,
    costGrowth: 1.17,
    effect: (l) => `${fmt(F.daemonBase(l))} dmg`,
  },
  {
    id: 'turbo',
    name: 'Turbo Boost',
    category: 'daemon',
    description: 'Daemon ticks 10% faster.',
    baseCost: 40,
    costGrowth: 1.55,
    max: 15,
    requires: [{ id: 'overclock', level: 3 }],
    effect: (l) => `${(1 / F.daemonInterval(l)).toFixed(2)}/s`,
  },
  {
    id: 'wan',
    name: 'Wide-Area Network',
    category: 'daemon',
    description: '+1 daemon zone size.',
    baseCost: 200,
    costGrowth: 6,
    max: 3,
    requires: [{ id: 'overclock', level: 5 }],
    effect: (l) => `${F.daemonSize(l)}×${F.daemonSize(l)}`,
  },
  {
    id: 'heuristic',
    name: 'Heuristic Scan',
    category: 'daemon',
    description: 'The daemon moves itself onto the densest threat cluster. Manual moves pause it for 3s.',
    baseCost: 500,
    costGrowth: 2.5,
    max: 5,
    requires: [{ id: 'wan', level: 1 }],
    effect: (l) => (l === 0 ? 'off' : `every ${F.heuristicInterval(l).toFixed(1)}s`),
  },
  {
    id: 'injection',
    name: 'Code Injection',
    category: 'daemon',
    description: '+5% chance a killing hit chains into an adjacent threat.',
    baseCost: 120,
    costGrowth: 1.6,
    max: 10,
    requires: [{ id: 'turbo', level: 2 }],
    effect: (l) => `${fmtPct(F.chainChance(l))} chain`,
  },

  // ── SYSTEM ───────────────────────────────────────────────
  {
    id: 'mining',
    name: 'Data Mining',
    category: 'system',
    description: '+15% credits from every source.',
    baseCost: 25,
    costGrowth: 1.3,
    effect: (l) => `×${F.miningMult(l).toFixed(2)}`,
  },
  {
    id: 'kernel',
    name: 'Hardened Kernel',
    category: 'system',
    description: '+12% max integrity (compounding).',
    baseCost: 30,
    costGrowth: 1.28,
    effect: (l) => `×${F.kernelMult(l).toFixed(2)} HP`,
  },
  {
    id: 'repair',
    name: 'Self-Repair',
    category: 'system',
    description: 'Regenerate 1% of max integrity per second during waves.',
    baseCost: 150,
    costGrowth: 2,
    max: 5,
    requires: [{ id: 'kernel', level: 3 }],
    effect: (l) => `${fmtPct(F.regenFraction(l))}/s`,
  },
  {
    id: 'root',
    name: 'Root Access',
    category: 'system',
    description: '×1.25 ALL damage. sudo make me a sandwich.',
    baseCost: 800,
    costGrowth: 3,
    requiresLevel: 8,
    effect: (l) => `×${fmt(F.rootMult(l))}`,
  },

  // ── ABILITIES (one-time unlocks; ids match data/abilities.ts) ──
  {
    id: 'emp',
    name: 'EMP Blast',
    category: 'ability',
    description: 'Unlock [1]: hit every threat for 25% of its max HP (5% vs bosses).',
    baseCost: 100,
    costGrowth: 1,
    max: 1,
    requiresLevel: 3,
  },
  {
    id: 'logic-bomb',
    name: 'Logic Bomb',
    category: 'ability',
    description: 'Unlock [2]: 10× click damage to the 3×3 around the daemon.',
    baseCost: 300,
    costGrowth: 1,
    max: 1,
    requiresLevel: 5,
  },
  {
    id: 'overdrive',
    name: 'Overdrive',
    category: 'ability',
    description: 'Unlock [3]: double all damage for 8 seconds.',
    baseCost: 500,
    costGrowth: 1,
    max: 1,
    requiresLevel: 7,
  },
  {
    id: 'firewall',
    name: 'Firewall',
    category: 'ability',
    description: 'Unlock [4]: threats cannot attack, spread, heal or hop for 6 seconds.',
    baseCost: 1200,
    costGrowth: 1,
    max: 1,
    requiresLevel: 9,
  },
  {
    id: 'miner',
    name: 'Crypto Miner',
    category: 'ability',
    description: 'Unlock [5]: instantly mine credits worth ~50 Bug kills at your level.',
    baseCost: 3000,
    costGrowth: 1,
    max: 1,
    requiresLevel: 12,
  },
];

export const UPGRADE_BY_ID = new Map(UPGRADES.map((u) => [u.id, u]));

export function upgradeCost(def: UpgradeDef, level: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.costGrowth, level));
}

export const CATEGORY_LABELS: Record<UpgradeCategory, string> = {
  click: 'CLICK // manual hacking',
  daemon: 'DAEMON // automated scanning',
  system: 'SYSTEM // economy & integrity',
  ability: 'ABILITIES // one-time unlocks',
};
