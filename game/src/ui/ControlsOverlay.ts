import { Container, Graphics, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from './fonts';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';

/**
 * Always-visible on-screen control key guide.
 * Shows keybindings in the bottom-right corner so anyone can play immediately.
 */
export class ControlsOverlay {
  container: Container;

  private static readonly FONT_SIZE = 8;
  private static readonly LINE_H = 10;
  private static readonly PAD_X = 6;
  private static readonly PAD_Y = 4;
  private static readonly BG_ALPHA = 0.45;

  private static readonly CONTROLS: [string, string][] = [
    ['← →', 'Move'],
    ['Z', 'Attack'],
    ['X', 'Jump'],
    ['C', 'Dash'],
    ['I', 'Item'],
  ];

  constructor() {
    this.container = new Container();
    this.build();
  }

  private build(): void {
    const { CONTROLS, FONT_SIZE, LINE_H, PAD_X, PAD_Y, BG_ALPHA } = ControlsOverlay;

    // Measure panel size
    const panelW = 72;
    const panelH = PAD_Y * 2 + CONTROLS.length * LINE_H;

    // Position at top-right
    const ox = GAME_WIDTH - panelW - 4;
    const oy = 4;

    // Semi-transparent background
    const bg = new Graphics();
    bg.roundRect(0, 0, panelW, panelH, 3).fill({ color: 0x000000, alpha: BG_ALPHA });
    bg.x = ox;
    bg.y = oy;
    this.container.addChild(bg);

    // Key-action pairs
    for (let i = 0; i < CONTROLS.length; i++) {
      const [key, action] = CONTROLS[i];

      const keyText = new BitmapText({
        text: key,
        style: { fontFamily: PIXEL_FONT, fontSize: FONT_SIZE, fill: 0xffdd44 },
      });
      keyText.x = ox + PAD_X;
      keyText.y = oy + PAD_Y + i * LINE_H;
      this.container.addChild(keyText);

      const actionText = new BitmapText({
        text: action,
        style: { fontFamily: PIXEL_FONT, fontSize: FONT_SIZE, fill: 0xcccccc },
      });
      actionText.x = ox + panelW - PAD_X;
      actionText.anchor = { x: 1, y: 0 };
      actionText.y = oy + PAD_Y + i * LINE_H;
      this.container.addChild(actionText);
    }

    this.container.alpha = 0.7;
  }
}
