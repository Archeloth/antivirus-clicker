import type { Game } from '../core/Game';
import { ACHIEVEMENTS } from '../data/achievements';

const CHECK_EVERY = 0.5;

export class AchievementSystem {
  private timer = 0;

  constructor(private readonly game: Game) {}

  update(dt: number): void {
    this.timer += dt;
    if (this.timer < CHECK_EVERY) return;
    this.timer = 0;
    this.check();
  }

  check(): void {
    const { player } = this.game;
    for (const def of ACHIEVEMENTS) {
      if (player.achievements.has(def.id) || !def.check(player)) continue;
      player.achievements.add(def.id);
      this.game.bus.emit('achievement', { id: def.id, name: def.name });
      this.game.log(`ACHIEVEMENT UNLOCKED: ${def.name} (+2% credits)`, 'good');
    }
  }
}
