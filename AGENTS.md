# antivirus.exe: Project Context

> Context file for agents working on this repo. Read this first.
> Last updated: 2026-11-19 (v0.2 "overhaul"). Keep it current when the design or architecture changes.

## 1. Pitch & pillars

An incremental, **keyboard-first** game in the browser. You are a sysadmin defending a machine from viruses and malicious code. You move a **cursor** and **hold Space** to hack threats while an automated **scan daemon** sweeps a zone of the grid. Every wave earns credits for upgrades, a boss arrives every 5 levels, and a prestige reset ("Reinstall OS") lets you push further.

Non-negotiable pillars:

1. **Near-zero dependencies.** Runtime has **no** npm dependencies; devDeps are only Vite, TypeScript, ESLint and Prettier. Do not add a framework, engine or UI/state library. Audio is synthesized WebAudio, particles are Canvas 2D, and the UI is plain DOM.
2. **Renders very fast.** Game logic runs on a fixed timestep. The UI renders once per animation frame and writes only DOM *diffs* (see `DomCache`). Hot paths must not allocate per frame or cause layout thrash; don't call `getBoundingClientRect` per hit.
3. **Hacker / programmer theme everywhere.** Copy, names and visuals read like a terminal or security tool. Enemies are 3-letter tags in colored chips, not OS emoji.
4. **Incremental feel.** Core stats are uncapped with geometric costs, numbers format as K/M/B…, and automation (Heuristic Scan) gradually replaces manual input.
5. **Bosses are events.** Each boss has a mechanic, not just more HP.

## 2. Decisions taken (owner-confirmed)

- **Hack + daemon split**: yes. Hacking is the manual verb, and the daemon zone is automation.
- **Keyboard-first, no mashing** (2026-11-20): spam-clicking caused finger/mouse strain. The manual attack is a **hold-to-hack cursor**: hits fire at a fixed `hackRate` while held, and pressing faster never helps. Never add a mechanic where input speed is a stat. The mouse stays optional and mirrors the keyboard (hover = cursor, hold = hack).
- **Player HP stays** (called **Integrity**). Threats damage it every second and bosses slam it; at 0 the wave fails. It is visible, and it's what makes bosses dangerous.

## 3. Commands

| Command | What |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc` typecheck + production build (`dist/`, ~65 KB JS) |
| `npm run typecheck` / `npm run lint` | tsc / ESLint (`eslint.config.mjs`) |
| `npm run sim -- --react 0.5 --until 40 --hours 2` | **Headless balance sim**: a scripted bot plays the real game logic and prints per-level tries, wave time, HP left, credits and damage. Run it after any balance change. Output goes in `.sim/` (gitignored). |

## 4. Architecture

```
src/
  main.ts                  boot + fixed-timestep loop (STEP = 1/60 s, frame dt clamped to 0.25 s)
  core/
    Game.ts                orchestrator: owns state + systems, phase machine, player actions, shop, prestige, save
    EventBus.ts            typed pub/sub, one instance per Game (`game.bus`)
    GameEvents.ts          discrete events only (spawn/damage/kill/wave/boss/log…); continuous state is read directly
    Grid.ts, Cell.ts       8×8 grid, index lookup, cached neighbors; a Cell holds a Virus and/or Pickup
    PlayerState.ts         persistent progress + ALL derived stats (getters) + save (de)serialization/migration
    SaveManager.ts         localStorage wrapper + export/import encoding
  data/                    ← every tunable number lives here
    balance.ts             level scaling curves, wave size/spawn rate, prestige formula, global constants
    viruses.ts             VIRUSES + BOSSES definitions (single source of truth for spawn, render, Threat DB)
    upgrades.ts            stat formulas `F` + UPGRADES (shop) — shop previews and stats use the same functions
    abilities.ts           5 active abilities + their constants
    achievements.ts        achievement defs (each +2% credits)
  entities/Virus.ts        plain state object + createVirus/createBoss (applies level scaling)
  system/                  game logic; each system gets the Game in its constructor
    CombatSystem.ts        THE ONLY place damage/kills happen (shield, armor, immunity, rewards, death effects, chain)
    WaveSystem.ts          spawn budget per wave, weighted pick by level, cleared check
    VirusBehaviorSystem.ts per-second attacks + traits (hop/heal/spread/encrypt/drain/trojan fuse)
    BossSystem.ts          boss attacks/slams + gimmicks (rootkit/botnet/polymorph/zeroday)
    DaemonSystem.ts        zone position, tick damage, Heuristic auto-targeting
    HackSystem.ts          cursor, hold-to-hack rate limiting, focus ramp, Tab cycling, Target Lock priority
    AbilitySystem.ts       cooldowns + effects
    PickupSystem.ts        click-only data packets
    AchievementSystem.ts   periodic checks
  ui/                      DOM only; reads game state each frame, listens to game.bus for effects
    UI.ts                  layout (topbar / status | board | tabs), keyboard, per-frame render dispatch
    GridView.ts            cells (diffed), daemon overlay, input; owns Particles + Popups
    StatusPanel.ts, WaveBar.ts, Overlay.ts, LogPanel.ts, Toasts.ts
    ShopTab.ts, ThreatTab.ts, SystemTab.ts
    Sfx.ts                 synthesized sound effects
    Particles.ts           pooled canvas particles; Popups.ts pooled floating text
    dom.ts                 h() element factory, setText/setClass, DomCache
scripts/sim.ts             headless balance bot (bundled with rolldown, run with node)
```

**Rules:**
- Game logic (`core/`, `system/`, `data/`, `entities/`) must not touch the DOM or storage directly. The sim runs it in Node.
- All damage goes through `CombatSystem.damage()` / `kill()`. Never set `cell.virus = undefined` to "kill" something.
- New stat → add a formula to `F` in `data/upgrades.ts`, a getter in `PlayerState`, and an upgrade def.
- New enemy → add a `VirusDef` (and a trait in `VirusBehaviorSystem`/`CombatSystem` if needed). Rendering and the Threat DB pick it up automatically.
- Durations are in **seconds**, never frames.

## 5. Gameplay (as built)

**Loop:** Intermission (shop, level select, tutorial/boss/new-threat briefing) → **Deploy** → wave → cleared (bonus credits, next level unlocked) or breached (integrity 0 → retry, credits kept). Optional auto-deploy. Players can replay any unlocked level to farm. Reloading always lands in the intermission screen. Only persistent progress is saved, never mid-wave state.

**Controls (keyboard-first):** arrows/WASD move the cursor · `Tab`/`Shift+Tab` jump to next/previous threat · **hold `Space`** to hack at `hackRate` (auto-repeat ignored) · `E` sends the daemon to the cursor · `1–5` abilities · `Enter` deploy · `P`/`Esc` pause · `M` mute. Mouse: hover moves the cursor, holding the button hacks, right-click / shift-click sends the daemon. Touch: press-and-hold hacks, tapping an empty cell sends the daemon. Holding is released on window blur, tab hide and pause. The game auto-pauses when the tab is hidden.

**Hacking** (`system/HackSystem.ts`): hits fire every `1/hackRate` s while held, and one hit is banked while idle, so a fresh press is instant but mashing never beats the rate. **Focus**: staying on one target ramps damage from ×1 to `focusCap` over 1.5s, then resets on target change or kill. **Target Lock** (upgrade) auto-moves the cursor to `bestTarget()` after a kill. Upgrades: Keyboard Macro (rate), Deep Inspection (focus cap), Target Lock.

**Threats** (first level in parentheses): Bug (1) · Byte Bug, hops (2) · Syntax Error, flat armor (3) · Null Pointer, explodes 30% max HP into neighbors (4) · Patch Bot, heals neighbors (6) · Worm, replicates (7) · Fork Bomb, splits (8) · Trojan, disguised as a packet: click it before its 5s fuse for double credits (9) · Obfuscator, neighbors take −60% damage (11) · Vampire Bug, drains credits and refunds 150% on kill (12) · Ransomware, encrypts neighbors so they're immune to the daemon but clickable (13). Children and copies are generation 1 and lose their trait.

**Bosses** (every 5 levels, cycling after 20): **Rootkit** hides and can only be damaged after the daemon sweeps over it; it burrows every 7s. **Botnet** core is immune while nodes live; killing all nodes exposes it for 12s, then all nodes reconnect. **Polymorphic Engine** alternates click/daemon immunity every 6s and spawns minions. **Zero-Day** (L20) runs rootkit, then botnet, then polymorph phases by HP; beating it shows the victory screen (endless continues). Killing a boss purges the rest of the wave.

**Abilities** (one-time unlocks gated by level): EMP Blast (25% max HP to all, 5% vs bosses) · Logic Bomb (10× click dmg, 3×3 at daemon) · Overdrive (×2 damage 8s) · Firewall (freeze threats 6s) · Crypto Miner (credits).

**Prestige:** "Reinstall OS" from 10 cleared levels. Keys = `floor(3 · 1.18^(cleared−10))`, each +5% damage & credits. It resets credits, levels and upgrades, and keeps keys, achievements, stats and settings.

**Balance snapshot** (sim, hold-to-hack, 0.3–1.0s reaction): L10 at about 5 min, L20 at about 11 min, L30 at about 15 min, and a first wall around L35–40 (prestige about 50–60 min, +~300 keys). Bosses are the main difficulty spikes, the Botnet (L10/L30) hardest.

## 6. Save format

`localStorage['antivirus-clicker-save']` = `PlayerState.toSave()` (`v: 3`). `fromSave()` validates every field. It migrates v2 by renaming `stats.clicks` → `hacks` and achievement `clicks-1000` → `hacks-1000`, and v1 (pre-overhaul) saves by keeping credits + level. Bump `SAVE_VERSION` and add a migration branch for breaking changes. Export/import uses base64(URI-encoded JSON).

## 7. Known gaps / next steps

- [ ] **Balance pass by a human.** The sim bot is a stand-in. Watch for: early L5 Rootkit difficulty for slow clickers, the Botnet spike, mid-levels (11–19) feeling easy between bosses, and late boss fights running long (60–80s at L35+).
- [ ] Meta upgrade tree to spend root keys on (currently keys are a passive multiplier only).
- [ ] Offline progress (undecided).
- [ ] Rebindable keys; gamepad (not planned).
- [ ] Touch: daemon moves by tapping empty cells only. Consider a drag gesture.
- [x] Accessibility: the game is fully playable with the keyboard alone (hold-to-hack cursor).
- [ ] Unit tests: none yet. `npm run sim` is the current smoke test (it exercises every system, all bosses and prestige).
- [ ] Achievements are checked by polling every 0.5s; fine at this size.

## 8. Conventions

- TypeScript strict + `noUncheckedIndexedAccess`; avoid enums (use string unions); `import type` for types.
- Prettier config: single quotes, semicolons, trailing commas.
- Keep `npm run typecheck`, `npm run lint` and `npm run build` green; run `npm run sim` after balance edits.
- Dark theme only; colors are CSS custom properties on `:root` in `src/style.css`. Respect the Reduced-motion setting and `prefers-reduced-motion`.
