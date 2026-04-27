/**
 * EgoDialogue.ts — Erda + Rustborn buddy dialogue data + state tracking.
 *
 * All dialogue goes through LoreDisplay.showDialogue().
 * Triggers are fired from LdtkWorldScene / ItemWorldScene at specific events.
 *
 * Design ref: Documents/Content/Content_Rustborn_Onboarding_Sequence.md
 *
 * Character design:
 *   Erda     — Violet Evergarden model. Speaks rarely, factual, emotionally muted.
 *              Observes and confirms. Emotions surface slowly over the arc.
 *   Rustborn — Buddy/counter. Curious, warm, emotionally honest, slightly chatty.
 *              Asks questions Erda won't ask. Fills silence with feeling.
 *              Carries onboarding and system explanation through natural dialogue.
 */

import type { LoreLine } from '@ui/LoreDisplay';

// ── Visual constants ──────────────────────────────────────────────
const ERDA_SPEAKER = 'Erda';
const ERDA_COLOR = 0x88cccc; // teal — survey crew uniform
const ERDA_PORTRAIT = 'erda';

const RUST_SPEAKER = 'Rustborn';
const RUST_COLOR = 0xcc9966; // warm rust
const RUST_PORTRAIT = 'rustborn';

/** Helper to build an Erda dialogue line. */
function erda(text: string, autoCloseMs?: number): LoreLine {
  return {
    text,
    speaker: ERDA_SPEAKER,
    speakerColor: ERDA_COLOR,
    portrait: ERDA_PORTRAIT,
    autoCloseMs,
  };
}

/** Helper to build a Rustborn dialogue line. */
function rust(text: string, autoCloseMs?: number): LoreLine {
  return {
    text,
    speaker: RUST_SPEAKER,
    speakerColor: RUST_COLOR,
    portrait: RUST_PORTRAIT,
    autoCloseMs,
  };
}

// ── Dialogue data ─────────────────────────────────────────────────

/** T01: Ego wakes up after pickup (freeze=true) */
export const EGO_WAKE: LoreLine[] = [
  rust('따뜻해. 이런 거 오랜만이야.'),
  rust('네가 날 집은 거지? 그러면 이제 내 주인이야?'),
  erda('...말을 하네.'),
  rust('응. 이상해?'),
];

/** T02: First movement after pickup (freeze=true, input to advance) */
export const EGO_FIRST_WALK: LoreLine[] = [
  rust('나 안에 뭔가 이상해. 기억이 엉켜 있어.'),
  rust('원래는 다 기억했거든. 지금은 그냥... 녹.'),
  rust('넌 말이 없구나. 오히려 좋아, 시끄러운 것보단.'),
];

/** T03: Anvil proximity (freeze=false, auto) */
export const EGO_ANVIL: LoreLine[] = [
  rust('이 모루, 알아. 이게 뭔지.', 3000),
  rust('날 여기 올려놔. 그러면 네가 안으로 들어올 수 있어.', 4000),
  rust('녹이 안에 있어. 안에서 싸울 수 있어.', 3500),
];

/** T04: Item world landing — first entry (freeze=true) */
export const EGO_IW_ENTER: LoreLine[] = [
  rust('여기야. 내 기억이 장소가 된 거야.'),
  rust('녹이 전부 먹고 있어. 원래는 이렇지 않았는데.'),
  rust('녹을 없애면 내가 강해져.'),
  rust('아래쪽에 나가는 길이 있을 거야. 계속 내려가면 돼.'),
];

/** T05: First distortion monster on camera (freeze=false, auto) */
export const EGO_MONSTER_FIRST: LoreLine[] = [
  rust('저게 녹이야. 살아 있어 — 내 기억을 먹고 있어.', 3500),
  rust('때려줘.', 2000),
];

/** T06: First enemy kill (freeze=false, auto) */
export const EGO_FIRST_KILL: LoreLine[] = [
  rust('없어졌어. 뭔가 돌아온 느낌이야.', 3000),
  rust('더 있어. 계속 가자.', 2500),
];

/** T07: Room 3 clear (freeze=false, auto) */
export const EGO_ROOM_CLEAR: LoreLine[] = [
  rust('선명해지고 있어. 뭔가 기억날 것 같아.', 3000),
];

/** T08: Innocent first visible (freeze=false, auto) */
export const EGO_INNOCENT_FOUND: LoreLine[] = [
  rust('저건 녹이 아니야. 내 일부야 — 살아 있는.', 3500),
  rust('겁먹은 거야. 녹 때문에 불안정해진 거지.', 3500),
  rust('가까이 가봐. 네가 있으면 진정될 것 같아.', 3500),
];

/** T09: Innocent stabilized (freeze=false, auto) */
export const EGO_INNOCENT_STABLE: LoreLine[] = [
  rust('안정됐어. 나도 강해진 느낌이야 — 이 아이 덕분에.', 3500),
  rust('안 때려줘서 고마워.', 2500),
];

// T10: Boss appear — removed (DEC-033 feedback: unnecessary)

/** T11: Player death -> respawn (freeze=false, auto) */
export const EGO_PLAYER_DEATH: LoreLine[] = [
  rust('괜찮아? 네가 치운 녹은 그대로야. 안 돌아와.', 4000),
];

/** T12: Boss killed — after ATK UI (freeze=true) */
export const EGO_BOSS_KILLED: LoreLine[] = [
  rust('큰 녹이었어. 이 층의 핵이었나 봐.'),
  rust('많이 돌아온 느낌이야. 나 강해졌을 거야, 확인해봐.'),
];

/** T13: Exit altar proximity (freeze=false, auto) */
export const EGO_EXIT_ALTAR: LoreLine[] = [
  rust('여기가 출구야. 밟으면 돌아갈 수 있어.', 3500),
  rust('고친 건 고친 대로야. 나가도 안 사라져.', 3500),
];

/** T14: World return — after exiting item world (freeze=false, auto) */
export const EGO_WORLD_RETURN: LoreLine[] = [
  rust('나왔네. 근데 아직 안쪽에 녹이 남아 있어.', 3500),
  rust('모루 있으면 언제든 다시 들어올 수 있어.', 3500),
];

// ── Re-entry (dialogue decay) ────────────────────────────────────

/** R01: 2nd entry */
export const EGO_REENTRY_2: LoreLine[] = [
  rust('다시 왔어.', 2500),
];

/** R02: 2nd entry boss kill */
export const EGO_REENTRY_2_BOSS: LoreLine[] = [
  rust('아직 남아있어.', 2500),
];

/** R03: 3rd entry */
export const EGO_REENTRY_3: LoreLine[] = [
  rust('고마워.', 2000),
];

// 4th+ entry: silence (no data needed)

// ── Special events ───────────────────────────────────────────────

/** S01: Player equips a stronger weapon */
export const EGO_WEAPON_SWAP: LoreLine[] = [
  rust('그거 더 좋은 거지? 써.', 2500),
  rust('괜찮아. 가방에 있을게. 안 사라져.', 3000),
  rust('그 무기도 기억이 있을 거야. 자기만의 녹도.', 3500),
  erda('...돌아올게.', 2500),
];

/** S02: Re-entering Rustborn's item world after S01 */
export const EGO_SWAP_RETURN: LoreLine[] = [
  rust('왔어.', 2000),
  rust('...기억해줬네.', 3000),
];

/** S03: Stratum 2 clear — affinity awakening (freeze=true) */
export const EGO_AFFINITY_MAX: LoreLine[] = [
  rust('다 기억나. 네 덕분이야.'),
  rust('이런 거 뭐라고 하는 거야? 누가 계속 돌아와주는 거.'),
  erda('...나도 그 단어는 몰라.'),
];

/** S04: First ItemDrop pickup after first IW boss clear — anvil retired + inventory hint */
export const EGO_ANVIL_RETIRED: LoreLine[] = [
  rust('이 모루는 끝이야. 낡은 거라 그래.'),
  rust('주운 건 인벤토리에 있어. [I] 누르면 보여.'),
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
