# Inventory 3-Tier UI 구현 작업 지시서

> **작성일:** 2026-04-19
> **대상:** AI Programmer Agent
> **설계 문서:** `Documents/UI/UI_Inventory.md` (마스터 스펙)
> **연계 문서:** `Documents/UI/UI_SacredPickup.md`, `Documents/Plan/Task_SacredPickup_Implementation.md`, `Documents/System/System_World_Interactables.md` §3.1 Anvil
> **리서치 근거:** `Documents/Research/Inventory_ItemInfo_UI_Research.md` (17개 게임 분석)
> **기술 스택:** PixiJS v8, TypeScript, 640×360 베이스

---

## 개요

기존 인벤토리 UI(128×138 단일 패널 + 3줄 텍스트)를 **3단계 정보 계층**으로 확장한다. Sacred Pickup UX의 앵빌 모드가 동일 그리드를 재사용하므로 Task_SacredPickup_Implementation.md P0 Task 2 와 병렬/선행 진행한다.

**핵심 원칙:** Level 1 (그리드 즉시 인지) / Level 2 (우측 Info Box 선택 시) / Level 3 (전체화면 Detail View 요청 시). 조작은 가볍게, 정보는 깊게.

---

## P0: 즉시 수정 (Sacred Pickup 전제조건)

### Task 1: 장착 테두리 색상 변경 (Rare 충돌 해결)

**파일:** `game/src/ui/InventoryUI.ts`

- 장착 중 슬롯 테두리 색상 상수를 **`0xFFFFFF` (흰색, 1px)** 로 변경
- 기존 노란색(`0xFFFF00`)은 Rare 레어리티 색상과 완전 충돌 — 선택 + 장착 + Rare 조합에서 식별 불가
- 선택됨 + 장착 중 조합 (§3.2): 내측 흰색 1px + 외측 레어리티 색 1px 이중 테두리로 그림

### Task 2: 패널 폭 확장 (248px)

**파일:** `game/src/ui/InventoryUI.ts`

- 상수 교체:
  ```typescript
  const GRID_W = COLS * (SLOT_SIZE + SLOT_GAP) + SLOT_GAP + PADDING * 2; // 128
  const INFO_W = 120;
  const PANEL_W = GRID_W + INFO_W; // 248
  const PANEL_H = ROWS * (SLOT_SIZE + SLOT_GAP) + SLOT_GAP + PADDING * 2 + 16; // 헤더 16
  ```
- 패널 중앙 정렬 재계산: `floor((GAME_WIDTH - PANEL_W)/2)`, `floor((GAME_HEIGHT - PANEL_H)/2)`
- 그리드와 Info 영역 사이 수직 구분선 `0x4A4A6A` (width 1px) 추가

### Task 3: Anvil 경로 단일화 검증

**파일:** `game/src/scenes/LdtkWorldScene.ts`

- `InventoryUI.openForAnvil(onSelect)` 가 이미 존재하면 그대로 유지
- 구 `drawItemSelectUI` 경로가 남아있으면 Task_SacredPickup P0 Task 2 참조하여 제거
- Anvil 모드에서 장착 중 아이템 선택 + 확정 시 `"Unequip first"` 토스트 유지

---

## P1: Level 2 Info Box + Level 1 Memory Shard 인디케이터

### Task 4: Level 2 Info Box 렌더링 (다줄 정보)

**파일:** `game/src/ui/InventoryUI.ts`

**배치:** 그리드 우측 (x = GRID_W, y = 16 헤더 아래)

**표시 순서 (스펙 §3.5):**
```
Line 1: {itemName} [E]           (장착 시)  — 레어리티 색 8px
Line 2: {RARITY} Lv.{n} C{cycle} CLR        — 0xCCCCCC 8px
Line 3: ─────────
Line 4: ATK:{final}  INT:{final}
Line 5: HP:+{hpBonus}                       (hpBonus > 0 일 때만)
Line 6: ─────────
Line 7: Memory Shards: {filled}/{slots}
Line 8: Strata: {cleared}/{total} CLR
Line 9: ─────────
Line 10: [Z]Detail [X]{Equip|Dive}
Line 11: [C]Compare                         (조건부)
```

**구현 포인트:**
- 폰트: PIXEL_FONT 8px
- 가로 최대: `INFO_W - 8(패딩) = 112px` — 이름 12자 초과 시 `…` 절단
- 선택 인덱스 변경마다 `updateInfoBox()` 호출
- 빈 인벤토리: `"{n}/20 items"` (inventory 모드) 또는 `"No items to place"` (anvil 모드)
- Cycle 0 / 미클리어는 해당 필드 생략
- 조작 힌트에서 anvil 모드면 `[X]Equip` → `[X]Dive` 로 치환

### Task 5: Level 1 Memory Shard 인디케이터 (좌하단 점)

**파일:** `game/src/ui/InventoryUI.ts` (slot drawing loop 내부)

**스펙 §3.2 / §3.9:**
- 조건: `item.memory shards && item.memory shards.filter(Boolean).length > 0`
- 위치: 슬롯 내부 `(1, 15)` 에서 4×4 사각형
- 색상:
  - Subdued 1개 이상 → 흰색 `0xFFFFFF`
  - Wild만 존재 → 빨강 `0xFF4444`
- **전제:** `ItemInstance` 에 `memory shards: Memory ShardSlot[]` 가 아직 없으면 본 Task는 P1 후반으로 미룬다. 스키마 확장은 Task 6 선행.

### Task 6: ItemInstance 스키마 확장 (Memory Shard + Strata)

**파일:** `game/src/items/ItemInstance.ts`

```typescript
export type Memory ShardState = 'empty' | 'wild' | 'subdued';

export interface Memory ShardSlot {
  state: Memory ShardState;
  defId?: string;          // 'atk_boost', 'hp_boost', …
  level?: number;           // 1~9
  bonus?: { atk?: number; int?: number; hp?: number };
}

// ItemInstance 확장:
memory shards: Memory ShardSlot[];       // 길이 = rarity별 슬롯 수 (2/3/4/6/8)
strataProgress: {
  total: number;                 // 총 지층 수 (2/3/3/4/4)
  cleared: number;               // 클리어한 지층 수
  current: number;               // 현재 도전 중 지층 (0-indexed)
  hasAbyss?: boolean;            // Ancient 전용
};
```

**초기값:** 아이템 생성 시 `memory shards = Array(slots).fill({state:'empty'})`, `strataProgress = {total, cleared:0, current:0}`.

**기존 `worldProgress.cleared: boolean` 호환:** `cleared === total` 일 때 true로 derive — 기존 코드는 그대로 유지.

---

## P2: Compare Mode + Detail View

### Task 7: Compare Mode (C 키)

**파일:** `game/src/ui/InventoryUI.ts` (Info Box 렌더 경로 분기)

**활성 조건 (스펙 §3.7):**
- `inventory.equipped !== null`
- `selectedItem !== null`
- `selectedItem.uid !== inventory.equipped.uid`

**입력:** `C` 키 입력 시 `this.compareMode = !this.compareMode`. 조건 불충족이면 토글 무시.

**렌더링:**
- Info Box 영역(120px)을 60/60 2분할하여 EQUIPPED / SELECTED 병렬 표시
- 스탯 라인에 delta 계산: `(+N)` 초록 `0x44FF44`, `(-N)` 빨강 `0xFF4444`, 동일 시 괄호 생략
- 장착 해제 / 아이템 버리기 / 선택 === 장착 이동 시 자동 비활성

### Task 8: Level 3 Detail View (Z 키)

**신규 파일:** `game/src/ui/ItemDetailView.ts`

**트리거:** 인벤토리 열린 상태에서 아이템 선택 + `Z` 키

**레이아웃 (스펙 §3.6):**
- 오버레이: `0x000000` alpha 0.85 (전체 화면)
- 패널: 400×(240~320 유동) 중앙, 배경 `0x1A1A2E` alpha 0.98, 테두리 = **레어리티 색 2px**
- 섹션 (위→아래):
  1. 헤더 — 아이템명 12px 레어리티 색
  2. 메타 — `{RARITY} Lv.{n} Cycle:{c} CLR`
  3. 타입 — `"{ItemType} (Weapon)"`
  4. Base Stats vs Final Stats 2열 테이블 (차이 우측 하이라이트)
  5. Memory Shards 리스트 — 전체 슬롯 라인별 표시 (§3.9)
  6. Memory Strata 리스트 — 지층별 (§3.10)
  7. Flavor Text — 이탤릭 `0xAAAAAA` 2줄 (`item.def.flavor`)
  8. 조작 힌트 — `[X] Close  [C] Compare  [W] Dive` (조건부)

**닫기:** `X` / `ESC` / `Z` 재입력 모두 닫힘. 인벤토리는 유지.

**계단식 닫기:** Level 3 열린 상태에서 `I` 또는 `ESC` 입력 시 Level 3 먼저 닫힘. 한 번 더 눌러야 인벤토리 닫힘.

---

## P3: Memory Shard/Strata 상태 리스트 (Level 3 종속)

### Task 9: Memory Shard 리스트 렌더링

**파일:** `game/src/ui/ItemDetailView.ts`

**라인 형식 (§3.9):**
```
[!] ATK Boost Lv.3    (Wild)        — 빨강 0xFF4444
[O] HP Boost  Lv.2    (Subdued)     — 초록 0x44FF44
[ ] Empty                            — 회색 0x666666
```

- 전체 슬롯 수만큼 라인 생성 (빈 슬롯 포함)
- Memory Shard 슬롯 수가 0인 아이템 (Broken Blade 등 튜토리얼 특례)은 섹션 전체 생략

### Task 10: Memory Strata 리스트 렌더링

**파일:** `game/src/ui/ItemDetailView.ts`

**라인 형식 (§3.10):**
```
[V] Stratum 1 — Item General        — 초록 0x44FF44
[>] Stratum 2 — Item King           — 노랑 0xFFFF44
[ ] Stratum 3 — Item God             — 회색 0x666666
```

**보스 이름 매핑:**
```typescript
const STRATUM_BOSS = ['Item General', 'Item King', 'Item God', 'Item Great God'];
```

- Ancient 심연: `total === 4 && hasAbyss` 시 Stratum 5 라인을 `"[?] The Abyss"` 로 추가
- Strata 수가 0 (Broken Blade 특례)은 섹션 및 Dive 픽토그램 모두 숨김

---

## P4: Phase 2+ (지연 가능)

### Task 11: 무기 종류 아이콘 (Level 1 중앙)

- 픽셀아트 아이콘 16×16 (검/도끼/곤봉/창/단검/완드/샷건 등) 에셋 제작 필요
- `Task_Art_ItemIcons_B1_Swords.md` 와 병합 고려
- 현재는 레어리티 솔리드 필만 유지

### Task 12: 아이템 버리기 / 정렬

- Phase 2 이후. 본 지시서 범위 외.

---

## 검증 (커밋 전 체크리스트)

### 기능
- [ ] 패널 248×114 중앙 표시, 그리드/Info 구분선 렌더
- [ ] 장착 아이템 테두리 **흰색** 확인 (Rare 아이템 장착 시 구분 가능)
- [ ] Level 2 Info Box 11줄 레이아웃 — 선택 변경마다 즉시 갱신
- [ ] Cycle 0 / 미클리어 시 해당 필드 생략
- [ ] Anvil 모드 진입 시 타이틀 `"FORGE — SELECT WEAPON"` / `[X]Dive` 힌트
- [ ] 장착 중 아이템을 앵빌에서 선택 + X → `"Unequip first"` 토스트, 다이브 미진행
- [ ] Memory Shard 1개 이상 아이템은 Level 1 좌하단 점 (Subdued 흰 / Wild만 빨강)
- [ ] C 키 → Compare Mode 진입 → 스탯 델타 초록/빨강 병기
- [ ] Z 키 → Level 3 Detail View 오버레이
- [ ] Detail View 테두리가 레어리티 색 2px
- [ ] Memory Shard 리스트 `[!] [O] [ ]` 심볼 및 색상 구분
- [ ] Strata 리스트 `[V] [>] [ ]` 심볼 및 보스 이름
- [ ] Flavor Text 이탤릭 2줄
- [ ] 계단식 닫기: Level 3 열림 상태에서 I/ESC → Level 3만 먼저 닫힘
- [ ] 인벤토리 가득 찬 상태 드롭 → `"INVENTORY FULL"` 토스트

### 경험
- [ ] 레어리티 색상만으로 강력 아이템 즉시 식별
- [ ] Level 1 배지만 보고 Dive 가능성 + Memory Shard 유무 + 클리어 여부 파악
- [ ] Level 2 Info Box 만으로 장착 결정 가능
- [ ] Compare Mode 로 교체 여부 3초 이내 결정
- [ ] 인벤토리와 앵빌이 동일 UI — 학습 비용 없음

---

## 레퍼런스 매핑 (빠른 조회)

| 항목 | Task | 설계 |
| :--- | :--- | :--- |
| 장착 테두리 색 수정 | P0 Task 1 | UI_Inventory §3.2 |
| 패널 248px 확장 | P0 Task 2 | §3.1 |
| Anvil 경로 단일화 | P0 Task 3 | §3.8 / SacredPickup §3.8.1 |
| Level 2 Info Box | P1 Task 4 | §3.5 |
| Level 1 Memory Shard 점 | P1 Task 5 | §3.2 / §3.9 |
| ItemInstance 스키마 | P1 Task 6 | §3.11 / §4 |
| Compare Mode | P2 Task 7 | §3.7 |
| Level 3 Detail View | P2 Task 8 | §3.6 |
| Memory Shard 리스트 | P3 Task 9 | §3.9 |
| Strata 리스트 | P3 Task 10 | §3.10 |

**원본 스펙(공식/엣지 케이스/수식):** 반드시 `UI_Inventory.md` 를 우선 참조한다. 본 지시서는 해당 문서의 구현 요약이다.

**병렬 진행:** Task_SacredPickup_Implementation.md 의 P0 Task 2 (대장간 UI 단일화) 는 본 지시서 P0 Task 3 과 동일 작업이다. 둘 중 한 쪽 완료 시 다른 쪽 체크아웃.
