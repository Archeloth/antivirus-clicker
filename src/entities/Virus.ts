import type { Cell } from "../core/Cell";
import type { Grid } from "../core/Grid";
import { eventBus } from "../core/events";
import { Entity } from "./Entity";

/**
 * Virus enemy entity
 */
export class Virus extends Entity {
    name: string;
    damagePerClick: number;
    graphic: string; // Emoji/character used to render this virus type

    // Behavior flags
    explodesOnDestroy = false; // AOE damage on death
    healsAdjacent = false; // Heals adjacent viruses each tick
    splitsOnDeath = false; // Splits into 2 smaller viruses on death
    shieldsAdjacent = false; // Adjacent viruses take no damage
    leech = false; // Steals credits on death
    spreads = false; // Spawns a copy on an adjacent empty cell
    isBoss = false; // Boss flag
    private spreadCooldown = 0; // Ticks until next spread (slows exponential growth)

    constructor(name: string, health: number, damagePerClick: number, reward: number, graphic: string) {
        super(health, reward);
        this.name = name;
        this.damagePerClick = damagePerClick;
        this.graphic = graphic;
    }

    /**
     * Called each game tick for behaviors like healing or spreading.
     */
    public onTick(grid: Grid, cell: Cell): void {
        if (this.healsAdjacent) {
            this.healNeighbors(grid, cell);
        }
        if (this.spreads) {
            if (this.spreadCooldown > 0) {
                this.spreadCooldown--;
            } else {
                this.spreadToNeighbor(grid, cell);
                this.spreadCooldown = 4; // Spread only every 4 ticks (~4 seconds)
            }
        }
    }

    /**
     * Called when this virus dies, for behaviors like explosion or splitting.
     */
    public onDeath(grid: Grid, cell: Cell): void {
        if (this.explodesOnDestroy) {
            this.explode(grid, cell);
        }
        if (this.splitsOnDeath) {
            this.split(grid, cell);
        }
    }

    private healNeighbors(grid: Grid, cell: Cell): void {
        const neighbors = this.getNeighbors(grid, cell);
        for (const neighbor of neighbors) {
            if (neighbor.entity instanceof Virus) {
                neighbor.entity.health += 10;
            }
        }
    }

    private spreadToNeighbor(grid: Grid, cell: Cell): void {
        const neighbors = this.getNeighbors(grid, cell);
        const empty = neighbors.filter(n => !n.hasEntity());
        if (empty.length === 0) return;

        const target = empty[Math.floor(Math.random() * empty.length)];
        if (!target) return;

        const copy = new Virus("Spore", 20, 1, 0, "🌱");
        copy.spreads = true;
        target.placeEntity(copy);
    }

    private explode(grid: Grid, cell: Cell): void {
        const neighbors = this.getNeighbors(grid, cell);
        for (const neighbor of neighbors) {
            const entity = neighbor.entity;
            if (entity) {
                const died = entity.takeDamage(50);
                if (died) {
                    // Trigger death behaviors (chain explosions, splits, etc.)
                    if (entity instanceof Virus) {
                        entity.onDeath(grid, neighbor);
                    }
                    neighbor.removeEntity();
                    eventBus.emit("entityDestroyed", { cell: neighbor, entity });
                }
                eventBus.emit("cellChanged", neighbor);
            }
        }
    }

    private split(grid: Grid, cell: Cell): void {
        const neighbors = this.getNeighbors(grid, cell);
        const empty = neighbors.filter(n => !n.hasEntity());
        const splitCount = Math.min(2, empty.length);

        for (let i = 0; i < splitCount; i++) {
            const target = empty[i];
            if (!target) continue;
            const child = new Virus("Fragment", Math.max(10, Math.floor(this.health / 2)), 1, 1, "🧬");
            target.placeEntity(child);
        }
    }

    private getNeighbors(grid: Grid, cell: Cell): Cell[] {
        const neighbors: Cell[] = [];
        const offsets: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dx, dy] of offsets) {
            const neighbor = grid.getCell(cell.x + dx, cell.y + dy);
            if (neighbor) neighbors.push(neighbor);
        }
        return neighbors;
    }
}