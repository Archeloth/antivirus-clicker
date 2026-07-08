import type { PlayerState } from "../core/PlayerState";
import { eventBus } from "../core/events";

export class HudRenderer {
    private readonly creditsElement: HTMLDivElement;
    private readonly securitylevelElement: HTMLDivElement;

    constructor(
        private readonly playerState: PlayerState,
        private readonly rootElement: HTMLElement,
    ) {
        this.creditsElement = document.createElement("div");
        this.creditsElement.className = "credits";

        this.securitylevelElement = document.createElement("div");
        this.securitylevelElement.className = "level";

        eventBus.on(
            "creditsChanged",
            () => {
                this.update();
            }
        );
    }

    public render(): void {
        this.rootElement.appendChild(this.creditsElement);
        this.rootElement.appendChild(this.securitylevelElement);
        this.update();
    }

    public update(): void {
        this.creditsElement.textContent =
            `Credits: ${this.playerState.getCredits()}`;

        this.securitylevelElement.textContent = 
            `Security Level: ${this.playerState.getSecurityLevel()}`;
    }
}