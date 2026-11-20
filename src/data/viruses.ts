/**
 * Single source of truth for every threat: spawning, the Threat DB panel and
 * rendering all read from here. Stats are level-1 values; scaling lives in balance.ts.
 */

export type Trait =
  | 'hop'
  | 'explode'
  | 'heal'
  | 'spread'
  | 'split'
  | 'shield'
  | 'drain'
  | 'encrypt'
  | 'trojan';

export interface VirusDef {
  id: string;
  name: string;
  /** 3-letter label rendered in the cell. */
  tag: string;
  color: string;
  hp: number;
  /** Damage dealt to the player's integrity per second while alive. */
  dps: number;
  reward: number;
  /** Flat damage reduction per hit (scaled with level). */
  armor: number;
  minLevel: number;
  /** Relative spawn weight; 0 = never spawned randomly. */
  weight: number;
  trait?: Trait;
  description: string;
}

/** Seconds between trait activations. */
export const TRAIT_CADENCE: Partial<Record<Trait, number>> = {
  hop: 3.5,
  heal: 1,
  spread: 5,
  encrypt: 6,
};

export const TROJAN_FUSE = 5;

export const VIRUSES: readonly VirusDef[] = [
  {
    id: 'bug',
    name: 'Bug',
    tag: 'BUG',
    color: '#ff6b6b',
    hp: 20,
    dps: 1,
    reward: 2,
    armor: 0,
    minLevel: 1,
    weight: 40,
    description: 'Garden-variety defect. Chews on your integrity until squashed.',
  },
  {
    id: 'byte',
    name: 'Byte Bug',
    tag: 'BYT',
    color: '#ffd166',
    hp: 14,
    dps: 1,
    reward: 3,
    armor: 0,
    minLevel: 2,
    weight: 22,
    trait: 'hop',
    description: 'Jumps to a random cell every few seconds. Track it down.',
  },
  {
    id: 'syntax',
    name: 'Syntax Error',
    tag: 'ERR',
    color: '#9fb3c8',
    hp: 34,
    dps: 1.5,
    reward: 4,
    armor: 3,
    minLevel: 3,
    weight: 14,
    description: 'Armored: every hit is reduced by a flat amount. Big hits beat fast, weak ones.',
  },
  {
    id: 'nullptr',
    name: 'Null Pointer',
    tag: 'NUL',
    color: '#ff9f43',
    hp: 28,
    dps: 1,
    reward: 4,
    armor: 0,
    minLevel: 4,
    weight: 10,
    trait: 'explode',
    description: 'Crashes on death, dealing 30% max HP to adjacent threats.',
  },
  {
    id: 'patch',
    name: 'Patch Bot',
    tag: 'PCH',
    color: '#2ee6a6',
    hp: 26,
    dps: 0.5,
    reward: 5,
    armor: 0,
    minLevel: 6,
    weight: 8,
    trait: 'heal',
    description: 'Heals adjacent threats by 6% every second. Priority target.',
  },
  {
    id: 'worm',
    name: 'Worm',
    tag: 'WRM',
    color: '#b8f35a',
    hp: 20,
    dps: 1,
    reward: 2,
    armor: 0,
    minLevel: 7,
    weight: 8,
    trait: 'spread',
    description: 'Replicates into adjacent empty cells. Contain it early.',
  },
  {
    id: 'fork',
    name: 'Fork Bomb',
    tag: 'FRK',
    color: '#c792ff',
    hp: 40,
    dps: 1,
    reward: 4,
    armor: 0,
    minLevel: 8,
    weight: 7,
    trait: 'split',
    description: 'Forks into two child processes when killed.',
  },
  {
    id: 'trojan',
    name: 'Trojan',
    tag: 'TRJ',
    color: '#3ad7ff',
    hp: 30,
    dps: 2.5,
    reward: 6,
    armor: 0,
    minLevel: 9,
    weight: 5,
    trait: 'trojan',
    description:
      'Disguised as a data packet. Hack it before it activates to quarantine it for double credits.',
  },
  {
    id: 'obf',
    name: 'Obfuscator',
    tag: 'OBF',
    color: '#6aa8ff',
    hp: 44,
    dps: 0.5,
    reward: 6,
    armor: 0,
    minLevel: 11,
    weight: 6,
    trait: 'shield',
    description: 'Adjacent threats take 60% less damage. Kill it first.',
  },
  {
    id: 'vampire',
    name: 'Vampire Bug',
    tag: 'VMP',
    color: '#ff4d8d',
    hp: 24,
    dps: 0.5,
    reward: 3,
    armor: 0,
    minLevel: 12,
    weight: 5,
    trait: 'drain',
    description: 'Siphons credits while alive. Killing it refunds 150% of what it stole.',
  },
  {
    id: 'ransom',
    name: 'Ransomware',
    tag: 'RAN',
    color: '#ffc94d',
    hp: 50,
    dps: 1,
    reward: 8,
    armor: 2,
    minLevel: 13,
    weight: 5,
    trait: 'encrypt',
    description:
      'Encrypts adjacent threats: the daemon cannot touch them, but hacking can. Killing it decrypts all.',
  },
  {
    id: 'node',
    name: 'Botnet Node',
    tag: 'NOD',
    color: '#e879f9',
    hp: 45,
    dps: 0.4,
    reward: 5,
    armor: 0,
    minLevel: 999,
    weight: 0,
    description: 'Relay for the Botnet core. While any node lives, the core is invulnerable.',
  },
];

export type BossBehavior = 'rootkit' | 'botnet' | 'polymorph' | 'zeroday';

export interface BossDef {
  id: string;
  name: string;
  tag: string;
  color: string;
  hp: number;
  dps: number;
  reward: number;
  armor: number;
  /** Heavy hit dealt to the player every `slamInterval` seconds. */
  slam: number;
  slamInterval: number;
  behavior: BossBehavior;
  /** Level it first appears on. */
  level: number;
  description: string;
}

export const BOSSES: readonly BossDef[] = [
  {
    id: 'rootkit',
    name: 'Rootkit',
    tag: 'ROOT',
    color: '#ff3b3b',
    hp: 400,
    dps: 2,
    reward: 60,
    armor: 0,
    slam: 8,
    slamInterval: 5,
    behavior: 'rootkit',
    level: 5,
    description:
      'Hides inside the system. Sweep it with the daemon [E] to expose it, then strike before it burrows elsewhere.',
  },
  {
    id: 'botnet',
    name: 'Botnet',
    tag: 'BOT',
    color: '#e879f9',
    hp: 450,
    dps: 1.5,
    reward: 120,
    armor: 0,
    slam: 12,
    slamInterval: 5,
    behavior: 'botnet',
    level: 10,
    description:
      'The core is invulnerable while its relay nodes live. Kill every node to expose the core for 12s — then the whole botnet reconnects.',
  },
  {
    id: 'polymorph',
    name: 'Polymorphic Engine',
    tag: 'POLY',
    color: '#ffb547',
    hp: 900,
    dps: 2.5,
    reward: 200,
    armor: 2,
    slam: 14,
    slamInterval: 5,
    behavior: 'polymorph',
    level: 15,
    description:
      'Rewrites itself every 6s, alternating immunity to hacks and to the daemon. Spawns minions.',
  },
  {
    id: 'zeroday',
    name: 'Zero-Day',
    tag: '0DAY',
    color: '#ffffff',
    hp: 1300,
    dps: 3,
    reward: 400,
    armor: 3,
    slam: 16,
    slamInterval: 4,
    behavior: 'zeroday',
    level: 20,
    description:
      'Unknown exploit. Hides, then summons a botnet, then mutates as it weakens. The final threat.',
  },
];

export const VIRUS_BY_ID = new Map(VIRUSES.map((def) => [def.id, def]));

export function bossForLevel(level: number): BossDef {
  const index = (Math.floor(level / 5) - 1) % BOSSES.length;
  return BOSSES[Math.max(0, index)]!;
}

export function virusDef(id: string): VirusDef {
  const def = VIRUS_BY_ID.get(id);
  if (!def) throw new Error(`Unknown virus id: ${id}`);
  return def;
}
