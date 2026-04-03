// @ts-nocheck

export function attachDebugHooks(game: any): void {
  window.advanceTime = (milliseconds: number) => {
    game.advanceTime(milliseconds);
  };

  window.render_game_to_text = () => JSON.stringify(game.getDebugState(), null, 2);
}
