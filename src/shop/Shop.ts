import type { PlayerState } from "../core/PlayerState";
import type { SelectionRect } from "../core/SelectionRect";
import { Upgrade } from "./Upgrade";

export class Shop {

    private upgrades: Upgrade[] = [];

    constructor(
        private readonly playerState: PlayerState,
        private readonly selectionRect: SelectionRect,
    ) {
        this.upgrades = [
            new Upgrade(
                "damage-upgrade",
                "Overclock",
                "Push the CPU to its limits. +5 damage",
                25,
                1.8,
                () => { this.playerState.changeDamageNumber(5); },
                4,
            ),
            new Upgrade(
                "damage-upgrade-2",
                "Heavy Overclock",
                "Liquid nitrogen not included. +10 damage",
                80,
                1.9,
                () => { this.playerState.changeDamageNumber(10); },
                2,
                ["damage-upgrade"],
            ),
            new Upgrade(
                "root-access",
                "Root Access",
                "Escalate privileges. +6% total damage",
                150,
                1.9,
                () => { this.playerState.changeDamageMultiplier(0.06); },
                2,
                ["damage-upgrade-2"],
            ),
            new Upgrade(
                "zone-size-upgrade",
                "Wide-Area Network",
                "Expand your network coverage. +1 zone size",
                50,
                2.2,
                () => {
                    const w = this.selectionRect.getWidth();
                    const h = this.selectionRect.getHeight();
                    this.selectionRect.setSize(w + 1, h + 1);
                },
                3,
                ["damage-upgrade"],
            ),
            new Upgrade(
                "tick-rate-upgrade",
                "Turbo Boost",
                "More frames, more pain. Damage ticks faster",
                80,
                2.0,
                () => { this.playerState.reduceTickInterval(5); },
                3,
            ),
            new Upgrade(
                "tick-rate-upgrade-2",
                "Quantum Leap",
                "Schrödinger's virus: both alive and dead until observed. Damage ticks faster again",
                150,
                2.0,
                () => { this.playerState.reduceTickInterval(5); },
                2,
                ["zone-size-upgrade"],
            ),
            new Upgrade(
                "data-mining",
                "Data Mining",
                "Harvest extra data. +1 credit per kill",
                30,
                1.8,
                () => { this.playerState.changeCreditBonus(1); },
                3,
            ),
            new Upgrade(
                "code-injection",
                "Code Injection",
                "Inject payload into adjacent cells. 8% chance to chain damage",
                100,
                1.9,
                () => { this.playerState.changeChainChance(0.08); },
                3,
                ["tick-rate-upgrade"],
            ),
            // === Active Abilities (chained unlocks) ===
            new Upgrade(
                "emp-blast",
                "EMP Blast",
                "Unlock ability [Q]: Deal 50 damage to all viruses on the grid",
                120,
                1.0,
                () => { },
                1,
                ["code-injection"],
            ),
            new Upgrade(
                "nuke",
                "Nuke",
                "Unlock ability [E]: Deal 100 damage in a 3×3 around the selection zone",
                180,
                1.0,
                () => { },
                1,
                ["emp-blast"],
            ),
            new Upgrade(
                "overdrive",
                "Overdrive",
                "Unlock ability [R]: Double damage for 5 seconds",
                250,
                1.0,
                () => { },
                1,
                ["nuke"],
            ),
            new Upgrade(
                "firewall",
                "Firewall",
                "Unlock ability [F]: Freeze all virus spread and healing for 5 seconds",
                320,
                1.0,
                () => { },
                1,
                ["overdrive"],
            ),
            new Upgrade(
                "credit-surge",
                "Credit Surge",
                "Unlock ability [T]: Instantly gain 50 credits",
                400,
                1.0,
                () => { },
                1,
                ["firewall"],
            ),
            // === Firewall Integrity (repeatable HP upgrade) ===
            new Upgrade(
                "firewall-integrity",
                "Firewall Integrity",
                "Increase max Firewall HP by +25",
                40,
                1.6,
                () => { this.playerState.increaseMaxHp(25); },
                10,
            ),
        ];

        // Restore any previously-purchased upgrade levels
        this.upgrades.forEach((upgrade) => {
            const savedLevel = this.playerState.getUpgradeLevel(upgrade.id);
            for (let i = 0; i < savedLevel; i++) {
                upgrade.forceLevelUp();
            }
        });
    }

    public getUpgrades(): Upgrade[] {
        return this.upgrades;
    }

    public isAllMaxed(): boolean {
        return this.upgrades.every(upgrade => upgrade.isMaxed());
    }

    public canBuy(upgrade: Upgrade): boolean {
        if (upgrade.isMaxed()) return false;
        if (!upgrade.canUnlock(this.playerState.getUpgradeLevels())) return false;
        return this.playerState.getCredits() >= upgrade.cost;
    }

    public buy(upgrade: Upgrade): boolean {
        if (!this.canBuy(upgrade)) return false;

        const cost = upgrade.cost;
        if (!this.playerState.spendCredits(cost)) return false;

        upgrade.buy();
        this.playerState.setUpgradeLevel(upgrade.id, upgrade.getLevel());
        return true;
    }

}