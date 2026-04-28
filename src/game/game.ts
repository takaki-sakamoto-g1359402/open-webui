// @ts-nocheck

import { BABYLON, RAPIER } from "../core/runtime.js";
import { CONFIG } from "../core/constants.js";
import { InputManager } from "../core/input.js";
import { PhysicsWorld } from "./physics.js";
import { VoxelWorld } from "./world/voxel-world.js";
import { PlayerController } from "./player/player-controller.js";
import { Hud } from "./ui/hud.js";
import { BLOCK_IDS } from "./world/block-types.js";
import { BUILD_MODE_OPTIONS, getBuildingDefinitionForBlock } from "./buildings/building-types.js";
import { BuildingManager } from "./buildings/building-manager.js";
import { SettlementSimulation } from "./simulation/settlement-simulation.js";
import { AGENT_PICK_METADATA_KEY, AgentManager } from "./agents/agent-manager.js";
import { SaveSystem } from "./save/save-system.js";

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
    this.selectedBuildSlot = 1;
    this.selectedBlockId = BLOCK_IDS.HOUSE;

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

    this.buildings = new BuildingManager();
    this.settlement = new SettlementSimulation();
    this.placeStarterSettlement();
    this.world.rebuildAllDirtyChunks();

    this.player = new PlayerController(this.scene, this.input, this.world);
    this.player.spawn(this.world.getSpawnPosition());

    this.agentManager = new AgentManager(this.scene, this.world, this.buildings);

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

  placeStarterSettlement(): void {
    const starterBlocks = [
      { x: 9, z: 10, blockId: BLOCK_IDS.HOUSE },
      { x: 12, z: 10, blockId: BLOCK_IDS.STORAGE },
      { x: 11, z: 13, blockId: BLOCK_IDS.WORKSHOP },
      { x: 14, z: 12, blockId: BLOCK_IDS.CIVIC },
      { x: 10, z: 11, blockId: BLOCK_IDS.ROAD },
      { x: 11, z: 11, blockId: BLOCK_IDS.ROAD },
      { x: 12, z: 11, blockId: BLOCK_IDS.ROAD },
    ];

    for (const block of starterBlocks) {
      const y = this.world.getSurfaceHeightAt(block.x, block.z) + 1;
      const placed = this.world.setBlock(block.x, y, block.z, block.blockId);

      if (placed) {
        this.buildings.recordBlockPlaced(block.x, y, block.z, block.blockId, "starter");
      }
    }

    this.settlement.addLog("Starter settlement seeded with house, storage, workshop, roads, and civic beacon.", "success");
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

    this.handleSandboxInput();

    if (this.currentTarget && (this.input.wasPressed("KeyR") || this.input.wasPressed("Mouse2"))) {
      const removedBlockId = this.world.getBlock(
        this.currentTarget.voxel.x,
        this.currentTarget.voxel.y,
        this.currentTarget.voxel.z,
      );
      const removed = this.world.setBlock(
        this.currentTarget.voxel.x,
        this.currentTarget.voxel.y,
        this.currentTarget.voxel.z,
        0,
      );

      if (removed) {
        const removedBuilding = this.buildings.recordBlockRemoved(
          this.currentTarget.voxel.x,
          this.currentTarget.voxel.y,
          this.currentTarget.voxel.z,
        );

        if (removedBuilding) {
          this.settlement.addLog(`${removedBuilding.label} removed. Settlement effects recalculated.`, "warning");
        } else if (removedBlockId !== BLOCK_IDS.AIR) {
          this.settlement.addLog("Terrain block removed.", "info");
        }

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
          this.selectedBlockId,
        );

        if (placed) {
          const building = this.buildings.recordBlockPlaced(
            placePosition.x,
            placePosition.y,
            placePosition.z,
            this.selectedBlockId,
          );
          const definition = getBuildingDefinitionForBlock(this.selectedBlockId);

          if (building && definition) {
            this.settlement.addLog(`${definition.label} built. ${definition.description}`, "success");
          }

          this.world.rebuildAllDirtyChunks();
        }
      }
    }

    this.agentManager.update(deltaSeconds, this.settlement, this.buildings, this.world);
    this.settlement.update(deltaSeconds, this.buildings, this.agentManager.getAgents());
    this.physicsWorld.step();
    this.updateHud();
    this.input.endFrame();
  }

  handleSandboxInput(): void {
    for (const option of BUILD_MODE_OPTIONS) {
      if (this.input.wasPressed(`Digit${option.slot}`)) {
        this.selectedBuildSlot = option.slot;
        this.selectedBlockId = option.blockId;
        const definition = getBuildingDefinitionForBlock(option.blockId);
        this.settlement.addLog(`Build mode selected: ${definition?.label ?? "Unknown"}.`, "info");
      }
    }

    if (this.input.wasPressed("Mouse0")) {
      const agent = this.trySelectCharacterFromPointer();

      if (agent) {
        this.settlement.addLog(`Inspecting ${agent.name} from direct selection.`, "info");
      }
    }

    if (this.input.wasPressed("Tab")) {
      const agent = this.agentManager.selectNextAgent();
      this.settlement.addLog(`Inspecting ${agent.name}.`, "info");
    }

    if (this.input.wasPressed("KeyT")) {
      const agent = this.agentManager.cycleSelectedDirective();
      this.settlement.addLog(`${agent.name} directive: ${this.agentManager.getHudState().selected.directive}.`, "info");
    }

    if (this.input.wasPressed("KeyO")) {
      const saved = SaveSystem.save({
        buildings: this.buildings.getBuildings(),
        settlement: this.settlement.serialize(),
        agents: this.agentManager.serialize(),
      });

      this.settlement.addLog(
        saved ? "Saved settlement state to local storage." : "Save failed: local storage unavailable.",
        saved ? "success" : "warning",
      );
    }

    if (this.input.wasPressed("KeyP")) {
      const saved = SaveSystem.load();

      if (!saved?.payload) {
        this.settlement.addLog("No saved settlement state found.", "warning");
        return;
      }

      this.restoreFromSave(saved.payload);
    }
  }

  trySelectCharacterFromPointer(): any | null {
    const pickX = this.input.isPointerLocked()
      ? this.engine.getRenderWidth() * 0.5
      : this.scene.pointerX;
    const pickY = this.input.isPointerLocked()
      ? this.engine.getRenderHeight() * 0.5
      : this.scene.pointerY;
    const hit = this.scene.pick(
      pickX,
      pickY,
      (mesh: any) => Boolean(mesh?.metadata?.[AGENT_PICK_METADATA_KEY]),
      false,
      this.player.camera,
    );

    if (!hit?.hit || !hit.pickedMesh) {
      return null;
    }

    return this.agentManager.selectAgentByPickedMesh(hit.pickedMesh);
  }

  restoreFromSave(payload: any): void {
    for (const building of this.buildings.getBuildings()) {
      this.world.setBlock(building.position.x, building.position.y, building.position.z, BLOCK_IDS.AIR);
    }

    this.buildings.clear();

    for (const building of payload.buildings ?? []) {
      this.world.setBlock(
        building.position.x,
        building.position.y,
        building.position.z,
        building.blockId,
      );
      this.buildings.restoreInstance(building);
    }

    this.settlement.restore(payload.settlement);
    this.agentManager.restore(payload.agents);
    this.world.rebuildAllDirtyChunks();
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
      : `Click canvas to lock cursor. ${surgeText}`;

    const selectedDefinition = getBuildingDefinitionForBlock(this.selectedBlockId);
    const settlementState = this.settlement.getState(this.buildings, this.agentManager.getAgents());

    this.hud.update({
      statusText,
      chunkText: `Chunks ${this.world.loadedChunkCount} | Edit radius ${CONFIG.world.maxTargetDistance}`,
      targetText,
      build: {
        selectedSlot: this.selectedBuildSlot,
        selectedBlockId: this.selectedBlockId,
        selectedLabel: selectedDefinition?.label ?? "Unknown",
        options: this.buildings.getBuildModeOptions(),
      },
      settlement: settlementState,
      agents: this.agentManager.getHudState(),
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
      settlement: this.settlement.getState(this.buildings, this.agentManager.getAgents()),
      buildings: this.buildings.getDebugState(),
      agents: this.agentManager.getDebugState(),
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
