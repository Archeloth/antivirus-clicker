import type { Game } from '../core/Game';
import { isBossLevel, spawnInterval, waveSize } from '../data/balance';
import { TROJAN_FUSE, VIRUSES, bossForLevel, type VirusDef } from '../data/viruses';
import { createVirus } from '../entities/Virus';

/** Spawns a wave's budget of threats and decides when the wave is cleared. */
export class WaveSystem {
  level = 1;
  total = 0;
  remaining = 0;
  private timer = 0;

  constructor(private readonly game: Game) {}

  begin(level: number): void {
    this.level = level;
    const boss = isBossLevel(level);
    this.total = boss ? Math.floor(waveSize(level) / 2) : waveSize(level);
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
      this.timer += spawnInterval(this.level);
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

  stopSpawning(): void {
    this.remaining = 0;
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
