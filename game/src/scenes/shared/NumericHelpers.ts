export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function getProgress01(elapsedMs: number, durationMs: number): number {
  return Math.min(1, elapsedMs / durationMs);
}

export function smootherstep01(value: number): number {
  const t = clamp01(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
}
