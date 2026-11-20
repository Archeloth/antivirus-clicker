import type { Game } from '../core/Game';
import { SaveManager } from '../core/SaveManager';
import { ACHIEVEMENTS } from '../data/achievements';
import { PRESTIGE_UNLOCK, ROOT_KEY_BONUS } from '../data/balance';
import { fmt, fmtDuration } from '../utils/format';
import { h, setText } from './dom';

/** Prestige, settings, save management, stats and achievements. */
export class SystemTab {
  readonly root: HTMLDivElement;
  private readonly prestigeInfo = h('div', { class: 'prestige-info' });
  private readonly prestigeButton = h('button', { class: 'btn btn--primary', type: 'button' });
  private readonly statsEl = h('dl', { class: 'stat-list' });
  private readonly achievementsEl = h('div', { class: 'achievements' });
  private readonly saveStatus = h('span', { class: 'save-status' });
  private readonly transfer = h('textarea', { class: 'save-transfer', rows: 3, placeholder: 'Exported save appears here. Paste a save string to import.', spellcheck: 'false' });
  private achievementKey = -1;
  private statsTimer = 0;

  constructor(private readonly game: Game) {
    this.prestigeButton.addEventListener('click', () => {
      const gain = game.prestigeGain;
      if (gain <= 0) return;
      const ok = window.confirm(
        `Reinstall OS?\n\nYou gain ${fmt(gain)} root keys (+${Math.round(gain * ROOT_KEY_BONUS * 100)}% damage & credits).\nLevel, credits and upgrades reset. Root keys, achievements and stats are kept.`,
      );
      if (ok) game.prestige();
    });

    this.root = h(
      'div',
      { class: 'system' },
      h('div', { class: 'shop-category', text: 'REINSTALL OS // prestige' }),
      h('p', { class: 'muted', text: `Wipe the run to earn root keys. Each key permanently grants +${ROOT_KEY_BONUS * 100}% damage and credits. Keys grow exponentially with the highest level cleared (min. ${PRESTIGE_UNLOCK}).` }),
      this.prestigeInfo,
      this.prestigeButton,
      h('div', { class: 'shop-category', text: 'SETTINGS' }),
      this.settings(),
      h('div', { class: 'shop-category', text: 'SAVE DATA' }),
      this.saveControls(),
      h('div', { class: 'shop-category', text: 'STATISTICS' }),
      this.statsEl,
      h('div', { class: 'shop-category', text: 'ACHIEVEMENTS' }),
      this.achievementsEl,
    );

    game.bus.on('waveCleared', () => this.markSaved());
    game.bus.on('waveFailed', () => this.markSaved());
  }

  private settings(): HTMLElement {
    const s = () => this.game.player.settings;
    const toggle = (label: string, get: () => boolean, set: (v: boolean) => void) => {
      const input = h('input', { type: 'checkbox' });
      input.checked = get();
      input.addEventListener('change', () => {
        set(input.checked);
        this.game.save();
      });
      this.game.bus.on('stateReset', () => (input.checked = get()));
      return h('label', { class: 'setting' }, input, h('span', { text: label }));
    };
    const volume = h('input', { type: 'range', min: 0, max: 1, step: 0.05 });
    volume.value = String(s().volume);
    volume.addEventListener('input', () => (s().volume = Number(volume.value)));
    volume.addEventListener('change', () => this.game.save());
    this.game.bus.on('stateReset', () => (volume.value = String(s().volume)));

    return h(
      'div',
      { class: 'settings' },
      h('label', { class: 'setting' }, h('span', { text: 'Volume' }), volume),
      toggle('Mute sound', () => s().muted, (v) => (s().muted = v)),
      toggle('Damage numbers', () => s().damageNumbers, (v) => (s().damageNumbers = v)),
      toggle('Reduced motion', () => s().reducedMotion, (v) => (s().reducedMotion = v)),
      toggle('Auto-deploy next wave', () => s().autoStart, (v) => (s().autoStart = v)),
      toggle('Package Manager auto-buy (Kernel module)', () => s().autoBuy, (v) => (s().autoBuy = v)),
    );
  }

  private saveControls(): HTMLElement {
    const btn = (label: string, fn: () => void, danger = false) => {
      const el = h('button', { class: danger ? 'btn btn--danger' : 'btn', type: 'button', text: label });
      el.addEventListener('click', fn);
      return el;
    };
    return h(
      'div',
      { class: 'save-controls' },
      h(
        'div',
        { class: 'btn-row' },
        btn('Save now', () => {
          this.game.save();
          this.markSaved();
        }),
        btn('Export', () => {
          this.transfer.value = SaveManager.encode(this.game.player.toSave());
          this.transfer.select();
          void navigator.clipboard?.writeText(this.transfer.value).catch(() => undefined);
          setText(this.saveStatus, 'Exported (copied to clipboard).');
        }),
        btn('Import', () => {
          const data = SaveManager.decode(this.transfer.value);
          if (data && this.game.load(data)) {
            this.game.save();
            setText(this.saveStatus, 'Save imported.');
          } else {
            setText(this.saveStatus, 'Invalid save string.');
          }
        }),
        btn(
          'Hard reset',
          () => {
            if (window.confirm('Delete ALL progress, including root keys and achievements?')) this.game.hardReset();
          },
          true,
        ),
      ),
      this.transfer,
      this.saveStatus,
    );
  }

  private markSaved(): void {
    setText(this.saveStatus, `Saved at ${new Date().toLocaleTimeString()}.`);
  }

  render(dt: number): void {
    const { game } = this;
    const { player } = game;
    const gain = game.prestigeGain;
    setText(
      this.prestigeInfo,
      `Root keys: ${fmt(player.rootKeys)} to spend · ${fmt(player.rootKeysTotal)} earned (×${player.keyMult.toFixed(2)})\nReinstall now: +${fmt(gain)} keys (cleared this run: level ${player.runBest})\nSpend keys in the KERNEL tab.`,
    );
    setText(this.prestigeButton, gain > 0 ? `REINSTALL OS (+${fmt(gain)} keys)` : `Clear level ${PRESTIGE_UNLOCK} to unlock`);
    this.prestigeButton.disabled = gain <= 0 || game.phase === 'wave';

    this.statsTimer -= dt;
    if (this.statsTimer <= 0) {
      this.statsTimer = 0.5;
      const st = player.stats;
      const rows: [string, string][] = [
        ['Threats neutralized', fmt(st.kills)],
        ['Hacks', fmt(st.hacks)],
        ['Critical hacks', fmt(st.crits)],
        ['Data packets', fmt(st.packets)],
        ['Bosses defeated', fmt(st.bossesKilled)],
        ['Credits earned', fmt(st.creditsEarned)],
        ['Reinstalls', fmt(st.prestiges)],
        ['Uptime', fmtDuration(st.playTime)],
      ];
      this.statsEl.replaceChildren(...rows.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })]));
    }

    if (this.achievementKey !== player.achievements.size) {
      this.achievementKey = player.achievements.size;
      this.achievementsEl.replaceChildren(
        h('div', { class: 'muted', text: `${player.achievements.size}/${ACHIEVEMENTS.length} unlocked · +2% credits each` }),
        ...ACHIEVEMENTS.map((a) => {
          const done = player.achievements.has(a.id);
          return h(
            'div',
            { class: `achievement${done ? ' is-done' : ''}` },
            h('span', { class: 'achievement-mark', text: done ? '[x]' : '[ ]' }),
            h('div', {}, h('div', { class: 'achievement-name', text: a.name }), h('div', { class: 'achievement-desc', text: a.description })),
          );
        }),
      );
    }
  }
}
