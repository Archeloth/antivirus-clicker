export function randInt(max: number): number {
  return Math.floor(Math.random() * max);
}

export function chance(probability: number): boolean {
  return Math.random() < probability;
}

export function pick<T>(items: readonly T[]): T | undefined {
  return items.length === 0 ? undefined : items[randInt(items.length)];
}
