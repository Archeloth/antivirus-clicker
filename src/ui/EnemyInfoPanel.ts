import { ENEMY_INFO } from "../data/enemies";

export class EnemyInfoPanel {
    private readonly panelElement: HTMLDivElement;

    constructor(
        private readonly rootElement: HTMLElement,
    ) {
        this.panelElement = document.createElement("div");
        this.panelElement.className = "enemy-info-panel";
    }

    public render(): void {
        this.panelElement.innerHTML = "";

        const title = document.createElement("h3");
        title.className = "enemy-info-title";
        title.textContent = "ENEMY DATABASE";
        this.panelElement.appendChild(title);

        ENEMY_INFO.forEach(enemy => {
            const entry = document.createElement("div");
            entry.className = "enemy-info-entry";

            const header = document.createElement("div");
            header.className = "enemy-info-header";

            const graphic = document.createElement("span");
            graphic.className = "enemy-info-graphic";
            graphic.textContent = enemy.graphic;

            const name = document.createElement("span");
            name.className = "enemy-info-name";
            name.textContent = enemy.name;

            header.appendChild(graphic);
            header.appendChild(name);
            entry.appendChild(header);

            const stats = document.createElement("div");
            stats.className = "enemy-info-stats";
            stats.textContent = `HP: ${enemy.health} | Reward: ${enemy.reward}`;
            entry.appendChild(stats);

            const specialty = document.createElement("div");
            specialty.className = "enemy-info-specialty";
            specialty.textContent = enemy.specialty;
            entry.appendChild(specialty);

            this.panelElement.appendChild(entry);
        });

        this.rootElement.appendChild(this.panelElement);
    }
}