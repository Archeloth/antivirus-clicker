import type { Game } from '../core/Game';
import { armorScale, isBossLevel, spawnInterval, waveSize } from '../data/balance';
import {
  MODIFIER_CHANCE,
  MODIFIER_MIN_LEVEL,
  MODIFIERS,
  WAVE_ENCRYPTION,
  type ModifierDef,
} from '../data/modifiers';
import { TROJAN_FUSE, VIRUSES, bossForLevel, type VirusDef } from '../data/viruses';
import { createVirus, type Virus } from '../entities/Virus';
import { pick } from '../utils/random';

/** Spawns a wave's budget of threats, applies its modifier and decides when it's cleared. */
export class WaveSystem {
  level = 1;
  total = 0;
  remaining = 0;
  /** Modifier of the running wave (undefined = normal wave). */
  modifier?: ModifierDef;
  private timer = 0;

  constructor(private readonly game: Game) {}

  /** Credit multiplier of the running wave. */
  get rewardMult(): number {
    return this.modifier?.reward ?? 1;
  }

  get daemonIntervalMult(): number {
    return this.modifier?.daemonIntervalMult ?? 1;
  }

  get packetMult(): number {
    return this.modifier?.packetMult ?? 1;
  }

  /** Roll the modifier for an upcoming wave at `level` (boss and early waves never get one). */
  static roll(level: number): ModifierDef | undefined {
    if (level < MODIFIER_MIN_LEVEL || isBossLevel(level)) return undefined;
    return Math.random() < MODIFIER_CHANCE ? pick(MODIFIERS) : undefined;
  }

  static eligible(level: number): boolean {
    return level >= MODIFIER_MIN_LEVEL && !isBossLevel(level);
  }

  begin(level: number, modifier?: ModifierDef): void {
    this.level = level;
    const boss = isBossLevel(level);
    this.modifier = boss ? undefined : modifier;
    const size = boss ? Math.floor(waveSize(level) / 2) : waveSize(level);
    this.total = Math.round(size * (this.modifier?.sizeMult ?? 1));
    this.remaining = this.total;
    this.timer = 0.6;
    if (boss) this.game.bosses.spawn(bossForLevel(level), level);
  }

  update(dt: number): void {
    if (this.remaining <= 0) return;
    this.timer -= dt;
    if (this.timer > 0) return;

    if (this.spawnOne()) {
      this.remaining--;
      this.timer += spawnInterval(this.level) * (this.modifier?.spawnIntervalMult ?? 1);
    } else {
      this.timer = 0.25; // grid full — retry soon
    }
  }

  /** Spawn a random regular threat appropriate for the level. */
  spawnOne(): boolean {
    const cell = this.game.grid.randomEmpty();
    if (!cell) return false;
    const def = this.pickDef();
    const virus = createVirus(def, this.level);
    if (def.trait === 'trojan') {
      virus.disguised = true;
      virus.disguiseTimer = TROJAN_FUSE;
    }
    this.game.spawnVirus(cell, virus);
    return true;
  }

  /** Apply the running modifier to any regular threat entering the grid (incl. copies/children). */
  applyModifier(virus: Virus): void {
    const mod = this.modifier;
    if (!mod || virus.boss || virus.disguised) return;
    if (mod.hpMult) {
      virus.maxHp *= mod.hpMult;
      virus.hp *= mod.hpMult;
    }
    if (mod.armorBonus) virus.armor += mod.armorBonus * armorScale(this.level);
    if (mod.encrypted) virus.encryptedBy = WAVE_ENCRYPTION;
    if (mod.stealth) {
      virus.cloaked = true;
      virus.hidden = true;
    }
  }

  stopSpawning(): void {
    this.remaining = 0;
  }

  /** Called when the board is reset between waves. */
  end(): void {
    this.remaining = 0;
    this.modifier = undefined;
  }

  isCleared(): boolean {
    return this.remaining <= 0 && this.game.grid.countViruses() === 0;
  }

  private pickDef(): VirusDef {
    const pool = VIRUSES.filter((v) => v.weight > 0 && v.minLevel <= this.level);
    const total = pool.reduce((sum, v) => sum + v.weight, 0);
    let roll = Math.random() * total;
    for (const def of pool) {
      roll -= def.weight;
      if (roll <= 0) return def;
    }
    return pool[0]!;
  }
}
