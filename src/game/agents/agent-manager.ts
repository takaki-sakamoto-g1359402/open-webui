// @ts-nocheck

import { BABYLON } from "../../core/runtime.js";
import { BUILDING_KINDS } from "../buildings/building-types.js";
import { SAMPLE_PERSONALITY_PROFILES } from "../personality/sample-profiles.js";

export const AGENT_DIRECTIVES = Object.freeze([
  { id: "balanced", label: "Balanced" },
  { id: "stockpile_food", label: "Stockpile food" },
  { id: "build_focus", label: "Build focus" },
  { id: "community_care", label: "Community care" },
  { id: "self_directed", label: "Self-directed" },
]);

const FALLBACK_CHARACTER = Object.freeze({
  archetype: "Original settlement companion",
  visualTheme: "simple modest work outfit",
  hairColor: [0.22, 0.16, 0.12],
  skinColor: [0.94, 0.72, 0.58],
  outfitColor: [0.55, 0.74, 0.96],
  accentColor: [0.96, 0.76, 0.38],
  eyeColor: [0.18, 0.34, 0.62],
});

export const AGENT_PICK_METADATA_KEY = "settlementCharacterProfileId";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function distance2D(a: any, b: any): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function round(value: number): number {
  return Number(value.toFixed(1));
}

function makeMaterial(scene: any, name: string, color: number[], emissive = 0.05): any {
  const material = new BABYLON.StandardMaterial(name, scene);
  material.diffuseColor = new BABYLON.Color3(color[0], color[1], color[2]);
  material.emissiveColor = new BABYLON.Color3(
    color[0] * emissive,
    color[1] * emissive,
    color[2] * emissive,
  );
  material.specularColor = BABYLON.Color3.Black();
  return material;
}

function attachPart(
  root: any,
  profile: any,
  mesh: any,
  material: any,
  position: any,
  scaling = { x: 1, y: 1, z: 1 },
  rotation = { x: 0, y: 0, z: 0 },
): any {
  mesh.parent = root;
  mesh.position.set(position.x, position.y, position.z);
  mesh.scaling.set(scaling.x, scaling.y, scaling.z);
  mesh.rotation.set(rotation.x, rotation.y, rotation.z);
  mesh.material = material;
  mesh.isPickable = true;
  mesh.metadata = {
    ...(mesh.metadata ?? {}),
    [AGENT_PICK_METADATA_KEY]: profile.id,
  };
  return mesh;
}

export class AgentManager {
  [key: string]: any;

  constructor(scene: any, world: any, buildingManager: any) {
    this.scene = scene;
    this.world = world;
    this.buildingManager = buildingManager;
    this.agents = [];
    this.selectedIndex = 0;
    this.elapsedSeconds = 0;
    this.spawnInitialAgents();
  }

  spawnInitialAgents(): void {
    const spawnAnchors = [
      { x: 10, z: 10 },
      { x: 13, z: 10 },
      { x: 10, z: 13 },
      { x: 14, z: 13 },
      { x: 8, z: 12 },
    ];

    SAMPLE_PERSONALITY_PROFILES.forEach((profile, index) => {
      const anchor = spawnAnchors[index] ?? { x: 9 + index, z: 9 + index };
      const y = this.world.getSurfaceHeightAt(anchor.x, anchor.z) + 1.05;
      const agent = {
        id: `agent-${index + 1}`,
        name: profile.name,
        role: profile.role,
        profile,
        position: new BABYLON.Vector3(anchor.x + 0.5, y, anchor.z + 0.5),
        target: null,
        directive: "balanced",
        needs: {
          hunger: 78 - index * 3,
          energy: 82 - index * 2,
          social: 64 + index * 4,
        },
        mood: "Settling in",
        currentGoal: "Survey settlement",
        currentTask: null,
        taskQueue: [],
        memoryLog: [
          `Joined as ${profile.character?.archetype ?? "an original companion"} with visible simulation rules.`,
        ],
        workTimer: 0,
        mesh: this.createAgentMesh(profile),
      };

      agent.mesh.position.copyFrom(agent.position);
      this.agents.push(agent);
    });

    this.updateSelectedVisuals();
  }

  createAgentMesh(profile: any): any {
    const visual = {
      ...FALLBACK_CHARACTER,
      ...(profile.character ?? {}),
    };
    const root = new BABYLON.TransformNode(`${profile.id}-root`, this.scene);
    root.metadata = {
      [AGENT_PICK_METADATA_KEY]: profile.id,
      archetype: visual.archetype,
      visualTheme: visual.visualTheme,
    };

    const skin = makeMaterial(this.scene, `${profile.id}-skin-material`, visual.skinColor, 0.03);
    const hair = makeMaterial(this.scene, `${profile.id}-hair-material`, visual.hairColor, 0.05);
    const outfit = makeMaterial(this.scene, `${profile.id}-outfit-material`, visual.outfitColor, 0.08);
    const accent = makeMaterial(this.scene, `${profile.id}-accent-material`, visual.accentColor, 0.18);
    const eyes = makeMaterial(this.scene, `${profile.id}-eye-material`, visual.eyeColor, 0.16);
    const dark = makeMaterial(this.scene, `${profile.id}-dark-detail-material`, [0.08, 0.08, 0.1], 0.02);

    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateBox(`${profile.id}-left-leg`, { width: 0.1, height: 0.36, depth: 0.12 }, this.scene),
      dark,
      { x: -0.1, y: 0.08, z: 0 },
    );
    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateBox(`${profile.id}-right-leg`, { width: 0.1, height: 0.36, depth: 0.12 }, this.scene),
      dark,
      { x: 0.1, y: 0.08, z: 0 },
    );
    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateBox(`${profile.id}-left-boot`, { width: 0.15, height: 0.08, depth: 0.2 }, this.scene),
      dark,
      { x: -0.1, y: -0.12, z: -0.03 },
    );
    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateBox(`${profile.id}-right-boot`, { width: 0.15, height: 0.08, depth: 0.2 }, this.scene),
      dark,
      { x: 0.1, y: -0.12, z: -0.03 },
    );
    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateCylinder(
        `${profile.id}-dress`,
        { height: 0.64, diameterTop: 0.34, diameterBottom: 0.46, tessellation: 10 },
        this.scene,
      ),
      outfit,
      { x: 0, y: 0.42, z: 0 },
    );
    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateCylinder(
        `${profile.id}-skirt`,
        { height: 0.22, diameterTop: 0.48, diameterBottom: 0.62, tessellation: 10 },
        this.scene,
      ),
      outfit,
      { x: 0, y: 0.18, z: 0 },
    );
    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateBox(`${profile.id}-sash`, { width: 0.5, height: 0.08, depth: 0.08 }, this.scene),
      accent,
      { x: 0, y: 0.5, z: -0.2 },
      { x: 1, y: 1, z: 1 },
      { x: 0, y: 0, z: -0.15 },
    );
    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateBox(`${profile.id}-tie`, { width: 0.08, height: 0.28, depth: 0.04 }, this.scene),
      accent,
      { x: 0, y: 0.72, z: -0.2 },
      { x: 1, y: 1, z: 1 },
      { x: 0, y: 0, z: 0.08 },
    );
    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateCylinder(
        `${profile.id}-left-sleeve`,
        { height: 0.42, diameterTop: 0.1, diameterBottom: 0.09, tessellation: 8 },
        this.scene,
      ),
      outfit,
      { x: -0.33, y: 0.48, z: 0 },
      { x: 1, y: 1, z: 1 },
      { x: 0, y: 0, z: -0.18 },
    );
    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateCylinder(
        `${profile.id}-right-sleeve`,
        { height: 0.42, diameterTop: 0.1, diameterBottom: 0.09, tessellation: 8 },
        this.scene,
      ),
      outfit,
      { x: 0.33, y: 0.48, z: 0 },
      { x: 1, y: 1, z: 1 },
      { x: 0, y: 0, z: 0.18 },
    );
    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateSphere(`${profile.id}-head`, { diameter: 0.42, segments: 10 }, this.scene),
      skin,
      { x: 0, y: 1.03, z: -0.02 },
      { x: 0.95, y: 1.04, z: 0.9 },
    );
    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateSphere(`${profile.id}-back-hair`, { diameter: 0.48, segments: 10 }, this.scene),
      hair,
      { x: 0, y: 1.06, z: 0.13 },
      { x: 1.04, y: 1.12, z: 0.82 },
    );
    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateBox(`${profile.id}-bang-center`, { width: 0.18, height: 0.16, depth: 0.06 }, this.scene),
      hair,
      { x: 0, y: 1.21, z: -0.22 },
      { x: 1, y: 1, z: 1 },
      { x: 0.16, y: 0, z: 0.04 },
    );
    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateBox(`${profile.id}-bang-left`, { width: 0.12, height: 0.18, depth: 0.055 }, this.scene),
      hair,
      { x: -0.12, y: 1.17, z: -0.22 },
      { x: 1, y: 1, z: 1 },
      { x: -0.08, y: 0, z: -0.18 },
    );
    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateBox(`${profile.id}-bang-right`, { width: 0.12, height: 0.18, depth: 0.055 }, this.scene),
      hair,
      { x: 0.12, y: 1.17, z: -0.22 },
      { x: 1, y: 1, z: 1 },
      { x: -0.08, y: 0, z: 0.18 },
    );
    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateCylinder(
        `${profile.id}-left-side-hair`,
        { height: 0.36, diameterTop: 0.08, diameterBottom: 0.12, tessellation: 8 },
        this.scene,
      ),
      hair,
      { x: -0.27, y: 0.98, z: 0.02 },
    );
    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateCylinder(
        `${profile.id}-right-side-hair`,
        { height: 0.36, diameterTop: 0.08, diameterBottom: 0.12, tessellation: 8 },
        this.scene,
      ),
      hair,
      { x: 0.27, y: 0.98, z: 0.02 },
    );
    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateSphere(`${profile.id}-left-tail`, { diameter: 0.18, segments: 8 }, this.scene),
      hair,
      { x: -0.34, y: 0.9, z: 0.12 },
      { x: 0.85, y: 1.4, z: 0.85 },
    );
    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateSphere(`${profile.id}-right-tail`, { diameter: 0.18, segments: 8 }, this.scene),
      hair,
      { x: 0.34, y: 0.9, z: 0.12 },
      { x: 0.85, y: 1.4, z: 0.85 },
    );
    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateBox(`${profile.id}-left-eye`, { width: 0.055, height: 0.075, depth: 0.018 }, this.scene),
      eyes,
      { x: -0.08, y: 1.05, z: -0.21 },
    );
    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateBox(`${profile.id}-right-eye`, { width: 0.055, height: 0.075, depth: 0.018 }, this.scene),
      eyes,
      { x: 0.08, y: 1.05, z: -0.21 },
    );
    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateBox(`${profile.id}-smile`, { width: 0.1, height: 0.018, depth: 0.014 }, this.scene),
      dark,
      { x: 0, y: 0.94, z: -0.21 },
    );
    attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateBox(`${profile.id}-role-marker`, { width: 0.16, height: 0.16, depth: 0.16 }, this.scene),
      accent,
      { x: 0, y: 1.36, z: 0 },
    );
    const selectionRing = attachPart(
      root,
      profile,
      BABYLON.MeshBuilder.CreateTorus(
        `${profile.id}-selection-ring`,
        { diameter: 0.86, thickness: 0.035, tessellation: 20 },
        this.scene,
      ),
      accent,
      { x: 0, y: -0.13, z: 0 },
      { x: 1, y: 1, z: 1 },
      { x: Math.PI / 2, y: 0, z: 0 },
    );
    selectionRing.isPickable = false;
    selectionRing.setEnabled(false);

    return root;
  }

  update(deltaSeconds: number, settlement: any, buildingManager: any, world: any): void {
    this.elapsedSeconds += deltaSeconds;

    this.agents.forEach((agent, index) => {
      this.updateNeeds(agent, deltaSeconds);

      if (!agent.currentTask) {
        this.assignNextTask(agent, settlement, buildingManager, world);
      }

      this.updateTask(agent, deltaSeconds, settlement, buildingManager, world);
      this.updateMood(agent, settlement, buildingManager);
      agent.mesh.position.copyFrom(agent.position);
      agent.mesh.position.y += Math.sin(this.elapsedSeconds * 4 + index * 0.7) * 0.018;
    });
  }

  updateNeeds(agent: any, deltaSeconds: number): void {
    agent.needs.hunger = clamp(agent.needs.hunger - deltaSeconds * 0.18, 0, 100);
    agent.needs.energy = clamp(agent.needs.energy - deltaSeconds * 0.24, 0, 100);
    agent.needs.social = clamp(
      agent.needs.social - deltaSeconds * (agent.profile.socialTendency > 0.6 ? 0.22 : 0.13),
      0,
      100,
    );
  }

  assignNextTask(agent: any, settlement: any, buildingManager: any, world: any): void {
    const candidates = this.buildTaskCandidates(agent, settlement, buildingManager, world)
      .map((task) => ({
        ...task,
        score: this.scoreTask(agent, task, settlement, buildingManager),
      }))
      .sort((a, b) => b.score - a.score);

    const chosen = candidates[0];
    agent.taskQueue = candidates.slice(0, 3).map((task) => `${task.label} (${task.score.toFixed(1)})`);
    agent.currentTask = chosen;
    agent.currentGoal = chosen.goal;
    agent.target = chosen.target;
    agent.workTimer = 0;
    this.remember(agent, `Chose ${chosen.label}: ${chosen.reason}`);
  }

  buildTaskCandidates(agent: any, settlement: any, buildingManager: any, world: any): any[] {
    const state = settlement.getState(buildingManager, this.agents);
    const house = buildingManager.getNearestBuilding(BUILDING_KINDS.HOUSE, agent.position);
    const storage = buildingManager.getNearestBuilding(BUILDING_KINDS.STORAGE, agent.position);
    const workshop = buildingManager.getNearestBuilding(BUILDING_KINDS.WORKSHOP, agent.position);
    const civic = buildingManager.getNearestBuilding(BUILDING_KINDS.CIVIC, agent.position);
    const road = buildingManager.getNearestBuilding(BUILDING_KINDS.ROAD, agent.position);
    const forageTarget = this.getOpenWorldTarget(agent, world, 7 + agent.profile.riskTolerance * 8);
    const quarryTarget = workshop
      ? this.targetForBuilding(workshop, world)
      : this.getOpenWorldTarget(agent, world, 5);

    return [
      {
        id: "gather_food",
        label: "Gather food",
        goal: "Gathering food reserves",
        roleKey: "gatherer",
        target: storage ? this.targetForBuilding(storage, world) : forageTarget,
        duration: 2.5,
        resourceDelta: { food: 5 + Math.round(agent.profile.priorities.foodSecurity * 3) },
        needDelta: { energy: -7, hunger: -3 },
        reason: `food reserve ${state.resources.food}/${state.caps.storage}, food priority ${agent.profile.priorities.foodSecurity.toFixed(2)}`,
        completionSummary: "gathered food and updated the shared reserve.",
      },
      {
        id: "gather_materials",
        label: "Gather materials",
        goal: "Gathering build materials",
        roleKey: "builder",
        target: quarryTarget,
        duration: workshop ? 2.8 : 3.8,
        resourceDelta: { materials: workshop ? 7 : 4 },
        needDelta: { energy: -9, hunger: -2 },
        reason: `materials reserve ${state.resources.materials}/${state.caps.storage}, construction priority ${agent.profile.priorities.construction.toFixed(2)}`,
        completionSummary: workshop
          ? "produced materials using the workshop."
          : "salvaged rough materials without a workshop.",
      },
      {
        id: "rest",
        label: "Rest",
        goal: "Resting and recovering",
        roleKey: "caretaker",
        target: house ? this.targetForBuilding(house, world) : this.getOpenWorldTarget(agent, world, 2),
        duration: 3.2,
        resourceDelta: {},
        needDelta: { energy: 34, hunger: 10 },
        moraleDelta: 0.4,
        reason: `energy ${agent.needs.energy.toFixed(0)}, routine preference ${agent.profile.routinePreference.toFixed(2)}`,
        completionSummary: "rested and recovered energy.",
      },
      {
        id: "socialize",
        label: "Social check-in",
        goal: "Checking in with nearby agents",
        roleKey: "caretaker",
        target: civic ? this.targetForBuilding(civic, world) : this.getSocialTarget(agent, world),
        duration: 2.6,
        resourceDelta: {},
        needDelta: { social: 28, energy: -3 },
        moraleDelta: 1.6,
        reason: `social need ${agent.needs.social.toFixed(0)}, social tendency ${agent.profile.socialTendency.toFixed(2)}`,
        completionSummary: "improved local morale with a social check-in.",
      },
      {
        id: "civic_planning",
        label: "Civic planning",
        goal: "Planning settlement priorities",
        roleKey: "planner",
        target: civic ? this.targetForBuilding(civic, world) : this.getOpenWorldTarget(agent, world, 3),
        duration: civic ? 3 : 4.4,
        resourceDelta: { knowledge: civic ? 2.4 : 1 },
        needDelta: { energy: -5, social: -1 },
        moraleDelta: civic ? 0.8 : 0,
        reason: `civic focus ${state.civicFocus}, research priority ${agent.profile.priorities.research.toFixed(2)}`,
        completionSummary: civic
          ? "created a civic planning note at the beacon."
          : "drafted a basic plan without civic infrastructure.",
      },
      {
        id: "haul_storage",
        label: "Haul supplies",
        goal: "Moving supplies to storage",
        roleKey: "hauler",
        target: storage ? this.targetForBuilding(storage, world) : this.getOpenWorldTarget(agent, world, 4),
        duration: storage ? 2.2 : 3.4,
        resourceDelta: { materials: storage ? 2 : 1, food: storage ? 1 : 0 },
        needDelta: { energy: -6, hunger: -1 },
        reason: `storage capacity ${state.caps.storage}, hauler affinity ${agent.profile.roleAffinity.hauler.toFixed(2)}`,
        completionSummary: "hauled loose supplies into usable reserves.",
      },
      {
        id: "road_patrol",
        label: "Road survey",
        goal: "Surveying settlement paths",
        roleKey: "planner",
        target: road ? this.targetForBuilding(road, world) : this.getOpenWorldTarget(agent, world, 4),
        duration: road ? 2 : 3.4,
        resourceDelta: { knowledge: road ? 0.8 : 0.2 },
        needDelta: { energy: -4 },
        moraleDelta: road ? 0.3 : 0,
        reason: `road score ${state.roadScore}, stability value ${agent.profile.values.stability.toFixed(2)}`,
        completionSummary: "surveyed travel paths and improved settlement awareness.",
      },
    ];
  }

  scoreTask(agent: any, task: any, settlement: any, buildingManager: any): number {
    const profile = agent.profile;
    const foodPressure = settlement.getShortagePressure("food", buildingManager);
    const materialPressure = settlement.getShortagePressure("materials", buildingManager);
    const directiveBonus = this.getDirectiveBonus(agent.directive, task.id, profile);
    let score = 1 + directiveBonus;

    score += (profile.roleAffinity[task.roleKey] ?? 0.3) * 3;

    if (task.id === "gather_food") {
      score += foodPressure * 6 + profile.priorities.foodSecurity * 4 + (100 - agent.needs.hunger) * 0.04;
    } else if (task.id === "gather_materials") {
      score += materialPressure * 4.5 + profile.priorities.construction * 4 + profile.values.efficiency * 1.2;
    } else if (task.id === "rest") {
      score += (100 - agent.needs.energy) * 0.075 + profile.values.stability * 1.4 + profile.routinePreference * 1.2;
    } else if (task.id === "socialize") {
      score += (100 - agent.needs.social) * 0.05 + profile.socialTendency * 4 + profile.priorities.socialCare * 3;
    } else if (task.id === "civic_planning") {
      score += profile.roleAffinity.planner * 2.4 + profile.priorities.research * 3 + profile.values.community * 1.3;
    } else if (task.id === "haul_storage") {
      score += profile.roleAffinity.hauler * 3 + materialPressure * 2 + profile.values.efficiency * 1.7;
    } else if (task.id === "road_patrol") {
      score += profile.values.stability * 1.2 + profile.priorities.exploration * 1.8;
    }

    if (agent.currentTask?.id === task.id || agent.memoryLog[0]?.includes(task.label)) {
      score += profile.routinePreference * 0.8;
    }

    score += profile.riskTolerance * (task.id === "gather_food" || task.id === "road_patrol" ? 0.9 : 0);
    return score;
  }

  getDirectiveBonus(directive: string, taskId: string, profile: any): number {
    if (directive === "self_directed") {
      return profile.obedienceIndependence * 1.2;
    }

    const obedience = 1 - profile.obedienceIndependence;
    const table = {
      stockpile_food: { gather_food: 3.2, haul_storage: 1 },
      build_focus: { gather_materials: 2.8, haul_storage: 1.6, road_patrol: 0.8 },
      community_care: { socialize: 3.1, rest: 1.6, civic_planning: 1.2 },
      balanced: {},
    };

    return (table[directive]?.[taskId] ?? 0) * (0.65 + obedience);
  }

  updateTask(agent: any, deltaSeconds: number, settlement: any, buildingManager: any, world: any): void {
    const task = agent.currentTask;

    if (!task) {
      return;
    }

    const distance = distance2D(agent.position, task.target);

    if (distance > 0.16) {
      const roadBonus = Math.min(0.45, buildingManager.getEffects().roadScore * 0.025);
      const speed = (1.45 + agent.profile.values.efficiency * 0.35 + roadBonus) * deltaSeconds;
      const dx = task.target.x - agent.position.x;
      const dz = task.target.z - agent.position.z;
      const step = Math.min(speed, distance);

      agent.mesh.rotation.y = Math.atan2(dx, dz) + Math.PI;
      agent.position.x += (dx / distance) * step;
      agent.position.z += (dz / distance) * step;
      agent.position.y += (task.target.y - agent.position.y) * 0.18;
      agent.currentGoal = `Moving to ${task.label}`;
      return;
    }

    agent.workTimer += deltaSeconds;
    agent.currentGoal = `Executing ${task.label}`;

    if (agent.workTimer < task.duration) {
      return;
    }

    for (const [need, amount] of Object.entries(task.needDelta ?? {})) {
      agent.needs[need] = clamp((agent.needs[need] ?? 0) + amount, 0, 100);
    }

    settlement.applyAgentTask(agent, task, buildingManager);
    this.remember(agent, `Completed ${task.label}: ${task.completionSummary}`);
    agent.currentTask = null;
    agent.target = null;
    agent.workTimer = 0;
  }

  updateMood(agent: any, settlement: any, buildingManager: any): void {
    const foodPressure = settlement.getShortagePressure("food", buildingManager);

    if (agent.needs.energy < 24) {
      agent.mood = "Tired";
    } else if (agent.needs.hunger < 28 || foodPressure > 0.65) {
      agent.mood = "Concerned about food";
    } else if (agent.needs.social < 24 && agent.profile.socialTendency > 0.55) {
      agent.mood = "Socially strained";
    } else if (agent.profile.values.efficiency > 0.8) {
      agent.mood = "Throughput-focused";
    } else {
      agent.mood = "Stable";
    }
  }

  targetForBuilding(building: any, world: any): any {
    const x = building.position.x + 0.5;
    const z = building.position.z + 0.5;
    const y = world.getSurfaceHeightAt(x, z) + 1.05;
    return new BABYLON.Vector3(x, y, z);
  }

  getOpenWorldTarget(agent: any, world: any, radius: number): any {
    const seed = agent.id.charCodeAt(agent.id.length - 1) + Math.floor(this.elapsedSeconds / 10);
    const angle = seed * 1.73 + agent.profile.riskTolerance * Math.PI;
    const x = 10.5 + Math.cos(angle) * radius;
    const z = 10.5 + Math.sin(angle) * radius;
    const y = world.getSurfaceHeightAt(x, z) + 1.05;
    return new BABYLON.Vector3(x, y, z);
  }

  getSocialTarget(agent: any, world: any): any {
    const other = this.agents.find((candidate) => candidate.id !== agent.id) ?? agent;
    const x = other.position.x + 0.75;
    const z = other.position.z + 0.75;
    const y = world.getSurfaceHeightAt(x, z) + 1.05;
    return new BABYLON.Vector3(x, y, z);
  }

  remember(agent: any, text: string): void {
    agent.memoryLog.unshift(text);
    agent.memoryLog = agent.memoryLog.slice(0, 5);
  }

  selectNextAgent(): any {
    this.selectedIndex = (this.selectedIndex + 1) % this.agents.length;
    this.updateSelectedVisuals();
    return this.getSelectedAgent();
  }

  selectAgentByPickedMesh(mesh: any): any | null {
    const profileId =
      mesh?.metadata?.[AGENT_PICK_METADATA_KEY] ??
      mesh?.parent?.metadata?.[AGENT_PICK_METADATA_KEY];

    if (!profileId) {
      return null;
    }

    return this.selectAgentByProfileId(profileId);
  }

  selectAgentByProfileId(profileId: string): any | null {
    const index = this.agents.findIndex((agent) => agent.profile.id === profileId);

    if (index < 0) {
      return null;
    }

    this.selectedIndex = index;
    this.updateSelectedVisuals();
    return this.getSelectedAgent();
  }

  updateSelectedVisuals(): void {
    this.agents.forEach((agent, index) => {
      const isSelected = index === this.selectedIndex;

      for (const mesh of agent.mesh.getChildMeshes(false)) {
        if (mesh.name.endsWith("-selection-ring")) {
          mesh.setEnabled(isSelected);
        }
      }
    });
  }

  cycleSelectedDirective(): any {
    const agent = this.getSelectedAgent();
    const index = AGENT_DIRECTIVES.findIndex((directive) => directive.id === agent.directive);
    const next = AGENT_DIRECTIVES[(index + 1) % AGENT_DIRECTIVES.length];
    agent.directive = next.id;
    this.remember(agent, `Player directive changed to ${next.label}.`);
    return agent;
  }

  getSelectedAgent(): any {
    return this.agents[this.selectedIndex] ?? this.agents[0];
  }

  getAgents(): any[] {
    return this.agents;
  }

  getHudState(): any {
    const selected = this.getSelectedAgent();

    return {
      selected: this.serializeAgentForHud(selected),
      comparison: this.agents.map((agent, index) => ({
        id: agent.id,
        selected: index === this.selectedIndex,
        name: agent.name,
        role: agent.role,
        mood: agent.mood,
        goal: agent.currentGoal,
        directive: AGENT_DIRECTIVES.find((item) => item.id === agent.directive)?.label ?? agent.directive,
        needs: {
          hunger: round(agent.needs.hunger),
          energy: round(agent.needs.energy),
          social: round(agent.needs.social),
        },
      })),
    };
  }

  serializeAgentForHud(agent: any): any {
    const profile = agent.profile;
    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      simulationLabel: profile.simulationLabel,
      character: profile.character ?? FALLBACK_CHARACTER,
      mood: agent.mood,
      directive: AGENT_DIRECTIVES.find((item) => item.id === agent.directive)?.label ?? agent.directive,
      goal: agent.currentGoal,
      taskQueue: agent.taskQueue,
      needs: {
        hunger: round(agent.needs.hunger),
        energy: round(agent.needs.energy),
        social: round(agent.needs.social),
      },
      personality: {
        values: profile.values,
        priorities: profile.priorities,
        workStyle: profile.workStyle,
        socialTendency: profile.socialTendency,
        riskTolerance: profile.riskTolerance,
        obedienceIndependence: profile.obedienceIndependence,
        routinePreference: profile.routinePreference,
        communicationStyle: profile.communicationStyle,
        redLines: profile.redLines,
        roleAffinity: profile.roleAffinity,
      },
      memoryLog: agent.memoryLog,
    };
  }

  serialize(): any {
    return {
      selectedIndex: this.selectedIndex,
      agents: this.agents.map((agent) => ({
        id: agent.id,
        directive: agent.directive,
        needs: agent.needs,
        position: {
          x: agent.position.x,
          y: agent.position.y,
          z: agent.position.z,
        },
        memoryLog: agent.memoryLog,
      })),
    };
  }

  restore(data: any): void {
    if (!data) {
      return;
    }

    this.selectedIndex = clamp(data.selectedIndex ?? this.selectedIndex, 0, this.agents.length - 1);
    this.updateSelectedVisuals();

    for (const saved of data.agents ?? []) {
      const agent = this.agents.find((candidate) => candidate.id === saved.id);

      if (!agent) {
        continue;
      }

      agent.directive = saved.directive ?? agent.directive;
      agent.needs = { ...agent.needs, ...(saved.needs ?? {}) };
      agent.memoryLog = Array.isArray(saved.memoryLog) ? saved.memoryLog.slice(0, 5) : agent.memoryLog;

      if (saved.position) {
        agent.position.set(saved.position.x, saved.position.y, saved.position.z);
        agent.mesh.position.copyFrom(agent.position);
      }

      agent.currentTask = null;
      agent.target = null;
      agent.workTimer = 0;
    }
  }

  getDebugState(): any {
    return {
      selectedIndex: this.selectedIndex,
      agents: this.agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        archetype: agent.profile.character?.archetype ?? FALLBACK_CHARACTER.archetype,
        visualTheme: agent.profile.character?.visualTheme ?? FALLBACK_CHARACTER.visualTheme,
        directive: agent.directive,
        mood: agent.mood,
        goal: agent.currentGoal,
        position: {
          x: round(agent.position.x),
          y: round(agent.position.y),
          z: round(agent.position.z),
        },
        needs: agent.needs,
        taskQueue: agent.taskQueue,
        memoryLog: agent.memoryLog,
      })),
    };
  }
}
