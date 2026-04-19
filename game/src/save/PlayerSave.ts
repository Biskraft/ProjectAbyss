/**
 * PlayerSave.ts
 *
 * Sacred Pickup 1회성/다회성 연출을 위한 플래그/카운터 저장소.
 *
 * 설계 (Task_SacredPickup_Implementation.md P0 Task 1):
 *   seenItems         — 아이템별 Lore Popup 노출 여부 (itemDefId → bool)
 *   firstPickupDone   — 첫 아이템 획득 컷씬 완료
 *   firstDiveDone     — 첫 앵빌 DIVE 완료 (풀 프리뷰 패널)
 *   firstReturnShown  — 첫 아이템계 착지 Return 아이콘 노출 완료
 *   diveCount         — 아이템별 누적 DIVE 횟수 (1회차 풀, 2-5 단축, 6+ 초단축)
 *   settings          — 접근성 옵션 (Always show lore / Skip dive)
 *
 * 이 모듈은 runtime 싱글턴(`sacredSave`)이며, SaveManager.save/load 시
 * `SaveData.sacredState` 필드와 양방향 직렬화된다. 신규 시작/레거시 세이브는
 * 빈 초기값으로 생성된다.
 */

export interface SacredSettings {
  /** false 기본. true 시 매 획득마다 LorePopup 재표시. */
  alwaysShowLore: boolean;
  /** false 기본. true 시 다이브 연출 100ms 페이드로 축약. */
  skipDive: boolean;
}

export interface SacredSaveState {
  /** itemDefId 목록 — LorePopup 노출 완료. */
  seenItems: string[];
  firstPickupDone: boolean;
  firstDiveDone: boolean;
  firstReturnShown: boolean;
  /** itemDefId → 누적 DIVE 횟수. */
  diveCount: Record<string, number>;
  settings: SacredSettings;
}

/**
 * 빈 초기값. 모든 "첫 ~ 완료" 플래그는 false, 카운터는 비어있음.
 */
function makeEmptyState(): SacredSaveState {
  return {
    seenItems: [],
    firstPickupDone: false,
    firstDiveDone: false,
    firstReturnShown: false,
    diveCount: {},
    settings: {
      alwaysShowLore: false,
      skipDive: false,
    },
  };
}

class SacredSaveImpl {
  private state: SacredSaveState = makeEmptyState();
  private seenSet: Set<string> = new Set();

  /** 세이브에서 복원. 누락된 필드는 기본값으로 백필. */
  hydrate(data?: Partial<SacredSaveState> | null): void {
    const next = makeEmptyState();
    if (data) {
      if (Array.isArray(data.seenItems)) next.seenItems = [...data.seenItems];
      if (typeof data.firstPickupDone === 'boolean') next.firstPickupDone = data.firstPickupDone;
      if (typeof data.firstDiveDone === 'boolean') next.firstDiveDone = data.firstDiveDone;
      if (typeof data.firstReturnShown === 'boolean') next.firstReturnShown = data.firstReturnShown;
      if (data.diveCount && typeof data.diveCount === 'object') {
        next.diveCount = { ...data.diveCount };
      }
      if (data.settings) {
        next.settings = {
          alwaysShowLore: !!data.settings.alwaysShowLore,
          skipDive: !!data.settings.skipDive,
        };
      }
    }
    this.state = next;
    this.seenSet = new Set(next.seenItems);
  }

  /** 세이브용 plain object. 직렬화 직전에 호출. */
  serialize(): SacredSaveState {
    // seenItems 순서 보존용으로 배열 유지.
    return {
      seenItems: [...this.state.seenItems],
      firstPickupDone: this.state.firstPickupDone,
      firstDiveDone: this.state.firstDiveDone,
      firstReturnShown: this.state.firstReturnShown,
      diveCount: { ...this.state.diveCount },
      settings: { ...this.state.settings },
    };
  }

  /** 전체 리셋 — 세이브 삭제 시 호출. */
  reset(): void {
    this.hydrate(null);
  }

  // ---------------------------------------------------------------------------
  // Lore seen
  // ---------------------------------------------------------------------------

  hasSeenItem(id: string): boolean {
    return this.seenSet.has(id);
  }

  markItemSeen(id: string): void {
    if (this.seenSet.has(id)) return;
    this.seenSet.add(id);
    this.state.seenItems.push(id);
  }

  // ---------------------------------------------------------------------------
  // First-time flags
  // ---------------------------------------------------------------------------

  isFirstPickupDone(): boolean { return this.state.firstPickupDone; }
  markFirstPickupDone(): void { this.state.firstPickupDone = true; }

  isFirstDiveDone(): boolean { return this.state.firstDiveDone; }
  markFirstDiveDone(): void { this.state.firstDiveDone = true; }

  isFirstReturnShown(): boolean { return this.state.firstReturnShown; }
  markFirstReturnShown(): void { this.state.firstReturnShown = true; }

  // ---------------------------------------------------------------------------
  // Dive counter
  // ---------------------------------------------------------------------------

  /** 아이템별 누적 DIVE 횟수 조회 (없으면 0). */
  getDiveCount(id: string): number {
    return this.state.diveCount[id] ?? 0;
  }

  /** 누적 횟수 +1. 반환값 = 갱신 후 값. 착지 직전에 호출. */
  incrementDive(id: string): number {
    const next = (this.state.diveCount[id] ?? 0) + 1;
    this.state.diveCount[id] = next;
    return next;
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  getSettings(): SacredSettings {
    return this.state.settings;
  }

  setAlwaysShowLore(v: boolean): void { this.state.settings.alwaysShowLore = v; }
  setSkipDive(v: boolean): void { this.state.settings.skipDive = v; }
}

/** 전역 싱글턴 — 어디서든 import해 동일 인스턴스 사용. */
export const sacredSave = new SacredSaveImpl();

/**
 * 무기 정의에 따라 간단한 Lore 2줄을 반환. CSV에 lore가 추가되기 전까지의
 * 임시 폴백 — 각 줄은 영문, "memory/echo/stratum/grain/forge" 중 1단어 이상 포함.
 */
export function getWeaponLore(defId: string, weaponName: string, rarity: string): string[] {
  // CSV 확장 시 def.lore가 우선.
  const templates: Record<string, string[]> = {
    sword_broken: [
      'A shattered blade still hums with memory.',
      'Its forge is silent, but the echo remains.',
    ],
  };
  if (templates[defId]) return templates[defId];

  // rarity 기반 폴백. 문장에 키워드가 최소 1개 포함되도록 구성.
  const rarityLore: Record<string, string[]> = {
    normal:   [`${weaponName} carries the grain of many hands.`,      'A plain memory, honestly forged.'],
    magic:    [`Faint stratum of arcane echo within ${weaponName}.`,  'Someone once whispered to this steel.'],
    rare:     [`Few forges could hold this memory.`,                  `${weaponName} sings when dust settles.`],
    legendary:[`The echo of a legend sleeps in ${weaponName}.`,       'Its grain is the record of a vow.'],
    ancient:  [`Older than any forge — ${weaponName} remembers first fire.`, 'Every stratum of its echo is a ruin.'],
  };
  return rarityLore[rarity] ?? ['Memory coils in the grain.', 'Something still echoes here.'];
}
