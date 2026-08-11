import { Virus } from './Virus';

export class LeechVirus extends Virus {
    constructor() {
        super('Vampire Bug', 40, 1, -5, '🩸'); // name, health, damagePerClick, reward, graphic
        this.leech = true; // Steals credits on death
    }
}