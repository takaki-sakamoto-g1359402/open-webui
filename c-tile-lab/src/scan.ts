import { CanvasView } from './canvas';

export class Scan {
  view: CanvasView;
  active = false;
  y = 0;
  speed = 3;
  last = 0;

  constructor(view: CanvasView) { this.view = view; }

  start() { if (!this.active) { this.active = true; this.last = performance.now(); requestAnimationFrame(this.loop); } }
  stop() { this.active = false; }
  toggle() { this.active ? this.stop() : this.start(); }
  setSpeed(s: number) { this.speed = s; }

  loop = (t: number) => {
    if (!this.active) return;
    const dt = (t - this.last) / 1000; this.last = t;
    this.y = (this.y + this.speed * dt) % this.view.grid.rows;
    this.view.scanRow = Math.floor(this.y);
    this.view.render();
    requestAnimationFrame(this.loop);
  };
}
