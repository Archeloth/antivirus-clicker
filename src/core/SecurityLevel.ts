export class SecurityLevel {
    constructor(
        public readonly levelNumber: number,
        public readonly timeLimit: number,
        public readonly spawnInterval: number,
        public readonly enemyHealthMultiplier: number,
        public readonly enemyRewardMultiplier: number,
    ) { }
}