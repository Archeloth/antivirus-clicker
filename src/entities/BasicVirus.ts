import { Virus } from './Virus';

export class BasicVirus extends Virus {
    constructor() {
        super('Bug', 50, 2, 1, '🦠'); // name, health, damagePerClick, reward, graphic
    }
}