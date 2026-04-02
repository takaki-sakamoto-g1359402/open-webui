import { BABYLON } from "../../core/runtime.js";
import { CONFIG } from "../../core/constants.js";
import { BLOCK_IDS, getDefaultPlaceableBlock, getBlockName, isDestructibleBlock, isSolidBlock } from "./block-types.js";
import { VoxelGenerator } from "./generator.js";
import { buildChunkMeshData } from "./mesher.js";

function floorDiv(value, divisor) {
  return Math.floor(value / divisor);
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

export class VoxelWorld {
  constructor(scene, physicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.generator = new VoxelGenerator(CONFIG.world.seed);
    this.chunks = new Map();
    this.placeableBlockId = getDefaultPlaceableBlock();
    this.loadedChunkCount = 0;

    this.material = new BABYLON.StandardMaterial("voxel-material", scene);
    this.material.specularColor = BABYLON.Color3.Black();
    this.material.backFaceCulling = false;
  }

  updateStreaming(centerPosition, rebuildLimit = 3) {
    const centerChunkX = floorDiv(Math.floor(centerPosition.x), CONFIG.world.chunkSize);
    const centerChunkZ = floorDiv(Math.floor(centerPosition.z), CONFIG.world.chunkSize);

    for (let dz = -CONFIG.world.loadRadius; dz <= CONFIG.world.loadRadius; dz += 1) {
      for (let dx = -CONFIG.world.loadRadius; dx <= CONFIG.world.loadRadius; dx += 1) {
        this.ensureChunk(centerChunkX + dx, centerChunkZ + dz);
      }
    }

    for (const chunk of this.chunks.values()) {
      if (
        Math.abs(chunk.cx - centerChunkX) > CONFIG.world.loadRadius + CONFIG.world.unloadPadding ||
        Math.abs(chunk.cz - centerChunkZ) > CONFIG.world.loadRadius + CONFIG.world.unloadPadding
      ) {
        this.disposeChunk(chunk);
      }
    }

    let rebuilt = 0;
    for (const chunk of this.chunks.values()) {
      if (!chunk.dirty) continue;
      this.rebuildChunk(chunk);
      rebuilt += 1;
      if (rebuilt >= rebuildLimit) break;
    }

    this.loadedChunkCount = this.chunks.size;
  }

  getSpawnPosition() {
    const spawnX = CONFIG.world.initialSpawn.x;
    const spawnZ = CONFIG.world.initialSpawn.z;
    const surfaceHeight = this.getSurfaceHeightAt(spawnX, spawnZ);
    return new BABYLON.Vector3(spawnX + 0.5, surfaceHeight + 2, spawnZ + 0.5);
  }

  getSurfaceHeightAt(worldX, worldZ) {
    return this.generator.getSurfaceHeight(worldX, worldZ);
  }

  getBlock(worldX, worldY, worldZ) {
    const x = Math.floor(worldX);
    const y = Math.floor(worldY);
    const z = Math.floor(worldZ);
    if (y < 0 || y >= CONFIG.world.height) return BLOCK_IDS.AIR;

    const chunkX = floorDiv(x, CONFIG.world.chunkSize);
    const chunkZ = floorDiv(z, CONFIG.world.chunkSize);
    const chunk = this.chunks.get(this.getChunkKey(chunkX, chunkZ));
    if (!chunk) return BLOCK_IDS.AIR;

    const localX = positiveModulo(x, CONFIG.world.chunkSize);
    const localZ = positiveModulo(z, CONFIG.world.chunkSize);
    return chunk.blocks[this.getLocalIndex(localX, y, localZ)] ?? BLOCK_IDS.AIR;
  }

  getBlockDisplayName(blockId) {
    return getBlockName(blockId);
  }

  setBlock(worldX, worldY, worldZ, blockId) {
    const x = Math.floor(worldX);
    const y = Math.floor(worldY);
    const z = Math.floor(worldZ);
    if (y < 0 || y >= CONFIG.world.height) return false;

    const chunkX = floorDiv(x, CONFIG.world.chunkSize);
    const chunkZ = floorDiv(z, CONFIG.world.chunkSize);
    const chunk = this.ensureChunk(chunkX, chunkZ);
    const localX = positiveModulo(x, CONFIG.world.chunkSize);
    const localZ = positiveModulo(z, CONFIG.world.chunkSize);
    const index = this.getLocalIndex(localX, y, localZ);
    if (chunk.blocks[index] === blockId) return false;

    chunk.blocks[index] = blockId;
    this.markChunkDirty(chunkX, chunkZ);
    if (localX === 0) this.markChunkDirty(chunkX - 1, chunkZ);
    if (localX === CONFIG.world.chunkSize - 1) this.markChunkDirty(chunkX + 1, chunkZ);
    if (localZ === 0) this.markChunkDirty(chunkX, chunkZ - 1);
    if (localZ === CONFIG.world.chunkSize - 1) this.markChunkDirty(chunkX, chunkZ + 1);
    return true;
  }

  removeBlocksInRadius(center, radius) {
    const radiusSquared = radius * radius;
    let removedCount = 0;
    for (let x = Math.floor(center.x - radius); x <= Math.ceil(center.x + radius); x += 1) {
      for (let y = Math.floor(center.y - radius); y <= Math.ceil(center.y + radius); y += 1) {
        for (let z = Math.floor(center.z - radius); z <= Math.ceil(center.z + radius); z += 1) {
          const dx = x + 0.5 - center.x;
          const dy = y + 0.5 - center.y;
          const dz = z + 0.5 - center.z;
          if (dx * dx + dy * dy + dz * dz > radiusSquared) continue;
          const blockId = this.getBlock(x, y, z);
          if (!isDestructibleBlock(blockId, y)) continue;
          if (this.setBlock(x, y, z, BLOCK_IDS.AIR)) removedCount += 1;
        }
      }
    }
    return removedCount;
  }

  canPlaceBlock(worldX, worldY, worldZ, bounds) {
    if (this.getBlock(worldX, worldY, worldZ) !== BLOCK_IDS.AIR) return false;
    const minX = worldX;
    const maxX = worldX + 1;
    const minY = worldY;
    const maxY = worldY + 1;
    const minZ = worldZ;
    const maxZ = worldZ + 1;
    const overlapsPlayer = bounds.minX < maxX && bounds.maxX > minX && bounds.minY < maxY && bounds.maxY > minY && bounds.minZ < maxZ && bounds.maxZ > minZ;
    return !overlapsPlayer;
  }

  raycast(origin, direction, maxDistance) {
    const dir = direction.clone();
    if (dir.lengthSquared() === 0) return null;
    dir.normalize();

    let x = Math.floor(origin.x);
    let y = Math.floor(origin.y);
    let z = Math.floor(origin.z);
    const stepX = Math.sign(dir.x);
    const stepY = Math.sign(dir.y);
    const stepZ = Math.sign(dir.z);
    const invX = stepX !== 0 ? Math.abs(1 / dir.x) : Number.POSITIVE_INFINITY;
    const invY = stepY !== 0 ? Math.abs(1 / dir.y) : Number.POSITIVE_INFINITY;
    const invZ = stepZ !== 0 ? Math.abs(1 / dir.z) : Number.POSITIVE_INFINITY;
    let tMaxX = stepX > 0 ? (x + 1 - origin.x) * invX : (origin.x - x) * invX;
    let tMaxY = stepY > 0 ? (y + 1 - origin.y) * invY : (origin.y - y) * invY;
    let tMaxZ = stepZ > 0 ? (z + 1 - origin.z) * invZ : (origin.z - z) * invZ;
    let distance = 0;
    let normal = new BABYLON.Vector3(0, 0, 0);

    while (distance <= maxDistance) {
      if (isSolidBlock(this.getBlock(x, y, z))) {
        return { voxel: new BABYLON.Vector3(x, y, z), normal, point: origin.add(dir.scale(distance)), distance };
      }
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        x += stepX; distance = tMaxX; tMaxX += invX; normal = new BABYLON.Vector3(-stepX, 0, 0);
      } else if (tMaxY < tMaxZ) {
        y += stepY; distance = tMaxY; tMaxY += invY; normal = new BABYLON.Vector3(0, -stepY, 0);
      } else {
        z += stepZ; distance = tMaxZ; tMaxZ += invZ; normal = new BABYLON.Vector3(0, 0, -stepZ);
      }
    }
    return null;
  }

  rebuildAllDirtyChunks() {
    for (const chunk of this.chunks.values()) {
      if (chunk.dirty) this.rebuildChunk(chunk);
    }
    this.loadedChunkCount = this.chunks.size;
  }

  getChunkKey(cx, cz) {
    return `${cx},${cz}`;
  }

  getLocalIndex(localX, y, localZ) {
    return y * CONFIG.world.chunkSize * CONFIG.world.chunkSize + localZ * CONFIG.world.chunkSize + localX;
  }

  ensureChunk(cx, cz) {
    const key = this.getChunkKey(cx, cz);
    const existingChunk = this.chunks.get(key);
    if (existingChunk) return existingChunk;

    const chunk = { key, cx, cz, blocks: this.generator.generateChunk(cx, cz), mesh: null, dirty: true };
    this.chunks.set(key, chunk);
    this.markChunkDirty(cx - 1, cz);
    this.markChunkDirty(cx + 1, cz);
    this.markChunkDirty(cx, cz - 1);
    this.markChunkDirty(cx, cz + 1);
    return chunk;
  }

  markChunkDirty(cx, cz) {
    const chunk = this.chunks.get(this.getChunkKey(cx, cz));
    if (chunk) chunk.dirty = true;
  }

  rebuildChunk(chunk) {
    const meshData = buildChunkMeshData(this, chunk.cx, chunk.cz, chunk.blocks);
    if (!meshData.positions.length) {
      if (chunk.mesh) { chunk.mesh.dispose(); chunk.mesh = null; }
      this.physicsWorld.removeChunkCollider(chunk.key);
      chunk.dirty = false;
      return;
    }

    if (!chunk.mesh) {
      chunk.mesh = new BABYLON.Mesh(`chunk-${chunk.key}`, this.scene);
      chunk.mesh.material = this.material;
      chunk.mesh.isPickable = false;
    }

    const vertexData = new BABYLON.VertexData();
    vertexData.positions = meshData.positions;
    vertexData.indices = meshData.indices;
    vertexData.normals = meshData.normals;
    vertexData.colors = meshData.colors;
    vertexData.applyToMesh(chunk.mesh, true);
    chunk.mesh.position.set(chunk.cx * CONFIG.world.chunkSize, 0, chunk.cz * CONFIG.world.chunkSize);
    this.physicsWorld.setChunkCollider(chunk.key, meshData.positions, meshData.indices, chunk.mesh.position);
    chunk.dirty = false;
  }

  disposeChunk(chunk) {
    if (chunk.mesh) chunk.mesh.dispose();
    this.physicsWorld.removeChunkCollider(chunk.key);
    this.chunks.delete(chunk.key);
  }
}
