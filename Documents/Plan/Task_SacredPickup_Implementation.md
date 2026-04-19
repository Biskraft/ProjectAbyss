# Sacred Pickup 구현 작업 지시서

> **작성일:** 2026-04-18
> **대상:** AI Programmer Agent
> **설계 문서:** `Documents/UI/UI_SacredPickup.md` (마스터 스펙)
> **연계 문서:** `Documents/System/System_World_Interactables.md` §3.1 Anvil, `Documents/UI/UI_Inventory.md`, `Documents/UI/UI_Notifications.md`
> **리서치 근거:** `Documents/Research/ItemWorldEntry_NaturalOnboarding_Research.md` §7, §7.8, §8 / `Documents/Research/Zelda_Onboarding_Evolution_Research.md`
> **기술 스택:** PixiJS v8, TypeScript, 640×360 베이스

---

## 개요

아이템 획득 → 앵빌 → 아이템계 진입 전체 흐름을 "Sacred Pickup" 체계로 개편한다. 각 연출은 **1회성(T, Teaching)** 과 **다회성(S, System)** 으로 분리되어 세이브 플래그로 분기된다.

**핵심 원칙:** 1회성은 첫 경험에서만 발동, 다회성은 시스템 정체성 유지. Lore는 아이템별 1회 (젤다 SS HD 교훈).

---

## P0: 세이브 플래그 확장 + 대장간 UI 단일화

### Task 1: PlayerSave 플래그 추가

**파일:** `game/src/save/PlayerSave.ts` (또는 동급 경로)

**추가 필드:**
```typescript
seenItems: Set<string>;          // itemDefId → Lore Popup 노출 완료
firstPickupDone: boolean;        // 첫 온전한 아이템 획득 완료
firstDiveDone: boolean;          // 첫 앵빌 DIVE 완료
firstReturnShown: boolean;       // 첫 아이템계 착지 Return 아이콘 노출 완료
diveCount: Record<string, number>; // itemDefId → 누적 DIVE 횟수
settings: {
  alwaysShowLore: boolean;       // 기본 false
  skipDive: boolean;              // 기본 false
};
```

**API:**
```typescript
hasSeenItem(id: string): boolean;
markItemSeen(id: string): void;
markFirstPickupDone(): void;
markFirstDiveDone(): void;
markFirstReturnShown(): void;
incrementDive(id: string): number;  // 반환 = 갱신 후 누적값
```

### Task 2: 대장간 UI 경로 단일화

**파일:** `game/src/scenes/LdtkWorldScene.ts`

- `drawItemSelectUI` (line ~3080) **삭제**
- `updateAnvilInput` (line ~3360), `placeItemOnAnvil` (line ~3387)을 `InventoryUI.openForAnvil(onSelect)` 경로로 교체
- 장착 중 아이템 선택 시 `onSelect` 전에 "Unequip first" 토스트 (기존 line 3371 유지)
- 앵빌 힌트 텍스트 "UP: Place weapon" 제거

**파일:** `game/src/entities/Anvil.ts`

- `setShowHint` 텍스트 경로 제거
- [E] 심볼 프롬프트 스프라이트로 교체 (SacredPickup §3.7)

---

## P1: Lore Popup + Return 아이콘 (1회성/다회성 분기 핵심)

### Task 3: LorePopup 모달 (S3)

**신규 파일:** `game/src/ui/LorePopup.ts`

**동작:**
- 트리거: 아이템 획득 직후 `!save.hasSeenItem(itemDefId)` 또는 `settings.alwaysShowLore === true`
- 레이아웃: 중앙 모달, 오버레이 `#000000` alpha 0.6, 게임 입력 일시 정지
- 구성: 무기 스프라이트 48×48 / 이름 12px / Lore 2줄 8px `#ccccdd` / 스탯 / "Memory Strata: N Floors" / "[X] CLOSE"
- 닫기: [X] 키만. ESC 비활성.
- 종료 시: `save.markItemSeen(itemDefId)` + 즉시 저장

**ItemDef 스키마 확장:** `game/src/items/ItemInstance.ts` 의 ItemDef 에 `lore: string` (2줄 영문, "memory/echo/stratum/grain/forge" 중 1단어 이상 포함) 필드 추가.

### Task 4: Return 아이콘 T6 (1회성)

**파일:** `game/src/ui/HUD.ts` 또는 신규 `game/src/ui/ReturnHint.ts`

**동작:**
- 아이템계 씬 최초 착지 시 `!save.firstReturnShown` 조건 체크
- 조건 충족: 좌상단 (8,8)에 [ESC] 심볼 + "Return to Surface" (영문 8px) 24×24 크기로 0.5초 → 1.5초 축소 트윈 (12×12) → 상시 HUD 유지
- 종료 시: `save.markFirstReturnShown()`
- 2회차 이후: 축소 크기(12×12)로 즉시 표시, 트윈 생략

---

## P2: Glow + 맥동 + Tether (비주얼 연출)

### Task 5: 바닥 아이템 Glow + 파티클 (S1)

**파일:** `game/src/entities/WorldItem.ts` (또는 드롭 아이템 엔티티)

- `GlowFilter(color, outerStrength)` 부착, 색상 = `RARITY_COLOR[rarity]`
- 레어리티별 halo 크기 (§3.11): Normal 8 / Magic 12 / Rare 16 / Legendary 20 / Ancient 24
- 파티클 스폰율 (§3.2): 2/3/4/6/8 per second
- 파티클: 1–3px 사각형, 위로 상승 vy=-(10~25)px/s, 생존 600–1400ms 랜덤

### Task 6: 무기 맥동 컷신 (T2/S4)

**파일:** `game/src/effects/WeaponPulse.ts` (신규)

- **T2 (firstPickupDone===false):** 카메라 줌 1.0→1.5 (0.3초) → 무기 레어리티 색상 pulse ×2 (0.5초) → Tether 발사 트리거 → 줌아웃 (0.3초). 총 1.5초 입력 봉쇄
- **S4 (firstPickupDone===true):** 제자리 맥동 0.4초, 카메라 이동 없음, 입력 봉쇄 없음
- T2 종료 시 `save.markFirstPickupDone()`

### Task 7: Anvil Tether (T3/T4)

**파일:** `game/src/effects/AnvilTether.ts` (신규)

- T2 맥동 정점에서 `firstPickupDone===false` 면 발사
- `Graphics.moveTo/lineTo` + alpha tween + 점선 패턴 `[4, 3]`
- 대상: 현재 씬 내 가장 가까운 Anvil 엔티티 (동적 갱신)
- 앵빌이 시야 밖이면 화면 가장자리로 뻗음
- 발사 0.4초: 실선 밝음 alpha 0.8 → 점선 alpha 0.35로 감쇄
- 점선 잔상: 앵빌 48px 이내 접근 시 0.2초 수렴 후 소멸
- 씬 전환 시 즉시 소멸, 재발사 없음 (1회성 락)

---

## P3: 다이브 연출 단축 + 풀 프리뷰 패널

### Task 8: 진입 횟수 티어별 다이브 연출 (S7)

**파일:** `game/src/effects/MemoryDive.ts`

**지속시간 룩업:**
```typescript
function getDiveDuration(count: number, skipOption: boolean): number {
  if (skipOption) return 100;
  if (count <= 1) return 3000;     // 1회차: 풀
  if (count <= 5) return 800;      // 2–5회차: 단축
  return 300;                       // 6회+: 초단축
}
```

**카운터 증가 시점:** 착지 직전 `save.incrementDive(itemDefId)`. 중간 이탈(다이브 연출 중 창 비활성화 복귀)에서는 증가하지 않음.

**연출 단계:**
- 1회차: 무기 클로즈업 → 리플 디스토션 → 아이리스 와이프 → 낙하 페이드 (기존 FloorCollapse+MemoryDive 풀)
- 2–5회차: 리플 → 아이리스 (클로즈업/낙하 생략)
- 6회+: 아이리스만
- skipOption: 페이드 인/아웃만

### Task 9: DIVE 프리뷰 (T5/S6)

**파일:** `game/src/ui/DivePreview.ts` (신규) 또는 InventoryUI 확장

- 앵빌 모드에서 아이템 선택 + [E] 입력 시
- `firstDiveDone===false`: 중앙 모달 **풀 프리뷰 패널** — 무기 이름 + 레어리티 배지 / "Memory Stratum Lv.1" / "Floors: N" / "Enemies: Lv.A–B" / "Rewards: XP, Innocents, Fragments" / 구분선 / "[E] DIVE  [ESC] BACK". 종료 시 `save.markFirstDiveDone()`
- `firstDiveDone===true`: 대장간 UI 하단 정보에 1줄 요약만 — "DIVE → Mem.Lv.1  Floors:N  Enemies:Lv.A-B   [E]OK [ESC]BACK"

---

## P4: 옵션 (나중)

### Task 10: Settings 토글 추가

**파일:** `game/src/ui/SettingsMenu.ts` (해당 파일 생성되어 있지 않으면 생략하고 플래그만 저장)

- "Always show item lore" (기본 OFF) → `save.settings.alwaysShowLore`
- "Skip dive cinematic" (기본 OFF) → `save.settings.skipDive`

---

## 검증 (커밋 전 체크리스트)

- [ ] 신규 게임 시작 → 첫 Normal Blade 획득 → Lore Popup 표시 → [X] 닫음 → 카메라 줌인 맥동 → 앵빌 방향 Tether 점선 등장
- [ ] 같은 Normal Blade 재획득 (드롭/던전) → Lore Popup 생략, 토스트 1줄만
- [ ] 두 번째 다른 아이템 획득 → Lore Popup 표시(처음 보는 아이템이므로) → 맥동만 (줌/Tether 없음)
- [ ] 첫 앵빌 [E] → 그리드 UI (인벤토리와 동일 레이아웃) → 아이템 선택 + [E] → 풀 프리뷰 패널 → [E] DIVE
- [ ] 두 번째 DIVE → 요약 프리뷰 1줄만
- [ ] 동일 아이템 6번째 DIVE → 0.3초 초단축 연출
- [ ] 다른 새 아이템 첫 DIVE → 풀 시퀀스 3초 (아이템별 카운터)
- [ ] 첫 아이템계 착지 → Return 아이콘 풀사이즈 0.5초 → 축소
- [ ] 두 번째 착지부터 Return 아이콘 축소 크기 즉시
- [ ] 장착 중 아이템을 앵빌에서 선택 → "Unequip first" 토스트
- [ ] 페이지 새로고침 후 재진입 → 모든 플래그/카운터 복원

---

## 레퍼런스 매핑 (빠른 조회)

| 연출 | 코드 | 설계 |
| :--- | :--- | :--- |
| S1 Glow | P2 Task 5 | SacredPickup §3.2 |
| S2 Auto Pickup | 기존 드롭 로직 | §3.3 |
| S3 Lore Popup | P1 Task 3 | §3.4 |
| T2/S4 맥동 | P2 Task 6 | §3.5 |
| T3/T4 Tether | P2 Task 7 | §3.6 |
| S5 [E] 프롬프트 | P0 Task 2 | §3.7 |
| S6 대장간 UI | P0 Task 2 | §3.8.1 |
| T5 풀 프리뷰 | P3 Task 9 | §3.8.2 |
| S6 요약 프리뷰 | P3 Task 9 | §3.8.3 |
| S7 다이브 단축 | P3 Task 8 | §3.9 |
| T6 Return 아이콘 | P1 Task 4 | §3.10 |

**원본 스펙(공식/엣지 케이스/수식):** 반드시 `UI_SacredPickup.md` 를 우선 참조한다. 본 지시서는 해당 문서의 구현 요약이다.
