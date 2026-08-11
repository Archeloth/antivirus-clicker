import type { Game } from "../core/Game";
import { GamePhase } from "../core/GamePhase";
import type { PlayerState } from "../core/PlayerState";
import { eventBus } from "../core/events";
import { GridRenderer } from "./GridRenderer";
import { HudRenderer } from "./HudRenderer";
import { ShopRenderer } from "./ShopRenderer";
import { EnemyInfoPanel } from "./EnemyInfoPanel";

export class UI {
    private readonly gridRenderer;
    private readonly hudRenderer;
    private readonly shopRenderer;
    private readonly enemyInfoPanel;

    constructor(
        game: Game,
        playerState: PlayerState,
        rootElement: HTMLElement
    ) {
        this.gridRenderer = new GridRenderer(
            game.getGrid(),
            rootElement,
            game.getSelectionRect()
        );

        this.hudRenderer = new HudRenderer(
            playerState,
            rootElement,
            game.getAbilitySystem()
        )

        this.shopRenderer = new ShopRenderer(
            playerState,
            game.getShop(),
            rootElement,
            game
        )

        this.enemyInfoPanel = new EnemyInfoPanel(
            rootElement
        )

        eventBus.on(
            "phaseChanged",
            (phase) => {
                this.gridRenderer.setVisible(phase === GamePhase.PLAYING || phase === GamePhase.READY);
            }
        );

        window.addEventListener("keydown", (event) => {
            const phase = game.getPhase();

            // Enter starts the level from READY phase
            if (event.key === "Enter" && phase === GamePhase.READY) {
                game.confirmLevelStart();
                event.preventDefault();
                return;
            }

            if (phase !== GamePhase.PLAYING) return;

            switch (event.key) {
                case "ArrowUp":
                    game.moveSelection(0, -1);
                    event.preventDefault();
                    break;
                case "ArrowDown":
                    game.moveSelection(0, 1);
                    event.preventDefault();
                    break;
                case "ArrowLeft":
                    game.moveSelection(-1, 0);
                    event.preventDefault();
                    break;
                case "ArrowRight":
                    game.moveSelection(1, 0);
                    event.preventDefault();
                    break;
                case "q":
                case "Q":
                    game.useAbility("emp-blast");
                    event.preventDefault();
                    break;
                case "e":
                case "E":
                    game.useAbility("nuke");
                    event.preventDefault();
                    break;
                case "r":
                case "R":
                    game.useAbility("overdrive");
                    event.preventDefault();
                    break;
                case "f":
                case "F":
                    game.useAbility("firewall");
                    event.preventDefault();
                    break;
                case "t":
                case "T":
                    game.useAbility("credit-surge");
                    event.preventDefault();
                    break;
            }
        });
    }

    initialize() {
        this.hudRenderer.render();
        this.gridRenderer.render();
        this.shopRenderer.render();
        this.enemyInfoPanel.render();
    }

    public getGridRenderer(): GridRenderer {
        return this.gridRenderer;
    }

    public update() {
        this.hudRenderer.update();
    }

}