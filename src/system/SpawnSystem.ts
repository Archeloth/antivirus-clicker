import { Grid } from "../core/Grid";
import { eventBus } from "../core/events";
import { SecurityLevel } from "../core/SecurityLevel";
import { ArmoredVirus } from "../entities/ArmoredVirus";
import { BasicVirus } from "../entities/BasicVirus";
import { BossVirus } from "../entities/BossVirus";
import { ExplosiveVirus } from "../entities/ExplosiveVirus";
import { FastVirus } from "../entities/FastVirus";
import { HealerVirus } from "../entities/HealerVirus";
import { LeechVirus } from "../entities/LeechVirus";
import { ShielderVirus } from "../entities/ShielderVirus";
import { SplitterVirus } from "../entities/SplitterVirus";
import { SpreaderVirus } from "../entities/SpreaderVirus";
import type { Virus } from "../entities/Virus";

interface VirusEntry {
    weight: number;
    minLevel: number;
    create: () => Virus;
}

const VIRUS_TYPES: VirusEntry[] = [
    { weight: 40, minLevel: 1, create: () => new BasicVirus() },
    { weight: 25, minLevel: 1, create: () => new FastVirus() },
    { weight: 15, minLevel: 3, create: () => new ArmoredVirus() },
    { weight: 10, minLevel: 3, create: () => new ExplosiveVirus() },
    { weight: 8, minLevel: 5, create: () => new HealerVirus() },
    { weight: 8, minLevel: 5, create: () => new SpreaderVirus() },
    { weight: 7, minLevel: 7, create: () => new SplitterVirus() },
    { weight: 6, minLevel: 7, create: () => new ShielderVirus() },
    { weight: 5, minLevel: 7, create: () => new LeechVirus() },
];

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

        // If this is a boss level, spawn the boss at the start
        if (level.levelNumber % 5 === 0) {
            this.spawnBoss();
        }
    }

    public update(): void {
        this.timer++;

        if (this.timer >= this.securityLevel.spawnInterval) {
            this.spawnVirus();
            this.timer = 0;
        }
    }

    public spawnFinalBoss(): void {
        const cell = this.getSpawnCell();
        if (!cell) return;

        const boss = new BossVirus();
        // Scale boss for the final round (very tough)
        boss.health = Math.round(boss.health * 5);

        cell.placeEntity(boss);
        eventBus.emit("entitySpawned", { cell, entity: boss });
    }

    public spawnVirus(): void {
        const cell = this.grid.getRandomEmptyCell();
        if (!cell) return;

        const level = this.securityLevel.levelNumber;

        const virus = this.pickVirusByLevel(level);

        // Scale enemy stats based on the current security level
        virus.health = Math.round(virus.health * this.securityLevel.enemyHealthMultiplier);
        virus.reward = Math.round(virus.reward * this.securityLevel.enemyRewardMultiplier);

        cell.placeEntity(virus);
        eventBus.emit("entitySpawned", { cell, entity: virus });
    }

    private spawnBoss(): void {
        const cell = this.grid.getRandomEmptyCell();
        if (!cell) return;

        const boss = new BossVirus();
        boss.health = Math.round(boss.health * this.securityLevel.enemyHealthMultiplier);
        boss.reward = Math.round(boss.reward * this.securityLevel.enemyRewardMultiplier);

        cell.placeEntity(boss);
        eventBus.emit("entitySpawned", { cell, entity: boss });
    }

    private getSpawnCell() {
        return this.grid.getRandomEmptyCell();
    }

    private pickVirusByLevel(level: number): Virus {
        const available = VIRUS_TYPES.filter(v => level >= v.minLevel);
        const totalWeight = available.reduce((sum, v) => sum + v.weight, 0);
        let roll = Math.random() * totalWeight;

        for (const entry of available) {
            roll -= entry.weight;
            if (roll <= 0) {
                return entry.create();
            }
        }

        // Fallback
        return new BasicVirus();
    }

    private createDefaultLevel(): SecurityLevel {
        return new SecurityLevel(1, 30, 120, 1, 1);
    }
}