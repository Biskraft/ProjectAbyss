/**
 * Analytics.ts — GA4 telemetry wrapper for ECHORIS
 *
 * P0 events (spike validation):
 *   game_start, session_end, item_world_enter,
 *   item_world_exit, item_world_floor_clear, player_death,
 *   player_save
 *
 * P1 events (balance + progression):
 *   game_loaded, enemy_kill, boss_fight, item_drop, item_equip,
 *   item_level_up, gate_break, relic_acquire, tutorial_step
 *
 * Default params attached to EVERY event:
 *   run_id, build_version
 *
 * Debug mode: on localhost or ?debug_analytics, logs to console only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExitType = 'clear' | 'escape' | 'death';
type Area = 'world' | 'itemworld';

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

/** Unique per page-load. Allows grouping every event from a single session. */
const runId: string = (() => {
  // 12-char random hex. No crypto dep; collision risk is fine for session grouping.
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);
})();

/** Build version from Vite env. Fallback 'dev' if not injected. */
const buildVersion: string = (() => {
  try {
    const mode = (import.meta as any)?.env?.MODE ?? 'dev';
    return mode;
  } catch {
    return 'dev';
  }
})();

let sessionStartTime = 0;
let itemWorldEntryCount = 0;
let itemWorldEntryTime = 0;

/** Guards session_end against double-fire (beforeunload + visibilitychange). */
let sessionEnded = false;

/** Ring buffer of last N event names. Snapshotted into feedback context. */
const eventRing: string[] = [];
const RING_MAX = 3;

/**
 * UTM params captured from URL on first load, persisted in sessionStorage so
 * SPA-internal navigation doesn't lose attribution. Attached as default params
 * to every event after capture.
 */
const utm: { source?: string; medium?: string; campaign?: string } = (() => {
  if (typeof window === 'undefined') return {};
  const lsKey = 'echoris_utm';
  const params = new URLSearchParams(window.location.search);
  const fromUrl: { source?: string; medium?: string; campaign?: string } = {};
  const s = params.get('utm_source'); if (s) fromUrl.source = s;
  const m = params.get('utm_medium'); if (m) fromUrl.medium = m;
  const c = params.get('utm_campaign'); if (c) fromUrl.campaign = c;
  if (fromUrl.source || fromUrl.medium || fromUrl.campaign) {
    try { sessionStorage.setItem(lsKey, JSON.stringify(fromUrl)); } catch {}
    return fromUrl;
  }
  try {
    const raw = sessionStorage.getItem(lsKey);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
})();

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function send(eventName: string, params?: GtagParams): void {
  // Ring buffer for feedback context — track BEFORE enrichment.
  eventRing.push(eventName);
  if (eventRing.length > RING_MAX) eventRing.shift();

  const enriched: GtagParams = {
    run_id: runId,
    build_version: buildVersion,
    ...(utm.source ? { utm_source: utm.source } : {}),
    ...(utm.medium ? { utm_medium: utm.medium } : {}),
    ...(utm.campaign ? { utm_campaign: utm.campaign } : {}),
    ...(params ?? {}),
  };
  if (isDebug) {
    console.log(`[Analytics] ${eventName}`, enriched);
    return;
  }
  if (typeof gtag === 'function') {
    gtag('event', eventName, enriched);
  }
}

// ---------------------------------------------------------------------------
// P0 Events
// ---------------------------------------------------------------------------

/** TEL-01: Game initialization complete */
export function trackGameStart(): void {
  sessionStartTime = Date.now();
  itemWorldEntryCount = 0;
  sessionEnded = false;
  send('game_start');
}

/** TEL-02: Session end (auto-registered via beforeunload / visibilitychange) */
export function trackSessionEnd(): void {
  if (sessionEnded) return;
  if (sessionStartTime === 0) return;
  sessionEnded = true;
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

/**
 * TEL-06: Player died.
 *
 * For World deaths, pass level_id (LDtk level identifier) + player tile position.
 * For ItemWorld deaths, pass the room cell col/row (level_id omitted).
 */
export function trackPlayerDeath(params: {
  area: Area;
  level_id?: string;
  room_col: number;
  room_row: number;
  enemy_type: string;
}): void {
  const payload: GtagParams = {
    area: params.area,
    room_col: params.room_col,
    room_row: params.room_row,
    enemy_type: params.enemy_type,
  };
  if (params.level_id) payload.level_id = params.level_id;
  send('player_death', payload);
}

/** TEL-07: Player saved at a save point */
export function trackSave(levelId: string, playtimeSec: number): void {
  send('player_save', {
    level_id: levelId,
    playtime_sec: playtimeSec,
  });
}

// ---------------------------------------------------------------------------
// P1 Events
// ---------------------------------------------------------------------------

/** TEL-08: Game fully loaded (post-asset + first scene pushed) */
export function trackGameLoaded(loadTimeMs: number): void {
  send('game_loaded', { load_time_ms: loadTimeMs });
}

/** TEL-09: Enemy killed. Tracks distribution for combat/drop balance. */
export function trackEnemyKill(params: {
  area: Area;
  enemy_type: string;
  is_boss: boolean;
  is_elite: boolean;
}): void {
  send('enemy_kill', {
    area: params.area,
    enemy_type: params.enemy_type,
    is_boss: params.is_boss,
    is_elite: params.is_elite,
  });
}

/**
 * TEL-13: Item levelled up (inside Item World or via anvil upgrade).
 * Fires whenever an item's .level increases.
 */
export function trackItemLevelUp(params: {
  source: 'itemworld_boss' | 'itemworld_exp' | 'anvil';
  item_rarity: string;
  new_level: number;
}): void {
  send('item_level_up', {
    source: params.source,
    item_rarity: params.item_rarity,
    new_level: params.new_level,
  });
}

/** TEL-14: Stat/switch/event gate was broken (progression pacing signal). */
export function trackGateBreak(params: {
  gate_type: 'stat' | 'switch' | 'event';
  stat_type?: string;
  stat_threshold?: number;
  level_id?: string;
}): void {
  const payload: GtagParams = { gate_type: params.gate_type };
  if (params.stat_type) payload.stat_type = params.stat_type;
  if (params.stat_threshold !== undefined) payload.stat_threshold = params.stat_threshold;
  if (params.level_id) payload.level_id = params.level_id;
  send('gate_break', payload);
}

/** TEL-18: Ability relic acquired (ability gate unlocked). */
export function trackRelicAcquire(abilityName: string, levelId?: string): void {
  const payload: GtagParams = { ability_name: abilityName };
  if (levelId) payload.level_id = levelId;
  send('relic_acquire', payload);
}

/**
 * TEL-10: Boss encounter lifecycle. `phase` distinguishes start/clear.
 * `start` fires on arena lock engaged; `clear` fires on boss defeated.
 */
export function trackBossFight(params: {
  phase: 'start' | 'clear';
  area: Area;
  boss_id: string;
  level_id?: string;
}): void {
  const payload: GtagParams = {
    phase: params.phase,
    area: params.area,
    boss_id: params.boss_id,
  };
  if (params.level_id) payload.level_id = params.level_id;
  send('boss_fight', payload);
}

/** TEL-11: Item dropped (from enemy, boss, or hand-placed in world). */
export function trackItemDrop(params: {
  source: 'enemy' | 'golden' | 'hand_placed';
  item_id: string;
  item_rarity: string;
  level_id?: string;
}): void {
  const payload: GtagParams = {
    source: params.source,
    item_id: params.item_id,
    item_rarity: params.item_rarity,
  };
  if (params.level_id) payload.level_id = params.level_id;
  send('item_drop', payload);
}

/** TEL-12: Item equipped (weapon swap). Excludes starter/load-path equips. */
export function trackItemEquip(params: {
  item_id: string;
  item_rarity: string;
  previous_rarity: string;
}): void {
  send('item_equip', {
    item_id: params.item_id,
    item_rarity: params.item_rarity,
    previous_rarity: params.previous_rarity,
  });
}

/** TEL-19: Tutorial hint shown (first-time trigger only, one per id per session). */
export function trackTutorialStep(stepId: string): void {
  send('tutorial_step', { step_id: stepId });
}

/** TEL-20: F-key feedback panel opened. */
export function trackFeedbackOpened(params: {
  area: 'world' | 'itemworld';
  playtime_sec: number;
}): void {
  send('feedback_opened', params);
}

/**
 * TEL-21: Feedback submitted via F-key panel. Body text is NOT sent to GA4
 * (100-char param limit + GDPR). Body goes to Google Form via FeedbackSubmit.
 */
export function trackFeedbackSubmitted(params: {
  area: 'world' | 'itemworld';
  playtime_sec: number;
  category: 'bug' | 'idea' | 'other';
  text_length: number;
}): void {
  send('feedback_submitted', params);
}

// ---------------------------------------------------------------------------
// Read accessors (for FeedbackPanel context snapshot)
// ---------------------------------------------------------------------------

/** Snapshot of last N event names sent. */
export function getLastEvents(): string[] {
  return [...eventRing];
}

/** Session run_id (random per page load, groups every event from one session). */
export function getRunId(): string {
  return runId;
}

/** Build version string (Vite MODE, e.g. "production" / "dev"). */
export function getBuildVersion(): string {
  return buildVersion;
}

/** Seconds since trackGameStart. 0 if game_start hasn't fired yet. */
export function getPlaytimeSec(): number {
  if (sessionStartTime === 0) return 0;
  return Math.floor((Date.now() - sessionStartTime) / 1000);
}

/** UTM source captured from URL or sessionStorage. */
export function getUtmSource(): string | undefined {
  return utm.source;
}

/** UTM campaign captured from URL or sessionStorage. */
export function getUtmCampaign(): string | undefined {
  return utm.campaign;
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
