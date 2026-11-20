/**
 * Wave modifiers: from MODIFIER_MIN_LEVEL, non-boss waves may roll one. They are
 * announced in the intermission briefing and multiply the wave's credit rewards.
 */
export interface ModifierDef {
  id: string;
  name: string;
  description: string;
  /** Multiplier on kill credits and the wave-clear bonus. */
  reward: number;
  sizeMult?: number;
  spawnIntervalMult?: number;
  hpMult?: number;
  /** Flat armor added to every threat (level-1 units, scaled like armor). */
  armorBonus?: number;
  /** Every spawn arrives encrypted: immune to the daemon, hack only. */
  encrypted?: boolean;
  /** Every spawn is cloaked until the daemon sweeps over it. */
  stealth?: boolean;
  daemonIntervalMult?: number;
  packetMult?: number;
}

export const MODIFIER_MIN_LEVEL = 12;
export const MODIFIER_CHANCE = 0.35;
/** Sentinel `encryptedBy` value for wave-encrypted threats (no Ransomware to kill). */
export const WAVE_ENCRYPTION = -1;

export const MODIFIERS: readonly ModifierDef[] = [
  {
    id: 'ddos',
    name: 'DDoS',
    description: 'Threats flood in 50% faster, and 30% more of them.',
    reward: 1.6,
    sizeMult: 1.3,
    spawnIntervalMult: 0.65,
  },
  {
    id: 'encrypted',
    name: 'Encrypted Payload',
    description: 'Every threat arrives encrypted: the daemon cannot touch them. Hack only.',
    reward: 1.8,
    encrypted: true,
  },
  {
    id: 'stealth',
    name: 'Stealth Mode',
    description: 'Threats are cloaked until your daemon sweeps over them. Steer it with [E].',
    reward: 1.5,
    stealth: true,
  },
  {
    id: 'lag',
    name: 'Lag Spike',
    description: 'Your daemon ticks at half speed.',
    reward: 1.4,
    daemonIntervalMult: 2,
  },
  {
    id: 'hardened',
    name: 'Hardened Binaries',
    description: 'Every threat gains heavy armor. Build up focus for big hits.',
    reward: 1.6,
    armorBonus: 1.5,
  },
  {
    id: 'swarm',
    name: 'Swarm',
    description: 'Twice as many threats with half the HP.',
    reward: 1.3,
    sizeMult: 2,
    hpMult: 0.5,
  },
  {
    id: 'storm',
    name: 'Packet Storm',
    description: 'Data packets everywhere. Grab them while they last.',
    reward: 1,
    packetMult: 3,
  },
];
