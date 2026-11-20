import type { Cell } from '../core/Cell';
import type { Game } from '../core/Game';
import { dpsScale } from '../data/balance';
import { virusDef, type BossDef } from '../data/viruses';
import { createBoss, createVirus, type Virus } from '../entities/Virus';
import { pick } from '../utils/random';

const ROOTKIT_REVEAL = 2.5;
const ROOTKIT_RELOCATE = 7;
const BOTNET_NODES = 4;
const BOTNET_EXPOSE = 12;
const POLY_SWITCH = 6;
const POLY_MINION = 5;

/**
 * Boss encounters. Each boss is a regular Virus with a BossDef; this system
 * runs its attacks and its gimmick every step.
 */
export class BossSystem {
  boss?: Virus;
  /** Zero-Day phase (1-3); other bosses stay at 1. */
  phase = 1;
  private slamTimer = 0;
  private mechTimer = 0;
  private minionTimer = 0;
  /** Seconds the Botnet core remains exposed (0 = shielded by nodes). */
  exposed = 0;

  constructor(private readonly game: Game) {}

  get active(): boolean {
    return this.boss !== undefined && this.boss.hp > 0;
  }

  spawn(def: BossDef, level: number): void {
    const { grid } = this.game;
    const center = grid.get(Math.floor(grid.width / 2) - 1, Math.floor(grid.height / 2) - 1);
    const cell = center?.isEmpty ? center : grid.randomEmpty();
    if (!cell) return;

    const boss = createBoss(def, level);
    this.boss = boss;
    this.phase = 1;
    this.slamTimer = def.slamInterval;
    this.mechTimer = 0;
    this.minionTimer = POLY_MINION;
    this.exposed = 0;
    this.game.spawnVirus(cell, boss);

    if (def.behavior === 'rootkit' || def.behavior === 'zeroday') {
      boss.hidden = true;
      this.mechTimer = ROOTKIT_RELOCATE;
    }
    if (def.behavior === 'botnet') {
      this.spawnNodes(BOTNET_NODES);
      this.exposed = 0;
    }
    if (def.behavior === 'polymorph') {
      boss.immune = 'hack';
      this.mechTimer = POLY_SWITCH;
    }

    this.game.bus.emit('bossSpawned', { name: def.name });
    this.game.log(`BOSS DETECTED: ${def.name}. ${def.description}`, 'alert');
  }

  clear(): void {
    this.boss = undefined;
  }

  update(dt: number): void {
    const boss = this.boss;
    if (!boss || boss.hp <= 0 || !boss.boss) return;
    const cell = this.game.grid.findVirusCell(boss.id);
    if (!cell) return;
    const def = boss.boss;
    const frozen = this.game.player.firewall > 0;

    if (!frozen) {
      boss.attackTimer -= dt;
      if (boss.attackTimer <= 0) {
        boss.attackTimer += 1;
        this.game.hurtPlayer(boss.dps, cell);
      }
      const slamInterval = this.phase === 3 ? def.slamInterval / 2 : def.slamInterval;
      this.slamTimer -= dt;
      if (this.slamTimer <= 0) {
        this.slamTimer += slamInterval;
        const amount = def.slam * dpsScale(this.game.waves.level);
        this.game.hurtPlayer(amount, cell, true);
      }
    }

    switch (def.behavior) {
      case 'rootkit':
        this.rootkit(boss, cell, dt);
        break;
      case 'botnet':
        this.botnet(boss, dt, BOTNET_NODES);
        break;
      case 'polymorph':
        this.polymorph(boss, dt, POLY_SWITCH);
        break;
      case 'zeroday':
        this.zeroday(boss, cell, dt);
        break;
    }
  }

  onBossKilled(boss: Virus): void {
    if (boss !== this.boss) return;
    this.game.player.stats.bossesKilled++;
    this.game.bus.emit('bossKilled', { name: boss.name });
    this.game.log(`${boss.name} neutralized. Purging remaining processes...`, 'good');
    this.boss = undefined;
    this.game.waves.stopSpawning();
    this.game.combat.purgeAll();
  }

  // ── Gimmicks ─────────────────────────────────────────────

  /** Hidden until the daemon zone sweeps over it; relocates periodically. */
  private rootkit(boss: Virus, cell: Cell, dt: number): void {
    if (this.game.daemon.contains(cell)) {
      if (boss.revealTimer <= 0) this.game.log(`${boss.name} exposed at its hiding spot!`, 'warn');
      boss.revealTimer = ROOTKIT_REVEAL;
    }
    boss.revealTimer = Math.max(0, boss.revealTimer - dt);
    boss.hidden = boss.revealTimer <= 0;

    this.mechTimer -= dt;
    if (this.mechTimer <= 0) {
      this.mechTimer = ROOTKIT_RELOCATE;
      const target = this.game.grid.randomEmpty();
      if (target) {
        cell.virus = undefined;
        target.virus = boss;
        boss.revealTimer = 0;
        boss.hidden = true;
        this.game.log(`${boss.name} burrowed to a new location.`, 'info');
      }
    }
  }

  /**
   * Invulnerable while relay nodes live. Killing the last node exposes the
   * core for a fixed window, after which every node reconnects.
   */
  private botnet(boss: Virus, dt: number, nodeCount: number): void {
    if (this.exposed > 0) {
      boss.immune = 'none';
      this.exposed -= dt;
      if (this.exposed <= 0) {
        this.exposed = 0;
        this.spawnNodes(nodeCount);
        this.game.log(`${boss.name} reconnected: relay nodes back online.`, 'warn');
      }
      return;
    }
    if (this.countNodes() === 0) {
      this.exposed = BOTNET_EXPOSE;
      boss.immune = 'none';
      this.game.log(`All nodes down: ${boss.name} core EXPOSED for ${BOTNET_EXPOSE}s!`, 'good');
      return;
    }
    boss.immune = 'all';
  }

  /** Alternates hack/daemon immunity and spawns minions. */
  private polymorph(boss: Virus, dt: number, switchEvery: number): void {
    if (boss.immune !== 'hack' && boss.immune !== 'daemon') boss.immune = 'hack';
    this.mechTimer -= dt;
    if (this.mechTimer <= 0) {
      this.mechTimer = switchEvery;
      boss.immune = boss.immune === 'hack' ? 'daemon' : 'hack';
      this.game.log(
        `${boss.name} mutated: now immune to ${boss.immune === 'hack' ? 'HACKING' : 'the DAEMON'}.`,
        'warn',
      );
    }
    this.minionTimer -= dt;
    if (this.minionTimer <= 0) {
      this.minionTimer = POLY_MINION;
      this.game.waves.spawnOne();
    }
  }

  private zeroday(boss: Virus, cell: Cell, dt: number): void {
    const frac = boss.hpFraction;
    const phase = frac > 2 / 3 ? 1 : frac > 1 / 3 ? 2 : 3;
    if (phase !== this.phase) {
      this.phase = phase;
      boss.hidden = false;
      boss.revealTimer = 0;
      boss.immune = 'none';
      if (phase === 2) {
        this.spawnNodes(3);
        this.exposed = 0;
        this.game.log(`${boss.name} PHASE 2: summoning a botnet.`, 'alert');
      } else {
        this.mechTimer = 4;
        this.game.log(`${boss.name} PHASE 3: polymorphic overdrive!`, 'alert');
      }
    }
    if (phase === 1) this.rootkit(boss, cell, dt);
    else if (phase === 2) this.botnet(boss, dt, 3);
    else this.polymorph(boss, dt, 4);
  }

  private countNodes(): number {
    let count = 0;
    for (const cell of this.game.grid.cells) if (cell.virus?.kind === 'node') count++;
    return count;
  }

  private spawnNodes(count: number): void {
    const def = virusDef('node');
    for (let i = 0; i < count; i++) {
      const cell = pick(this.game.grid.cells.filter((c) => c.isEmpty));
      if (!cell) return;
      this.game.spawnVirus(cell, createVirus(def, this.game.waves.level));
    }
  }
}
