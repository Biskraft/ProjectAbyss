> **✅ 3스탯 체계 적용 완료:** 스탯 게이트 참조를 ATK 스탯 게이트 + 능력 게이트로 치환 완료. System_World_StatGating.md 참조.

# WorldLayout GridVania 분석 — Project Abyss

> 분석 대상: `game/public/assets/World_ProjectAbyss_Layout.ldtk`
> 분석 기준일: 2026-03-26
> 작성자: Level Designer

---

## 1. 원본 레벨 데이터 (LDtk 추출)

아래는 LDtk 파일에서 직접 추출한 전체 22개 레벨의 좌표 데이터이다.
좌표 단위: 픽셀. 그리드 단위 환산: 256px = 1 grid unit.

| # | 레벨 이름 | worldX | worldY | pxWid | pxHei | gridW | gridH | roomType | worldDepth |
|:--|:----------|-------:|-------:|------:|------:|------:|------:|:---------|:----------:|
| 01 | Entrance | 0 | 0 | 512 | 256 | 2 | 1 | Entrance | 0 |
| 02 | Cross_roads | 0 | 256 | 512 | 512 | 2 | 2 | — | 0 |
| 03 | Ossuary | -1024 | 0 | 512 | 768 | 2 | 3 | — | 0 |
| 04 | Water_supply | -512 | 0 | 512 | 512 | 2 | 2 | — | 0 |
| 05 | Garden | 512 | -256 | 512 | 512 | 2 | 2 | — | 0 |
| 06 | Large_water | 1024 | -256 | 512 | 512 | 2 | 2 | — | 0 |
| 07 | The_tower | 1536 | -256 | 256 | 768 | 1 | 3 | — | 0 |
| 08 | Shop_entrance | 512 | 256 | 256 | 256 | 1 | 1 | — | 0 |
| 09 | Pit | 768 | 256 | 256 | 512 | 1 | 2 | — | 0 |
| 10 | SaveRoom | 1024 | 256 | 256 | 512 | 1 | 2 | Save | 0 |
| 11 | Hidden_cave | 1280 | 256 | 256 | 512 | 1 | 2 | — | 0 |
| 12 | Sewers1 | 512 | 512 | 256 | 512 | 1 | 2 | — | 0 |
| 13 | Boss_room | 1536 | 512 | 512 | 768 | 2 | 3 | Boss | 0 |
| 14 | The_ponds | 768 | 768 | 768 | 256 | 3 | 1 | — | 0 |
| 15 | Sewers2 | 256 | 1024 | 512 | 512 | 2 | 2 | — | 0 |
| 16 | Flooded_rooms | 1024 | 1024 | 512 | 512 | 2 | 2 | — | 0 |
| 17 | Sewers_trash | 256 | 1536 | 512 | 512 | 2 | 2 | — | 0 |
| 18 | Shop | 256 | 0 | 768 | 768 | 3 | 3 | Shop | 1 |
| 19 | Long_hallway | 1536 | 256 | 1792 | 256 | 7 | 1 | — | 1 |
| 20 | Exit | 2816 | 0 | 512 | 256 | 2 | 1 | Exit | 1 |
| 21 | Shortcut_passage | 512 | 768 | 768 | 768 | 3 | 3 | — | 1 |
| 22 | World_Level_21 | 1792 | 256 | 512 | 256 | 2 | 1 | — | 0 |

> **worldDepth 주의:** depth=1인 레벨(Shop, Long_hallway, Exit, Shortcut_passage)은
> 공간적으로 겹치는 평행 레이어에 배치되어 있다. 실제 플레이 레이어(depth=0)와
> 구분해야 하며, 텔레포트 또는 특수 전환을 통해 진입한다.

---

## 2. ASCII 월드 맵

단위: 1칸 = 256px. X축: 음수(-) 방향이 왼쪽. 좌표 기준점(0,0)은 Entrance 좌상단.

```
     X: -4  -3  -2  -1   0   1   2   3   4   5   6   7   8   9  10  11  12  13
Y: -1   [OSS    ]  [WS  ]  [ENT ]  [GRD ]  [LWR ]  [TWR]
         -1024       -512      0      512    1024    1536

Y:  0   [OSS    ]  [WS  ]  [ENT ]  [GRD ]  [LWR ]  [TWR]

Y:  1   [OSS    ]           [CR  ]  [SE ]  [PIT]  [SV]  [HC]  [BR  ]
                             0,256   512   768    1024  1280   1536

Y:  2                        [CR  ]  [SW1]  [PIT]  [SV]  [HC]  [BR  ]

Y:  3               [SWR2]   [SWR2]  [TP            ]  [FLR ]   [BR  ]
                     256      512     768             1024,1024  1536

Y:  4               [SWR2]   [SWR2]

Y:  5               [SWT ]   [SWT ]

Y:  6               [SWT ]   [SWT ]
```

위 표현이 불명확하므로 아래 상세 그리드로 대체한다.

---

### 2-A. 플레이 레이어 (worldDepth = 0) 전체 배치도

```
그리드 좌표 (X: 왼쪽 음수 / Y: 위쪽 음수)

       -4  -3  -2  -1   0  +1  +2  +3  +4  +5  +6  +7
  -1  [OS][OS][WS][WS][EN][EN][GD][GD][LW][LW][TW]
   0  [OS][OS][WS][WS][EN][EN][GD][GD][LW][LW][TW]
  +1  [OS]              [CR][CR][SE][PI][SV][HC][TW]
  +2  [OS]              [CR][CR][SE][PI][SV][HC][BR][BR]
  +3  [OS]                      [S1][  ][  ][  ][BR][BR]
  +4                    [S2][S2][TP][TP][TP][FL][FL][BR]
  +5                    [S2][S2][  ]         [FL][FL]
  +6                    [ST][ST]
  +7                    [ST][ST]
```

범례:
- EN = Entrance (2x1)
- CR = Cross_roads (2x2)
- OS = Ossuary (2x3)
- WS = Water_supply (2x2)
- GD = Garden (2x2)
- LW = Large_water (2x2)
- TW = The_tower (1x3)
- SE = Shop_entrance (1x1)
- PI = Pit (1x2)
- SV = SaveRoom (1x2)
- HC = Hidden_cave (1x2)
- BR = Boss_room (2x3)
- S1 = Sewers1 (1x2)
- TP = The_ponds (3x1)
- S2 = Sewers2 (2x2)
- FL = Flooded_rooms (2x2)
- ST = Sewers_trash (2x2)

---

### 2-B. 정밀 배치 맵 (픽셀 좌표 기준, 단위 = 256px)

```
px/256:  -4   -3   -2   -1    0    1    2    3    4    5    6    7
         ┌────────────────────────────────────────────────────────┐
Y=-1     │[──Ossuary──][WS──][──Entrance──][──Garden──][LW──][TW]│
         │             ──]                 ──]          ──]       │
Y= 0     │[──Ossuary──][WS──][──Cross_rds─][SE][PI][SV][HC][BR──]│
Y= 1     │[──Ossuary──]      [──Cross_rds─][  ][  ][  ][  ][BR──]│
Y= 2     │                   [   ][S1]     [The──Ponds──][FL──][BR]
Y= 3     │                   [S2──][  ]                  [FL──]   │
Y= 4     │                   [S2──][  ]                           │
Y= 5     │                   [ST──]                               │
Y= 6     │                   [ST──]                               │
         └────────────────────────────────────────────────────────┘

주의: 위 맵은 개략적 표현이며 픽셀 정밀도보다 공간 관계 파악에 집중.
```

---

### 2-C. 핵심 구역 배치 요약 (그리드 단위, 256px = 1 grid unit)

```
         X →  -4  -3  -2  -1   0   1   2   3   4   5   6   7
         Y
         ↓
        -1    OS  OS  WS  WS  EN  EN  GD  GD  LW  LW  TW  .
         0    OS  OS  WS  WS  EN  EN  GD  GD  LW  LW  TW  .
         1    OS  OS  .   .   CR  CR  SE  PI  SV  HC  TW  BR
         2    OS  .   .   .   CR  CR  S1  .   .   .   .   BR
         3    .   .   .   .   .   S1  .   .   .   .   .   BR
         4    .   .   .   .   S2  S2  TP  TP  TP  FL  FL  .
         5    .   .   .   .   S2  S2  .   .   .   FL  FL  .
         6    .   .   .   .   ST  ST  .   .   .   .   .   .
         7    .   .   .   .   ST  ST  .   .   .   .   .   .
```

범례 동일. `.` = 빈 공간.

---

## 3. 루트 타입별 룸 분류

| 분류 | 룸 이름 | 역할 |
|:-----|:--------|:-----|
| **E** Entrance | Entrance | 게임 시작점, 플레이어 스폰 |
| **B** Boss | Boss_room | 보스 전투 (Fire_blade + Healing_potion 드롭) |
| **S** Shop | Shop | 상점 (Meat 5G, Armor 100G, Vorpal_blade 500G) |
| **V** Save | SaveRoom | 세이브 포인트 (GameSaver 엔티티) |
| **X** Exit | Exit | 레벨 탈출구 (Exit 엔티티) |
| **H** Hidden | Hidden_cave | 숨겨진 동굴 (옵셔널) |
| — 일반 탐험 | Cross_roads, Ossuary, Water_supply, Garden, Large_water, The_tower, Shop_entrance, Pit, Sewers1, The_ponds, Sewers2, Flooded_rooms, Sewers_trash, World_Level_21 | 탐험/전투 구역 |

---

## 4. 룸 연결 그래프 (엣지 공유 분석)

공유 엣지(shared edge)는 두 룸의 픽셀 경계가 일치하는 경우다.
depth=0 레이어 기준으로 분석한다.

```
[Entrance (0,0, 2×1)]
  ↔ West  : Water_supply (-512,0) → X축 공유 (-512+512=-0, 경계 일치)
  ↔ East  : Garden (512,-256) → Y축 불일치 (Y=-256 vs Y=0) — 인접 X만
  ↔ South : Cross_roads (0,256) → Y=256 경계 일치 ★

[Cross_roads (0,256, 2×2)]
  ↔ North : Entrance ★
  ↔ West  : Water_supply (-512,0) → Y 범위 일부 겹침 (256~512 vs 0~512) ★
  ↔ East  : Shop_entrance (512,256) → X=512 경계 일치 ★
  ↔ South : Sewers2 (256,1024) → Y 불일치 (768 vs 1024) — 직접 연결 없음

[Water_supply (-512,0, 2×2)]
  ↔ East  : Entrance (0,0) → X=0 경계, Y 범위 일치 (0~256 vs 0~512 겹침) ★
  ↔ East  : Cross_roads → X=0 경계, Y 범위 (256~512) 겹침 ★
  ↔ West  : Ossuary (-1024,0) → X=-512 경계 일치 ★

[Ossuary (-1024,0, 2×3)]
  ↔ East  : Water_supply ★

[Garden (512,-256, 2×2)]
  ↔ East  : Large_water (1024,-256) → X=1024 경계 일치 ★
  ↔ South : Shop_entrance (512,256) → Y=256 경계 일치, X=512~768 ★
  ↔ South : Pit (768,256) → Y=256 경계, X=768~1024 ★

[Large_water (1024,-256, 2×2)]
  ↔ West  : Garden ★
  ↔ East  : The_tower (1536,-256) → X=1536 경계 일치 ★
  ↔ South : SaveRoom (1024,256) → Y=256 경계 일치 ★

[The_tower (1536,-256, 1×3)]
  ↔ West  : Large_water ★
  ↔ South : Boss_room (1536,512) → Y=512 경계, X=1536~1792 일치 ★

[Shop_entrance (512,256, 1×1)]
  ↔ North : Garden ★
  ↔ East  : Pit (768,256) → X=768 경계 일치 ★
  ↔ West  : Cross_roads → X=512 경계 일치 ★
  ↔ South : Sewers1 (512,512) → Y=512 경계 일치 ★

[Pit (768,256, 1×2)]
  ↔ West  : Shop_entrance ★
  ↔ East  : SaveRoom (1024,256) → X=1024 경계 일치 ★
  ↔ North : Garden ★

[SaveRoom (1024,256, 1×2)]
  ↔ West  : Pit ★
  ↔ East  : Hidden_cave (1280,256) → X=1280 경계 일치 ★
  ↔ North : Large_water ★

[Hidden_cave (1280,256, 1×2)]
  ↔ West  : SaveRoom ★
  ↔ East  : Boss_room (1536,512) → X 불일치 (1536 vs 1280+256=1536) Y 불일치 ★

[Sewers1 (512,512, 1×2)]
  ↔ North : Shop_entrance ★
  ↔ South : The_ponds → Y=768 경계, X=512~768 ★

[The_ponds (768,768, 3×1)]
  ↔ West  : Sewers1 → X=768 부분 경계 ★
  ↔ South : Sewers2 (256,1024) → Y=1024 경계, X=768~1024 겹침 ★
  ↔ South : Flooded_rooms (1024,1024) → Y=1024, X=1024~1536 ★

[Sewers2 (256,1024, 2×2)]
  ↔ North : The_ponds 일부 ★
  ↔ South : Sewers_trash (256,1536) → Y=1536 경계 일치 ★

[Flooded_rooms (1024,1024, 2×2)]
  ↔ North : The_ponds ★

[Sewers_trash (256,1536, 2×2)]
  ↔ North : Sewers2 ★

[Boss_room (1536,512, 2×3)]
  ↔ North : The_tower (Y=512 vs The_tower bottom Y=-256+768=512) ★
  ↔ West  : Hidden_cave (X=1536, Y=256~768 겹침) ★
```

### 연결 그래프 요약

```
Ossuary ── Water_supply ── Entrance ── Cross_roads ── Shop_entrance ─┬─ Sewers1 ── The_ponds ─┬─ Sewers2 ── Sewers_trash
                                                         │            │                         └─ Flooded_rooms
                                                         │            └─ Pit ── SaveRoom ── Hidden_cave ── Boss_room
                                                         │                        │
                                                         │                  Large_water ── Garden
                                                         │                        └─ The_tower ── Boss_room
                                                         │
                                                    (East gate)
```

**핵심 연결 허브:** Cross_roads (동서남북 모두 연결 가능한 중앙 거점)

---

## 5. 엔티티 배치 요약

### 5-1. Entrance (E=Entrance)

| 엔티티 | 위치 (grid) | 상세 |
|:-------|:-----------|:-----|
| Player | [18, 10] | 초기 인벤토리: Ammo x?, Bow / HP=10 |
| Item: HL | [28, 10] | count=100 |
| Item: Healing_potion | [3, 5] | count=1 |
| Item: Ammo | [7, 5] | count=5 |
| Ladder | [5, 6] | 높이 80px (세로 이동 구조물) |

### 5-2. Boss_room (B=Boss)

| 엔티티 | 위치 (grid) | 상세 |
|:-------|:-----------|:-----|
| Item: Fire_blade | [23, 20] | 보스 보상 |
| Item: Healing_potion | [25, 20] | 보스 보상 |

> 보스 엔티티 자체는 별도 시스템에서 스폰 (LDtk에 인스턴스 없음)

### 5-3. Shop (S=Shop) — worldDepth=1

| 엔티티 | 위치 (grid) | 가격 | 상세 |
|:-------|:-----------|-----:|:-----|
| Item: Meat | [20, 21] | 5G | 회복 아이템 |
| Item: Armor | [23, 21] | 100G | 방어구 |
| Item: Vorpal_blade | [26, 21] | 500G | 고급 무기 |
| Item: (추가 확인 필요) | [29, 21] | — | — |

### 5-4. SaveRoom (V=Save)

| 엔티티 | 위치 (grid) | 상세 |
|:-------|:-----------|:-----|
| GameSaver | [7, 6] | 세이브 트리거 영역 (32x48px) |

### 5-5. Exit (X=Exit) — worldDepth=1

| 엔티티 | 위치 (grid) | 상세 |
|:-------|:-----------|:-----|
| Exit | [1, 8] | 탈출구 트리거 (48x48px) |
| Ladder | [27, 13] | 이동 구조물 |

### 5-6. Ossuary

| 엔티티 | 위치 (local px) | 상세 |
|:-------|:----------------|:-----|
| Item: Armor | (248, 672) | 깊은 하단에 배치 (worldY=672) |
| Item: Fire_blade | (120, 672) | 깊은 하단에 배치 |
| Ladder | (336, 576) | 내부 수직 이동 |

### 5-7. Cross_roads

| 엔티티 | 내용 |
|:-------|:-----|
| Ladder | (448, 256) 위치, 높이 160px — 핵심 수직 이동축 |

---

## 6. 토폴로지 분석

### 6-1. 구조 유형 판정

이 월드는 **변형된 허브-앤-스포크(Hub-and-Spoke) + 선형 코어** 구조다.

```
[좌측 사이드] ── [중앙 허브] ── [우측 메인 경로] ── [보스]
   Ossuary          Cross_roads     Pit/SaveRoom/     Boss_room
   Water_supply     Shop_entrance   Hidden_cave
                    Sewers1

[하단 수직 선형]
   Cross_roads → The_ponds → Sewers2 → Sewers_trash

[상단 수평 선형]
   Garden → Large_water → The_tower
                             ↓
                           Boss_room
```

### 6-2. 주요 경로 분석

**Critical Path (최단 클리어 루트):**
```
Entrance → Cross_roads → Shop_entrance → Pit → SaveRoom → Hidden_cave → Boss_room
```
- 총 6개 룸 통과
- 세이브 포인트 1회 경유
- 예상 플레이타임: 20-40분 (탐험 속도 의존)

**대안 경로 (우회 루트):**
```
Entrance → Cross_roads → Shop_entrance → Sewers1 → The_ponds → Flooded_rooms
                                                                (막힌 구조 — 우측 출구 필요)
```

**상단 루트 (능력 게이트 후보):**
```
Entrance → Garden → Large_water → The_tower → Boss_room
```
- 직접 Garden 진입이 Entrance에서 막혀 있을 경우 (스탯/능력 게이트 설정 시) 후반 루트가 됨

**선택적 탐험:**
- Ossuary: 왼쪽 사이드 브랜치, 보상은 Armor + Fire_blade (고가치)
- Hidden_cave: 이름상 숨겨진 구역, Boss_room 진입 직전에 위치
- Flooded_rooms: 하단 탐험 루트 끝 구간

### 6-3. 세계 규모

```
X 범위: -1024 ~ 2048 (총 3072px = 12 grid unit)
Y 범위: -256 ~ 2048 (총 2304px = 9 grid unit)
```
- 총 룸 수: 22개 (depth=0: 18개, depth=1: 4개)
- depth=1(병렬 공간): Shop, Long_hallway, Exit, Shortcut_passage
- 세계 총 면적(depth=0 기준): 약 15,000px² → 비선형 분기 구조

### 6-4. 수직/수평 비율

- 수평으로 넓은 구조 (X 12 unit vs Y 9 unit)
- 하단은 수직 하강 루트 (Sewers 계열)
- 우상단은 The_tower의 수직 상승 구조 (1x3 그리드)
- 전체적으로 좌우 분기 + 중앙 허브 패턴

---

## 7. depth=1 병렬 공간 분석

| 레벨 | 좌표 | 크기 | 역할 추정 |
|:-----|:-----|:-----|:---------|
| Shop | (256,0) | 3×3 | 상점 내부 공간 (Shop_entrance에서 텔레포트 진입) |
| Long_hallway | (1536,256) | 7×1 | 보스 전 긴 복도 (분위기 전환, 텐션 빌드업) |
| Exit | (2816,0) | 2×1 | 레벨 클리어 엔딩 공간 |
| Shortcut_passage | (512,768) | 3×3 | 되돌아오는 숏컷 경로 (메트로베니아 관용 설계) |

**설계 의도 추정:**
- Shop은 별도 레이어에 존재 → 상점은 "다른 차원"에 존재하는 느낌 연출 가능
- Long_hallway는 Boss_room 진입 전 긴장감 조성용 복도
- Shortcut_passage는 탐험 후 되돌아올 때 사용하는 빠른 귀환로

---

## 8. Project Abyss 설계 연계 권고사항

### 8-1. 2-Space 모델과의 정합성

현재 LDtk 레이아웃은 **월드(World) 공간**에 해당하며, Project Abyss의 2-Space 모델에서
가장 핵심적인 "탐험가 판타지"를 구현하는 레이어다.

| 설계 원칙 | 현재 레이아웃 적용 상태 | 권고 사항 |
|:---------|:----------------------|:---------|
| 스탯 게이트 | 미설정 (룸 타입에 gate 정보 없음) | Garden/Ossuary 진입에 ATK 스탯 게이트 추가 권고 |
| 능력 게이트 | 미설정 | The_tower 진입에 벽 타기, Flooded_rooms에 수중 호흡 게이트 추가 |
| Critical Path 보장 | Cross_roads → Shop_entrance → SaveRoom → Boss_room 경로 명확 | 현재 구조 유지 |
| 탐험 보상 배치 | Ossuary 하단에 Fire_blade/Armor 배치됨 (탐험 유도) | 적절 |

### 8-2. 메트로베니아 철학 적용 포인트

**능력 게이트 후보 위치:**

1. **Entrance → Garden (동쪽 상단 경계)**
   - 현재: 직접 인접 가능
   - 권고: 이단 점프(Double Jump) 게이트 설정 → 초반에는 접근 불가, 능력 획득 후 개방
   - 이유: Garden → Large_water → The_tower 경로는 보스에 이르는 "상급 루트"

2. **Cross_roads → Water_supply (서쪽 경계)**
   - 현재: 직접 이동 가능
   - 권고: ATK 스탯 게이트 (물리 장벽) → Ossuary는 중-후반 탐험 구역으로 배치

3. **Sewers1 → The_ponds (하단 경계)**
   - 권고: 수중 호흡 능력 게이트 → Sewers/수중 계열 구역 접근 제한

4. **Hidden_cave (이름 그대로 숨겨진 진입)**
   - 권고: 시각적 힌트만으로 발견 유도 (숨겨진 경로)

### 8-3. 페이싱 개선 제안

현재 배치 기준 강도 곡선 추정:

```
강도
 5 |                                              [Boss]
 4 |                              [Hidden][Ponds]
 3 |          [Ossuary]    [Shop_ent]   [SaveRoom]
 2 |  [Start]          [Cross]              [Sewers]
 1 |  Entrance                                  [Sewers_trash]
   +──────────────────────────────────────────────────────→ 시간
       0%    15%    30%    45%    60%    75%    90%  100%
```

**휴식 포인트 (Rest Point) 확인:**
- SaveRoom: 적절한 위치 (보스 직전 2-3룸 전)
- Shop: 중반부에 배치 → 상점 접근이 자연스러운 흐름

**페이싱 이슈:**
- Ossuary는 서쪽 사이드 브랜치인데 Fire_blade라는 강력한 아이템을 보유 → 조기 과강화 우려
  - 권고: ATK 스탯 게이트로 Ossuary를 중반 이후 구역으로 잠금 설정

### 8-4. 내러티브 공간 활용

| 룸 이름 | 환경 스토리텔링 기회 |
|:--------|:-------------------|
| Ossuary | 해골/뼈 장식 → 죽은 탐험가들의 흔적, 세계의 위험성 암시 |
| Water_supply | 오래된 수로 시설 → 과거 문명의 흔적 |
| Sewers 계열 | 퇴락한 하수도 → 세계의 부패/방치된 구역 |
| The_tower | 높은 탑 → 멀리서 보이는 랜드마크, 목표 지점의 시각적 신호 |
| Boss_room | The_tower 아래 위치 → 탑을 지키는 존재의 본거지 |
| Flooded_rooms | 물에 잠긴 방들 → 환경 재앙이나 수중 능력 게이트 구역 |

### 8-5. 아이템계(Item World) 연계 포인트

월드에서 획득하는 아이템들이 아이템계의 씨앗이 된다:

| 월드 아이템 획득 위치 | 아이템 | 아이템계 지층 수 (등급 추정) |
|:--------------------|:-------|:---------------------------|
| Entrance | Healing_potion, Ammo, HL | Normal (2지층) |
| Ossuary 하단 | Armor, Fire_blade | Rare 이상 권고 (3지층) |
| Boss_room | Fire_blade | Legendary 권고 (4지층) |
| Shop 구매 | Vorpal_blade (500G) | Rare-Legendary |

---

## 9. 요약 및 다음 단계

### 현재 레이아웃 강점

1. **중앙 허브 Cross_roads** — 동서남북 분기 구조로 플레이어에게 방향 선택권 부여
2. **SaveRoom의 위치** — 보스 직전 적절한 휴식 배치
3. **depth=1 병렬 공간** — Shop의 별도 레이어 처리는 독특한 공간감 연출 가능
4. **수직 다양성** — The_tower (수직 상승) + Sewers (수직 하강) 병존
5. **Shortcut_passage** — 메트로베니아 되돌아오기 설계 존재

### 개선 권고 사항

1. **게이트 시스템 미적용** → 모든 룸이 이론상 즉시 접근 가능. 스탯/능력 게이트 정의 필요
2. **세이브 포인트 1개** → 월드 규모 대비 부족. Ossuary 또는 Sewers2 구역에 추가 검토
3. **Ossuary 고보상 조기 접근** → ATK 스탯 게이트로 중반 잠금 권고
4. **The_ponds-Flooded_rooms 하단 루트** → 출구가 없는 막힌 구조. 순환 연결 또는 숏컷 추가 필요
5. **World_Level_21 미명명** → 자동 생성 이름, 콘텐츠 미완성 룸으로 추정. 설계 완료 필요

---

*이 문서는 LDtk 파일 직접 분석을 기반으로 작성되었으며,
실제 게임 빌드와의 정합성은 프로토타입 플레이 테스트를 통해 검증해야 한다.*
