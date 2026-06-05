import { Graphics } from 'pixi.js';

export function createHudPulseGlow(): Graphics {
  const gfx = new Graphics();
  gfx.alpha = 0;
  return gfx;
}

export interface DrawHudPulseGlowOptions {
  cx: number;
  cy: number;
  baseSize: number;
  pulse: number;
  radiusBaseScale: number;
  radiusPulseScale: number;
  outerColor: number;
  outerAlphaBase: number;
  outerAlphaPulse: number;
  innerColor: number;
  innerAlphaBase: number;
  innerAlphaPulse: number;
}

export function drawHudPulseGlow(gfx: Graphics, options: DrawHudPulseGlowOptions): void {
  const baseR = options.baseSize * options.radiusBaseScale;
  const r = baseR + options.pulse * options.baseSize * options.radiusPulseScale;

  gfx.clear();
  gfx
    .circle(options.cx, options.cy, r)
    .fill({ color: options.outerColor, alpha: options.outerAlphaBase + options.pulse * options.outerAlphaPulse });
  gfx
    .circle(options.cx, options.cy, r * 0.6)
    .fill({ color: options.innerColor, alpha: options.innerAlphaBase + options.pulse * options.innerAlphaPulse });
  gfx.alpha = 1;
}
