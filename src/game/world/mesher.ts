// @ts-nocheck

import { CONFIG } from "../../core/constants.js";
import { getBlockColor, isSolidBlock } from "./block-types.js";

const FACE_DEFINITIONS = [
  {
    normal: [1, 0, 0],
    shade: 0.83,
    vertices: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
  },
  {
    normal: [-1, 0, 0],
    shade: 0.74,
    vertices: [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
      [0, 0, 0],
    ],
  },
  {
    normal: [0, 1, 0],
    shade: 1,
    vertices: [
      [0, 1, 0],
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
    ],
  },
  {
    normal: [0, -1, 0],
    shade: 0.58,
    vertices: [
      [0, 0, 1],
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
    ],
  },
  {
    normal: [0, 0, 1],
    shade: 0.9,
    vertices: [
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
      [0, 0, 1],
    ],
  },
  {
    normal: [0, 0, -1],
    shade: 0.76,
    vertices: [
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
  },
];

export function buildChunkMeshData(world: any, cx: number, cz: number, blockData: Uint8Array) {
  const chunkSize = CONFIG.world.chunkSize;
  const worldHeight = CONFIG.world.height;
  const positions: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];

  for (let lx = 0; lx < chunkSize; lx += 1) {
    for (let lz = 0; lz < chunkSize; lz += 1) {
      for (let y = 0; y < worldHeight; y += 1) {
        const blockId = blockData[world.getLocalIndex(lx, y, lz)];

        if (!isSolidBlock(blockId)) {
          continue;
        }

        const worldX = cx * chunkSize + lx;
        const worldZ = cz * chunkSize + lz;
        const baseColor = getBlockColor(blockId);

        for (const face of FACE_DEFINITIONS) {
          const nx = face.normal[0];
          const ny = face.normal[1];
          const nz = face.normal[2];
          const neighborBlock = world.getBlock(worldX + nx, y + ny, worldZ + nz);

          if (isSolidBlock(neighborBlock)) {
            continue;
          }

          const vertexStart = positions.length / 3;

          for (const vertex of face.vertices) {
            positions.push(lx + vertex[0], y + vertex[1], lz + vertex[2]);
            normals.push(nx, ny, nz);
            colors.push(
              baseColor[0] * face.shade,
              baseColor[1] * face.shade,
              baseColor[2] * face.shade,
              1,
            );
          }

          indices.push(
            vertexStart,
            vertexStart + 1,
            vertexStart + 2,
            vertexStart,
            vertexStart + 2,
            vertexStart + 3,
          );
        }
      }
    }
  }

  return {
    positions,
    indices,
    normals,
    colors,
  };
}
