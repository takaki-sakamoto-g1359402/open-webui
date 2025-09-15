export type Tile = 0 | 1 | 2 | 3;
export interface GridState { rows: number; cols: number; tiles: Tile[]; }

export class Grid {
  rows: number;
  cols: number;
  tiles: Tile[];

  constructor(rows = 8, cols = 16) {
    this.rows = rows;
    this.cols = cols;
    this.tiles = new Array(rows * cols).fill(0) as Tile[];
    this.random();
  }

  index(r: number, c: number) { return r * this.cols + c; }
  inBounds(r: number, c: number) { return r >= 0 && c >= 0 && r < this.rows && c < this.cols; }
  get(r: number, c: number) { return this.tiles[this.index(r, c)]; }
  set(r: number, c: number, v: Tile) { this.tiles[this.index(r, c)] = v; }
  rotate(r: number, c: number, delta = 1) { this.set(r, c, ((this.get(r, c) + delta + 4) % 4) as Tile); }

  rowRotate(r: number, delta: number) { for (let c = 0; c < this.cols; c++) this.rotate(r, c, delta); }
  colRotate(c: number, delta: number) { for (let r = 0; r < this.rows; r++) this.rotate(r, c, delta); }

  random() { for (let i = 0; i < this.tiles.length; i++) this.tiles[i] = (Math.floor(Math.random() * 4) as Tile); }
  alignH() { this.tiles.fill(0); }
  alignV() { this.tiles.fill(1); }
  wave() {
    this.random();
    const mid = Math.floor(this.rows / 2);
    for (let r = mid - 1; r <= mid + 1; r++) {
      if (r >= 0 && r < this.rows) {
        for (let c = 0; c < this.cols; c++) this.set(r, c, 0);
      }
    }
  }

  toJSON(): GridState { return { rows: this.rows, cols: this.cols, tiles: [...this.tiles] }; }
  fromJSON(s: GridState) { this.rows = s.rows; this.cols = s.cols; this.tiles = s.tiles as Tile[]; }
}
