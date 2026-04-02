// @ts-nocheck

import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreatePolyhedron } from "@babylonjs/core/Meshes/Builders/polyhedronBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { Scene } from "@babylonjs/core/scene";
import RapierRuntime from "@dimforge/rapier3d-compat";

// Keep the gameplay migration lightweight for now: runtime bindings stay fully dynamic
// while the project structure and build tooling move over to TypeScript.
export const BABYLON: any = {
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  FreeCamera,
  HemisphericLight,
  Mesh,
  MeshBuilder: {
    CreateBox,
    CreateCylinder,
    CreatePolyhedron,
    CreateSphere,
    CreateTorus,
  },
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
  VertexData,
};
export const RAPIER: any = RapierRuntime;
