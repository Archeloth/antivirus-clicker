import type { Game } from '../core/Game';
import { ROOT_KEY_BONUS } from '../data/balance';
import { MODULES, type ModuleDef } from '../data/modules';
import { fmt } from '../utils/format';
import { DomCache, h, setText } from './dom';

interface Row {
  def: ModuleDef;
  root: HTMLDivElement;
  level: HTMLSpanElement;
  effect: HTMLSpanElement;
  cost: HTMLSpanElement;
}

/** Kernel Modules: the permanent meta tree bought with root keys. Same row pattern as ShopTab. */
export class KernelTab {
  readonly root: HTMLDivElement;
  private readonly rows: Row[] = [];
  private readonly cache = new DomCache();
  private readonly balance = h('div', { class: 'prestige-info' });

  constructor(private readonly game: Game) {
    this.root = h(
      'div',
      { class: 'kernel' },
      h('div', { class: 'shop-category', text: 'KERNEL MODULES // permanent' }),
      h('p', {
        class: 'muted',
        text: `Spend root keys on modules that survive every reinstall. Your passive +${ROOT_KEY_BONUS * 100}%/key bonus counts lifetime keys, so spending never weakens you.`,
      }),
      this.balance,
    );

    for (const def of MODULES) {
      const level = h('span', { class: 'upg-level' });
      const effect = h('span', { class: 'upg-effect' });
      const cost = h('span', { class: 'upg-cost' });
      const root = h(
        'div',
        { class: 'upg', role: 'button', tabindex: 0 },
        h('div', { class: 'upg-head' }, h('span', { class: 'upg-name', text: def.name }), level),
        h('div', { class: 'upg-desc', text: def.description + (def.runStart ? ' (applies to new runs)' : '') }),
        h('div', { class: 'upg-foot' }, effect, cost),
      );
      const buy = () => game.buyModule(def.id);
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

  render(): void {
    const { player } = this.game;
    setText(
      this.balance,
      `Root keys: ${fmt(player.rootKeys)} to spend · ${fmt(player.rootKeysTotal)} earned (×${player.keyMult.toFixed(2)} damage & credits)`,
    );

    for (const row of this.rows) {
      const { def } = row;
      const lvl = player.mod(def.id);
      const cost = this.game.moduleCost(def);
      let state: string;
      if (cost === undefined) state = 'is-maxed';
      else state = cost <= player.rootKeys ? 'is-affordable' : 'is-poor';

      if (this.cache.changed(row.root, 'state', state)) row.root.className = `upg ${state}`;
      setText(row.level, `Lv ${lvl}/${def.costs.length}`);
      setText(row.effect, cost === undefined ? def.effect(lvl) : `${def.effect(lvl)} → ${def.effect(lvl + 1)}`);
      setText(row.cost, cost === undefined ? 'MAX' : `${fmt(cost)} ⚿`);
    }
  }
}
