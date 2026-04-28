// @ts-nocheck

import {
  BUILD_MODE_OPTIONS,
  BUILDING_KINDS,
  getBuildingDefinitionForBlock,
} from "./building-types.js";
import { getBlockName } from "../world/block-types.js";

function buildingKey(x: number, y: number, z: number): string {
  return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
}

function distanceSquared(a: any, b: any): number {
  const dx = a.x - b.x;
  const dy = (a.y ?? 0) - (b.y ?? 0);
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

export class BuildingManager {
  [key: string]: any;

  constructor() {
    this.instances = new Map();
    this.sequence = 1;
  }

  recordBlockPlaced(x: number, y: number, z: number, blockId: number, source = "player"): any {
    const definition = getBuildingDefinitionForBlock(blockId);

    if (!definition) {
      return null;
    }

    const key = buildingKey(x, y, z);
    const existing = this.instances.get(key);
    const instance = {
      id: existing?.id ?? `building-${this.sequence++}`,
      key,
      kind: definition.kind,
      label: definition.label,
      blockId,
      source,
      position: {
        x: Math.floor(x),
        y: Math.floor(y),
        z: Math.floor(z),
      },
      createdAt: performance.now(),
    };

    this.instances.set(key, instance);
    return instance;
  }

  recordBlockRemoved(x: number, y: number, z: number): any {
    const key = buildingKey(x, y, z);
    const existing = this.instances.get(key);

    if (!existing) {
      return null;
    }

    this.instances.delete(key);
    return existing;
  }

  clear(): void {
    this.instances.clear();
  }

  restoreInstance(instance: any): void {
    const key = buildingKey(instance.position.x, instance.position.y, instance.position.z);
    this.instances.set(key, {
      ...instance,
      key,
    });
  }

  getBuildModeOptions(): any[] {
    return BUILD_MODE_OPTIONS.map((option) => {
      const definition = getBuildingDefinitionForBlock(option.blockId);
      return {
        ...option,
        label: definition?.shortLabel ?? getBlockName(option.blockId),
        description: definition?.description ?? "",
      };
    });
  }

  getBuildings(): any[] {
    return Array.from(this.instances.values());
  }

  getBuildingsByKind(kind: string): any[] {
    return this.getBuildings().filter((building) => building.kind === kind);
  }

  getNearestBuilding(kind: string, from: any): any {
    return this.getBuildingsByKind(kind).sort(
      (a, b) => distanceSquared(a.position, from) - distanceSquared(b.position, from),
    )[0] ?? null;
  }

  getAnyNearest(from: any): any {
    return this.getBuildings().sort(
      (a, b) => distanceSquared(a.position, from) - distanceSquared(b.position, from),
    )[0] ?? null;
  }

  getEffects(): any {
    const effects = {
      populationCapacity: 3,
      storageCapacity: 45,
      workSlots: 0,
      moraleBonus: 0,
      roadScore: 0,
      civicFocus: 0,
      productionFocus: 0,
    };

    for (const building of this.instances.values()) {
      const definition = getBuildingDefinitionForBlock(building.blockId);

      if (!definition) {
        continue;
      }

      effects.populationCapacity += definition.effects.populationCapacity ?? 0;
      effects.storageCapacity += definition.effects.storageCapacity ?? 0;
      effects.workSlots += definition.effects.workSlots ?? 0;
      effects.moraleBonus += definition.effects.morale ?? 0;
      effects.roadScore += definition.effects.roadScore ?? 0;
      effects.civicFocus += definition.effects.civicFocus ?? 0;
      effects.productionFocus += definition.effects.productionFocus ?? 0;
    }

    return effects;
  }

  getCounts(): any {
    const counts = {
      total: this.instances.size,
      [BUILDING_KINDS.HOUSE]: 0,
      [BUILDING_KINDS.STORAGE]: 0,
      [BUILDING_KINDS.WORKSHOP]: 0,
      [BUILDING_KINDS.ROAD]: 0,
      [BUILDING_KINDS.CIVIC]: 0,
    };

    for (const building of this.instances.values()) {
      counts[building.kind] = (counts[building.kind] ?? 0) + 1;
    }

    return counts;
  }

  getDebugState(): any {
    return {
      counts: this.getCounts(),
      effects: this.getEffects(),
      buildings: this.getBuildings(),
    };
  }
}
