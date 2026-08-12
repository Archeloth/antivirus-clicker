import { Game } from './core/Game'
import './style.css'
import { UI } from './ui/UI';

const rootElement = document.querySelector<HTMLDivElement>("#app");
if (!rootElement) {
    throw new Error("Couldn't find app element")
}

const game = new Game();

// Auto-load any existing save on startup
const saveData = game.getSaveManager().load();
if (saveData) {
    game.restoreFromSave(saveData);
}

const ui = new UI(game, game.getPlayerState(), rootElement);

ui.initialize();

game.start();