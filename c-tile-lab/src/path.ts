import { Grid } from './grid';

function neighbors(grid: Grid, r: number, c: number): [number, number][] {
  const dir = grid.get(r, c);
  const res: [number, number][] = [];
  if (dir === 0 && grid.inBounds(r, c + 1) && grid.get(r, c + 1) === 2) res.push([r, c + 1]);
  if (dir === 1 && grid.inBounds(r + 1, c) && grid.get(r + 1, c) === 3) res.push([r + 1, c]);
  if (dir === 2 && grid.inBounds(r, c - 1) && grid.get(r, c - 1) === 0) res.push([r, c - 1]);
  if (dir === 3 && grid.inBounds(r - 1, c) && grid.get(r - 1, c) === 1) res.push([r - 1, c]);
  return res;
}

export function buildAdj(grid: Grid): number[][] {
  const adj: number[][] = Array.from({ length: grid.rows * grid.cols }, () => []);
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const idx = grid.index(r, c);
      for (const [nr, nc] of neighbors(grid, r, c)) adj[idx].push(grid.index(nr, nc));
    }
  return adj;
}

function componentsFromAdj(adj: number[][]): number[][] {
  const visited = new Array(adj.length).fill(false);
  const comps: number[][] = [];
  for (let i = 0; i < adj.length; i++) {
    if (!visited[i]) {
      const stack = [i];
      visited[i] = true;
      const comp: number[] = [i];
      for (let s = 0; s < stack.length; s++) {
        const v = stack[s];
        for (const nb of adj[v]) if (!visited[nb]) { visited[nb] = true; stack.push(nb); comp.push(nb); }
      }
      comps.push(comp);
    }
  }
  return comps;
}

export function connectedComponents(grid: Grid): number[][] {
  return componentsFromAdj(buildAdj(grid));
}

function bfs(start: number, adj: number[][]) {
  const dist = new Array(adj.length).fill(-1);
  const parent = new Array(adj.length).fill(-1);
  const q = [start];
  dist[start] = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const v = q[qi];
    for (const nb of adj[v]) if (dist[nb] === -1) { dist[nb] = dist[v] + 1; parent[nb] = v; q.push(nb); }
  }
  let far = start;
  for (let i = 0; i < dist.length; i++) if (dist[i] > dist[far]) far = i;
  return { dist, parent, far };
}

export function longestPath(grid: Grid): number[] {
  const adj = buildAdj(grid);
  const comps = componentsFromAdj(adj);
  let best: number[] = [];
  for (const comp of comps) {
    const { far: a } = bfs(comp[0], adj);
    const { far: b, parent } = bfs(a, adj);
    const path: number[] = [];
    let cur = b;
    while (cur !== -1) { path.push(cur); if (cur === a) break; cur = parent[cur]; }
    if (path.length > best.length) best = path;
  }
  return best;
}
