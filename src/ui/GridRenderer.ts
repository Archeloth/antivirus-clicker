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
                const element = this.elements.get(cell);
                // If the cell is currently playing its dying animation,
                // let the animationend handler clear it instead
                if (element?.classList.contains("cell--dying")) {
                    return;
                }
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
            "entityDying",
            ({ cell }) => {
                this.playDyingAnimation(cell);
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

    public getCellElement(cell: Cell): HTMLDivElement | undefined {
        return this.elements.get(cell);
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

        // Reset effect classes
        element.classList.remove("cell--explosive", "cell--spreader", "cell--boss", "cell--healer", "cell--shielded", "cell--dying");

        // Toggle ground shadow indicator (2.5D depth)
        element.dataset.hasEntity = cell.hasEntity() ? "true" : "false";

        if (cell.entity instanceof Virus) {
            element.style.setProperty("--graphic", `"${cell.entity.graphic}"`);

            if (cell.entity.explodesOnDestroy) {
                element.classList.add("cell--explosive");
            }
            if (cell.entity.spreads) {
                element.classList.add("cell--spreader");
            }
            if (cell.entity.isBoss) {
                element.classList.add("cell--boss");
            }
            if (cell.entity.healsAdjacent) {
                element.classList.add("cell--healer");
            }
        } else if (cell.entity) {
            element.style.setProperty("--graphic", '"🦠"');
        } else {
            element.style.setProperty("--graphic", '""');
        }

        // Apply shielded effect if adjacent to a shielder
        this.updateShieldedState(cell, element);
    }

    private updateShieldedState(cell: Cell, element: HTMLDivElement): void {
        const offsets: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        let shielded = false;
        for (const [dx, dy] of offsets) {
            const neighbor = this.grid.getCell(cell.x + dx, cell.y + dy);
            const entity = neighbor?.entity;
            if (entity instanceof Virus && entity.shieldsAdjacent) {
                shielded = true;
                break;
            }
        }
        if (shielded) {
            element.classList.add("cell--shielded");
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

    private playDyingAnimation(cell: Cell): void {
        const element = this.elements.get(cell);
        if (!element) return;

        element.classList.add("cell--dying");

        // After the death animation completes, clear the cell
        const onEnd = () => {
            element.removeEventListener("animationend", onEnd);
            this.updateCell(cell);
        };
        element.addEventListener("animationend", onEnd);
    }
}