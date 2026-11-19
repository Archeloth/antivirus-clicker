import type { Game } from '../core/Game';
import { h } from './dom';

const MAX_LINES = 80;

/** Terminal-style event log under the grid. */
export class LogPanel {
  readonly root: HTMLDivElement;

  constructor(private readonly game: Game) {
    this.root = h('div', { class: 'log', role: 'log', 'aria-live': 'polite' });
    game.bus.on('log', ({ text, kind }) => this.add(text, kind));
    this.add('antivirus.exe v2.0 booted. Awaiting deployment.', 'system');
  }

  private add(text: string, kind: string): void {
    const atBottom = this.root.scrollHeight - this.root.scrollTop - this.root.clientHeight < 24;
    const t = Math.floor(this.game.player.stats.playTime);
    const stamp = `${String(Math.floor(t / 60) % 100).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
    const prefix = kind === 'alert' ? 'CRIT' : kind === 'warn' ? 'WARN' : kind === 'good' ? ' OK ' : kind === 'system' ? 'SYS ' : 'INFO';
    this.root.append(
      h('div', { class: `log-line log-line--${kind}` }, h('span', { class: 'log-stamp', text: `[${stamp}] ${prefix}` }), ` ${text}`),
    );
    while (this.root.childElementCount > MAX_LINES) this.root.firstElementChild?.remove();
    if (atBottom) this.root.scrollTop = this.root.scrollHeight;
  }
}
