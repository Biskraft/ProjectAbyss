# UI_Inventory.md — 인벤토리 UI

## 구현 현황 (Implementation Status)

| 항목 | 상태 |
| :--- | :--- |
| 아이템 그리드 (8×7 표시, 최대 120개, 스크롤) | 미구현 (리스트 → 그리드 재설계) |
| 레어리티 색상 표시 | 구현 완료 |
| 선택 하이라이트 | 구현 완료 |
| 장착 아이템 테두리 (노란색) | 구현 완료 (Rare 충돌 — 흰색으로 교체 예정, §3.2) |
| 아이템 레벨 인디케이터 (좌상단 검정 사각형) | 구현 완료 |
| 아이템계 클리어 배지 (우하단 초록 사각형) | 구현 완료 |
| Dive available 픽토그램 (우상단 파란 포탈) | 구현 완료 |
| Level 2 정보 텍스트 (이름, Lv, ATK, 레어리티, 사이클) | 구현 완료 (단순 3줄 → 확장 Info Box로 확장 예정) |
| 방향키 네비게이션 (↑↓←→) | 미구현 (←→ 추가 필요) |
| X키로 장착 | 구현 완료 |
| I키로 열기/닫기 | 구현 완료 (Game.ts에서 처리) |
| Anvil 모드 진입 (`openForAnvil`) | 구현 완료 (Sacred Pickup 경로) |
| Level 2 Info Box (우측 확장 정보) | 미구현 — §3.5 |
| Level 3 Detail View (Z 키 전체 상세) | 미구현 — §3.6 |
| Compare Mode (C 키 장착 vs 선택 비교) | 미구현 — §3.7 |
| **Stratum Minimap Preview (Anvil 모드 우측 패널)** | **미구현 — §3.8** |
| Memory Shard 인디케이터 (Level 1 좌하단 점) | 미구현 — §3.9 |
| Memory Shard 리스트 (Level 3) | 미구현 — §3.9 |
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

인벤토리 UI는 플레이어가 보유한 장비 아이템(최대 120개)을 **3칼럼 구조** (좌: 6열 그리드 / 중: 아이템 정보 / 우: 캐릭터 스탯)로 표시하고, 방향키와 단축키로 아이템을 선택/장착/비교/상세조회하는 패널이다. 화면 중앙에 반투명 오버레이와 함께 팝업되며 `I`키로 토글한다. **정보 밀도는 3단계 계층(Level 1: 그리드 / Level 2: 중·우 패널 / Level 3: Detail View)** 으로 분리되어, 기본 조작은 가볍게 유지하면서 복잡한 Memory Shard/Memory Strata 정보는 필요할 때만 확장된다.

**Anvil 모드:** 앵빌에서 [E] 입력 시 동일 그리드가 `openForAnvil(onSelect)` 경로로 열린다. 타이틀만 "FORGE — SELECT WEAPON"으로 전환되고 `[E]` 의미가 "장착"이 아닌 "다이브 대상 선택"으로 바뀐다. Sacred Pickup UX의 일부.

---

## 2. 설계 의도 (Design Intent)

- **아이템계 진입의 전초:** 인벤토리는 단순한 장비 교체 화면이 아니라 "어떤 아이템의 기억 속으로 들어갈지" 결정하는 출발점이다. Dive 픽토그램, 클리어 배지, 사이클 카운터는 플레이어가 각 아이템의 탐험 이력을 한눈에 파악하게 한다.
- **3단계 정보 계층 (리서치 §3):** 17개 ARPG/메트로베니아/SRPG/로그라이크 공통 패턴. 그리드는 즉시 인지만, 세부 수치는 선택 시, 풀 상세(Memory Shard/Strata)는 요청 시. 정보 과부하 방지.
- **레어리티 시각화:** Diablo 스타일 색상 코드. 아이템 가치와 잠재력을 색상만으로 판단 가능.
- **키보드 전용 조작:** 마우스/터치 없이 방향키 + Z/X/C 만으로 완전 조작. 콘솔 감각 유지.
- **Anvil 모드 단일화:** 텍스트 리스트 기반의 구 `drawItemSelectUI`를 폐기하고 동일 그리드로 통합. 플레이어는 인벤토리와 앵빌에서 같은 UI를 본다 — 학습 비용 제로.

---

## 3. 상세 규칙 (Detailed Rules)

### 3.1 패널 레이아웃

인벤토리 패널은 **그리드(좌) + 아이템 정보(중) + 캐릭터 스탯(우)** 3칼럼 구성이다. Elden Ring Equipment Screen 참조.

```
←────────────────── 640px ──────────────────→
← 45px → ←──────── 550px ────────────→ ← 45px →

+═══════[ INVENTORY ]════════════════════════════+
│                                                 │
│ ┌─[GRID]──┐ │ ┌─[ITEM INFO]──┐ │ ┌─[STATUS]─┐ │
│ │6×7 그리드│ │ │ 아이템 상세  │ │ │캐릭터 스탯│ │
│ │178px    │ │ │ 196px       │ │ │ 148px    │ │
│ └─────────┘ │ └─────────────┘ │ └──────────┘ │
│  [탭: ALL WPN ARM ACC]                          │
│                                                 │
│ [↑↓←→] Navigate  [X] Equip  [Z] Detail  [I] Close│
+═════════════════════════════════════════════════+
```

**패널 치수:**

| 항목 | 값 |
| :--- | :--- |
| **셀 크기 (CELL_W / CELL_H)** | `28×28px` |
| **셀 간격 (CELL_GAP)** | `2px` |
| **열 수 (GRID_COLS)** | `6` |
| **표시 행 수 (GRID_ROWS_VISIBLE)** | `7` (스크롤로 추가 접근) |
| **그리드 너비 (GRID_W)** | `6×28 + 5×2 = 178px` |
| **그리드 높이 (visible)** | `7×28 + 6×2 = 208px` |
| **아이템 정보 너비 (INFO_W)** | `196px` |
| **캐릭터 스탯 너비 (STATUS_W)** | `148px` |
| 칼럼 구분선 | `8px` (1px 수직선 포함) × 2개 |
| **총 패널 너비 (PANEL_W)** | `178 + 8 + 196 + 8 + 148 = 538px` |
| 외부 패딩 | 좌우 각 `6px` (= 550px 외형) |
| 최대 아이템 수 | `120개` (`6열 × 20행`, 스크롤 지원) |
| 필터 탭 높이 | `16px` |
| 헤더 높이 | `16px` |
| 상하 패딩 | 각 `6px` |
| **패널 높이 (PANEL_H)** | `16(헤더) + 4 + 16(탭) + 4 + 208(그리드) + 6 = 254px` |
| 패널 위치 | 화면 중앙 정렬 (`floor((640−550)/2)=45px` 좌우, `floor((360−254)/2)=53px` 상하) |
| 패널 배경색 | `0x1A1A2E` (alpha 0.95) |
| 패널 테두리색 | `0x4A4A6A` (width 1px) |
| 칼럼 구분선 | 수직선 `0x4A4A6A` (width 1px) |
| 오버레이 배경 | `0x000000` (alpha 0.5) |
| 타이틀 텍스트 | 인벤토리 모드: "INVENTORY" / Anvil 모드: "FORGE" — 8px 흰색 |

**모드별 타이틀 및 우측 칼럼 전환:**

| 모드 | 타이틀 | 우측 칼럼 | 진입 경로 |
| :--- | :--- | :--- | :--- |
| 'inventory' | "INVENTORY" | 캐릭터 스탯 (§3.12) | `I` 키 토글 |
| 'anvil' | "FORGE" | 지층 미니맵 (§3.8.4) | 앵빌 근접 C키 → `InventoryUI.openForAnvil(onSelect)` |

**필터 탭 (좌측 그리드 위):**

| 탭 | 필터 조건 |
| :--- | :--- |
| ALL | 전체 표시 |
| WPN | 무기 타입 |
| ARM | 방어구 타입 |
| ACC | 장신구 타입 |

활성 탭 배경 `0x3A3A5A` + 흰색 텍스트. 탭 전환: `Tab` 키.

**스크롤바:**
- 42셀(6×7) 이하: 스크롤 없음
- 43개 이상: `↓` 경계 행 도달 시 뷰포트 스크롤
- 그리드 우측에 `3px` 스크롤바 (배경 `0x1A1A2E`, 썸 `0x4A4A6A`)
- 그리드 아래 `N/120` 카운터 (`0xAAAAAA`, 우측 정렬)

### 3.2 Level 1 — 그리드 셀 시각 (즉시 인지)

리서치 §3 Level 1 — 한 셀에 즉시 인지 가능한 정보만 렌더링한다.

**셀 레이아웃 (28×28px):**

```
┌──[E]────────[↓]──┐
│                  │
│   [ICON/COLOR]   │
│                  │
└──[·]────────[■]──┘
```

| 요소 | 위치 | 크기 | 조건 | 시각 |
| :--- | :--- | :--- | :--- | :--- |
| 셀 테두리 | 전체 외곽 | 1px / 2px | 항상 | 레어리티 색 (상태에 따라 두께 변환) |
| 셀 배경 | 전체 | 28×28 | 항상 | `rgba(레어리티_색, 0.06)` 기본 / `0.18` 선택됨 |
| 아이템 아이콘 | 중앙 | 16×16 | 항상 | 아이템 스프라이트 아이콘 (없으면 레어리티 색 솔리드 사각형) |
| `[E]` 배지 | 좌상단 (x=1, y=1) | 4×4 | 장착 중 | 흰색 `0xFFFFFF` 솔리드 |
| Dive 배지 | 우상단 (x=23, y=1) | 4×4 | 다이브 가능 | 청색 `0x4488FF` 솔리드 |
| 클리어 배지 | 우하단 (x=23, y=23) | 4×4 | `worldProgress.cleared` | 초록 `0x44FF44` 솔리드 |
| Memory Shard 점 | 좌하단 (x=1, y=23) | 4×4 | 단편 1개 이상 | Subdued만: 흰색 `0xFFFFFF` / Wild 포함: 빨강 `0xFF4444` |

**셀 상태별 시각:**

| 상태 | 테두리 | 배경 |
| :--- | :--- | :--- |
| 기본 | 레어리티 색 1px | `rgba(레어리티, 0.06)` |
| 선택됨 | 레어리티 색 2px | `rgba(레어리티, 0.18)` |
| 장착 중 (비선택) | 흰색 `0xFFFFFF` 1px | `rgba(255,255,255, 0.06)` |
| 선택됨 + 장착 중 | 흰색 2px | `rgba(255,255,255, 0.18)` |
| 빈 슬롯 | 없음 | 없음 (렌더 생략) |

> **선택 커서:** 별도 커서 렌더링 없음. 테두리 두께 + 배경 밝기만으로 선택 상태 표현.

**네비게이션 경계 처리:**
- 좌측 끝 열(col=0)에서 `←`: col=0 유지 (래핑 없음)
- 우측 끝 열에서 `→`: `min(GRID_COLS-1, col+1)` 유지
- 상단 끝 행(row=0)에서 `↑`: row=0 유지
- 하단 끝 행에서 `↓`: 스크롤 뷰포트 이동 후 다음 행으로 이동 (아이템 없으면 유지)

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

#### inventory 모드 (I키로 열림)

| 키 | 동작 | 조건 |
| :--- | :--- | :--- |
| `I` | 인벤토리 열기/닫기 토글 | 항상 |
| `↑` / `↓` / `←` / `→` | 그리드 셀 이동 | 인벤토리 열린 상태 |
| `Tab` | 필터 탭 전환 (ALL → WPN → ARM → ACC → ALL) | 인벤토리 열린 상태 |
| `X` | 선택된 아이템 장착 (equip) | 아이템 선택됨 |
| `Z` | Level 3 Detail View 토글 | 아이템 선택됨 |
| `C` | Compare Mode 토글 | 장착 아이템 존재 + 선택 아이템 있음 |
| `ESC` / `I` | 닫기 | 항상 |

#### anvil 모드 (앤빌 근접 C키로 열림) — 2단계 배치 시스템

> **Diablo 3 Kanai's Cube 참조.** 아이템을 앤빌 슬롯에 "배치(Place)"한 후 "확정(Dive)"하는 2단계 구조. [C] = Place → [C] = Dive. [ESC] = 제거/취소.
> **리서치 근거:** `Documents/Research/KanaisCube_AnvilSlot_UX_Research.md`

**상태 1 — 앤빌 슬롯 비어있음 (배치 전)**

| 키 | 동작 | 조건 |
| :--- | :--- | :--- |
| `↑` / `↓` / `←` / `→` | 그리드 셀 이동 | 항상 |
| `C` | **선택 아이템을 앤빌 슬롯에 배치** | 아이템 선택됨 + 비장착 + 다이브 가능 |
| `Z` | Level 3 Detail View 토글 | 아이템 선택됨 |
| `ESC` | 앤빌 UI 닫기 (월드 복귀) | 항상 |

**상태 2 — 앤빌 슬롯에 아이템 배치됨 (다이브 대기)**

| 키 | 동작 | 조건 |
| :--- | :--- | :--- |
| `C` | **DIVE 확정** → 다이브 프리뷰/연출 시작 | 항상 |
| `ESC` | **아이템 제거** → 앤빌 슬롯 비움 → 인벤토리 복귀 → 상태 1 | 항상 |
| `↑` / `↓` / `←` / `→` | 비활성 (앤빌 슬롯에 포커스 고정) | -- |
| `Z` | 배치된 아이템의 Detail View | 항상 |

**배치 차단 조건:**
- 장착 중인 아이템: "Unequip first" 토스트 (System_ItemWorld_Core §2.1)
- Broken Blade: "Cannot dive" 토스트
- Strata 0인 아이템 (다이브 불가): 배치 차단

**열림 동작:** 아이템이 1개 이상이면 자동으로 첫 번째 셀(col=0, row=0) 선택. 비어있으면 selectedIndex = -1.

### 3.5 Middle Column — 아이템 정보 패널 (DEC-046 재설계)

> **2026-05-24 전면 재설계 (DEC-046):** "아이템 정보 패널"의 메인은 *수치 스탯* 이 아니라 *인물 카드 + Recovery 게이지 + 해금된 Fragment 컬렉션* 이다. 수치(effective stat)는 화면 우측 STATUS 칼럼에서만 표시되며, 중앙은 *그 사람이 누구인가* 를 보여준다.

리서치 §3 Level 2. 패널 중앙 INFO 영역. 아이템 선택이 변경될 때마다 재계산.

**레이아웃 (3칼럼 전체):**
```
+──[GRID 6×7]────────────+──[ITEM INFO]──────────────────+──[STATUS]──────────+
│ ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐ │ Iron Blade             [E]  │ Lv. 12             │
│ │⚔││⚔││🛡││◆││⚔││⚔│ │ RARE · Blade · C2 · CLR     │ ─────────────────  │
│ └──┘└──┘└──┘└──┘└──┘└──┘ │ ─────────────────────────  │ HP  520/520        │
│ ┌──┐ ...                  │ ATK  45  INT  0             │ ATK  80 (+45)      │
│ │⚔│                     │ HP Bonus: +10               │ INT   0             │
│ └──┘                      │ ─────────────────────────  │ ─────────────────  │
│                            │ Memory Shards: 2/4          │ RELICS 2/5         │
│             20 / 120       │ Strata: 1/3                 │ ● Dash             │
│                            │ ─────────────────────────  │ ● Wall Climb       │
│                            │ [Z] Detail                  │ ○ Dbl Jump         │
│                            │ [X] Equip  [C] Compare      │ ○ Underwater       │
+────────────────────────────+─────────────────────────────+────────────────────+
```

**표시 순서 (위 → 아래):**

> **2026-05-24 변경 (DEC-046):** 메인 컬럼이 *수치 스탯* 에서 *Identity Card (인물 카드 + Recovery + Fragment 컬렉션)* 로 전환. ATK/INT 수치는 STATUS 칼럼으로 이동. Memory Shard 슬롯 표시는 폐기 (5색 기질 단편 폐기).

| # | 항목 | 형식 | 색상 |
| :--- | :--- | :--- | :--- |
| 1 | 현재 표시 이름 + 장착 태그 | `"Surveyor's Echo Wedge [E]"` (Stage에 따라 변화) | 레어리티 색 |
| 2 | 레어리티 + 인물 카테고리 + Recovery % | `"MAGIC · Surveyor · 100%"` (Stage 0 시 `"MAGIC · Unknown · 0%"`) | 흰색 `0xCCCCCC` |
| 3 | 구분선 | `—————————` | `0x4A4A6A` |
| 4 | Recovery 게이지 (시각) | `"Recovery: ████████ 100%"` 막대 + % 텍스트. Stage 사이 진행분 부분 칠 | Stage 색 (0=회색, 4=레어리티 색) |
| 5 | 구분선 | `—————————` | `0x4A4A6A` |
| 6 | 해금 Memory Fragment 목록 (최대 5줄) | `"▸ \"두드리고 듣는다. 그게 전부였어.\""` (한 줄 길면 …절단 / 미해금은 `"▸ ???"`) | 해금: 흰색 / 미해금: `0x666666` |
| 7 | Re-Dive 카운터 (Stage 4 도달 후만) | `"Re-Dive: 1/3"` | `0xAAAAAA` |
| 8 | 구분선 | `—————————` | `0x4A4A6A` |
| 9 | 조작 힌트 | inventory 모드: `[Z]Archive [X]Equip` / anvil 모드: `[Z]Archive [X]Dive` | `0xAAAAAA` (KeyPrompt 글리프) |
| 10 | 조작 힌트 2 | `[C]Compare` (장착 중 + 선택 아이템 ≠ 장착 아이템일 때만) | `0xAAAAAA` |

> **[Z] Archive 키:** 기존 "Z = Level 3 Detail View" 폐기 → `Z = Identity Archive` 화면으로 전환. 별도 화면 `UI_Identity_Archive.md` (신규).
>
> **폐기된 표시:** `ATK:45 INT:0` (STATUS 칼럼으로 이동), `HP:+10` (STATUS), `Memory Shards: {n}/{slots}` (5색 기질 폐기), `Strata: 1/3 CLR` (Recovery 게이지로 흡수).

**폰트:** 8px 픽셀 폰트. 한 줄 최대 가로 `INFO_W - 패딩8 = 188px`. 이름이 길면 16자 절단 후 `…` 표기.

**Compare Mode에서의 스탯 표시:** §3.7 참조. 선택 아이템의 스탯 옆에 현재 장착 아이템 대비 델타를 병기. STATUS 칼럼에서도 `ATK 80 (+45)` 형식으로 동시 반영.

**빈 슬롯 또는 아이템 미선택 시:**
```
inventory 모드: "— Select an item —" (중앙 정렬)
anvil 모드:    "— Select weapon —"
```

### 3.6 Level 3 — ~~Detail View~~ → Identity Archive 전환 (DEC-046)

> **2026-05-24 변경:** Level 3 Detail View는 폐기. Z 키는 *Identity Archive 화면* 으로 전환된다. Detail View의 정보(Base/Final Stats, Memory Shard 슬롯, Memory Strata 진행도)는 Recovery 게이지 + Fragment 컬렉션 + STATUS 칼럼으로 흡수되었다.
>
> 신규 화면 명세: `Documents/UI/UI_Identity_Archive.md` (작성 대기)

#### 폐기된 Level 3 콘텐츠 매핑

| 구 Level 3 항목 | 신 대체 위치 |
| :--- | :--- |
| Base Stats vs Final Stats 비교 테이블 | STATUS 칼럼 (Compare Mode 인라인 델타) |
| Memory Shard 슬롯 리스트 (Wild/Subdued/Empty) | 폐기 (5색 기질 단편 시스템 폐기) |
| Memory Strata 진행도 (Cleared/Current/Locked) | 중앙 칼럼 Recovery 게이지로 통합 |
| Flavor Text (item.def.flavor) | Identity Archive 인물 카드 페이지로 이동 |
| 패널 테두리 = 레어리티 색 | Identity Archive에서 유지 |

#### 이하 내용은 참고용 (구 명세, 폐기됨)

---

#### (DEPRECATED) Level 3 — Detail View

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
|  MEMORY_SHARDS (2/4 slots)               |
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
| 패널 높이 | 유동 (Memory Shard 슬롯 수 + Strata 수에 따라 증가), 최소 240px, 최대 320px |
| 패널 배경 | `0x1A1A2E` alpha 0.98 |
| 패널 테두리 | 레어리티 색상 (width 2px) — 레어리티 강조 |
| 헤더 타이틀 | 아이템명, 레어리티 색, 12px |
| 섹션 구분선 | `0x4A4A6A` (width 1px) |
| 닫기 | `[X]` 또는 `[ESC]` 또는 `[Z]` 재입력 — 모두 Level 3 닫기 |

**섹션별 상세:**

1. **헤더 (1줄)** — 아이템명 (레어리티 색, 12px)
2. **메타 정보 (1줄)** — 레어리티명 / `Lv.N` / `Cycle:N` / `CLR` (해당 시)
3. **타입 (1줄)** — 무기/방어구/장신구 종류 (예: "Blade (Weapon)")
4. **Base Stats vs Final Stats (테이블)** — 좌측 Base (Memory Shard 반영 전), 우측 Final (Memory Shard 반영 후). 차이가 있는 줄은 우측에 하이라이트 `+N`
5. **Memory Shards (리스트)** — §3.9 형식
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
|  Memory Shards: 4/6  |  Memory Shards: 2/4  |
|  Strata: 3/4     |  Strata: 1/3     |
+------------------+------------------+
```

**시각 규칙:**

| 차이 | 표시 |
| :--- | :--- |
| 상승 | `(+12)` 초록 `0x44FF44` |
| 하락 | `(-33)` 빨강 `0xFF4444` |
| 동일 | 괄호 생략 |

**활성화 시 레이아웃 변화:** Info Box가 Compare 뷰로 교체된다. 총 패널 너비는 동일 (256px). 리스트 영역은 유지되고 우측만 전환.

**비활성 조건 자동 해제:** 장착 해제 / 아이템 버리기 / 선택이 장착 아이템으로 이동 시 자동으로 Compare Mode 해제.

### 3.8 Anvil 모드 — Forge Preview UI

인벤토리 리스트(좌)와 **Forge Preview 패널(우)** 2열 구성이다. Forge Preview는 선택된 아이템의 **지층 타일 미니맵**을 지층 탭(I / II / III)으로 전환하며 보여주는 것이 핵심이다. 아이템을 인벤토리에서 탐색하는 동안 실시간으로 그 아이템의 내부 세계가 우측에 표시된다.

> **설계 근거:**
> - Diablo 3 Kanai's Cube: "배치 → 확정" 2단계 UX, 시각적 슬롯 어포던스
> - 아이템계 결정론적 시드(`itemUid * 1000 + stratumIndex * 7919`): 씬 진입 없이 전체 타일맵 사전 계산 가능
> - Slay the Spire: 런 시작 전 전체 층 구조 공개 — 전략 계획 허용

---

#### 3.8.1 전체 레이아웃

**패널 치수:**

| 항목 | 값 |
| :--- | :--- |
인벤토리와 동일한 3칼럼 구조. **우측 칼럼이 캐릭터 스탯 → 지층 미니맵으로 전환**되는 것이 핵심.

| 항목 | 값 |
| :--- | :--- |
| 총 UI 너비 | 550px (§3.1 인벤토리와 동일 PANEL_W) |
| 화면 내 위치 | 640px 중앙 정렬 (좌우 여백 각 45px) |
| UI 높이 | 254px (§3.1과 동일) |
| 그리드 너비 (`GRID_W`) | 178px — 인벤토리와 동일, 6열 |
| Forge 정보 너비 (`INFO_W`) | 196px — 앤빌 슬롯 + 아이템 정보 |
| 지층 미니맵 너비 (`STATUS_W`) | 148px — Stratum Tile Map |
| 배경색 | `0x1A1A2E` alpha 0.95 (인벤토리와 동일) |

```
←─────────────────────── 640px ───────────────────────→
← 45px → ←──────── 550px ─────────────→ ← 45px →

+═════[ FORGE ]═══════════════════════════════════════+
│                                                      │
│ ┌─[GRID 6×7]──────┐ │ ┌─[FORGE INFO]──┐ │ ┌─[MAP]──┐ │
│ │ ┌─┐┌─┐┌─┐┌─┐┌─┐┌─┐ │ │┌────┐ Iron  R│ │ │[I▼][II]│ │
│ │ │⚔││⚔││🛡││◆││⚔││⚔│ │ ││ANVIL│ Blade  │ │ │[BOSS]  │ │
│ │ └─┘└─┘└─┘└─┘└─┘└─┘ │ │└────┘ 1/3  CLR│ │ │████░░  │ │
│ │ ┌─┐ ...             │ │─────────────── │ │ │░███░██ │ │
│ │ │⚔│                │ │ATK 45  INT  0  │ │ │██░░███ │ │
│ │ └─┘                 │ │Shards: 2/4     │ │ │  [S]   │ │
│ │           20 / 120  │ │Strata: 1/3     │ │ └────────┘ │
│ └─────────────────────┘ │─────────────── │ │            │
│                          │[C] Place       │ │[ESC] Close │
│                          └────────────────┘ └────────────┘
+══════════════════════════════════════════════════════+
```

---

#### 3.8.2 Forge Preview 패널 내부 구성

Forge Preview 패널(272px)은 3행으로 분할된다.

```
+──[FORGE PREVIEW: 272px]──────────────────────────────+
│  ┌──────┐  {아이템명}        {레어리티}  {N}/{T}      │  ← 헤더 행 (32px)
│  │ANVIL │  ─────────────────────────────────────────  │
│  │ SLOT │  [ I ▼ ]  [  II  ]  [  III  ]              │  ← 탭 행 (18px)
│  └──────┘  ┌──────────────────────────────────────┐  │
│             │                                      │  │
│             │        TILE MAP (선택된 지층)         │  │  ← 타일맵 행 (172px)
│             │                                      │  │
│             └──────────────────────────────────────┘  │
│  [C] Place on Anvil                    [ESC] Close    │  ← 힌트 행 (18px)
+───────────────────────────────────────────────────────+
```

**앤빌 슬롯 사양:**

| 항목 | 값 |
| :--- | :--- |
| 슬롯 크기 | 32×32px |
| 위치 | Forge Preview 패널 좌상단, 헤더행 내 좌측 정렬 |
| 빈 상태 | 점선 테두리 `0x666666`, 내부 `0x1A1A2E` |
| 배치됨 (상태 2) | 아이템 아이콘 + 레어리티 색 테두리 + 0.8초 맥동 |

**헤더 행 (32px):**

| 요소 | 위치 | 형식 |
| :--- | :--- | :--- |
| 앤빌 슬롯 | 좌측 32×32 | 위 사양 참조 |
| 아이템명 | 슬롯 오른쪽 4px 간격 | 레어리티 색, 8px 폰트, 최대 12자 |
| 레어리티 배지 | 명 오른쪽 | `RARE` `MAGIC` 등 레어리티 색 |
| 지층 요약 | 우측 끝 정렬 | `1/3` (클리어/전체) 회색 `0xAAAAAA` |

---

#### 3.8.3 지층 탭 (Stratum Tabs)

선택된 아이템의 레어리티에 따라 탭 수가 달라진다 (Normal: I / Magic: I·II / Rare: I·II·III / Legendary: I·II·III·IV / Ancient: I·II·III·IV + 심연).

**탭 상태:**

| 상태 | 조건 | 시각 | 탭 레이블 |
| :--- | :--- | :--- | :--- |
| Active | 현재 보고 있는 지층 | 밝은 테두리 `0xFFFFFF`, 배경 `0x3A3A5A` | `[ I ▼ ]` (▼ = 선택 표시) |
| Cleared | `worldProgress.strata[n].cleared === true` | 초록 `0x44FF44` 텍스트 | `[✓ I ]` |
| Available | 미클리어, 진입 가능 | 일반 흰색 | `[ II ]` |
| Locked | 이전 지층 미클리어 (진입 불가) | 회색 `0x555555`, 잠금 아이콘 | `[🔒III]` |

**탭 조작:**
- 상태 1 (배치 전): `←` `→` 키로 탭 전환 (단, 인벤토리 탐색과 분리 — 탭 포커스 상태일 때만)
- 상태 2 (배치 후): `←` `→` 키로 탭 전환
- 탭 전환 시 타일맵 즉시 교체 (페이드 없음, 즉각 반응)

> **구현 주의:** 상태 1에서 인벤토리 방향키와 탭 방향키 충돌 회피 필요. 기본은 인벤토리 탐색, `Tab` 키 또는 별도 키로 탭 포커스 전환을 검토할 것. 구체적 키 매핑은 구현 단계에서 확정.

---

#### 3.8.4 Stratum Tile Map

인벤토리에서 아이템을 선택하면 **즉시** 해당 아이템의 지층 타일맵을 사전 계산하여 렌더링한다. 씬 진입 없이 순수 데이터 계산으로 처리된다.

**타일맵 사전 계산:**

```typescript
// 신규 유틸: game/src/level/ItemWorldPreview.ts
// generateUnifiedGridFromGraph() + pickTemplate() + resolveTiles() 를
// 씬 외부에서 동일 시드로 실행하여 완전한 타일 그리드 반환
generateItemWorldPreviewGrid(strataDefs, itemUid): number[][]
```

시드 공식 (기존 코드와 동일 — 결과 일치 보장):
- 방 그래프 시드: `itemUid * 1000 + stratumIndex * 7919`
- 방 타일 시드: `itemUid * 10000 + col * 100 + row`

**렌더링 사양:**

| 항목 | 값 |
| :--- | :--- |
| 타일맵 표시 영역 | 228×172px (Forge Preview 패널 내 탭 아래 공간) |
| 스케일 방식 | 지층 전체 타일 크기에 맞춰 228×172 바운딩 박스에 fit (종횡비 유지) |
| 렌더 방식 | PixiJS Graphics (타일 1개 = 스케일된 사각형) |
| 캐시 | 아이템 선택 시 1회 생성, 탭 전환 시 지층별 재계산 |

**타일 색상 코드:**

| 타일값 | 색상 | 의미 |
| :--- | :--- | :--- |
| 0 (air) | `0x0D0D1A` (거의 검정) | 통로/공간 |
| 1 (wall) | `0x2A2A2A` (진한 회색) | 벽 |
| 2 (water) | `0x0A2040` (진한 청색) | 물/유체 |
| 3 (platform) | `0x3A3A3A` (밝은 회색 선) | 단방향 발판 |
| null (방 없음) | 완전 투명 | 빈 셀 |

**오버레이 마커 (타일맵 위에 렌더):**

| 마커 | 조건 | 시각 |
| :--- | :--- | :--- |
| `BOSS` | `cell.role === 'boss'` | 빨강 `0xFF4444` 사각 + 텍스트 `B` |
| `START` | `cell === stratumStartRoom` | 흰색 `0xFFFFFF` 화살표 (▼) |
| `SHRINE` | `cell.role === 'shrine'` | 보라 `0xAA44FF` 사각 + 텍스트 `S` |

---

#### 3.8.5 상태별 UI 동작

**상태 1 — 앤빌 슬롯 비어있음 (아이템 탐색 중)**

인벤토리 방향키로 아이템을 탐색할 때마다 Forge Preview 우측이 실시간 갱신된다.

| 요소 | 상태 |
| :--- | :--- |
| 앤빌 슬롯 | 빈 슬롯 (점선 테두리) |
| 헤더 | 현재 선택된 인벤토리 아이템의 정보 |
| 탭 | 선택된 아이템 기준 지층 탭 표시 |
| 타일맵 | 선택된 아이템의 현재 탭 지층 미니맵 |
| 하단 힌트 | `[C] Place on Anvil   [ESC] Close` |

**상태 2 — 앤빌 슬롯에 아이템 배치됨 (다이브 대기)**

인벤토리 방향키 비활성. 앤빌에 올려진 아이템의 정보와 맵이 고정 표시된다.

| 요소 | 상태 |
| :--- | :--- |
| 앤빌 슬롯 | 아이템 아이콘 + 레어리티 테두리 + 맥동 |
| 헤더 | 앤빌 슬롯 아이템의 정보 (변경 불가) |
| 탭 | 탭 전환 가능 (`←` `→`) |
| 타일맵 | 앤빌 슬롯 아이템의 현재 탭 지층 미니맵 |
| 하단 힌트 | `[C] DIVE   [ESC] Remove` |

**상태별 키 매핑:**

| 키 | 상태 1 (배치 전) | 상태 2 (배치 후) |
| :--- | :--- | :--- |
| `↑ ↓ ← →` | 인벤토리 탐색 | 비활성 |
| `C` | **Place on Anvil** | **DIVE 확정** |
| `ESC` | UI 닫기 (월드 복귀) | **아이템 제거** → 상태 1 |
| `Z` | Detail View (선택 아이템) | Detail View (앤빌 아이템) |
| `X` | 비활성 | 비활성 |

**배치 차단 조건 (상태 1에서 C 입력 시):**

| 조건 | 처리 |
| :--- | :--- |
| 장착 중인 아이템 | "Unequip first" 토스트 |
| Broken Blade / Strata 0 아이템 | "Cannot dive" 토스트 |
| 아이템 미선택 상태 | 무반응 |

---

#### 3.8.6 배치/제거 시각 이펙트 ("탁" 연출)

#### 배치 시각 이펙트 ("탁" 연출)

| 단계 | 시간 | 시각 | 사운드 |
| :--- | :--- | :--- | :--- |
| 1. 아이콘 비행 | 150ms | 인벤토리 슬롯 → 앤빌 슬롯 ease-out 트윈 | -- |
| 2. 착지 스파크 | 100ms | 앤빌 슬롯에 불꽃 파티클 3-5개 방출 | 금속 타격 SFX (짧고 경쾌) |
| 3. 테두리 플래시 | 200ms | 앤빌 슬롯 테두리가 레어리티 색상으로 1회 밝게 | -- |
| 4. 인벤토리 슬롯 | 즉시 | alpha 0.3 + "ON ANVIL" 작은 텍스트 | -- |
| 5. 맥동 시작 | 지속 | 앤빌 슬롯 테두리 0.8초 주기 맥동 | -- |

#### 제거 시각 이펙트

| 단계 | 시간 | 시각 |
| :--- | :--- | :--- |
| 1. 역 비행 | 100ms | 앤빌 슬롯 → 인벤토리 슬롯 ease-in 트윈 |
| 2. 슬롯 복원 | 즉시 | 인벤토리 슬롯 alpha 1.0 복구 |
| 3. 앤빌 초기화 | 즉시 | 빈 슬롯 (점선 테두리) 복원 |

### 3.9 Memory Shard 표시 (3단계)

ECHORIS의 Memory Shard = 아이템에 거주하며 보너스를 부여하는 존재. 리서치 §6.4 권장안: Disgaea 리스트 + PoE 슬롯 시각화 혼합.

**Level 1 (그리드):** 좌하단 4×4 점. `item.memory shards.filter(Boolean).length > 0` 일 때 표시. Subdued가 1개 이상이면 흰색 `0xFFFFFF`, Wild만 존재 시 빨강 `0xFF4444`.

**Level 2 (Info Box):** `"Memory Shards: {채워진슬롯}/{전체슬롯}"` 텍스트 요약. Wild 수는 Level 2에서 숨김 (Level 3에서만 상세).

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
| `isFull` | `items.length >= 120` |

### 3.12 Right Column — 캐릭터 스탯 패널 (STATUS)

인벤토리 모드에서 우측 칼럼(STATUS_W=148px)에 상시 표시. 아이템 선택/장착 상태에 따라 실시간 갱신.

**표시 순서 (위 → 아래):**

| # | 항목 | 형식 | 색상 |
| :--- | :--- | :--- | :--- |
| 1 | 레벨 | `"Lv. 12"` | 흰색 |
| 2 | 구분선 | | `0x4A4A6A` |
| 3 | HP | `"HP  520 / 520"` | 흰색 / 빨강(max HP 비율) |
| 4 | 현재 ATK | `"ATK  80"` + Compare delta | 흰색. Compare 활성 시 `(+45)` 초록 / `(-12)` 빨강 |
| 5 | 현재 INT | `"INT   0"` + Compare delta | 흰색 / Compare 색 |
| 6 | 구분선 | | `0x4A4A6A` |
| 7 | 렐릭 헤더 | `"RELICS N/5"` | `0xAAAAAA` |
| 8 | 렐릭 리스트 | 각 렐릭 1줄. `●` 획득 / `○` 미획득 | 획득: `0xFFFFFF` / 미획득: `0x555555` |
| 9 | 구분선 | | `0x4A4A6A` |
| 10 | 보유 수 | `"N / 120"` 우측 정렬 | `0xAAAAAA` |

**렐릭 목록 (5종 고정):**
1. Dash
2. Wall Climb
3. Dbl Jump
4. Underwater
5. Anti-Gravity

**Compare Mode 동작:** C 키 활성 시 ATK/INT 줄에 선택 아이템 장착 시의 변화량 즉시 표시. 별도 Compare 패널 없이 STATUS 칼럼만으로 교체 판단 완료.

**Anvil 모드에서:** 이 칼럼은 **지층 미니맵**으로 대체됨 (§3.8.4). 캐릭터 스탯 숨김.

---

## 4. 공식 (Formulas)

### Final Stat 계산 (Level 3 Detail View용)

```
finalATK = baseATK * rarityMultiplier[rarity] * (1 + Σ memory shardBonus.atk)
finalINT = baseINT * rarityMultiplier[rarity] * (1 + Σ memory shardBonus.int)
finalHP  = 0 + Σ memory shardBonus.hp  (HP는 보너스 한정)
```

`rarityMultiplier`: Normal 1.0 / Magic 1.3 / Rare 1.7 / Legendary 2.2 / Ancient 3.0 (SSoT `Content_Rarity.csv`).

Memory Shard 보너스는 **Subdued** 상태만 반영. Wild는 계산에 포함되지 않음.

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
| Memory Shard 슬롯 수가 0인 아이템 (Broken Blade 등 튜토리얼) | Level 1 인디케이터 미표시. Level 2 `"Memory Shards: —"`, Level 3 섹션 생략 |
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
- [ ] Memory Shard 1개 이상 아이템은 좌하단 점 표시 (Subdued 흰색 / Wild 빨강)
- [ ] 장착 아이템 테두리는 **흰색**으로 표시 (Rare 노랑과 구분)

**Level 2 (Info Box):**
- [ ] 아이템 선택 시 우측 Info Box에 이름/레어리티/스탯/Memory Shard 요약/Strata 요약/조작 힌트 표시
- [ ] 장착 중이면 `[E]` 태그 표시
- [ ] 사이클이 0이면 `C0` 생략, 1 이상이면 `C{n}` 표시
- [ ] Anvil 모드 조작 힌트는 `[X]Dive`로 변경

**Level 3 (Detail View):**
- [ ] Z 키로 Detail View 오버레이 열림/닫힘
- [ ] Base Stats vs Final Stats 차이가 우측에 표시됨
- [ ] Memory Shard 리스트가 상태별 심볼/색상으로 구분됨 ([!] Wild / [O] Subdued / [ ] Empty)
- [ ] Memory Strata 진행도 리스트가 클리어 상태별로 표시됨
- [ ] Flavor Text가 이탤릭/별도 색상으로 하단에 표시됨
- [ ] 패널 테두리가 레어리티 색상으로 그려짐
- [ ] X/ESC/Z 재입력 중 어느 것으로도 닫힘

**Compare Mode (C 키):**
- [ ] 장착 아이템 존재 + 선택 아이템 ≠ 장착 아이템일 때만 Compare 활성화
- [ ] 상승 스탯은 초록 `(+N)`, 하락은 빨강 `(-N)`
- [ ] 장착 해제 시 Compare Mode 자동 해제

**Anvil 모드 (기본 플로우):**
- [ ] 앵빌 근접 C → "FORGE" 타이틀로 열림
- [ ] 상태 1: 인벤토리 탐색 중 우측 Forge Preview가 선택 아이템 실시간 갱신
- [ ] 상태 1: C 키로 아이템 앤빌 슬롯에 배치 ("탁" 이펙트)
- [ ] 상태 1: 장착 중 아이템 선택 + C → "Unequip first" 토스트
- [ ] 상태 2: C 키로 DIVE 확정
- [ ] 상태 2: ESC 키로 아이템 제거 → 상태 1 복귀
- [ ] UI 닫힘 시 앤빌 슬롯 아이템 자동 인벤토리 복귀

**Anvil 모드 — Stratum Tile Map:**
- [ ] 아이템 선택 시 Forge Preview 우측에 타일맵 즉시 표시
- [ ] 지층 탭이 아이템 레어리티에 맞는 수(I / I·II / I·II·III / I·II·III·IV)로 생성됨
- [ ] Active 탭: 밝은 테두리 + ▼ 표시
- [ ] Cleared 탭: 초록 `✓` 표시
- [ ] Locked 탭: 회색 + 잠금 표시
- [ ] 탭 전환 시 타일맵 즉각 교체
- [ ] 타일 색상: 공기 `0x0D0D1A` / 벽 `0x2A2A2A` / 물 `0x0A2040` / 발판 `0x3A3A3A`
- [ ] BOSS 마커 (빨강), START 화살표 (흰색), SHRINE 마커 (보라) 오버레이 표시
- [ ] 동일 아이템 재선택 시 캐시 사용 (재계산 없음)

### 경험 검증

- [ ] 레어리티 색상만으로 강력한 아이템(Legendary/Ancient)을 즉시 식별
- [ ] 그리드 배지(Dive 포탈/클리어/Memory Shard)만 보고도 아이템의 "탐험 가능성"과 "내부 존재"를 파악
- [ ] Level 2 Info Box만으로 장착 전/후 판단에 필요한 정보가 충족됨
- [ ] Compare Mode로 교체 여부를 3초 이내에 결정 가능
- [ ] Level 3 Detail View에서 Memory Shard 복종 상태와 Strata 진행도를 확인 가능
- [ ] 인벤토리와 앵빌이 동일 UI이므로 학습 비용이 없음

---

## 7. 구현 우선순위

리서치 §6.6 준수. Sacred Pickup Task 지시서와 병렬 진행 가능.

| 순위 | 항목 | 근거 |
| :--- | :--- | :--- |
| **P0** | 장착 테두리 색상 변경 (노랑 → 흰색) | Rare 충돌 해결. 1줄 수정 |
| **P0** | Anvil 모드 경로 단일화 (`InventoryUI.openForAnvil` 사용, `drawItemSelectUI` 폐기) | Sacred Pickup 전제조건 |
| **P1** | Level 2 Info Box 확장 (우측 패널, 다줄 정보) | 현재 가장 부족한 부분 |
| **P1** | Level 1 Memory Shard 인디케이터 (좌하단 점) | 그리드 즉시 식별 |
| **P2** | Compare Mode (C 키) | 교체 의사결정의 핵심 |
| **P2** | Level 3 Detail View (Z 키) | Memory Shard 관리 + Strata 확인 |
| **P3** | Memory Shard 리스트 상태 심볼 (Level 3) | Level 3에 종속 |
| **P3** | Memory Strata 진행도 리스트 (Level 3) | Level 3에 종속 |
| **P4** | 무기 종류 아이콘 (Level 1 중앙) | 픽셀아트 아이콘 제작 선행 필요 |
| **P4** | 아이템 버리기 / 정렬 | Phase 2 이후 |

---

## 8. 변경 이력

| 날짜 | 변경 | 근거 |
| :--- | :--- | :--- |
| 2026-05-24 | 2칼럼 → **3칼럼** 재설계 (좌: 6열 그리드 / 중: 아이템 정보 / 우: 캐릭터 스탯). GRID_COLS 8→6, GRID_W 238→178px, INFO_W 196px, STATUS_W 148px 신규. §3.12 Status Panel 추가. Anvil 모드 우측=지층 미니맵으로 전환. Compare Mode → STATUS 칼럼 인라인 델타 방식으로 단순화. | Elden Ring Equipment Screen 참조, 장착 전/후 스탯 즉시 비교 |
| 2026-05-23 | 인벤토리 레이아웃 리스트(1열) → 그리드(8열, CELL 28×28px) 재설계. §3.1/3.2/3.4/3.5/3.8 갱신. 최대 아이템 수 20→120 확장. 필터 탭(ALL/WPN/ARM/ACC) 추가 | Forge UI와 통일, 300+개 아이템 파밍 대응 |
| 2026-05-22 | 인벤토리 전체 레이아웃 그리드(5×4) → 리스트(1열 세로) 재설계. §3.1/3.2/3.4/3.5/3.8 일괄 갱신 | 아이템명 가독성 + Forge Preview 연동 |
| 2026-05-22 | §3.8 Anvil 모드 전면 재설계: Forge Preview 패널 + Stratum Tile Map 미니맵 + 지층 탭(I/II/III) 추가 | 결정론적 시드 기반 씬 외부 타일맵 사전 계산 가능 확인 |
| 2026-04-19 | 3단계 정보 계층(Level 1/2/3) 도입, Compare Mode, Detail View, Memory Shard/Strata 표시 추가 | `Documents/Research/Inventory_ItemInfo_UI_Research.md` (17개 게임 분석) |
| 2026-04-19 | Anvil 모드 통합 명시 + 장착 테두리 색 Rare 충돌 해결 | `UI_SacredPickup.md` 경로 단일화 |
| (기록 없음) | 초기 5×4 그리드 및 단순 3줄 정보 텍스트 | 초기 구현 |

---

*소스 참조: `game/src/ui/InventoryUI.ts`, `game/src/items/Inventory.ts`, `game/src/items/ItemInstance.ts`*
*리서치 참조: `Documents/Research/Inventory_ItemInfo_UI_Research.md`*
