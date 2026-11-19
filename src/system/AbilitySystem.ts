import type { Game } from '../core/Game';
import {
  ABILITIES,
  EMP_BOSS_FRACTION,
  EMP_FRACTION,
  FIREWALL_DURATION,
  LOGIC_BOMB_MULT,
  MINER_KILLS,
  OVERDRIVE_DURATION,
  type AbilityDef,
} from '../data/abilities';
import { rewardScale } from '../data/balance';
import { virusDef } from '../data/viruses';

export class AbilitySystem {
  private readonly cooldowns = new Map<string, number>();

  constructor(private readonly game: Game) {}

  get abilities(): readonly AbilityDef[] {
    return ABILITIES;
  }

  isUnlocked(id: string): boolean {
    return this.game.player.lvl(id) > 0;
  }

  cooldown(id: string): number {
    return this.cooldowns.get(id) ?? 0;
  }

  cooldownFraction(ability: AbilityDef): number {
    return this.cooldown(ability.id) / ability.cooldown;
  }

  reset(): void {
    this.cooldowns.clear();
  }

  update(dt: number): void {
    for (const [id, remaining] of this.cooldowns) {
      if (remaining <= dt) this.cooldowns.delete(id);
      else this.cooldowns.set(id, remaining - dt);
    }
  }

  use(id: string): boolean {
    const ability = ABILITIES.find((a) => a.id === id);
    if (!ability || !this.isUnlocked(id) || this.cooldown(id) > 0) return false;
    if (this.game.phase !== 'wave' || this.game.paused) return false;

    this.activate(ability);
    this.cooldowns.set(id, ability.cooldown);
    this.game.bus.emit('abilityUsed', { id });
    return true;
  }

  private activate(ability: AbilityDef): void {
    const { grid, combat, player, daemon } = this.game;
    switch (ability.id) {
      case 'emp':
        for (const cell of grid.cells) {
          const v = cell.virus;
          if (!v) continue;
          combat.damage(cell, v.maxHp * (v.boss ? EMP_BOSS_FRACTION : EMP_FRACTION), 'ability');
        }
        this.game.log('EMP discharged across the grid.', 'good');
        break;
      case 'logic-bomb': {
        const c = daemon.center();
        const damage = player.clickDamage * LOGIC_BOMB_MULT;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const cell = grid.get(c.x + dx, c.y + dy);
            if (cell?.virus) combat.damage(cell, damage, 'ability');
          }
        }
        this.game.log('Logic bomb detonated.', 'good');
        break;
      }
      case 'overdrive':
        player.overdrive = OVERDRIVE_DURATION;
        this.game.log('OVERDRIVE engaged: damage ×2.', 'good');
        break;
      case 'firewall':
        player.firewall = FIREWALL_DURATION;
        this.game.log('Firewall raised: all threat activity frozen.', 'good');
        break;
      case 'miner': {
        const amount =
          virusDef('bug').reward * rewardScale(this.game.waves.level) * MINER_KILLS * player.creditMult;
        player.addCredits(amount);
        this.game.log(`Crypto miner yielded credits.`, 'good');
        break;
      }
    }
  }
}
