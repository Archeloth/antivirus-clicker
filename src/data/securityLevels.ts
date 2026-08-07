import { SecurityLevel } from "../core/SecurityLevel";

/**
 * Generates a security level configuration with increasing difficulty.
 * Later levels spawn viruses faster and with tougher stats.
 */
export function getSecurityLevel(level: number): SecurityLevel {
    const timeLimit = 30; // seconds, constant for a relaxed pace
    const spawnInterval = Math.max(20, 120 - (level - 1) * 10); // frames between spawns, faster on later levels
    const enemyHealthMultiplier = 1 + (level - 1) * 0.25;
    const enemyRewardMultiplier = 1 + (level - 1) * 0.25;

    return new SecurityLevel(
        level,
        timeLimit,
        spawnInterval,
        enemyHealthMultiplier,
        enemyRewardMultiplier,
    );
}