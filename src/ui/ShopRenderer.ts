import type { Game } from "../core/Game";
import { GamePhase } from "../core/GamePhase";
import type { PlayerState } from "../core/PlayerState";
import { eventBus } from "../core/events";
import type { Shop } from "../shop/Shop";
import type { Upgrade } from "../shop/Upgrade";

// Tier assignment for the upgrade tree (bottom-to-top)
const TIERS: Record<string, number> = {
    "damage-upgrade": 0,
    "tick-rate-upgrade": 0,
    "data-mining": 0,
    "damage-upgrade-2": 1,
    "zone-size-upgrade": 1,
    "code-injection": 1,
    "root-access": 2,
    "tick-rate-upgrade-2": 2,
    "firewall-integrity": 3,
    "emp-blast": 3,
    "nuke": 4,
    "overdrive": 5,
    "firewall": 6,
    "credit-surge": 7,
};

export class ShopRenderer {
    private readonly shopElement: HTMLDivElement;
    private readonly upgradeNodes = new Map<string, HTMLDivElement>();
    private readonly upgradeCostElements = new Map<string, HTMLDivElement>();
    private readonly finalBossButton: HTMLButtonElement;
    private readonly gameWonOverlay: HTMLDivElement;
    private readonly gameLostOverlay: HTMLDivElement;

    constructor(
        private readonly playerState: PlayerState,
        private readonly shop: Shop,
        private readonly rootElement: HTMLElement,
        private readonly game: Game,
    ) {
        this.shopElement = document.createElement("div");
        this.shopElement.className = "shop";

        const treeElement = document.createElement("div");
        treeElement.className = "upgrade-tree";

        // Group upgrades by tier
        const maxTier = Math.max(...Object.values(TIERS).map(Number));
        const tiers: Upgrade[][] = Array.from({ length: maxTier + 1 }, () => []);
        shop.getUpgrades().forEach((upgrade) => {
            const tier = TIERS[upgrade.id] ?? 0;
            const tierRow = tiers[tier];
            if (tierRow) tierRow.push(upgrade);
        });

        // Render tiers bottom-to-top (tier 0 at bottom)
        for (let tierIndex = maxTier; tierIndex >= 0; tierIndex--) {
            const tierRow = document.createElement("div");
            tierRow.className = "upgrade-tier";

            tiers[tierIndex]?.forEach((upgrade) => {
                const node = this.createUpgradeNode(upgrade);
                tierRow.appendChild(node);
                this.upgradeNodes.set(upgrade.id, node);
            });

            treeElement.appendChild(tierRow);

            // Add a connector line between tiers (except after the top tier)
            if (tierIndex > 0) {
                const connector = document.createElement("div");
                connector.className = "upgrade-connector";
                treeElement.appendChild(connector);
            }
        }

        this.shopElement.appendChild(treeElement);

        const startButton = document.createElement("button");
        startButton.className = "start-next-level";
        startButton.innerText = "Start Next Level";
        startButton.addEventListener("click", () => {
            this.game.startNextLevel();
        });
        this.shopElement.appendChild(startButton);

        // Replay Level button — restarts current level without progressing
        const replayButton = document.createElement("button");
        replayButton.className = "replay-level-button";
        replayButton.innerText = "Replay Level";
        replayButton.addEventListener("click", () => {
            this.game.replayLevel();
        });
        this.shopElement.appendChild(replayButton);

        // Final Boss button — visible only when all upgrades are maxed
        this.finalBossButton = document.createElement("button");
        this.finalBossButton.className = "final-boss-button";
        this.finalBossButton.innerText = "🔥 Final Boss 🔥";
        this.finalBossButton.style.display = "none";
        this.finalBossButton.addEventListener("click", () => {
            this.finalBossButton.style.display = "none";
            this.shopElement.style.display = "none";
            this.game.startFinalBossRound();
        });
        this.shopElement.appendChild(this.finalBossButton);

        // Game Won overlay — anchored to root so it shows even over hidden shop
        this.gameWonOverlay = document.createElement("div");
        this.gameWonOverlay.className = "game-won-overlay";
        this.gameWonOverlay.style.display = "none";

        const winTitle = document.createElement("h2");
        winTitle.textContent = "SYSTEM SECURED!";
        winTitle.className = "game-won-title";
        this.gameWonOverlay.appendChild(winTitle);

        const winText = document.createElement("p");
        winText.textContent = "You eliminated the Rootkit and saved the network. Congratulations, Admin!";
        this.gameWonOverlay.appendChild(winText);
        this.rootElement.appendChild(this.gameWonOverlay);

        // Game Lost overlay — shown when the boss defeats the player
        this.gameLostOverlay = document.createElement("div");
        this.gameLostOverlay.className = "game-lost-overlay";
        this.gameLostOverlay.style.display = "none";

        const lostTitle = document.createElement("h2");
        lostTitle.textContent = "SYSTEM BREACHED!";
        lostTitle.className = "game-lost-title";
        this.gameLostOverlay.appendChild(lostTitle);

        const lostText = document.createElement("p");
        lostText.textContent = "Your firewall was breached. Do you want to retry the current level?";
        this.gameLostOverlay.appendChild(lostText);

        const retryButton = document.createElement("button");
        retryButton.className = "retry-boss-button";
        retryButton.textContent = "Retry Level";
        retryButton.addEventListener("click", () => {
            this.gameLostOverlay.style.display = "none";
            this.game.replayLevel();
        });
        this.gameLostOverlay.appendChild(retryButton);

        const shopButton = document.createElement("button");
        shopButton.className = "retry-boss-button";
        shopButton.textContent = "Return to Shop";
        shopButton.style.marginLeft = "12px";
        shopButton.addEventListener("click", () => {
            this.gameLostOverlay.style.display = "none";
            this.game.returnToShop();
        });
        this.gameLostOverlay.appendChild(shopButton);
        this.rootElement.appendChild(this.gameLostOverlay);

        eventBus.on(
            "phaseChanged",
            (phase) => {
                this.shopElement.style.display = phase === GamePhase.SHOP ? "block" : "none";
            }
        );

        eventBus.on(
            "creditsChanged",
            () => {
                this.updateAllUpgradeNodes();
            }
        );

        eventBus.on(
            "gameWon",
            () => {
                this.gameWonOverlay.style.display = "flex";
            }
        );

        eventBus.on(
            "gameLost",
            () => {
                this.gameLostOverlay.style.display = "flex";
            }
        );
    }

    private createUpgradeNode(upgrade: Upgrade): HTMLDivElement {
        const node = document.createElement("div");
        node.className = "upgrade-node";
        node.dataset.upgradeId = upgrade.id;

        const nameElement = document.createElement("div");
        nameElement.className = "upgrade-node-name";
        nameElement.textContent = upgrade.name;
        node.appendChild(nameElement);

        const descriptionElement = document.createElement("div");
        descriptionElement.className = "upgrade-node-description";
        descriptionElement.textContent = upgrade.description;
        node.appendChild(descriptionElement);

        const costElement = document.createElement("div");
        costElement.className = "upgrade-node-cost";
        node.appendChild(costElement);
        this.upgradeCostElements.set(upgrade.id, costElement);

        node.addEventListener("click", () => {
            if (this.shop.buy(upgrade)) {
                this.updateAllUpgradeNodes();
            }
        });

        return node;
    }

    public render(): void {
        this.rootElement.appendChild(this.shopElement);
        this.updateAllUpgradeNodes();
    }

    private updateAllUpgradeNodes(): void {
        this.shop.getUpgrades().forEach(upgrade => {
            this.updateUpgradeNode(upgrade);
        });

        // Show the Final Boss button only when all upgrades are maxed
        this.finalBossButton.style.display = this.shop.isAllMaxed() ? "block" : "none";
    }

    private updateUpgradeNode(upgrade: Upgrade): void {
        const node = this.upgradeNodes.get(upgrade.id);
        const costElement = this.upgradeCostElements.get(upgrade.id);
        if (!node || !costElement) return;

        const levels = this.playerState.getUpgradeLevels();
        const unlocked = upgrade.canUnlock(levels);
        const maxed = upgrade.isMaxed();
        const canAfford = this.playerState.getCredits() >= upgrade.cost;

        // Reset state classes
        node.classList.remove("upgrade-node--unlocked", "upgrade-node--available", "upgrade-node--maxed", "upgrade-node--locked");
        node.style.pointerEvents = "auto";

        const nameElement = node.querySelector(".upgrade-node-name") as HTMLDivElement;
        nameElement.textContent = `${upgrade.name}${upgrade.getLevel() > 0 ? ` (Lv. ${upgrade.getLevel()})` : ""}`;

        if (maxed) {
            node.classList.add("upgrade-node--maxed");
            costElement.textContent = "MAX";
            node.style.pointerEvents = "none";
            return;
        }

        if (!unlocked) {
            node.classList.add("upgrade-node--locked");
            const prereqNames = upgrade.getPrerequisites()
                .map(id => this.shop.getUpgrades().find(u => u.id === id)?.name ?? id)
                .join(", ");
            costElement.textContent = `Requires: ${prereqNames}`;
            node.style.pointerEvents = "none";
            return;
        }

        if (canAfford) {
            node.classList.add("upgrade-node--available");
        } else {
            node.classList.add("upgrade-node--unlocked");
        }
        costElement.textContent = `Cost: ${upgrade.cost}`;
    }
}