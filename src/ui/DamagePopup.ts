import type { Cell } from "../core/Cell";
import { eventBus } from "../core/events";
import type { GridRenderer } from "./GridRenderer";

/**
 * Manages floating damage and credit popups that appear above cells.
 */
export class DamagePopupManager {
    private readonly popups: HTMLDivElement[] = [];

    constructor(
        private readonly rootElement: HTMLElement,
        private readonly gridRenderer: GridRenderer,
    ) {
        eventBus.on("entityDamaged", ({ cell, damage }) => {
            this.createDamagePopup(cell, damage);
        });

        eventBus.on("creditsCollected", ({ cell, amount }) => {
            this.createCreditPopup(cell, amount);
        });
    }

    private createDamagePopup(cell: Cell, damage: number): void {
        const element = this.gridRenderer.getCellElement(cell);
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const popup = this.createPopup(
            `-${damage}`,
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
            "damage-popup",
        );
        this.popups.push(popup);
    }

    private createCreditPopup(cell: Cell, amount: number): void {
        const element = this.gridRenderer.getCellElement(cell);
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const text = amount >= 0 ? `+${amount}` : `${amount}`;
        const className = amount >= 0 ? "credit-popup" : "credit-popup credit-popup--negative";
        const popup = this.createPopup(
            text,
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
            className,
        );
        this.popups.push(popup);
    }

    private createPopup(text: string, x: number, y: number, className: string): HTMLDivElement {
        const popup = document.createElement("div");
        popup.className = className;
        popup.textContent = text;
        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;
        this.rootElement.appendChild(popup);

        // Remove after animation completes
        setTimeout(() => {
            popup.remove();
            const index = this.popups.indexOf(popup);
            if (index > -1) this.popups.splice(index, 1);
        }, 1000);

        return popup;
    }
}
