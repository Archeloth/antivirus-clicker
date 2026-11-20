import type { Cell } from '../core/Cell';
import type { Game } from '../core/Game';
import { rewardScale } from '../data/balance';
import { chance } from '../utils/random';

const BASE_CHANCE_PER_SECOND = 0.06;
const PACKET_TTL = 6;
const PACKET_VALUE = 8; // in Bug-kills-at-level-1 units

/** Data packets: hack-only bonus credits that appear on empty cells during waves. */
export class PickupSystem {
  private timer = 0;

  constructor(private readonly game: Game) {}

  update(dt: number): void {
    for (const cell of this.game.grid.cells) {
      if (!cell.pickup) continue;
      cell.pickup.ttl -= dt;
      if (cell.pickup.ttl <= 0) cell.pickup = undefined;
    }

    this.timer += dt;
    if (this.timer < 1) return;
    this.timer -= 1;

    const { player } = this.game;
    if (!chance(BASE_CHANCE_PER_SECOND * player.packetBonus)) return;
    const cell = this.game.grid.randomEmpty();
    if (!cell) return;
    cell.pickup = {
      value: PACKET_VALUE * rewardScale(this.game.waves.level) * player.packetBonus,
      ttl: PACKET_TTL,
    };
  }

  collect(cell: Cell): void {
    const pickup = cell.pickup;
    if (!pickup) return;
    cell.pickup = undefined;
    const value = pickup.value * this.game.player.creditMult;
    this.game.player.addCredits(value);
    this.game.player.stats.packets++;
    this.game.bus.emit('pickupCollected', { cell, value });
  }
}
