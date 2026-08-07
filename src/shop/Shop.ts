import type { PlayerState } from "../core/PlayerState";
import type { SelectionRect } from "../core/SelectionRect";
import { Upgrade } from "./Upgrade";

export class Shop {

    constructor(
        private readonly playerState: PlayerState,
        private readonly selectionRect: SelectionRect,
    ) {
        this.upgrades.push(
            new Upgrade(
                "damage-upgrade",
                "Overclock",
                "Push the CPU to its limits. +5 damage",
                10,
                1.5,
                () => { this.playerState.changeDamageNumber(5); },
            ),
            new Upgrade(
                "damage-upgrade-2",
                "Heavy Overclock",
                "Liquid nitrogen not included. +15 damage",
                30,
                1.6,
                () => { this.playerState.changeDamageNumber(15); },
            ),
            new Upgrade(
                "zone-size-upgrade",
                "Wide-Area Network",
                "Expand your network coverage. +1 zone size",
                25,
                2.0,
                () => {
                    const w = this.selectionRect.getWidth();
                    const h = this.selectionRect.getHeight();
                    this.selectionRect.setSize(w + 1, h + 1);
                },
            ),
            new Upgrade(
                "tick-rate-upgrade",
                "Turbo Boost",
                "More frames, more pain. Damage ticks 25% faster",
                40,
                1.8,
                () => { this.playerState.reduceTickInterval(7); },
            ),
            new Upgrade(
                "tick-rate-upgrade-2",
                "Quantum Leap",
                "Schrödinger's virus: both alive and dead until observed. Damage ticks 25% faster again",
                80,
                1.8,
                () => { this.playerState.reduceTickInterval(7); },
            ),
        );
    }

    private upgrades: Upgrade[] = [];

    public getUpgrades(): Upgrade[] {
        return this.upgrades;
    }

    public buy(upgrade: Upgrade): boolean {
        if (!this.playerState.spendCredits(upgrade.cost)) return false;

        upgrade.buy();
        return true;
    }

}