import {
  AUTO_START_DELAY,
  FINAL_LEVEL,
  GRID_H,
  GRID_W,
  isBossLevel,
  rootKeysFor,
  waveClearBonus,
} from '../data/balance';
import { MODIFIER_CHANCE, MODIFIERS, type ModifierDef } from '../data/modifiers';
import { MODULE_BY_ID, UPGRADE_MAX_BONUS, type ModuleDef } from '../data/modules';
import { UPGRADE_BY_ID, upgradeCost, type UpgradeDef } from '../data/upgrades';
import { VIRUS_BY_ID } from '../data/viruses';
import type { Virus } from '../entities/Virus';
import { AbilitySystem } from '../system/AbilitySystem';
import { AchievementSystem } from '../system/AchievementSystem';
import { AutomationSystem } from '../system/AutomationSystem';
import { BossSystem } from '../system/BossSystem';
import { CombatSystem } from '../system/CombatSystem';
import { DaemonSystem } from '../system/DaemonSystem';
import { HackSystem } from '../system/HackSystem';
import { PickupSystem } from '../system/PickupSystem';
import { VirusBehaviorSystem } from '../system/VirusBehaviorSystem';
import { WaveSystem } from '../system/WaveSystem';
import { chance, pick } from '../utils/random';
import type { Cell } from './Cell';
import { EventBus } from './EventBus';
import type { LogKind } from './GameEvents';
import { Grid } from './Grid';
import { PlayerState } from './PlayerState';
import { SaveManager } from './SaveManager';

export type Phase = 'intermission' | 'wave' | 'victory';
export type WaveResult = 'none' | 'cleared' | 'failed';

const AUTOSAVE_EVERY = 10;

/**
 * Orchestrator: owns the state and the systems, runs the phase machine and
 * exposes player actions. Contains no DOM code — the UI reads state each frame
 * and listens to `bus` for discrete events. `update(dt)` is driven by a fixed
 * timestep loop in main.ts (or by the headless sim).
 */
export class Game {
  readonly bus = new EventBus();
  readonly grid = new Grid(GRID_W, GRID_H);
  readonly player = new PlayerState();
  readonly storage = new SaveManager();

  readonly combat = new CombatSystem(this);
  readonly waves = new WaveSystem(this);
  readonly viruses = new VirusBehaviorSystem(this);
  readonly bosses = new BossSystem(this);
  readonly daemon = new DaemonSystem(this);
  readonly hack = new HackSystem(this);
  readonly abilities = new AbilitySystem(this);
  readonly pickups = new PickupSystem(this);
  readonly achievements = new AchievementSystem(this);
  readonly automation = new AutomationSystem(this);

  phase: Phase = 'intermission';
  paused = false;
  lastResult: WaveResult = 'none';
  autoStartTimer = AUTO_START_DELAY;
  /** Modifier rolled for the next wave; applies only if the chosen level is eligible. */
  nextModifier?: ModifierDef = undefined;
  /** Integrity lost during the current wave (for the flawless achievement). */
  private damageTaken = 0;
  private saveTimer = 0;
  /** Disable persistence (headless sim). */
  persist = true;

  // ── Loop ─────────────────────────────────────────────────

  update(dt: number): void {
    if (this.paused) return;
    const { player } = this;
    player.stats.playTime += dt;
    this.abilities.update(dt);
    this.achievements.update(dt);
    this.automation.update(dt);

    if (this.phase === 'wave') {
      player.tickBuffs(dt);
      player.hp = Math.min(player.maxHp, player.hp + player.regenPerSecond * dt);
      this.waves.update(dt);
      this.bosses.update(dt);
      this.viruses.update(dt);
      this.daemon.update(dt);
      this.hack.update(dt);
      this.pickups.update(dt);

      if (player.hp <= 0) this.failWave();
      else if (this.waves.isCleared()) this.clearWave();
    } else if (this.phase === 'intermission' && player.settings.autoStart) {
      this.autoStartTimer -= dt;
      if (this.autoStartTimer <= 0) this.startWave();
    }

    this.saveTimer += dt;
    if (this.saveTimer >= AUTOSAVE_EVERY) this.save();
  }

  // ── Phase transitions ────────────────────────────────────

  startWave(): void {
    if (this.phase !== 'intermission') return;
    const level = this.player.level;
    this.resetBoard();
    this.player.restoreHp();
    this.damageTaken = 0;
    this.phase = 'wave';
    this.paused = false;
    this.log(`Wave ${level} deployed. Scanning for threats...`, 'system');
    this.bus.emit('waveStarted', { level, boss: isBossLevel(level) });
    const modifier = WaveSystem.eligible(level) ? this.nextModifier : undefined;
    this.nextModifier = undefined;
    if (modifier) this.log(`WAVE MODIFIER: ${modifier.name}. ${modifier.description} (credits ×${modifier.reward})`, 'warn');
    this.waves.begin(level, modifier);
  }

  private clearWave(): void {
    const { player } = this;
    const level = this.waves.level;
    const bonus = waveClearBonus(level) * player.creditMult * this.waves.rewardMult;
    if (this.waves.modifier) player.stats.modifiedWaves++;
    player.addCredits(bonus);
    if (this.damageTaken === 0 && level >= 3) player.stats.flawlessWaves++;
    if (level >= player.highestLevel) player.highestLevel = level + 1;
    player.runBest = Math.max(player.runBest, level);
    player.level = Math.min(level + 1, player.highestLevel);

    this.resetBoard();
    this.lastResult = 'cleared';
    this.autoStartTimer = AUTO_START_DELAY;
    this.rollModifier();
    this.bus.emit('waveCleared', { level, bonus });
    this.log(`Wave ${level} cleared. System stable.`, 'good');

    if (level === FINAL_LEVEL && !player.victory) {
      player.victory = true;
      this.phase = 'victory';
      this.bus.emit('victory', undefined);
      this.log('SYSTEM SECURED. The Zero-Day has been patched.', 'good');
    } else {
      this.phase = 'intermission';
    }
    this.achievements.check();
    this.save();
  }

  private failWave(): void {
    const level = this.waves.level;
    this.player.hp = 0;
    this.resetBoard();
    this.phase = 'intermission';
    this.lastResult = 'failed';
    this.autoStartTimer = AUTO_START_DELAY * 2;
    this.rollModifier();
    this.bus.emit('waveFailed', { level });
    this.log(`SYSTEM BREACHED on wave ${level}. Upgrade and redeploy.`, 'alert');
    this.save();
  }

  /** Abort the current wave (counts as a failure, keeps credits). */
  abortWave(): void {
    if (this.phase === 'wave') this.failWave();
  }

  /** Roll a modifier for the next wave (level-agnostic; eligibility is checked on deploy). */
  rollModifier(): void {
    this.nextModifier = chance(MODIFIER_CHANCE) ? pick(MODIFIERS) : undefined;
  }

  continueAfterVictory(): void {
    if (this.phase === 'victory') this.phase = 'intermission';
  }

  togglePause(): void {
    if (this.phase !== 'wave') return;
    this.paused = !this.paused;
    if (this.paused) this.hack.setHolding(false);
  }

  selectLevel(level: number): void {
    if (this.phase !== 'intermission') return;
    this.player.level = Math.max(1, Math.min(this.player.highestLevel, level));
  }

  private resetBoard(): void {
    this.grid.clear();
    this.bosses.clear();
    this.waves.end();
    this.abilities.reset();
    this.player.clearBuffs();
    this.daemon.reset();
    this.hack.reset();
  }

  // ── Player actions ───────────────────────────────────────

  /** Start/stop hacking the cursor cell (Space or a held mouse button). */
  setHolding(on: boolean): void {
    this.hack.setHolding(on && this.phase === 'wave' && !this.paused);
  }

  moveCursor(dx: number, dy: number): void {
    if (this.phase !== 'wave' || this.paused) return;
    this.hack.moveCursor(dx, dy);
  }

  setCursor(cell: Cell): void {
    if (this.phase !== 'wave' || this.paused) return;
    this.hack.setCursor(cell);
  }

  cycleTarget(direction: 1 | -1): void {
    if (this.phase !== 'wave' || this.paused) return;
    this.hack.cycle(direction);
  }

  daemonToCursor(): void {
    if (this.phase !== 'wave' || this.paused) return;
    this.daemon.centerOn(this.hack.cell);
  }

  moveDaemon(dx: number, dy: number): void {
    if (this.phase !== 'wave' || this.paused) return;
    this.daemon.move(dx, dy);
  }

  placeDaemon(cell: Cell): void {
    if (this.phase !== 'wave' || this.paused) return;
    this.daemon.centerOn(cell);
  }

  useAbility(id: string): boolean {
    return this.abilities.use(id);
  }

  // ── Shop ─────────────────────────────────────────────────

  upgradeLocked(def: UpgradeDef): string | undefined {
    const { player } = this;
    if (def.requiresLevel !== undefined && player.highestLevel < def.requiresLevel) {
      return `Reach level ${def.requiresLevel}`;
    }
    for (const req of def.requires ?? []) {
      if (player.lvl(req.id) < req.level) {
        return `${UPGRADE_BY_ID.get(req.id)?.name ?? req.id} Lv ${req.level}`;
      }
    }
    return undefined;
  }

  /** Max level including Kernel Module bonuses (undefined = uncapped). */
  upgradeMax(def: UpgradeDef): number | undefined {
    if (def.max === undefined) return undefined;
    const bonusModule = UPGRADE_MAX_BONUS[def.id];
    return def.max + (bonusModule ? this.player.mod(bonusModule) : 0);
  }

  upgradeMaxed(def: UpgradeDef): boolean {
    const max = this.upgradeMax(def);
    return max !== undefined && this.player.lvl(def.id) >= max;
  }

  /** Cost and number of levels a purchase would buy (honoring buy-max mode). */
  quote(def: UpgradeDef): { cost: number; count: number } {
    const { player } = this;
    const start = player.lvl(def.id);
    const first = upgradeCost(def, start);
    if (!player.settings.buyMax) return { cost: first, count: 1 };
    const max = this.upgradeMax(def);
    let cost = 0;
    let count = 0;
    while (count < 500) {
      const level = start + count;
      if (max !== undefined && level >= max) break;
      const next = upgradeCost(def, level);
      if (cost + next > player.credits) break;
      cost += next;
      count++;
    }
    return count === 0 ? { cost: first, count: 1 } : { cost, count };
  }

  buy(id: string): boolean {
    const def = UPGRADE_BY_ID.get(id);
    if (!def || this.upgradeLocked(def) || this.upgradeMaxed(def)) return false;
    const { cost, count } = this.quote(def);
    if (!this.player.spend(cost)) return false;

    const hpFraction = this.player.hp / this.player.maxHp;
    const level = this.player.lvl(id) + count;
    this.player.upgrades.set(id, level);
    // Keep the integrity fraction when max HP grows mid-wave
    this.player.hp = hpFraction * this.player.maxHp;
    this.bus.emit('purchased', { id, level });
    return true;
  }

  // ── Prestige ─────────────────────────────────────────────

  /** Keys are earned only for levels actually cleared this run (Fast Boot levels don't count). */
  get prestigeGain(): number {
    return rootKeysFor(this.player.runBest);
  }

  // ── Kernel Modules (root-key meta tree) ──────────────────

  /** Key cost of the next module level, or undefined when maxed. */
  moduleCost(def: ModuleDef): number | undefined {
    return def.costs[this.player.mod(def.id)];
  }

  buyModule(id: string): boolean {
    const def = MODULE_BY_ID.get(id);
    if (!def) return false;
    const cost = this.moduleCost(def);
    if (cost === undefined || this.player.rootKeys < cost) return false;
    this.player.rootKeys -= cost;
    const level = this.player.mod(id) + 1;
    this.player.modules.set(id, level);
    this.bus.emit('purchased', { id, level });
    this.log(`Kernel module loaded: ${def.name} Lv ${level}${def.runStart ? ' (applies next run)' : ''}.`, 'system');
    this.save();
    return true;
  }

  prestige(): boolean {
    const gain = this.prestigeGain;
    if (gain <= 0 || this.phase === 'wave') return false;
    this.player.prestige(gain);
    this.resetBoard();
    this.phase = 'intermission';
    this.lastResult = 'none';
    this.rollModifier();
    this.bus.emit('prestige', { keys: gain });
    this.bus.emit('stateReset', undefined);
    this.log(`OS reinstalled. +${gain} root keys. Fresh system, stronger admin.`, 'system');
    this.achievements.check();
    this.save();
    return true;
  }

  // ── Spawning & damage helpers used by systems ────────────

  spawnVirus(cell: Cell, virus: Virus): void {
    cell.pickup = undefined;
    cell.virus = virus;
    this.waves.applyModifier(virus);
    if (!this.player.seen.has(virus.kind) && VIRUS_BY_ID.has(virus.kind)) {
      this.player.seen.add(virus.kind);
      if (!virus.disguised) this.log(`NEW THREAT: ${virus.name}. See Threat DB.`, 'warn');
    }
    if (virus.boss) this.player.seen.add(virus.kind);
    this.bus.emit('virusSpawned', { cell, virus });
  }

  hurtPlayer(amount: number, cell?: Cell, heavy = false): void {
    if (amount <= 0 || this.phase !== 'wave') return;
    this.player.hp -= amount;
    this.damageTaken += amount;
    this.bus.emit('playerHit', { amount, cell, heavy });
  }

  log(text: string, kind: LogKind = 'info'): void {
    this.bus.emit('log', { text, kind });
  }

  // ── Persistence ──────────────────────────────────────────

  save(): void {
    this.saveTimer = 0;
    if (this.persist) this.storage.write(this.player.toSave());
  }

  /** Load from storage (or a decoded import). Returns false if the data is unusable. */
  load(raw: unknown = this.storage.read()): boolean {
    if (!this.player.fromSave(raw)) return false;
    this.resetBoard();
    this.phase = 'intermission';
    this.lastResult = 'none';
    this.rollModifier();
    this.autoStartTimer = AUTO_START_DELAY;
    this.bus.emit('stateReset', undefined);
    return true;
  }

  hardReset(): void {
    this.storage.clear();
    this.player.reset();
    this.resetBoard();
    this.phase = 'intermission';
    this.lastResult = 'none';
    this.rollModifier();
    this.bus.emit('stateReset', undefined);
    this.log('All data wiped. Fresh install.', 'system');
  }
}
