import { eventBus } from "./events";

export class PlayerState {
    private credits = 0;
    private securityLevel = 1;
    private damage = 1;

    public getCredits(): number {
        return this.credits;
    }

    public addCredits(amount: number): void {
        this.credits += amount;

        eventBus.emit(
            "creditsChanged",
            this.credits,
        );
    }

    public getSecurityLevel(): number {
        return this.securityLevel;
    }

    public setSecurityLevel(level: number): void {
        this.securityLevel = level;
    }

    public increaseSecurityLevel(): void {
        this.securityLevel += 1;
    }

    public getDamageNumber(): number {
        return this.damage;
    }
}