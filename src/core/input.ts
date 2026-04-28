// @ts-nocheck

export class InputManager {
  [key: string]: any;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.buttons = new Map();
    this.pointerLocked = false;
    this.dragLooking = false;
    this.trackpadLookScale = 0.45;
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    this.canvas.tabIndex = 0;

    window.addEventListener("keydown", (event) => {
      if (
        event.code === "Tab" ||
        event.code.startsWith("Digit") ||
        event.code === "KeyE" ||
        event.code === "KeyR" ||
        event.code === "KeyT" ||
        event.code === "KeyO" ||
        event.code === "KeyP"
      ) {
        event.preventDefault();
      }

      this.setButton(event.code, true);
    });

    window.addEventListener("keyup", (event) => {
      this.setButton(event.code, false);
    });

    window.addEventListener("mousedown", (event) => {
      if (event.button === 0) {
        this.dragLooking = true;
        this.canvas.focus();
      }

      if (event.button === 0 && document.pointerLockElement !== this.canvas) {
        this.requestPointerLockSafely();
      }

      this.setButton(this.mouseButtonToKey(event.button), true);
    });

    window.addEventListener("mouseup", (event) => {
      if (event.button === 0) {
        this.dragLooking = false;
      }

      this.setButton(this.mouseButtonToKey(event.button), false);
    });

    this.canvas.addEventListener("click", () => {
      if (document.pointerLockElement !== this.canvas) {
        this.requestPointerLockSafely();
      }
    });

    window.addEventListener("mousemove", (event) => {
      if (!this.pointerLocked && !this.dragLooking) {
        return;
      }

      this.lookDeltaX += event.movementX;
      this.lookDeltaY += event.movementY;
    });

    this.canvas.addEventListener(
      "wheel",
      (event) => {
        if (this.pointerLocked) {
          return;
        }

        this.canvas.focus();
        this.lookDeltaX += event.deltaX * this.trackpadLookScale;
        this.lookDeltaY += event.deltaY * this.trackpadLookScale;
        event.preventDefault();
      },
      { passive: false },
    );

    document.addEventListener("pointerlockchange", () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });

    window.addEventListener("contextmenu", (event) => {
      if (event.target === this.canvas) {
        event.preventDefault();
      }
    });

    window.addEventListener("blur", () => {
      this.buttons.clear();
      this.dragLooking = false;
      this.lookDeltaX = 0;
      this.lookDeltaY = 0;
    });
  }

  isDown(key: string): boolean {
    return this.buttons.get(key)?.down ?? false;
  }

  wasPressed(key: string): boolean {
    return this.buttons.get(key)?.pressed ?? false;
  }

  consumeLookDelta(): { x: number; y: number } {
    const delta = {
      x: this.lookDeltaX,
      y: this.lookDeltaY,
    };

    this.lookDeltaX = 0;
    this.lookDeltaY = 0;

    return delta;
  }

  isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  requestPointerLockSafely(): void {
    if (typeof this.canvas.requestPointerLock !== "function") {
      return;
    }

    try {
      const request = this.canvas.requestPointerLock();

      if (request && typeof request.catch === "function") {
        request.catch(() => {
          this.pointerLocked = false;
        });
      }
    } catch {
      this.pointerLocked = false;
    }
  }

  endFrame(): void {
    for (const buttonState of this.buttons.values()) {
      buttonState.pressed = false;
    }
  }

  mouseButtonToKey(button: number): string {
    return `Mouse${button}`;
  }

  setButton(key: string, down: boolean): void {
    const buttonState = this.buttons.get(key) ?? { down: false, pressed: false };

    if (down && !buttonState.down) {
      buttonState.pressed = true;
    }

    buttonState.down = down;
    this.buttons.set(key, buttonState);
  }
}
