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
import { GameAction, actionKey } from '@core/InputManager';

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

/**
 * Rustborn discovery — player 가 Rustborn 근처 도달 시 발화 (사용자 결정 2026-05-03).
 * 기존 EGO_FIRST_WALK 의 자리를 대체. discovery pulse 종료 후 dispatch.
 */
export const EGO_RUSTBORN_AWAKEN: LoreLine[] = [
  rust('…에르다.'),
  rust('…들리니?'),
  rust('오랜만이야. 너무 오래…'),
  rust('…내 안으로 와줘. 비어있는 결이, 너를 기다려.'),
];

/** DLG-05 / T03: Anvil 도달 (사용자 결정 2026-05-04 — 1 줄로 단순화) */
export const EGO_ANVIL: LoreLine[] = [
  rust('…모루의 냄새.', 3000),
];

/**
 * 첫 IW 보스 처치 전에 player 가 인벤토리 키를 누르면 — Rustborn 소유 시 발화.
 * (사용자 결정 2026-05-03) 보스 처치 전엔 인벤토리 잠금 상태이며 Ego 가 모루로
 * 유도. Rustborn 미소유 시는 Ego 발화 없이 단순 'Locked' 토스트.
 */
export const EGO_INVENTORY_LOCKED: LoreLine[] = [
  rust('…지금은 됐어. 모루 앞에서 보자.', 3000),
];

/** DLG-07 / T04: Plaza 첫 낙하 — Item world landing (사용자 결정 2026-05-04) */
export const EGO_IW_ENTER: LoreLine[] = [
  rust('여긴… 내가 처음 깨어난 자리지.'),
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

/** DLG-09 / T12: Boss 처치 직후 (사용자 결정 2026-05-04) */
export const EGO_BOSS_KILLED: LoreLine[] = [
  rust('…한 조각이, 돌아왔어.'),
];

/** DLG-08: Boss 룸 첫 진입 (사용자 결정 2026-05-04) */
export const EGO_BOSS_ROOM_ENTER: LoreLine[] = [
  rust('이 자가… 그때, 거기 있었어.'),
];

/** DLG-10: Memory Shard 회상 (Forgotten → Recalled 전환 시, 첫 1회만) */
export const EGO_SHARD_RECALL: LoreLine[] = [
  rust('이 한 조각… 폭풍이 있던 시절의 거야. 기억해 둬.', 4000),
];

/** DLG-11: Trapdoor 포탈 (Trapdoor entity spawn 시점, 첫 1회만) */
export const EGO_TRAPDOOR_THANKS: LoreLine[] = [
  rust('…고마워. 이제 나갈 수 있어.', 3500),
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

// ── Town of Orphaned Shadows (DEC-038) ───────────────────────────
//
// 거대 공동 / 자동화 보존소 톤 (BLAME!). 거주자 자체는 dialogue 0줄
// (DES-IW-TOWN-01 §3). proximity 진입 시 검 Ego(Rustborn) 가 그들에 대해
// 회상한다. 단계:
//   First    — 첫 proximity (어렴풋한 인지)
//   Familiar — 동일 무기에서 2회+ 진입 (명료한 회상)
// Recalled-Aware (50%+) 단계는 후속 폴리시에서 추가.

/** TOWN-01: Gatekeeper @ Plaza (hub) — 첫 만남 */
export const EGO_GATEKEEPER_FIRST: LoreLine[] = [
  rust('이 자… 본 적 있어. 어디서였더라.', 3500),
  rust('옛날엔 날 매일 갈아줬던 것 같아.', 3500),
  rust('지금은 내 이름도 못 외워. ...괜찮아. 나도 거의 못 외워.', 4000),
];

/** TOWN-02: Gatekeeper @ Plaza — 재회 (동일 무기 2회+ 진입) */
export const EGO_GATEKEEPER_FAMILIAR: LoreLine[] = [
  rust('…여전히 같은 자리야, 이 문지기.', 3500),
  rust('아직도 날 알아본 척은 안 해. 그래도 자리는 지키고 있어.', 4000),
  rust('이 자가 여기 있는 동안엔, 광장은 안 무너져.', 3500),
];

/** TOWN-03: Archivist @ Archive (shrine) — 첫 만남 */
export const EGO_ARCHIVIST_FIRST: LoreLine[] = [
  rust('저 자… 양손에 무언가를 받쳐 들고 있어.', 3500),
  rust('빌더가 떠난 후에도 옛 결을 보관하고 있어. 누가 시킨 건지 몰라.', 4000),
  rust('...누구였지, 저 사람.', 3000),
];

/** TOWN-04: Archivist @ Archive — 재회 */
export const EGO_ARCHIVIST_FAMILIAR: LoreLine[] = [
  rust('여전히 코어를 들여다보고 있어.', 3000),
  rust('내가 한 조각을 모아오면 한 번씩 코어에 손을 갖다 대.', 4000),
  rust('그게 이 자의 인사인 것 같아.', 2500),
];

/** S04: First ItemDrop pickup after first IW boss clear — anvil retired + inventory hint */
export function getEgoAnvilRetired(): LoreLine[] {
  return [
    rust('…이 모루는 식었네. 낡았으니까.'),
    rust(`주운 건 가방에 있어. [${actionKey(GameAction.INVENTORY)}] 누르면 보여.`),
  ];
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
