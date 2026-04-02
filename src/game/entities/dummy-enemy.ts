// @ts-nocheck

import { BABYLON } from "../../core/runtime.js";
import { CONFIG } from "../../core/constants.js";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class DummyEnemy {
  [key: string]: any;

  constructor(scene: any, world: any, spawnX: number, spawnZ: number, index = 0) {
    this.scene = scene;
    this.world = world;
    this.spawnX = spawnX;
    this.spawnZ = spawnZ;
    this.kind = "dummy";
    this.label = `Dummy-${index + 1}`;
    this.maxHp = CONFIG.dummy.maxHp;
    this.hp = this.maxHp;
    this.alive = true;
    this.respawnTimer = 0;
    this.flashTimer = 0;
    this.baseY = 0;

    this.root = new BABYLON.TransformNode("dummy-root", scene);
    this.root.position = new BABYLON.Vector3(spawnX, 0, spawnZ);

    this.body = BABYLON.MeshBuilder.CreateCylinder(
      "dummy-body",
      {
        diameter: 1.15,
        height: 2.4,
        tessellation: 6,
      },
      scene,
    );
    this.body.parent = this.root;

    this.ring = BABYLON.MeshBuilder.CreateTorus(
      "dummy-ring",
      {
        diameter: 1.9,
        thickness: 0.12,
        tessellation: 24,
      },
      scene,
    );
    this.ring.parent = this.root;
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = 0.2;

    this.material = new BABYLON.StandardMaterial("dummy-material", scene);
    this.material.diffuseColor = new BABYLON.Color3(0.2, 0.85, 1);
    this.material.emissiveColor = new BABYLON.Color3(0.05, 0.22, 0.4);
    this.material.specularColor = BABYLON.Color3.Black();
    this.body.material = this.material;
    this.ring.material = this.material;

    this.snapToGround();
  }

  snapToGround(): void {
    const surfaceHeight = this.world.getSurfaceHeightAt(this.spawnX, this.spawnZ);
    this.baseY = surfaceHeight + 1.5;
    this.root.position.set(this.spawnX + 0.5, this.baseY, this.spawnZ + 0.5);
  }

  update(deltaSeconds: number, elapsedSeconds: number): void {
    if (!this.alive) {
      this.respawnTimer -= deltaSeconds;

      if (this.respawnTimer <= 0) {
        this.respawn();
      }

      return;
    }

    this.flashTimer = Math.max(0, this.flashTimer - deltaSeconds);
    this.root.position.y = this.baseY + Math.sin(elapsedSeconds * 2.8) * 0.18;
    this.root.rotation.y += deltaSeconds * 0.7;
    this.ring.rotation.z += deltaSeconds * 1.6;

    if (this.flashTimer > 0) {
      this.material.emissiveColor.set(0.65, 0.16, 0.16);
    } else {
      const hpFactor = this.hp / this.maxHp;
      this.material.emissiveColor.set(
        0.08 + (1 - hpFactor) * 0.18,
        0.22 * hpFactor,
        0.42 * hpFactor,
      );
    }
  }

  segmentHitDistance(segmentStart: any, segmentEnd: any, padding = 0): number | null {
    if (!this.alive) {
      return null;
    }

    const closest = BABYLON.Vector3.Lerp(
      segmentStart,
      segmentEnd,
      clamp(
        BABYLON.Vector3.Dot(
          this.root.position.subtract(segmentStart),
          segmentEnd.subtract(segmentStart),
        ) /
          Math.max(BABYLON.Vector3.DistanceSquared(segmentStart, segmentEnd), 0.0001),
        0,
        1,
      ),
    );

    const distance = BABYLON.Vector3.Distance(closest, this.root.position);
    const threshold = CONFIG.dummy.hitRadius + padding;

    if (distance > threshold) {
      return null;
    }

    return BABYLON.Vector3.Distance(segmentStart, closest);
  }

  applyDirectHit(amount: number): void {
    this.takeDamage(amount);
  }

  applyExplosion(point: any, radius: number, maxDamage: number): boolean {
    if (!this.alive) {
      return false;
    }

    const distance = BABYLON.Vector3.Distance(this.root.position, point);
    const effectiveRadius = radius + CONFIG.dummy.hitRadius;

    if (distance > effectiveRadius) {
      return false;
    }

    const falloff = 1 - distance / effectiveRadius;
    this.takeDamage(maxDamage * Math.max(0.2, falloff));
    return true;
  }

  takeDamage(amount: number): void {
    if (!this.alive) {
      return;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.flashTimer = 0.14;

    if (this.hp <= 0) {
      this.alive = false;
      this.respawnTimer = CONFIG.dummy.respawnSeconds;
      this.root.setEnabled(false);
    }
  }

  respawn(): void {
    this.hp = this.maxHp;
    this.alive = true;
    this.flashTimer = 0;
    this.root.setEnabled(true);
    this.snapToGround();
  }

  getStatusText(): string {
    if (!this.alive) {
      return `Dummy: rebuilding (${this.respawnTimer.toFixed(1)}s)`;
    }

    return `Dummy: ${Math.ceil(this.hp)} / ${this.maxHp} HP`;
  }

  getDebugState() {
    return {
      kind: "dummy",
      label: this.label,
      alive: this.alive,
      hp: Number(this.hp.toFixed(1)),
      position: {
        x: Number(this.root.position.x.toFixed(2)),
        y: Number(this.root.position.y.toFixed(2)),
        z: Number(this.root.position.z.toFixed(2)),
      },
    };
  }
}
