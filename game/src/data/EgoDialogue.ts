/**
 * EgoDialogue.ts — Rustborn Ego dialogue data + state tracking.
 *
 * All dialogue goes through LoreDisplay.showDialogue().
 * Triggers are fired from LdtkWorldScene / ItemWorldScene at specific events.
 *
 * Design ref: Documents/Content/Content_Rustborn_Onboarding_Sequence.md
 * Character ref: Violet Evergarden model — states facts, not emotions.
 */

import type { LoreLine } from '@ui/LoreDisplay';

// ── Visual constants ──────────────────────────────────────────────
const SPEAKER = 'Rustborn';
const SPEAKER_COLOR = 0xcc9966; // warm rust
const PORTRAIT = 'rustborn';

/** Helper to build a Rustborn dialogue line. */
function ego(text: string, autoCloseMs?: number): LoreLine {
  return {
    text,
    speaker: SPEAKER,
    speakerColor: SPEAKER_COLOR,
    portrait: PORTRAIT,
    autoCloseMs,
  };
}

// ── Dialogue data ─────────────────────────────────────────────────

/** T01: Ego wakes up after pickup (freeze=true) */
export const EGO_WAKE: LoreLine[] = [
  ego('따뜻해.'),
  ego('오랜만이야, 이런 거.'),
];

/** T02: First movement after pickup (freeze=true, input to advance) */
export const EGO_FIRST_WALK: LoreLine[] = [
  ego('기억이 이상해. 뭔가 뒤틀려 있어.'),
  ego('사람은 오랜만이네.'),
  ego('너도 말 안 하는 쪽이야?'),
];

/** T03: Anvil proximity (freeze=false, auto) */
export const EGO_ANVIL: LoreLine[] = [
  ego('여기. 이걸 알고 있어.', 2500),
];

/** T04: Item world landing — first entry (freeze=true) */
export const EGO_IW_ENTER: LoreLine[] = [
  ego('여기야. 내 기억.'),
  ego('녹이 퍼지고 있어. 원래는 이렇지 않았어.'),
];

/** T05: First distortion monster on camera (freeze=false, auto) */
export const EGO_MONSTER_FIRST: LoreLine[] = [
  ego('저건 녹이야. 기억을 먹고 있어.', 2500),
];

/** T06: First enemy kill (freeze=false, auto) */
export const EGO_FIRST_KILL: LoreLine[] = [
  ego('녹이 없어졌어. 지금 네가 한 건 나를 위한 거야?', 3500),
];

/** T07: Room 3 clear (freeze=false, auto) */
export const EGO_ROOM_CLEAR: LoreLine[] = [
  ego('녹이 줄었어, 조금.', 2500),
];

/** T08: Innocent first visible (freeze=false, auto) */
export const EGO_INNOCENT_FOUND: LoreLine[] = [
  ego('저건 내 일부야.', 2500),
  ego('떨고 있어. 원래는 저렇지 않았는데.', 3000),
];

/** T09: Innocent stabilized (freeze=false, auto) */
export const EGO_INNOCENT_STABLE: LoreLine[] = [
  ego('따뜻해졌어. 이 아이 때문인 것 같아.', 3000),
];

// T10: Boss appear — removed (DEC-033 feedback: unnecessary)

/** T11: Player death → respawn (freeze=false, auto) */
export const EGO_PLAYER_DEATH: LoreLine[] = [
  ego('괜찮아?', 2500),
];

/** T12: Boss killed — after ATK UI (freeze=true) */
export const EGO_BOSS_KILLED: LoreLine[] = [
  ego('큰 녹이 없어졌어.'),
  ego('이게 뭐라고 하는 거지, 이런 느낌.'),
];

/** T13: Exit altar proximity (freeze=false, auto) */
export const EGO_EXIT_ALTAR: LoreLine[] = [
  ego('녹이 덜해. 전보다.', 2500),
];

/** T14: World return — after exiting item world (freeze=false, auto) */
export const EGO_WORLD_RETURN: LoreLine[] = [
  ego('또 올 거야?', 3000),
];

// ── Re-entry (dialogue decay) ────────────────────────────────────

/** R01: 2nd entry */
export const EGO_REENTRY_2: LoreLine[] = [
  ego('다시 왔어.', 2500),
];

/** R02: 2nd entry boss kill */
export const EGO_REENTRY_2_BOSS: LoreLine[] = [
  ego('아직 남아있어.', 2500),
];

/** R03: 3rd entry */
export const EGO_REENTRY_3: LoreLine[] = [
  ego('고마워.', 2000),
];

// 4th+ entry: silence (no data needed)

// ── Special events ───────────────────────────────────────────────

/** S01: Player equips a stronger weapon */
export const EGO_WEAPON_SWAP: LoreLine[] = [
  ego('더 좋은 거야, 그거.', 2500),
  ego('교체해도 돼. 나는 도구니까.', 3000),
];

/** S02: Re-entering Rustborn's item world after S01 */
export const EGO_SWAP_RETURN: LoreLine[] = [
  ego('왔어.', 2000),
];

/** S03: Stratum 2 clear — affinity awakening (freeze=true) */
export const EGO_AFFINITY_MAX: LoreLine[] = [
  ego('느끼고 있어, 조금. 너 때문인 것 같아.'),
];

/** S04: First ItemDrop pickup after first IW boss clear — anvil retired + inventory hint */
export const EGO_ANVIL_RETIRED: LoreLine[] = [
  ego('이 모루는 끝이야. 낡은 거라 그래.'),
  ego('주운 건 인벤토리에 있어. [I] 누르면 보여.'),
];

// ── Ego weapon IDs ───────────────────────────────────────────────

/** Weapon def IDs that have an Ego. Only handcrafted weapons. */
export const EGO_WEAPON_IDS: ReadonlySet<string> = new Set([
  'sword_rustborn',   // Rustborn — first Ego weapon
  // Add future handcrafted Ego weapons here
]);

/** Check if a weapon has Ego by its def id. */
export function hasEgo(weaponId: string): boolean {
  return EGO_WEAPON_IDS.has(weaponId);
}

// ── Ego state (persisted via unlockedEvents) ─────────────────────

/** Event keys stored in unlockedEvents Set for save persistence. */
export const EGO_EVENT = {
  WAKE: '__ego_wake',
  FIRST_WALK: '__ego_first_walk',
  ANVIL_HINT: '__ego_anvil_hint',
  IW_ENTER: '__ego_iw_enter',
  MONSTER_FIRST: '__ego_monster_first',
  FIRST_KILL: '__ego_first_kill',
  ROOM_CLEAR: '__ego_room_clear',
  INNOCENT_FOUND: '__ego_innocent_found',
  INNOCENT_STABLE: '__ego_innocent_stable',
  BOSS_APPEAR: '__ego_boss_appear',
  PLAYER_DEATH: '__ego_player_death',
  BOSS_KILLED: '__ego_boss_killed',
  EXIT_ALTAR: '__ego_exit_altar',
  WORLD_RETURN: '__ego_world_return',
  WEAPON_SWAP: '__ego_weapon_swap',
  SWAP_RETURN: '__ego_swap_return',
  AFFINITY_MAX: '__ego_affinity_max',
  ANVIL_RETIRED: '__ego_anvil_retired',
} as const;

/**
 * Ego entry counter key prefix.
 * Stored as `__ego_entry_count:{itemId}` = number (stringified in unlockedEvents).
 * Since unlockedEvents is a Set<string>, we encode count as repeated add:
 *   entry 1 → '__ego_entry:1', entry 2 → '__ego_entry:2', etc.
 * Check max existing key to determine count.
 */
export function egoEntryKey(n: number): string {
  return `__ego_entry:${n}`;
}

export function getEgoEntryCount(events: Set<string>): number {
  let count = 0;
  while (events.has(egoEntryKey(count + 1))) count++;
  return count;
}
