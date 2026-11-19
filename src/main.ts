import { Game } from './core/Game';
import { STEP } from './data/balance';
import { UI } from './ui/UI';
import './style.css';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error("Couldn't find #app element");

const game = new Game();
game.load();
const ui = new UI(game, root);

// Fixed-timestep simulation, decoupled from the display refresh rate:
// the game runs at the same speed on 60Hz and 144Hz screens.
const MAX_FRAME = 0.25; // never simulate more than this per frame (tab switch, breakpoints)
let last = performance.now();
let accumulator = 0;

function frame(now: number): void {
  const dt = Math.min(MAX_FRAME, (now - last) / 1000);
  last = now;
  accumulator += dt;
  while (accumulator >= STEP) {
    game.update(STEP);
    accumulator -= STEP;
  }
  ui.render(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
