// @ts-nocheck

const SAVE_KEY = "voxel-personality-sandbox:mvp-save";

export class SaveSystem {
  static save(payload: any): boolean {
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          version: 1,
          savedAt: new Date().toISOString(),
          payload,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  static load(): any {
    try {
      const raw = localStorage.getItem(SAVE_KEY);

      if (!raw) {
        return null;
      }

      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
