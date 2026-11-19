import type { Game } from '../core/Game';
import { armorScale, dpsScale, hpScale, rewardScale } from '../data/balance';
import { BOSSES, VIRUSES } from '../data/viruses';
import { fmt } from '../utils/format';
import { h } from './dom';

/** Encyclopedia of encountered threats, with stats scaled to the selected level. */
export class ThreatTab {
  readonly root = h('div', { class: 'threats' });
  private key = '';

  constructor(private readonly game: Game) {}

  render(): void {
    const { player } = this.game;
    const level = this.game.phase === 'wave' ? this.game.waves.level : player.level;
    const key = `${level}|${player.seen.size}`;
    if (key === this.key) return;
    this.key = key;

    const nodes: Node[] = [
      h('div', { class: 'threats-note', text: `Stats shown for level ${level}.` }),
    ];

    for (const def of VIRUSES) {
      const known = player.seen.has(def.id);
      const stats = `HP ${fmt(def.hp * hpScale(level))} · DPS ${fmt(def.dps * dpsScale(level))} · ¢ ${fmt(def.reward * rewardScale(level))}${def.armor ? ` · ARMOR ${fmt(def.armor * armorScale(level))}` : ''}`;
      nodes.push(
        entry(
          known ? def.tag : '???',
          def.color,
          known ? def.name : 'Unknown signature',
          known ? stats : def.weight > 0 ? `First seen around level ${def.minLevel}.` : 'Boss-related process.',
          known ? def.description : '',
          !known,
        ),
      );
    }

    nodes.push(h('div', { class: 'shop-category', text: 'BOSSES' }));
    for (const boss of BOSSES) {
      const known = player.seen.has(boss.id);
      nodes.push(
        entry(
          known ? boss.tag : '!!!',
          boss.color,
          known ? boss.name : 'Classified',
          known ? `HP ${fmt(boss.hp * hpScale(level))} · SLAM ${fmt(boss.slam * dpsScale(level))}/${boss.slamInterval}s` : `Appears at level ${boss.level}.`,
          known ? boss.description : '',
          !known,
        ),
      );
    }
    this.root.replaceChildren(...nodes);
  }
}

function entry(tag: string, color: string, name: string, stats: string, text: string, unknown: boolean): HTMLElement {
  const chip = h('span', { class: 'threat-tag', text: tag });
  chip.style.setProperty('--c', color);
  return h(
    'div',
    { class: `threat${unknown ? ' is-unknown' : ''}` },
    chip,
    h('div', { class: 'threat-body' }, h('div', { class: 'threat-name', text: name }), h('div', { class: 'threat-stats', text: stats }), text ? h('div', { class: 'threat-desc', text }) : ''),
  );
}
