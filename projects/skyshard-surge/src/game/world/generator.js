import { CONFIG } from "../../core/constants.js";
import { BLOCK_IDS } from "./block-types.js";

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export class VoxelGenerator {
  constructor(seed = CONFIG.world.seed) {
    this.seed = seed;
  }

  generateChunk(cx, cz) {
    const chunkSize = CONFIG.world.chunkSize;
    const worldHeight = CONFIG.world.height;
    const blockData = new Uint8Array(chunkSize * worldHeight * chunkSize);

    for (let lx = 0; lx < chunkSize; lx += 1) {
      for (let lz = 0; lz < chunkSize; lz += 1) {
        const worldX = cx * chunkSize + lx;
        const worldZ = cz * chunkSize + lz;
        const terrainHeight = this.getTerrainHeight(worldX, worldZ);

        for (let y = 0; y <= terrainHeight && y < worldHeight; y += 1) {
          let blockId = BLOCK_IDS.STONE;
          if (y === terrainHeight) blockId = BLOCK_IDS.GRASS;
          else if (y >= terrainHeight - 2) blockId = BLOCK_IDS.DIRT;
          blockData[this.getIndex(lx, y, lz)] = blockId;
        }

        if (terrainHeight > 18 && terrainHeight + 1 < worldHeight) {
          const crystalChance = this.hash2(worldX, worldZ, this.seed + 91);
          if (crystalChance > 0.945) {
            blockData[this.getIndex(lx, terrainHeight + 1, lz)] = BLOCK_IDS.CRYSTAL;
          }
        }
      }
    }

    return blockData;
  }

  getTerrainHeight(worldX, worldZ) {
    const broad = this.fractalNoise(worldX, worldZ, 0.035, 4);
    const detail = this.fractalNoise(worldX + 177, worldZ - 81, 0.09, 3);
    const ridge = 1 - Math.abs(this.valueNoise(worldX, worldZ, 0.018, this.seed + 27) * 2 - 1);
    const height = 8 + broad * 10 + detail * 3 + ridge * 5;
    return Math.max(4, Math.min(CONFIG.world.height - 6, Math.floor(height)));
  }

  getSurfaceHeight(worldX, worldZ) {
    return this.getTerrainHeight(Math.floor(worldX), Math.floor(worldZ));
  }

  fractalNoise(worldX, worldZ, baseScale, octaves) {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let normalization = 0;

    for (let octave = 0; octave < octaves; octave += 1) {
      total += this.valueNoise(worldX, worldZ, baseScale * frequency, this.seed + octave * 67) * amplitude;
      normalization += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return total / normalization;
  }

  valueNoise(worldX, worldZ, scale, localSeed) {
    const sx = worldX * scale;
    const sz = worldZ * scale;
    const x0 = Math.floor(sx);
    const z0 = Math.floor(sz);
    const x1 = x0 + 1;
    const z1 = z0 + 1;
    const tx = smoothstep(sx - x0);
    const tz = smoothstep(sz - z0);
    const h00 = this.hash2(x0, z0, localSeed);
    const h10 = this.hash2(x1, z0, localSeed);
    const h01 = this.hash2(x0, z1, localSeed);
    const h11 = this.hash2(x1, z1, localSeed);
    return lerp(lerp(h00, h10, tx), lerp(h01, h11, tx), tz);
  }

  hash2(x, z, seed) {
    let value = (x * 374761393 + z * 668265263 + seed * 987643211) >>> 0;
    value = Math.imul(value ^ (value >>> 13), 1274126177);
    value = (value ^ (value >>> 16)) >>> 0;
    return value / 0xffffffff;
  }

  getIndex(x, y, z) {
    return y * CONFIG.world.chunkSize * CONFIG.world.chunkSize + z * CONFIG.world.chunkSize + x;
  }
}
