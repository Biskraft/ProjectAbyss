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

/** True when any fullscreen element is currently active. */
export function isFullscreenActive(): boolean {
  return !!(
    document.fullscreenElement ||
    (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
  );
}

interface FullscreenCapableElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}
interface FullscreenCapableDocument extends Document {
  webkitExitFullscreen?: () => Promise<void> | void;
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
  const el = document.documentElement as FullscreenCapableElement;
  const fn = el.requestFullscreen ?? el.webkitRequestFullscreen;
  if (!fn) return false;
  try {
    await Promise.resolve(fn.call(el));
    return isFullscreenActive();
  } catch {
    return false;
  }
}

/** Exit fullscreen if active. Resolves quietly even on failure. */
export async function exitFullscreenSafely(): Promise<void> {
  if (!isFullscreenActive()) return;
  const doc = document as FullscreenCapableDocument;
  const fn = doc.exitFullscreen ?? doc.webkitExitFullscreen;
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
