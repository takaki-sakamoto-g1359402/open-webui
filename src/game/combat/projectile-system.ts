// @ts-nocheck

import { BABYLON } from "../../core/runtime.js";
import { CONFIG } from "../../core/constants.js";

export class ProjectileSystem {
  [key: string]: any;

  constructor(scene: any, world: any, player: any, enemies: any[]) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.enemies = enemies;
    this.projectiles = [];
    this.impacts = [];
    this.fireCooldown = 0;

    this.projectileMaterial = new BABYLON.StandardMaterial("projectile-material", scene);
    this.projectileMaterial.diffuseColor = new BABYLON.Color3(0.44, 0.82, 1);
    this.projectileMaterial.emissiveColor = new BABYLON.Color3(0.22, 0.72, 1);
    this.projectileMaterial.specularColor = BABYLON.Color3.Black();

    this.impactMaterial = new BABYLON.StandardMaterial("impact-material", scene);
    this.impactMaterial.diffuseColor = new BABYLON.Color3(0.95, 0.85, 0.38);
    this.impactMaterial.emissiveColor = new BABYLON.Color3(0.7, 0.45, 0.12);
    this.impactMaterial.specularColor = BABYLON.Color3.Black();

    for (let index = 0; index < CONFIG.combat.projectilePoolSize; index += 1) {
      const mesh = BABYLON.MeshBuilder.CreateSphere(
        `projectile-${index}`,
        {
          diameter: 0.28,
          segments: 6,
        },
        scene,
      );

      mesh.material = this.projectileMaterial;
      mesh.isPickable = false;
      mesh.setEnabled(false);

      this.projectiles.push({
        active: false,
        mesh,
        position: new BABYLON.Vector3(),
        direction: new BABYLON.Vector3(),
        lifetime: 0,
      });
    }
  }

  update(deltaSeconds: number): void {
    if (this.fireCooldown > 0) {
      this.fireCooldown = Math.max(0, this.fireCooldown - deltaSeconds);
    }

    for (const projectile of this.projectiles) {
      if (!projectile.active) {
        continue;
      }

      const travelDistance = CONFIG.combat.projectileSpeed * deltaSeconds;
      const segmentStart = projectile.position.clone();
      const segmentEnd = segmentStart.add(projectile.direction.scale(travelDistance));
      const worldHit = this.world.raycast(segmentStart, projectile.direction, travelDistance);
      const enemyHit = this.getClosestEnemyHit(segmentStart, segmentEnd);

      if (enemyHit && (!worldHit || enemyHit.distance <= worldHit.distance)) {
        projectile.position.copyFrom(enemyHit.point);
        enemyHit.enemy.applyDirectHit(CONFIG.combat.projectileDirectHitBonus);
        this.createImpact(projectile.position.clone());
        this.applyExplosion(projectile.position.clone());
        this.deactivateProjectile(projectile);
        continue;
      }

      if (worldHit) {
        projectile.position.copyFrom(worldHit.point);
        this.createImpact(projectile.position.clone());
        this.applyExplosion(projectile.position.clone());
        this.deactivateProjectile(projectile);
        continue;
      }

      projectile.position.copyFrom(segmentEnd);
      projectile.mesh.position.copyFrom(projectile.position);
      projectile.lifetime -= deltaSeconds;

      if (projectile.lifetime <= 0) {
        this.deactivateProjectile(projectile);
      }
    }

    for (let index = this.impacts.length - 1; index >= 0; index -= 1) {
      const impact = this.impacts[index];
      impact.remaining -= deltaSeconds;
      impact.mesh.scaling.setAll(1 + (1 - impact.remaining / impact.duration) * 2.6);
      impact.mesh.visibility = Math.max(0, impact.remaining / impact.duration);

      if (impact.remaining <= 0) {
        if (impact.mesh.material) {
          impact.mesh.material.dispose();
        }
        impact.mesh.dispose();
        this.impacts.splice(index, 1);
      }
    }
  }

  tryFire(): boolean {
    if (this.fireCooldown > 0) {
      return false;
    }

    if (!this.player.consumeEnergy(CONFIG.resources.projectileEnergyCost)) {
      return false;
    }

    const projectile = this.projectiles.find((candidate: any) => !candidate.active);

    if (!projectile) {
      return false;
    }

    projectile.active = true;
    projectile.lifetime = CONFIG.combat.projectileLifetime;
    projectile.position.copyFrom(this.player.getEyePosition().add(this.player.getForwardVector().scale(0.7)));
    projectile.direction.copyFrom(this.player.getForwardVector());
    projectile.mesh.position.copyFrom(projectile.position);
    projectile.mesh.setEnabled(true);

    this.fireCooldown = CONFIG.combat.fireCooldown;
    return true;
  }

  getClosestEnemyHit(segmentStart: any, segmentEnd: any): any {
    let bestHit = null;

    for (const enemy of this.enemies) {
      const distance = enemy.segmentHitDistance(segmentStart, segmentEnd, 0.25);

      if (distance == null) {
        continue;
      }

      if (!bestHit || distance < bestHit.distance) {
        const direction = segmentEnd.subtract(segmentStart).normalize();
        bestHit = {
          enemy,
          distance,
          point: segmentStart.add(direction.scale(distance)),
        };
      }
    }

    return bestHit;
  }

  applyExplosion(point: any): void {
    const removedCount = this.world.removeBlocksInRadius(point, CONFIG.combat.projectileRadius);

    if (removedCount > 0) {
      this.world.rebuildAllDirtyChunks();
    }

    for (const enemy of this.enemies) {
      enemy.applyExplosion(point, CONFIG.combat.projectileRadius, CONFIG.combat.projectileDamage);
    }
  }

  createImpact(position: any): void {
    const mesh = BABYLON.MeshBuilder.CreateSphere(
      "impact",
      {
        diameter: 0.6,
        segments: 8,
      },
      this.scene,
    );

    mesh.material = this.impactMaterial.clone(`impact-material-${this.impacts.length}`);
    mesh.position.copyFrom(position);
    mesh.isPickable = false;

    this.impacts.push({
      mesh,
      remaining: 0.18,
      duration: 0.18,
    });
  }

  deactivateProjectile(projectile: any): void {
    projectile.active = false;
    projectile.mesh.setEnabled(false);
  }

  getActiveProjectileCount(): number {
    return this.projectiles.filter((projectile: any) => projectile.active).length;
  }
}
