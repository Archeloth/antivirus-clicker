import type { Cell } from '../core/Cell';
import type { Game } from '../core/Game';

const MANUAL_OVERRIDE = 3;

/**
 * The scan daemon: a square zone that auto-damages everything inside it on a
 * tick. Moved by the player (arrows/WASD/right-click) or by Heuristic Scan.
 */
export class DaemonSystem {
  x = 0;
  y = 0;
  private tickTimer = 0;
  private aiTimer = 0;
  private manualHold = 0;

  constructor(private readonly game: Game) {}

  get size(): number {
    return this.game.player.daemonSize;
  }

  /** Fraction of the current tick elapsed (for UI pulse). */
  get tickProgress(): number {
    return Math.min(1, this.tickTimer / this.game.player.daemonInterval);
  }

  contains(cell: Cell): boolean {
    const s = this.size;
    return cell.x >= this.x && cell.x < this.x + s && cell.y >= this.y && cell.y < this.y + s;
  }

  move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
    this.clamp();
    this.manualHold = MANUAL_OVERRIDE;
  }

  /** Center the zone on a cell. */
  centerOn(cell: Cell, manual = true): void {
    const offset = Math.floor((this.size - 1) / 2);
    this.x = cell.x - offset;
    this.y = cell.y - offset;
    this.clamp();
    if (manual) this.manualHold = MANUAL_OVERRIDE;
  }

  center(): { x: number; y: number } {
    const offset = Math.floor((this.size - 1) / 2);
    return { x: this.x + offset, y: this.y + offset };
  }

  reset(): void {
    this.tickTimer = 0;
    this.aiTimer = 0;
    this.manualHold = 0;
    this.clamp();
  }

  update(dt: number): void {
    this.clamp();
    const { player } = this.game;

    this.tickTimer += dt;
    const interval = player.daemonInterval;
    if (this.tickTimer >= interval) {
      this.tickTimer -= interval;
      this.fire(player.daemonDamage);
    }

    this.manualHold = Math.max(0, this.manualHold - dt);
    const aiInterval = player.heuristicInterval;
    if (aiInterval > 0 && this.manualHold <= 0) {
      this.aiTimer -= dt;
      if (this.aiTimer <= 0) {
        this.aiTimer = aiInterval;
        this.retarget();
      }
    }
  }

  private fire(damage: number): void {
    const { grid, combat, bus } = this.game;
    const s = this.size;
    for (let y = this.y; y < this.y + s; y++) {
      for (let x = this.x; x < this.x + s; x++) {
        const cell = grid.get(x, y);
        if (cell?.virus) combat.damage(cell, damage, 'daemon');
      }
    }
    bus.emit('daemonPulse', undefined);
  }

  /** Heuristic Scan: move to the position covering the most damageable threat HP. */
  private retarget(): void {
    const { grid } = this.game;
    const s = this.size;
    let bestScore = 0;
    let bestX = this.x;
    let bestY = this.y;
    for (let oy = 0; oy <= grid.height - s; oy++) {
      for (let ox = 0; ox <= grid.width - s; ox++) {
        let score = 0;
        for (let y = oy; y < oy + s; y++) {
          for (let x = ox; x < ox + s; x++) {
            const v = grid.get(x, y)?.virus;
            if (!v || v.disguised || v.hidden || v.encryptedBy !== 0) continue;
            if (v.immune === 'all' || v.immune === 'daemon') continue;
            score += 1 + v.hpFraction;
          }
        }
        if (score > bestScore) {
          bestScore = score;
          bestX = ox;
          bestY = oy;
        }
      }
    }
    this.x = bestX;
    this.y = bestY;
  }

  private clamp(): void {
    const s = this.size;
    const { width, height } = this.game.grid;
    this.x = Math.max(0, Math.min(width - s, this.x));
    this.y = Math.max(0, Math.min(height - s, this.y));
  }
}
