import type { Cell } from "../core/Cell";
import type { Grid } from "../core/Grid";
import { eventBus } from "../core/events";

export class GridRenderer {
    constructor(
        private readonly grid: Grid,
        private readonly rootElement: HTMLElement,
        private readonly onCellClick: (cell: Cell) => void,
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
    }

    private gridElement?: HTMLDivElement;
    private readonly elements = new Map<Cell, HTMLDivElement>();

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

            cellElement.addEventListener("click", () => {
                this.onCellClick(cell)
            });

            gridElement.appendChild(cellElement);
            this.elements.set(cell, cellElement);
        });

        this.rootElement.appendChild(gridElement);
        this.gridElement = gridElement;
    }

    public updateCell(cell: Cell): void {
        const element = this.elements.get(cell);
        if (!element) return;

        element.textContent = cell.entity ? "🦠" : "";
    }
}