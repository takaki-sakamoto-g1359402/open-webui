function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class Hud {
  constructor() {
    this.statusText = this.expectElement("status-text");
    this.combatText = this.expectElement("combat-text");
    this.enemyText = this.expectElement("enemy-text");
    this.chunkText = this.expectElement("chunk-text");
    this.targetText = this.expectElement("target-text");
  }

  update(state) {
    this.setMeter("hp-fill", "hp-text", state.player.hp, state.player.maxHp);
    this.setMeter("stamina-fill", "stamina-text", state.player.stamina, state.player.maxStamina);
    this.setMeter("energy-fill", "energy-text", state.player.energy, state.player.maxEnergy);
    this.statusText.textContent = state.statusText;
    this.combatText.textContent = state.combatText;
    this.enemyText.textContent = state.enemyText;
    this.chunkText.textContent = state.chunkText;
    this.targetText.textContent = state.targetText;
  }

  setMeter(fillId, textId, current, max) {
    const fill = this.expectElement(fillId);
    const text = this.expectElement(textId);
    const percent = max <= 0 ? 0 : clamp(current / max, 0, 1);
    fill.style.width = `${(percent * 100).toFixed(1)}%`;
    text.textContent = `${Math.ceil(current)} / ${Math.ceil(max)}`;
  }

  expectElement(id) {
    const element = document.getElementById(id);
    if (!(element instanceof HTMLElement)) {
      throw new Error(`Expected #${id} to exist.`);
    }
    return element;
  }
}
