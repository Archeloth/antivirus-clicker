import { Grid } from "../core/Grid";
import { eventBus } from "../core/events";
import { SecurityLevel } from "../core/SecurityLevel";
import { ArmoredVirus } from "../entities/ArmoredVirus";
import { ExplosiveVirus } from "../entities/ExplosiveVirus";
import { FastVirus } from "../entities/FastVirus";
import type { Virus } from "../entities/Virus";

export class SpawnSystem {
    private timer = 0;
    private securityLevel: SecurityLevel;

    constructor(
        private readonly grid: Grid,
    ) {
        this.securityLevel = this.createDefaultLevel();
    }

    public setSecurityLevel(level: SecurityLevel): void {
        this.securityLevel = level;
        this.timer = 0;
    }

    public update(): void {
        this.timer++;

        if (this.timer >= this.securityLevel.spawnInterval) {
            this.spawnVirus();
            this.timer = 0;
        }
    }

    public spawnVirus(): void {
        const cell = this.grid.getRandomEmptyCell();

        if (!cell) {
            return;
        }

        const virusTypes: Array<new () => Virus> = [
            FastVirus,
            ArmoredVirus,
            ExplosiveVirus,
        ];
        const randomIndex = Math.floor(Math.random() * virusTypes.length);
        const VirusClass = virusTypes[randomIndex]!;
        const virus = new VirusClass();

        // Scale enemy stats based on the current security level
        virus.health = Math.round(virus.health * this.securityLevel.enemyHealthMultiplier);
        virus.reward = Math.round(virus.reward * this.securityLevel.enemyRewardMultiplier);

        cell.placeEntity(virus);
        eventBus.emit(
            "entitySpawned", {
            cell,
            entity: virus,
        }
        );
    }

    private createDefaultLevel(): SecurityLevel {
        return new SecurityLevel(1, 30, 120, 1, 1);
    }
}