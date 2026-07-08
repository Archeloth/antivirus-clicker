import { Entity } from "./Entity";

/**
 * Virus enemy entity
 */
export class Virus extends Entity {
    constructor() {
        super(1, 10);
    }

    //Later it could be extended with different types, like Trojan, Worm, Rootkit, BossVirus with different stats
}