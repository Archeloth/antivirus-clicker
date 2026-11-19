import { pick } from '../utils/random';
import { Cell } from './Cell';

const OFFSETS: readonly (readonly [number, number])[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export class Grid {
  readonly cells: readonly Cell[];
  private readonly neighborCache: readonly (readonly Cell[])[];

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    const cells: Cell[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        cells.push(new Cell(x, y, y * width + x));
      }
    }
    this.cells = cells;
    this.neighborCache = cells.map((cell) =>
      OFFSETS.map(([dx, dy]) => this.get(cell.x + dx, cell.y + dy)).filter(
        (n): n is Cell => n !== undefined,
      ),
    );
  }

  get(x: number, y: number): Cell | undefined {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return undefined;
    return this.cells[y * this.width + x];
  }

  /** Orthogonal neighbors (cached). */
  neighbors(cell: Cell): readonly Cell[] {
    return this.neighborCache[cell.index] ?? [];
  }

  randomEmpty(): Cell | undefined {
    return pick(this.cells.filter((cell) => cell.isEmpty));
  }

  randomEmptyNeighbor(cell: Cell): Cell | undefined {
    return pick(this.neighbors(cell).filter((n) => n.isEmpty));
  }

  countViruses(): number {
    let count = 0;
    for (const cell of this.cells) if (cell.virus) count++;
    return count;
  }

  findVirusCell(virusId: number): Cell | undefined {
    return this.cells.find((cell) => cell.virus?.id === virusId);
  }

  clear(): void {
    for (const cell of this.cells) {
      cell.virus = undefined;
      cell.pickup = undefined;
    }
  }
}
