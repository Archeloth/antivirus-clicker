import type { Entity } from "../entities/Entity";

/**
 * Cell data
 * @param x
 * @param y
 */
export class Cell {
    constructor(
        public readonly x: number,
        public readonly y: number,
    ) {}

    public entity?: Entity;

    public placeEntity(entity: Entity): void {
        this.entity = entity;
    }

    public removeEntity(): void {
        this.entity = undefined;
    }

    public hasEntity(): boolean {
        return this.entity !== undefined;
    }
}