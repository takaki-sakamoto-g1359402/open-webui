// @ts-nocheck

import { BABYLON, RAPIER } from "../core/runtime.js";
import { CONFIG } from "../core/constants.js";
import { InputManager } from "../core/input.js";
import { PhysicsWorld } from "./physics.js";
import { VoxelWorld } from "./world/voxel-world.js";
import { PlayerController } from "./player/player-controller.js";
import { ProjectileSystem } from "./combat/projectile-system.js";
import { EnemyManager } from "./entities/enemy-manager.js";
import { Hud } from "./ui/hud.js";

function round(value: number): number {
  return Number(value.toFixed(2));
}

export class SkyshardGame {
  [key: string]: any;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.engine = new BABYLON.Engine(canvas, true, {
      antialias: true,
      preserveDrawingBuffer: true,
      stencil: true,
    });
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.useRightHandedSystem = true;
    this.scene.clearColor = new BABYLON.Color4(0.54, 0.79, 0.98, 1);
    this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.012;
    this.scene.fogColor = new BABYLON.Color3(0.69, 0.84, 0.98);

    this.input = new InputManager(canvas);
    this.hud = new Hud();
    this.elapsedSeconds = 0;
    this.currentTarget = null;

    window.addEventListener("resize", () => {
      this.engine.resize();
    });
  }

  async initialize(): Promise<void> {
    await RAPIER.init();

    this.setupEnvironment();

    this.physicsWorld = new PhysicsWorld();
    this.world = new VoxelWorld(this.scene, this.physicsWorld);
    this.world.updateStreaming(new BABYLON.Vector3(0, 0, 0), 12);
    this.world.rebuildAllDirtyChunks();

    this.player = new PlayerController(this.scene, this.input, this.world);
    this.player.spawn(this.world.getSpawnPosition());

    this.enemyManager = new EnemyManager(this.scene, this.world, this.player);
    this.projectiles = new ProjectileSystem(
      this.scene,
      this.world,
      this.player,
      this.enemyManager.getDamageables(),
    );

    this.selectionMesh = BABYLON.MeshBuilder.CreateBox(
      "selection-box",
      {
        size: 1.03,
      },
      this.scene,
    );
    this.selectionMesh.isPickable = false;
    this.selectionMesh.setEnabled(false);
    const selectionMaterial = new BABYLON.StandardMaterial("selection-material", this.scene);
    selectionMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.95, 1);
    selectionMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.7, 1);
    selectionMaterial.alpha = 0.08;
    selectionMaterial.wireframe = true;
    selectionMaterial.specularColor = BABYLON.Color3.Black();
    this.selectionMesh.material = selectionMaterial;

    this.updateHud();
  }

  setupEnvironment(): void {
    const sun = new BABYLON.DirectionalLight(
      "sun",
      new BABYLON.Vector3(-0.45, -1, -0.35),
      this.scene,
    );
    sun.intensity = 1.1;
    sun.diffuse = new BABYLON.Color3(1, 0.96, 0.91);

    const skyLight = new BABYLON.HemisphericLight(
      "sky-light",
      new BABYLON.Vector3(0.2, 1, 0.1),
      this.scene,
    );
    skyLight.intensity = 0.55;
    skyLight.groundColor = new BABYLON.Color3(0.16, 0.19, 0.24);

    const shard = BABYLON.MeshBuilder.CreatePolyhedron(
      "floating-shard",
      {
        type: 1,
        size: 4.3,
      },
      this.scene,
    );
    shard.position.set(10, 24, 12);
    shard.rotation.set(0.6, 0.3, 0.2);
    const shardMaterial = new BABYLON.StandardMaterial("floating-shard-material", this.scene);
    shardMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.58, 1);
    shardMaterial.emissiveColor = new BABYLON.Color3(0.08, 0.26, 0.6);
    shardMaterial.specularColor = BABYLON.Color3.Black();
    shard.material = shardMaterial;

    const halo = BABYLON.MeshBuilder.CreateTorus(
      "floating-halo",
      {
        diameter: 8.5,
        thickness: 0.16,
        tessellation: 40,
      },
      this.scene,
    );
    halo.position.copyFrom(shard.position);
    halo.rotation.x = Math.PI / 2.4;
    const haloMaterial = new BABYLON.StandardMaterial("floating-halo-material", this.scene);
    haloMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.82, 1);
    haloMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.34, 0.65);
    haloMaterial.alpha = 0.55;
    haloMaterial.specularColor = BABYLON.Color3.Black();
    halo.material = haloMaterial;

    this.decorativeShard = shard;
    this.decorativeHalo = halo;
  }

  update(deltaSeconds: number): void {
    this.elapsedSeconds += deltaSeconds;

    this.decorativeShard.rotation.y += deltaSeconds * 0.2;
    this.decorativeHalo.rotation.z += deltaSeconds * 0.36;

    this.player.update(deltaSeconds);
    this.world.updateStreaming(this.player.position, 2);
    this.currentTarget = this.world.raycast(
      this.player.getEyePosition(),
      this.player.getForwardVector(),
      CONFIG.world.maxTargetDistance,
    );

    if (this.currentTarget) {
      this.selectionMesh.position.set(
        this.currentTarget.voxel.x + 0.5,
        this.currentTarget.voxel.y + 0.5,
        this.currentTarget.voxel.z + 0.5,
      );
      this.selectionMesh.setEnabled(true);
    } else {
      this.selectionMesh.setEnabled(false);
    }

    if (this.currentTarget && (this.input.wasPressed("KeyR") || this.input.wasPressed("Mouse2"))) {
      const removed = this.world.setBlock(
        this.currentTarget.voxel.x,
        this.currentTarget.voxel.y,
        this.currentTarget.voxel.z,
        0,
      );

      if (removed) {
        this.world.rebuildAllDirtyChunks();
      }
    }

    if (this.currentTarget && this.input.wasPressed("KeyE")) {
      const placePosition = this.currentTarget.voxel.add(this.currentTarget.normal);
      const bounds = this.player.getBounds();

      if (this.world.canPlaceBlock(placePosition.x, placePosition.y, placePosition.z, bounds)) {
        const placed = this.world.setBlock(
          placePosition.x,
          placePosition.y,
          placePosition.z,
          this.world.placeableBlockId,
        );

        if (placed) {
          this.world.rebuildAllDirtyChunks();
        }
      }
    }

    const wantsFire =
      (this.input.isPointerLocked() && this.input.isDown("Mouse0")) || this.input.isDown("KeyG");

    if (wantsFire) {
      this.projectiles.tryFire();
    }

    this.projectiles.update(deltaSeconds);
    this.enemyManager.update(deltaSeconds, this.elapsedSeconds);
    this.physicsWorld.step();
    this.updateHud();
    this.input.endFrame();
  }

  updateHud(): void {
    const targetText = this.currentTarget
      ? `${this.world.getBlockDisplayName(
          this.world.getBlock(
            this.currentTarget.voxel.x,
            this.currentTarget.voxel.y,
            this.currentTarget.voxel.z,
          ),
        )} @ (${this.currentTarget.voxel.x}, ${this.currentTarget.voxel.y}, ${this.currentTarget.voxel.z})`
      : "Target: none";

    const dashText = this.player.dashCooldown > 0.05
      ? `${this.player.dashCooldown.toFixed(1)}s`
      : "READY";
    const surgePercent = Math.round((this.player.surgeCharge / CONFIG.surge.maxCharge) * 100);
    const surgeText = this.player.surgeCharging ? `Surge Charge ${surgePercent}%` : `Surge ${surgePercent}%`;

    const statusText = this.input.isPointerLocked()
      ? `Flight ${this.player.flightEnabled ? "ON" : "OFF"} | Dash ${dashText} | ${surgeText}`
      : `Click to lock cursor. If blocked, hold left mouse and drag, or use a Mac trackpad two-finger swipe to look. ${surgeText}`;

    this.hud.update({
      statusText,
      combatText: `Bolts: ${this.projectiles.getActiveProjectileCount()} active | Hold X for Surge Charge`,
      enemyText: this.enemyManager.getHudSummary(),
      chunkText: `Chunks: ${this.world.loadedChunkCount} loaded | Edit radius ${CONFIG.world.maxTargetDistance}`,
      targetText: `${targetText} | ${this.enemyManager.getPriorityLine()}`,
      player: {
        hp: this.player.hp,
        maxHp: CONFIG.resources.maxHp,
        stamina: this.player.stamina,
        maxStamina: CONFIG.resources.maxStamina,
        energy: this.player.energy,
        maxEnergy: CONFIG.resources.maxEnergy,
        surgeActive: this.player.surgeCharging || this.player.surgeGlow > 0.02,
        surgeStrength: this.player.surgeGlow,
      },
    });
  }

  render(): void {
    this.scene.render();
  }

  advanceTime(milliseconds: number): void {
    const stepMs = 1000 / 60;
    const steps = Math.max(1, Math.round(milliseconds / stepMs));

    for (let index = 0; index < steps; index += 1) {
      this.update(CONFIG.debug.fixedStep);
    }

    this.render();
  }

  getDebugState() {
    return {
      identity: CONFIG.identity.title,
      coordinateSystem: "Origin near spawn. +X east, +Y up, +Z south.",
      player: this.player.getDebugState(),
      world: {
        loadedChunks: this.world.loadedChunkCount,
        target: this.currentTarget
          ? {
              x: this.currentTarget.voxel.x,
              y: this.currentTarget.voxel.y,
              z: this.currentTarget.voxel.z,
            }
          : null,
      },
      enemies: this.enemyManager.getDebugState(),
      combat: {
        activeProjectiles: this.projectiles.getActiveProjectileCount(),
      },
      camera: {
        position: {
          x: round(this.player.camera.position.x),
          y: round(this.player.camera.position.y),
          z: round(this.player.camera.position.z),
        },
      },
    };
  }
}
