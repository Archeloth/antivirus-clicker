import { getSecurityLevel } from "../data/securityLevels";
import { Shop } from "../shop/Shop";
import { AbilitySystem } from "../system/AbilitySystem";
import { SpawnSystem } from "../system/SpawnSystem";
import type { Cell } from "./Cell";
import { eventBus } from "./events";
import { GamePhase } from "./GamePhase";
import { Grid } from "./Grid";
import { PlayerState, type PlayerStateData } from "./PlayerState";
import { SaveManager } from "./SaveManager";
import { SelectionRect, type SelectionRectData } from "./SelectionRect";
import type { SecurityLevel } from "./SecurityLevel";
import { Virus } from "../entities/Virus";
import { BasicVirus } from "../entities/BasicVirus";
import { FastVirus } from "../entities/FastVirus";
import { ArmoredVirus } from "../entities/ArmoredVirus";
import { ExplosiveVirus } from "../entities/ExplosiveVirus";
import { HealerVirus } from "../entities/HealerVirus";
import { SpreaderVirus } from "../entities/SpreaderVirus";
import { SplitterVirus } from "../entities/SplitterVirus";
import { ShielderVirus } from "../entities/ShielderVirus";
import { LeechVirus } from "../entities/LeechVirus";
import { BossVirus } from "../entities/BossVirus";

export interface EntitySaveData {
    x: number;
    y: number;
    type: string;
    health: number;
    reward: number;
    armor: boolean;
    name: string;
    damagePerClick: number;
    graphic: string;
    explodesOnDestroy: boolean;
    healsAdjacent: boolean;
    splitsOnDeath: boolean;
    shieldsAdjacent: boolean;
    leech: boolean;
    spreads: boolean;
    isBoss: boolean;
    spreadCooldown: number;
}

export interface GameSaveData {
    playerState: PlayerStateData;
    selectionRect: SelectionRectData;
    phase: GamePhase;
    timer: number;
    damageTickTimer: number;
    virusTickTimer: number;
    bossAttackTimer: number;
    hpTickTimer: number;
    finalBossRound: boolean;
    defeated: boolean;
    entities: EntitySaveData[];
}

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
    private defeated = false;
    private readonly saveManager = new SaveManager();
    private autoSaveCounter = 0;

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

        // Auto-save every 60 frames (~1 second) to protect against crashes
        this.autoSaveCounter++;
        if (this.autoSaveCounter >= 60) {
            this.autoSaveCounter = 0;
            this.saveManager.save(this);
        }
    }

    public getSaveManager(): SaveManager {
        return this.saveManager;
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
        this.defeated = true;
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
        this.defeated = false;
        this.clearGrid();
        eventBus.emit("timerChanged", 0);
        eventBus.emit("levelCompleted", this.securityLevel.levelNumber);
        eventBus.emit("phaseChanged", this.phase);
    }

    public startNextLevel(): void {
        // If the player was defeated, they cannot progress — replay the current level instead
        if (this.defeated) {
            this.replayLevel();
            return;
        }

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

    public wasDefeated(): boolean {
        return this.defeated;
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
        // Final boss is only available after security level 10
        if (this.playerState.getSecurityLevel() < 10) return;

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
                damage,
            }
        );

        if (died) {
            // Leech mechanic: killing a leech deducts credits
            const virus = entity instanceof Virus ? entity : undefined;
            if (virus?.leech) {
                const leechCost = Math.abs(entity.reward);
                this.playerState.spendCredits(leechCost);
                eventBus.emit("creditsCollected", { cell, amount: -leechCost });
            } else {
                const creditAmount = entity.reward + this.playerState.getCreditBonus();
                this.playerState.addCredits(creditAmount);
                eventBus.emit("creditsCollected", { cell, amount: creditAmount });
            }

            // Trigger death behaviors BEFORE removing the entity
            if (virus) {
                virus.onDeath(this.grid, cell);
            }

            // Notify renderers that the entity is dying (for death animation)
            eventBus.emit("entityDying", { cell, entity });

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

    // === Save / Load ===

    public serialize(): GameSaveData {
        const entities: EntitySaveData[] = [];
        this.grid.forEachCells(cell => {
            const entity = cell.entity;
            if (entity instanceof Virus) {
                entities.push({
                    x: cell.x,
                    y: cell.y,
                    type: entity.constructor.name,
                    health: entity.health,
                    reward: entity.reward,
                    armor: entity.armor,
                    name: entity.name,
                    damagePerClick: entity.damagePerClick,
                    graphic: entity.graphic,
                    explodesOnDestroy: entity.explodesOnDestroy,
                    healsAdjacent: entity.healsAdjacent,
                    splitsOnDeath: entity.splitsOnDeath,
                    shieldsAdjacent: entity.shieldsAdjacent,
                    leech: entity.leech,
                    spreads: entity.spreads,
                    isBoss: entity.isBoss,
                    spreadCooldown: entity.getSpreadCooldown(),
                });
            }
        });

        return {
            playerState: this.playerState.serialize(),
            selectionRect: this.selectionRect.serialize(),
            phase: this.phase,
            timer: this.timer,
            damageTickTimer: this.damageTickTimer,
            virusTickTimer: this.virusTickTimer,
            bossAttackTimer: this.bossAttackTimer,
            hpTickTimer: this.hpTickTimer,
            finalBossRound: this.finalBossRound,
            defeated: this.defeated,
            entities,
        };
    }

    public restoreFromSave(data: GameSaveData): void {
        this.playerState.deserialize(data.playerState);
        this.selectionRect.deserialize(data.selectionRect);
        this.phase = data.phase;
        this.timer = data.timer;
        this.damageTickTimer = data.damageTickTimer;
        this.virusTickTimer = data.virusTickTimer;
        this.bossAttackTimer = data.bossAttackTimer;
        this.hpTickTimer = data.hpTickTimer;
        this.finalBossRound = data.finalBossRound;
        this.defeated = data.defeated;

        // Rebuild security level and spawn system from restored player state
        this.securityLevel = getSecurityLevel(this.playerState.getSecurityLevel());
        this.spawnSystem.setSecurityLevel(this.securityLevel);

        // Rebuild the grid entities
        this.clearGrid();
        for (const entityData of data.entities) {
            const cell = this.grid.getCell(entityData.x, entityData.y);
            if (!cell) continue;
            const virus = this.createVirusFromData(entityData);
            if (virus) {
                cell.placeEntity(virus);
                eventBus.emit("entitySpawned", { cell, entity: virus });
            }
        }

        // Re-sync the shop upgrade levels (Shop restores levels from PlayerState on construction,
        // but the shop already exists here, so force-sync the upgrade levels)
        this.shop.getUpgrades().forEach(upgrade => {
            const savedLevel = this.playerState.getUpgradeLevel(upgrade.id);
            while (upgrade.getLevel() < savedLevel) {
                upgrade.forceLevelUp();
            }
        });

        eventBus.emit("phaseChanged", this.phase);
        eventBus.emit("timerChanged", this.getRemainingTime());
        eventBus.emit("creditsChanged", this.playerState.getCredits());
        eventBus.emit("damageChanged", this.playerState.getDamageNumber());
        eventBus.emit("hpChanged", this.playerState.getHp());
        eventBus.emit("tickIntervalChanged", this.playerState.getTickInterval());
        eventBus.emit("selectionChanged", undefined);
    }

    public resetToNewGame(): void {
        this.playerState.deserialize({
            credits: 0,
            securityLevel: 1,
            damage: 20,
            tickInterval: 30,
            creditBonus: 0,
            damageMultiplier: 1,
            chainChance: 0,
            upgradeLevels: {},
            hp: 1000,
            maxHp: 1000,
            overdriveTimer: 0,
            firewallTimer: 0,
        });
        this.selectionRect.deserialize({ x: 0, y: 0, width: 1, height: 1 });
        this.phase = GamePhase.READY;
        this.timer = 0;
        this.damageTickTimer = 0;
        this.virusTickTimer = 0;
        this.bossAttackTimer = 0;
        this.hpTickTimer = 0;
        this.finalBossRound = false;
        this.defeated = false;

        this.securityLevel = getSecurityLevel(this.playerState.getSecurityLevel());
        this.spawnSystem.setSecurityLevel(this.securityLevel);
        this.abilitySystem.resetCooldowns();
        this.clearGrid();

        // Reset shop upgrade levels
        this.shop.getUpgrades().forEach(upgrade => {
            upgrade.resetLevel();
        });

        eventBus.emit("phaseChanged", this.phase);
        eventBus.emit("timerChanged", this.getRemainingTime());
        eventBus.emit("creditsChanged", this.playerState.getCredits());
        eventBus.emit("damageChanged", this.playerState.getDamageNumber());
        eventBus.emit("hpChanged", this.playerState.getHp());
        eventBus.emit("tickIntervalChanged", this.playerState.getTickInterval());
        eventBus.emit("selectionChanged", undefined);
    }

    private createVirusFromData(data: EntitySaveData): Virus | null {
        let virus: Virus;
        switch (data.type) {
            case "BasicVirus":
                virus = new BasicVirus();
                break;
            case "FastVirus":
                virus = new FastVirus();
                break;
            case "ArmoredVirus":
                virus = new ArmoredVirus();
                break;
            case "ExplosiveVirus":
                virus = new ExplosiveVirus();
                break;
            case "HealerVirus":
                virus = new HealerVirus();
                break;
            case "SpreaderVirus":
                virus = new SpreaderVirus();
                break;
            case "SplitterVirus":
                virus = new SplitterVirus();
                break;
            case "ShielderVirus":
                virus = new ShielderVirus();
                break;
            case "LeechVirus":
                virus = new LeechVirus();
                break;
            case "BossVirus":
                virus = new BossVirus();
                break;
            default:
                // Fallback: reconstruct a generic Virus with saved properties
                virus = new Virus(data.name, data.health, data.damagePerClick, data.reward, data.graphic);
                virus.explodesOnDestroy = data.explodesOnDestroy;
                virus.healsAdjacent = data.healsAdjacent;
                virus.splitsOnDeath = data.splitsOnDeath;
                virus.shieldsAdjacent = data.shieldsAdjacent;
                virus.leech = data.leech;
                virus.spreads = data.spreads;
                virus.isBoss = data.isBoss;
                virus.armor = data.armor;
                virus.setSpreadCooldown(data.spreadCooldown);
                return virus;
        }

        // Restore runtime state for known virus types
        virus.health = data.health;
        virus.reward = data.reward;
        virus.armor = data.armor;
        virus.setSpreadCooldown(data.spreadCooldown);
        return virus;
    }
}
