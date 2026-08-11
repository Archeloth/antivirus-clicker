export interface AbilityDefinition {
    id: string;
    name: string;
    key: string;
    description: string;
    cooldown: number; // in seconds
}

export const ABILITIES: AbilityDefinition[] = [
    {
        id: "emp-blast",
        name: "EMP Blast",
        key: "Q",
        description: "Deal 50 damage to all viruses on the grid",
        cooldown: 20,
    },
    {
        id: "nuke",
        name: "Nuke",
        key: "E",
        description: "Deal 100 damage to all viruses in a 3×3 around the selection zone",
        cooldown: 30,
    },
    {
        id: "overdrive",
        name: "Overdrive",
        key: "R",
        description: "Double damage for 5 seconds",
        cooldown: 25,
    },
    {
        id: "firewall",
        name: "Firewall",
        key: "F",
        description: "Freeze all virus spread and healing for 5 seconds",
        cooldown: 20,
    },
    {
        id: "credit-surge",
        name: "Credit Surge",
        key: "T",
        description: "Instantly gain 50 credits",
        cooldown: 40,
    },
];