import { Virus } from './Virus';

export class ExplosiveVirus extends Virus {
    constructor() {
        super('Null Pointer', 80, 2, 3, '💥'); // name, health, damagePerClick, reward, graphic
        this.explodesOnDestroy = true; // When destroyed, it will cause an explosion in its cell and adjacent cells
    }
}