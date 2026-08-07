import type { Cell } from "../core/Cell";
import type { Grid } from "../core/Grid";
import { eventBus } from "../core/events";
import type { SelectionRect } from "../core/SelectionRect";
import { Virus } from "../entities/Virus";

export class GridRenderer {
    private gridElement?: HTMLDivElement;
    private readonly elements = new Map<Cell, HTMLDivElement>();

    constructor(
        private readonly grid: Grid,
        private readonly rootElement: HTMLElement,
        private readonly selectionRect: SelectionRect,
    ) {
        eventBus.on(
            "entitySpawned",
            ({ cell }) => {
                this.updateCell(cell);
            }
        );

        eventBus.on(
            "entityDestroyed",
            ({ cell }) => {
                this.updateCell(cell);
            }
        );

        eventBus.on(
            "entityDamaged",
            ({ cell }) => {
                this.shakeCell(cell);
            }
        );

        eventBus.on(
            "cellChanged",
            (cell) => {
                this.updateCell(cell);
            }
        );

        eventBus.on(
            "selectionChanged",
            () => {
                this.highlightSelection();
            }
        );
    }

    public setVisible(visible: boolean): void {
        if (this.gridElement) {
            this.gridElement.style.display = visible ? "grid" : "none";
        }
    }

    public render(): void {
        if (this.gridElement) {
            return;
        }

        const gridElement = document.createElement("div");
        gridElement.className = "grid";
        gridElement.style.gridTemplateColumns = `repeat(${this.grid.width}, 1fr)`;
        gridElement.style.gridTemplateRows = `repeat(${this.grid.height}, 1fr)`;

        this.grid.forEachCells(cell => {
            const cellElement = document.createElement("div");
            cellElement.className = "cell";

            gridElement.appendChild(cellElement);
            this.elements.set(cell, cellElement);
        });

        this.rootElement.appendChild(gridElement);
        this.gridElement = gridElement;

        this.highlightSelection();
    }

    public updateCell(cell: Cell): void {
        const element = this.elements.get(cell);
        if (!element) return;

        if (cell.entity instanceof Virus) {
            element.style.setProperty("--graphic", `"${cell.entity.graphic}"`);
        } else if (cell.entity) {
            element.style.setProperty("--graphic", '"🦠"');
        } else {
            element.style.setProperty("--graphic", '""');
        }
    }

    private highlightSelection(): void {
        const selectedCells = new Set(this.selectionRect.getCells());

        this.grid.forEachCells(cell => {
            const element = this.elements.get(cell);
            if (!element) return;

            if (selectedCells.has(cell)) {
                element.classList.add("selected");
            } else {
                element.classList.remove("selected");
            }
        });
    }

    private shakeCell(cell: Cell): void {
        const element = this.elements.get(cell);
        if (!element) return;

        element.classList.remove("shake");
        // Force reflow to restart the animation
        void element.offsetWidth;
        element.classList.add("shake");
    }
}