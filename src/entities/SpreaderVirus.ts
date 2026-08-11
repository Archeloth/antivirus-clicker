import { Virus } from './Virus';

export class SpreaderVirus extends Virus {
    constructor() {
        super('Worm', 50, 1, 1, '🌱'); // name, health, damagePerClick, reward, graphic
        this.spreads = true; // Spawns a copy on an adjacent empty cell each 4s
    }
}