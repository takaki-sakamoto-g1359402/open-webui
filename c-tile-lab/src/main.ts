import { Grid } from './grid';
import { CanvasView } from './canvas';
import { Scan } from './scan';
import { UI } from './ui';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const grid = new Grid(8, 16);
const view = new CanvasView(canvas, grid);
const scan = new Scan(view);
new UI(grid, view, scan);
