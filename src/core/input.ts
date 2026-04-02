// @ts-nocheck

export class InputManager {
  [key: string]: any;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.buttons = new Map();
    this.pointerLocked = false;
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;

    window.addEventListener("keydown", (event) => {
      this.setButton(event.code, true);
    });

    window.addEventListener("keyup", (event) => {
      this.setButton(event.code, false);
    });

    window.addEventListener("mousedown", (event) => {
      if (event.button === 0 && document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock();
      }

      this.setButton(this.mouseButtonToKey(event.button), true);
    });

    window.addEventListener("mouseup", (event) => {
      this.setButton(this.mouseButtonToKey(event.button), false);
    });

    window.addEventListener("mousemove", (event) => {
      if (!this.pointerLocked) {
        return;
      }

      this.lookDeltaX += event.movementX;
      this.lookDeltaY += event.movementY;
    });

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
