/**
 * Debug.ts — Global debug overlay visibility state.
 *
 * Toggled by Shift+I (handled in Game.ts). All in-game debug visuals
 * (attack hitbox rectangles, entity markers, etc.) check `Debug.visible`
 * before drawing so the player sees a clean screen by default.
 */
export const Debug = {
  /** True = show hitbox rects, grids, markers, etc. */
  visible: false,
};
