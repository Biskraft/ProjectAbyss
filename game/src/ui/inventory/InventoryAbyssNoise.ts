import type { Graphics } from 'pixi.js';

export interface AbyssNoiseOptions {
  cardY: number;
  cardH: number;
  cardW: number;
  topIntensity: number;
  bottomIntensity: number;
  seed: number;
}

export function drawAbyssNoise(card: Graphics, options: AbyssNoiseOptions): void {
  let s = options.seed >>> 0;
  const rand = (): number => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xFFFFFFFF;
  };

  const area = options.cardW * options.cardH;
  const dotMax = Math.floor(area * 0.5);
  for (let i = 0; i < dotMax; i++) {
    const px = Math.floor(rand() * options.cardW);
    const yNorm = rand();
    const locI = options.topIntensity + (options.bottomIntensity - options.topIntensity) * yNorm;
    if (rand() > locI) continue;
    const py = options.cardY + Math.floor(yNorm * options.cardH);
    const r = rand();
    const color = r < 0.7 ? 0x2a2828 : (r < 0.9 ? 0x3a302a : 0x4a3020);
    const alpha = 0.5 + rand() * 0.4;
    card.rect(px, py, 1, 1).fill({ color, alpha });
  }

  const glitchMax = Math.floor(area * 0.25);
  for (let i = 0; i < glitchMax; i++) {
    const px = Math.floor(rand() * options.cardW);
    const yNorm = rand();
    const locI = options.topIntensity + (options.bottomIntensity - options.topIntensity) * yNorm;
    if (rand() > locI) continue;
    const py = options.cardY + Math.floor(yNorm * options.cardH);
    const w = 2 + Math.floor(rand() * 4);
    const color = rand() < 0.5 ? 0x3a3838 : 0x4a3a2a;
    card.rect(px, py, w, 1).fill({ color, alpha: 0.45 + rand() * 0.35 });
  }
}
