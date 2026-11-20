import type { Cell } from '../core/Cell';
import type { Game } from '../core/Game';
import { fmt } from '../utils/format';
import { DomCache, h } from './dom';
import { Particles } from './Particles';
import { Popups } from './Popups';

interface CellView {
  root: HTMLDivElement;
  chip: HTMLDivElement;
  tag: HTMLSpanElement;
  badge: HTMLSpanElement;
  hpFill: HTMLDivElement;
}

/**
 * The board. Each frame it diffs every cell's visual state against what is in
 * the DOM and only writes changes, so 64 cells cost almost nothing.
 */
export class GridView {
  readonly root: HTMLDivElement;
  readonly overlayHost: HTMLDivElement;
  private readonly gridEl: HTMLDivElement;
  private readonly daemonEl: HTMLDivElement;
  private readonly cursorEl: HTMLDivElement;
  private readonly cursorFocus: HTMLDivElement;
  private pointerHolding = false;
  private readonly views: CellView[] = [];
  private readonly cache = new DomCache();
  private readonly particles: Particles;
  private readonly popups: Popups;

  constructor(private readonly game: Game) {
    const { grid } = game;
    this.particles = new Particles(grid.width);
    this.popups = new Popups(grid.width);

    this.gridEl = h('div', { class: 'grid', role: 'grid', 'aria-label': 'Infected memory grid' });
    this.gridEl.style.setProperty('--cols', String(grid.width));
    for (const cell of grid.cells) {
      const tag = h('span', { class: 'chip-tag' });
      const badge = h('span', { class: 'chip-badge' });
      const hpFill = h('div', { class: 'chip-hp-fill' });
      const chip = h('div', { class: 'chip' }, tag, badge, h('div', { class: 'chip-hp' }, hpFill));
      const root = h('div', { class: 'cell', 'data-i': cell.index }, chip);
      this.gridEl.appendChild(root);
      this.views.push({ root, chip, tag, badge, hpFill });
    }

    this.daemonEl = h('div', { class: 'daemon' }, h('span', { class: 'daemon-label', text: 'daemon' }));
    this.cursorFocus = h('div', { class: 'cursor-focus-fill' });
    this.cursorEl = h('div', { class: 'cursor' }, h('div', { class: 'cursor-focus' }, this.cursorFocus));
    this.overlayHost = h('div', { class: 'overlay-host' });
    this.root = h(
      'div',
      { class: 'grid-wrap' },
      this.gridEl,
      this.daemonEl,
      this.cursorEl,
      this.particles.canvas,
      this.popups.layer,
      this.overlayHost,
    );

    this.bindInput();
    this.bindEvents();
  }

  private bindInput(): void {
    const cellFrom = (event: Event): Cell | undefined => {
      const el = (event.target as HTMLElement).closest<HTMLElement>('.cell');
      const index = el ? Number(el.dataset.i) : NaN;
      return Number.isNaN(index) ? undefined : this.game.grid.cells[index];
    };
    // Mouse/touch mirror the keyboard: hover moves the cursor, holding the button hacks.
    this.gridEl.addEventListener('pointerdown', (event) => {
      const cell = cellFrom(event);
      if (!cell) return;
      // Touch has no right-click: tapping an empty cell moves the daemon instead.
      const touchMove = event.pointerType === 'touch' && cell.isEmpty;
      if (event.button === 2 || event.shiftKey || touchMove) {
        this.game.placeDaemon(cell);
        return;
      }
      if (event.button !== 0) return;
      // Let pointerover keep firing while a finger slides across cells.
      if (this.gridEl.hasPointerCapture(event.pointerId)) this.gridEl.releasePointerCapture(event.pointerId);
      this.game.setCursor(cell);
      this.pointerHolding = true;
      this.game.setHolding(true);
    });
    this.gridEl.addEventListener('pointerover', (event) => {
      const cell = cellFrom(event);
      if (cell && (event.pointerType === 'mouse' || this.pointerHolding)) this.game.setCursor(cell);
    });
    const release = () => {
      if (!this.pointerHolding) return;
      this.pointerHolding = false;
      this.game.setHolding(false);
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    this.gridEl.addEventListener('pointerleave', release);
    this.gridEl.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  private get motion(): boolean {
    return !this.game.player.settings.reducedMotion;
  }

  private bindEvents(): void {
    const { bus, player } = this.game;

    bus.on('virusDamaged', ({ cell, amount, source, crit }) => {
      const view = this.views[cell.index];
      if (!view) return;
      if (source === 'hack' || crit) {
        if (this.motion) {
          view.chip.animate(
            [{ transform: 'scale(0.86)' }, { transform: 'scale(1)' }],
            { duration: 120, easing: 'ease-out' },
          );
        }
        if (player.settings.damageNumbers) {
          this.popups.show(cell.x, cell.y, fmt(amount), crit ? 'crit' : 'hack');
        }
        if (crit && this.motion) this.particles.burst(cell.x, cell.y, '#ffe066', 6, 1.6);
      } else {
        view.chip.animate([{ filter: 'brightness(1.9)' }, { filter: 'brightness(1)' }], { duration: 140 });
        if (player.settings.damageNumbers && source !== 'daemon') {
          this.popups.show(cell.x, cell.y, fmt(amount), 'dim');
        }
      }
    });

    bus.on('virusKilled', ({ cell, virus, credits, source }) => {
      if (this.motion) this.particles.burst(cell.x, cell.y, virus.color, virus.boss ? 60 : 14, virus.boss ? 4 : 2.2);
      if (credits > 0 && source !== 'purge' && player.settings.damageNumbers) {
        this.popups.show(cell.x, cell.y, `+${fmt(credits)}`, 'credit');
      }
    });

    bus.on('pickupCollected', ({ cell, value }) => {
      this.popups.show(cell.x, cell.y, `+${fmt(value)}`, 'credit');
      if (this.motion) this.particles.burst(cell.x, cell.y, '#3ad7ff', 10, 1.8);
    });

    bus.on('damageBlocked', ({ cell, reason }) => {
      this.popups.show(cell.x, cell.y, reason, 'blocked');
    });

    bus.on('playerHit', ({ cell, heavy }) => {
      if (cell) {
        const view = this.views[cell.index];
        view?.chip.animate(
          [{ boxShadow: '0 0 0 2px var(--red), 0 0 18px var(--red)' }, { boxShadow: '0 0 0 0 transparent' }],
          { duration: heavy ? 500 : 260 },
        );
      }
      if (heavy && this.motion) {
        this.root.animate(
          [
            { transform: 'translate(0,0)' },
            { transform: 'translate(-6px,3px)' },
            { transform: 'translate(5px,-4px)' },
            { transform: 'translate(-3px,2px)' },
            { transform: 'translate(0,0)' },
          ],
          { duration: 280 },
        );
      }
    });

    bus.on('daemonPulse', () => {
      this.daemonEl.animate(
        [{ boxShadow: 'inset 0 0 0 2px var(--green), 0 0 26px var(--green-glow)' }, { boxShadow: 'inset 0 0 0 2px var(--green-dim), 0 0 0 transparent' }],
        { duration: 220 },
      );
    });

    bus.on('waveStarted', () => this.particles.clear());
    bus.on('stateReset', () => this.particles.clear());
  }

  render(dt: number): void {
    const { grid, daemon, combat } = this.game;
    const showDaemon = this.game.phase === 'wave';

    for (const cell of grid.cells) {
      const view = this.views[cell.index]!;
      const v = cell.virus;
      let cls = 'cell';
      let tag = '';
      let badge = '';
      let color = '';
      let hp = -1;

      if (v) {
        color = v.color;
        if (v.disguised) {
          cls += ' is-packet is-trojan';
          tag = '[$]';
        } else if (v.hidden) {
          cls += ' is-virus is-hidden';
          tag = '▒▒▒';
        } else {
          cls += ' is-virus';
          tag = v.tag;
          hp = Math.ceil(v.hpFraction * 100);
          if (v.boss) cls += ' is-boss';
          if (v.generation > 0) cls += ' is-child';
          if (v.encryptedBy !== 0) {
            cls += ' is-encrypted';
            badge = 'ENC';
          }
          if (v.immune !== 'none') {
            cls += ' is-immune';
            badge = v.immune === 'hack' ? '⊘HCK' : v.immune === 'daemon' ? '⊘DMN' : '⊘ALL';
          }
          if (combat.isShielded(cell)) cls += ' is-shielded';
          if (v.trait === 'shield' && v.generation === 0) cls += ' is-shielder';
        }
      } else if (cell.pickup) {
        cls += ' is-packet';
        tag = '[$]';
        color = '#3ad7ff';
        if (cell.pickup.ttl < 2) cls += ' is-expiring';
      }

      if (this.cache.changed(view.root, 'class', cls)) view.root.className = cls;
      if (this.cache.changed(view.tag, 'text', tag)) view.tag.textContent = tag;
      if (this.cache.changed(view.badge, 'text', badge)) view.badge.textContent = badge;
      if (color) this.cache.style(view.root, '--c', color);
      if (this.cache.changed(view.hpFill, 'hp', hp)) {
        view.hpFill.style.transform = `scaleX(${Math.max(0, hp) / 100})`;
        view.root.classList.toggle('has-hp', hp >= 0 && hp < 100);
      }
    }

    // Daemon zone
    const unit = 100 / grid.width;
    this.cache.style(this.daemonEl, 'display', showDaemon ? 'block' : 'none');
    this.cache.style(this.daemonEl, 'left', `${daemon.x * unit}%`);
    this.cache.style(this.daemonEl, 'top', `${daemon.y * unit}%`);
    this.cache.style(this.daemonEl, 'width', `${daemon.size * unit}%`);
    this.cache.style(this.daemonEl, 'height', `${daemon.size * unit}%`);

    // Hack cursor + focus meter
    const { hack } = this.game;
    this.cache.style(this.cursorEl, 'display', showDaemon ? 'block' : 'none');
    this.cache.style(this.cursorEl, 'left', `${hack.x * unit}%`);
    this.cache.style(this.cursorEl, 'top', `${hack.y * unit}%`);
    this.cache.style(this.cursorEl, 'width', `${unit}%`);
    this.cache.style(this.cursorEl, 'height', `${unit}%`);
    const cursorCls = `cursor${hack.holding ? ' is-hacking' : ''}${hack.focusFraction >= 1 ? ' is-focused' : ''}`;
    if (this.cache.changed(this.cursorEl, 'class', cursorCls)) this.cursorEl.className = cursorCls;
    this.cache.style(this.cursorFocus, 'transform', `scaleX(${hack.focusFraction.toFixed(2)})`);

    this.particles.update(dt);
  }
}
