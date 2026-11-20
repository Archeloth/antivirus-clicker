import type { Game } from '../core/Game';
import { h, setClass, setText } from './dom';
import { GridView } from './GridView';
import { LogPanel } from './LogPanel';
import { Overlay } from './Overlay';
import { Sfx } from './Sfx';
import { ShopTab } from './ShopTab';
import { StatusPanel } from './StatusPanel';
import { SystemTab } from './SystemTab';
import { ThreatTab } from './ThreatTab';
import { Toasts } from './Toasts';
import { WaveBar } from './WaveBar';

type TabId = 'shop' | 'threats' | 'system';

const MOVE_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
};

/**
 * Builds the layout and owns every view. `render(dt)` is called once per
 * animation frame; views read game state and write only DOM diffs.
 */
export class UI {
  private readonly grid: GridView;
  private readonly status: StatusPanel;
  private readonly waveBar: WaveBar;
  private readonly overlay: Overlay;
  private readonly shop: ShopTab;
  private readonly threats: ThreatTab;
  private readonly system: SystemTab;
  private readonly tabButtons = new Map<TabId, HTMLButtonElement>();
  private readonly tabBodies = new Map<TabId, HTMLElement>();
  private readonly phaseLabel = h('span', { class: 'topbar-phase' });
  private readonly pauseButton = h('button', { class: 'btn btn--small', type: 'button' });
  private readonly muteButton = h('button', { class: 'btn btn--small', type: 'button' });
  private activeTab: TabId = 'shop';

  constructor(
    private readonly game: Game,
    root: HTMLElement,
  ) {
    new Sfx(game);
    this.grid = new GridView(game);
    this.status = new StatusPanel(game);
    this.waveBar = new WaveBar(game);
    this.overlay = new Overlay(game, this.grid.overlayHost, () => this.setTab('system'));
    this.shop = new ShopTab(game);
    this.threats = new ThreatTab(game);
    this.system = new SystemTab(game);
    const log = new LogPanel(game);
    const toasts = new Toasts(game);

    this.pauseButton.addEventListener('click', () => game.togglePause());
    this.muteButton.addEventListener('click', () => this.toggleMute());

    const topbar = h(
      'header',
      { class: 'topbar' },
      h('div', { class: 'brand' }, h('span', { class: 'brand-mark', text: '▲' }), 'antivirus', h('span', { class: 'brand-ext', text: '.exe' })),
      this.phaseLabel,
      h('div', { class: 'topbar-actions' }, this.pauseButton, this.muteButton),
    );

    const tabs = h('div', { class: 'tabs', role: 'tablist' });
    const bodies = h('div', { class: 'tab-bodies' });
    for (const [id, label, body] of [
      ['shop', 'UPGRADES', this.shop.root],
      ['threats', 'THREAT DB', this.threats.root],
      ['system', 'SYSTEM', this.system.root],
    ] as const) {
      const button = h('button', { class: 'tab', type: 'button', role: 'tab', text: label });
      button.addEventListener('click', () => this.setTab(id));
      tabs.append(button);
      this.tabButtons.set(id, button);
      const wrapper = h('div', { class: 'tab-body' }, body);
      bodies.append(wrapper);
      this.tabBodies.set(id, wrapper);
    }

    const layout = h(
      'main',
      { class: 'layout' },
      this.status.root,
      h('section', { class: 'center' }, this.waveBar.root, this.grid.root, log.root),
      h('aside', { class: 'panel panel--side' }, tabs, bodies),
    );

    root.replaceChildren(topbar, layout, toasts.root);
    this.setTab('shop');
    this.bindKeys();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) game.setHolding(false);
      if (document.hidden && game.phase === 'wave' && !game.paused) game.togglePause();
      if (document.hidden) game.save();
    });
    window.addEventListener('beforeunload', () => game.save());
  }

  private setTab(id: TabId): void {
    this.activeTab = id;
    for (const [tab, button] of this.tabButtons) {
      setClass(button, 'is-active', tab === id);
      button.setAttribute('aria-selected', String(tab === id));
    }
    for (const [tab, body] of this.tabBodies) body.hidden = tab !== id;
  }

  private toggleMute(): void {
    const s = this.game.player.settings;
    s.muted = !s.muted;
    this.game.save();
  }

  private bindKeys(): void {
    const { game } = this;
    window.addEventListener('keydown', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select')) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      if (key === 'Enter' && game.phase === 'intermission' && !target?.closest('button, [role="button"]')) {
        game.startWave();
        event.preventDefault();
        return;
      }
      if (key === 'p' || key === 'Escape') {
        game.togglePause();
        event.preventDefault();
        return;
      }
      if (key === 'm') {
        this.toggleMute();
        return;
      }
      const inWave = game.phase === 'wave';

      // Hold-to-hack. Key auto-repeat is ignored: holding is what counts, not mashing.
      if (key === ' ') {
        if (inWave) event.preventDefault(); // never "press" a focused button mid-wave
        if (!event.repeat) game.setHolding(true);
        return;
      }
      if (key === 'Tab' && inWave) {
        game.cycleTarget(event.shiftKey ? -1 : 1);
        event.preventDefault();
        return;
      }
      if (key === 'e') {
        game.daemonToCursor();
        return;
      }
      const move = MOVE_KEYS[key];
      if (move) {
        game.moveCursor(move[0], move[1]);
        if (inWave) event.preventDefault();
        return;
      }
      const ability = game.abilities.abilities.find((a) => a.key === key);
      if (ability) {
        game.useAbility(ability.id);
        event.preventDefault();
      }
    });

    window.addEventListener('keyup', (event) => {
      if (event.key === ' ') game.setHolding(false);
    });
    // Never leave hacking stuck on when focus leaves the page.
    window.addEventListener('blur', () => game.setHolding(false));
    game.bus.on('waveStarted', () => {
      // Drop focus from any shop/tab button so Space and arrows go to the game.
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
  }

  render(dt: number): void {
    const { game } = this;
    document.body.classList.toggle('reduced-motion', game.player.settings.reducedMotion);
    setText(
      this.phaseLabel,
      game.paused ? '■ PAUSED' : game.phase === 'wave' ? '● SCANNING' : game.phase === 'victory' ? '★ SECURED' : '○ STANDBY',
    );
    setClass(this.phaseLabel, 'is-live', game.phase === 'wave' && !game.paused);
    setText(this.pauseButton, game.paused ? 'RESUME [P]' : 'PAUSE [P]');
    this.pauseButton.disabled = game.phase !== 'wave';
    setText(this.muteButton, game.player.settings.muted ? 'SOUND OFF [M]' : 'SOUND ON [M]');

    this.waveBar.render();
    this.grid.render(dt);
    this.overlay.render();
    this.status.render();
    if (this.activeTab === 'shop') this.shop.render();
    else if (this.activeTab === 'threats') this.threats.render();
    else this.system.render(dt);
  }
}
