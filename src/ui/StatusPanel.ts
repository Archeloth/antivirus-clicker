import type { Game } from '../core/Game';
import type { AbilityDef } from '../data/abilities';
import { fmt, fmtPct, fmtSeconds } from '../utils/format';
import { DomCache, h, setClass, setText } from './dom';

interface AbilityView {
  def: AbilityDef;
  root: HTMLButtonElement;
  state: HTMLSpanElement;
  fill: HTMLDivElement;
}

/** Left column: integrity, credits, derived stats, buffs and the ability bar. */
export class StatusPanel {
  readonly root: HTMLElement;
  private readonly cache = new DomCache();
  private readonly hpText = h('span', { class: 'stat-value' });
  private readonly hpFill = h('div', { class: 'bar-fill' });
  private readonly hpBar = h('div', { class: 'bar bar--hp' }, this.hpFill);
  private readonly credits = h('div', { class: 'credits-value' });
  private readonly creditMult = h('div', { class: 'credits-sub' });
  private readonly level = h('span', { class: 'stat-value' });
  private readonly stats = new Map<string, HTMLElement>();
  private readonly buffs = h('div', { class: 'buffs' });
  private readonly abilities: AbilityView[] = [];

  constructor(private readonly game: Game) {
    const statList = h('dl', { class: 'stat-list' });
    for (const [key, label] of [
      ['click', 'Click dmg'],
      ['crit', 'Crit chance'],
      ['daemon', 'Daemon dmg'],
      ['rate', 'Daemon rate'],
      ['zone', 'Daemon zone'],
      ['auto', 'Auto-target'],
      ['chain', 'Chain chance'],
      ['regen', 'Regen'],
      ['keys', 'Root keys'],
    ] as const) {
      const value = h('dd');
      statList.append(h('dt', { text: label }), value);
      this.stats.set(key, value);
    }

    const abilityList = h('div', { class: 'abilities' });
    for (const def of game.abilities.abilities) {
      const state = h('span', { class: 'ability-state' });
      const fill = h('div', { class: 'ability-cd' });
      const root = h(
        'button',
        { class: 'ability', type: 'button', title: def.description },
        fill,
        h('kbd', { text: def.key }),
        h('span', { class: 'ability-name', text: def.name }),
        state,
      );
      root.addEventListener('click', () => game.useAbility(def.id));
      abilityList.appendChild(root);
      this.abilities.push({ def, root, state, fill });
    }

    this.root = h(
      'aside',
      { class: 'panel panel--status' },
      h('div', { class: 'panel-title', text: '// system status' }),
      h('div', { class: 'stat-row' }, h('span', { class: 'stat-label', text: 'INTEGRITY' }), this.hpText),
      this.hpBar,
      h('div', { class: 'credits' }, h('div', { class: 'stat-label', text: 'CREDITS' }), this.credits, this.creditMult),
      h('div', { class: 'stat-row' }, h('span', { class: 'stat-label', text: 'SECURITY LEVEL' }), this.level),
      statList,
      this.buffs,
      h('div', { class: 'panel-title', text: '// abilities' }),
      abilityList,
      h(
        'div',
        { class: 'controls-hint' },
        h('div', {}, h('kbd', { text: 'click' }), ' hack a cell'),
        h('div', {}, h('kbd', { text: 'right-click' }), ' move daemon (touch: tap empty cell)'),
        h('div', {}, h('kbd', { text: '←↑↓→' }), '/', h('kbd', { text: 'WASD' }), ' nudge daemon'),
        h('div', {}, h('kbd', { text: '1-5' }), ' abilities  ', h('kbd', { text: 'P' }), ' pause  ', h('kbd', { text: 'M' }), ' mute'),
      ),
    );
  }

  render(): void {
    const { player, abilities, phase, paused } = this.game;
    const maxHp = player.maxHp;
    const hp = Math.max(0, player.hp);
    const frac = hp / maxHp;
    setText(this.hpText, `${fmt(hp)} / ${fmt(maxHp)}`);
    this.cache.style(this.hpFill, 'transform', `scaleX(${frac.toFixed(3)})`);
    setClass(this.hpBar, 'is-warn', frac <= 0.5 && frac > 0.25);
    setClass(this.hpBar, 'is-crit', frac <= 0.25);

    setText(this.credits, fmt(player.credits));
    setText(this.creditMult, `×${player.creditMult.toFixed(2)} credit multiplier`);
    setText(this.level, `${player.level} · cleared ${player.highestLevel - 1}`);

    const s = this.stats;
    setText(s.get('click')!, fmt(player.clickDamage));
    setText(s.get('crit')!, fmtPct(player.critChance));
    setText(s.get('daemon')!, fmt(player.daemonDamage));
    setText(s.get('rate')!, `${(1 / player.daemonInterval).toFixed(2)}/s`);
    setText(s.get('zone')!, `${player.daemonSize}×${player.daemonSize}`);
    setText(s.get('auto')!, player.heuristicInterval > 0 ? `${player.heuristicInterval.toFixed(1)}s` : 'off');
    setText(s.get('chain')!, fmtPct(player.chainChance));
    setText(s.get('regen')!, `${fmt(player.regenPerSecond)}/s`);
    setText(s.get('keys')!, player.rootKeys > 0 ? `${fmt(player.rootKeys)} (×${player.keyMult.toFixed(2)})` : '0');

    const buffs: string[] = [];
    if (player.overdrive > 0) buffs.push(`OVERDRIVE ×2  ${fmtSeconds(player.overdrive)}`);
    if (player.firewall > 0) buffs.push(`FIREWALL  ${fmtSeconds(player.firewall)}`);
    setText(this.buffs, buffs.join('\n'));

    const usable = phase === 'wave' && !paused;
    for (const view of this.abilities) {
      const unlocked = abilities.isUnlocked(view.def.id);
      const cd = abilities.cooldown(view.def.id);
      const state = !unlocked ? 'LOCKED' : cd > 0 ? fmtSeconds(cd) : 'READY';
      setText(view.state, state);
      setClass(view.root, 'is-locked', !unlocked);
      setClass(view.root, 'is-ready', unlocked && cd <= 0 && usable);
      view.root.disabled = !unlocked || cd > 0 || !usable;
      this.cache.style(view.fill, 'transform', `scaleX(${unlocked ? abilities.cooldownFraction(view.def).toFixed(3) : 0})`);
    }
  }
}
