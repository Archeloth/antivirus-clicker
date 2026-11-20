/**
 * Headless balance simulation: a scripted bot plays the real game logic.
 * Usage: npm run sim [-- --react 0.5 --hours 3 --until 30]
 *
 * The bot holds hack (like holding Space), retargets the cursor after
 * `--react` seconds once its target is gone, steers the daemon toward the
 * biggest threat, fires abilities when ready and greedily buys upgrades.
 * Damage no longer depends on click speed, so reaction time is the skill knob.
 */
import { Game } from '../src/core/Game';
import type { Cell } from '../src/core/Cell';
import { STEP } from '../src/data/balance';
import { isHackable } from '../src/system/HackSystem';
import { MODULES } from '../src/data/modules';
import { UPGRADES } from '../src/data/upgrades';
import { fmt } from '../src/utils/format';

const args = process.argv.slice(2);
const arg = (name: string, fallback: number): number => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : fallback;
};

const REACT_SECONDS = arg('react', 0.5);
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
  hack: number;
  daemon: number;
  at: number;
}
const rows = new Map<number, Row>();
const prestiges: string[] = [];
let failStreak = 0;
let lastProgressAt = 0;
let lastHighest = 1;
let waveTime = 0;

/** Modifier of the wave in progress, and clear/fail counts per modifier. */
let currentMod = '';
const modStats = new Map<string, { cleared: number; failed: number }>();
function countMod(result: 'cleared' | 'failed'): void {
  if (!currentMod) return;
  const entry = modStats.get(currentMod) ?? { cleared: 0, failed: 0 };
  entry[result]++;
  modStats.set(currentMod, entry);
}
game.bus.on('waveFailed', () => countMod('failed'));
game.bus.on('waveCleared', () => countMod('cleared'));

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
      hack: game.player.hackDamage,
      daemon: game.player.daemonDamage,
      at: game.player.stats.playTime,
    });
  }
  failStreak = 0;
});

function blankRow(level: number, attempts: number): Row {
  return { level, attempts, seconds: 0, hpLeft: 0, credits: 0, hack: 0, daemon: 0, at: 0 };
}

/** Human-ish retargeting: once the cursor cell is no longer worth hacking, wait, then Tab to the best one. */
let retargetIn = 0;
function steerCursor(dt: number): void {
  if (isHackable(game.hack.cell)) {
    retargetIn = REACT_SECONDS;
    return;
  }
  retargetIn -= dt;
  if (retargetIn > 0) return;
  const next = game.hack.bestTarget();
  if (next) game.setCursor(next);
  retargetIn = REACT_SECONDS;
}

function steerDaemon(): void {
  // Hidden boss: sweep to it (a human sees the glitch)
  const boss = game.bosses.boss;
  if (boss) {
    const cell = game.grid.findVirusCell(boss.id);
    if (cell && (boss.hidden || boss.immune === 'hack')) {
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
  'target-lock': 0.3, 'macro-keys': 0.9, wan: 0.6, heuristic: 0.8, root: 0.7, kernel: 0.9, mining: 1.1, sniffer: 1.5,
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

/** Spend root keys on the cheapest Kernel Module levels (weighted toward run-start boosts). */
const MODULE_PRIORITY: Record<string, number> = { toolkit: 0.5, funds: 0.6, fastboot: 0.7, hotkeys: 0.8, pkgmgr: 0.8 };
function buyModules(): void {
  for (let guard = 0; guard < 50; guard++) {
    let best: { id: string; score: number } | undefined;
    for (const def of MODULES) {
      const cost = game.moduleCost(def);
      if (cost === undefined || cost > game.player.rootKeys) continue;
      const score = cost * (MODULE_PRIORITY[def.id] ?? 1);
      if (!best || score < best.score) best = { id: def.id, score };
    }
    if (!best || !game.buyModule(best.id)) return;
  }
}

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
      buyModules(); // run-start modules must be owned before reinstalling
      game.prestige();
      buyModules();
      prestiges.push(`  modules: ${JSON.stringify(Object.fromEntries(game.player.modules))} · keys left ${game.player.rootKeys}`);
      failStreak = 0;
    } else if (failStreak >= 3 && game.player.level > 1) {
      game.selectLevel(game.player.level - 1);
      failStreak = 2;
    } else {
      game.selectLevel(game.player.highestLevel);
    }
    waveTime = 0;
    game.startWave();
    currentMod = game.waves.modifier?.id ?? '';
  }

  waveTime += STEP;
  steerCursor(STEP);
  game.setHolding(true);
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

console.log(`react=${REACT_SECONDS}s  simulated ${(game.player.stats.playTime / 60).toFixed(1)} min`);
console.log('lvl  tries  wave_s  hp_left   credits     hack    daemon   t_min');
for (const row of [...rows.values()].sort((a, b) => a.level - b.level)) {
  console.log(
    [
      String(row.level).padStart(3),
      String(row.attempts).padStart(6),
      row.seconds.toFixed(0).padStart(7),
      `${Math.round(row.hpLeft * 100)}%`.padStart(8),
      fmt(row.credits).padStart(9),
      fmt(row.hack).padStart(8),
      fmt(row.daemon).padStart(9),
      (row.at / 60).toFixed(1).padStart(7),
    ].join(' '),
  );
}
for (const p of prestiges) console.log(p);
console.log('modifiers (cleared/failed):', [...modStats].map(([id, m]) => `${id} ${m.cleared}/${m.failed}`).join(', ') || 'none');
const p = game.player;
console.log(`highest=${p.highestLevel} keys=${p.rootKeys} kills=${p.stats.kills} achievements=${p.achievements.size}`);
console.log('upgrades:', JSON.stringify(Object.fromEntries(p.upgrades)));
