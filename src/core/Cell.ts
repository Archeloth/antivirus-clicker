import type { Virus } from '../entities/Virus';

/** A data packet. Only hacking collects it — the daemon ignores packets. */
export interface Pickup {
  value: number;
  ttl: number;
}

export class Cell {
  virus?: Virus;
  pickup?: Pickup;

  constructor(
    readonly x: number,
    readonly y: number,
    readonly index: number,
  ) {}

  get isEmpty(): boolean {
    return this.virus === undefined && this.pickup === undefined;
  }
}
