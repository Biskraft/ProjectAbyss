export function isTouchAppleDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);
}

export function shouldReduceVisualCost(): boolean {
  // iPadOS Safari has a much smaller practical WebGL memory budget than
  // desktop browsers. Prefer a conservative render profile there.
  return isTouchAppleDevice();
}
