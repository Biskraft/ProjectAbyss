import { Graphics, Sprite, type Container, type Texture } from 'pixi.js';
import { FLASK_EMPTY_COLOR, FLASK_FULL_COLOR } from './HudConstants';
import { detachDisplayObject } from '../../scenes/shared/DisplayObjectLifecycleHelpers';

export interface DrawHudFlasksOptions {
  count: number;
  current: number;
  size: number;
  gap: number;
}

interface HudSkinBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HudSkinFlaskIconMetrics {
  fillTexture: Texture;
  emptyTexture: Texture;
  iconW: number;
  iconH: number;
  gap: number;
  startX: number;
  startY: number;
}

export function createHudFlaskGraphics(x: number, y: number): Graphics {
  const gfx = new Graphics();
  gfx.x = x;
  gfx.y = y;
  return gfx;
}

export function createSkinHudFlaskIconMetrics(
  s: number,
  fillTexture: Texture,
  emptyTexture: Texture,
  fillBounds: HudSkinBounds,
  flaskKeyBounds: HudSkinBounds,
): HudSkinFlaskIconMetrics {
  return {
    fillTexture,
    emptyTexture,
    iconW: fillBounds.w,
    iconH: fillBounds.h,
    gap: -5,
    startX: (flaskKeyBounds.x - 1) * s,
    startY: (flaskKeyBounds.y + (flaskKeyBounds.h - fillBounds.h) / 2) * s,
  };
}

export interface RebuildSkinHudFlaskIconsOptions {
  s: number;
  count: number;
  current: number;
  fillTexture: Texture;
  emptyTexture: Texture;
  iconW: number;
  iconH: number;
  gap: number;
  startX: number;
  startY: number;
  parent: Container;
  previousIcons: Sprite[];
}

export function rebuildSkinHudFlaskIcons(options: RebuildSkinHudFlaskIconsOptions): Sprite[] {
  for (const icon of options.previousIcons) {
    detachDisplayObject(icon);
  }

  const iconW = options.iconW * options.s;
  const iconH = options.iconH * options.s;
  const gap = options.gap * options.s;
  const totalW = options.count * iconW + Math.max(0, options.count - 1) * gap;
  const startX = options.startX - totalW;
  const icons: Sprite[] = [];

  for (let i = 0; i < options.count; i++) {
    const texture = i < options.current ? options.fillTexture : options.emptyTexture;
    const icon = new Sprite(texture);
    icon.x = startX + i * (iconW + gap);
    icon.y = options.startY;
    icon.width = iconW;
    icon.height = iconH;
    options.parent.addChild(icon);
    icons.push(icon);
  }

  return icons;
}

export interface RedrawHudFlasksOptions {
  gfx: Graphics;
  s: number;
  maxDisplay: number;
  max: number;
  current: number;
  fallbackSize: number;
  fallbackGap: number;
  hasSkin: boolean;
  skinFillTexture: Texture | null;
  skinEmptyTexture: Texture | null;
  skinIconW: number;
  skinIconH: number;
  skinGap: number;
  skinStartX: number;
  skinStartY: number;
  skinParent: Container | null;
  previousSkinIcons: Sprite[];
}

export function redrawHudFlasks(options: RedrawHudFlasksOptions): Sprite[] {
  options.gfx.clear();
  const count = Math.min(options.max, options.maxDisplay);

  if (options.hasSkin && options.skinFillTexture && options.skinEmptyTexture && options.skinParent) {
    return rebuildSkinHudFlaskIcons({
      s: options.s,
      count,
      current: options.current,
      fillTexture: options.skinFillTexture,
      emptyTexture: options.skinEmptyTexture,
      iconW: options.skinIconW,
      iconH: options.skinIconH,
      gap: options.skinGap,
      startX: options.skinStartX,
      startY: options.skinStartY,
      parent: options.skinParent,
      previousIcons: options.previousSkinIcons,
    });
  }

  drawHudFlasks(options.gfx, {
    count,
    current: options.current,
    size: options.fallbackSize,
    gap: options.fallbackGap,
  });
  return options.previousSkinIcons;
}

export function drawHudFlasks(gfx: Graphics, options: DrawHudFlasksOptions): void {
  for (let i = 0; i < options.count; i++) {
    const x = i * (options.size + options.gap);
    const color = i < options.current ? FLASK_FULL_COLOR : FLASK_EMPTY_COLOR;
    const cx = x + options.size / 2;
    const cy = options.size / 2;
    gfx.circle(cx, cy, options.size / 2).fill(color);
  }
}
