import { BABYLON } from "../../core/runtime.js";
import { CONFIG } from "../../core/constants.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function approachVector(current, target, factor) {
  current.x += (target.x - current.x) * factor;
  current.y += (target.y - current.y) * factor;
  current.z += (target.z - current.z) * factor;
}

export class PlayerController {
  constructor(scene, input, world) {
    this.scene = scene;
    this.input = input;
    this.world = world;
    this.position = new BABYLON.Vector3();
    this.velocity = new BABYLON.Vector3();
    this.spawnPoint = new BABYLON.Vector3();
    this.yaw = 0.62;
    this.pitch = -0.18;
    this.grounded = false;
    this.flightEnabled = false;
    this.dashRemaining = 0;
    this.dashCooldown = 0;
    this.dashDirection = new BABYLON.Vector3(0, 0, 1);
    this.hp = CONFIG.resources.maxHp;
    this.stamina = CONFIG.resources.maxStamina;
    this.energy = CONFIG.resources.maxEnergy;

    this.camera = new BABYLON.FreeCamera("player-camera", new BABYLON.Vector3(0, 0, 0), scene);
    this.camera.minZ = 0.05;
    this.camera.maxZ = 600;
    this.camera.fov = 0.95;
    scene.activeCamera = this.camera;
  }

  spawn(position) {
    this.position.copyFrom(position);
    this.spawnPoint.copyFrom(position);
    this.velocity.set(0, 0, 0);
    this.syncCamera();
  }

  update(deltaSeconds) {
    const look = this.input.consumeLookDelta();
    this.yaw -= look.x * CONFIG.player.mouseSensitivity;
    this.pitch = clamp(this.pitch - look.y * CONFIG.player.mouseSensitivity, -CONFIG.player.lookClamp, CONFIG.player.lookClamp);

    if (this.input.wasPressed("KeyF")) {
      this.flightEnabled = !this.flightEnabled && this.energy > 5;
      if (this.flightEnabled) this.grounded = false;
    }

    if (this.dashCooldown > 0) {
      this.dashCooldown = Math.max(0, this.dashCooldown - deltaSeconds);
    }

    if (this.input.wasPressed("KeyQ") && this.dashCooldown <= 0 && this.stamina >= CONFIG.resources.dashStaminaCost) {
      const dashVector = this.getDashVector();
      this.dashDirection.copyFrom(dashVector);
      this.dashRemaining = CONFIG.player.dashDuration;
      this.dashCooldown = CONFIG.player.dashCooldown;
      this.stamina = Math.max(0, this.stamina - CONFIG.resources.dashStaminaCost);
      this.grounded = false;
    }

    const movementInput = this.getMovementIntent();
    const sprinting = (this.input.isDown("ShiftLeft") || this.input.isDown("ShiftRight")) && movementInput.lengthSquared() > 0;

    if (this.dashRemaining > 0) {
      this.dashRemaining = Math.max(0, this.dashRemaining - deltaSeconds);
      this.velocity.copyFrom(this.dashDirection).scaleInPlace(CONFIG.player.dashSpeed);
    } else if (this.flightEnabled) {
      const flightTarget = movementInput.scale(CONFIG.player.flightSpeed);
      const verticalIntent = (this.input.isDown("Space") ? 1 : 0) - (this.input.isDown("ControlLeft") || this.input.isDown("KeyC") ? 1 : 0);
      flightTarget.y = verticalIntent * CONFIG.player.flightSpeed * 0.65;
      if (sprinting && this.stamina > 0) {
        flightTarget.scaleInPlace(1.15);
        this.stamina = Math.max(0, this.stamina - CONFIG.resources.sprintDrainPerSecond * 0.65 * deltaSeconds);
      }
      approachVector(this.velocity, flightTarget, clamp(deltaSeconds * 8, 0, 1));
      this.energy = Math.max(0, this.energy - CONFIG.resources.flightDrainPerSecond * deltaSeconds);
      if (this.energy <= 0) this.flightEnabled = false;
    } else {
      const targetSpeed = sprinting && this.stamina > 0 ? CONFIG.player.sprintSpeed : CONFIG.player.walkSpeed;
      const horizontalTarget = movementInput.scale(targetSpeed);
      const horizontalVelocity = new BABYLON.Vector3(this.velocity.x, 0, this.velocity.z);
      const control = this.grounded ? 16 : 7 * CONFIG.player.airControl;
      approachVector(horizontalVelocity, horizontalTarget, clamp(deltaSeconds * control, 0, 1));
      this.velocity.x = horizontalVelocity.x;
      this.velocity.z = horizontalVelocity.z;
      this.velocity.y -= CONFIG.player.gravity * deltaSeconds;
      if (this.grounded && this.input.wasPressed("Space")) {
        this.velocity.y = CONFIG.player.jumpSpeed;
        this.grounded = false;
      }
      if (sprinting && this.grounded && movementInput.lengthSquared() > 0 && this.stamina > 0) {
        this.stamina = Math.max(0, this.stamina - CONFIG.resources.sprintDrainPerSecond * deltaSeconds);
      }
    }

    this.move(deltaSeconds);
    this.recoverResources(deltaSeconds, sprinting);

    if (this.position.y < -20) {
      this.applyDamage(CONFIG.resources.voidDamage);
      this.respawn();
    }

    this.syncCamera();
  }

  getMovementIntent() {
    const forwardFlat = new BABYLON.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const rightFlat = new BABYLON.Vector3(forwardFlat.z, 0, -forwardFlat.x);
    const xInput = (this.input.isDown("KeyD") ? 1 : 0) - (this.input.isDown("KeyA") ? 1 : 0);
    const zInput = (this.input.isDown("KeyW") ? 1 : 0) - (this.input.isDown("KeyS") ? 1 : 0);
    const movementIntent = forwardFlat.scale(zInput).add(rightFlat.scale(xInput));
    if (movementIntent.lengthSquared() > 0) movementIntent.normalize();
    return movementIntent;
  }

  getDashVector() {
    const movementIntent = this.getMovementIntent();
    if (this.flightEnabled) return movementIntent.lengthSquared() > 0 ? movementIntent.normalize() : this.getForwardVector();
    if (movementIntent.lengthSquared() > 0) return movementIntent.normalize();
    const forward = this.getForwardVector();
    forward.y = 0;
    if (forward.lengthSquared() === 0) forward.z = 1;
    return forward.normalize();
  }

  move(deltaSeconds) {
    this.grounded = false;
    this.resolveAxis("x", this.velocity.x * deltaSeconds);
    this.resolveAxis("z", this.velocity.z * deltaSeconds);
    this.resolveAxis("y", this.velocity.y * deltaSeconds);
  }

  resolveAxis(axis, amount) {
    if (amount === 0) return;
    this.position[axis] += amount;
    const bounds = this.getBounds();
    const minX = Math.floor(bounds.minX);
    const maxX = Math.floor(bounds.maxX - 0.0001);
    const minY = Math.floor(bounds.minY);
    const maxY = Math.floor(bounds.maxY - 0.0001);
    const minZ = Math.floor(bounds.minZ);
    const maxZ = Math.floor(bounds.maxZ - 0.0001);
    const epsilon = 0.0001;
    let collided = false;

    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        for (let z = minZ; z <= maxZ; z += 1) {
          if (this.world.getBlock(x, y, z) === 0) continue;
          collided = true;
          if (axis === "x") {
            if (amount > 0) this.position.x = Math.min(this.position.x, x - CONFIG.player.bodyRadius - epsilon);
            else this.position.x = Math.max(this.position.x, x + 1 + CONFIG.player.bodyRadius + epsilon);
          } else if (axis === "z") {
            if (amount > 0) this.position.z = Math.min(this.position.z, z - CONFIG.player.bodyRadius - epsilon);
            else this.position.z = Math.max(this.position.z, z + 1 + CONFIG.player.bodyRadius + epsilon);
          } else if (axis === "y") {
            if (amount > 0) this.position.y = Math.min(this.position.y, y - CONFIG.player.height - epsilon);
            else { this.position.y = Math.max(this.position.y, y + 1 + epsilon); this.grounded = true; }
          }
        }
      }
    }

    if (collided) this.velocity[axis] = 0;
  }

  recoverResources(deltaSeconds, sprinting) {
    if (!sprinting || this.flightEnabled) {
      this.stamina = Math.min(CONFIG.resources.maxStamina, this.stamina + CONFIG.resources.staminaRecoveryPerSecond * deltaSeconds);
    }
    if (!this.flightEnabled) {
      this.energy = Math.min(CONFIG.resources.maxEnergy, this.energy + CONFIG.resources.energyRecoveryPerSecond * deltaSeconds);
    }
  }

  consumeEnergy(amount) {
    if (this.energy < amount) return false;
    this.energy -= amount;
    return true;
  }

  applyDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
  }

  respawn() {
    this.position.copyFrom(this.spawnPoint);
    this.velocity.set(0, 0, 0);
    this.flightEnabled = false;
    this.dashRemaining = 0;
    this.hp = Math.max(25, this.hp);
  }

  syncCamera() {
    const eyePosition = this.getEyePosition();
    const forward = this.getForwardVector();
    const speed = this.velocity.length();
    this.camera.position.copyFrom(eyePosition);
    this.camera.setTarget(eyePosition.add(forward));
    this.camera.fov = clamp(0.95 + speed * 0.004, 0.95, 1.18);
  }

  getEyePosition() {
    return new BABYLON.Vector3(this.position.x, this.position.y + CONFIG.player.eyeHeight, this.position.z);
  }

  getForwardVector() {
    const cosPitch = Math.cos(this.pitch);
    return new BABYLON.Vector3(Math.sin(this.yaw) * cosPitch, Math.sin(this.pitch), Math.cos(this.yaw) * cosPitch).normalize();
  }

  getBounds() {
    return {
      minX: this.position.x - CONFIG.player.bodyRadius,
      maxX: this.position.x + CONFIG.player.bodyRadius,
      minY: this.position.y,
      maxY: this.position.y + CONFIG.player.height,
      minZ: this.position.z - CONFIG.player.bodyRadius,
      maxZ: this.position.z + CONFIG.player.bodyRadius,
    };
  }

  getDebugState() {
    return {
      position: { x: Number(this.position.x.toFixed(2)), y: Number(this.position.y.toFixed(2)), z: Number(this.position.z.toFixed(2)) },
      velocity: { x: Number(this.velocity.x.toFixed(2)), y: Number(this.velocity.y.toFixed(2)), z: Number(this.velocity.z.toFixed(2)) },
      grounded: this.grounded,
      flightEnabled: this.flightEnabled,
      dashCooldown: Number(this.dashCooldown.toFixed(2)),
      hp: Number(this.hp.toFixed(1)),
      stamina: Number(this.stamina.toFixed(1)),
      energy: Number(this.energy.toFixed(1)),
    };
  }
}
