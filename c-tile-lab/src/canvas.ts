import { Grid } from './grid';
import { Selection } from './ops';

export class CanvasView {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  grid: Grid;
  tileSize = 40;
  header = 20;
  path: number[] = [];
  components: number[][] = [];
  compColors: string[] = [];
  selection: Selection = { type: 'all' };
  showComponents = false;
  scanRow = -1;

  constructor(canvas: HTMLCanvasElement, grid: Grid) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.grid = grid;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = this.header + this.grid.cols * this.tileSize;
    this.canvas.height = this.header + this.grid.rows * this.tileSize;
  }

  setPath(p: number[]) { this.path = p; }
  setComponents(comps: number[][]) {
    this.components = comps;
    this.compColors = comps.map(() => `hsla(${Math.random() * 360},70%,70%,0.4)`);
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.components.length) {
      for (let i = 0; i < this.components.length; i++) {
        ctx.fillStyle = this.compColors[i];
        for (const idx of this.components[i]) {
          const r = Math.floor(idx / this.grid.cols), c = idx % this.grid.cols;
          ctx.fillRect(this.header + c * this.tileSize, this.header + r * this.tileSize, this.tileSize, this.tileSize);
        }
      }
    }

    if (this.selection.type === 'row') {
      ctx.fillStyle = 'rgba(255,229,138,0.4)';
      const r = this.selection.index!;
      ctx.fillRect(this.header, this.header + r * this.tileSize, this.grid.cols * this.tileSize, this.tileSize);
    } else if (this.selection.type === 'col') {
      ctx.fillStyle = 'rgba(255,229,138,0.4)';
      const c = this.selection.index!;
      ctx.fillRect(this.header + c * this.tileSize, this.header, this.tileSize, this.grid.rows * this.tileSize);
    }

    if (this.scanRow >= 0) {
      ctx.fillStyle = 'rgba(100,149,237,0.2)';
      ctx.fillRect(this.header, this.header + this.scanRow * this.tileSize, this.grid.cols * this.tileSize, this.tileSize);
    }

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    for (let r = 0; r < this.grid.rows; r++)
      for (let c = 0; c < this.grid.cols; c++)
        this.drawTile(r, c);

    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '12px sans-serif';
    for (let c = 0; c < this.grid.cols; c++)
      ctx.fillText(String(c), this.header + c * this.tileSize + this.tileSize / 2, this.header / 2);
    for (let r = 0; r < this.grid.rows; r++)
      ctx.fillText(String(r), this.header / 2, this.header + r * this.tileSize + this.tileSize / 2);

    if (this.path.length > 1) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let i = 0; i < this.path.length; i++) {
        const idx = this.path[i];
        const r = Math.floor(idx / this.grid.cols), c = idx % this.grid.cols;
        const x = this.header + c * this.tileSize + this.tileSize / 2;
        const y = this.header + r * this.tileSize + this.tileSize / 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  drawTile(r: number, c: number) {
    const ctx = this.ctx;
    const x = this.header + c * this.tileSize;
    const y = this.header + r * this.tileSize;
    ctx.beginPath();
    ctx.rect(x, y, this.tileSize, this.tileSize);
    ctx.stroke();
    ctx.beginPath();
    const dir = this.grid.get(r, c);
    if (dir !== 0) { ctx.moveTo(x + this.tileSize, y); ctx.lineTo(x + this.tileSize, y + this.tileSize); }
    if (dir !== 1) { ctx.moveTo(x, y + this.tileSize); ctx.lineTo(x + this.tileSize, y + this.tileSize); }
    if (dir !== 2) { ctx.moveTo(x, y); ctx.lineTo(x, y + this.tileSize); }
    if (dir !== 3) { ctx.moveTo(x, y); ctx.lineTo(x + this.tileSize, y); }
    ctx.stroke();
  }

  hit(x: number, y: number): any {
    const r = Math.floor((y - this.header) / this.tileSize);
    const c = Math.floor((x - this.header) / this.tileSize);
    if (y < this.header && x >= this.header) return { type: 'col', index: c };
    if (x < this.header && y >= this.header) return { type: 'row', index: r };
    if (this.grid.inBounds(r, c)) return { type: 'tile', row: r, col: c };
    return null;
  }
}
