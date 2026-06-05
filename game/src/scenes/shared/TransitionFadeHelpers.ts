export function getFadeOutAlphaFromRemaining(remainingMs: number, durationMs: number): number {
  return Math.min(1, 1 - remainingMs / durationMs);
}

export function getFadeInAlphaFromRemaining(remainingMs: number, durationMs: number): number {
  return Math.max(0, remainingMs / durationMs);
}
