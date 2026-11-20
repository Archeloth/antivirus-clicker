import { armorScale, dpsScale, hpScale, rewardScale } from '../data/balance';
import type { BossDef, Trait, VirusDef } from '../data/viruses';

export type Immunity = 'none' | 'hack' | 'daemon' | 'all';

let nextId = 1;

/** Multipliers applied on top of level scaling, for spawned children/copies. */
export interface SpawnScale {
  hp: number;
  reward: number;
  dps: number;
}

const FULL: SpawnScale = { hp: 1, reward: 1, dps: 1 };

/**
 * A live threat on the grid. All behavior lives in systems; this is plain state.
 */
export class Virus {
  readonly id = nextId++;
  maxHp: number;
  hp: number;
  dps: number;
  reward: number;
  armor: number;

  /** 0 = original spawn; children/copies have higher generations and lose their trait. */
  generation = 0;
  attackTimer = 0.6 + Math.random() * 0.8;
  traitTimer = 0;
  /** Credits siphoned by a Vampire Bug, refunded on kill. */
  stolen = 0;
  /** Id of the Ransomware that encrypted this virus (0 = not encrypted). */
  encryptedBy = 0;
  /** Trojan still pretending to be a data packet. */
  disguised = false;
  disguiseTimer = 0;
  /** Rootkit-style: cannot be damaged until revealed by the daemon. */
  hidden = false;
  revealTimer = 0;
  immune: Immunity = 'none';
  /** Frame stamp so a virus that moves mid-iteration is only updated once. */
  stamp = 0;

  constructor(
    readonly kind: string,
    readonly name: string,
    readonly tag: string,
    readonly color: string,
    stats: { hp: number; dps: number; reward: number; armor: number },
    readonly trait?: Trait,
    readonly boss?: BossDef,
  ) {
    this.maxHp = stats.hp;
    this.hp = stats.hp;
    this.dps = stats.dps;
    this.reward = stats.reward;
    this.armor = stats.armor;
  }

  get hpFraction(): number {
    return Math.max(0, this.hp / this.maxHp);
  }

  /** The trait only applies to first-generation threats (prevents runaway replication). */
  has(trait: Trait): boolean {
    return this.trait === trait && this.generation === 0;
  }
}

export function createVirus(
  def: VirusDef,
  level: number,
  generation = 0,
  scale: SpawnScale = FULL,
): Virus {
  const virus = new Virus(
    def.id,
    def.name,
    def.tag,
    def.color,
    {
      hp: def.hp * hpScale(level) * scale.hp,
      dps: def.dps * dpsScale(level) * scale.dps,
      reward: def.reward * rewardScale(level) * scale.reward,
      armor: def.armor * armorScale(level),
    },
    def.trait,
  );
  virus.generation = generation;
  return virus;
}

export function createBoss(def: BossDef, level: number): Virus {
  return new Virus(
    def.id,
    def.name,
    def.tag,
    def.color,
    {
      hp: def.hp * hpScale(level),
      dps: def.dps * dpsScale(level),
      reward: def.reward * rewardScale(level),
      armor: def.armor * armorScale(level),
    },
    undefined,
    def,
  );
}
