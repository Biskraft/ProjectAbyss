import { Container, Graphics, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from './fonts';
import { KeyPrompt } from './KeyPrompt';
import { GAME_WIDTH } from '../Game';

/**
 * Dead Cells style dark-box key guide overlay.
 * Shows keybindings in the bottom-right corner.
 */
export class ControlsOverlay {
  container: Container;

  private static readonly LINE_H = 12;
  private static readonly PAD_X = 4;
  private static readonly PAD_Y = 4;
  private static readonly BG_ALPHA = 0.5;
  private static readonly KEY_SIZE = 8;

  private static readonly CONTROLS: [string, string][] = [
    ['\u2190\u2192', 'Move'],
    ['Z', 'Jump'],
    ['X', 'Dash'],
    ['C', 'Attack'],
    ['R', 'Flask'],
    ['I', 'Item'],
  ];

  constructor() {
    this.container = new Container();
    this.build();
  }

  private build(): void {
    const { CONTROLS, LINE_H, PAD_X, PAD_Y, BG_ALPHA, KEY_SIZE } = ControlsOverlay;

    const panelW = 80;
    const panelH = PAD_Y * 2 + CONTROLS.length * LINE_H;

    // Position bottom-right with 8px margin
    const ox = GAME_WIDTH - panelW - 8;
    const oy = 360 - panelH - 8;

    // Background
    const bg = new Graphics();
    bg.roundRect(0, 0, panelW, panelH, 2).fill({ color: 0x000000, alpha: BG_ALPHA });
    bg.x = ox;
    bg.y = oy;
    this.container.addChild(bg);

    // Key-action pairs with dark-box key icons
    for (let i = 0; i < CONTROLS.length; i++) {
      const [key, action] = CONTROLS[i];
      const rowY = oy + PAD_Y + i * LINE_H;

      // Key icon(s) — handle multi-char keys like arrows
      if (key.length > 1 && !key.startsWith('Key')) {
        // Multiple single-char keys (e.g., ←→)
        let kx = ox + PAD_X;
        for (const ch of key) {
          const icon = KeyPrompt.createKeyIcon(ch, KEY_SIZE);
          icon.x = kx;
          icon.y = rowY;
          this.container.addChild(icon);
          kx += KEY_SIZE + 1;
        }
      } else {
        const icon = KeyPrompt.createKeyIcon(key, KEY_SIZE);
        icon.x = ox + PAD_X;
        icon.y = rowY;
        this.container.addChild(icon);
      }

      // Action label (right-aligned)
      const actionText = new BitmapText({
        text: action,
        style: { fontFamily: PIXEL_FONT, fontSize: 6, fill: 0xcccccc },
      });
      actionText.anchor = { x: 1, y: 0 };
      actionText.x = ox + panelW - PAD_X;
      actionText.y = rowY + 1;
      this.container.addChild(actionText);
    }

    this.container.alpha = 0.7;
  }
}
