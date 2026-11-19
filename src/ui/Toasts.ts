import type { Game } from '../core/Game';
import { fmt } from '../utils/format';
import { h } from './dom';

/** Short-lived banners for big moments (achievements, bosses, prestige). */
export class Toasts {
  readonly root = h('div', { class: 'toasts', 'aria-live': 'polite' });

  constructor(game: Game) {
    game.bus.on('achievement', ({ name }) => this.show('ACHIEVEMENT', name, 'good'));
    game.bus.on('bossSpawned', ({ name }) => this.show('BOSS DETECTED', name, 'alert'));
    game.bus.on('bossKilled', ({ name }) => this.show('BOSS NEUTRALIZED', name, 'good'));
    game.bus.on('prestige', ({ keys }) => this.show('OS REINSTALLED', `+${fmt(keys)} root keys`, 'system'));
    game.bus.on('victory', () => this.show('SYSTEM SECURED', 'Zero-Day patched', 'good'));
  }

  show(title: string, text: string, kind: string): void {
    const el = h('div', { class: `toast toast--${kind}` }, h('b', { text: title }), h('span', { text }));
    this.root.appendChild(el);
    el.animate(
      [
        { opacity: 0, transform: 'translateY(-8px)' },
        { opacity: 1, transform: 'translateY(0)', offset: 0.08 },
        { opacity: 1, transform: 'translateY(0)', offset: 0.85 },
        { opacity: 0, transform: 'translateY(-8px)' },
      ],
      { duration: 3200 },
    ).onfinish = () => el.remove();
  }
}
