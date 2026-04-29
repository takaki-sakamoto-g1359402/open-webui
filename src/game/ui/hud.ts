// @ts-nocheck

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function makeElement(tag: string, className = "", text = ""): HTMLElement {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text) {
    element.textContent = text;
  }

  return element;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export class Hud {
  [key: string]: any;

  constructor() {
    this.root = this.expectElement("hud");
    this.statusText = this.expectElement("status-text");
    this.chunkText = this.expectElement("chunk-text");
    this.targetText = this.expectElement("target-text");
    this.buildModeText = this.expectElement("build-mode-text");
    this.buildOptions = this.expectElement("build-options");
    this.settlementStats = this.expectElement("settlement-stats");
    this.buildingStats = this.expectElement("building-stats");
    this.settlementAlerts = this.expectElement("settlement-alerts");
    this.agentName = this.expectElement("agent-name");
    this.agentMeta = this.expectElement("agent-meta");
    this.agentGoal = this.expectElement("agent-goal");
    this.agentNeeds = this.expectElement("agent-needs");
    this.agentPersonality = this.expectElement("agent-personality");
    this.agentQueue = this.expectElement("agent-queue");
    this.agentMemory = this.expectElement("agent-memory");
    this.agentComparison = this.expectElement("agent-comparison");
    this.eventFeed = this.expectElement("event-feed");
  }

  update(state: any): void {
    this.setMeter("hp-fill", "hp-text", state.player.hp, state.player.maxHp);
    this.setMeter("stamina-fill", "stamina-text", state.player.stamina, state.player.maxStamina);
    this.setMeter("energy-fill", "energy-text", state.player.energy, state.player.maxEnergy);
    this.root.dataset.surge = state.player.surgeActive ? "active" : "idle";
    this.root.style.setProperty("--surge-strength", `${state.player.surgeStrength.toFixed(2)}`);

    this.statusText.textContent = state.statusText;
    this.chunkText.textContent = state.chunkText;
    this.targetText.textContent = state.targetText;
    this.updateBuildPanel(state.build);
    this.updateSettlementPanel(state.settlement);
    this.updateAgentPanel(state.agents);
    this.updateFeed(state.settlement.eventFeed);
  }

  updateBuildPanel(build: any): void {
    this.buildModeText.textContent = `${build.selectedSlot}: ${build.selectedLabel}`;
    this.buildOptions.replaceChildren();

    for (const option of build.options) {
      const item = makeElement(
        "div",
        option.slot === build.selectedSlot ? "build-option build-option--selected" : "build-option",
      );
      item.append(
        makeElement("strong", "", `${option.slot}`),
        makeElement("span", "", option.label),
      );
      this.buildOptions.append(item);
    }
  }

  updateSettlementPanel(settlement: any): void {
    this.settlementStats.replaceChildren(
      this.stat("Food", `${settlement.resources.food}/${settlement.caps.storage}`),
      this.stat("Materials", `${settlement.resources.materials}/${settlement.caps.storage}`),
      this.stat("Knowledge", `${settlement.resources.knowledge}`),
      this.stat("Morale", `${settlement.resources.morale}`),
      this.stat("Pop", `${settlement.population}/${settlement.caps.population}`),
      this.stat("Work", `${settlement.workSlots}`),
    );

    this.buildingStats.replaceChildren(
      makeElement("span", "", `House ${settlement.counts.house}`),
      makeElement("span", "", `Storage ${settlement.counts.storage}`),
      makeElement("span", "", `Work ${settlement.counts.workshop}`),
      makeElement("span", "", `Road ${settlement.counts.road}`),
      makeElement("span", "", `Civic ${settlement.counts.civic}`),
    );

    this.settlementAlerts.replaceChildren();

    if (!settlement.alerts.length) {
      this.settlementAlerts.append(makeElement("div", "alert alert--ok", "No blocking alerts"));
      return;
    }

    for (const alert of settlement.alerts) {
      this.settlementAlerts.append(makeElement("div", `alert alert--${alert.severity}`, alert.text));
    }
  }

  updateAgentPanel(agents: any): void {
    const agent = agents.selected;
    const p = agent.personality;
    const c = agent.character ?? {};

    this.agentName.textContent = agent.name;
    this.agentMeta.textContent = `${agent.role} | ${c.archetype ?? "Original companion"} | ${agent.directive}`;
    this.agentGoal.textContent = `${agent.mood}: ${agent.goal}`;

    this.agentNeeds.replaceChildren(
      this.stat("Hunger", agent.needs.hunger),
      this.stat("Energy", agent.needs.energy),
      this.stat("Social", agent.needs.social),
    );

    this.agentPersonality.replaceChildren(
      this.stat("Values", `Stab ${formatPercent(p.values.stability)} / Eff ${formatPercent(p.values.efficiency)}`),
      this.stat("Priorities", `Food ${formatPercent(p.priorities.foodSecurity)} / Build ${formatPercent(p.priorities.construction)}`),
      this.stat("Style", p.workStyle),
      this.stat("Social", formatPercent(p.socialTendency)),
      this.stat("Risk", formatPercent(p.riskTolerance)),
      this.stat("Independ.", formatPercent(p.obedienceIndependence)),
      this.stat("Routine", formatPercent(p.routinePreference)),
      this.stat("Comms", p.communicationStyle),
      this.stat("Visual", c.visualTheme ?? "modest original low-poly style"),
      this.stat("Red lines", p.redLines.slice(0, 2).join(", ")),
    );

    this.agentQueue.replaceChildren(makeElement("strong", "", "Task queue"));
    for (const item of agent.taskQueue) {
      this.agentQueue.append(makeElement("span", "", item));
    }

    this.agentMemory.replaceChildren(makeElement("strong", "", "Memory"));
    for (const memory of agent.memoryLog.slice(0, 3)) {
      this.agentMemory.append(makeElement("span", "", memory));
    }

    this.agentComparison.replaceChildren();
    for (const row of agents.comparison) {
      const item = makeElement("div", row.selected ? "agent-row agent-row--selected" : "agent-row");
      item.append(
        makeElement("strong", "", row.name),
        makeElement("span", "", `${row.role} | ${row.mood}`),
        makeElement("span", "", row.goal),
      );
      this.agentComparison.append(item);
    }
  }

  updateFeed(events: any[]): void {
    this.eventFeed.replaceChildren();

    for (const event of events) {
      const item = makeElement("div", `feed-item feed-item--${event.severity}`);
      item.append(
        makeElement("time", "", event.timestamp),
        makeElement("span", "", event.text),
      );
      this.eventFeed.append(item);
    }
  }

  stat(label: string, value: string | number): HTMLElement {
    const item = makeElement("div", "stat");
    item.append(makeElement("span", "", label), makeElement("strong", "", `${value}`));
    return item;
  }

  setMeter(fillId: string, textId: string, current: number, max: number): void {
    const fill = this.expectElement(fillId);
    const text = this.expectElement(textId);
    const percent = max <= 0 ? 0 : clamp(current / max, 0, 1);

    fill.style.width = `${(percent * 100).toFixed(1)}%`;
    text.textContent = `${Math.ceil(current)} / ${Math.ceil(max)}`;
  }

  expectElement(id: string): HTMLElement {
    const element = document.getElementById(id);

    if (!(element instanceof HTMLElement)) {
      throw new Error(`Expected #${id} to exist.`);
    }

    return element;
  }
}
