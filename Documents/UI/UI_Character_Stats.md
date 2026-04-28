# UI_Character_Stats.md — 캐릭터 스탯/장비/렐릭 화면

## 구현 현황 (Implementation Status)

| 항목 | 상태 |
| :--- | :--- |
| 화면 접근 경로 (Pause Menu STATUS 탭) | 미구현 |
| 3열 레이아웃 (장비/캐릭터/스탯) | 미구현 |
| 스탯 패널 (ATK/INT/HP + DEF/RES) | 미구현 |
| 스탯 분해 표시 (Base + Equip + Memory Shard = Final) | 미구현 |
| 게이트 상태 표시 (ATK Gate / INT Gate) | 미구현 |
| 장비 슬롯 목록 (8슬롯 수직 배치) | 미구현 |
| 캐릭터 실루엣 (중앙 패널) | 미구현 |
| 레벨/EXP 표시 (Lv.N + 진행 바) | 미구현 |
| 렐릭 목록 (6개 수평 배치) | 미구현 |
| 장비 슬롯 선택 네비게이션 (방향키) | 미구현 |
| 슬롯 선택 시 아이템 상세 (Level 2 Info Box 재사용) | 미구현 |
| X키 장비 해제 | 미구현 |
| Z키 상세 보기 (Level 3 Detail View 위임) | 미구현 |

---

## 0. 필수 참고 자료 (Mandatory References)

- Project Vision: `Documents/Terms/Project_Vision_Abyss.md`
- Writing Standards: `Documents/Terms/GDD_Writing_Rules.md`
- Glossary: `Documents/Terms/Glossary.md`
- **연계 UI:** `Documents/UI/UI_Inventory.md` — Level 2 Info Box, Level 3 Detail View 재사용
- **장비 슬롯 시스템:** `Documents/System/System_Equipment_Slots.md` — 슬롯 구조, 스탯 합산 공식, Phase별 슬롯 개방
- **레벨/경험치 시스템:** `Documents/System/System_Growth_LevelExp.md` — Lv1-10 MVP, EXP 곡선
- **스탯 성장 시스템:** `Documents/System/System_Growth_Stats.md` — BaseStat, FinalStat 공식
- **HUD 마스터플랜:** `Documents/UI/UI_HUD_MasterPlan.md` — 패널 스타일, 공통 상수
- 레어리티 SSoT: `Sheets/Content_Rarity.csv`
- 캐릭터 베이스 스탯: `Sheets/Content_Stats_Character_Base.csv`

---

## 1. 개요 (Overview)

캐릭터 스탯 화면은 플레이어가 에르다(Erda)의 현재 성장 상태를 한 곳에서 파악하는 전용 화면이다. Pause Menu의 STATUS 탭으로 접근하며, 전체화면 오버레이로 렌더링된다. 좌측 장비 슬롯 패널, 중앙 캐릭터 실루엣 + 레벨/EXP 패널, 우측 스탯 패널의 3열 구조로 구성된다. 하단에는 6개 렐릭의 획득/잠금 상태를 수평 나열한다. 장비 슬롯을 선택하면 `UI_Inventory.md`의 Level 2 Info Box를 우측에 재사용하고, Z 키로 Level 3 Detail View를 호출한다. 키보드 전용 조작(방향키 + Z/X/ESC)만 지원한다.

---

## 2. 설계 의도 (Design Intent)

- **야리코미 동기 강화:** 스탯 수치(ATK/INT/HP)와 게이트 통과 여부를 동시에 보여준다. 플레이어는 "어느 아이템계에 들어가야 게이트를 열 수 있는가"를 즉각 판단한다. 수치가 곧 다음 목표를 가리키는 나침반이다.
- **성장의 시각화:** FinalStat = Base + Equip + Memory Shard 분해 표시는 "나의 강함이 어디서 왔는가"를 투명하게 보여준다. Disgaea 스탯 표 구조를 참조하여 성취감과 야리코미 동기를 동시에 충족한다.
- **UI 학습 비용 최소화:** 장비 슬롯 상세 정보는 `UI_Inventory.md` Level 2/3 Info Box를 그대로 재사용한다. 플레이어는 인벤토리 화면과 동일한 레이아웃을 스탯 화면에서도 본다.
- **렐릭의 미래 암시:** 잠긴 렐릭은 이름 자체를 회색으로 표시하되 "?" 심볼로 존재를 암시한다. 아직 없는 능력이 있음을 알려 탐험 동기를 유지한다.
- **Pause Menu 통합:** STATUS 탭은 Pause Menu의 일부다. 탭 전환(STATUS/INVENTORY/SETTINGS)으로 화면 전체를 교체한다. 별도 키 할당 없이 ESC 하나로 중심 허브에 접근하는 구조는 조작 체계를 단순하게 유지한다.

---

## 3. 상세 규칙 (Detailed Rules)

### 3.1 화면 접근 경로 (Access Path)

```
게임플레이 중
    ESC 키 입력
    → Pause Menu 열림 (탭 바: STATUS | INVENTORY | SETTINGS)
        Tab 키 또는 ← → 로 탭 전환
        기본 선택: STATUS 탭 (가장 첫 번째)
        → STATUS 탭 선택 시 본 문서 화면 렌더링
        → INVENTORY 탭 선택 시 UI_Inventory.md 화면 렌더링
        → SETTINGS 탭 선택 시 설정 화면 렌더링
    ESC 재입력 또는 P 키: Pause Menu 전체 닫기
```

**탭 바 레이아웃:**

```
+--[ STATUS ]--[ INVENTORY ]--[ SETTINGS ]--+
```

| 속성 | 값 |
| :--- | :--- |
| 탭 바 높이 | 14px |
| 탭 폰트 | 8px 흰색 |
| 활성 탭 배경 | `0x4A4A8A` |
| 비활성 탭 배경 | `0x2A2A3E` |
| 탭 전환 키 | `Tab` 또는 `← →` (탭 포커스 상태에서) |
| 탭 바 테두리 | `0x4A4A6A` 1px |

**포커스 모드:** Pause Menu는 "탭 포커스" 와 "콘텐츠 포커스" 두 상태를 가진다. 처음 열리면 콘텐츠 포커스(STATUS 탭 본문 내부) 상태다. `Shift+Tab` 또는 `↑` (콘텐츠 최상단에서)를 입력하면 탭 포커스로 이동한다. 탭 포커스에서 `Enter` 또는 `↓` 입력 시 콘텐츠 포커스로 복귀.

---

### 3.2 전체 레이아웃 (Overall Layout)

전체화면 오버레이. 기저 게임 화면 위에 반투명 배경을 씌운다.

| 항목 | 값 |
| :--- | :--- |
| 오버레이 배경 | `0x000000` alpha 0.6 |
| 패널 배경 | `0x1A1A2E` alpha 0.95 |
| 패널 테두리 | `0x4A4A6A` 1px |
| 패널 전체 크기 | 500×280px |
| 패널 위치 | 화면 중앙 (`floor((640-500)/2) = 70`, `floor((360-280)/2) = 40`) |
| 상단 탭 바 포함 높이 | 280px (탭 바 14px + 콘텐츠 266px) |

**3열 + 하단 바 구성:**

```
+===========[ STATUS ]====[ INVENTORY ]====[ SETTINGS ]===========+
|                                                                   |
|  [LEFT: 160px]          [CENTER: 160px]      [RIGHT: 160px]      |
|  장비 슬롯                캐릭터 실루엣          스탯 패널          |
|  (Equipment Slots)       + 레벨/EXP            (Stats)           |
|                                                                   |
+-------------------------------------------------------------------+
|  [RELICS BAR: 500px wide]                                         |
+===================================================================+
```

| 영역 | X 오프셋 | 너비 | 용도 |
| :--- | :--- | :--- | :--- |
| 좌측 열 (LEFT) | 패딩 8px | 152px | 장비 슬롯 목록 |
| 열 구분선 | 160px | 1px | `0x4A4A6A` |
| 중앙 열 (CENTER) | 161px | 158px | 캐릭터 실루엣 + 레벨/EXP |
| 열 구분선 | 319px | 1px | `0x4A4A6A` |
| 우측 열 (RIGHT) | 320px | 172px | 스탯 + 게이트 상태 |
| 하단 렐릭 바 구분선 | 콘텐츠 하단 | 1px | `0x4A4A6A` |
| 하단 렐릭 바 (RELICS) | 전체 너비 | 500px × 40px | 렐릭 수평 목록 |

**콘텐츠 영역 높이 계산:**

```
총 패널 높이 280px
탭 바        14px
렐릭 바      40px
열 콘텐츠    = 280 - 14 - 40 - 구분선 2px = 224px
```

---

### 3.3 스탯 패널 (Stats Panel)

우측 열(320–491px). 패딩 8px 적용 시 유효 너비 156px.

**레이아웃 다이어그램:**

```
+----[ RIGHT: Stats ]----+
|                        |
|  ATK   145             |
|  INT    32             |
|  HP    280             |
|  ──────────────────    |
|  DEF    45             |
|  RES    12             |
|                        |
|  ── STAT GATE ──────   |
|  ATK Gate  100  [OK]   |
|  INT Gate   50  [!!]   |
|              need +18  |
+------------------------+
```

**주요 스탯 (Primary Stats):**

| 항목 | 폰트 | 색상 | 표시 형식 |
| :--- | :--- | :--- | :--- |
| ATK | 8px | `0xFFFFFF` | `ATK  {value}` |
| INT | 8px | `0xFFFFFF` | `INT  {value}` |
| HP | 8px | `0xFFFFFF` | `HP   {value}` |
| 구분선 | — | `0x4A4A6A` | `────────────` (너비 맞춤) |

**파생 스탯 (Derived Stats):**

| 항목 | 폰트 | 색상 | 표시 형식 | 산출 공식 |
| :--- | :--- | :--- | :--- | :--- |
| DEF | 8px | `0xAAAAAA` | `DEF  {value}` | `floor(FinalATK × 0.3)` |
| RES | 8px | `0xAAAAAA` | `RES  {value}` | `floor(FinalINT × 0.4)` |

DEF/RES는 파생 스탯임을 나타내기 위해 회색 `0xAAAAAA`로 표시하며 별도 섹션 라벨 없이 구분선 아래에 위치한다.

**스탯 분해 표시 (선택 시):**

장비 슬롯 또는 스탯 항목을 선택하면 해당 스탯의 분해 정보가 스탯 패널 하단 팝업 형식으로 표시된다.

```
ATK  145
  Base     :  18
  Equip    : +110
  Memory Shard : +17
  ──────────────
  Final    : 145
```

| 항목 | 폰트 | 색상 |
| :--- | :--- | :--- |
| "Base" 행 | 8px | `0xAAAAAA` |
| "Equip" 행 | 8px | `0xAAAAAA` |
| "Memory Shard" 행 | 8px | `0x44FF44` (복종 기억 단편 기여분) |
| "Final" 행 | 8px | `0xFFFFFF` |
| 구분선 | — | `0x4A4A6A` |

분해 팝업은 선택 해제 시 즉시 숨겨진다.

**게이트 상태 (Gate Status):**

| 항목 | 값 |
| :--- | :--- |
| 섹션 라벨 | `STAT GATE` — 8px `0xAAAAAA` |
| 구분선 | `0x4A4A6A` 1px |
| 각 게이트 한 줄 형식 | `{Gate Name}  {threshold}  [{icon}]` |
| 통과 아이콘 | `[OK]` — 초록 `0x44FF44` |
| 미통과 아이콘 | `[!!]` — 빨강 `0xFF4444` |
| 부족분 힌트 | 미통과 시 다음 줄에 들여쓰기 `need +{delta}` — 빨강 `0xFF4444`, 8px |

게이트 종류:

| 게이트 | 기준 스탯 | 임계값 (MVP 기준) | 표시 이름 |
| :--- | :--- | :--- | :--- |
| ATK Gate | FinalATK | 100 | `ATK Gate` |
| INT Gate | FinalINT | 50 | `INT Gate` |

MVP에서 임계값은 고정값이다. Phase 2에서 구역별 동적 임계값으로 전환한다.

**전체 스탯 패널 수직 레이아웃 (픽셀 기준):**

```
y=0   [패딩 8px]
y=8   ATK  {value}           (8px 줄 높이 = 10px 포함 1px 간격)
y=18  INT  {value}
y=28  HP   {value}
y=38  ─────────────          (구분선 1px, 여백 2px 상하)
y=43  DEF  {value}
y=53  RES  {value}
y=63  [공백 8px]
y=71  STAT GATE              (섹션 라벨)
y=81  ─────────────
y=86  ATK Gate  100  [OK]
y=96  INT Gate   50  [!!]
y=106   need +18             (미통과 시만 표시)
y=116 [하단 여백]
```

---

### 3.4 장비 슬롯 배치 (Equipment Slots Layout)

좌측 열(8–159px). 패딩 8px. 유효 너비 144px.

**Phase 1 MVP:** 무기 슬롯(Blade) 1개만 활성. 나머지 슬롯은 회색으로 "LOCKED" 표기.

**Phase 2 전체 슬롯 (DEC-026 리네이밍 적용):**

| 순서 | 슬롯 ID | 표시 이름 | 설명 |
| :--- | :--- | :--- | :--- |
| 1 | weapon | `Blade` | 무기 슬롯 |
| 2 | sub | `Sub` | 보조무기 슬롯 |
| 3 | head | `Visor` | 관측 헬멧 |
| 4 | body | `Plate` | 판금 갑옷 |
| 5 | arm | `Gauntlet` | 단조 건틀릿 |
| 6 | leg | `Greaves` | 등반 각반 |
| 7 | back | `Rig` | 배면 모듈 |
| 8 | ring1 | `Sigil I` | 빌더 인장 1 |
| 9 | ring2 | `Sigil II` | 빌더 인장 2 |
| 10 | amulet | `Seal` | 권한 봉인체 |

MVP(Phase 1)는 `Blade` 슬롯만 활성. 나머지는 LOCKED 상태로 표시.

**슬롯 한 줄 레이아웃:**

```
[16×16 아이콘] [슬롯명] [아이템명 or 상태]
```

| 항목 | 크기 | 색상 | 조건 |
| :--- | :--- | :--- | :--- |
| 아이콘 영역 | 16×16px | 아이템 레어리티 색 채움 / 비었으면 `0x333333` | — |
| 슬롯명 | 8px | `0xAAAAAA` | 항상 |
| 아이템명 | 8px | 레어리티 색 | 장착 중 |
| "—" | 8px | `0x444444` | 빈 슬롯 (Phase 2 비활성) |
| "LOCKED" | 8px | `0x444444` | Phase 1에서 미개방 슬롯 |

**슬롯 행 높이:** 20px (아이콘 16px + 상하 여백 각 2px)

**슬롯 행 간격:** 2px

**전체 슬롯 목록 다이어그램 (Phase 2 기준):**

```
+----[ LEFT: Equipment ]----+
|                            |
|  [■] Blade     Iron Blade  |  ← 선택 시 파란 하이라이트
|  [■] Sub       —           |
|  [■] Visor     —           |
|  [■] Plate     —           |
|  [■] Gauntlet  —           |
|  [■] Greaves   —           |
|  [■] Rig       —           |
|  [■] Sigil I   —           |
|  [■] Sigil II  —           |
|  [■] Seal      —           |
+----------------------------+
```

**선택 상태 시각:**

| 상태 | 배경 | 텍스트 |
| :--- | :--- | :--- |
| 비선택 | `0x1A1A2E` (패널 배경) | 기본 |
| 선택됨 | `0x2A2A4E` | 기본 |
| 선택됨 + 포커스 | `0x3A3A6E` | 흰색 |

**슬롯 선택 시 우측 동작:**

장비 슬롯을 선택하면 우측 스탯 패널이 "선택된 슬롯의 아이템 정보(Level 2 Info Box)"로 교체된다. `UI_Inventory.md §3.5 Level 2 Info Box` 형식을 그대로 사용하되, 조작 힌트만 다음으로 변경된다:

```
[Z]Detail  [X]Unequip
```

빈 슬롯 선택 시:
```
Empty slot
[Z]Open Inventory
```

Z 키로 인벤토리를 열 경우 해당 슬롯 타입으로 필터된 상태로 열린다(Phase 2 기능. Phase 1은 필터 없는 전체 인벤토리 오픈).

**Phase 1 MVP 슬롯 표시:**

Phase 1에서는 Blade 슬롯 1개만 표시하고, 하단에 다음을 표시한다:

```
[■] Blade     {아이템명 또는 —}

  + 9 slots unlock
    in Phase 2
```

텍스트 색: `0x444444`, 8px.

---

### 3.5 렐릭 목록 (Relic List)

하단 바 영역. 전체 너비 500px, 높이 40px. 패딩 상하 4px, 좌우 8px.

**렐릭 6종:**

| 순서 | ID | 표시 이름 | 효과 요약 |
| :--- | :--- | :--- | :--- |
| 1 | dash | `Dash` | 대시 이동 |
| 2 | wall_climb | `Wall Climb` | 벽 타기 |
| 3 | double_jump | `Double Jump` | 이단 점프 |
| 4 | mist | `Mist Form` | 안개 변신 |
| 5 | water | `Water Breath` | 수중 호흡 |
| 6 | gravity | `Rev. Gravity` | 역중력 |

**렐릭 1개 블록 너비:** `floor((500 - 16) / 6) = 80px`

**렐릭 한 블록 레이아웃:**

```
+---[ 80px ]---+
|  [12×12 icon] |
|  Dash          |
|  [V] 또는 [?]  |
+--------------+
```

| 항목 | 크기 | 획득 상태 | 미획득 상태 |
| :--- | :--- | :--- | :--- |
| 아이콘 | 12×12px | 픽셀아트 아이콘 (컬러) | `?` 회색 박스 `0x222222` |
| 이름 | 8px | 흰색 `0xFFFFFF` | 어두운 회색 `0x444444` |
| 상태 심볼 | 8px | `[V]` 초록 `0x44FF44` | `[?]` 회색 `0x444444` |

**렐릭은 토글 불가:** 모든 획득 렐릭은 항상 활성 상태다. 상태 심볼은 획득/미획득 표시 전용.

**렐릭 바 전체 다이어그램:**

```
+--[ RELICS ]-------------------------------------------------------+
|  [icon]   [icon]   [?]     [?]     [?]     [?]                    |
|  Dash      Wall   Double   Mist    Water   Rev.                   |
|  [V]       Climb  Jump    Form    Breath  Gravity                 |
|           [V]     [?]     [?]     [?]     [?]                    |
+-------------------------------------------------------------------+
```

**렐릭 구분선:** 각 블록 사이 수직선 없음. 균등 간격만 적용.

---

### 3.6 레벨/경험치 표시 (Level/EXP Display)

중앙 열(161–318px). 패딩 8px. 유효 너비 141px.

**캐릭터 실루엣:**

| 항목 | 값 |
| :--- | :--- |
| 실루엣 크기 | 48×72px (3배 스프라이트 기준) |
| 위치 | 중앙 열 수평 중앙 정렬, 상단 패딩 16px |
| 스프라이트 | Erda idle 애니메이션 (1프레임 정지 또는 idle loop) |
| 배경 | 없음 (패널 배경 그대로) |

**레벨 텍스트:**

```
Lv.5
```

| 항목 | 값 |
| :--- | :--- |
| 폰트 | 8px 흰색 `0xFFFFFF` |
| 위치 | 실루엣 하단 8px 간격, 수평 중앙 정렬 |

**EXP 바:**

| 항목 | 값 |
| :--- | :--- |
| 바 크기 | 60×4px |
| 위치 | Lv 텍스트 하단 4px 간격, 수평 중앙 정렬 |
| 배경 색 | `0x222222` |
| 채움 색 | `0xFFD700` (골드) |
| 채움 비율 | `currentEXP / requiredEXP` |
| 경계 | 없음 (배경색이 컨테이너 역할) |

**EXP 수치 텍스트:**

```
500 / 720
```

| 항목 | 값 |
| :--- | :--- |
| 폰트 | 8px `0xAAAAAA` |
| 위치 | EXP 바 하단 2px 간격, 수평 중앙 정렬 |
| 형식 | `{currentEXP} / {requiredEXP}` |

**레벨업 연출:**

| 단계 | 연출 |
| :--- | :--- |
| 레벨업 순간 | 흰색 플래시 (50ms fade-out) + 레벨 텍스트 1.3배 scale bounce (150ms ease-out) |
| 스탯 수치 | 변경된 수치가 초록으로 1초간 하이라이트 후 흰색으로 복귀 |

레벨업 연출은 STATUS 화면이 열려있는 상태에서 발생할 경우에만 재생한다. 닫힌 상태에서는 다음 오픈 시 이미 갱신된 수치를 정적으로 표시한다.

**중앙 열 수직 레이아웃:**

```
y=0   [패딩 16px]
y=16  캐릭터 실루엣 48×72px
y=88  [간격 8px]
y=96  Lv.N                  (8px 텍스트)
y=106 [간격 4px]
y=110 [====EXP BAR====]     (60×4px)
y=114 [간격 2px]
y=116 500 / 720             (8px 텍스트)
y=126 [하단 여백]
```

---

### 3.7 조작 체계 (Controls)

**전역 조작 (화면 어느 위치에서든 유효):**

| 키 | 동작 |
| :--- | :--- |
| `ESC` | Pause Menu 전체 닫기 |
| `P` | Pause Menu 전체 닫기 |
| `Tab` | 탭 포커스 모드로 전환 |

**콘텐츠 포커스 — 장비 슬롯 영역:**

| 키 | 동작 |
| :--- | :--- |
| `↑` | 이전 슬롯으로 이동 (첫 번째 슬롯에서 탭 포커스 모드로 이동) |
| `↓` | 다음 슬롯으로 이동 |
| `←` | 렐릭 바 포커스로 이동 |
| `→` | 렐릭 바 포커스로 이동 |
| `Z` | 선택된 슬롯의 아이템 Level 3 Detail View 열기 (`UI_Inventory.md §3.6` 재사용) |
| `X` | 선택된 슬롯 장비 해제 (인벤토리 여유 공간 필요) |

**콘텐츠 포커스 — 렐릭 바 영역:**

| 키 | 동작 |
| :--- | :--- |
| `←` `→` | 렐릭 간 이동 |
| `↑` | 장비 슬롯 영역으로 복귀 |
| `Z` | 선택된 렐릭 상세 설명 팝업 (현재 텍스트 한 줄 툴팁, Phase 1 구현 대상) |

**탭 포커스 모드:**

| 키 | 동작 |
| :--- | :--- |
| `←` `→` | 탭 전환 (STATUS / INVENTORY / SETTINGS) |
| `Enter` 또는 `↓` | 콘텐츠 포커스로 복귀 |
| `ESC` | Pause Menu 전체 닫기 |

**Level 3 Detail View 열린 상태:**

`UI_Inventory.md §3.6` 규칙과 동일. X/ESC/Z 재입력으로 닫힘. 본 화면은 Level 3 아래 레이어로 유지된다.

**하단 컨트롤 힌트 바:**

STATUS 탭 콘텐츠 포커스 상태에서 패널 최하단에 1줄 힌트 표시. 렐릭 바 위에 1px 구분선 후 배치.

```
[ESC]Close  [↑↓]Slots  [Z]Detail  [X]Unequip
```

| 항목 | 값 |
| :--- | :--- |
| 폰트 | 8px `0xAAAAAA` |
| 위치 | 렐릭 바 상단 구분선 위 4px |

---

## 4. 엣지 케이스 (Edge Cases)

| 상황 | 처리 방식 |
| :--- | :--- |
| 아무 장비도 착용하지 않은 상태로 화면 열기 | 모든 슬롯 "—" 표시. 스탯 패널에 BaseStat만 표시. EquipStat/Memory ShardBonus 분해 행 = 0으로 표시 |
| 해제 시 인벤토리가 가득 찬 경우 | X 키 입력 시 "INVENTORY FULL" 토스트 3초 표시. 장비 해제 미실행 |
| 해제 후 FinalATK가 ATK Gate 임계값 미달이 되는 경우 | 해제 허용. 게이트 상태 표시만 `[OK]` → `[!!]`로 갱신. 현재 위치에서 강제 이동 없음 |
| FinalINT가 0인 상태 (INT 장비 미착용) | `INT Gate [!!] need +50` 표시. 게이트 미통과 상태 유지 |
| Lv.10 최대 레벨 상태 | EXP 바 완전 채움(금색). 수치 텍스트 `"MAX"` 표시. 레벨업 연출 없음 |
| EXP가 requiredEXP를 초과한 채로 화면 진입 (레벨업 미처리 버그) | EXP 바 클램프: `min(currentEXP, requiredEXP)`. 수치는 실제값 표시. 레벨업 처리 선행이 정상 경로 |
| Phase 1에서 잠긴 슬롯 Z 키 입력 | 동작 없음 (아무 반응 없음) |
| Phase 1에서 잠긴 슬롯 X 키 입력 | 동작 없음 |
| 렐릭 0개 획득 상태 | 렐릭 바 6개 모두 `[?]` 회색 표시. 렐릭 바 타이틀/구분선은 항상 표시 |
| 렐릭 Z 키 상세 — Phase 1 미구현 렐릭 | `[?]` 렐릭에 Z 입력 시 툴팁 없음. 획득 렐릭에만 한 줄 설명 툴팁 표시 |
| 캐릭터 실루엣 스프라이트 로드 실패 | 48×72 회색 `0x333333` 사각형으로 폴백 |
| ATK Gate 임계값이 현재 스탯보다 훨씬 높을 때 (need +N이 세 자리 이상) | 최대 `need +999` 표기. 이상은 `need +999+` 로 절단 |
| Lv.1 상태에서 EXP = 0 | EXP 바 완전 비움. `0 / 100` 표시 |
| STATUS 화면 열린 상태에서 레벨업 발생 (외부 EXP 인입 등) | 스탯 수치 실시간 갱신. 레벨업 연출 재생. EXP 바 즉시 갱신 |
| 스탯 분해 표시 중 장비 해제로 수치 변경 | 분해 표시 즉시 갱신 (장비 해제 이벤트 수신 후 리드로우) |
| SETTINGS 탭에서 STATUS 탭으로 전환 시 슬롯 포커스 | 마지막 선택 슬롯 유지. 없으면 첫 번째 슬롯(Blade) 선택 |
| DEF/RES가 0 (BaseStat+EquipStat 모두 0일 때) | `DEF   0` / `RES   0` 으로 표시. 숨기지 않음 |

---

## 5. 검증 체크리스트 (Acceptance Criteria)

### 기능 검증

**접근 경로:**
- [ ] ESC 키를 누르면 Pause Menu가 열리고 STATUS 탭이 기본 선택됨
- [ ] Tab/← → 로 STATUS/INVENTORY/SETTINGS 탭 전환 가능
- [ ] INVENTORY 탭 전환 시 `UI_Inventory.md` 화면으로 교체됨
- [ ] ESC 재입력 또는 P 키로 Pause Menu 전체 닫힘

**스탯 패널:**
- [ ] ATK/INT/HP 수치가 FinalStat 공식(`BaseStat + EquipStat + Memory ShardBonus`)과 일치함
- [ ] DEF = `floor(FinalATK × 0.3)`, RES = `floor(FinalINT × 0.4)` 로 계산됨
- [ ] 장비 착용/해제 즉시 스탯 수치 갱신됨
- [ ] ATK Gate: FinalATK >= 100 이면 `[OK]` 초록, 미달이면 `[!!]` 빨강 + `need +N` 표시
- [ ] INT Gate: FinalINT >= 50 이면 `[OK]` 초록, 미달이면 `[!!]` 빨강 + `need +N` 표시
- [ ] 슬롯 선택 시 스탯 분해(Base/Equip/Memory Shard/Final) 팝업이 스탯 패널에 표시됨

**장비 슬롯:**
- [ ] Phase 1: Blade 슬롯만 활성, 나머지 LOCKED 표시
- [ ] 장착 중 아이템은 레어리티 색상 아이콘 + 아이템명 표시
- [ ] 빈 슬롯은 `0x333333` 아이콘 박스 + `"—"` 표시
- [ ] ↑↓ 키로 슬롯 간 이동, 선택된 슬롯 하이라이트 표시
- [ ] 슬롯 선택 시 우측 패널이 Level 2 Info Box로 교체됨 (아이템명/레어리티/스탯 표시)
- [ ] X 키로 선택된 슬롯 장비 해제, 인벤토리 가득 차면 "INVENTORY FULL" 토스트
- [ ] Z 키로 Level 3 Detail View 오버레이 열림 (UI_Inventory.md §3.6 규칙 동일)

**레벨/EXP:**
- [ ] 중앙 열에 `Lv.{N}` 텍스트가 올바른 레벨을 표시함
- [ ] EXP 바가 `currentEXP / requiredEXP` 비율로 채워짐
- [ ] EXP 수치 `{current} / {required}` 표시가 정확함
- [ ] Lv.10 시 바 완전 채움 + `"MAX"` 텍스트 표시
- [ ] 레벨업 시 흰색 플래시 + 레벨 텍스트 bounce 연출 재생

**렐릭 목록:**
- [ ] 획득 렐릭: 아이콘 컬러 + 이름 흰색 + `[V]` 초록
- [ ] 미획득 렐릭: `?` 회색 아이콘 + 이름 어두운 회색 + `[?]` 회색
- [ ] ← → 키로 렐릭 간 이동, 선택 하이라이트 표시
- [ ] Z 키로 획득 렐릭 툴팁 표시 (미획득은 반응 없음)
- [ ] 렐릭 수 6개 고정, 모두 표시됨

**공통:**
- [ ] 패널 배경 `0x1A1A2E` alpha 0.95, 테두리 `0x4A4A6A` 1px
- [ ] 모든 폰트는 8px 픽셀 폰트 사용
- [ ] 하단 컨트롤 힌트 바에 현재 포커스 기준 유효 키 표시

### 경험 검증

- [ ] 화면을 열자마자 3초 이내에 현재 ATK Gate 통과 여부와 부족분을 파악할 수 있음
- [ ] 스탯 분해 표시(Base/Equip/Memory Shard)를 통해 "기억 단편를 더 강화하면 ATK가 얼마나 오르는지" 즉시 가늠 가능
- [ ] 렐릭 바의 `[?]` 항목이 "아직 발견하지 못한 능력이 있다"는 탐험 동기를 자극함
- [ ] 슬롯에서 Z를 눌렀을 때 Level 3 Detail View가 인벤토리 화면과 동일한 레이아웃으로 열려 학습 비용이 없음
- [ ] 레벨업 연출이 과하지 않고 화면 전환을 방해하지 않음 (150ms 이내 완료)

---

*연계 문서: `Documents/UI/UI_Inventory.md` (Level 2/3 Info Box), `Documents/System/System_Equipment_Slots.md` (슬롯 구조), `Documents/System/System_Growth_LevelExp.md` (레벨/EXP 공식), `Documents/System/System_Growth_Stats.md` (FinalStat 공식)*
