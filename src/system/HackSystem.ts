import type { Cell } from '../core/Cell';
import type { Game } from '../core/Game';
import { CRIT_MULTIPLIER } from '../data/balance';
import { chance } from '../utils/random';

/** Seconds of continuous hacking on one target to reach the focus cap. */
export const FOCUS_RAMP = 1.5;

/**
 * The player's manual attack: a cursor on the grid and a held "hack" input
 * (Space or a held mouse button). Hits fire at `player.hackRate`; pressing
 * faster than that never helps, so there is no reason to mash. Staying on one
 * target ramps a focus multiplier up to `player.focusCap`.
 */
export class HackSystem {
  x = 3;
  y = 3;
  holding = false;
  focusId = 0;
  focusTime = 0;
  /** Time banked toward the next hit; capped at one interval while idle. */
  private ready = 0;

  constructor(private readonly game: Game) {}

  get cell(): Cell {
    return this.game.grid.get(this.x, this.y)!;
  }

  /** 0..1 progress toward the focus cap. */
  get focusFraction(): number {
    return Math.min(1, this.focusTime / FOCUS_RAMP);
  }

  get focusMult(): number {
    return 1 + (this.game.player.focusCap - 1) * this.focusFraction;
  }

  private get interval(): number {
    return 1 / this.game.player.hackRate;
  }

  reset(): void {
    this.holding = false;
    this.focusId = 0;
    this.focusTime = 0;
    this.ready = this.interval;
  }

  moveCursor(dx: number, dy: number): void {
    const { width, height } = this.game.grid;
    this.x = Math.max(0, Math.min(width - 1, this.x + dx));
    this.y = Math.max(0, Math.min(height - 1, this.y + dy));
  }

  setCursor(cell: Cell): void {
    this.x = cell.x;
    this.y = cell.y;
  }

  setHolding(on: boolean): void {
    if (on === this.holding) return;
    this.holding = on;
    // A fresh press fires immediately if a hit is banked, but never faster than hackRate.
    if (on && this.ready >= this.interval && this.game.phase === 'wave' && !this.game.paused) {
      this.ready -= this.interval;
      this.hit();
    }
  }

  update(dt: number): void {
    const interval = this.interval;
    const virus = this.cell.virus;

    // Focus: grows while holding on the same live target, resets otherwise.
    if (this.holding && virus && !virus.disguised && virus.id === this.focusId) {
      this.focusTime += dt;
    } else if (!this.holding || virus?.id !== this.focusId) {
      this.focusId = this.holding && virus ? virus.id : 0;
      this.focusTime = 0;
    }

    if (!this.holding) {
      this.ready = Math.min(interval, this.ready + dt);
      return;
    }
    this.ready += dt;
    while (this.ready >= interval) {
      this.ready -= interval;
      this.hit();
    }
  }

  /** One hack on the cursor cell. */
  private hit(): void {
    const { game } = this;
    const { player } = game;
    const cell = this.cell;
    player.stats.hacks++;

    if (cell.pickup) {
      game.pickups.collect(cell);
      this.afterKill();
      return;
    }
    const virus = cell.virus;
    if (!virus) return;

    if (virus.disguised) {
      player.stats.trojansCaught++;
      game.log('Trojan quarantined before activation. Double credits!', 'good');
      game.combat.kill(cell, 'hack', 0, 2);
      this.afterKill();
      return;
    }

    const crit = chance(player.critChance);
    if (crit) player.stats.crits++;
    const focus = virus.id === this.focusId ? this.focusMult : 1;
    const damage = player.hackDamage * focus * (crit ? CRIT_MULTIPLIER : 1);
    game.combat.damage(cell, damage, 'hack', crit);
    if (!cell.virus) this.afterKill();
  }

  private afterKill(): void {
    this.focusId = 0;
    this.focusTime = 0;
    if (this.game.player.hasTargetLock) {
      const next = this.bestTarget();
      if (next) this.setCursor(next);
    }
  }

  /** Tab / Shift+Tab: next or previous hackable cell in reading order. */
  cycle(direction: 1 | -1): void {
    const cells = this.game.grid.cells.filter((c) => isHackable(c));
    if (cells.length === 0) return;
    const here = this.cell.index;
    const next =
      direction === 1
        ? (cells.find((c) => c.index > here) ?? cells[0])
        : ([...cells].reverse().find((c) => c.index < here) ?? cells[cells.length - 1]);
    if (next) this.setCursor(next);
  }

  /**
   * Priority target for Target Lock (and the sim bot): packets and disguised
   * trojans first, then support threats, then the weakest. Nearer wins ties.
   */
  bestTarget(): Cell | undefined {
    let best: Cell | undefined;
    let bestScore = -Infinity;
    for (const cell of this.game.grid.cells) {
      if (!isHackable(cell)) continue;
      const v = cell.virus;
      let score: number;
      if (!v || v.disguised) score = 5;
      else {
        score = 1 - v.hpFraction;
        if (v.kind === 'node') score += 3;
        if (v.trait === 'heal' || v.trait === 'shield' || v.trait === 'encrypt') score += 2;
        if (v.encryptedBy !== 0) score += 1;
        if (v.boss) score += 1;
      }
      score -= 0.05 * (Math.abs(cell.x - this.x) + Math.abs(cell.y - this.y));
      if (score > bestScore) {
        bestScore = score;
        best = cell;
      }
    }
    return best;
  }
}

/** A cell worth putting the cursor on: a packet or a threat that hacking can damage. */
export function isHackable(cell: Cell): boolean {
  if (cell.pickup) return true;
  const v = cell.virus;
  if (!v) return false;
  return !v.hidden && v.immune !== 'all' && v.immune !== 'hack';
}
