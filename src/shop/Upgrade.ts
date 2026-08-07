export class Upgrade {

    private level = 0;

    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly description: string,
        public readonly baseCost: number,
        public readonly costMultiplier: number,
        public readonly purchase: () => void,
    ) { }

    public get cost(): number {
        return Math.round(this.baseCost * Math.pow(this.costMultiplier, this.level));
    }

    public getLevel(): number {
        return this.level;
    }

    public buy(): void {
        this.purchase();
        this.level++;
    }
}