import { Container, Graphics, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from './fonts';
import { KeyPrompt } from './KeyPrompt';
import { GAME_WIDTH } from '../Game';
import { GameAction, actionKey } from '@core/InputManager';

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

  /**
   * Each row is (keys[], label). A row with 2 keys renders both icons side-by-side
   * (used for the Move row showing left+right keys).
   */
  private getControls(): { keys: string[]; label: string }[] {
    return [
      { keys: [actionKey(GameAction.MOVE_LEFT), actionKey(GameAction.MOVE_RIGHT)], label: 'Move' },
      { keys: [actionKey(GameAction.JUMP)],     label: 'Jump' },
      { keys: [actionKey(GameAction.DASH)],     label: 'Dash' },
      { keys: [actionKey(GameAction.ATTACK)],   label: 'Attack' },
      { keys: [actionKey(GameAction.FLASK)],    label: 'Flask' },
      { keys: [actionKey(GameAction.INVENTORY)], label: 'Item' },
    ];
  }

  constructor() {
    this.container = new Container();
    this.build();
  }

  private build(): void {
    const { LINE_H, PAD_X, PAD_Y, BG_ALPHA, KEY_SIZE } = ControlsOverlay;
    const CONTROLS = this.getControls();

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
      const { keys, label } = CONTROLS[i];
      const rowY = oy + PAD_Y + i * LINE_H;

      // One icon per key (handles ←→ for arrows or A/D for WASD).
      let kx = ox + PAD_X;
      for (const k of keys) {
        const icon = KeyPrompt.createKeyIcon(k, KEY_SIZE);
        icon.x = kx;
        icon.y = rowY;
        this.container.addChild(icon);
        kx += KEY_SIZE + 1;
      }

      // Action label (right-aligned)
      const actionText = new BitmapText({
        text: label,
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
