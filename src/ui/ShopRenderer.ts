import type { Game } from "../core/Game";
import { GamePhase } from "../core/GamePhase";
import type { PlayerState } from "../core/PlayerState";
import { eventBus } from "../core/events";
import type { Shop } from "../shop/Shop";

export class ShopRenderer {
    private readonly shopElement: HTMLDivElement;
    private readonly upgradeButtons = new Map<string, HTMLButtonElement>();
    private readonly upgradeCostElements = new Map<string, HTMLDivElement>();

    constructor(
        private readonly playerState: PlayerState,
        private readonly shop: Shop,
        private readonly rootElement: HTMLElement,
        private readonly game: Game,
    ) {
        this.shopElement = document.createElement("div");
        this.shopElement.className = "shop";

        shop.getUpgrades().forEach((upgrade) => {
            const upgradeContainer = document.createElement("div");
            upgradeContainer.className = "upgrade-container";

            const upgradeButton = document.createElement("button");
            upgradeButton.className = "upgrade";
            upgradeButton.innerText = upgrade.name;
            upgradeContainer.appendChild(upgradeButton);

            const descriptionElement = document.createElement("div");
            descriptionElement.className = "upgrade-description";
            descriptionElement.textContent = upgrade.description;
            upgradeContainer.appendChild(descriptionElement);

            const costElement = document.createElement("div");
            costElement.className = "upgrade-cost";
            upgradeContainer.appendChild(costElement);

            this.shopElement.appendChild(upgradeContainer);
            this.upgradeButtons.set(upgrade.id, upgradeButton);
            this.upgradeCostElements.set(upgrade.id, costElement);

            upgradeButton.addEventListener("click", () => {
                if (this.shop.buy(upgrade)) {
                    this.updateUpgradeButton(upgrade);
                }
            });
        });

        const startButton = document.createElement("button");
        startButton.className = "start-next-level";
        startButton.innerText = "Start Next Level";
        startButton.addEventListener("click", () => {
            this.game.startNextLevel();
        });
        this.shopElement.appendChild(startButton);

        eventBus.on(
            "phaseChanged",
            (phase) => {
                this.shopElement.style.display = phase === GamePhase.SHOP ? "block" : "none";
            }
        );

        eventBus.on(
            "creditsChanged",
            () => {
                this.updateAllUpgradeButtons();
            }
        );
    }

    public render(): void {
        this.rootElement.appendChild(this.shopElement);
        this.updateAllUpgradeButtons();
    }

    private updateAllUpgradeButtons(): void {
        this.shop.getUpgrades().forEach(upgrade => {
            this.updateUpgradeButton(upgrade);
        });
    }

    private updateUpgradeButton(upgrade: { id: string; cost: number; name: string; getLevel: () => number }): void {
        const button = this.upgradeButtons.get(upgrade.id);
        const costElement = this.upgradeCostElements.get(upgrade.id);
        if (!button || !costElement) return;

        const canAfford = this.playerState.getCredits() >= upgrade.cost;
        button.disabled = !canAfford;
        button.innerText = `${upgrade.name} (Lv. ${upgrade.getLevel()})`;
        costElement.textContent = `Cost: ${upgrade.cost}`;
    }
}