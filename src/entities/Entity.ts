/**
 * Generic root entity class for in game entities
 */
export abstract class Entity {
    constructor(
        public health: number,
        public readonly reward: number,
    ) {}

    public takeDamage(amount: number): boolean {
        this.health -= amount;
        return this.health <= 0;
    }
}