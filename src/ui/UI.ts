import type { Game } from "../core/Game";
import { GamePhase } from "../core/GamePhase";
import type { PlayerState } from "../core/PlayerState";
import { eventBus } from "../core/events";
import { GridRenderer } from "./GridRenderer";
import { HudRenderer } from "./HudRenderer";
import { ShopRenderer } from "./ShopRenderer";

export class UI {
    private readonly gridRenderer;
    private readonly hudRenderer;
    private readonly shopRenderer;

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
            rootElement
        )

        this.shopRenderer = new ShopRenderer(
            playerState,
            game.getShop(),
            rootElement,
            game
        )

        eventBus.on(
            "phaseChanged",
            (phase) => {
                this.gridRenderer.setVisible(phase === GamePhase.PLAYING);
            }
        );

        window.addEventListener("keydown", (event) => {
            if (game.getPhase() !== GamePhase.PLAYING) return;

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
            }
        });
    }

    initialize() {
        this.hudRenderer.render();
        this.gridRenderer.render();
        this.shopRenderer.render();
    }

    public getGridRenderer(): GridRenderer {
        return this.gridRenderer;
    }

    public update() {
        this.hudRenderer.update();
    }

}