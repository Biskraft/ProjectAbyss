/**
 * EgoDialogue.ts — Erda + Rustborn buddy dialogue data + state tracking.
 *
 * Rustborn/Ego dialogue is intentionally empty while the dialogue set is rewritten.
 *
 * Triggers are fired from LdtkWorldScene / ItemWorldScene at specific events.
 *
 * Design ref: Documents/Content/Content_Rustborn_Onboarding_Sequence.md
 *             Documents/System/System_Localization_Core.md §4.5
 *
 * Character design:
 *   Erda     — Violet Evergarden model. Speaks rarely, factual, emotionally muted.
 *              Observes and confirms. Emotions surface slowly over the arc.
 *   Rustborn — Buddy/counter. Curious, warm, emotionally honest, slightly chatty.
 *              Asks questions Erda won't ask. Fills silence with feeling.
 *              Carries onboarding and system explanation through natural dialogue.
 */

import type { LoreLine } from '@ui/LoreDisplay';


// ── Dialogue data ─────────────────────────────────────────────────
//
// Dialogue arrays are kept as exported no-op hooks so existing trigger code
// can remain wired while the Rustborn dialogue set is rebuilt.

/** T01: Ego wakes up after pickup (freeze=true) */
export const EGO_WAKE: LoreLine[] = [];

/** T02: First movement after pickup (freeze=true, input to advance) */
export const EGO_FIRST_WALK: LoreLine[] = [];

/**
 * Rustborn discovery — player 가 Rustborn 근처 도달 시 발화 (사용자 결정 2026-05-03).
 * 기존 EGO_FIRST_WALK 의 자리를 대체. discovery pulse 종료 후 dispatch.
 */
export const EGO_RUSTBORN_AWAKEN: LoreLine[] = [];

/** DLG-05 / T03: Anvil 도달 (사용자 결정 2026-05-04 — 1 줄로 단순화) */
export const EGO_ANVIL: LoreLine[] = [];

/** 2026-05-24: 첫 anvil 사용 → 터널 열림. 1회 한정 발화. ItemWorld 진입 방향 cue. */
export const EGO_TUNNEL_OPEN: LoreLine[] = [];

/**
 * 첫 IW 보스 처치 전에 player 가 인벤토리 키를 누르면 — Rustborn 소유 시 발화.
 * (사용자 결정 2026-05-03) 보스 처치 전엔 인벤토리 잠금 상태이며 Ego 가 모루로
 * 유도. Rustborn 미소유 시는 Ego 발화 없이 단순 'Locked' 토스트.
 */
export const EGO_INVENTORY_LOCKED: LoreLine[] = [];

/** DLG-07 / T04: Plaza 첫 낙하 — Item world landing (사용자 결정 2026-05-04) */
export const EGO_IW_ENTER: LoreLine[] = [];

/** T05: First distortion monster on camera (freeze=false, auto) */
export const EGO_MONSTER_FIRST: LoreLine[] = [];

/** T06: First enemy kill (freeze=false, auto) */
export const EGO_FIRST_KILL: LoreLine[] = [];

/** T07: Room 3 clear (freeze=false, auto) */
export const EGO_ROOM_CLEAR: LoreLine[] = [];

/** T08: Innocent first visible (freeze=false, auto) */
export const EGO_INNOCENT_FOUND: LoreLine[] = [];

/** T09: Innocent stabilized (freeze=false, auto) */
export const EGO_INNOCENT_STABLE: LoreLine[] = [];

// T10: Boss appear — removed (DEC-033 feedback: unnecessary)

/** T11: Player death -> respawn (freeze=false, auto) */
export const EGO_PLAYER_DEATH: LoreLine[] = [];

/** DLG-09 / T12: Boss 처치 직후 (사용자 결정 2026-05-04) */
export const EGO_BOSS_KILLED: LoreLine[] = [];

/** DLG-08: Boss 룸 첫 진입 (사용자 결정 2026-05-04) */
export const EGO_BOSS_ROOM_ENTER: LoreLine[] = [];

/** DLG-10: Memory Shard 회상 (Forgotten → Recalled 전환 시, 첫 1회만) */
export const EGO_SHARD_RECALL: LoreLine[] = [];

/** DLG-11: Trapdoor 포탈 (Trapdoor entity spawn 시점, 첫 1회만) */
export const EGO_TRAPDOOR_THANKS: LoreLine[] = [];

/** T13: Exit altar proximity (freeze=false, auto) */
export const EGO_EXIT_ALTAR: LoreLine[] = [];

/** T14: World return — after exiting item world (freeze=false, auto) */
export const EGO_WORLD_RETURN: LoreLine[] = [];

// ── Re-entry (dialogue decay) ────────────────────────────────────

/** R01: 2nd entry */
export const EGO_REENTRY_2: LoreLine[] = [];

/** R02: 2nd entry boss kill */
export const EGO_REENTRY_2_BOSS: LoreLine[] = [];

/** R03: 3rd entry */
export const EGO_REENTRY_3: LoreLine[] = [];

// 4th+ entry: silence (no data needed)

// ── Special events ───────────────────────────────────────────────

/** S01: Player equips a stronger weapon */
export const EGO_WEAPON_SWAP: LoreLine[] = [];

/** S02: Re-entering Rustborn's item world after S01 */
export const EGO_SWAP_RETURN: LoreLine[] = [];

/** S03: Stratum 2 clear — affinity awakening (freeze=true) */
export const EGO_AFFINITY_MAX: LoreLine[] = [];

// ── Town of Orphaned Shadows (DEC-038) ───────────────────────────
//
// 거대 공동 / 자동화 보존소 톤 (BLAME!). 거주자 자체는 dialogue 0줄
// (DES-IW-TOWN-01 §3). proximity 진입 시 검 Ego(Rustborn) 가 그들에 대해
// 회상한다. 단계:
//   First    — 첫 proximity (어렴풋한 인지)
//   Familiar — 동일 무기에서 2회+ 진입 (명료한 회상)
// Recalled-Aware (50%+) 단계는 후속 폴리시에서 추가.

/** TOWN-01: Gatekeeper @ Plaza (hub) — 첫 만남 */
export const EGO_GATEKEEPER_FIRST: LoreLine[] = [];

/** TOWN-02: Gatekeeper @ Plaza — 재회 (동일 무기 2회+ 진입) */
export const EGO_GATEKEEPER_FAMILIAR: LoreLine[] = [];

/** TOWN-03: Archivist @ Archive (shrine) — 첫 만남 */
export const EGO_ARCHIVIST_FIRST: LoreLine[] = [];

/** TOWN-04: Archivist @ Archive — 재회 */
export const EGO_ARCHIVIST_FAMILIAR: LoreLine[] = [];

/** S04: First ItemDrop pickup after first IW boss clear — anvil retired + inventory hint */
export function getEgoAnvilRetired(): LoreLine[] {
  return [];
}

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
  // DEC-038 Town residents — 첫 만남 표식. has() = Familiar 단계.
  GATEKEEPER_SEEN: '__ego_gatekeeper_seen',
  ARCHIVIST_SEEN: '__ego_archivist_seen',
  // DLG-08 Boss 룸 첫 진입 / DLG-10 Memory Shard 첫 회상 / DLG-11 첫 Trapdoor 인터랙트
  BOSS_ROOM_SEEN: '__ego_boss_room_seen',
  SHARD_RECALL: '__ego_shard_recall',
  TRAPDOOR_THANKS: '__ego_trapdoor_thanks',
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
