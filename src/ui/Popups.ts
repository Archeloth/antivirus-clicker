const POOL_SIZE = 48;

/**
 * Floating combat text. A fixed pool of nodes positioned in grid percentages
 * (no layout reads) and animated with the Web Animations API.
 */
export class Popups {
  readonly layer: HTMLDivElement;
  private readonly free: HTMLDivElement[] = [];

  constructor(private readonly gridUnits: number) {
    this.layer = document.createElement('div');
    this.layer.className = 'popups';
    for (let i = 0; i < POOL_SIZE; i++) {
      const el = document.createElement('div');
      el.className = 'popup';
      el.style.display = 'none';
      this.layer.appendChild(el);
      this.free.push(el);
    }
  }

  show(cx: number, cy: number, text: string, kind: string): void {
    const el = this.free.pop();
    if (!el) return;
    const jitter = (Math.random() - 0.5) * 0.5;
    el.textContent = text;
    el.className = `popup popup--${kind}`;
    el.style.left = `${((cx + 0.5 + jitter) / this.gridUnits) * 100}%`;
    el.style.top = `${((cy + 0.35) / this.gridUnits) * 100}%`;
    el.style.display = '';
    const anim = el.animate(
      [
        { transform: 'translate(-50%, 0) scale(1.15)', opacity: 1 },
        { transform: 'translate(-50%, -140%) scale(1)', opacity: 1, offset: 0.6 },
        { transform: 'translate(-50%, -200%) scale(0.9)', opacity: 0 },
      ],
      { duration: kind === 'crit' || kind === 'credit' ? 900 : 650, easing: 'ease-out' },
    );
    anim.onfinish = () => {
      el.style.display = 'none';
      this.free.push(el);
    };
  }
}
