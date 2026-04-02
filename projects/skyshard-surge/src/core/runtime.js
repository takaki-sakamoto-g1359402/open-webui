const BABYLON = window.BABYLON;
const RAPIER = window.RAPIER;

if (!BABYLON) {
  throw new Error("Babylon.js failed to load.");
}

if (!RAPIER) {
  throw new Error("Rapier failed to load.");
}

export { BABYLON, RAPIER };
