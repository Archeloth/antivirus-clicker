import { Game } from './core/Game'
import './style.css'
import { UI } from './ui/UI';

const rootElement = document.querySelector<HTMLDivElement>("#app");
if (!rootElement) {
    throw new Error("Couldn't find app element")
}

const game = new Game();
const ui = new UI(game, game.getPlayerState(), rootElement);

ui.initialize();

game.start();
