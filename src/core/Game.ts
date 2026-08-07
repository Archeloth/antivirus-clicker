import { getSecurityLevel } from "../data/securityLevels";
import { Shop } from "../shop/Shop";
import { SpawnSystem } from "../system/SpawnSystem";
import type { Cell } from "./Cell";
import { eventBus } from "./events";
import { GamePhase } from "./GamePhase";
import { Grid } from "./Grid";
import { PlayerState } from "./PlayerState";
import { SelectionRect } from "./SelectionRect";
import type { SecurityLevel } from "./SecurityLevel";

/**
 * Main game handler
 */
export class Game {
    private readonly grid: Grid;
    private readonly playerState: PlayerState;
    private spawnSystem: SpawnSystem;
    private readonly shop: Shop;
    private phase: GamePhase = GamePhase.PLAYING;
    private securityLevel: SecurityLevel;
    private timer = 0;
    private damageTickTimer = 0;
    private readonly selectionRect: SelectionRect;

    constructor() {
        this.grid = new Grid(8, 8);
        this.playerState = new PlayerState()
        this.spawnSystem = new SpawnSystem(this.grid);
        this.selectionRect = new SelectionRect(this.grid, 2, 2);
        this.shop = new Shop(this.playerState, this.selectionRect);
        this.securityLevel = getSecurityLevel(this.playerState.getSecurityLevel());
        this.spawnSystem.setSecurityLevel(this.securityLevel);
    }

    public start(): void {
        this.loop();
    }

    public update(): void {
        if (this.phase === GamePhase.PLAYING) {
            this.spawnSystem.update();
            this.updateTimer();
            this.updateDamageTick();
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
        this.phase = GamePhase.PLAYING;
        this.clearGrid();

        eventBus.emit("levelStarted", this.securityLevel.levelNumber);
        eventBus.emit("phaseChanged", this.phase);
        eventBus.emit("timerChanged", this.getRemainingTime());
    }

    private clearGrid(): void {
        this.grid.forEachCells(cell => {
            if (cell.hasEntity()) {
                cell.removeEntity();
                eventBus.emit("cellChanged", cell);
            }
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

    public attackCell(cell: Cell): void {
        if (this.phase !== GamePhase.PLAYING) return;

        const entity = cell.entity;
        if (!entity) return;

        const died = entity.takeDamage(this.playerState.getDamageNumber());

        eventBus.emit(
            "entityDamaged",
            {
                cell,
                entity,
            }
        );

        if (died) {
            this.playerState.addCredits(entity.reward);
            cell.removeEntity();

            eventBus.emit(
                "entityDestroyed",
                {
                    cell,
                    entity,
                }
            );
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
}