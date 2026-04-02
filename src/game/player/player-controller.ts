// @ts-nocheck

import { BABYLON } from "../../core/runtime.js";
import { CONFIG } from "../../core/constants.js";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function approachVector(current: any, target: any, factor: number): void {
  current.x += (target.x - current.x) * factor;
  current.y += (target.y - current.y) * factor;
  current.z += (target.z - current.z) * factor;
}

function moveToward(current: number, target: number, maxDelta: number): number {
  if (current < target) {
    return Math.min(current + maxDelta, target);
  }

  return Math.max(current - maxDelta, target);
}

export class PlayerController {
  [key: string]: any;

  constructor(scene: any, input: any, world: any) {
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
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.damageInvulnerability = 0;
    this.hp = CONFIG.resources.maxHp;
    this.stamina = CONFIG.resources.maxStamina;
    this.energy = CONFIG.resources.maxEnergy;

    this.camera = new BABYLON.FreeCamera("player-camera", new BABYLON.Vector3(0, 0, 0), scene);
    this.camera.minZ = 0.05;
    this.camera.maxZ = 600;
    this.camera.fov = CONFIG.player.baseFov;
    scene.activeCamera = this.camera;
  }

  spawn(position: any): void {
    this.position.copyFrom(position);
    this.spawnPoint.copyFrom(position);
    this.velocity.set(0, 0, 0);
    this.syncCamera();
  }

  update(deltaSeconds: number): void {
    const wasGrounded = this.grounded;
    const look = this.input.consumeLookDelta();
    this.yaw -= look.x * CONFIG.player.mouseSensitivity;
    this.pitch = clamp(
      this.pitch - look.y * CONFIG.player.mouseSensitivity,
      -CONFIG.player.lookClamp,
      CONFIG.player.lookClamp,
    );

    if (this.input.wasPressed("KeyF")) {
      this.flightEnabled = !this.flightEnabled && this.energy > 5;

      if (this.flightEnabled) {
        this.grounded = false;
      }
    }

    if (this.input.wasPressed("Space")) {
      this.jumpBufferTimer = CONFIG.player.jumpBufferTime;
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - deltaSeconds);
    }

    if (this.grounded) {
      this.coyoteTimer = CONFIG.player.coyoteTime;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - deltaSeconds);
    }

    if (this.dashCooldown > 0) {
      this.dashCooldown = Math.max(0, this.dashCooldown - deltaSeconds);
    }

    if (this.damageInvulnerability > 0) {
      this.damageInvulnerability = Math.max(0, this.damageInvulnerability - deltaSeconds);
    }

    if (
      this.input.wasPressed("KeyQ") &&
      this.dashCooldown <= 0 &&
      this.stamina >= CONFIG.resources.dashStaminaCost
    ) {
      const dashVector = this.getDashVector();

      this.dashDirection.copyFrom(dashVector);
      this.dashRemaining = CONFIG.player.dashDuration;
      this.dashCooldown = CONFIG.player.dashCooldown;
      this.stamina = Math.max(0, this.stamina - CONFIG.resources.dashStaminaCost);
      this.grounded = false;
    }

    const movementInput = this.getMovementIntent();
    const sprinting =
      (this.input.isDown("ShiftLeft") || this.input.isDown("ShiftRight")) &&
      movementInput.lengthSquared() > 0;

    if (this.dashRemaining > 0) {
      this.dashRemaining = Math.max(0, this.dashRemaining - deltaSeconds);
      this.velocity.copyFrom(this.dashDirection).scaleInPlace(CONFIG.player.dashSpeed);
    } else if (this.flightEnabled) {
      const flightTarget = movementInput.scale(CONFIG.player.flightSpeed);
      const verticalIntent =
        (this.input.isDown("Space") ? 1 : 0) -
        (this.input.isDown("ControlLeft") || this.input.isDown("KeyC") ? 1 : 0);

      flightTarget.y = verticalIntent * CONFIG.player.flightSpeed * 0.65;

      if (sprinting && this.stamina > 0) {
        flightTarget.scaleInPlace(CONFIG.player.flightSprintMultiplier);
        this.stamina = Math.max(
          0,
          this.stamina - CONFIG.resources.sprintDrainPerSecond * 0.65 * deltaSeconds,
        );
      }

      approachVector(
        this.velocity,
        flightTarget,
        clamp(deltaSeconds * CONFIG.player.flightAcceleration, 0, 1),
      );
      this.energy = Math.max(0, this.energy - CONFIG.resources.flightDrainPerSecond * deltaSeconds);

      if (this.energy <= 0) {
        this.flightEnabled = false;
      }
    } else {
      const targetSpeed =
        sprinting && this.stamina > 0 ? CONFIG.player.sprintSpeed : CONFIG.player.walkSpeed;
      const horizontalTarget = movementInput.scale(targetSpeed);
      const acceleration = this.grounded ? CONFIG.player.groundAcceleration : CONFIG.player.airAcceleration;
      const deceleration = this.grounded ? CONFIG.player.groundDeceleration : CONFIG.player.airDeceleration;
      const accelStep = acceleration * deltaSeconds;
      const decelStep = deceleration * deltaSeconds;
      const hasInput = movementInput.lengthSquared() > 0;

      this.velocity.x = moveToward(
        this.velocity.x,
        horizontalTarget.x,
        hasInput ? accelStep : decelStep,
      );
      this.velocity.z = moveToward(
        this.velocity.z,
        horizontalTarget.z,
        hasInput ? accelStep : decelStep,
      );

      let gravityMultiplier = this.velocity.y > 0 ? 1 : CONFIG.player.fallGravityMultiplier;

      if (this.velocity.y > 0 && !this.input.isDown("Space")) {
        gravityMultiplier = CONFIG.player.jumpCutGravityMultiplier;
      }

      this.velocity.y = Math.max(
        -CONFIG.player.maxFallSpeed,
        this.velocity.y - CONFIG.player.gravity * gravityMultiplier * deltaSeconds,
      );

      if (this.jumpBufferTimer > 0 && (this.grounded || this.coyoteTimer > 0)) {
        this.velocity.y = CONFIG.player.jumpSpeed;
        this.grounded = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
      }

      if (sprinting && this.grounded && movementInput.lengthSquared() > 0 && this.stamina > 0) {
        this.stamina = Math.max(0, this.stamina - CONFIG.resources.sprintDrainPerSecond * deltaSeconds);
      }
    }

    this.move(deltaSeconds);

    if (!wasGrounded && this.grounded) {
      this.jumpBufferTimer = 0;
    }

    this.recoverResources(deltaSeconds, sprinting);

    if (this.position.y < -20) {
      this.applyDamage(CONFIG.resources.voidDamage);
      this.respawn();
    }

    this.syncCamera();
  }

  getMovementIntent(): any {
    const forwardFlat = new BABYLON.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const rightFlat = new BABYLON.Vector3(forwardFlat.z, 0, -forwardFlat.x);
    const xInput = (this.input.isDown("KeyD") ? 1 : 0) - (this.input.isDown("KeyA") ? 1 : 0);
    const zInput = (this.input.isDown("KeyW") ? 1 : 0) - (this.input.isDown("KeyS") ? 1 : 0);
    const movementIntent = forwardFlat.scale(zInput).add(rightFlat.scale(xInput));

    if (movementIntent.lengthSquared() > 0) {
      movementIntent.normalize();
    }

    return movementIntent;
  }

  getDashVector(): any {
    const movementIntent = this.getMovementIntent();

    if (this.flightEnabled) {
      return movementIntent.lengthSquared() > 0 ? movementIntent.normalize() : this.getForwardVector();
    }

    if (movementIntent.lengthSquared() > 0) {
      return movementIntent.normalize();
    }

    const forward = this.getForwardVector();
    forward.y = 0;

    if (forward.lengthSquared() === 0) {
      forward.z = 1;
    }

    return forward.normalize();
  }

  move(deltaSeconds: number): void {
    this.grounded = false;

    this.resolveAxis("x", this.velocity.x * deltaSeconds);
    this.resolveAxis("z", this.velocity.z * deltaSeconds);
    this.resolveAxis("y", this.velocity.y * deltaSeconds);
  }

  resolveAxis(axis: "x" | "y" | "z", amount: number): void {
    if (amount === 0) {
      return;
    }

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
          if (this.world.getBlock(x, y, z) === 0) {
            continue;
          }

          collided = true;

          if (axis === "x") {
            if (amount > 0) {
              this.position.x = Math.min(this.position.x, x - CONFIG.player.bodyRadius - epsilon);
            } else {
              this.position.x = Math.max(this.position.x, x + 1 + CONFIG.player.bodyRadius + epsilon);
            }
          } else if (axis === "z") {
            if (amount > 0) {
              this.position.z = Math.min(this.position.z, z - CONFIG.player.bodyRadius - epsilon);
            } else {
              this.position.z = Math.max(this.position.z, z + 1 + CONFIG.player.bodyRadius + epsilon);
            }
          } else if (axis === "y") {
            if (amount > 0) {
              this.position.y = Math.min(this.position.y, y - CONFIG.player.height - epsilon);
            } else {
              this.position.y = Math.max(this.position.y, y + 1 + epsilon);
              this.grounded = true;
            }
          }
        }
      }
    }

    if (collided) {
      this.velocity[axis] = 0;
    }
  }

  recoverResources(deltaSeconds: number, sprinting: boolean): void {
    if (!sprinting || this.flightEnabled) {
      this.stamina = Math.min(
        CONFIG.resources.maxStamina,
        this.stamina + CONFIG.resources.staminaRecoveryPerSecond * deltaSeconds,
      );
    }

    if (!this.flightEnabled) {
      this.energy = Math.min(
        CONFIG.resources.maxEnergy,
        this.energy + CONFIG.resources.energyRecoveryPerSecond * deltaSeconds,
      );
    }
  }

  consumeEnergy(amount: number): boolean {
    if (this.energy < amount) {
      return false;
    }

    this.energy -= amount;
    return true;
  }

  applyDamage(amount: number): boolean {
    if (this.damageInvulnerability > 0) {
      return false;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.damageInvulnerability = CONFIG.resources.damageInvulnerabilityTime;

    if (this.hp <= 0) {
      this.respawn();
    }

    return true;
  }

  applyHit(sourcePosition: any, amount: number, impulse = 0): boolean {
    const damaged = this.applyDamage(amount);

    if (!damaged) {
      return false;
    }

    const knockback = this.position.subtract(sourcePosition);
    knockback.y = Math.max(0.22, knockback.y + 0.18);

    if (knockback.lengthSquared() > 0.0001 && impulse > 0) {
      knockback.normalize().scaleInPlace(impulse);
      this.velocity.x += knockback.x;
      this.velocity.y = Math.max(this.velocity.y, knockback.y);
      this.velocity.z += knockback.z;
      this.flightEnabled = false;
      this.dashRemaining = 0;
    }

    return true;
  }

  respawn(): void {
    this.position.copyFrom(this.spawnPoint);
    this.velocity.set(0, 0, 0);
    this.flightEnabled = false;
    this.dashRemaining = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.damageInvulnerability = 0;
    this.hp = Math.max(CONFIG.resources.respawnHp, this.hp);
  }

  syncCamera(): void {
    const eyePosition = this.getEyePosition();
    const forward = this.getForwardVector();
    const speed = this.velocity.length();
    this.camera.position.copyFrom(eyePosition);
    this.camera.setTarget(eyePosition.add(forward));
    const dashBoost =
      this.dashRemaining > 0
        ? (this.dashRemaining / CONFIG.player.dashDuration) * CONFIG.player.dashFovBoost
        : 0;
    const flightBoost = this.flightEnabled ? CONFIG.player.flightFovBoost : 0;
    const targetFov = clamp(
      CONFIG.player.baseFov + speed * CONFIG.player.speedFovScale + dashBoost + flightBoost,
      CONFIG.player.baseFov,
      CONFIG.player.maxFov,
    );
    this.camera.fov += (targetFov - this.camera.fov) * CONFIG.player.fovSmoothing;
  }

  getEyePosition(): any {
    return new BABYLON.Vector3(
      this.position.x,
      this.position.y + CONFIG.player.eyeHeight,
      this.position.z,
    );
  }

  getForwardVector(): any {
    const cosPitch = Math.cos(this.pitch);
    return new BABYLON.Vector3(
      Math.sin(this.yaw) * cosPitch,
      Math.sin(this.pitch),
      Math.cos(this.yaw) * cosPitch,
    ).normalize();
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
      position: {
        x: Number(this.position.x.toFixed(2)),
        y: Number(this.position.y.toFixed(2)),
        z: Number(this.position.z.toFixed(2)),
      },
      velocity: {
        x: Number(this.velocity.x.toFixed(2)),
        y: Number(this.velocity.y.toFixed(2)),
        z: Number(this.velocity.z.toFixed(2)),
      },
      grounded: this.grounded,
      flightEnabled: this.flightEnabled,
      dashCooldown: Number(this.dashCooldown.toFixed(2)),
      jumpBuffer: Number(this.jumpBufferTimer.toFixed(2)),
      coyoteTime: Number(this.coyoteTimer.toFixed(2)),
      damageInvulnerability: Number(this.damageInvulnerability.toFixed(2)),
      hp: Number(this.hp.toFixed(1)),
      stamina: Number(this.stamina.toFixed(1)),
      energy: Number(this.energy.toFixed(1)),
    };
  }
}
