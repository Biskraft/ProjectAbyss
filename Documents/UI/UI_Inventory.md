# UI_Inventory.md — 인벤토리 UI

## 구현 현황 (Implementation Status)

| 항목 | 상태 |
| :--- | :--- |
| 슬롯 그리드 (5x4, 20슬롯) | 구현 완료 |
| 레어리티 색상 표시 | 구현 완료 |
| 선택 하이라이트 | 구현 완료 |
| 장착 아이템 테두리 (노란색) | 구현 완료 (Rare 충돌 — 흰색으로 교체 예정, §3.2) |
| 아이템 레벨 인디케이터 (좌상단 검정 사각형) | 구현 완료 |
| 아이템계 클리어 배지 (우하단 초록 사각형) | 구현 완료 |
| Dive available 픽토그램 (우상단 파란 포탈) | 구현 완료 |
| Level 2 정보 텍스트 (이름, Lv, ATK, 레어리티, 사이클) | 구현 완료 (단순 3줄 → 확장 Info Box로 확장 예정) |
| 방향키 네비게이션 | 구현 완료 |
| X키로 장착 | 구현 완료 |
| I키로 열기/닫기 | 구현 완료 (Game.ts에서 처리) |
| Anvil 모드 진입 (`openForAnvil`) | 구현 완료 (Sacred Pickup 경로) |
| Level 2 Info Box (우측 확장 정보) | 미구현 — §3.5 |
| Level 3 Detail View (Z 키 전체 상세) | 미구현 — §3.6 |
| Compare Mode (C 키 장착 vs 선택 비교) | 미구현 — §3.7 |
| Innocent 인디케이터 (Level 1 좌하단 점) | 미구현 — §3.9 |
| Innocent 리스트 (Level 3) | 미구현 — §3.9 |
| Memory Strata 진행도 (Level 3) | 미구현 — §3.10 |
| 아이템 버리기 | 미구현 (Phase 2+) |
| 아이템 정렬 | 미구현 (Phase 2+) |

---

## 0. 필수 참고 자료 (Mandatory References)

- Project Vision: `Documents/Terms/Project_Vision_Abyss.md`
- Writing Standards: `Documents/Terms/GDD_Writing_Rules.md`
- **리서치:** `Documents/Research/Inventory_ItemInfo_UI_Research.md` (17개 게임 분석 기반 3단계 계층)
- **연계 UX:** `Documents/UI/UI_SacredPickup.md` (획득→앵빌→다이브 UX, Anvil 모드 그리드 재사용)
- **엔티티 계약:** `Documents/System/System_World_Interactables.md` §3.1 Anvil
- InventoryUI 소스: `game/src/ui/InventoryUI.ts`
- Inventory 로직 소스: `game/src/items/Inventory.ts`
- ItemInstance 스키마: `game/src/items/ItemInstance.ts`

---

## 1. 개요 (Overview)

인벤토리 UI는 플레이어가 보유한 장비 아이템(최대 20개)을 5열 4행 그리드로 표시하고, 방향키와 단축키로 아이템을 선택/장착/비교/상세조회하는 패널이다. 화면 중앙에 반투명 오버레이와 함께 팝업되며 `I`키로 토글한다. **정보 밀도는 3단계 계층(Level 1: 그리드 / Level 2: Info Box / Level 3: Detail View)** 으로 분리되어, 기본 조작은 가볍게 유지하면서 복잡한 Innocent/Memory Strata 정보는 필요할 때만 확장된다.

**Anvil 모드:** 앵빌에서 [E] 입력 시 동일 그리드가 `openForAnvil(onSelect)` 경로로 열린다. 타이틀만 "FORGE — SELECT WEAPON"으로 전환되고 `[E]` 의미가 "장착"이 아닌 "다이브 대상 선택"으로 바뀐다. Sacred Pickup UX의 일부.

---

## 2. 설계 의도 (Design Intent)

- **아이템계 진입의 전초:** 인벤토리는 단순한 장비 교체 화면이 아니라 "어떤 아이템의 기억 속으로 들어갈지" 결정하는 출발점이다. Dive 픽토그램, 클리어 배지, 사이클 카운터는 플레이어가 각 아이템의 탐험 이력을 한눈에 파악하게 한다.
- **3단계 정보 계층 (리서치 §3):** 17개 ARPG/메트로베니아/SRPG/로그라이크 공통 패턴. 그리드는 즉시 인지만, 세부 수치는 선택 시, 풀 상세(Innocent/Strata)는 요청 시. 정보 과부하 방지.
- **레어리티 시각화:** Diablo 스타일 색상 코드. 아이템 가치와 잠재력을 색상만으로 판단 가능.
- **키보드 전용 조작:** 마우스/터치 없이 방향키 + Z/X/C 만으로 완전 조작. 콘솔 감각 유지.
- **Anvil 모드 단일화:** 텍스트 리스트 기반의 구 `drawItemSelectUI`를 폐기하고 동일 그리드로 통합. 플레이어는 인벤토리와 앵빌에서 같은 UI를 본다 — 학습 비용 제로.

---

## 3. 상세 규칙 (Detailed Rules)

### 3.1 패널 레이아웃

인벤토리 패널은 **좌측 그리드 영역 + 우측 Info Box 영역** 2칼럼 구성이다.

| 항목 | 값 |
| :--- | :--- |
| 슬롯 수 | 20 (5열 × 4행) |
| 슬롯 크기 | 20×20px |
| 슬롯 간격 | 2px |
| 패딩 | 8px |
| **그리드 영역 너비 (GRID_W)** | `5 × (20+2) + 2 + 8×2 = 128px` |
| **Info Box 영역 너비 (INFO_W)** | `120px` (구분선 1px + 내부 패딩 4px 포함) |
| **총 패널 너비 (PANEL_W)** | `GRID_W + INFO_W = 248px` |
| 패널 높이 (PANEL_H) | `4 × (20+2) + 2 + 8×2 + 16(헤더) = 114px` (구 138px → Info Box가 세로 확장 없이 흡수) |
| 패널 위치 | 화면 중앙 정렬 (`floor((640-PANEL_W)/2)`, `floor((360-PANEL_H)/2)`) |
| 패널 배경색 | `0x1A1A2E` (alpha 0.95) |
| 패널 테두리색 | `0x4A4A6A` (width 1px) |
| 그리드/Info 구분선 | 수직선 `0x4A4A6A` (width 1px) |
| 오버레이 배경 | `0x000000` (alpha 0.5) |
| 타이틀 텍스트 | 인벤토리 모드: "INVENTORY" / Anvil 모드: "FORGE — SELECT WEAPON" — 8px 흰색, 패널 내 (8, 4) |

**모드별 타이틀:**

| 모드 | 타이틀 | 진입 경로 |
| :--- | :--- | :--- |
| 'inventory' | "INVENTORY" | `I` 키 토글 |
| 'anvil' | "FORGE — SELECT WEAPON" | 앵빌 `[E]` → `InventoryUI.openForAnvil(onSelect)` |

### 3.2 Level 1 — 슬롯 상태별 시각 (그리드 내 즉시 인지)

리서치 §3 Level 1 — 그리드 내 즉시 인지 정보만 렌더링한다.

| 상태 | 배경색 | 테두리 | 내부 아이콘 |
| :--- | :--- | :--- | :--- |
| 빈 슬롯 (기본) | `0x2A2A3E` | 없음 | 없음 |
| 선택됨 | `0x4A4A8A` | 없음 | 내부 아이템 표시 |
| 장착 중 | 해당 상태 배경색 유지 | **흰색 `0xFFFFFF` (1px)** — Rare `0xFFFF00` 충돌 회피 | 내부 아이템 표시 |
| 선택됨 + 장착 중 | `0x4A4A8A` | 흰색 이중(내측 `0xFFFFFF`, 외측 레어리티 색 1px) | 내부 아이템 표시 |
| 아이템 있음 (기본) | `0x2A2A3E` | 없음 | 레어리티 색상 사각형 |

**슬롯 내부 오버레이 (Level 1 배지):**

| 배지 | 위치 | 조건 | 시각 |
| :--- | :--- | :--- | :--- |
| 레어리티 색상 사각형 | `rect(3, 3, 14, 14)` — 중앙 | 아이템 존재 | 중앙 14×14 필 |
| 레벨 인디케이터 | `rect(1, 1, 6, 6)` — 좌상단 | `item.level > 0` | 검정 `0x000000` |
| 클리어 배지 | `rect(15, 15, 4, 4)` — 우하단 | `worldProgress.cleared === true` | 초록 `0x44FF44` |
| Dive 픽토그램 | `(13, 1)` 좌상단에 6×6 — 우상단 | 모든 무기 아이템 | 검정 배경 + 청색 포탈 링 + 흰색 코어 |
| **Innocent 인디케이터** | `(1, 15)` — 좌하단 4×4 | `item.innocents.filter(Boolean).length > 0` | **Subdued 중심** 하양 `0xFFFFFF`, **Wild만 존재** 시 빨강 `0xFF4444` |

**Phase 2 이후 추가 예정:** 중앙 14×14에 무기 종류 실루엣 아이콘(검/도끼/곤봉 등). 현재는 레어리티 솔리드 필만 사용.

### 3.3 레어리티 색상 코드

SSoT는 `Sheets/Content_Rarity.csv` → `rarityConfig.ts`. `RARITY_COLOR` 상수로 접근.

| 레어리티 | 색상 코드 | 색상명 |
| :--- | :--- | :--- |
| normal | `0xFFFFFF` | 흰색 |
| magic | `0x6969FF` | 파란색 |
| rare | `0xFFFF00` | 노란색 |
| legendary | `0xFF8000` | 주황색 |
| ancient | `0x00FF00` | 초록색 |

### 3.4 조작 체계

| 키 | 동작 | 조건 |
| :--- | :--- | :--- |
| `I` | 인벤토리 열기/닫기 토글 | 항상 |
| `← → ↑ ↓` | 슬롯 네비게이션 | 인벤토리 열린 상태 |
| `X` | 선택된 아이템 장착 (inventory 모드) / 다이브 대상 확정 (anvil 모드) | 아이템 선택됨 |
| `Z` | Level 3 Detail View 토글 | 아이템 선택됨 |
| `C` | Compare Mode 토글 | 장착 아이템 존재 + 선택 아이템 있음 |
| `ESC` / `I` | 닫기 | 항상 |

**네비게이션 경계 처리:**
- 왼쪽 끝에서 `←`: 현재 인덱스 유지 (0 이하 불가)
- 오른쪽 끝에서 `→`: `min(count-1, selectedIndex+1)`
- 위쪽: `max(0, selectedIndex - COLS)`
- 아래쪽: `min(count-1, selectedIndex + COLS)`

**열림 동작:** 아이템이 1개 이상이면 자동으로 첫 번째 아이템(인덱스 0) 선택. 비어있으면 selectedIndex = -1.

### 3.5 Level 2 — Info Box (선택 시 우측 확장 정보)

리서치 §3 Level 2. 패널 우측 Info 영역에 고정 위치로 렌더링. 아이템 선택이 변경될 때마다 재계산.

**레이아웃:**
```
+--[ INVENTORY ]--+---[ INFO ]----------+
|  [■] [■] [■] [■] [■] |  Iron Blade      [E]|
|  [■] [■] [■] [■] [■] |  RARE Lv.3  C2   CLR|
|  [■] [■] [■] [■] [■] |  ─────────────────  |
|  [■] [■] [■] [■] [■] |  ATK:45  INT:0      |
|                 |  HP:+10             |
|                 |  ─────────────────  |
|                 |  Innocents: 2/4     |
|                 |  Strata: 1/3 CLR    |
|                 |  ─────────────────  |
|                 |  [Z]Detail [X]Equip |
|                 |  [C]Compare         |
+-----------------+----------------------+
```

**표시 순서 (위 → 아래):**

| # | 항목 | 형식 | 색상 |
| :--- | :--- | :--- | :--- |
| 1 | 아이템명 + 장착 태그 | `"Iron Blade [E]"` (장착 중일 때만 `[E]`) | 레어리티 색 |
| 2 | 레어리티 + 레벨 + 사이클 + 클리어 | `"RARE Lv.3 C2 CLR"` (사이클 0/미클리어 시 생략) | 흰색 `0xCCCCCC` |
| 3 | 구분선 | `—————————` | `0x4A4A6A` |
| 4 | 핵심 스탯 줄 1 | `"ATK:45  INT:0"` | 흰색. Compare Mode일 때 `(+12)` 초록, `(-8)` 빨강 병기 |
| 5 | 핵심 스탯 줄 2 | `"HP:+10"` (보너스 스탯만) | 흰색 / 비교 색 |
| 6 | 구분선 | `—————————` | `0x4A4A6A` |
| 7 | Innocent 요약 | `"Innocents: {subdued+wild}/{slots}"` | 흰색 (Wild만 존재 시 빨강 tint) |
| 8 | Strata 요약 | `"Strata: {cleared}/{total} CLR"` (전체 클리어 시 CLR) | 흰색 / 초록 |
| 9 | 구분선 | `—————————` | `0x4A4A6A` |
| 10 | 조작 힌트 | inventory 모드: `"[Z]Detail [X]Equip"` / anvil 모드: `"[Z]Detail [X]Dive"` | `0xAAAAAA` |
| 11 | 조작 힌트 2 | `"[C]Compare"` (장착 중이면서 선택 아이템 ≠ 장착 아이템일 때만) | `0xAAAAAA` |

**폰트:** 8px 픽셀 폰트. 한 줄 최대 가로 `INFO_W - 패딩8 = 112px`. 이름이 길면 12자 절단 후 `…` 표기.

**빈 슬롯 또는 아이템 미선택 시:**
```
inventory 모드: "{items.length}/20 items"
anvil 모드:    "No items to place"
```

### 3.6 Level 3 — Detail View (Z 키 전체 상세)

리서치 §6.2 Level 3. 인벤토리 위에 전체화면 오버레이로 표시. Disgaea Item Detail 스타일.

**레이아웃:**
```
+============[ IRON BLADE ]============+
|  RARE         Lv.3  Cycle:2  CLR     |
|  Blade (Weapon)                      |
+--------------------------------------+
|  BASE STATS          FINAL STATS     |
|  ATK: 30             ATK: 45         |
|  INT:  0             INT:  0         |
|  HP:   0             HP: +10         |
+--------------------------------------+
|  INNOCENTS (2/4 slots)               |
|  [!] ATK Boost Lv.3    (Subdued)     |
|  [O] HP Boost  Lv.2    (Wild)        |
|  [ ] Empty                           |
|  [ ] Empty                           |
+--------------------------------------+
|  MEMORY STRATA (1/3 cleared)         |
|  [V] Stratum 1 — Item General        |
|  [ ] Stratum 2 — Item King           |
|  [ ] Stratum 3 — Item God            |
+--------------------------------------+
|  "A blade forged in the memory of    |
|   an ancient smith's first creation" |
+--------------------------------------+
|  [X] Close  [C] Compare  [W] Dive    |
+======================================+
```

**오버레이 스펙:**

| 항목 | 값 |
| :--- | :--- |
| 오버레이 배경 | `0x000000` alpha 0.85 (기존 인벤토리 오버레이보다 진함) |
| 패널 너비 | 400px |
| 패널 높이 | 유동 (Innocent 슬롯 수 + Strata 수에 따라 증가), 최소 240px, 최대 320px |
| 패널 배경 | `0x1A1A2E` alpha 0.98 |
| 패널 테두리 | 레어리티 색상 (width 2px) — 레어리티 강조 |
| 헤더 타이틀 | 아이템명, 레어리티 색, 12px |
| 섹션 구분선 | `0x4A4A6A` (width 1px) |
| 닫기 | `[X]` 또는 `[ESC]` 또는 `[Z]` 재입력 — 모두 Level 3 닫기 |

**섹션별 상세:**

1. **헤더 (1줄)** — 아이템명 (레어리티 색, 12px)
2. **메타 정보 (1줄)** — 레어리티명 / `Lv.N` / `Cycle:N` / `CLR` (해당 시)
3. **타입 (1줄)** — 무기/방어구/장신구 종류 (예: "Blade (Weapon)")
4. **Base Stats vs Final Stats (테이블)** — 좌측 Base (Innocent 반영 전), 우측 Final (Innocent 반영 후). 차이가 있는 줄은 우측에 하이라이트 `+N`
5. **Innocents (리스트)** — §3.9 형식
6. **Memory Strata (리스트)** — §3.10 형식
7. **Flavor Text (이탤릭 2줄)** — `item.def.flavor` 영문 로어. `0xAAAAAA`. **주의:** `UI_SacredPickup.md` §3.4 의 Lore Popup에 표시되는 로어와 동일 소스(`item.def.lore`). 본 섹션은 재열람용이므로 반복 노출 제한 없음.
8. **조작 힌트 (하단)** — `[X] Close` / `[C] Compare` (장착 중일 때) / `[W] Dive` (anvil 모드일 때)

### 3.7 Compare Mode (C 키 토글)

리서치 §6.3. 장착 아이템과 선택 아이템을 나란히 병렬 표시. Diablo 3/4 하이브리드.

**활성 조건:**
- `inventory.equipped !== null`
- `selectedItem !== null`
- `selectedItem.uid !== inventory.equipped.uid` (동일 아이템 비교 무의미)

**레이아웃 (Level 2 Info Box 확장):**
```
+---[ EQUIPPED ]---+---[ SELECTED ]---+
|  Steel Blade [E] |  Iron Blade      |
|  LEGENDARY       |  RARE            |
|  ATK: 78         |  ATK: 45 (-33)   |
|  INT:  5         |  INT:  0 (-5)    |
|  HP: +25         |  HP: +10 (-15)   |
|  Innocents: 4/6  |  Innocents: 2/4  |
|  Strata: 3/4     |  Strata: 1/3     |
+------------------+------------------+
```

**시각 규칙:**

| 차이 | 표시 |
| :--- | :--- |
| 상승 | `(+12)` 초록 `0x44FF44` |
| 하락 | `(-33)` 빨강 `0xFF4444` |
| 동일 | 괄호 생략 |

**활성화 시 레이아웃 변화:** Info Box가 Compare 뷰로 교체된다. 총 패널 너비는 동일 (248px). 그리드 영역은 유지되고 우측만 전환.

**비활성 조건 자동 해제:** 장착 해제 / 아이템 버리기 / 선택이 장착 아이템으로 이동 시 자동으로 Compare Mode 해제.

### 3.8 Anvil 모드 차이점

인벤토리와 공통 그리드를 사용하지만 의미가 다르다.

| 항목 | inventory 모드 | anvil 모드 |
| :--- | :--- | :--- |
| 타이틀 | "INVENTORY" | "FORGE — SELECT WEAPON" |
| `X` 키 | 선택 아이템 **장착** (equip) | 선택 아이템을 **다이브 대상으로 확정** (`onSelect(item)`) |
| Info Box 조작 힌트 | `[Z]Detail [X]Equip` | `[Z]Detail [X]Dive` |
| 장착 중 아이템 선택 | 재장착 (무해) | **차단** — "Unequip first" 토스트 (System_ItemWorld_Core §2.1 준수) |
| Compare Mode | 일반 동작 | 일반 동작 (참고 목적으로 사용 가능) |
| 닫기 | 인벤토리 토글 | ESC 또는 선택 완료 시 자동 닫힘 + Sacred Pickup T5/S6 프리뷰로 이행 |
| Level 3 Detail | 일반 | `[W] Dive` 힌트 추가 — Detail View에서 직접 다이브 확정 가능 |

### 3.9 Innocent 표시 (3단계)

ECHORIS의 Innocent = 아이템에 거주하며 보너스를 부여하는 존재. 리서치 §6.4 권장안: Disgaea 리스트 + PoE 슬롯 시각화 혼합.

**Level 1 (그리드):** 좌하단 4×4 점. `item.innocents.filter(Boolean).length > 0` 일 때 표시. Subdued가 1개 이상이면 흰색 `0xFFFFFF`, Wild만 존재 시 빨강 `0xFF4444`.

**Level 2 (Info Box):** `"Innocents: {채워진슬롯}/{전체슬롯}"` 텍스트 요약. Wild 수는 Level 2에서 숨김 (Level 3에서만 상세).

**Level 3 (Detail View):** 슬롯별 리스트. 전체 슬롯 수만큼 라인 표시 (빈 슬롯 포함).

| 상태 | 심볼 | 색상 | 의미 |
| :--- | :--- | :--- | :--- |
| Wild | `[!]` | `0xFF4444` 빨강 | 복종 전. 보너스 비활성 |
| Subdued | `[O]` | `0x44FF44` 초록 | 복종 완료. 보너스 활성 |
| Empty | `[ ]` | `0x666666` 회색 | 빈 슬롯 |

**라인 형식:** `"[!] ATK Boost Lv.3    (Wild)"` — 심볼 / 이름 / 레벨 / 상태. Empty는 `"[ ] Empty"`.

### 3.10 Memory Strata 표시 (3단계)

리서치 §6.5. 리서치의 "Item World 상태 표시".

**Level 1 (그리드):** 우하단 4×4 초록 배지 (`worldProgress.cleared === true`, 전체 지층 클리어 시).

**Level 2 (Info Box):** `"Strata: {cleared}/{total} CLR"` — 예: `"Strata: 1/3"` 또는 `"Strata: 3/3 CLR"` (전체 완료 시).

**Level 3 (Detail View):** 지층별 리스트. 총 지층 수 = 레어리티에 따라 다름 (Normal: 2 / Magic: 3 / Rare: 3 / Legendary: 4 / Ancient: 4+심연).

| 상태 | 심볼 | 색상 | 예시 라인 |
| :--- | :--- | :--- | :--- |
| Cleared | `[V]` | 초록 `0x44FF44` | `"[V] Stratum 1 — Item General"` |
| Current | `[>]` | 노랑 `0xFFFF44` | `"[>] Stratum 2 — Item King"` |
| Locked | `[ ]` | 회색 `0x666666` | `"[ ] Stratum 3 — Item God"` |

**보스 타입:** Item General / Item King / Item God / Item Great God — 아이템계 심볼 계위.

### 3.11 Inventory 클래스 (게임 로직)

UI와 분리된 순수 로직 계층.

| 메서드 | 동작 |
| :--- | :--- |
| `add(item)` | 슬롯이 가득 차면 false 반환, 아니면 items 배열에 추가 후 true |
| `remove(uid)` | uid로 아이템 제거. 장착 중이면 equipped = null |
| `equip(uid)` | uid로 아이템 찾아 equipped로 지정. 존재하지 않으면 무시 |
| `unequip()` | equipped = null |
| `getWeaponAtk()` | equipped가 있으면 finalAtk 반환, 없으면 BARE_HAND_ATK 반환 |
| `getById(uid)` | uid로 아이템 조회 |
| `isFull` | `items.length >= 20` |

---

## 4. 공식 (Formulas)

### Final Stat 계산 (Level 3 Detail View용)

```
finalATK = baseATK * rarityMultiplier[rarity] * (1 + Σ innocentBonus.atk)
finalINT = baseINT * rarityMultiplier[rarity] * (1 + Σ innocentBonus.int)
finalHP  = 0 + Σ innocentBonus.hp  (HP는 보너스 한정)
```

`rarityMultiplier`: Normal 1.0 / Magic 1.3 / Rare 1.7 / Legendary 2.2 / Ancient 3.0 (SSoT `Content_Rarity.csv`).

Innocent 보너스는 **Subdued** 상태만 반영. Wild는 계산에 포함되지 않음.

### Compare Mode 차이 계산

```
delta = selectedFinal[stat] - equippedFinal[stat]
표시: delta > 0 ? "(+N)" 초록 : delta < 0 ? "(-N)" 빨강 : 생략
```

---

## 5. 엣지 케이스 (Edge Cases)

| 상황 | 처리 방식 |
| :--- | :--- |
| 인벤토리 가득 찬 상태에서 아이템 드롭 | `Inventory.isFull` 확인 후 add() 거부. 씬에서 "INVENTORY FULL" 토스트 3초 |
| 아이템 0개인 상태에서 방향키 | count === 0이면 early return |
| 선택 인덱스 -1 상태에서 X/Z/C | 아무 동작 없음 (item이 falsy) |
| 같은 아이템을 두 번 장착 시도 | equipped = 해당 uid 그대로. 무해 |
| 장착 중 아이템을 remove() | equipped = null 자동 해제 |
| rare 아이템이 장착 중일 때 테두리 충돌 | 장착 테두리를 **흰색 `0xFFFFFF`** 로 변경하여 해결 (§3.2) |
| 20개 중 19번째 아이템 선택 후 ↓ 이동 | `min(19, 23) = 19`. 마지막 아이템 유지 |
| 아이템이 5개 미만일 때 ↓ 이동 | 5번째 행에 아이템 없으므로 count-1 한계에서 멈춤 |
| Anvil 모드에서 장착 중 아이템 선택 + X | "Unequip first" 토스트, 다이브 미진행 |
| Compare Mode 중 장착 해제 | Compare Mode 자동 비활성. Info Box 일반 뷰로 복귀 |
| Level 3 Detail View 중 아이템 버리기 | Detail View 자동 닫힘. Level 2 비선택 상태로 복귀 |
| Level 3 중 인벤토리 닫기(I/ESC) | Level 3 먼저 닫힘, 이어서 인벤토리 닫힘 (계단식 닫기) |
| Innocent 슬롯 수가 0인 아이템 (Broken Blade 등 튜토리얼) | Level 1 인디케이터 미표시. Level 2 `"Innocents: —"`, Level 3 섹션 생략 |
| Strata 수가 0인 아이템 (Broken Blade) | Level 1 배지 미표시. Level 2 `"Strata: —"`, Level 3 섹션 생략. Dive 픽토그램도 숨김 |
| Ancient 심연 지층 (4+심연) | Level 3에서 Stratum 5 라인을 `"[?] The Abyss"` 로 표시 — 특수 계위 |
| Flavor text가 공란인 아이템 | Level 3 Flavor Text 섹션 생략 |

---

## 6. 검증 체크리스트 (Acceptance Criteria)

### 기능 검증

**Level 1 (그리드):**
- [ ] I키를 누르면 인벤토리가 열리고 다시 누르면 닫힘
- [ ] 아이템이 있을 때 열리면 첫 번째 슬롯이 자동 선택됨
- [ ] 방향키로 슬롯 이동, 경계에서 정지
- [ ] 레어리티별 색상이 SSoT와 일치함
- [ ] 레벨이 1 이상이면 좌상단 검정 인디케이터
- [ ] 클리어된 아이템은 우하단 초록 배지
- [ ] Dive 픽토그램이 모든 무기에 표시됨
- [ ] Innocent 1개 이상 아이템은 좌하단 점 표시 (Subdued 흰색 / Wild 빨강)
- [ ] 장착 아이템 테두리는 **흰색**으로 표시 (Rare 노랑과 구분)

**Level 2 (Info Box):**
- [ ] 아이템 선택 시 우측 Info Box에 이름/레어리티/스탯/Innocent 요약/Strata 요약/조작 힌트 표시
- [ ] 장착 중이면 `[E]` 태그 표시
- [ ] 사이클이 0이면 `C0` 생략, 1 이상이면 `C{n}` 표시
- [ ] Anvil 모드 조작 힌트는 `[X]Dive`로 변경

**Level 3 (Detail View):**
- [ ] Z 키로 Detail View 오버레이 열림/닫힘
- [ ] Base Stats vs Final Stats 차이가 우측에 표시됨
- [ ] Innocent 리스트가 상태별 심볼/색상으로 구분됨 ([!] Wild / [O] Subdued / [ ] Empty)
- [ ] Memory Strata 진행도 리스트가 클리어 상태별로 표시됨
- [ ] Flavor Text가 이탤릭/별도 색상으로 하단에 표시됨
- [ ] 패널 테두리가 레어리티 색상으로 그려짐
- [ ] X/ESC/Z 재입력 중 어느 것으로도 닫힘

**Compare Mode (C 키):**
- [ ] 장착 아이템 존재 + 선택 아이템 ≠ 장착 아이템일 때만 Compare 활성화
- [ ] 상승 스탯은 초록 `(+N)`, 하락은 빨강 `(-N)`
- [ ] 장착 해제 시 Compare Mode 자동 해제

**Anvil 모드:**
- [ ] 앵빌 [E] → 동일 그리드가 "FORGE — SELECT WEAPON" 타이틀로 열림
- [ ] X 키 의미가 "다이브 확정"으로 변경됨
- [ ] 장착 중 아이템 선택 + X → "Unequip first" 토스트

### 경험 검증

- [ ] 레어리티 색상만으로 강력한 아이템(Legendary/Ancient)을 즉시 식별
- [ ] 그리드 배지(Dive 포탈/클리어/Innocent)만 보고도 아이템의 "탐험 가능성"과 "내부 존재"를 파악
- [ ] Level 2 Info Box만으로 장착 전/후 판단에 필요한 정보가 충족됨
- [ ] Compare Mode로 교체 여부를 3초 이내에 결정 가능
- [ ] Level 3 Detail View에서 Innocent 복종 상태와 Strata 진행도를 확인 가능
- [ ] 인벤토리와 앵빌이 동일 UI이므로 학습 비용이 없음

---

## 7. 구현 우선순위

리서치 §6.6 준수. Sacred Pickup Task 지시서와 병렬 진행 가능.

| 순위 | 항목 | 근거 |
| :--- | :--- | :--- |
| **P0** | 장착 테두리 색상 변경 (노랑 → 흰색) | Rare 충돌 해결. 1줄 수정 |
| **P0** | Anvil 모드 경로 단일화 (`InventoryUI.openForAnvil` 사용, `drawItemSelectUI` 폐기) | Sacred Pickup 전제조건 |
| **P1** | Level 2 Info Box 확장 (우측 패널, 다줄 정보) | 현재 가장 부족한 부분 |
| **P1** | Level 1 Innocent 인디케이터 (좌하단 점) | 그리드 즉시 식별 |
| **P2** | Compare Mode (C 키) | 교체 의사결정의 핵심 |
| **P2** | Level 3 Detail View (Z 키) | Innocent 관리 + Strata 확인 |
| **P3** | Innocent 리스트 상태 심볼 (Level 3) | Level 3에 종속 |
| **P3** | Memory Strata 진행도 리스트 (Level 3) | Level 3에 종속 |
| **P4** | 무기 종류 아이콘 (Level 1 중앙) | 픽셀아트 아이콘 제작 선행 필요 |
| **P4** | 아이템 버리기 / 정렬 | Phase 2 이후 |

---

## 8. 변경 이력

| 날짜 | 변경 | 근거 |
| :--- | :--- | :--- |
| 2026-04-19 | 3단계 정보 계층(Level 1/2/3) 도입, Compare Mode, Detail View, Innocent/Strata 표시 추가 | `Documents/Research/Inventory_ItemInfo_UI_Research.md` (17개 게임 분석) |
| 2026-04-19 | Anvil 모드 통합 명시 + 장착 테두리 색 Rare 충돌 해결 | `UI_SacredPickup.md` 경로 단일화 |
| (기록 없음) | 초기 5×4 그리드 및 단순 3줄 정보 텍스트 | 초기 구현 |

---

*소스 참조: `game/src/ui/InventoryUI.ts`, `game/src/items/Inventory.ts`, `game/src/items/ItemInstance.ts`*
*리서치 참조: `Documents/Research/Inventory_ItemInfo_UI_Research.md`*
