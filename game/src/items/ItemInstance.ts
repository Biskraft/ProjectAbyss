import { type Rarity, type WeaponDef } from '@data/weapons';
import {
  type Innocent,
  type InnocentStatKey,
  INNOCENT_SLOTS_BY_RARITY,
  getInnocentEffectiveValue,
} from '@data/memoryShards';
import { getItemGrowth, EXP_PER_LEVEL as _CSV_EXP, MAX_ITEM_LEVEL as _CSV_MAX } from '@data/itemGrowth';
import { getRarityConfig } from '@data/rarityConfig';
import { ItemWorldConst } from '@data/constData';
import { getMasterItem } from '@data/itemMaster';

export type { Innocent, InnocentStatKey };

let nextItemId = 1;

/** Ensure the global UID counter is above `uid` so future items never collide. */
export function ensureUidAbove(uid: number): void {
  if (uid >= nextItemId) nextItemId = uid + 1;
}

export interface ItemWorldProgress {
  /** Index of deepest stratum unlocked (boss beaten). 0 = only stratum 0 accessible. */
  deepestUnlocked: number;
  /** Visited rooms as "col,absoluteRow" strings (unified grid coordinates) */
  visitedRooms: string[];
  /** Cleared rooms as "col,absoluteRow" strings (unified grid coordinates) */
  clearedRooms: string[];
  /** Rooms whose enemies have been spawned at least once (kill persistence) */
  spawnedRooms: string[];
  /** Boss-exit portal positions keyed by stratum index. */
  bossPortals: Record<string, { x: number; y: number }>;
  /** Last stratum the player safely exited from */
  lastSafeStratum: number;
  /** All strata beaten at least once. Enables re-dive prompt. */
  cleared: boolean;
  /** Replay cycle counter. 0 = first playthrough, 1+ = re-dives. */
  cycle: number;
}

/**
 * ItemInstance — DEC-046 Memory Recovery 패러다임 적용 (2026-05-24).
 *
 * Primary 시스템 (신):
 *   - memoryRecovery: 0~100% 단일 진행 게이지
 *   - unlockedFragments: 보스 처치로 해금된 Memory Fragment ID 목록
 *   - reDiveCount: 100% 복원 후 재다이브 회차 (0~3)
 *   - effectiveAtk: 최종 데미지 계산용 (`baseAtk × (0.4 + recovery × 0.006) × (1 + reDive × 0.05)`)
 *
 * Legacy 호환 레이어 (구):
 *   - level / exp / innocents / finalAtk: 외부 코드 호환을 위해 유지하되 *신 시스템에서 자동 파생*.
 *     모든 신규 코드는 memoryRecovery / unlockedFragments / effectiveAtk 를 직접 사용해야 한다.
 */
export interface ItemInstance {
  uid: number;           // unique runtime id
  def: WeaponDef;        // base definition
  rarity: Rarity;

  // === DEC-046 신 시스템 (primary) ===
  /** Memory Recovery 진행도. 0.0 ~ 100.0. 폐기된 아이템 레벨(0-99)을 대체. */
  memoryRecovery: number;
  /** 해금된 Memory Fragment ID 목록. Stage 1~4 보스 처치로 누적. */
  unlockedFragments: string[];
  /** Re-Dive 회차. 0 = 1차 진행 중 / 1~3 = Re-Dive 진행. */
  reDiveCount: number;
  /** Re-Dive 회차별 추가 해금 Fragment ID. */
  reDiveFragments: string[];
  /** 신 공식 산정값 — 모든 데미지 계산에서 사용. */
  effectiveAtk: number;

  // === Legacy 호환 레이어 (구) — 신 시스템에서 자동 파생 ===
  /**
   * @deprecated DEC-046 — Use `memoryRecovery` instead.
   * 호환 값: floor(memoryRecovery / 10). 외부 코드 점진 마이그레이션 동안 유지.
   */
  level: number;
  /**
   * @deprecated DEC-046 — Recovery is gauge-based, no exp accumulation.
   * 항상 0. 세이브 마이그레이션 호환 목적으로만 존재.
   */
  exp: number;
  /**
   * @deprecated DEC-046 — Use `effectiveAtk` instead.
   * 호환 값: effectiveAtk와 동일. recalcItemAtk() 호출 시 동기화.
   */
  finalAtk: number;
  /**
   * @deprecated DEC-046 — 5색 기질 단편 시스템 폐기. Identity Trait는 unlockedFragments에서 파생.
   * 항상 빈 배열. 마이그레이션 호환 목적으로만 존재.
   */
  innocents: Innocent[];

  /** Fixed LDtk level ID — loads this hand-crafted level instead of procedural item world. */
  fixedLevelId?: string;

  // Memory Strata exploration state (lazily initialized on first Item World entry)
  worldProgress?: ItemWorldProgress;
}

export function getOrCreateWorldProgress(item: ItemInstance): ItemWorldProgress {
  if (!item.worldProgress) {
    item.worldProgress = {
      deepestUnlocked: 0,
      visitedRooms: [],
      clearedRooms: [],
      spawnedRooms: [],
      bossPortals: {},
      lastSafeStratum: 0,
      cleared: false,
      cycle: 0,
    };
  } else {
    // Backfill new fields for existing saves.
    if (item.worldProgress.cleared === undefined) item.worldProgress.cleared = false;
    if (item.worldProgress.cycle === undefined) item.worldProgress.cycle = 0;
    if (item.worldProgress.spawnedRooms === undefined) item.worldProgress.spawnedRooms = [];
    if (item.worldProgress.bossPortals === undefined) item.worldProgress.bossPortals = {};
  }
  return item.worldProgress;
}

/**
 * Demo build switch: when true, items that have been fully cleared cannot be
 * dived again (re-dive prompt is replaced by a refusal toast). Set to false
 * to restore the cycle / yarikomi flow in Phase 3+ full builds.
 */
export const DEMO_BLOCK_REDIVE = true;

/** True when the player has beaten every stratum of this item at least once. */
export function isItemFullyCleared(item: ItemInstance): boolean {
  return item.worldProgress?.cleared === true;
}

/** Mark the item as fully cleared (call on deepest stratum boss defeat). */
export function markItemCleared(item: ItemInstance): void {
  const wp = getOrCreateWorldProgress(item);
  wp.cleared = true;
}

/**
 * Reset room/stratum progress for another playthrough. Increments the cycle
 * counter; item level, innocents, and equipment state are preserved.
 */
export function resetItemForNextCycle(item: ItemInstance): void {
  const wp = getOrCreateWorldProgress(item);
  wp.visitedRooms = [];
  wp.clearedRooms = [];
  wp.spawnedRooms = [];
  wp.bossPortals = {};
  wp.lastSafeStratum = 0;
  // deepestUnlocked is PRESERVED across deaths — it represents permanent progress.
  // Only reset to 0 when the item is fully cleared and starting a new cycle.
  if (wp.cleared) {
    wp.deepestUnlocked = 0;
  }
  wp.cleared = false;
  wp.cycle += 1;
}

// SSoT: Sheets/Content_Item_Growth.csv via itemGrowth.ts
export const EXP_PER_LEVEL = _CSV_EXP;
export const EXP_PER_FLOOR = ItemWorldConst.ItemExpPerFloor;
export const MAX_ITEM_LEVEL = _CSV_MAX;

export function createItem(def: WeaponDef, rarity?: Rarity): ItemInstance {
  const r = rarity ?? def.rarity;
  const item: ItemInstance = {
    uid: nextItemId++,
    def,
    rarity: r,
    // DEC-046 primary
    memoryRecovery: 0,
    unlockedFragments: [],
    reDiveCount: 0,
    reDiveFragments: [],
    effectiveAtk: 0,
    // Legacy 호환 (자동 파생)
    level: 0,
    exp: 0,
    finalAtk: 0,
    innocents: [],
  };
  recalcItemAtk(item);
  return item;
}

/**
 * DEC-046 effective stat 공식 (2026-05-24 폴백 변형):
 *   effectiveAtk = baseAtk × (1.0 + Recovery × 0.005) × (1 + reDive × 0.05)
 *
 * **공식 변경 사유 (2026-05-24):** 본래 DEC-046 정의는 `0.4 + Recovery × 0.006` (0% = 40%,
 * 100% = 100%) 이었으나, baseStats × 2.0 보정이 사용자 결정으로 보류되어 신규 아이템 데미지가
 * 40%로 시작하는 문제가 발생. 폴백 공식은 *Recovery를 보너스 정체성* 으로 재해석:
 *   - Recovery 0%   = baseAtk × 1.0 (구 시스템 호환 — 막 드랍받은 상태)
 *   - Recovery 50%  = baseAtk × 1.25
 *   - Recovery 100% = baseAtk × 1.5 (구 시스템 Lv15+보너스와 거의 동등)
 *
 * 의미적 재해석: "100% 복원 = 본래 잠재력" → "100% 복원 = 본래 잠재력 + 50% 부가 표출".
 * DEC-046의 정서적 정의는 유지 (복원=해방), 다만 수치 폴백 처리.
 *
 * CSV BaseATK는 rarity 사전 적용 형식 — 코드는 rarityMultiplier를 별도 곱하지 않음.
 * Legacy 필드 (level / finalAtk) 동시 갱신하여 외부 호환 유지.
 */
export function recalcItemAtk(item: ItemInstance): void {
  const recoveryRatio = 1.0 + item.memoryRecovery * 0.005;        // 0% → 1.0, 100% → 1.5
  const reDiveBonus = 1 + item.reDiveCount * 0.05;                // 0 → 1.0, 3 → 1.15
  item.effectiveAtk = Math.ceil(item.def.baseAtk * recoveryRatio * reDiveBonus);
  // Legacy 동기화
  item.finalAtk = item.effectiveAtk;
  item.level = Math.floor(item.memoryRecovery / 10);              // 0~10 호환 (Recovery 100% = Lv 10)
}

/**
 * @deprecated DEC-046 — exp 누적 시스템 폐기. 대신 addRecovery() 사용 권장.
 * 호환 유지: exp를 Recovery 점진 증가로 환산.
 */
export function addItemExp(item: ItemInstance, exp: number): boolean {
  if (item.memoryRecovery >= 100) return false;
  // 환산 규칙: 구 EXP_PER_LEVEL → Recovery 10% (1 level)
  const recoveryGain = (exp / EXP_PER_LEVEL) * 10;
  const oldStage = Math.floor(item.memoryRecovery / 25);
  item.memoryRecovery = Math.min(100, item.memoryRecovery + recoveryGain);
  const newStage = Math.floor(item.memoryRecovery / 25);
  recalcItemAtk(item);
  return newStage > oldStage;  // Stage 변경 = "레벨업" 호환
}

/**
 * @deprecated DEC-046 — 명시적 레벨업 폐기. 보스 처치 → grantBossRecovery() 사용 권장.
 * 호환 유지: Recovery +10% 가산.
 */
export function itemLevelUp(item: ItemInstance): void {
  if (item.memoryRecovery >= 100) return;
  item.memoryRecovery = Math.min(100, item.memoryRecovery + 10);
  recalcItemAtk(item);
}

// ---------------------------------------------------------------------------
// DEC-046 신규 API — 권장 사용처
// ---------------------------------------------------------------------------

/**
 * 보스 처치 시 호출. Recovery 점프 + Fragment 해금.
 * @param stageJumpTarget 도달해야 할 Recovery 단계 (25/50/75/100). max 처리로 점진분 흡수.
 */
export function grantBossRecovery(item: ItemInstance, stageJumpTarget: number, fragmentId: string): boolean {
  const oldStage = Math.floor(item.memoryRecovery / 25);
  item.memoryRecovery = Math.max(item.memoryRecovery, stageJumpTarget);
  if (!item.unlockedFragments.includes(fragmentId)) {
    item.unlockedFragments.push(fragmentId);
  }
  recalcItemAtk(item);
  const newStage = Math.floor(item.memoryRecovery / 25);
  return newStage > oldStage;
}

/** 일반 활동(적 처치/방 클리어/환경 오브젝트)에서 호출. */
export function addRecovery(item: ItemInstance, delta: number): void {
  if (item.memoryRecovery >= 100) return;
  item.memoryRecovery = Math.min(100, item.memoryRecovery + delta);
  recalcItemAtk(item);
}

/** Re-Dive 진입 시 호출. 100% 도달 + Re-Dive < 3 필요. */
export function startReDive(item: ItemInstance): boolean {
  if (item.memoryRecovery < 100) return false;
  if (item.reDiveCount >= 3) return false;
  item.reDiveCount++;
  recalcItemAtk(item);
  return true;
}

/** Re-Dive 진행 중 Fragment 해금. */
export function unlockReDiveFragment(item: ItemInstance, fragmentId: string): void {
  if (!item.reDiveFragments.includes(fragmentId)) {
    item.reDiveFragments.push(fragmentId);
  }
}

// ---------------------------------------------------------------------------
// DEC-046 표시 / 인물 정보 헬퍼
// ---------------------------------------------------------------------------

/**
 * 현재 Recovery 단계 (0~4). Stage 변경 감지에 사용.
 * Recovery 0~24% → 0, 25~49% → 1, 50~74% → 2, 75~99% → 3, 100% → 4
 */
export function getCurrentStage(item: ItemInstance): number {
  if (item.memoryRecovery >= 100) return 4;
  return Math.floor(item.memoryRecovery / 25);
}

/**
 * Recovery 단계에 따른 표시 이름 반환.
 * itemMaster 의 nameStages[] 에서 currentStage 인덱스 조회.
 * fallback: WeaponDef.name (legacy).
 */
export function getDisplayName(item: ItemInstance): string {
  const master = getMasterItem(item.def.id);
  if (!master) return item.def.name;
  const stage = getCurrentStage(item);
  return master.nameStages[stage] || master.nameStages[4] || item.def.name;
}

/** 인물 카테고리 반환 (Surveyor / BulkheadRepairman / ...). */
export function getIdentityCategory(item: ItemInstance): string {
  const master = getMasterItem(item.def.id);
  return master?.identityCategory ?? 'Unknown';
}

/**
 * 보스 처치 시 호출되는 표준 헬퍼. Recovery 단계 점프 + Fragment 자동 ID 생성 + Stage 변경 반환.
 * Fragment ID 규칙: `{itemId}_stage_{N}` (N = 새로 도달한 stage 1~4).
 *
 * @param item 처치된 보스가 속한 아이템 인스턴스
 * @param stratumIndex 0-based 지층 인덱스 (보스 #1 = 0, 보스 #2 = 1, ...)
 * @param totalStrata 해당 아이템의 총 지층 수 (`STRATA_BY_RARITY[rarity].length`)
 * @returns Stage 변경 발생 여부 (true = 이름 진화 + Trait 가동 알림 트리거)
 */
export function grantBossStageJump(
  item: ItemInstance,
  stratumIndex: number,
  totalStrata: number,
): { stageChanged: boolean; newStage: number; fragmentId: string } {
  // 레어리티별 stage jump 매핑:
  //   Normal(1지층): boss0 → 100%
  //   Magic(2지층): boss0 → 50%, boss1 → 100%
  //   Rare(3지층): boss0 → 33%, boss1 → 67%, boss2 → 100%
  //   Legendary(4지층): boss0 → 25%, ..., boss3 → 100%
  //   Ancient(4+심연): boss0 → 25%, ..., boss3 → 100% (심연은 Re-Dive 영역)
  const segment = 100 / totalStrata;
  const target = Math.min(100, Math.round((stratumIndex + 1) * segment));

  const newStage = target === 100 ? 4 : Math.floor(target / 25);
  const fragmentId = `${item.def.id}_stage_${newStage}`;

  const stageChanged = grantBossRecovery(item, target, fragmentId);
  return { stageChanged, newStage, fragmentId };
}

// ---------------------------------------------------------------------------
// Innocent helpers
// ---------------------------------------------------------------------------

/**
 * Returns the max number of innocents this item can hold based on rarity.
 */
export function getInnocentSlotCount(item: ItemInstance): number {
  return INNOCENT_SLOTS_BY_RARITY[item.rarity];
}

/**
 * Returns true if the item has room for at least one more innocent.
 */
export function canAddInnocent(item: ItemInstance): boolean {
  return item.innocents.length < getInnocentSlotCount(item);
}

/**
 * Adds an innocent to the item if a slot is available. Returns true on success.
 */
export function addInnocent(item: ItemInstance, innocent: Innocent): boolean {
  if (!canAddInnocent(item)) return false;
  item.innocents.push(innocent);
  return true;
}

/**
 * Subdue an innocent by index — upgrades effectiveness from 50% to 100%.
 */
export function subduedInnocent(item: ItemInstance, index: number): void {
  const innocent = item.innocents[index];
  if (innocent) innocent.isSubdued = true;
}

/**
 * Aggregates total effective bonus for a given stat key across all innocents.
 * Wild = 50% of value, subdued = 100%.
 *
 * Design ref: System_ItemWorld_Core.md — calcInnocentBonus
 */
export function calcInnocentBonus(item: ItemInstance, stat: InnocentStatKey): number {
  let total = 0;
  for (const innocent of item.innocents) {
    if (innocent.stat === stat) {
      total += getInnocentEffectiveValue(innocent);
    }
  }
  return total;
}

/** Diablo-style rarity colors — SSoT: Sheets/Content_Rarity.csv */
export const RARITY_COLOR: Record<Rarity, number> = {
  normal: getRarityConfig('normal').color,
  magic: getRarityConfig('magic').color,
  rare: getRarityConfig('rare').color,
  legendary: getRarityConfig('legendary').color,
  ancient: getRarityConfig('ancient').color,
};
