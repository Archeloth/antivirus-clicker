import type { PlayerState } from '../core/PlayerState';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  check: (p: PlayerState) => boolean;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'kills-1', name: 'Hello, World', description: 'Neutralize your first threat.', check: (p) => p.stats.kills >= 1 },
  { id: 'kills-100', name: 'Garbage Collector', description: 'Neutralize 100 threats.', check: (p) => p.stats.kills >= 100 },
  { id: 'kills-1000', name: 'Memory Leak Plugged', description: 'Neutralize 1,000 threats.', check: (p) => p.stats.kills >= 1000 },
  { id: 'kills-10000', name: 'Kernel Panic Averted', description: 'Neutralize 10,000 threats.', check: (p) => p.stats.kills >= 10000 },
  { id: 'hacks-1000', name: 'Keyboard Warrior', description: 'Land 1,000 hacks.', check: (p) => p.stats.hacks >= 1000 },
  { id: 'crits-100', name: 'Stack Smasher', description: 'Land 100 critical hacks.', check: (p) => p.stats.crits >= 100 },
  { id: 'boss-1', name: 'Rooted Out', description: 'Defeat a boss.', check: (p) => p.stats.bossesKilled >= 1 },
  { id: 'level-11', name: 'Botnet Takedown', description: 'Reach security level 11.', check: (p) => p.highestLevel >= 11 },
  { id: 'level-16', name: 'Shape Shifter', description: 'Reach security level 16.', check: (p) => p.highestLevel >= 16 },
  { id: 'victory', name: 'System Secured', description: 'Defeat the Zero-Day.', check: (p) => p.victory },
  { id: 'level-30', name: 'Five Nines Uptime', description: 'Reach security level 30.', check: (p) => p.highestLevel >= 30 },
  { id: 'credits-1e4', name: 'Crypto Curious', description: 'Earn 10K credits in total.', check: (p) => p.stats.creditsEarned >= 1e4 },
  { id: 'credits-1e6', name: 'Millionaire.exe', description: 'Earn 1M credits in total.', check: (p) => p.stats.creditsEarned >= 1e6 },
  { id: 'flawless', name: 'No Regressions', description: 'Clear a wave of level 3+ without losing integrity.', check: (p) => p.stats.flawlessWaves >= 1 },
  { id: 'chaos', name: 'Chaos Engineer', description: 'Clear 10 waves with a modifier.', check: (p) => p.stats.modifiedWaves >= 10 },
  { id: 'trojan', name: 'Not Falling For That', description: 'Quarantine a Trojan before it activates.', check: (p) => p.stats.trojansCaught >= 1 },
  { id: 'packets-50', name: 'Packet Hoarder', description: 'Collect 50 data packets.', check: (p) => p.stats.packets >= 50 },
  { id: 'prestige', name: 'Fresh Install', description: 'Reinstall the OS (prestige) once.', check: (p) => p.stats.prestiges >= 1 },
];
