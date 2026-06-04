/**
 * PlayerSave.ts
 *
 * Sacred Pickup 1회성/다회성 연출을 위한 플래그/카운터 저장소.
 *
 * 설계 (Task_SacredPickup_Implementation.md P0 Task 1):
 *   seenItems         — 아이템별 Lore Popup 노출 여부 (itemDefId → bool)
 *   firstPickupDone   — 첫 아이템 획득 컷씬 완료
 *   firstDiveDone     — 첫 앵빌 DIVE 완료 (풀 프리뷰 패널)
 *   diveCount         — 아이템별 누적 DIVE 횟수 (1회차 풀, 2-5 단축, 6+ 초단축)
 *   settings          — 접근성 옵션 (Always show lore / Skip dive)
 *
 * 이 모듈은 runtime 싱글턴(`sacredSave`)이며, SaveManager.save/load 시
 * `SaveData.sacredState` 필드와 양방향 직렬화된다. 신규 시작/레거시 세이브는
 * 빈 초기값으로 생성된다.
 */

import { t } from '@i18n';

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
  /** 첫 아이템계 보스 처치 — 이후 anvil 비활성화. */
  firstItemWorldBossDefeated: boolean;
  /** itemDefId → 누적 DIVE 횟수. */
  diveCount: Record<string, number>;
  /**
   * 현재 진행 씬/챕터 (LDtk Player 엔티티의 `Scene` 필드와 매칭). 같은 레벨/월드에서
   * 씬에 따라 다른 Player 스폰 지점을 고른다. 신규 게임 = 'prologue'.
   */
  scene: string;
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
    firstItemWorldBossDefeated: false,
    diveCount: {},
    scene: 'prologue',
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
      if (typeof data.firstItemWorldBossDefeated === 'boolean') next.firstItemWorldBossDefeated = data.firstItemWorldBossDefeated;
      if (data.diveCount && typeof data.diveCount === 'object') {
        next.diveCount = { ...data.diveCount };
      }
      if (typeof data.scene === 'string' && data.scene) next.scene = data.scene;
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
      firstItemWorldBossDefeated: this.state.firstItemWorldBossDefeated,
      diveCount: { ...this.state.diveCount },
      scene: this.state.scene,
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

  isFirstItemWorldBossDefeated(): boolean { return this.state.firstItemWorldBossDefeated; }
  markFirstItemWorldBossDefeated(): void { this.state.firstItemWorldBossDefeated = true; }

  // ---------------------------------------------------------------------------
  // Scene / chapter — drives Player spawn selection (LDtk Player.Scene field)
  // ---------------------------------------------------------------------------

  /** 현재 씬/챕터 (기본 'prologue'). Player 스폰 선택에 사용. */
  getScene(): string { return this.state.scene; }
  /** 씬/챕터 전환 시 호출 (예: 프롤로그 종료 → 'chapter01'). */
  setScene(scene: string): void { this.state.scene = scene; }

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

// ---------------------------------------------------------------------------
// Session-only tutorial flags (not persisted to save)
//
// 한 번만 띄우는 토스트류는 세이브에 굳이 박을 필요가 없다. 세션 내에서만
// 중복 발화를 막으면 충분하고, 세이브 포맷 변경도 피할 수 있다.
// ---------------------------------------------------------------------------

let _lowHpHealToastFired = false;
export function isLowHpHealToastFired(): boolean { return _lowHpHealToastFired; }
export function markLowHpHealToastFired(): void { _lowHpHealToastFired = true; }

/**
 * 무기 정의에 따라 간단한 Lore 2줄을 반환. defId 별 special 우선,
 * 없으면 rarity 폴백, 그것도 없으면 generic fallback. 모두 CSV (lore.*) 에서 로드.
 */
export function getWeaponLore(defId: string, weaponName: string, rarity: string): string[] {
  // 1) defId 기반 special — 키 존재 시 사용 (fallback 시 t() 가 키 자체를 반환하므로
  //    "lore.special.<defId>.<n>" 문자열로 시작하면 미정의로 간주).
  const sp0Key = `lore.special.${defId}.0`;
  const sp1Key = `lore.special.${defId}.1`;
  const sp0 = t(sp0Key);
  if (sp0 !== sp0Key) {
    return [sp0, t(sp1Key)];
  }

  // 2) rarity 폴백 — {name} 보간.
  const r0Key = `lore.rarity.${rarity}.0`;
  const r1Key = `lore.rarity.${rarity}.1`;
  const r0 = t(r0Key, { name: weaponName });
  if (r0 !== r0Key) {
    return [r0, t(r1Key, { name: weaponName })];
  }

  // 3) 최종 폴백.
  return [t('lore.fallback.0'), t('lore.fallback.1')];
}
