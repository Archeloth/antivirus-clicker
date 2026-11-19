/** Active abilities. `id` matches the unlocking upgrade in data/upgrades.ts. */
export interface AbilityDef {
  id: string;
  name: string;
  key: string;
  cooldown: number; // seconds
  description: string;
}

export const OVERDRIVE_DURATION = 8;
export const FIREWALL_DURATION = 6;
export const EMP_FRACTION = 0.25;
export const EMP_BOSS_FRACTION = 0.05;
export const LOGIC_BOMB_MULT = 10;
export const MINER_KILLS = 50;

export const ABILITIES: readonly AbilityDef[] = [
  { id: 'emp', name: 'EMP Blast', key: '1', cooldown: 25, description: '25% max HP to every threat' },
  { id: 'logic-bomb', name: 'Logic Bomb', key: '2', cooldown: 30, description: '10× click dmg, 3×3 at daemon' },
  { id: 'overdrive', name: 'Overdrive', key: '3', cooldown: 35, description: '×2 damage for 8s' },
  { id: 'firewall', name: 'Firewall', key: '4', cooldown: 40, description: 'Freeze threats for 6s' },
  { id: 'miner', name: 'Crypto Miner', key: '5', cooldown: 60, description: 'Instant credits' },
];
