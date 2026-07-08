import type { Cell } from "./Cell";
import type { Entity } from "../entities/Entity";

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
    "creditsChanged": number;
};