import type { Game } from '../core/Game';

/**
 * Synthesized sound effects (WebAudio, no asset files). The context is created
 * lazily on the first user gesture, as browsers require.
 */
export class Sfx {
  private ctx?: AudioContext;
  private master?: GainNode;
  private noiseBuffer?: AudioBuffer;
  private readonly lastPlayed = new Map<string, number>();

  constructor(private readonly game: Game) {
    const unlock = () => this.ensure();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    const bus = game.bus;
    bus.on('virusDamaged', ({ source, crit }) => {
      if (crit) this.play('crit', 30, () => this.tone(1700, 0.07, 'square', 0.09, 2600));
      else if (source === 'hack') this.play('hack', 25, () => this.tone(1150, 0.03, 'square', 0.05));
    });
    bus.on('daemonPulse', () => this.play('pulse', 120, () => this.tone(180, 0.04, 'sine', 0.04, 140)));
    bus.on('virusKilled', ({ source }) => {
      if (source === 'purge') this.play('purge', 60, () => this.tone(500, 0.05, 'triangle', 0.05, 900));
      else this.play('kill', 35, () => this.tone(520, 0.08, 'triangle', 0.1, 1040));
    });
    bus.on('damageBlocked', () => this.play('blocked', 90, () => this.tone(140, 0.05, 'square', 0.05)));
    bus.on('pickupCollected', () => this.arp([880, 1320, 1760], 0.05, 'square', 0.06));
    bus.on('playerHit', ({ heavy }) => {
      if (heavy) {
        this.noise(0.25, 0.18);
        this.tone(90, 0.3, 'sawtooth', 0.12, 45);
      } else {
        this.play('hit', 160, () => this.tone(150, 0.05, 'square', 0.035, 110));
      }
    });
    bus.on('abilityUsed', () => this.tone(220, 0.3, 'sawtooth', 0.09, 1400));
    bus.on('waveStarted', ({ boss }) =>
      boss ? this.tone(55, 0.9, 'sawtooth', 0.14, 40) : this.arp([330, 440], 0.07, 'square', 0.06),
    );
    bus.on('waveCleared', () => this.arp([523, 659, 784, 1046], 0.09, 'square', 0.07));
    bus.on('waveFailed', () => this.tone(400, 0.7, 'sawtooth', 0.12, 70));
    bus.on('purchased', () => this.play('buy', 40, () => this.tone(660, 0.06, 'square', 0.07, 990)));
    bus.on('achievement', () => this.arp([1046, 1318, 1568, 2093], 0.08, 'triangle', 0.08));
    bus.on('bossKilled', () => this.arp([392, 523, 659, 784, 1046, 1318], 0.08, 'square', 0.08));
  }

  private ensure(): AudioContext | undefined {
    if (!this.ctx) {
      const Ctor = window.AudioContext;
      if (!Ctor) return undefined;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private get enabled(): boolean {
    const s = this.game.player.settings;
    return !s.muted && s.volume > 0 && this.ctx !== undefined && this.ctx.state === 'running';
  }

  /** Throttle a named sound to at most once per `minMs`. */
  private play(name: string, minMs: number, fn: () => void): void {
    const now = performance.now();
    if (now - (this.lastPlayed.get(name) ?? 0) < minMs) return;
    this.lastPlayed.set(name, now);
    fn();
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0): void {
    if (!this.enabled) return;
    const ctx = this.ctx!;
    this.master!.gain.value = this.game.player.settings.volume;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private arp(freqs: number[], step: number, type: OscillatorType, vol: number): void {
    freqs.forEach((f, i) => this.tone(f, step * 1.6, type, vol, undefined, i * step));
  }

  private noise(dur: number, vol: number): void {
    if (!this.enabled) return;
    const ctx = this.ctx!;
    if (!this.noiseBuffer) {
      this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = this.noiseBuffer;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    src.connect(gain).connect(this.master!);
    src.start();
    src.stop(ctx.currentTime + dur);
  }
}
