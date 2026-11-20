import type { Game } from '../core/Game';
import { UPGRADES } from '../data/upgrades';

/**
 * Package Manager (Kernel Module): periodically buys the cheapest affordable
 * stat upgrade. Abilities and one-time unlocks are left to the player.
 */
export class AutomationSystem {
  private timer = 0;

  constructor(private readonly game: Game) {}

  update(dt: number): void {
    const interval = this.game.player.autoBuyInterval;
    if (interval <= 0 || this.game.phase === 'victory') return;
    this.timer += dt;
    if (this.timer < interval) return;
    this.timer = 0;
    this.buyCheapest();
  }

  private buyCheapest(): void {
    const { game } = this;
    const buyMax = game.player.settings.buyMax;
    game.player.settings.buyMax = false; // one level per tick, cheapest first
    let best: { id: string; cost: number } | undefined;
    for (const def of UPGRADES) {
      if (def.category === 'ability' || def.max === 1) continue;
      if (game.upgradeLocked(def) || game.upgradeMaxed(def)) continue;
      const { cost } = game.quote(def);
      if (cost <= game.player.credits && (!best || cost < best.cost)) best = { id: def.id, cost };
    }
    if (best) game.buy(best.id);
    game.player.settings.buyMax = buyMax;
  }
}
