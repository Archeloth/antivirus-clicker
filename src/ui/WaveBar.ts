import type { Game } from '../core/Game';
import { isBossLevel } from '../data/balance';
import { fmt, fmtSeconds } from '../utils/format';
import { DomCache, h, setClass, setText } from './dom';

/** Strip above the grid: wave progress and, during boss fights, the boss bar. */
export class WaveBar {
  readonly root: HTMLDivElement;
  private readonly cache = new DomCache();
  private readonly title = h('span', { class: 'wave-title' });
  private readonly info = h('span', { class: 'wave-info' });
  private readonly progressFill = h('div', { class: 'bar-fill' });
  private readonly boss = h('div', { class: 'boss' });
  private readonly bossName = h('span', { class: 'boss-name' });
  private readonly bossState = h('span', { class: 'boss-state' });
  private readonly bossHpText = h('span', { class: 'boss-hp-text' });
  private readonly bossFill = h('div', { class: 'bar-fill' });

  constructor(private readonly game: Game) {
    this.boss.append(
      h('div', { class: 'boss-head' }, this.bossName, this.bossState, this.bossHpText),
      h('div', { class: 'bar bar--boss' }, this.bossFill),
    );
    this.root = h(
      'div',
      { class: 'wave-bar' },
      h('div', { class: 'wave-head' }, this.title, this.info),
      h('div', { class: 'bar bar--wave' }, this.progressFill),
      this.boss,
    );
  }

  render(): void {
    const { phase, waves, grid, bosses, player } = this.game;
    const inWave = phase === 'wave';
    const level = inWave ? waves.level : player.level;
    const modifier = inWave ? waves.modifier : undefined;
    setText(
      this.title,
      `WAVE ${level}${isBossLevel(level) ? '  ⚠ BOSS' : ''}${modifier ? `  ⚡ ${modifier.name.toUpperCase()} ×${modifier.reward}` : ''}`,
    );

    if (inWave) {
      const active = grid.countViruses();
      setText(this.info, `incoming ${waves.remaining} · active ${active}`);
      const done = waves.total > 0 ? 1 - waves.remaining / waves.total : 1;
      this.cache.style(this.progressFill, 'transform', `scaleX(${done.toFixed(3)})`);
    } else {
      setText(this.info, phase === 'victory' ? 'system secured' : 'standby');
      this.cache.style(this.progressFill, 'transform', 'scaleX(0)');
    }

    const boss = bosses.boss;
    const showBoss = inWave && boss !== undefined && boss.hp > 0;
    setClass(this.boss, 'is-visible', showBoss);
    if (!showBoss || !boss) return;

    setText(this.bossName, boss.name.toUpperCase());
    setText(this.bossHpText, `${fmt(boss.hp)} / ${fmt(boss.maxHp)}`);
    this.cache.style(this.bossFill, 'transform', `scaleX(${boss.hpFraction.toFixed(4)})`);

    let state = '';
    if (boss.hidden) state = 'HIDDEN: sweep with daemon';
    else if (bosses.exposed > 0) state = `CORE EXPOSED ${fmtSeconds(bosses.exposed)}`;
    else if (boss.immune === 'all') state = 'SHIELDED: kill the nodes';
    else if (boss.immune === 'hack') state = 'IMMUNE: hacking';
    else if (boss.immune === 'daemon') state = 'IMMUNE: daemon';
    else if (boss.boss?.behavior === 'rootkit' || (boss.boss?.behavior === 'zeroday' && bosses.phase === 1)) {
      state = 'EXPOSED';
    }
    if (boss.boss?.behavior === 'zeroday') state = `PHASE ${bosses.phase}  ${state}`;
    setText(this.bossState, state);
  }
}
