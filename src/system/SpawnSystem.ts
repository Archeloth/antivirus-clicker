import { Grid } from "../core/Grid";
import { eventBus } from "../core/events";
import { Virus } from "../entities/Virus";

export class SpawnSystem {
    private timer = 0;

    constructor(
        private readonly grid: Grid,
    ) {}

    public update(): void {
        this.timer++;

        if (this.timer > 120) {
            this.spawnVirus();
            this.timer = 0;
        }
    }

    public spawnVirus(): void {
        const cell = this.grid.getRandomEmptyCell();

        if (!cell) {
            return;
        }

        const virus = new Virus();
        cell.placeEntity(virus);
        eventBus.emit(
            "entitySpawned", {
                cell,
                entity: virus,
            }
        );
    }
}