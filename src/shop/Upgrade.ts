export class Upgrade {

    private level = 0;

    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly description: string,
        public readonly baseCost: number,
        public readonly costMultiplier: number,
        public readonly purchase: () => void,
        public readonly maxLevel: number = Infinity,
        public readonly prerequisites: string[] = [],
    ) { }

    public get cost(): number {
        return Math.round(this.baseCost * Math.pow(this.costMultiplier, this.level));
    }

    public getLevel(): number {
        return this.level;
    }

    public isMaxed(): boolean {
        return this.level >= this.maxLevel;
    }

    public getMaxLevel(): number {
        return this.maxLevel;
    }

    public getPrerequisites(): string[] {
        return this.prerequisites;
    }

    public canUnlock(levels: Map<string, number>): boolean {
        return this.prerequisites.every((id) => (levels.get(id) ?? 0) > 0);
    }

    public buy(): void {
        this.purchase();
        this.level++;
    }

    public forceLevelUp(): void {
        this.level++;
    }

    public resetLevel(): void {
        this.level = 0;
    }
}
