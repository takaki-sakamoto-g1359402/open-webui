import { Grid } from './grid';
import { CanvasView } from './canvas';
import { Ops } from './ops';
import { Scan } from './scan';
import { longestPath, connectedComponents } from './path';
import type { Tile } from './grid';

export class UI {
  grid: Grid;
  view: CanvasView;
  ops: Ops;
  scan: Scan;
  compsOn = false;

  constructor(grid: Grid, view: CanvasView, scan: Scan) {
    this.grid = grid;
    this.view = view;
    this.scan = scan;
    this.ops = new Ops(grid);
    this.view.selection = this.ops.current();
    this.bind();
    this.view.render();
  }

  bind() {
    const canvas = this.view.canvas;
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const hit = this.view.hit(e.clientX - rect.left, e.clientY - rect.top);
      if (!hit) return;
      if (hit.type === 'tile') {
        this.grid.rotate(hit.row, hit.col, e.shiftKey ? -1 : 1);
      } else if (hit.type === 'row') {
        this.ops.selectRow(hit.index);
        this.view.selection = this.ops.current();
      } else if (hit.type === 'col') {
        this.ops.selectCol(hit.index);
        this.view.selection = this.ops.current();
      }
      this.view.render();
    });

    document.querySelectorAll('#controls button[data-set]').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        const dir = Number((e.target as HTMLElement).dataset.set) as Tile;
        this.ops.applyOrientation(dir);
        this.view.render();
      })
    );

    (document.getElementById('row-left') as HTMLButtonElement).addEventListener('click', () => {
      if (this.ops.current().type === 'row') { this.ops.rotateSelection(-1); this.view.render(); }
    });
    (document.getElementById('row-right') as HTMLButtonElement).addEventListener('click', () => {
      if (this.ops.current().type === 'row') { this.ops.rotateSelection(1); this.view.render(); }
    });
    (document.getElementById('col-up') as HTMLButtonElement).addEventListener('click', () => {
      if (this.ops.current().type === 'col') { this.ops.rotateSelection(-1); this.view.render(); }
    });
    (document.getElementById('col-down') as HTMLButtonElement).addEventListener('click', () => {
      if (this.ops.current().type === 'col') { this.ops.rotateSelection(1); this.view.render(); }
    });

    (document.getElementById('gen-random') as HTMLButtonElement).addEventListener('click', () => { this.grid.random(); this.view.render(); });
    (document.getElementById('gen-h') as HTMLButtonElement).addEventListener('click', () => { this.grid.alignH(); this.view.render(); });
    (document.getElementById('gen-v') as HTMLButtonElement).addEventListener('click', () => { this.grid.alignV(); this.view.render(); });
    (document.getElementById('gen-wave') as HTMLButtonElement).addEventListener('click', () => { this.grid.wave(); this.view.render(); });

    const scanBtn = document.getElementById('scan-toggle') as HTMLButtonElement;
    scanBtn.addEventListener('click', () => { this.scan.toggle(); scanBtn.textContent = this.scan.active ? 'Stop Scan' : 'Start Scan'; });
    (document.getElementById('scan-speed') as HTMLInputElement).addEventListener('input', (e) => this.scan.setSpeed(Number((e.target as HTMLInputElement).value)));

    (document.getElementById('export-png') as HTMLButtonElement).addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = 'c-tile.png';
      link.href = this.view.canvas.toDataURL('image/png');
      link.click();
    });
    (document.getElementById('export-json') as HTMLButtonElement).addEventListener('click', () => {
      const data = JSON.stringify(this.grid.toJSON());
      const blob = new Blob([data], { type: 'application/json' });
      const link = document.createElement('a');
      link.download = 'c-tile.json';
      link.href = URL.createObjectURL(blob);
      link.click();
    });
    (document.getElementById('import-json') as HTMLInputElement).addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      file.text().then((t) => { this.grid.fromJSON(JSON.parse(t)); this.view.resize(); this.view.render(); });
    });

    (document.getElementById('find-path') as HTMLButtonElement).addEventListener('click', () => {
      const p = longestPath(this.grid);
      this.view.setPath(p);
      this.view.render();
    });

    const compBtn = document.getElementById('show-components') as HTMLButtonElement;
    compBtn.addEventListener('click', () => {
      this.compsOn = !this.compsOn;
      this.view.setComponents(this.compsOn ? connectedComponents(this.grid) : []);
      this.view.render();
    });

    (document.getElementById('clear-selection') as HTMLButtonElement).addEventListener('click', () => {
      this.ops.selectAll();
      this.view.selection = this.ops.current();
      this.view.render();
    });

    document.addEventListener('keydown', (e) => {
      const sel = this.ops.current();
      if (e.key === ' ') { e.preventDefault(); this.scan.toggle(); scanBtn.textContent = this.scan.active ? 'Stop Scan' : 'Start Scan'; }
      if (e.key === 'r' || e.key === 'R') { this.ops.rotateSelection(e.shiftKey ? -1 : 1); this.view.render(); }
      if (sel.type === 'row') {
        if (e.key === 'ArrowUp' && sel.index! > 0) this.ops.selectRow(sel.index! - 1);
        if (e.key === 'ArrowDown' && sel.index! < this.grid.rows - 1) this.ops.selectRow(sel.index! + 1);
      } else if (sel.type === 'col') {
        if (e.key === 'ArrowLeft' && sel.index! > 0) this.ops.selectCol(sel.index! - 1);
        if (e.key === 'ArrowRight' && sel.index! < this.grid.cols - 1) this.ops.selectCol(sel.index! + 1);
      }
      this.view.selection = this.ops.current();
      this.view.render();
    });
  }
}
