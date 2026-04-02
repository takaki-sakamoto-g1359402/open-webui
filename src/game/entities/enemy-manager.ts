// @ts-nocheck

import { CONFIG } from "../../core/constants.js";
import { DummyEnemy } from "./dummy-enemy.js";
import { SkimmerEnemy } from "./skimmer-enemy.js";

export class EnemyManager {
  [key: string]: any;

  constructor(scene: any, world: any, player: any) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.enemies = [];

    let dummyIndex = 0;
    let skimmerIndex = 0;

    for (const entry of CONFIG.enemy.roster) {
      if (entry.kind === "dummy") {
        this.enemies.push(new DummyEnemy(scene, world, entry.x, entry.z, dummyIndex));
        dummyIndex += 1;
      } else if (entry.kind === "skimmer") {
        this.enemies.push(new SkimmerEnemy(scene, world, player, entry.x, entry.z, skimmerIndex));
        skimmerIndex += 1;
      }
    }
  }

  update(deltaSeconds: number, elapsedSeconds: number): void {
    for (const enemy of this.enemies) {
      enemy.update(deltaSeconds, elapsedSeconds);
    }
  }

  getDamageables(): any[] {
    return this.enemies;
  }

  getHudSummary(): string {
    const aliveHostiles = this.enemies.filter(
      (enemy: any) => enemy.kind === "skimmer" && enemy.alive,
    ).length;
    const totalHostiles = this.enemies.filter((enemy: any) => enemy.kind === "skimmer").length;
    const dummy = this.enemies.find((enemy: any) => enemy.kind === "dummy");

    if (!dummy) {
      return `Hostiles: ${aliveHostiles}/${totalHostiles}`;
    }

    return `Hostiles: ${aliveHostiles}/${totalHostiles} active | ${dummy.getStatusText()}`;
  }

  getPriorityLine(): string {
    const hostiles = this.enemies.filter((enemy: any) => enemy.kind === "skimmer");
    const threatened = hostiles.find((enemy: any) => enemy.alive);

    if (threatened) {
      return threatened.getHudLine();
    }

    const dummy = this.enemies.find((enemy: any) => enemy.kind === "dummy");
    return dummy ? dummy.getStatusText() : "No enemies active";
  }

  getDebugState(): any[] {
    return this.enemies.map((enemy: any) => enemy.getDebugState());
  }
}
