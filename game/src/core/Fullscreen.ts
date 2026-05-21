/**
 * Fullscreen — thin wrapper around the browser Fullscreen API with the
 * project's iframe/auto-enter policy baked in.
 *
 * Policy
 * ------
 *  - Auto-enter (TitleScene first-input nudge) is disabled when the page is
 *    embedded in an iframe (e.g. itch.io). itch.io provides its own
 *    fullscreen button and a nested request fights with that.
 *  - Manual toggle (PauseMenu, F key) is *attempted* everywhere — iframe
 *    hosts that pass `allowfullscreen` will honour it; the rest fail
 *    quietly. The promise resolves with the actual state for the caller.
 *  - All API calls are wrapped in try/catch + vendor-prefix fallbacks so
 *    older Safari paths don't bubble exceptions into the game loop.
 */

/** True when the document is rendered inside an iframe (cross-origin safe). */
export function isInIframe(): boolean {
  try { return window.self !== window.top; }
  catch { return true; }
}

const PSEUDO_FULLSCREEN_CLASS = 'echoris-pseudo-fullscreen';

function isPseudoFullscreenActive(): boolean {
  return document.body.classList.contains(PSEUDO_FULLSCREEN_CLASS);
}

function setPseudoFullscreen(active: boolean): boolean {
  document.body.classList.toggle(PSEUDO_FULLSCREEN_CLASS, active);
  window.dispatchEvent(new Event('resize'));
  return isPseudoFullscreenActive();
}

function shouldUsePseudoFullscreenFallback(): boolean {
  const ua = navigator.userAgent || '';
  const isTouchApple =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);
  return isTouchApple || !document.fullscreenEnabled;
}

/** True when any fullscreen element is currently active. */
export function isFullscreenActive(): boolean {
  return !!(
    document.fullscreenElement ||
    (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
    isPseudoFullscreenActive()
  );
}

interface FullscreenCapableElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitRequestFullScreen?: () => Promise<void> | void;
}
interface FullscreenCapableDocument extends Document {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitCancelFullScreen?: () => Promise<void> | void;
}

function fullscreenTargets(): FullscreenCapableElement[] {
  const targets = [
    document.getElementById('game-container'),
    document.querySelector('canvas'),
    document.documentElement,
  ];
  return targets.filter((el): el is FullscreenCapableElement => el instanceof HTMLElement);
}

/**
 * Request fullscreen. Must be called synchronously from a user gesture
 * (click / keydown / pointer event) — browsers reject otherwise.
 *
 * @param opts.allowInIframe If false (default for auto-enter), skip the
 *   request entirely when in an iframe. PauseMenu's manual toggle passes
 *   `true` so it can still try.
 * @returns true on success, false on failure / rejection / iframe skip.
 */
export async function requestFullscreenSafely(
  opts: { allowInIframe?: boolean } = {},
): Promise<boolean> {
  if (isInIframe() && !opts.allowInIframe) return false;
  if (isFullscreenActive()) return true;
  for (const el of fullscreenTargets()) {
    const fn = el.requestFullscreen ?? el.webkitRequestFullscreen ?? el.webkitRequestFullScreen;
    if (!fn) continue;
    try {
      await Promise.resolve(fn.call(el));
      if (isFullscreenActive()) return true;
    } catch {
      // Try the next target/fallback below.
    }
  }
  return shouldUsePseudoFullscreenFallback() ? setPseudoFullscreen(true) : false;
}

/** Exit fullscreen if active. Resolves quietly even on failure. */
export async function exitFullscreenSafely(): Promise<void> {
  if (isPseudoFullscreenActive()) setPseudoFullscreen(false);
  if (!isFullscreenActive()) return;
  const doc = document as FullscreenCapableDocument;
  const fn = doc.exitFullscreen ?? doc.webkitExitFullscreen ?? doc.webkitCancelFullScreen;
  if (!fn) return;
  try { await Promise.resolve(fn.call(doc)); }
  catch { /* ignore */ }
}

/** Toggle. Always attempts the request (manual gesture); pass-through to caller for state read. */
export async function toggleFullscreen(): Promise<boolean> {
  if (isFullscreenActive()) {
    await exitFullscreenSafely();
    return isFullscreenActive();
  }
  return requestFullscreenSafely({ allowInIframe: true });
}
