import { Virus } from './Virus';

export class ShielderVirus extends Virus {
    constructor() {
        super('Firewall', 90, 1, 5, '🧿'); // name, health, damagePerClick, reward, graphic
        this.shieldsAdjacent = true; // Adjacent viruses take no damage
    }
}