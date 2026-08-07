import { Entity } from "./Entity";

/**
 * Virus enemy entity
 */
export class Virus extends Entity {
    name: string;
    damagePerClick: number;
    speed?: number; // Optional property for moving viruses
    armor?: boolean; // Optional property to indicate armored enemies
    explodesOnDestroy?: boolean; // Optional property for explosive viruses
    graphic: string; // Emoji/character used to render this virus type

    constructor(name: string, health: number, damagePerClick: number, reward: number, graphic: string) {
        super(health, reward);
        this.name = name;
        this.damagePerClick = damagePerClick;
        this.graphic = graphic;
    }
    //Later it could be extended with different types, like Trojan, Worm, Rootkit, BossVirus with different stats
}