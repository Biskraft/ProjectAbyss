/**
 * ModalPanel — Unified design token system for all game modals.
 *
 * All modals MUST use these constants for visual consistency.
 * No hardcoded colors/sizes in individual modal files.
 */

import { Container, Graphics, BitmapText, Sprite, Texture, Rectangle } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { PIXEL_FONT } from './fonts';
import type { UISkin } from './UISkin';

// ---------------------------------------------------------------------------
// Color tokens
// ---------------------------------------------------------------------------

export const MODAL_BG = 0x1a1a2e;
export const MODAL_BG_ALPHA = 0.95;
export const MODAL_OVERLAY = 0x000000;
export const MODAL_OVERLAY_ALPHA = 0.6;
export const MODAL_BORDER = 0x4a4a6a;
export const MODAL_BORDER_DANGER = 0xff4444;
export const MODAL_BORDER_W = 1;
export const MODAL_DIVIDER = 0x4a4a6a;

// ---------------------------------------------------------------------------
// Text color tokens
// ---------------------------------------------------------------------------

export const TEXT_PRIMARY = 0xffffff;
export const TEXT_SECONDARY = 0xaaaaaa;
export const TEXT_POSITIVE = 0x44ff44;
export const TEXT_NEGATIVE = 0xff4444;
export const TEXT_ACCENT = 0x00ced1;
export const TEXT_GOLD = 0xffd700;
export const TEXT_WARNING = 0xffcc44;

// ---------------------------------------------------------------------------
// Font size tokens (3 tiers only)
// ---------------------------------------------------------------------------

export const FONT_TITLE = 12;
export const FONT_BODY = 10;
export const FONT_HINT = 8;

// ---------------------------------------------------------------------------
// Slot/selection tokens
// ---------------------------------------------------------------------------

export const SLOT_BG = 0x2a2a3e;
export const SLOT_SELECTED = 0x4a4a8a;
export const SLOT_EQUIPPED_BORDER = 0xffffff;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a full-screen dim overlay. */
export function createOverlay(): Graphics {
  const g = new Graphics();
  g.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: MODAL_OVERLAY, alpha: MODAL_OVERLAY_ALPHA });
  return g;
}

/** Create a centered panel background with border. */
export function createPanelBg(w: number, h: number, danger = false): Graphics {
  const g = new Graphics();
  g.rect(0, 0, w, h).fill({ color: MODAL_BG, alpha: MODAL_BG_ALPHA });
  g.rect(0, 0, w, h).stroke({ color: danger ? MODAL_BORDER_DANGER : MODAL_BORDER, width: MODAL_BORDER_W });
  return g;
}

/** Calculate centered position for a panel. */
export function centerPos(w: number, h: number): { x: number; y: number } {
  return {
    x: Math.floor((GAME_WIDTH - w) / 2),
    y: Math.floor((GAME_HEIGHT - h) / 2),
  };
}

/** Create a horizontal divider line. */
export function createDivider(x: number, y: number, w: number): Graphics {
  const g = new Graphics();
  g.moveTo(x, y); g.lineTo(x + w, y);
  g.stroke({ width: 1, color: MODAL_DIVIDER });
  return g;
}

/** Create a title BitmapText. */
export function createTitle(text: string, color = TEXT_PRIMARY): BitmapText {
  return new BitmapText({ text, style: { fontFamily: PIXEL_FONT, fontSize: FONT_TITLE, fill: color } });
}

/** Create a body BitmapText. */
export function createBody(text: string, color = TEXT_PRIMARY): BitmapText {
  return new BitmapText({ text, style: { fontFamily: PIXEL_FONT, fontSize: FONT_BODY, fill: color } });
}

/** Create a hint BitmapText. */
export function createHint(text: string, color = TEXT_SECONDARY): BitmapText {
  return new BitmapText({ text, style: { fontFamily: PIXEL_FONT, fontSize: FONT_HINT, fill: color } });
}

// ---------------------------------------------------------------------------
// 9-slice modal panel from UISkin
// ---------------------------------------------------------------------------

/** Modal frame slice name in the HUD spritesheet. */
export const MODAL_SLICE_NAME = 'ui_modal_9slice';

/**
 * Create a 9-slice panel from UISkin at the specified size.
 * Uses the modal frame slice (with center rect for 9-slice stretching).
 *
 * @param skin   Loaded UISkin instance
 * @param w      Target panel width in pixels
 * @param h      Target panel height in pixels
 * @returns Container with 9 sprite pieces, or null if skin/slice unavailable
 */
export function create9SlicePanel(skin: UISkin, w: number, h: number): Container | null {
  const tex = skin.getTexture(MODAL_SLICE_NAME);
  const center = skin.getCenter(MODAL_SLICE_NAME);
  if (!tex || !center) return null;

  const bounds = skin.getBounds(MODAL_SLICE_NAME);
  if (!bounds) return null;

  // 9-slice regions from the source texture
  const srcW = bounds.w;
  const srcH = bounds.h;
  const left = center.x;
  const top = center.y;
  const right = srcW - center.x - center.w;
  const bottom = srcH - center.y - center.h;
  const midW = center.w;
  const midH = center.h;

  // Target middle dimensions
  const tMidW = w - left - right;
  const tMidH = h - top - bottom;

  const container = new Container();
  const source = tex.source;
  const ox = bounds.x; // source offset in spritesheet
  const oy = bounds.y;

  // Helper to create a sprite from a sub-region of the source
  const piece = (sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number) => {
    if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) return;
    const t = new Texture({ source, frame: new Rectangle(ox + sx, oy + sy, sw, sh) });
    const s = new Sprite(t);
    s.x = dx;
    s.y = dy;
    s.width = dw;
    s.height = dh;
    // Nearest-neighbor for pixel art
    t.source.scaleMode = 'nearest';
    container.addChild(s);
  };

  // Top row
  piece(0, 0, left, top, 0, 0, left, top);                               // TL
  piece(left, 0, midW, top, left, 0, tMidW, top);                        // TC
  piece(left + midW, 0, right, top, left + tMidW, 0, right, top);        // TR

  // Middle row
  piece(0, top, left, midH, 0, top, left, tMidH);                        // ML
  piece(left, top, midW, midH, left, top, tMidW, tMidH);                 // MC (center stretch)
  piece(left + midW, top, right, midH, left + tMidW, top, right, tMidH); // MR

  // Bottom row
  piece(0, top + midH, left, bottom, 0, top + tMidH, left, bottom);                               // BL
  piece(left, top + midH, midW, bottom, left, top + tMidH, tMidW, bottom);                        // BC
  piece(left + midW, top + midH, right, bottom, left + tMidW, top + tMidH, right, bottom);        // BR

  return container;
}

/**
 * Create a full modal panel with 9-slice frame, overlay, and centered position.
 * Falls back to Graphics-based panel if skin is unavailable.
 */
export function createModalPanel(
  skin: UISkin | null,
  w: number,
  h: number,
): { overlay: Graphics; panel: Container; contentY: number } {
  const overlay = createOverlay();
  const pos = centerPos(w, h);

  const panel = new Container();
  panel.x = pos.x;
  panel.y = pos.y;

  let contentY = 0;

  if (skin?.isLoaded) {
    const frame = create9SlicePanel(skin, w, h);
    if (frame) {
      panel.addChild(frame);
      contentY = 0; // content starts at panel origin, inside the frame
    } else {
      // Fallback to Graphics
      panel.addChild(createPanelBg(w, h));
    }
  } else {
    panel.addChild(createPanelBg(w, h));
  }

  return { overlay, panel, contentY };
}
