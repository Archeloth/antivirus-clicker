import type { Game } from "../core/Game";

export class SavePanel {
    private readonly panelElement: HTMLDivElement;
    private readonly statusElement: HTMLDivElement;
    private readonly loadButton: HTMLButtonElement;
    private lastSaveTime: number | null = null;

    constructor(
        private readonly game: Game,
        private readonly rootElement: HTMLElement,
    ) {
        this.panelElement = document.createElement("div");
        this.panelElement.className = "save-panel";

        const title = document.createElement("div");
        title.className = "save-panel-title";
        title.textContent = "GAME";
        this.panelElement.appendChild(title);

        // Save button
        const saveButton = document.createElement("button");
        saveButton.className = "save-panel-button";
        saveButton.textContent = "💾 Save";
        saveButton.addEventListener("click", () => {
            this.game.getSaveManager().save(this.game);
            this.lastSaveTime = Date.now();
            this.updateStatus();
        });
        this.panelElement.appendChild(saveButton);

        // Load button
        this.loadButton = document.createElement("button");
        this.loadButton.className = "save-panel-button";
        this.loadButton.textContent = "📂 Load";
        this.loadButton.addEventListener("click", () => {
            const data = this.game.getSaveManager().load();
            if (data) {
                this.game.restoreFromSave(data);
                this.updateStatus();
            }
        });
        this.panelElement.appendChild(this.loadButton);

        // New Game button
        const newGameButton = document.createElement("button");
        newGameButton.className = "save-panel-button save-panel-button--danger";
        newGameButton.textContent = "🔄 New Game";
        newGameButton.addEventListener("click", () => {
            const confirmed = window.confirm(
                "Start a new game? This will delete your current save and progress."
            );
            if (!confirmed) return;
            this.game.getSaveManager().clear();
            this.game.resetToNewGame();
            this.lastSaveTime = null;
            this.updateStatus();
        });
        this.panelElement.appendChild(newGameButton);

        // Status line
        this.statusElement = document.createElement("div");
        this.statusElement.className = "save-panel-status";
        this.panelElement.appendChild(this.statusElement);

        this.updateStatus();
    }

    public render(): void {
        this.rootElement.appendChild(this.panelElement);
    }

    private updateStatus(): void {
        if (this.lastSaveTime !== null) {
            const date = new Date(this.lastSaveTime);
            this.statusElement.textContent = `Saved: ${date.toLocaleTimeString()}`;
        } else if (this.game.getSaveManager().hasSave()) {
            this.statusElement.textContent = "Save available";
        } else {
            this.statusElement.textContent = "No save";
        }

        this.loadButton.disabled = !this.game.getSaveManager().hasSave();
        this.loadButton.style.opacity = this.loadButton.disabled ? "0.5" : "";
        this.loadButton.style.cursor = this.loadButton.disabled ? "not-allowed" : "";
    }
}