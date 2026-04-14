/**
 * KeyPrompt.ts - Dead Cells style dark-box key icon rendering.
 *
 * Usage:
 *   const icon = KeyPrompt.createKeyIcon('Z');
 *   const prompt = KeyPrompt.createPrompt('Z', 'Save');
 */

import { Container, Graphics, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from './fonts';

// Dark box visual constants (640x360 base)
const KEY_BOX_SIZE = 7;
const KEY_BOX_BG = 0x1a1a1a;
const KEY_BOX_BG_ALPHA = 0.85;
const KEY_BOX_BORDER = 0x666666;
const KEY_BOX_BORDER_W = 1;
const KEY_BOX_TEXT_COLOR = 0xffffff;
const KEY_BOX_FONT_SIZE = 5;
const KEY_BOX_RADIUS = 1;

// Context prompt — world-space interactable prompts (must be legible at 640x360)
const CONTEXT_KEY_SIZE = 14;
const CONTEXT_FONT_SIZE = 8;
const CONTEXT_LABEL_COLOR = 0xffffff;
const CONTEXT_BG = 0x000000;
const CONTEXT_BG_ALPHA = 0.7;
const CONTEXT_PADDING = 4;
const CONTEXT_GAP = 3;

export class KeyPrompt {

  /** Key icon — dark box with letter. Font scales proportionally to box size. */
  static createKeyIcon(key: string, size = KEY_BOX_SIZE): Container {
    const c = new Container();
    const bg = new Graphics();
    const radius = Math.max(1, Math.floor(size / 7));
    const borderW = Math.max(1, Math.floor(size / 7));

    bg.roundRect(0, 0, size, size, radius)
      .fill({ color: KEY_BOX_BG, alpha: KEY_BOX_BG_ALPHA });
    bg.roundRect(0, 0, size, size, radius)
      .stroke({ color: KEY_BOX_BORDER, width: borderW });
    c.addChild(bg);

    // Font ~70% of box size for readability
    const fontSize = Math.max(4, Math.floor(size * 0.65));
    const label = new BitmapText({
      text: key.toUpperCase(),
      style: { fontFamily: PIXEL_FONT, fontSize, fill: KEY_BOX_TEXT_COLOR },
    });
    label.x = Math.floor((size - label.width) / 2);
    label.y = Math.floor((size - label.height) / 2);
    c.addChild(label);

    return c;
  }

  /**
   * Context prompt ([Z] Save style).
   * @param scale uiScale for native-res rendering (default 1 for world-space)
   */
  static createPrompt(key: string, action: string, scale = 1): Container {
    const c = new Container();
    const s = scale;
    const keySize = CONTEXT_KEY_SIZE * s;
    const fontSize = CONTEXT_FONT_SIZE * s;
    const pad = CONTEXT_PADDING * s;
    const gap = CONTEXT_GAP * s;

    const keyIcon = KeyPrompt.createKeyIcon(key, keySize);
    keyIcon.x = pad;
    keyIcon.y = pad;
    c.addChild(keyIcon);

    const label = new BitmapText({
      text: action,
      style: { fontFamily: PIXEL_FONT, fontSize, fill: CONTEXT_LABEL_COLOR },
    });
    label.x = pad + keySize + gap;
    label.y = pad + Math.floor((keySize - label.height) / 2);
    c.addChild(label);

    // Background panel (auto-sized)
    const totalW = label.x + label.width + pad;
    const totalH = keySize + pad * 2;
    const bg = new Graphics();
    bg.roundRect(0, 0, totalW, totalH, 2 * s)
      .fill({ color: CONTEXT_BG, alpha: CONTEXT_BG_ALPHA });
    c.addChildAt(bg, 0);

    return c;
  }

  /** Convert e.code to human-readable label */
  static codeToLabel(code: string): string {
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    const map: Record<string, string> = {
      'Space': 'SPC',
      'ShiftLeft': 'SH', 'ShiftRight': 'SH',
      'ControlLeft': 'CT', 'ControlRight': 'CT',
      'ArrowLeft': '\u2190', 'ArrowRight': '\u2192',
      'ArrowUp': '\u2191', 'ArrowDown': '\u2193',
      'Escape': 'ESC', 'Enter': 'ENT', 'Tab': 'TAB',
      'Backspace': 'BS',
    };
    return map[code] || code;
  }
}
