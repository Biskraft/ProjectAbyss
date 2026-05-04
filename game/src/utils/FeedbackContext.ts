/**
 * FeedbackContext — Context payload sent with every F-key feedback submission.
 *
 * Scenes that allow F-key feedback implement IFeedbackContextProvider so the
 * panel can pull a snapshot at submit time. Anonymous fields (run_id, build,
 * utm, ua, screen) are filled by FeedbackPanel from Analytics + window.
 */

export interface FeedbackContext {
  area: 'world' | 'itemworld';
  level_id?: string;
  room_col: number;
  room_row: number;
  playtime_sec: number;
  equipped_weapon_id?: string;
  hp_pct: number;            // 0..100
  last_3_events: string[];
  utm_source?: string;
  utm_campaign?: string;
  run_id: string;
  build_version: string;
  ua_short: string;          // ex: "Chrome/130 Win10"
  screen_w: number;
  screen_h: number;
}

/** Scene-level snapshot. FeedbackPanel calls this if the active scene implements it. */
export interface IFeedbackContextProvider {
  getFeedbackContext(): {
    area: 'world' | 'itemworld';
    level_id?: string;
    room_col: number;
    room_row: number;
    equipped_weapon_id?: string;
    hp_pct: number;
  };
}

export function isFeedbackContextProvider(x: unknown): x is IFeedbackContextProvider {
  return !!x && typeof (x as any).getFeedbackContext === 'function';
}
