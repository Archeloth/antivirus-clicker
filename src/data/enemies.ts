export interface EnemyInfo {
    graphic: string;
    name: string;
    health: number;
    reward: number;
    specialty: string;
}

export const ENEMY_INFO: EnemyInfo[] = [
    {
        graphic: "🦠",
        name: "Bug",
        health: 50,
        reward: 1,
        specialty: "Basic enemy. No special abilities.",
    },
    {
        graphic: "⚡",
        name: "Byte Bug",
        health: 30,
        reward: 1,
        specialty: "Weak and quick to dispatch.",
    },
    {
        graphic: "🛡️",
        name: "Syntax Error",
        health: 100,
        reward: 2,
        specialty: "Armored — takes only half damage.",
    },
    {
        graphic: "💥",
        name: "Null Pointer",
        health: 80,
        reward: 3,
        specialty: "Explodes on death, damaging adjacent cells.",
    },
    {
        graphic: "🩹",
        name: "Patch Bot",
        health: 60,
        reward: 4,
        specialty: "Heals adjacent viruses each second.",
    },
    {
        graphic: "🌱",
        name: "Worm",
        health: 50,
        reward: 1,
        specialty: "Slowly spreads copies to adjacent cells.",
    },
    {
        graphic: "🧬",
        name: "Fork Bomb",
        health: 70,
        reward: 3,
        specialty: "Splits into two weaker viruses on death.",
    },
    {
        graphic: "🧿",
        name: "Firewall",
        health: 90,
        reward: 5,
        specialty: "Shields adjacent viruses — kill it first!",
    },
    {
        graphic: "🩸",
        name: "Vampire Bug",
        health: 40,
        reward: -5,
        specialty: "Leech — killing it steals credits from you.",
    },
    {
        graphic: "👑",
        name: "Rootkit",
        health: 500,
        reward: 50,
        specialty: "Boss — armored, appears every 5th level.",
    },
];