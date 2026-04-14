import { BitmapFont } from 'pixi.js';

/**
 * UI font for in-game HUD, toasts, menus.
 * Rajdhani — clean technical sans-serif matching presentation tone.
 */
export const PIXEL_FONT = 'GameUI';

/** Title screen font — Cinzel serif for cinematic feel. */
export const TITLE_FONT = 'CinzelTitle';

/**
 * Install BitmapFonts at native resolution for crisp text.
 * @param scale Integer pixel scale (1=640, 2=1280, 3=1920).
 */
export function installBitmapFont(scale = 1): void {
  // In-game UI font (Rajdhani — presentation-matched technical sans)
  // Falls back to Press Start 2P if Rajdhani unavailable
  const uiFamily = document.fonts.check('700 12px "Rajdhani"')
    ? '"Rajdhani", sans-serif'
    : '"Press Start 2P", monospace';

  BitmapFont.install({
    name: PIXEL_FONT,
    style: {
      fontFamily: uiFamily,
      fontSize: 16 * scale,
      fontWeight: '700',
      fill: 0xffffff,
      letterSpacing: 1 * scale,
    },
    chars: [
      ['a', 'z'],
      ['A', 'Z'],
      ['0', '9'],
      ' .,;:!?-+=/\\@#$%^&*()[]{}\'\"<>_~`|→←↑↓…×♦★',
    ],
  });

  // Title font — Cinzel serif
  const titleFamily = document.fonts.check('900 12px "Cinzel"')
    ? '"Cinzel", serif'
    : '"Press Start 2P", monospace';

  BitmapFont.install({
    name: TITLE_FONT,
    style: {
      fontFamily: titleFamily,
      fontSize: 48 * scale,
      fontWeight: '900',
      fill: 0xffffff,
      letterSpacing: 8 * scale,
    },
    chars: [
      ['A', 'Z'],
      ['a', 'z'],
      ['0', '9'],
      ' -:.',
    ],
  });
}
