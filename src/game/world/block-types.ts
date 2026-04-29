// @ts-nocheck

export const BLOCK_IDS = Object.freeze({
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  CRYSTAL: 4,
  LIGHTSTONE: 5,
  HOUSE: 6,
  STORAGE: 7,
  WORKSHOP: 8,
  ROAD: 9,
  CIVIC: 10,
});

export const BLOCK_LIBRARY: Record<number, { id: number; name: string; solid: boolean; placeable: boolean; color: number[] }> = {
  [BLOCK_IDS.AIR]: {
    id: BLOCK_IDS.AIR,
    name: "Air",
    solid: false,
    placeable: false,
    color: [0, 0, 0],
  },
  [BLOCK_IDS.GRASS]: {
    id: BLOCK_IDS.GRASS,
    name: "Skygrass",
    solid: true,
    placeable: false,
    color: [0.36, 0.78, 0.4],
  },
  [BLOCK_IDS.DIRT]: {
    id: BLOCK_IDS.DIRT,
    name: "Loam",
    solid: true,
    placeable: false,
    color: [0.52, 0.34, 0.18],
  },
  [BLOCK_IDS.STONE]: {
    id: BLOCK_IDS.STONE,
    name: "Stone",
    solid: true,
    placeable: false,
    color: [0.56, 0.62, 0.7],
  },
  [BLOCK_IDS.CRYSTAL]: {
    id: BLOCK_IDS.CRYSTAL,
    name: "Aether Crystal",
    solid: true,
    placeable: false,
    color: [0.22, 0.74, 1],
  },
  [BLOCK_IDS.LIGHTSTONE]: {
    id: BLOCK_IDS.LIGHTSTONE,
    name: "Lightstone",
    solid: true,
    placeable: true,
    color: [0.96, 0.88, 0.42],
  },
  [BLOCK_IDS.HOUSE]: {
    id: BLOCK_IDS.HOUSE,
    name: "House Marker",
    solid: true,
    placeable: true,
    color: [0.86, 0.52, 0.34],
  },
  [BLOCK_IDS.STORAGE]: {
    id: BLOCK_IDS.STORAGE,
    name: "Storage Crate",
    solid: true,
    placeable: true,
    color: [0.72, 0.58, 0.34],
  },
  [BLOCK_IDS.WORKSHOP]: {
    id: BLOCK_IDS.WORKSHOP,
    name: "Workshop Bench",
    solid: true,
    placeable: true,
    color: [0.42, 0.66, 0.86],
  },
  [BLOCK_IDS.ROAD]: {
    id: BLOCK_IDS.ROAD,
    name: "Road Paver",
    solid: true,
    placeable: true,
    color: [0.35, 0.38, 0.36],
  },
  [BLOCK_IDS.CIVIC]: {
    id: BLOCK_IDS.CIVIC,
    name: "Civic Beacon",
    solid: true,
    placeable: true,
    color: [0.78, 0.46, 0.9],
  },
};

export function isSolidBlock(blockId: number): boolean {
  return BLOCK_LIBRARY[blockId]?.solid ?? false;
}

export function getBlockColor(blockId: number): number[] {
  return BLOCK_LIBRARY[blockId]?.color ?? [1, 0, 1];
}

export function getBlockName(blockId: number): string {
  return BLOCK_LIBRARY[blockId]?.name ?? "Unknown";
}

export function getDefaultPlaceableBlock(): number {
  return BLOCK_IDS.LIGHTSTONE;
}

export function isDestructibleBlock(blockId: number, y: number): boolean {
  return blockId !== BLOCK_IDS.AIR && y > 1;
}
