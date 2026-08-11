import { Virus } from './Virus';

export class BossVirus extends Virus {
    constructor() {
        super('Rootkit', 500, 5, 50, '👑'); // name, health, damagePerClick, reward, graphic
        this.isBoss = true;
        this.armor = true; // Bosses are armored
    }
}