import type { Cell } from '../core/Cell';
import type { Game } from '../core/Game';
import type { DamageSource } from '../core/GameEvents';
import { ARMOR_FLOOR, SHIELD_REDUCTION } from '../data/balance';
import { createVirus } from '../entities/Virus';
import { virusDef } from '../data/viruses';
import { chance, pick } from '../utils/random';

const EXPLOSION_FRACTION = 0.3;
const VAMPIRE_REFUND = 1.5;
const FORK_CHILD = { hp: 0.35, reward: 0.4, dps: 0.5 };

/**
 * The ONLY place threats take damage or die. Every source (hack, daemon,
 * abilities, explosions, chains, boss purge) goes through damage()/kill(),
 * so rewards, death effects and events are always consistent.
 */
export class CombatSystem {
  private purging = false;

  constructor(private readonly game: Game) {}

  damage(cell: Cell, raw: number, source: DamageSource, crit = false): void {
    const virus = cell.virus;
    if (!virus || virus.hp <= 0 || virus.disguised) return;

    const blocked = this.blockReason(cell, source);
    if (blocked) {
      this.game.bus.emit('damageBlocked', { cell, reason: blocked });
      return;
    }

    let amount = raw;
    if (this.isShielded(cell)) amount *= 1 - SHIELD_REDUCTION;
    if (virus.armor > 0) amount = Math.max(amount * ARMOR_FLOOR, amount - virus.armor);

    virus.hp -= amount;
    this.game.bus.emit('virusDamaged', { cell, virus, amount, source, crit });

    if (virus.hp <= 0) this.kill(cell, source, raw);
  }

  /** Remove the virus in `cell`, pay out, and run death effects. */
  kill(cell: Cell, source: DamageSource, lastHit = 0, bonusMult = 1): void {
    const virus = cell.virus;
    if (!virus) return;
    const { player, bus, grid } = this.game;

    cell.virus = undefined;
    virus.hp = 0;

    const credits =
      virus.reward * player.creditMult * bonusMult + virus.stolen * VAMPIRE_REFUND;
    player.addCredits(credits);
    player.stats.kills++;
    bus.emit('virusKilled', { cell, virus, source, credits });

    if (virus.has('encrypt')) {
      for (const other of grid.cells) {
        if (other.virus?.encryptedBy === virus.id) other.virus.encryptedBy = 0;
      }
    }

    if (virus.boss) {
      this.game.bosses.onBossKilled(virus);
      return;
    }

    if (this.purging) return;

    if (virus.has('explode')) {
      for (const neighbor of grid.neighbors(cell)) {
        if (neighbor.virus) {
          this.damage(neighbor, neighbor.virus.maxHp * EXPLOSION_FRACTION, 'explosion');
        }
      }
    }

    if (virus.has('split')) {
      const def = virusDef(virus.kind);
      for (let i = 0; i < 2; i++) {
        const target = grid.randomEmptyNeighbor(cell) ?? (i === 0 ? cell : undefined);
        if (!target || !target.isEmpty) continue;
        this.game.spawnVirus(target, createVirus(def, this.game.waves.level, 1, FORK_CHILD));
      }
    }

    // Code Injection: chain the killing blow into a neighbor
    if ((source === 'hack' || source === 'daemon') && lastHit > 0 && chance(player.chainChance)) {
      const target = pick(grid.neighbors(cell).filter((n) => n.virus && !n.virus.disguised));
      if (target) this.damage(target, lastHit, 'chain');
    }
  }

  /** Kill every remaining threat (boss defeated). Death effects are suppressed. */
  purgeAll(): void {
    this.purging = true;
    for (const cell of this.game.grid.cells) {
      if (cell.virus) this.kill(cell, 'purge');
    }
    this.purging = false;
  }

  isShielded(cell: Cell): boolean {
    return this.game.grid.neighbors(cell).some((n) => n.virus?.has('shield') === true);
  }

  private blockReason(cell: Cell, source: DamageSource): string | undefined {
    const virus = cell.virus!;
    if (virus.hidden) return 'HIDDEN';
    if (virus.immune === 'all') return 'IMMUNE';
    const isClick = source === 'hack';
    const isDaemon = source === 'daemon' || source === 'chain';
    if (virus.immune === 'hack' && isClick) return 'IMMUNE';
    if (virus.immune === 'daemon' && isDaemon) return 'IMMUNE';
    if (virus.encryptedBy !== 0 && isDaemon) return 'ENCRYPTED';
    return undefined;
  }
}
