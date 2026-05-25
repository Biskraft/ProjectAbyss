export function expLevelLabel(level: number, isMax: boolean): string {
  return isMax ? 'Lv.MAX' : `Lv.${level}`;
}

export function expFillRatio(displayRatio: number): number {
  return Math.max(0, Math.min(1, displayRatio));
}

export function expFlashAlpha(levelUpFlashMs: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return Math.max(0, Math.min(1, levelUpFlashMs / durationMs));
}

export function expLevelBounce(flashAlpha: number): number {
  return 1 + 0.3 * Math.max(0, Math.min(1, flashAlpha));
}
