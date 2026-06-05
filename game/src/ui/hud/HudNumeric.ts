export function clampHudRatio(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function capHudRatio(value: number): number {
  return Math.min(1, value);
}

export function hudRatio(value: number, maxValue: number, fallback = 1): number {
  if (maxValue <= 0) return fallback;
  return clampHudRatio(value / maxValue);
}
