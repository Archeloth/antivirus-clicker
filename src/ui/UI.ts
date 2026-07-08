import type { Game } from "../core/Game";
import type { PlayerState } from "../core/PlayerState";
import { GridRenderer } from "./GridRenderer";
import { HudRenderer } from "./HudRenderer";

export class UI {
    private readonly gridRenderer;
    private readonly hudRenderer;

    constructor(
        game: Game,
        playerState: PlayerState,
        rootElement: HTMLElement
    ) {
        this.gridRenderer = new GridRenderer(
            game.getGrid(),
            rootElement,
            (cell) => game.attackCell(cell)
        );

        this.hudRenderer = new HudRenderer(
            playerState,
            rootElement
        )
    }

    initialize() {
        this.hudRenderer.render();
        this.gridRenderer.render();
    }

    public getGridRenderer(): GridRenderer {
        return this.gridRenderer;
    }

    public update() {
        this.hudRenderer.update();
    }

}