import type { Cell } from "./Cell";
import type { Grid } from "./Grid";

export interface SelectionRectData {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * A rectangular zone on the grid that the player moves with arrow keys.
 * All cells inside the zone take ticking damage.
 */
export class SelectionRect {
    private x: number;
    private y: number;
    private width: number;
    private height: number;

    constructor(
        private readonly grid: Grid,
        initialWidth = 2,
        initialHeight = 2,
    ) {
        this.x = 0;
        this.y = 0;
        this.width = initialWidth;
        this.height = initialHeight;
    }

    public getX(): number {
        return this.x;
    }

    public getY(): number {
        return this.y;
    }

    public getWidth(): number {
        return this.width;
    }

    public getHeight(): number {
        return this.height;
    }

    public serialize(): SelectionRectData {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
        };
    }

    public deserialize(data: SelectionRectData): void {
        this.x = data.x;
        this.y = data.y;
        this.width = data.width;
        this.height = data.height;
    }

    public move(dx: number, dy: number): void {
        this.x = Math.max(0, Math.min(this.grid.width - this.width, this.x + dx));
        this.y = Math.max(0, Math.min(this.grid.height - this.height, this.y + dy));
    }

    public setSize(width: number, height: number): void {
        this.width = Math.max(1, Math.min(this.grid.width, width));
        this.height = Math.max(1, Math.min(this.grid.height, height));

        // Re-clamp position in case the size change pushed us off-grid
        this.x = Math.max(0, Math.min(this.grid.width - this.width, this.x));
        this.y = Math.max(0, Math.min(this.grid.height - this.height, this.y));
    }

    public getCells(): Cell[] {
        const cells: Cell[] = [];

        for (let y = this.y; y < this.y + this.height; y++) {
            for (let x = this.x; x < this.x + this.width; x++) {
                const cell = this.grid.getCell(x, y);
                if (cell) {
                    cells.push(cell);
                }
            }
        }

        return cells;
    }
}