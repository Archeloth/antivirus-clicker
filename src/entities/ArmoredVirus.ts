import { Virus } from './Virus';

export class ArmoredVirus extends Virus {
    constructor() {
        super('Syntax Error', 100, 3, 2, '🛡️'); // name, health, damagePerClick, reward, graphic
        this.armor = true; // Adds armor that reduces damage taken by half initially, then decreases over time if not destroyed
    }
}