export function attachDebugHooks(game) {
  window.advanceTime = (milliseconds) => {
    game.advanceTime(milliseconds);
  };

  window.render_game_to_text = () => JSON.stringify(game.getDebugState(), null, 2);
}
