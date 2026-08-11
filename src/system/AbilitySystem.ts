import { ABILITIES, type AbilityDefinition } from "../data/abilities";
import type { PlayerState } from "../core/PlayerState";
import { eventBus } from "../core/events";

export class AbilitySystem {
    private cooldowns = new Map<string, number>(); // abilityId -> frames remaining

    constructor(
        private readonly playerState: PlayerState,
    ) {
        ABILITIES.forEach(ability => {
            this.cooldowns.set(ability.id, 0);
        });
    }

    public getAbilities(): AbilityDefinition[] {
        return ABILITIES;
    }

    public getCooldownFrames(abilityId: string): number {
        return this.cooldowns.get(abilityId) ?? 0;
    }

    public getCooldownSeconds(abilityId: string): number {
        return Math.ceil((this.cooldowns.get(abilityId) ?? 0) / 60);
    }

    public isReady(abilityId: string): boolean {
        return (this.cooldowns.get(abilityId) ?? 0) <= 0;
    }

    public isUnlocked(abilityId: string): boolean {
        return this.playerState.getUpgradeLevel(abilityId) > 0;
    }

    public getAbilityByKey(key: string): AbilityDefinition | undefined {
        return ABILITIES.find(ability => ability.key.toLowerCase() === key.toLowerCase());
    }

    public resetCooldowns(): void {
        this.cooldowns.forEach((_, id) => {
            this.cooldowns.set(id, 0);
        });
    }

    public tryUse(abilityId: string): boolean {
        if (!this.isUnlocked(abilityId)) return false;
        if (!this.isReady(abilityId)) return false;

        const ability = ABILITIES.find(a => a.id === abilityId);
        if (!ability) return false;

        // Activate the effect
        this.activate(ability);

        // Start cooldown
        this.cooldowns.set(abilityId, ability.cooldown * 60);
        eventBus.emit("abilityUsed", ability.id);
        return true;
    }

    public update(): void {
        // Tick down cooldowns
        this.cooldowns.forEach((frames, id) => {
            if (frames > 0) {
                this.cooldowns.set(id, frames - 1);
            }
        });
    }

    private activate(ability: AbilityDefinition): void {
        switch (ability.id) {
            case "credit-surge":
                this.playerState.addCredits(50);
                break;
            case "overdrive":
                this.playerState.setOverdriveTimer(5);
                break;
            case "firewall":
                this.playerState.setFirewallTimer(5);
                break;
            // emp-blast and nuke are damage abilities handled by Game
            default:
                break;
        }
    }
}