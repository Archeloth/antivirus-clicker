/**
 * Headless balance simulation: a scripted bot plays the real game logic.
 * Usage: npm run sim [-- --cps 6 --hours 3 --until 30]
 *
 * The bot clicks at a fixed rate, steers the daemon toward the biggest threat,
 * fires abilities when they are ready and greedily buys the cheapest upgrade.
 * It is a rough stand-in for a competent-but-not-perfect player.
 */
import { Game } from '../src/core/Game';
import type { Cell } from '../src/core/Cell';
import { STEP } from '../src/data/balance';
import { UPGRADES } from '../src/data/upgrades';
import { fmt } from '../src/utils/format';

const args = process.argv.slice(2);
const arg = (name: string, fallback: number): number => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : fallback;
};

const CLICKS_PER_SECOND = arg('cps', 6);
const MAX_HOURS = arg('hours', 3);
const UNTIL_LEVEL = arg('until', 30);

const game = new Game();
game.persist = false;

interface Row {
  level: number;
  attempts: number;
  seconds: number;
  hpLeft: number;
  credits: number;
  click: number;
  daemon: number;
  at: number;
}
const rows = new Map<number, Row>();
const prestiges: string[] = [];
let failStreak = 0;
let lastProgressAt = 0;
let lastHighest = 1;
let waveTime = 0;

game.bus.on('waveFailed', ({ level }) => {
  const row = rows.get(level);
  if (row) row.attempts++;
  else rows.set(level, blankRow(level, 1));
  failStreak++;
});
game.bus.on('waveCleared', ({ level }) => {
  const prev = rows.get(level);
  if (!prev || prev.seconds === 0) {
    rows.set(level, {
      level,
      attempts: (prev?.attempts ?? 0) + 1,
      seconds: waveTime,
      hpLeft: game.player.hp / game.player.maxHp,
      credits: game.player.credits,
      click: game.player.clickDamage,
      daemon: game.player.daemonDamage,
      at: game.player.stats.playTime,
    });
  }
  failStreak = 0;
});

function blankRow(level: number, attempts: number): Row {
  return { level, attempts, seconds: 0, hpLeft: 0, credits: 0, click: 0, daemon: 0, at: 0 };
}

function bestClickTarget(): Cell | undefined {
  let best: Cell | undefined;
  let bestScore = -Infinity;
  for (const cell of game.grid.cells) {
    if (cell.pickup) return cell;
    const v = cell.virus;
    if (!v) continue;
    if (v.disguised) return cell;
    if (v.hidden || v.immune === 'all' || v.immune === 'click') continue;
    // Prefer priority traits, then lowest HP (finish kills)
    let score = -v.hp / v.maxHp;
    if (v.trait === 'heal' || v.trait === 'shield' || v.trait === 'encrypt') score += 2;
    if (v.encryptedBy) score += 1;
    if (v.kind === 'node') score += 3;
    if (v.boss) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = cell;
    }
  }
  return best;
}

function steerDaemon(): void {
  // Hidden boss: sweep to it (a human sees the glitch)
  const boss = game.bosses.boss;
  if (boss) {
    const cell = game.grid.findVirusCell(boss.id);
    if (cell && (boss.hidden || boss.immune === 'click')) {
      game.daemon.centerOn(cell);
      return;
    }
  }
  if (game.player.heuristicInterval > 0) return;
  let best: Cell | undefined;
  let bestHp = 0;
  for (const cell of game.grid.cells) {
    const v = cell.virus;
    if (v && !v.disguised && v.encryptedBy === 0 && v.immune !== 'all' && v.hp > bestHp) {
      bestHp = v.hp;
      best = cell;
    }
  }
  if (best) game.daemon.centerOn(best);
}

const PRIORITY: Record<string, number> = {
  emp: 0.5, 'logic-bomb': 0.5, overdrive: 0.5, firewall: 0.6, miner: 0.6,
  wan: 0.6, heuristic: 0.8, root: 0.7, kernel: 0.9, mining: 1.1, sniffer: 1.5,
};

function shop(): void {
  for (let guard = 0; guard < 50; guard++) {
    let best: { id: string; score: number } | undefined;
    for (const def of UPGRADES) {
      if (game.upgradeLocked(def) || game.upgradeMaxed(def)) continue;
      const { cost } = game.quote(def);
      if (cost > game.player.credits) continue;
      const score = cost * (PRIORITY[def.id] ?? 1);
      if (!best || score < best.score) best = { id: def.id, score };
    }
    if (!best || !game.buy(best.id)) return;
  }
}

const clickEvery = Math.max(1, Math.round(1 / (CLICKS_PER_SECOND * STEP)));
const maxSteps = MAX_HOURS * 3600 / STEP;
let step = 0;

while (step < maxSteps && game.player.highestLevel <= UNTIL_LEVEL) {
  step++;
  if (game.phase === 'victory') game.continueAfterVictory();

  if (game.phase === 'intermission') {
    shop();
    // Stuck: prestige if worthwhile, otherwise farm one level lower
    if (game.player.highestLevel > lastHighest) {
      lastHighest = game.player.highestLevel;
      lastProgressAt = game.player.stats.playTime;
    }
    const stalled = game.player.stats.playTime - lastProgressAt > 8 * 60;
    if (stalled && game.prestigeGain > 0) {
      lastHighest = 1;
      lastProgressAt = game.player.stats.playTime;
      prestiges.push(`prestige at L${game.player.highestLevel} +${game.prestigeGain} keys (t=${(game.player.stats.playTime / 60).toFixed(0)}m)`);
      game.prestige();
      failStreak = 0;
    } else if (failStreak >= 3 && game.player.level > 1) {
      game.selectLevel(game.player.level - 1);
      failStreak = 2;
    } else {
      game.selectLevel(game.player.highestLevel);
    }
    waveTime = 0;
    game.startWave();
  }

  waveTime += STEP;
  if (step % clickEvery === 0) {
    const target = bestClickTarget();
    if (target) game.clickCell(target);
  }
  if (step % 60 === 0) {
    steerDaemon();
    const threats = game.grid.countViruses();
    for (const ability of game.abilities.abilities) {
      if (threats >= 4 || game.bosses.active) game.useAbility(ability.id);
    }
  }
  if (step % 120 === 0) shop();
  game.update(STEP);
}

console.log(`cps=${CLICKS_PER_SECOND}  simulated ${(game.player.stats.playTime / 60).toFixed(1)} min`);
console.log('lvl  tries  wave_s  hp_left   credits    click    daemon   t_min');
for (const row of [...rows.values()].sort((a, b) => a.level - b.level)) {
  console.log(
    [
      String(row.level).padStart(3),
      String(row.attempts).padStart(6),
      row.seconds.toFixed(0).padStart(7),
      `${Math.round(row.hpLeft * 100)}%`.padStart(8),
      fmt(row.credits).padStart(9),
      fmt(row.click).padStart(8),
      fmt(row.daemon).padStart(9),
      (row.at / 60).toFixed(1).padStart(7),
    ].join(' '),
  );
}
for (const p of prestiges) console.log(p);
const p = game.player;
console.log(`highest=${p.highestLevel} keys=${p.rootKeys} kills=${p.stats.kills} achievements=${p.achievements.size}`);
console.log('upgrades:', JSON.stringify(Object.fromEntries(p.upgrades)));
