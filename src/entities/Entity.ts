/**
 * Generic root entity class for in game entities
 */
export abstract class Entity {
    public armor = false;

    constructor(
        public health: number,
        public reward: number,
    ) { }

    public takeDamage(amount: number): boolean {
        const effective = this.armor ? Math.ceil(amount / 2) : amount;
        this.health -= effective;
        return this.health <= 0;
    }
}
