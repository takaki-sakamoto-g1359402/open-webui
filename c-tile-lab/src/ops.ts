import { Grid, Tile } from './grid';

export type Selection = { type: 'row' | 'col' | 'all'; index?: number };

export class Ops {
  grid: Grid;
  selection: Selection = { type: 'all' };

  constructor(grid: Grid) { this.grid = grid; }

  selectRow(i: number) { this.selection = { type: 'row', index: i }; }
  selectCol(i: number) { this.selection = { type: 'col', index: i }; }
  selectAll() { this.selection = { type: 'all' }; }
  current() { return this.selection; }

  applyOrientation(dir: Tile) {
    if (this.selection.type === 'row') {
      for (let c = 0; c < this.grid.cols; c++) this.grid.set(this.selection.index!, c, dir);
    } else if (this.selection.type === 'col') {
      for (let r = 0; r < this.grid.rows; r++) this.grid.set(r, this.selection.index!, dir);
    } else {
      this.grid.tiles.fill(dir);
    }
  }

  rotateSelection(delta: number) {
    if (this.selection.type === 'row') this.grid.rowRotate(this.selection.index!, delta);
    else if (this.selection.type === 'col') this.grid.colRotate(this.selection.index!, delta);
  }
}
