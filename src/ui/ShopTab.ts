import type { Game } from '../core/Game';
import { CATEGORY_LABELS, UPGRADES, type UpgradeCategory, type UpgradeDef } from '../data/upgrades';
import { fmt } from '../utils/format';
import { DomCache, h, setText } from './dom';

interface Row {
  def: UpgradeDef;
  root: HTMLDivElement;
  level: HTMLSpanElement;
  effect: HTMLSpanElement;
  cost: HTMLSpanElement;
}

/** Upgrade list, always available (also mid-wave). Rows diff their state each frame. */
export class ShopTab {
  readonly root: HTMLDivElement;
  private readonly rows: Row[] = [];
  private readonly cache = new DomCache();
  private readonly modeButton: HTMLButtonElement;

  constructor(private readonly game: Game) {
    this.modeButton = h('button', { class: 'btn btn--small', type: 'button' });
    this.modeButton.addEventListener('click', () => {
      game.player.settings.buyMax = !game.player.settings.buyMax;
    });

    this.root = h(
      'div',
      { class: 'shop' },
      h('div', { class: 'shop-toolbar' }, h('span', { text: 'Buy amount' }), this.modeButton),
    );

    const categories: UpgradeCategory[] = ['hack', 'daemon', 'system', 'ability'];
    for (const category of categories) {
      this.root.append(h('div', { class: 'shop-category', text: CATEGORY_LABELS[category] }));
      for (const def of UPGRADES.filter((u) => u.category === category)) {
        const level = h('span', { class: 'upg-level' });
        const effect = h('span', { class: 'upg-effect' });
        const cost = h('span', { class: 'upg-cost' });
        const root = h(
          'div',
          { class: 'upg', role: 'button', tabindex: 0 },
          h('div', { class: 'upg-head' }, h('span', { class: 'upg-name', text: def.name }), level),
          h('div', { class: 'upg-desc', text: def.description }),
          h('div', { class: 'upg-foot' }, effect, cost),
        );
        const buy = () => game.buy(def.id);
        root.addEventListener('click', buy);
        root.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            buy();
          }
        });
        this.root.append(root);
        this.rows.push({ def, root, level, effect, cost });
      }
    }
  }

  render(): void {
    const { game } = this;
    const { player } = game;
    setText(this.modeButton, player.settings.buyMax ? '× MAX' : '× 1');

    for (const row of this.rows) {
      const { def } = row;
      const lvl = player.lvl(def.id);
      const locked = game.upgradeLocked(def);
      const maxed = game.upgradeMaxed(def);
      let state: string;
      let effect = '';
      let cost = '';

      if (maxed) {
        state = 'is-maxed';
        effect = def.effect ? def.effect(lvl) : 'UNLOCKED';
        cost = 'MAX';
      } else if (locked) {
        state = 'is-locked';
        effect = `requires: ${locked}`;
      } else {
        const quote = game.quote(def);
        state = quote.cost <= player.credits ? 'is-affordable' : 'is-poor';
        if (def.effect) effect = `${def.effect(lvl)} → ${def.effect(lvl + quote.count)}`;
        cost = `${quote.count > 1 ? `×${quote.count} ` : ''}${fmt(quote.cost)} ¢`;
      }

      if (this.cache.changed(row.root, 'state', state)) row.root.className = `upg ${state}`;
      setText(row.level, def.max === 1 ? '' : `Lv ${lvl}${def.max ? `/${def.max}` : ''}`);
      setText(row.effect, effect);
      setText(row.cost, cost);
    }
  }
}
