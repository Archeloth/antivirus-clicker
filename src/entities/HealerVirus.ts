import { Virus } from './Virus';

export class HealerVirus extends Virus {
    constructor() {
        super('Patch Bot', 60, 1, 4, '🩹'); // name, health, damagePerClick, reward, graphic
        this.healsAdjacent = true; // Heals adjacent viruses each tick
    }
}