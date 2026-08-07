import { eventBus } from "./events";

export class PlayerState {
    private credits = 0;
    private securityLevel = 1;
    private damage = 20;
    private tickInterval = 30;

    public getCredits(): number {
        return this.credits;
    }

    public addCredits(amount: number): void {
        this.credits += amount;
        eventBus.emit("creditsChanged", this.credits,);
    }

    public spendCredits(amount: number): boolean {
        if (this.credits < amount) {
            return false;
        }
        this.credits -= amount;
        eventBus.emit("creditsChanged", this.credits);
        return true;
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

    public changeDamageNumber(amount: number): void {
        this.damage = this.damage + amount;
        eventBus.emit("damageChanged", this.damage);
    }

    public getTickInterval(): number {
        return this.tickInterval;
    }

    public reduceTickInterval(amount: number): void {
        this.tickInterval = Math.max(1, this.tickInterval - amount);
        eventBus.emit("tickIntervalChanged", this.tickInterval);
    }
}
