/**
 * Analytics.ts — GA4 telemetry wrapper for ECHORIS
 *
 * P0 events (spike validation):
 *   game_start, session_end, item_world_enter,
 *   item_world_exit, item_world_floor_clear, player_death,
 *   player_save
 *
 * Debug mode: on localhost or ?debug_analytics, logs to console only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExitType = 'clear' | 'escape' | 'death';

interface GtagParams {
  [key: string]: string | number | boolean | undefined;
}

// Global gtag function injected by the GA4 snippet in index.html
declare function gtag(command: 'event', eventName: string, params?: GtagParams): void;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const isDebug =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
   window.location.hostname === '127.0.0.1' ||
   new URLSearchParams(window.location.search).has('debug_analytics'));

let sessionStartTime = 0;
let itemWorldEntryCount = 0;
let itemWorldEntryTime = 0;

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function send(eventName: string, params?: GtagParams): void {
  if (isDebug) {
    console.log(`[Analytics] ${eventName}`, params ?? '');
    return;
  }
  if (typeof gtag === 'function') {
    gtag('event', eventName, params);
  }
}

// ---------------------------------------------------------------------------
// P0 Events
// ---------------------------------------------------------------------------

/** TEL-01: Game initialization complete */
export function trackGameStart(): void {
  sessionStartTime = Date.now();
  itemWorldEntryCount = 0;
  send('game_start');
}

/** TEL-02: Session end (call from beforeunload / visibilitychange) */
export function trackSessionEnd(): void {
  if (sessionStartTime === 0) return;
  const playtimeSec = Math.floor((Date.now() - sessionStartTime) / 1000);
  send('session_end', { playtime_sec: playtimeSec });
}

/** TEL-03: Player enters Item World */
export function trackItemWorldEnter(itemRarity: string): void {
  itemWorldEntryCount++;
  itemWorldEntryTime = Date.now();
  send('item_world_enter', {
    count: itemWorldEntryCount,
    item_rarity: itemRarity,
  });
}

/** TEL-04: Player exits Item World */
export function trackItemWorldExit(exitType: ExitType, floor: number): void {
  const timeSpentSec = itemWorldEntryTime > 0
    ? Math.floor((Date.now() - itemWorldEntryTime) / 1000)
    : 0;
  send('item_world_exit', {
    exit_type: exitType,
    floor,
    time_spent_sec: timeSpentSec,
  });
}

/** TEL-05: Stratum boss defeated */
export function trackItemWorldFloorClear(floor: number, itemRarity: string): void {
  const timeSpentSec = itemWorldEntryTime > 0
    ? Math.floor((Date.now() - itemWorldEntryTime) / 1000)
    : 0;
  send('item_world_floor_clear', {
    floor,
    item_rarity: itemRarity,
    time_spent_sec: timeSpentSec,
  });
}

/** TEL-06: Player died */
export function trackPlayerDeath(
  area: 'world' | 'itemworld',
  roomCol: number,
  roomRow: number,
  enemyType: string,
): void {
  send('player_death', {
    area,
    room_col: roomCol,
    room_row: roomRow,
    enemy_type: enemyType,
  });
}

/** TEL-07: Player saved at a save point */
export function trackSave(levelId: string, playtimeSec: number): void {
  send('player_save', {
    level_id: levelId,
    playtime_sec: playtimeSec,
  });
}

// ---------------------------------------------------------------------------
// Session lifecycle (auto-register)
// ---------------------------------------------------------------------------

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => trackSessionEnd());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      trackSessionEnd();
    }
  });
}
