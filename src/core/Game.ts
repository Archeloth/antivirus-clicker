import { getSecurityLevel } from "../data/securityLevels";
import { Shop } from "../shop/Shop";
import { AbilitySystem } from "../system/AbilitySystem";
import { SpawnSystem } from "../system/SpawnSystem";
import type { Cell } from "./Cell";
import { eventBus } from "./events";
import { GamePhase } from "./GamePhase";
import { Grid } from "./Grid";
import { PlayerState } from "./PlayerState";
import { SelectionRect } from "./SelectionRect";
import type { SecurityLevel } from "./SecurityLevel";
import { Virus } from "../entities/Virus";

/**
 * Main game handler
 */
export class Game {
    private readonly grid: Grid;
    private readonly playerState: PlayerState;
    private spawnSystem: SpawnSystem;
    private readonly shop: Shop;
    private readonly abilitySystem: AbilitySystem;
    private phase: GamePhase = GamePhase.READY;
    private securityLevel: SecurityLevel;
    private timer = 0;
    private damageTickTimer = 0;
    private virusTickTimer = 0;
    private bossAttackTimer = 0;
    private hpTickTimer = 0;
    private readonly selectionRect: SelectionRect;
    private finalBossRound = false;

    constructor() {
        this.grid = new Grid(8, 8);
        this.playerState = new PlayerState()
        this.spawnSystem = new SpawnSystem(this.grid);
        this.selectionRect = new SelectionRect(this.grid, 1, 1);
        this.shop = new Shop(this.playerState, this.selectionRect);
        this.abilitySystem = new AbilitySystem(this.playerState);
        this.securityLevel = getSecurityLevel(this.playerState.getSecurityLevel());
        this.spawnSystem.setSecurityLevel(this.securityLevel);
        eventBus.emit("phaseChanged", this.phase);
    }

    public start(): void {
        this.loop();
    }

    public update(): void {
        this.abilitySystem.update();

        if (this.phase === GamePhase.PLAYING) {
            this.spawnSystem.update();
            this.updateTimer();
            this.updateDamageTick();
            this.updateVirusTicks();
            this.updateHpDamage();
            this.checkFinalBossDefeated();
            this.updateBossAttack();
        }

        // Tick down temporary ability timers
        this.playerState.tickOverdrive();
        this.playerState.tickFirewall();
    }

    private updateVirusTicks(): void {
        // Firewall freezes virus spread/heal
        if (this.playerState.isFirewallActive()) return;

        this.virusTickTimer++;

        // Run virus behaviors once per second (60 frames)
        if (this.virusTickTimer >= 60) {
            this.virusTickTimer = 0;
            const cells = this.grid.getCellsSnapshot();
            for (const cell of cells) {
                const entity = cell.entity;
                if (entity instanceof Virus) {
                    entity.onTick(this.grid, cell);
                    eventBus.emit("cellChanged", cell);
                }
            }
        }
    }

    private updateBossAttack(): void {
        if (!this.finalBossRound) return;

        this.bossAttackTimer++;

        // Boss attacks every 3 seconds (180 frames)
        if (this.bossAttackTimer >= 180) {
            this.bossAttackTimer = 0;
            const died = this.playerState.takeDamage(10);
            if (died) {
                this.gameOver();
            }
        }
    }

    private updateHpDamage(): void {
        this.hpTickTimer++;

        // Every second, all viruses deal their summed damage to the player
        if (this.hpTickTimer >= 60) {
            this.hpTickTimer = 0;
            let totalDamage = 0;
            this.grid.forEachCells(cell => {
                const entity = cell.entity;
                if (entity instanceof Virus) {
                    totalDamage += entity.damagePerClick;
                }
            });

            if (totalDamage > 0) {
                const died = this.playerState.takeDamage(totalDamage);
                if (died) {
                    this.gameOver();
                }
            }
        }
    }

    private gameOver(): void {
        this.phase = GamePhase.SHOP;
        this.finalBossRound = false;
        eventBus.emit("gameLost", undefined);
        eventBus.emit("phaseChanged", this.phase);
    }

    private checkFinalBossDefeated(): void {
        if (!this.finalBossRound) return;

        let bossAlive = false;
        this.grid.forEachCells(cell => {
            if (cell.entity instanceof Virus && (cell.entity as Virus).isBoss) {
                bossAlive = true;
            }
        });

        if (!bossAlive) {
            this.finalBossRound = false;
            eventBus.emit("gameWon", undefined);
        }
    }

    private updateDamageTick(): void {
        this.damageTickTimer++;

        if (this.damageTickTimer >= this.playerState.getTickInterval()) {
            this.damageTickTimer = 0;
            this.selectionRect.getCells().forEach(cell => {
                this.attackCell(cell);
            });
        }
    }

    private updateTimer(): void {
        // No timer during the final boss round — the boss must be defeated
        if (this.finalBossRound) return;

        this.timer++;

        if (this.timer >= this.securityLevel.timeLimit * 60) {
            this.completeLevel();
        } else {
            eventBus.emit("timerChanged", this.getRemainingTime());
        }
    }

    private completeLevel(): void {
        this.phase = GamePhase.SHOP;
        this.clearGrid();
        eventBus.emit("timerChanged", 0);
        eventBus.emit("levelCompleted", this.securityLevel.levelNumber);
        eventBus.emit("phaseChanged", this.phase);
    }

    public startNextLevel(): void {
        this.playerState.increaseSecurityLevel();
        this.securityLevel = getSecurityLevel(this.playerState.getSecurityLevel());
        this.spawnSystem.setSecurityLevel(this.securityLevel);
        this.timer = 0;
        this.damageTickTimer = 0;
        this.virusTickTimer = 0;
        this.bossAttackTimer = 0;
        this.hpTickTimer = 0;
        this.abilitySystem.resetCooldowns();
        this.playerState.restoreHp();
        this.phase = GamePhase.READY;
        this.finalBossRound = false;
        this.clearGrid();

        eventBus.emit("levelStarted", this.securityLevel.levelNumber);
        eventBus.emit("phaseChanged", this.phase);
        eventBus.emit("timerChanged", this.getRemainingTime());
    }

    public replayLevel(): void {
        this.securityLevel = getSecurityLevel(this.playerState.getSecurityLevel());
        this.spawnSystem.setSecurityLevel(this.securityLevel);
        this.timer = 0;
        this.damageTickTimer = 0;
        this.virusTickTimer = 0;
        this.bossAttackTimer = 0;
        this.hpTickTimer = 0;
        this.abilitySystem.resetCooldowns();
        this.playerState.restoreHp();
        this.phase = GamePhase.READY;
        this.finalBossRound = false;
        this.clearGrid();

        eventBus.emit("levelStarted", this.securityLevel.levelNumber);
        eventBus.emit("phaseChanged", this.phase);
        eventBus.emit("timerChanged", this.getRemainingTime());
    }

    public confirmLevelStart(): void {
        if (this.phase !== GamePhase.READY) return;

        this.timer = 0;
        this.damageTickTimer = 0;
        this.virusTickTimer = 0;
        this.bossAttackTimer = 0;
        this.phase = GamePhase.PLAYING;

        eventBus.emit("phaseChanged", this.phase);
        eventBus.emit("timerChanged", this.getRemainingTime());
    }

    private clearGrid(): void {
        this.grid.forEachCells(cell => {
            if (cell.hasEntity()) {
                cell.removeEntity();
            }
            // Emit for ALL cells so visual effects (e.g. shielded) are cleared
            eventBus.emit("cellChanged", cell);
        });
    }

    public loop(): void {
        this.update();
        requestAnimationFrame(() => this.loop());
    }

    public getGrid(): Grid {
        return this.grid;
    }

    public getPlayerState(): PlayerState {
        return this.playerState;
    }

    public getPhase(): GamePhase {
        return this.phase;
    }

    public getRemainingTime(): number {
        const totalFrames = this.securityLevel.timeLimit * 60;
        return Math.max(0, Math.ceil((totalFrames - this.timer) / 60));
    }

    private isShieldedByNeighbor(cell: Cell): boolean {
        const offsets: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dx, dy] of offsets) {
            const neighbor = this.grid.getCell(cell.x + dx, cell.y + dy);
            const neighborEntity = neighbor?.entity;
            if (neighborEntity instanceof Virus && neighborEntity.shieldsAdjacent) {
                return true;
            }
        }
        return false;
    }

    public startFinalBossRound(): void {
        this.clearGrid();
        this.finalBossRound = true;
        this.timer = 0;
        this.damageTickTimer = 0;
        this.virusTickTimer = 0;
        this.bossAttackTimer = 0;
        this.playerState.restoreHp();
        this.abilitySystem.resetCooldowns();
        this.phase = GamePhase.READY;
        this.spawnSystem.spawnFinalBoss();
        eventBus.emit("phaseChanged", this.phase);
    }

    public useAbility(abilityId: string): void {
        if (this.phase !== GamePhase.PLAYING) return;

        if (!this.abilitySystem.tryUse(abilityId)) return;

        // Damage abilities handled here (they need grid access)
        const ability = this.abilitySystem.getAbilities().find(a => a.id === abilityId);
        if (!ability) return;

        if (abilityId === "emp-blast") {
            this.grid.forEachCells(cell => {
                const entity = cell.entity;
                if (entity instanceof Virus) {
                    entity.takeDamage(50);
                    if (entity.health <= 0) {
                        cell.removeEntity();
                        eventBus.emit("entityDestroyed", { cell, entity });
                    }
                }
            });
        } else if (abilityId === "nuke") {
            const centerX = this.selectionRect.getX() + Math.floor(this.selectionRect.getWidth() / 2);
            const centerY = this.selectionRect.getY() + Math.floor(this.selectionRect.getHeight() / 2);
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const cell = this.grid.getCell(centerX + dx, centerY + dy);
                    const entity = cell?.entity;
                    if (entity instanceof Virus) {
                        entity.takeDamage(100);
                        if (entity.health <= 0) {
                            cell!.removeEntity();
                            eventBus.emit("entityDestroyed", { cell: cell!, entity });
                        }
                    }
                }
            }
        }
    }

    public getAbilitySystem(): AbilitySystem {
        return this.abilitySystem;
    }

    public attackCell(cell: Cell): void {
        if (this.phase !== GamePhase.PLAYING) return;

        const entity = cell.entity;
        if (!entity) return;

        // Shielder mechanic: adjacent shielded viruses take 75% reduced damage
        const shielded = this.isShieldedByNeighbor(cell);
        const damage = shielded
            ? Math.ceil(this.playerState.getDamageNumber() * 0.25)
            : this.playerState.getDamageNumber();

        const died = entity.takeDamage(damage);

        eventBus.emit(
            "entityDamaged",
            {
                cell,
                entity,
            }
        );

        if (died) {
            // Leech mechanic: killing a leech deducts credits
            const virus = entity instanceof Virus ? entity : undefined;
            if (virus?.leech) {
                const leechCost = Math.abs(entity.reward);
                this.playerState.spendCredits(leechCost);
            } else {
                this.playerState.addCredits(entity.reward + this.playerState.getCreditBonus());
            }

            // Trigger death behaviors BEFORE removing the entity
            if (virus) {
                virus.onDeath(this.grid, cell);
            }

            cell.removeEntity();

            eventBus.emit(
                "entityDestroyed",
                {
                    cell,
                    entity,
                }
            );

            // Code Injection: chance to chain damage to adjacent cells
            const chainChance = this.playerState.getChainChance();
            if (chainChance > 0 && Math.random() < chainChance) {
                const neighbors: Cell[] = [];
                const offsets: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                for (const [dx, dy] of offsets) {
                    const neighbor = this.grid.getCell(cell.x + dx, cell.y + dy);
                    if (neighbor) neighbors.push(neighbor);
                }
                const target = neighbors[Math.floor(Math.random() * neighbors.length)];
                if (target) {
                    this.attackCell(target);
                }
            }
        }
    }

    public moveSelection(dx: number, dy: number): void {
        this.selectionRect.move(dx, dy);
        eventBus.emit("selectionChanged", undefined);
    }

    public getSelectionRect(): SelectionRect {
        return this.selectionRect;
    }

    public getShop(): Shop {
        return this.shop;
    }

    public returnToShop(): void {
        this.phase = GamePhase.SHOP;
        this.finalBossRound = false;
        this.timer = 0;
        this.damageTickTimer = 0;
        this.virusTickTimer = 0;
        this.bossAttackTimer = 0;
        this.hpTickTimer = 0;
        this.abilitySystem.resetCooldowns();
        this.playerState.restoreHp();
        this.clearGrid();

        eventBus.emit("phaseChanged", this.phase);
        eventBus.emit("timerChanged", this.getRemainingTime());
    }
}
