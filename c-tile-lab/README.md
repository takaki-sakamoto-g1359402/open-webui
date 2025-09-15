# C-Tile Lab

A small local prototype to explore visual patterns using C-shaped tiles rotated at 0/90/180/270 degrees.

## Run

```bash
npm i
npm run dev
```

Open the local server printed by Vite in your browser.

## Features
- Click tiles to rotate (Shift+Click for counter-clockwise).
- Select rows or columns via headers and use controls to rotate or orient them.
- Generators: random noise, horizontal/vertical align, and wave band.
- Animated horizontal scan bar (space to toggle).
- Find and highlight the longest connecting path.
- Export grid as PNG or JSON; import from JSON.
- Toggle connected components coloring.

Everything runs entirely in the browser with TypeScript, canvas, and Vite.
