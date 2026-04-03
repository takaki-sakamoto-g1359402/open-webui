// @ts-nocheck

import { RAPIER } from "../core/runtime.js";

export class PhysicsWorld {
  [key: string]: any;

  constructor() {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.chunkBodies = new Map();
  }

  step(): void {
    this.world.step();
  }

  setChunkCollider(
    key: string,
    positions: number[],
    indices: number[],
    translation: { x: number; y: number; z: number },
  ): void {
    this.removeChunkCollider(key);

    if (!positions.length || !indices.length) {
      return;
    }

    const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
      translation.x,
      translation.y,
      translation.z,
    );
    const rigidBody = this.world.createRigidBody(rigidBodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.trimesh(
      new Float32Array(positions),
      new Uint32Array(indices),
    );
    const collider = this.world.createCollider(colliderDesc, rigidBody);

    this.chunkBodies.set(key, {
      rigidBody,
      collider,
    });
  }

  removeChunkCollider(key: string): void {
    const record = this.chunkBodies.get(key);

    if (!record) {
      return;
    }

    this.world.removeRigidBody(record.rigidBody);
    this.chunkBodies.delete(key);
  }

  dispose(): void {
    for (const key of this.chunkBodies.keys()) {
      this.removeChunkCollider(key);
    }
  }
}
