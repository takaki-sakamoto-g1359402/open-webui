// @ts-nocheck

import { BLOCK_IDS } from "../world/block-types.js";

export const BUILDING_KINDS = Object.freeze({
  HOUSE: "house",
  STORAGE: "storage",
  WORKSHOP: "workshop",
  ROAD: "road",
  CIVIC: "civic",
});

export const BUILDING_DEFINITIONS = Object.freeze({
  [BLOCK_IDS.HOUSE]: {
    kind: BUILDING_KINDS.HOUSE,
    label: "House",
    shortLabel: "House",
    description: "Adds resident capacity and gives tired agents a rest target.",
    effects: {
      populationCapacity: 2,
      morale: 1,
    },
  },
  [BLOCK_IDS.STORAGE]: {
    kind: BUILDING_KINDS.STORAGE,
    label: "Storage",
    shortLabel: "Storage",
    description: "Raises resource capacity and gives haulers a delivery target.",
    effects: {
      storageCapacity: 45,
    },
  },
  [BLOCK_IDS.WORKSHOP]: {
    kind: BUILDING_KINDS.WORKSHOP,
    label: "Workshop",
    shortLabel: "Work",
    description: "Unlocks efficient material work and maintenance tasks.",
    effects: {
      workSlots: 2,
      productionFocus: 1,
    },
  },
  [BLOCK_IDS.ROAD]: {
    kind: BUILDING_KINDS.ROAD,
    label: "Road",
    shortLabel: "Road",
    description: "Improves agent travel efficiency when enough roads exist.",
    effects: {
      roadScore: 1,
    },
  },
  [BLOCK_IDS.CIVIC]: {
    kind: BUILDING_KINDS.CIVIC,
    label: "Civic Beacon",
    shortLabel: "Civic",
    description: "Improves morale and gives planners/social agents a civic target.",
    effects: {
      morale: 3,
      civicFocus: 1,
    },
  },
});

export const BUILD_MODE_OPTIONS = Object.freeze([
  { slot: 1, blockId: BLOCK_IDS.HOUSE },
  { slot: 2, blockId: BLOCK_IDS.STORAGE },
  { slot: 3, blockId: BLOCK_IDS.WORKSHOP },
  { slot: 4, blockId: BLOCK_IDS.ROAD },
  { slot: 5, blockId: BLOCK_IDS.CIVIC },
]);

export function getBuildingDefinitionForBlock(blockId: number): any {
  return BUILDING_DEFINITIONS[blockId] ?? null;
}

export function isBuildingBlock(blockId: number): boolean {
  return Boolean(getBuildingDefinitionForBlock(blockId));
}
