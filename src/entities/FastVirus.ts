import { Virus } from './Virus';

export class FastVirus extends Virus {
    constructor() {
        super('Byte Bug', 30, 2, 1, '⚡'); // name, health, damagePerClick, reward, graphic
    }
}