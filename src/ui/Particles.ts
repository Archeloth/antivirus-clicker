interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const MAX_PARTICLES = 400;
const GLYPHS = ['0', '1'];

/**
 * Pooled Canvas 2D particles drawn over the grid. Coordinates are in grid
 * units (0..width) so they are independent of the on-screen size.
 */
export class Particles {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly pool: Particle[] = [];
  private readonly live: Particle[] = [];
  private pxPerUnit = 1;
  private dpr = 1;
  private dirty = false;

  constructor(private readonly gridUnits: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'particles';
    this.ctx = this.canvas.getContext('2d');
    new ResizeObserver(() => this.resize()).observe(this.canvas);
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * this.dpr));
    this.pxPerUnit = (rect.width * this.dpr) / this.gridUnits;
  }

  /** Burst at the center of grid cell (cx, cy). */
  burst(cx: number, cy: number, color: string, count: number, speed = 2.2): void {
    for (let i = 0; i < count && this.live.length < MAX_PARTICLES; i++) {
      const p = this.pool.pop() ?? ({} as Particle);
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      p.x = cx + 0.5;
      p.y = cy + 0.5;
      p.vx = Math.cos(angle) * v;
      p.vy = Math.sin(angle) * v - 0.6;
      p.maxLife = p.life = 0.45 + Math.random() * 0.4;
      p.color = color;
      p.size = 0.13 + Math.random() * 0.1;
      this.live.push(p);
    }
  }

  clear(): void {
    this.pool.push(...this.live);
    this.live.length = 0;
    this.dirty = true;
  }

  update(dt: number): void {
    const ctx = this.ctx;
    if (!ctx || (this.live.length === 0 && !this.dirty)) return;
    this.dirty = this.live.length > 0;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const unit = this.pxPerUnit;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i]!;
      p.life -= dt;
      if (p.life <= 0) {
        this.live[i] = this.live[this.live.length - 1]!;
        this.live.pop();
        this.pool.push(p);
        continue;
      }
      p.vy += 4 * dt;
      p.vx *= 0.97;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.font = `${Math.round(p.size * 2.2 * unit)}px ui-monospace, monospace`;
      ctx.fillText(GLYPHS[(p.size * 100) & 1]!, p.x * unit, p.y * unit);
    }
    ctx.globalAlpha = 1;
  }
}
