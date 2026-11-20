import type { Game } from '../core/Game';
import { isBossLevel } from '../data/balance';
import { bossForLevel, VIRUSES } from '../data/viruses';
import { WaveSystem } from '../system/WaveSystem';
import { h } from './dom';

/**
 * Modal card drawn over the grid between waves, while paused and on victory.
 * Rebuilt only when its content key changes.
 */
export class Overlay {
  private key = '';

  constructor(
    private readonly game: Game,
    private readonly host: HTMLElement,
    private readonly openSystemTab: () => void,
  ) {}

  render(): void {
    const { game } = this;
    const { phase, paused, player, lastResult } = game;
    const countdown = player.settings.autoStart ? Math.ceil(game.autoStartTimer) : -1;
    const key = `${phase}|${paused}|${player.level}|${player.highestLevel}|${lastResult}|${countdown}|${game.nextModifier?.id}`;
    if (key === this.key) return;
    this.key = key;

    this.host.replaceChildren();
    if (phase === 'wave' && !paused) {
      this.host.className = 'overlay-host';
      return;
    }
    this.host.className = 'overlay-host is-visible';

    if (paused) {
      this.host.append(
        card(
          'PAUSED',
          'Process suspended.',
          button('RESUME  [P]', () => game.togglePause(), true),
          button('ABORT WAVE', () => game.abortWave()),
        ),
      );
      return;
    }

    if (phase === 'victory') {
      this.host.append(
        card(
          'SYSTEM SECURED',
          'The Zero-Day is patched. The network is safe... for now. Threats keep evolving: continue into endless levels, or reinstall the OS to earn root keys and come back stronger.',
          button('CONTINUE (ENDLESS)', () => game.continueAfterVictory(), true),
          button('REINSTALL OS…', () => {
            game.continueAfterVictory();
            this.openSystemTab();
          }),
        ),
      );
      return;
    }

    // Intermission
    const level = player.level;
    const lines: (string | Node)[] = [];
    if (lastResult === 'failed') lines.push(h('div', { class: 'overlay-alert', text: 'SYSTEM BREACHED: buy upgrades, or replay an earlier level to farm credits.' }));
    if (lastResult === 'cleared') lines.push(h('div', { class: 'overlay-good', text: 'Wave cleared. Spend your credits, then deploy.' }));
    if (isBossLevel(level)) {
      const boss = bossForLevel(level);
      lines.push(h('div', { class: 'overlay-boss' }, h('b', { text: `⚠ BOSS: ${boss.name}` }), h('div', { text: boss.description })));
    }
    const modifier = game.nextModifier;
    if (modifier && WaveSystem.eligible(level)) {
      lines.push(
        h(
          'div',
          { class: 'overlay-mod' },
          h('b', { text: `⚡ MODIFIER: ${modifier.name}` }),
          h('span', { class: 'overlay-mod-reward', text: ` credits ×${modifier.reward}` }),
          h('div', { text: modifier.description }),
        ),
      );
    }
    const fresh = VIRUSES.filter((v) => v.minLevel === level && v.weight > 0);
    for (const v of fresh) {
      lines.push(h('div', { class: 'overlay-new' }, h('b', { text: `NEW THREAT: ${v.name}` }), ` ${v.description}`));
    }
    if (level === 1 && player.highestLevel === 1) {
      lines.push(
        h(
          'div',
          { class: 'overlay-tutorial' },
          h('div', { text: '> Move your CURSOR with the arrow keys / WASD, or jump between threats with TAB.' }),
          h('div', { text: '> HOLD SPACE to hack the threat under the cursor. Stay on one target to build focus damage. Mashing does nothing extra.' }),
          h('div', { text: '> Your DAEMON (green zone) damages everything inside it automatically. Press E to send it to your cursor.' }),
          h('div', { text: '> Threats drain your INTEGRITY every second. Clear the wave before it hits zero.' }),
          h('div', { text: '> Hack [$] data packets for bonus credits.' }),
          h('div', { text: '> Prefer the mouse? Hover a cell and hold the button; right-click sends the daemon.' }),
        ),
      );
    }

    const selector = h('div', { class: 'level-select' });
    if (player.highestLevel > 1) {
      selector.append(
        button('◀', () => game.selectLevel(level - 1), false, level <= 1),
        h('span', { text: `LEVEL ${level} / ${player.highestLevel}` }),
        button('▶', () => game.selectLevel(level + 1), false, level >= player.highestLevel),
      );
    }

    const deploy = button(
      countdown >= 0 ? `DEPLOY  [Enter]  (auto ${countdown})` : 'DEPLOY  [Enter]',
      () => game.startWave(),
      true,
    );
    this.host.append(card(`WAVE ${level}`, '', ...lines, selector, deploy));
  }
}

function card(title: string, text: string, ...children: (Node | string)[]): HTMLElement {
  return h(
    'div',
    { class: 'overlay-card' },
    h('div', { class: 'overlay-title', text: title }),
    text ? h('p', { text }) : '',
    ...children,
  );
}

function button(label: string, onClick: () => void, primary = false, disabled = false): HTMLButtonElement {
  const el = h('button', { class: primary ? 'btn btn--primary' : 'btn', type: 'button', text: label, disabled });
  el.addEventListener('click', onClick);
  return el;
}
