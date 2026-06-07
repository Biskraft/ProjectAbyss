export function getFadeOutAlphaFromRemaining(remainingMs: number, durationMs: number): number {
  if (durationMs <= 0) return 1;
  return Math.max(0, Math.min(1, 1 - remainingMs / durationMs));
}

export function getFadeInAlphaFromRemaining(remainingMs: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return Math.max(0, Math.min(1, remainingMs / durationMs));
}
