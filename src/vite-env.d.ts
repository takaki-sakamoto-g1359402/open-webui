/// <reference types="vite/client" />

interface Window {
  advanceTime?: (ms: number) => void;
  render_game_to_text?: () => string;
}
