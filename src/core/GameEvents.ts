import type { Cell } from "./Cell";
import type { Entity } from "../entities/Entity";
import type { GamePhase } from "./GamePhase";

export type GameEvents = {
    "cellChanged": Cell;
    "entitySpawned": {
        cell: Cell;
        entity: Entity;
    };
    "entityDestroyed": {
        cell: Cell;
        entity: Entity;
    };
    "entityDamaged": {
        cell: Cell;
        entity: Entity;
    };
    "creditsChanged": number;
    "damageChanged": number;
    "levelStarted": number;
    "levelCompleted": number;
    "phaseChanged": GamePhase;
    "timerChanged": number;
    "selectionChanged": undefined;
    "tickIntervalChanged": number;
};
