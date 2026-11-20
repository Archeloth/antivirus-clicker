/**
 * Kernel Modules: the permanent meta tree, bought with root keys (prestige
 * currency). Modules survive "Reinstall OS". Some act immediately, others
 * (marked `runStart`) apply when a new run begins.
 *
 * Spending keys never weakens you: the passive +5%/key bonus is based on
 * lifetime keys earned, not the unspent balance.
 */
export interface ModuleDef {
  id: string;
  name: string;
  description: string;
  /** Key cost of each level; length = max level. */
  costs: readonly number[];
  /** Applies at the start of the next run rather than immediately. */
  runStart?: boolean;
  effect: (level: number) => string;
}

export const ABILITY_IDS = ['emp', 'logic-bomb', 'overdrive', 'firewall', 'miner'] as const;

export const MODULES: readonly ModuleDef[] = [
  {
    id: 'toolkit',
    name: 'Preinstalled Toolkit',
    description: 'New runs start with abilities and Target Lock already unlocked.',
    costs: [20, 300],
    runStart: true,
    effect: (l) => (l === 0 ? 'none' : l === 1 ? 'EMP, Logic Bomb, Target Lock' : 'all abilities + Target Lock'),
  },
  {
    id: 'funds',
    name: 'Bootstrap Funds',
    description: 'New runs start with seed credits.',
    costs: [10, 80, 600, 4000],
    runStart: true,
    effect: (l) => (l === 0 ? '0 ¢' : `${(100 * Math.pow(10, l - 1)).toLocaleString('en-US')} ¢`),
  },
  {
    id: 'fastboot',
    name: 'Fast Boot',
    description: 'New runs unlock levels up to 4 / 9 / 14 immediately.',
    costs: [40, 400, 3000],
    runStart: true,
    effect: (l) => (l === 0 ? 'level 1' : `level ${5 * l - 1}`),
  },
  {
    id: 'hotkeys',
    name: 'Hot Keys',
    description: '+1 base hacks per second.',
    costs: [25, 100, 400, 1500, 6000],
    effect: (l) => `+${l}/s`,
  },
  {
    id: 'scheduler',
    name: 'Async Scheduler',
    description: '−10% ability cooldowns.',
    costs: [20, 80, 300, 1200, 5000],
    effect: (l) => `−${l * 10}%`,
  },
  {
    id: 'pkgmgr',
    name: 'Package Manager',
    description: 'Auto-buys the cheapest affordable stat upgrade on a timer (toggle in SYSTEM).',
    costs: [60, 500, 4000],
    effect: (l) => (l === 0 ? 'off' : `every ${MODULE_F.autoBuyInterval(l)}s`),
  },
  {
    id: 'bounty',
    name: 'Bounty Program',
    description: '×2 credits from bosses per level.',
    costs: [30, 250, 2000],
    effect: (l) => `×${Math.pow(2, l)}`,
  },
  {
    id: 'kdaemon',
    name: 'Kernel Daemon',
    description: 'Wide-Area Network can be upgraded one more time (5×5 zone).',
    costs: [2500],
    effect: (l) => (l === 0 ? 'max 4×4' : 'max 5×5'),
  },
];

export const MODULE_F = {
  hackRateBonus: (l: number) => l,
  cooldownMult: (l: number) => 1 - 0.1 * l,
  autoBuyInterval: (l: number) => [0, 10, 5, 2][l] ?? 2,
  bossRewardMult: (l: number) => Math.pow(2, l),
  startCredits: (l: number) => (l === 0 ? 0 : 100 * Math.pow(10, l - 1)),
  /** Highest level unlocked at run start. */
  startLevel: (l: number) => (l === 0 ? 1 : 5 * l - 1),
};

export const MODULE_BY_ID = new Map(MODULES.map((m) => [m.id, m]));

/** Extra max levels some modules grant to regular upgrades. */
export const UPGRADE_MAX_BONUS: Record<string, string> = { wan: 'kdaemon' };
