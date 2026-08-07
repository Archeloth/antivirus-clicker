import type { PlayerState } from "../core/PlayerState";
import { eventBus } from "../core/events";

export class HudRenderer {
    private readonly creditsElement: HTMLDivElement;
    private readonly securitylevelElement: HTMLDivElement;
    private readonly damageElement: HTMLDivElement;
    private readonly timerElement: HTMLDivElement;
    private readonly tickRateElement: HTMLDivElement;

    constructor(
        private readonly playerState: PlayerState,
        private readonly rootElement: HTMLElement,
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
    }

    public render(): void {
        this.rootElement.appendChild(this.creditsElement);
        this.rootElement.appendChild(this.securitylevelElement);
        this.rootElement.appendChild(this.damageElement);
        this.rootElement.appendChild(this.timerElement);
        this.rootElement.appendChild(this.tickRateElement);
        this.timerElement.textContent = "Time: 0s";
        this.update();
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
    }
}
