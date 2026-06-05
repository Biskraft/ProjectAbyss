import { BitmapText, Container, Graphics, Sprite, type Texture } from 'pixi.js';
import { PIXEL_FONT } from '../fonts';
import { detachDisplayObject } from '../../scenes/shared/DisplayObjectLifecycleHelpers';

const DEPTH_COLORS = [0xFF8833, 0xCC6622, 0x993311, 0x661100];

export interface HudDepthGaugeDisplayParts {
  container: Container;
  gfx: Graphics;
}

interface HudSkinBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HudSkinDepthGaugeParts {
  frame: Sprite;
  fill: Sprite;
  tickContainer: Container;
  fillX: number;
  fillY: number;
  fillW: number;
  fillMaxH: number;
}

export function createHudDepthGaugeDisplay(): HudDepthGaugeDisplayParts {
  const container = new Container();
  container.visible = false;
  const gfx = new Graphics();
  container.addChild(gfx);
  return { container, gfx };
}

export function createSkinHudDepthGaugeParts(
  s: number,
  frameTexture: Texture,
  frameBounds: HudSkinBounds,
  fillTexture: Texture,
  fillBounds: HudSkinBounds,
): HudSkinDepthGaugeParts {
  const frame = new Sprite(frameTexture);
  frame.x = frameBounds.x * s;
  frame.y = frameBounds.y * s;
  frame.width = frameBounds.w * s;
  frame.height = frameBounds.h * s;
  frame.visible = false;

  const fillYOffset = -8;
  const topPad = (frameBounds.h - fillBounds.h) / 2;
  const fillX = (frameBounds.x + (frameBounds.w - fillBounds.w) / 2) * s;
  const fillY = (frameBounds.y + topPad + fillYOffset) * s;
  const fillW = fillBounds.w * s;
  const fillMaxH = fillBounds.h * s;

  const fill = new Sprite(fillTexture);
  fill.x = fillX;
  fill.y = fillY;
  fill.width = fillW;
  fill.height = 0;
  fill.visible = false;

  const tickContainer = new Container();
  tickContainer.visible = false;

  return { frame, fill, tickContainer, fillX, fillY, fillW, fillMaxH };
}

function depthColor(index: number, total: number): number {
  const t = total <= 1 ? 0 : index / (total - 1);
  const pos = t * (DEPTH_COLORS.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.min(lo + 1, DEPTH_COLORS.length - 1);
  const frac = pos - lo;
  const r = ((DEPTH_COLORS[lo] >> 16) & 0xff)
    + (((DEPTH_COLORS[hi] >> 16) & 0xff) - ((DEPTH_COLORS[lo] >> 16) & 0xff)) * frac;
  const g = ((DEPTH_COLORS[lo] >> 8) & 0xff)
    + (((DEPTH_COLORS[hi] >> 8) & 0xff) - ((DEPTH_COLORS[lo] >> 8) & 0xff)) * frac;
  const b = (DEPTH_COLORS[lo] & 0xff)
    + ((DEPTH_COLORS[hi] & 0xff) - (DEPTH_COLORS[lo] & 0xff)) * frac;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

export interface DrawHudDepthGaugeOptions {
  s: number;
  total: number;
  current: number;
  cleared: boolean[];
  pulseTimer: number;
  hasSkin: boolean;
  fallbackContainer: Container;
  fallbackGfx: Graphics;
  fallbackLabels: BitmapText[];
  skinFill: Sprite | null;
  skinTickContainer: Container | null;
  skinFillX: number;
  skinFillY: number;
  skinFillW: number;
  skinFillMaxH: number;
}

export function drawHudDepthGauge(options: DrawHudDepthGaugeOptions): BitmapText[] {
  if (options.total <= 0) return options.fallbackLabels;

  if (options.hasSkin && options.skinFill && options.skinTickContainer) {
    drawSkinDepthGauge(options);
    return options.fallbackLabels;
  }

  return drawFallbackDepthGauge(options);
}

export interface UpdateHudDepthGaugePulseOptions {
  pulseTimer: number;
  dt: number;
  fallbackGfx: Graphics;
  skinFill: Sprite | null;
  skinTickContainer: Container | null;
}

export function updateHudDepthGaugePulse(options: UpdateHudDepthGaugePulseOptions): number {
  const pulseTimer = (options.pulseTimer + options.dt) % 3000;
  const t = pulseTimer / 3000 * Math.PI * 2;
  const flash = 0.5 + 0.5 * Math.abs(Math.sin(t * 2));

  if (options.skinFill) options.skinFill.alpha = flash;
  if (options.skinTickContainer) options.skinTickContainer.alpha = flash;
  options.fallbackGfx.alpha = flash;

  return pulseTimer;
}

function drawSkinDepthGauge(options: DrawHudDepthGaugeOptions): void {
  const {
    s,
    total,
    current,
    cleared,
    pulseTimer,
    skinFill,
    skinTickContainer,
    skinFillX,
    skinFillY,
    skinFillW,
    skinFillMaxH,
  } = options;
  if (!skinFill || !skinTickContainer) return;

  skinTickContainer.removeChildren();

  const filledCount = Math.min(current + 1, total);
  skinFill.y = skinFillY;
  skinFill.height = skinFillMaxH * (filledCount / total);

  const tickGfx = new Graphics();
  const segH = skinFillMaxH / total;
  const pulseAlpha = 0.4 + 0.6 * ((Math.sin(pulseTimer / 2000 * Math.PI * 2) + 1) / 2);

  for (let i = 0; i < total; i++) {
    const tickY = skinFillY + i * segH;
    const isCurrent = i === current;
    const isCleared = cleared[i] ?? false;
    const tickColor = (isCleared || isCurrent) ? 0xffffff : 0x555555;

    tickGfx.rect(skinFillX - 2 * s, tickY, skinFillW + 4 * s, s).fill({ color: tickColor, alpha: 0.6 });

    const numColor = isCurrent ? 0xffffff : (isCleared ? 0xaaaaaa : 0x555555);
    const label = new BitmapText({
      text: `\u27A4${i + 1}`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8 * s, fill: numColor },
    });
    if (isCurrent) label.alpha = pulseAlpha;
    label.x = skinFillX + skinFillW + 3 * s;
    label.y = tickY + (segH - label.height) / 2;
    skinTickContainer.addChild(label);
  }

  tickGfx
    .rect(skinFillX - 2 * s, skinFillY + skinFillMaxH, skinFillW + 4 * s, s)
    .fill({ color: 0x555555, alpha: 0.6 });
  skinTickContainer.addChild(tickGfx);
}

function drawFallbackDepthGauge(options: DrawHudDepthGaugeOptions): BitmapText[] {
  const { s, total, current, cleared, pulseTimer, fallbackContainer, fallbackGfx } = options;

  fallbackGfx.clear();
  for (const label of options.fallbackLabels) {
    detachDisplayObject(label);
  }

  const labels: BitmapText[] = [];
  const railX = 4 * s;
  const railW = 3 * s;
  const topY = 80 * s;
  const bottomY = 280 * s;
  const railH = bottomY - topY;
  const tickW = 8 * s;
  const tickH = 2 * s;
  const pulseAlpha = 0.4 + 0.6 * ((Math.sin(pulseTimer / 2000 * Math.PI * 2) + 1) / 2);

  fallbackGfx.rect(railX, topY, railW, railH).fill({ color: 0x222222, alpha: 0.8 });
  const segH = railH / total;

  for (let i = 0; i < total; i++) {
    const segY = topY + i * segH;
    const isCurrent = i === current;
    const isCleared = cleared[i] ?? false;

    if (isCleared || isCurrent) {
      const color = depthColor(i, total);
      const alpha = isCurrent ? pulseAlpha : 0.9;
      fallbackGfx.rect(railX, segY, railW, segH).fill({ color, alpha });
    }

    const tickColor = (isCleared || isCurrent) ? 0xffffff : 0x444444;
    fallbackGfx.rect(railX, segY, tickW, tickH).fill({ color: tickColor, alpha: 0.7 });

    if (isCurrent) {
      const arrowX = railX + tickW + 2 * s;
      const arrowY = segY + segH / 2;
      fallbackGfx
        .moveTo(arrowX, arrowY - 3 * s)
        .lineTo(arrowX + 4 * s, arrowY)
        .lineTo(arrowX, arrowY + 3 * s)
        .fill({ color: 0xffffff, alpha: pulseAlpha });
    }

    const numColor = (isCleared || isCurrent) ? depthColor(i, total) : 0x444444;
    const label = new BitmapText({
      text: `${i + 1}`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8 * s, fill: isCurrent ? 0xffffff : numColor },
    });
    label.x = railX + tickW + (isCurrent ? 8 * s : 2 * s);
    label.y = segY + (segH - label.height) / 2;
    fallbackContainer.addChild(label);
    labels.push(label);
  }

  fallbackGfx.rect(railX, bottomY, tickW, tickH).fill({ color: 0x444444, alpha: 0.7 });
  return labels;
}
