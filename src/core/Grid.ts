import { getRandomInt } from "../utils/random";
import { Cell } from "./Cell";

/**
 * Abstraction of the playable grid
 * @param width
 * @param height
 */
export class Grid {
    public readonly width: number;
    public readonly height: number;

    private readonly cells: Cell[] = [];

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;

        this.createCells();
    }

    public forEachCells(callback: (cell: Cell) => void): void {

        this.cells.forEach(callback);
    
    }

    private createCells(): void {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.cells.push(new Cell(x, y));
            }
        }
    }

    public getCell(x: number, y: number): Cell | undefined {
        return this.cells.find(cell => cell.x === x && cell.y === y)
    }

    public getRandomEmptyCell(): Cell | undefined {
        const emptyCells = this.cells.filter(cell => !cell.hasEntity());
        if (emptyCells.length === 0) return undefined;
        
        const randomIndex = getRandomInt(emptyCells.length);
        return emptyCells[randomIndex];
    }
}