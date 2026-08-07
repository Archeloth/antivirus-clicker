import { Virus } from './Virus';

export class FastVirus extends Virus {
    constructor() {
        super('Byte Bug', 30, 5, 1, '⚡'); // name, health, damagePerClick, reward, graphic
        this.speed = 2; // Moves twice as fast as the default virus speed
    }
}