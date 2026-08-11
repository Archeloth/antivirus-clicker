import type { PlayerState } from "../core/PlayerState";
import { eventBus } from "../core/events";
import type { AbilitySystem } from "../system/AbilitySystem";
import { GamePhase } from "../core/GamePhase";

export class HudRenderer {
    private readonly creditsElement: HTMLDivElement;
    private readonly securitylevelElement: HTMLDivElement;
    private readonly damageElement: HTMLDivElement;
    private readonly timerElement: HTMLDivElement;
    private readonly tickRateElement: HTMLDivElement;
    private readonly abilityBarElement: HTMLDivElement;
    private readonly bossHpBarElement: HTMLDivElement;
    private readonly readyPromptElement: HTMLDivElement;
    private readonly abilityElements = new Map<string, HTMLDivElement>();

    constructor(
        private readonly playerState: PlayerState,
        private readonly rootElement: HTMLElement,
        private readonly abilitySystem: AbilitySystem,
    ) {
        this.creditsElement = document.createElement("div");
        this.creditsElement.className = "credits";

        this.securitylevelElement = document.createElement("div");
        this.securitylevelElement.className = "level";

        this.damageElement = document.createElement("div");
        this.damageElement.className = "damage";

        this.timerElement = document.createElement("div");
        this.timerElement.className = "timer";

        this.tickRateElement = document.createElement("div");
        this.tickRateElement.className = "tick-rate";

        // Ability bar
        this.abilityBarElement = document.createElement("div");
        this.abilityBarElement.className = "ability-bar";

        // Firewall HP bar (shown during play)
        this.bossHpBarElement = document.createElement("div");
        this.bossHpBarElement.className = "boss-hp-bar";
        this.bossHpBarElement.style.display = "none";

        const bossHpLabel = document.createElement("span");
        bossHpLabel.className = "boss-hp-label";
        bossHpLabel.textContent = "FIREWALL HP";
        this.bossHpBarElement.appendChild(bossHpLabel);

        const bossHpFill = document.createElement("div");
        bossHpFill.className = "boss-hp-fill";
        this.bossHpBarElement.appendChild(bossHpFill);

        // Ready prompt — centered overlay on the grid (starts visible since game starts in READY)
        this.readyPromptElement = document.createElement("div");
        this.readyPromptElement.className = "ready-prompt";
        this.readyPromptElement.textContent = "PRESS ENTER TO START";
        this.readyPromptElement.style.display = "flex";

        eventBus.on(
            "creditsChanged",
            () => {
                this.update();
            }
        );

        eventBus.on(
            "damageChanged",
            () => {
                this.update();
            }
        );

        eventBus.on(
            "timerChanged",
            (time) => {
                this.timerElement.textContent = `Time: ${time}s`;
            }
        );

        eventBus.on(
            "levelStarted",
            () => {
                this.update();
            }
        );

        eventBus.on(
            "levelCompleted",
            () => {
                this.update();
            }
        );

        eventBus.on(
            "tickIntervalChanged",
            () => {
                this.update();
            }
        );

        eventBus.on(
            "hpChanged",
            () => {
                this.updateBossHpBar();
            }
        );

        eventBus.on(
            "phaseChanged",
            (phase) => {
                this.readyPromptElement.style.display = phase === GamePhase.READY ? "flex" : "none";
                this.bossHpBarElement.style.display = phase === GamePhase.PLAYING ? "block" : "none";
            }
        );

        eventBus.on(
            "abilityUsed",
            () => {
                this.updateAbilityBar();
            }
        );
    }

    public render(): void {
        this.rootElement.appendChild(this.creditsElement);
        this.rootElement.appendChild(this.securitylevelElement);
        this.rootElement.appendChild(this.damageElement);
        this.rootElement.appendChild(this.timerElement);
        this.rootElement.appendChild(this.tickRateElement);
        this.rootElement.appendChild(this.abilityBarElement);
        this.rootElement.appendChild(this.bossHpBarElement);
        this.rootElement.appendChild(this.readyPromptElement);
        this.timerElement.textContent = "Time: 0s";
        this.buildAbilityBar();
        this.update();
        this.updateBossHpBar();
    }

    private buildAbilityBar(): void {
        this.abilityBarElement.innerHTML = "";
        this.abilityElements.clear();

        this.abilitySystem.getAbilities().forEach(ability => {
            const abilityElement = document.createElement("div");
            abilityElement.className = "ability-slot";
            abilityElement.dataset.abilityId = ability.id;

            const keyElement = document.createElement("span");
            keyElement.className = "ability-key";
            keyElement.textContent = ability.key;
            abilityElement.appendChild(keyElement);

            const nameElement = document.createElement("span");
            nameElement.className = "ability-name";
            nameElement.textContent = ability.name;
            abilityElement.appendChild(nameElement);

            const cooldownElement = document.createElement("span");
            cooldownElement.className = "ability-cooldown";
            abilityElement.appendChild(cooldownElement);

            this.abilityBarElement.appendChild(abilityElement);
            this.abilityElements.set(ability.id, abilityElement);
        });
    }

    public update(): void {
        this.creditsElement.textContent =
            `Credits: ${this.playerState.getCredits()}`;

        this.securitylevelElement.textContent =
            `Security Level: ${this.playerState.getSecurityLevel()}`;

        this.damageElement.textContent =
            `Damage: ${this.playerState.getDamageNumber()}`;

        this.tickRateElement.textContent =
            `Tick Rate: ${(60 / this.playerState.getTickInterval()).toFixed(1)}/s`;

        this.updateAbilityBar();
        this.updateBossHpBar();
    }

    private updateAbilityBar(): void {
        this.abilitySystem.getAbilities().forEach(ability => {
            const element = this.abilityElements.get(ability.id);
            if (!element) return;

            const cooldownElement = element.querySelector(".ability-cooldown");
            if (!cooldownElement) return;

            // Show locked state if not unlocked
            if (!this.abilitySystem.isUnlocked(ability.id)) {
                element.classList.add("ability-slot--locked");
                element.classList.remove("ability-slot--cooldown");
                cooldownElement.textContent = "LOCKED";
                return;
            }
            element.classList.remove("ability-slot--locked");

            const cooldown = this.abilitySystem.getCooldownSeconds(ability.id);
            if (cooldown > 0) {
                element.classList.add("ability-slot--cooldown");
                cooldownElement.textContent = `${cooldown}s`;
            } else {
                element.classList.remove("ability-slot--cooldown");
                cooldownElement.textContent = "READY";
            }
        });
    }

    private updateBossHpBar(): void {
        const fill = this.bossHpBarElement.querySelector(".boss-hp-fill") as HTMLDivElement;
        if (!fill) return;

        const fraction = this.playerState.getHpFraction();
        fill.style.width = `${fraction * 100}%`;
        fill.style.background = fraction > 0.5 ? "#4ade80" : fraction > 0.25 ? "#facc15" : "#ef4444";
    }
}
