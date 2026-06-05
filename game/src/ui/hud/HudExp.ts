import { clampHudRatio } from './HudNumeric';

export function expLevelLabel(level: number, isMax: boolean): string {
  return isMax ? 'Lv.MAX' : `Lv.${level}`;
}

export function expFillRatio(displayRatio: number): number {
  return clampHudRatio(displayRatio);
}

export function expFlashAlpha(levelUpFlashMs: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return clampHudRatio(levelUpFlashMs / durationMs);
}

export function expLevelBounce(flashAlpha: number): number {
  return 1 + 0.3 * clampHudRatio(flashAlpha);
}
