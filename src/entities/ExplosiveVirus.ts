import { Virus } from './Virus';

export class ExplosiveVirus extends Virus {
    constructor() {
        super('Null Pointer', 80, 8, 3, '💥'); // name, health, damagePerClick, reward, graphic
        this.explodesOnDestroy = true; // When destroyed, it will cause an explosion in its cell and adjacent cells
    }

    triggerExplosion() {
        // Code to handle the explosion effect, damaging surrounding cells
    }
}