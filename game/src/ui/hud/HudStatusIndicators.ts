import { Container, Graphics } from 'pixi.js';
import { hudRatio } from './HudNumeric';

export type EgoShardElement = 'fire' | 'ice' | 'thunder';

export interface HudStatusIconParts {
  container: Container;
  burnIconGfx: Graphics;
  burnGaugeGfx: Graphics;
}

export interface EgoShardCounterParts {
  container: Container;
  gfx: Graphics;
}

export function createHudStatusIcons(x: number, y: number): HudStatusIconParts {
  const container = new Container();
  container.x = x;
  container.y = y;
  container.visible = false;

  const burnIconGfx = new Graphics();
  const burnGaugeGfx = new Graphics();
  container.addChild(burnGaugeGfx);
  container.addChild(burnIconGfx);

  return { container, burnIconGfx, burnGaugeGfx };
}

export function createEgoShardCounter(x: number, y: number): EgoShardCounterParts {
  const container = new Container();
  container.x = x;
  container.y = y;

  const gfx = new Graphics();
  container.addChild(gfx);

  return { container, gfx };
}

export function isEgoShardHudEnabled(): boolean {
  return typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).has('debug');
}

export function drawEgoShards(
  gfx: Graphics,
  s: number,
  count: number,
  max: number,
  element: EgoShardElement,
): void {
  gfx.clear();
  const filled = element === 'fire' ? 0xff7733
    : element === 'ice' ? 0x88ccff
      : 0xffee44;
  const empty = 0x333333;
  const dotR = 3 * s;
  const gap = 4 * s;
  for (let i = 0; i < max; i++) {
    const cx = i * (dotR * 2 + gap) + dotR;
    const cy = dotR;
    const isFilled = i < count;
    gfx.moveTo(cx + dotR, cy).lineTo(cx, cy - dotR).lineTo(cx - dotR, cy).lineTo(cx, cy + dotR).closePath();
    gfx.fill({ color: isFilled ? filled : empty, alpha: isFilled ? 0.95 : 0.5 });
    if (isFilled) {
      const r2 = dotR * 0.5;
      gfx.moveTo(cx + r2, cy).lineTo(cx, cy - r2).lineTo(cx - r2, cy).lineTo(cx, cy + r2).closePath();
      gfx.fill({ color: 0xffffff, alpha: 0.85 });
    }
  }
}

export function drawBurnIcon(
  burnGaugeGfx: Graphics,
  burnIconGfx: Graphics,
  s: number,
  remainingMs: number,
  totalMs: number,
  flickerT: number,
): void {
  if (remainingMs <= 0) return;

  const size = 14 * s;
  const cx = size / 2;
  const cy = size / 2;
  const ratio = hudRatio(remainingMs, totalMs);
  const flicker = 0.85 + Math.sin(flickerT * 0.018) * 0.15;

  burnGaugeGfx.clear();
  burnGaugeGfx
    .circle(cx, cy, size * 0.62).fill({ color: 0x000000, alpha: 0.45 });
  const startA = -Math.PI / 2;
  const endA = startA + Math.PI * 2 * ratio;
  burnGaugeGfx
    .moveTo(cx, cy)
    .arc(cx, cy, size * 0.55, startA, endA)
    .lineTo(cx, cy)
    .closePath()
    .fill({ color: 0xff8844, alpha: 0.55 });

  burnIconGfx.clear();
  const tipY = cy - size * 0.45 * flicker;
  const baseY = cy + size * 0.30;
  const leftX = cx - size * 0.22;
  const rightX = cx + size * 0.22;
  burnIconGfx.moveTo(cx, tipY)
    .quadraticCurveTo(rightX, cy - size * 0.05, rightX - size * 0.05, baseY)
    .quadraticCurveTo(cx, baseY + size * 0.08, leftX + size * 0.05, baseY)
    .quadraticCurveTo(leftX, cy - size * 0.05, cx, tipY)
    .closePath()
    .fill({ color: 0xff7733, alpha: 0.95 });
  burnIconGfx.moveTo(cx, tipY + size * 0.10)
    .quadraticCurveTo(rightX - size * 0.06, cy, cx, baseY - size * 0.05)
    .quadraticCurveTo(leftX + size * 0.06, cy, cx, tipY + size * 0.10)
    .closePath()
    .fill({ color: 0xffdd66, alpha: 0.95 * flicker });
}
