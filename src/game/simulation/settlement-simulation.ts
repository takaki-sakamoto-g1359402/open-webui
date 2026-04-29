// @ts-nocheck

const RESOURCE_LIMITS = Object.freeze({
  knowledge: 99,
  morale: 100,
});

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Number(value.toFixed(1));
}

export class SettlementSimulation {
  [key: string]: any;

  constructor() {
    this.elapsedSeconds = 0;
    this.consumptionTimer = 0;
    this.resources = {
      food: 26,
      materials: 34,
      knowledge: 0,
      morale: 58,
    };
    this.alerts = [];
    this.eventFeed = [];
    this.addLog("Simulation started: pseudo-personality agents are transparent gameplay profiles.", "info");
  }

  update(deltaSeconds: number, buildingManager: any, agents: any[]): void {
    this.elapsedSeconds += deltaSeconds;
    this.consumptionTimer += deltaSeconds;

    const effects = buildingManager.getEffects();

    if (this.consumptionTimer >= 8) {
      const cycles = Math.floor(this.consumptionTimer / 8);
      this.consumptionTimer -= cycles * 8;
      this.consumeSettlementUpkeep(cycles, agents.length);
    }

    this.resources.food = clamp(this.resources.food, 0, effects.storageCapacity);
    this.resources.materials = clamp(this.resources.materials, 0, effects.storageCapacity);
    this.resources.knowledge = clamp(this.resources.knowledge, 0, RESOURCE_LIMITS.knowledge);
    this.resources.morale = clamp(
      this.resources.morale + effects.moraleBonus * deltaSeconds * 0.006,
      0,
      RESOURCE_LIMITS.morale,
    );

    this.alerts = this.buildAlerts(effects, agents.length);
  }

  consumeSettlementUpkeep(cycles: number, population: number): void {
    const foodNeed = population * cycles;

    if (this.resources.food >= foodNeed) {
      this.resources.food -= foodNeed;
      this.resources.morale = clamp(this.resources.morale + 0.4 * cycles, 0, 100);
      return;
    }

    const shortage = foodNeed - this.resources.food;
    this.resources.food = 0;
    this.resources.morale = clamp(this.resources.morale - shortage * 3.5, 0, 100);
    this.addLog(`Food shortage: ${shortage.toFixed(1)} upkeep unmet. Morale fell.`, "warning");
  }

  applyAgentTask(agent: any, task: any, buildingManager: any): void {
    const effects = buildingManager.getEffects();

    for (const [resource, amount] of Object.entries(task.resourceDelta ?? {})) {
      this.adjustResource(resource, amount, effects);
    }

    if (task.moraleDelta) {
      this.adjustResource("morale", task.moraleDelta, effects);
    }

    const log = `${agent.name}: ${task.completionSummary}`;
    this.addLog(log, task.logSeverity ?? "info");
  }

  adjustResource(resource: string, amount: number, effects: any): void {
    const cap = resource === "food" || resource === "materials"
      ? effects.storageCapacity
      : RESOURCE_LIMITS[resource] ?? 999;

    this.resources[resource] = clamp((this.resources[resource] ?? 0) + amount, 0, cap);
  }

  getShortagePressure(resource: string, buildingManager: any): number {
    const effects = buildingManager.getEffects();
    const cap = resource === "food" || resource === "materials" ? effects.storageCapacity : 100;
    const current = this.resources[resource] ?? 0;
    const ratio = cap <= 0 ? 0 : current / cap;

    if (resource === "food") {
      return clamp(1 - ratio * 1.8, 0, 1);
    }

    if (resource === "materials") {
      return clamp(1 - ratio * 1.35, 0, 1);
    }

    return clamp(1 - ratio, 0, 1);
  }

  buildAlerts(effects: any, population: number): any[] {
    const alerts = [];

    if (population > effects.populationCapacity) {
      alerts.push({
        severity: "warning",
        text: `Housing short by ${population - effects.populationCapacity}`,
      });
    }

    if (this.resources.food < Math.max(4, population * 2)) {
      alerts.push({ severity: "warning", text: "Food reserve is low" });
    }

    if (this.resources.materials < 8) {
      alerts.push({ severity: "info", text: "Materials are low for expansion" });
    }

    if (effects.workSlots <= 0) {
      alerts.push({ severity: "info", text: "No workshop: material work is slower" });
    }

    return alerts;
  }

  addLog(text: string, severity = "info"): void {
    const minutes = Math.floor(this.elapsedSeconds / 60);
    const seconds = Math.floor(this.elapsedSeconds % 60).toString().padStart(2, "0");

    this.eventFeed.unshift({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      timestamp: `${minutes}:${seconds}`,
      text,
      severity,
    });

    this.eventFeed = this.eventFeed.slice(0, 9);
  }

  getState(buildingManager: any, agents: any[]): any {
    const effects = buildingManager.getEffects();
    const counts = buildingManager.getCounts();

    return {
      elapsedSeconds: this.elapsedSeconds,
      resources: {
        food: round(this.resources.food),
        materials: round(this.resources.materials),
        knowledge: round(this.resources.knowledge),
        morale: round(this.resources.morale),
      },
      caps: {
        storage: effects.storageCapacity,
        population: effects.populationCapacity,
      },
      population: agents.length,
      workSlots: effects.workSlots,
      civicFocus: effects.civicFocus,
      roadScore: effects.roadScore,
      counts,
      alerts: this.alerts,
      eventFeed: this.eventFeed,
    };
  }

  serialize(): any {
    return {
      elapsedSeconds: this.elapsedSeconds,
      resources: this.resources,
      eventFeed: this.eventFeed,
    };
  }

  restore(data: any): void {
    if (!data) {
      return;
    }

    this.elapsedSeconds = data.elapsedSeconds ?? this.elapsedSeconds;
    this.resources = {
      ...this.resources,
      ...(data.resources ?? {}),
    };
    this.eventFeed = Array.isArray(data.eventFeed) ? data.eventFeed.slice(0, 9) : this.eventFeed;
    this.addLog("Loaded saved settlement state.", "info");
  }
}
