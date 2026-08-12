import { eventBus } from "./events";

export interface PlayerStateData {
    credits: number;
    securityLevel: number;
    damage: number;
    tickInterval: number;
    creditBonus: number;
    damageMultiplier: number;
    chainChance: number;
    upgradeLevels: Record<string, number>;
    hp: number;
    maxHp: number;
    overdriveTimer: number;
    firewallTimer: number;
}

export class PlayerState {
    private credits = 0;
    private securityLevel = 1;
    private damage = 20;
    private tickInterval = 30;
    private creditBonus = 0;
    private damageMultiplier = 1;
    private chainChance = 0;
    private upgradeLevels = new Map<string, number>();
    private hp = 1000;
    private maxHp = 1000;
    private overdriveTimer = 0;
    private firewallTimer = 0;

    public serialize(): PlayerStateData {
        return {
            credits: this.credits,
            securityLevel: this.securityLevel,
            damage: this.damage,
            tickInterval: this.tickInterval,
            creditBonus: this.creditBonus,
            damageMultiplier: this.damageMultiplier,
            chainChance: this.chainChance,
            upgradeLevels: Object.fromEntries(this.upgradeLevels),
            hp: this.hp,
            maxHp: this.maxHp,
            overdriveTimer: this.overdriveTimer,
            firewallTimer: this.firewallTimer,
        };
    }

    public deserialize(data: PlayerStateData): void {
        this.credits = data.credits;
        this.securityLevel = data.securityLevel;
        this.damage = data.damage;
        this.tickInterval = data.tickInterval;
        this.creditBonus = data.creditBonus;
        this.damageMultiplier = data.damageMultiplier;
        this.chainChance = data.chainChance;
        this.upgradeLevels = new Map(Object.entries(data.upgradeLevels));
        this.hp = data.hp;
        this.maxHp = data.maxHp;
        this.overdriveTimer = data.overdriveTimer;
        this.firewallTimer = data.firewallTimer;
    }

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
        return Math.round(this.damage * this.damageMultiplier);
    }

    public changeDamageNumber(amount: number): void {
        this.damage = this.damage + amount;
        eventBus.emit("damageChanged", this.getDamageNumber());
    }

    public changeDamageMultiplier(amount: number): void {
        this.damageMultiplier += amount;
        eventBus.emit("damageChanged", this.getDamageNumber());
    }

    public getCreditBonus(): number {
        return this.creditBonus;
    }

    public changeCreditBonus(amount: number): void {
        this.creditBonus += amount;
    }

    public getChainChance(): number {
        return this.chainChance;
    }

    public changeChainChance(amount: number): void {
        this.chainChance += amount;
    }

    public getTickInterval(): number {
        return this.tickInterval;
    }

    public reduceTickInterval(amount: number): void {
        this.tickInterval = Math.max(1, this.tickInterval - amount);
        eventBus.emit("tickIntervalChanged", this.tickInterval);
    }

    public getUpgradeLevel(id: string): number {
        return this.upgradeLevels.get(id) ?? 0;
    }

    public setUpgradeLevel(id: string, level: number): void {
        this.upgradeLevels.set(id, level);
    }

    public getUpgradeLevels(): Map<string, number> {
        return this.upgradeLevels;
    }

    // === Firewall HP (all levels) ===
    public getHp(): number {
        return this.hp;
    }

    public getMaxHp(): number {
        return this.maxHp;
    }

    public restoreHp(): void {
        this.hp = this.maxHp;
        eventBus.emit("hpChanged", this.hp);
    }

    public increaseMaxHp(amount: number): void {
        this.maxHp += amount;
        this.hp += amount;
        eventBus.emit("hpChanged", this.hp);
    }

    public takeDamage(amount: number): boolean {
        this.hp = Math.max(0, this.hp - amount);
        eventBus.emit("hpChanged", this.hp);
        return this.hp <= 0;
    }

    public getHpFraction(): number {
        return this.hp / this.maxHp;
    }

    // === Overdrive (temporary damage boost) ===
    public getOverdriveTimer(): number {
        return this.overdriveTimer;
    }

    public setOverdriveTimer(seconds: number): void {
        this.overdriveTimer = seconds;
    }

    public tickOverdrive(): void {
        if (this.overdriveTimer > 0) {
            this.overdriveTimer--;
            if (this.overdriveTimer === 0) {
                eventBus.emit("damageChanged", this.getDamageNumber());
            }
        }
    }

    public isOverdriveActive(): boolean {
        return this.overdriveTimer > 0;
    }

    // === Firewall (freeze virus spread/heal) ===
    public getFirewallTimer(): number {
        return this.firewallTimer;
    }

    public setFirewallTimer(seconds: number): void {
        this.firewallTimer = seconds;
    }

    public tickFirewall(): void {
        if (this.firewallTimer > 0) {
            this.firewallTimer--;
        }
    }

    public isFirewallActive(): boolean {
        return this.firewallTimer > 0;
    }
}