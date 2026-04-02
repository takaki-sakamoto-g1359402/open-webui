import { attachDebugHooks } from "./core/debug.js";
import { SkyshardGame } from "./game/game.js";

const canvas = document.getElementById("game-canvas");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Expected #game-canvas to exist.");
}

const game = new SkyshardGame(canvas);
await game.initialize();
attachDebugHooks(game);

let lastFrameTime = performance.now();
let accumulator = 0;
const fixedStep = 1 / 60;

function frame(now) {
  const delta = Math.min(0.1, (now - lastFrameTime) / 1000);
  lastFrameTime = now;
  accumulator += delta;

  while (accumulator >= fixedStep) {
    game.update(fixedStep);
    accumulator -= fixedStep;
  }

  game.render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
