import { SpawnSystem } from "../system/SpawnSystem";
import type { Cell } from "./Cell";
import { Grid } from "./Grid";
import { PlayerState } from "./PlayerState";
import { eventBus } from "./events";

/**
 * Main game handler
 */
export class Game {
    private readonly grid: Grid;
    private readonly playerState: PlayerState;
    private spawnSystem: SpawnSystem;

    constructor() {
        this.grid = new Grid(8, 8);
        this.playerState = new PlayerState()
        this.spawnSystem = new SpawnSystem(this.grid);
    }

    public start(): void {
        this.loop();
    }

    public update(): void {
        this.spawnSystem.update();
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

    public attackCell(cell: Cell): void {
        const entity = cell.entity;
        if (!entity) return;

        const died = entity.takeDamage(this.playerState.getDamageNumber());

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
}