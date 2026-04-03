// @ts-nocheck

import { BABYLON } from "../../core/runtime.js";
import { CONFIG } from "../../core/constants.js";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class SkimmerEnemy {
  [key: string]: any;

  constructor(scene: any, world: any, player: any, spawnX: number, spawnZ: number, index = 0) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.spawnX = spawnX;
    this.spawnZ = spawnZ;
    this.index = index;
    this.kind = "skimmer";
    this.label = `Skimmer-${index + 1}`;
    this.maxHp = CONFIG.enemy.skimmerMaxHp;
    this.hp = this.maxHp;
    this.alive = true;
    this.respawnTimer = 0;
    this.flashTimer = 0;
    this.contactCooldown = 0;
    this.baseY = 0;
    this.velocity = new BABYLON.Vector3();
    this.horizontalTarget = new BABYLON.Vector3();

    this.root = new BABYLON.TransformNode(`skimmer-root-${index}`, scene);

    this.body = BABYLON.MeshBuilder.CreateSphere(
      `skimmer-body-${index}`,
      {
        diameter: 1.05,
        segments: 6,
      },
      scene,
    );
    this.body.parent = this.root;

    this.finTop = BABYLON.MeshBuilder.CreateCylinder(
      `skimmer-fin-top-${index}`,
      {
        diameterTop: 0,
        diameterBottom: 0.42,
        height: 0.8,
        tessellation: 3,
      },
      scene,
    );
    this.finTop.parent = this.root;
    this.finTop.position.y = 0.72;
    this.finTop.rotation.z = Math.PI / 2;

    this.finBottom = this.finTop.clone(`skimmer-fin-bottom-${index}`);
    this.finBottom.parent = this.root;
    this.finBottom.position.y = -0.72;
    this.finBottom.rotation.z = -Math.PI / 2;

    this.ring = BABYLON.MeshBuilder.CreateTorus(
      `skimmer-ring-${index}`,
      {
        diameter: 1.65,
        thickness: 0.1,
        tessellation: 24,
      },
      scene,
    );
    this.ring.parent = this.root;
    this.ring.rotation.x = Math.PI / 2;

    this.material = new BABYLON.StandardMaterial(`skimmer-material-${index}`, scene);
    this.material.diffuseColor = new BABYLON.Color3(1, 0.48, 0.36);
    this.material.emissiveColor = new BABYLON.Color3(0.34, 0.08, 0.06);
    this.material.specularColor = BABYLON.Color3.Black();
    this.body.material = this.material;
    this.finTop.material = this.material;
    this.finBottom.material = this.material;
    this.ring.material = this.material;

    this.resetPosition();
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
    this.contactCooldown = Math.max(0, this.contactCooldown - deltaSeconds);

    const playerOffset = this.player.position.subtract(this.root.position);
    const horizontalToPlayer = new BABYLON.Vector3(playerOffset.x, 0, playerOffset.z);
    const distanceToPlayer = horizontalToPlayer.length();
    const distanceToSpawn = BABYLON.Vector3.Distance(
      new BABYLON.Vector3(this.spawnX + 0.5, 0, this.spawnZ + 0.5),
      new BABYLON.Vector3(this.root.position.x, 0, this.root.position.z),
    );
    const shouldChase =
      distanceToPlayer <= CONFIG.enemy.aggroRange || distanceToSpawn > CONFIG.enemy.leashRange * 0.5;

    let desiredHorizontal = new BABYLON.Vector3(this.spawnX + 0.5, 0, this.spawnZ + 0.5);

    if (shouldChase && distanceToPlayer > 0.001) {
      desiredHorizontal = new BABYLON.Vector3(
        this.player.position.x - horizontalToPlayer.normalize().x * 0.25,
        0,
        this.player.position.z - horizontalToPlayer.normalize().z * 0.25,
      );
    }

    this.horizontalTarget.set(
      desiredHorizontal.x - this.root.position.x,
      0,
      desiredHorizontal.z - this.root.position.z,
    );

    if (this.horizontalTarget.lengthSquared() > 0.0001) {
      this.horizontalTarget.normalize().scaleInPlace(CONFIG.enemy.moveSpeed);
    }

    this.velocity.x +=
      (this.horizontalTarget.x - this.velocity.x) * clamp(deltaSeconds * CONFIG.enemy.accel, 0, 1);
    this.velocity.z +=
      (this.horizontalTarget.z - this.velocity.z) * clamp(deltaSeconds * CONFIG.enemy.accel, 0, 1);
    this.root.position.x += this.velocity.x * deltaSeconds;
    this.root.position.z += this.velocity.z * deltaSeconds;

    const surfaceHeight = this.world.getSurfaceHeightAt(this.root.position.x, this.root.position.z);
    this.baseY = surfaceHeight + CONFIG.enemy.hoverHeight;
    this.root.position.y =
      this.baseY + Math.sin(elapsedSeconds * 3.4 + this.index * 0.9) * CONFIG.enemy.hoverAmplitude;
    this.root.rotation.y += deltaSeconds * 1.8;
    this.ring.rotation.z += deltaSeconds * 2.8;

    if (distanceToPlayer <= CONFIG.enemy.contactRange && this.contactCooldown <= 0) {
      const hitApplied = this.player.applyHit(
        this.root.position,
        CONFIG.enemy.contactDamage,
        CONFIG.enemy.contactImpulse,
      );

      if (hitApplied) {
        this.contactCooldown = CONFIG.enemy.contactCooldown;
      }
    }

    if (this.flashTimer > 0) {
      this.material.emissiveColor.set(0.72, 0.2, 0.16);
    } else {
      const hpFactor = this.hp / this.maxHp;
      this.material.emissiveColor.set(
        0.16 + (1 - hpFactor) * 0.18,
        0.06 + hpFactor * 0.04,
        0.04 + hpFactor * 0.04,
      );
    }
  }

  segmentHitDistance(segmentStart: any, segmentEnd: any, padding = 0): number | null {
    if (!this.alive) {
      return null;
    }

    const segment = segmentEnd.subtract(segmentStart);
    const lengthSquared = Math.max(segment.lengthSquared(), 0.0001);
    const t = clamp(
      BABYLON.Vector3.Dot(this.root.position.subtract(segmentStart), segment) / lengthSquared,
      0,
      1,
    );
    const closest = BABYLON.Vector3.Lerp(segmentStart, segmentEnd, t);
    const distance = BABYLON.Vector3.Distance(closest, this.root.position);
    const threshold = CONFIG.enemy.skimmerHitRadius + padding;

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
    const effectiveRadius = radius + CONFIG.enemy.skimmerHitRadius;

    if (distance > effectiveRadius) {
      return false;
    }

    const falloff = 1 - distance / effectiveRadius;
    this.takeDamage(maxDamage * Math.max(0.25, falloff));
    return true;
  }

  takeDamage(amount: number): void {
    if (!this.alive) {
      return;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.flashTimer = 0.16;

    if (this.hp <= 0) {
      this.alive = false;
      this.respawnTimer = CONFIG.enemy.respawnSeconds;
      this.velocity.set(0, 0, 0);
      this.root.setEnabled(false);
    }
  }

  respawn(): void {
    this.hp = this.maxHp;
    this.alive = true;
    this.flashTimer = 0;
    this.contactCooldown = 0;
    this.velocity.set(0, 0, 0);
    this.root.setEnabled(true);
    this.resetPosition();
  }

  resetPosition(): void {
    const surfaceHeight = this.world.getSurfaceHeightAt(this.spawnX, this.spawnZ);
    this.baseY = surfaceHeight + CONFIG.enemy.hoverHeight;
    this.root.position.set(this.spawnX + 0.5, this.baseY, this.spawnZ + 0.5);
  }

  getHudLine(): string {
    if (!this.alive) {
      return `${this.label}: respawning ${this.respawnTimer.toFixed(1)}s`;
    }

    return `${this.label}: ${Math.ceil(this.hp)} HP`;
  }

  getDebugState() {
    return {
      kind: "skimmer",
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
