import { Virus } from './Virus';

export class SplitterVirus extends Virus {
    constructor() {
        super('Fork Bomb', 70, 1, 3, '🧬'); // name, health, damagePerClick, reward, graphic
        this.splitsOnDeath = true; // Splits into 2 smaller viruses on death
    }
}