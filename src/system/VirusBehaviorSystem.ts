import type { Cell } from '../core/Cell';
import type { Game } from '../core/Game';
import { TRAIT_CADENCE, virusDef } from '../data/viruses';
import { createVirus, type Virus } from '../entities/Virus';
import { pick } from '../utils/random';

const HEAL_FRACTION = 0.06;
const DRAIN_FRACTION = 0.5; // of the vampire's reward, per attack
const WORM_COPY = { hp: 0.6, reward: 0.5, dps: 1 };

/** Per-second attacks and trait behaviors of regular threats. Bosses: see BossSystem. */
export class VirusBehaviorSystem {
  private frame = 0;

  constructor(private readonly game: Game) {}

  update(dt: number): void {
    this.frame++;
    const frozen = this.game.player.firewall > 0;

    for (const cell of this.game.grid.cells) {
      const virus = cell.virus;
      if (!virus || virus.boss || virus.stamp === this.frame) continue;
      virus.stamp = this.frame;

      if (virus.disguised) {
        virus.disguiseTimer -= dt;
        if (virus.disguiseTimer <= 0) {
          virus.disguised = false;
          this.game.log(`Trojan payload activated at ${addr(cell)}!`, 'alert');
        }
        continue;
      }

      if (frozen) continue;

      virus.attackTimer -= dt;
      if (virus.attackTimer <= 0) {
        virus.attackTimer += 1;
        this.game.hurtPlayer(virus.dps, cell);
        if (virus.has('drain')) {
          virus.stolen += this.game.player.drain(virus.reward * DRAIN_FRACTION);
        }
      }

      const cadence = virus.trait ? TRAIT_CADENCE[virus.trait] : undefined;
      if (cadence === undefined || virus.generation > 0) continue;
      virus.traitTimer += dt;
      if (virus.traitTimer < cadence) continue;
      virus.traitTimer -= cadence;
      this.runTrait(virus, cell);
    }
  }

  private runTrait(virus: Virus, cell: Cell): void {
    const { grid } = this.game;
    switch (virus.trait) {
      case 'hop': {
        const target = grid.randomEmpty();
        if (target && virus.encryptedBy === 0) {
          cell.virus = undefined;
          target.virus = virus;
        }
        break;
      }
      case 'heal':
        for (const n of grid.neighbors(cell)) {
          const v = n.virus;
          if (v && !v.boss) v.hp = Math.min(v.maxHp, v.hp + v.maxHp * HEAL_FRACTION);
        }
        break;
      case 'spread': {
        const target = grid.randomEmptyNeighbor(cell);
        if (target) {
          const copy = createVirus(virusDef(virus.kind), this.game.waves.level, 1, WORM_COPY);
          this.game.spawnVirus(target, copy);
        }
        break;
      }
      case 'encrypt': {
        const target = pick(
          grid.neighbors(cell).filter((n) => n.virus && !n.virus.boss && n.virus.encryptedBy === 0),
        );
        if (target?.virus) {
          target.virus.encryptedBy = virus.id;
          this.game.log(`${target.virus.name} at ${addr(target)} encrypted by Ransomware`, 'warn');
        }
        break;
      }
      default:
        break;
    }
  }
}

/** Memory-address style cell label, e.g. 0x1F. */
export function addr(cell: Cell): string {
  return `0x${cell.index.toString(16).toUpperCase().padStart(2, '0')}`;
}
