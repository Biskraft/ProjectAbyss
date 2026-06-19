# 아이템계 방 템플릿 분류 설계

> **상위 문서:** `Design_ItemWorld_LevelGeneration.md` / `Task_ItemWorld_VariableRoomGen.md`
> **근거:** Dead Cells TMX 668개 방 파싱 분석 (`Research_DeadCells_BiomeAnalysis.md`) + 3축 원칙 (`Design_Level_Standards.md` §0-C)
> **작성:** 2026-06-19

---

## 0. 설계 전제

- 아이템계 이동 축 = **Y⁻ (하강)**. 방 템플릿 설계는 이 방향성을 물리적으로 뒷받침한다.
- 풋프린트 기본 단위 = **16×16 타일 (256×256px)**. 모든 방 크기는 이 단위의 정수배.
- 현재 고정 방 크기 3×2(48×32 타일) = 레거시 호환 유지. 신규 템플릿은 이 위에 추가.
- Dead Cells 표준 방 중앙값(40×27 타일, 24px 기준) → ECHORIS 16px 환산 = **약 60×40 타일**.
- 레이어 분리 원칙: 충돌(col) + 연결(lnk) 분리. 비주얼은 별도 데코 레이어.

---

## 1. 방 분류 체계

| 클래스 | 코드 | 풋프린트 | 타일 (16px) | 픽셀 | Dead Cells 근거 |
|---|---|---|---|---|---|
| 소형 | S | 2×1 | 32×16 | 512×256 | Prison 단순 전투방, 평균 충전율 40% |
| 중형 가로 | M-H | 3×2 | 48×32 | 768×512 | 레거시 방. Prison/Castle 중앙값 |
| 대형 가로 | L-H | 4×2 | 64×32 | 1024×512 | Ossuary/Pit 전투 특화, w=40-65 |
| 중형 세로 | M-V | 2×3 | 32×48 | 512×768 | SewerLabyrinth/Astrolab, h=30-50 |
| 대형 세로 | L-V | 2×4 | 32×64 | 512×1024 | PurpleGarden/StiltVillage, h=60-100 |
| 수직 샤프트 | SHAFT | 1×6 이상 | 16×96+ | 256×1536+ | Bank(450타일), Observatory(151타일) |
| 광장 (입구) | PLAZA | 3×3 | 48×48 | 768×768 | Courtyard/Cemetery 정방형 89개 |

---

## 2. 클래스별 상세 스펙

### S — 소형 (32×16 타일)

**용도:** 복도 전투, 빠른 통과, 보조 곁가지

| 항목 | 값 |
|---|---|
| 풋프린트 | 2×1 |
| 크기 | 32×16 tiles (512×256px) |
| 출구 수 | 1-2개 (L/R 중심) |
| 충전율 목표 | 55-70% (복도형 밀도) |
| 플랫폼 층 수 | 1-2층 |
| 수직 이동 | 없음 또는 단차 1회 |
| 전투 밀도 | 낮음 (통과 위주) |

**Dead Cells 레퍼런스:** `SewerLabyrinth/SewerDepthsEndItems.tmx` (30×7), `PrisonCorrupt` 전반

**플랫폼 패턴 (Tiled 확인 대상):**
- `Prison/Pr1-Pr5`: 단순 바닥+플랫폼 1층 패턴
- `SewerCorridor` 전반: 긴 수평 복도 구조

---

### M-H — 중형 가로 (48×32 타일, 레거시 호환)

**용도:** 표준 전투방, 탐색방, 기억방

| 항목 | 값 |
|---|---|
| 풋프린트 | 3×2 |
| 크기 | 48×32 tiles (768×512px) |
| 출구 수 | 2-3개 (L/R/D) |
| 충전율 목표 | 35-50% |
| 플랫폼 층 수 | 2-3층 |
| 수직 이동 | 점프 1-2회 (단차 ≤4 타일) |
| 전투 밀도 | 중간 |

**Dead Cells 레퍼런스:** `Prison/Pr10-Pr40` (평균 37×24), `Castle` 전반 (평균 41×22)

**플랫폼 패턴 (Tiled 확인 대상):**
- `Prison/Pr10~Pr30`: 2층 지그재그 플랫폼
- `Castle/CastleCombat1~10`: 좌우 비대칭 플랫폼 배치

---

### L-H — 대형 가로 (64×32 타일)

**용도:** 전투 특화 아레나, 보스 전(前) 방, 야리코미 하이라이트

| 항목 | 값 |
|---|---|
| 풋프린트 | 4×2 |
| 크기 | 64×32 tiles (1024×512px) |
| 출구 수 | 1-2개 (단방향 강제) |
| 충전율 목표 | 30-45% |
| 플랫폼 층 수 | 2-4층 |
| 수직 이동 | 점프 복수 + 낙하 구간 포함 가능 |
| 전투 밀도 | 높음 (적 3-5체) |

**Dead Cells 레퍼런스:** `Ossuary` (w=40-65, 평균 충전율 높음), `Pit` (w=66-100)

**플랫폼 패턴 (Tiled 확인 대상):**
- `Ossuary/Oss1~Oss10`: 넓은 아레나 + 다층 플랫폼
- `Pit` 전반: 가로로 넓은 구덩이 구조

---

### M-V — 중형 세로 (32×48 타일)

**용도:** 수직 하강 구간, 유체 충전 컬럼, 하강 리듬 전환

| 항목 | 값 |
|---|---|
| 풋프린트 | 2×3 |
| 크기 | 32×48 tiles (512×768px) |
| 출구 수 | 2개 (상단 진입/하단 출구 D 고정) |
| 충전율 목표 | 25-40% |
| 플랫폼 층 수 | 4-6층 (하강 리듬) |
| 수직 이동 | Y⁻ 주 동선. 점프는 보조 |
| 전투 밀도 | 낮음-중간 (이동 중 전투) |

**Dead Cells 레퍼런스:** `Astrolab/ALCombat0-2` (45×31-35), `SewerLabyrinth` (세로 50 수준)

**플랫폼 패턴 (Tiled 확인 대상):**
- `Astrolab/ALCombat0~5`: 수직 이동 + 공중 플랫폼 배치 패턴
- `SewerLabyrinth/SewerCreature`: 수직 분기 구조

---

### L-V — 대형 세로 (32×64 타일)

**용도:** 깊은 하강 구간, 유체 수직 기둥, 빌더 구조물 내부

| 항목 | 값 |
|---|---|
| 풋프린트 | 2×4 |
| 크기 | 32×64 tiles (512×1024px) |
| 출구 수 | 1-2개 (하단 D 고정, 상단 L/R 진입) |
| 충전율 목표 | 20-35% |
| 플랫폼 층 수 | 6-10층 |
| 수직 이동 | Y⁻ 전용. 낙하 구간 + 선반 브레이크 |
| 전투 밀도 | 낮음 (하강 자체가 도전) |

**Dead Cells 레퍼런스:** `PurpleGarden` (h=81), `StiltVillage` (h=100), `Astrolab` (h=94)

**플랫폼 패턴 (Tiled 확인 대상):**
- `PurpleGarden` 전반: 수직 탑 구조 + 선반 플랫폼
- `StiltVillage` 전반: 수직 마을 구조

---

### SHAFT — 수직 샤프트 (16×96+ 타일)

**용도:** "아이템 세계는 빠진다" 연출 핵심. 지층 간 연결부, 극적 낙하 구간

| 항목 | 값 |
|---|---|
| 풋프린트 | 1×6+ (가변) |
| 크기 | 16×96+ tiles (256×1536+px) |
| 출구 수 | 2개 (상단 진입, 하단 출구) |
| 충전율 목표 | 10-20% (벽면만) |
| 플랫폼 층 수 | 0-2개 (브레이크 선반) |
| 수직 이동 | 순수 낙하. 속도감 최우선 |
| 전투 밀도 | 없음 또는 낙하 중 적 1체 |

**Dead Cells 레퍼런스:** `Bank` (h=450 = 역대 최대), `Observatory` (h=151)

**ECHORIS 특수 역할:** DIR-IWS-01 "빠진다" 연출의 물리적 구현. 지층 전환 직전 보스 처치 후 이 샤프트로 낙하하면서 다음 지층 진입 연출.

**플랫폼 패턴 (Tiled 확인 대상):**
- `Bank/BankCombat` 중 h=450짜리: 순수 수직 샤프트 구조
- `Observatory` 전반: 수직 통로 + 간헐 브레이크 선반

---

### PLAZA — 광장/입구 (48×48 타일)

**용도:** 지층 진입점, 보스 아레나, 안전 구역(귀환 포인트)

| 항목 | 값 |
|---|---|
| 풋프린트 | 3×3 |
| 크기 | 48×48 tiles (768×768px) |
| 출구 수 | 3-4개 (L/R/D + 상단 진입) |
| 충전율 목표 | 25-35% |
| 플랫폼 층 수 | 2-3층 (개방감 유지) |
| 수직 이동 | 선택적 (메인 동선은 수평 탐색) |
| 전투 밀도 | 없음(광장) 또는 최고(보스 아레나) |

**Dead Cells 레퍼런스:** `Courtyard` (89개, 정방형 중심, 평균 41×34), `Cemetery` (넓은 개방 구조)

**플랫폼 패턴 (Tiled 확인 대상):**
- `Courtyard/CourtyardCombat1~10`: 정방형 아레나 구조
- `Cemetery/CemBigCrypt`: 대형 내부 광장

---

## 3. 지층별 방 구성 권장

Dead Cells Prison(84개), SewerLabyrinth(28개) 기준에서 아이템계 1지층 목표 = **30-40개 템플릿**.

| 지층 | 방 수 | 구성 비율 |
|---|---|---|
| 1지층 (Normal) | 30개 | S:30% / M-H:40% / M-V:20% / PLAZA:10% |
| 2지층 (Magic) | 35개 | S:20% / M-H:30% / L-H:15% / M-V:20% / L-V:10% / PLAZA:5% |
| 3지층 (Rare) | 40개 | M-H:25% / L-H:20% / M-V:20% / L-V:15% / SHAFT:10% / PLAZA:10% |
| 4지층 (Legendary) | 40개 | L-H:20% / L-V:25% / SHAFT:20% / PLAZA:15% / 나머지:20% |
| 심연 (Ancient) | 45개 | SHAFT:30% / L-V:30% / 나머지:40% |

---

## 4. 출구(소켓) 규칙

`Task_ItemWorld_VariableRoomGen.md` §4.1 연장.

| 방향 | 기호 | 조건 |
|---|---|---|
| 왼쪽 진입/출구 | L | 세로 위치 4타일 격자 스냅. 개구 ≥3타일 |
| 오른쪽 진입/출구 | R | 동일 |
| 하강 출구 | D | 바닥 구멍. 너비 ≥2타일. 일방향 |
| 상단 진입 (낙하 받기) | — | 천장 개방. 별도 소켓 없음. 그냥 열어두기 |

**U 출구 금지.** 세로 상승은 방 내부 사다리/샤프트로만.

---

## 5. 충전율(Fill Density) 기준

Dead Cells col 레이어 분석 결과 기반.

| 방 역할 | 충전율 | 의미 |
|---|---|---|
| 수직 샤프트 | 10-20% | 벽만 존재. 낙하 공간 최대 확보 |
| 대형 세로 | 20-35% | 선반형 브레이크 플랫폼만 배치 |
| 광장/아레나 | 25-40% | 전투 공간 + 환경 오브젝트 |
| 표준 전투방 | 35-50% | 플랫폼 2-3층 |
| 복도/소형 | 55-70% | 통과 루트 확보 최소 공간 |

---

## 6. Tiled 분석 맵 목록

경로 기준: `C:\Users\Victor\Documents\Works\ProjectAbyss\deadcells_tmx\tmx\`

---

### 6-A. 기본 플랫폼 문법 — S / M-H 템플릿 레퍼런스
> 확인 포인트: 바닥+선반 1-2층 배치, 출구 위치, 기본 충전율

**`Prison/`**
```
Pr1.tmx   (45×20)    Pr2.tmx   (35×21)    Pr3.tmx   (40×20)
Pr4.tmx   (30×20)    Pr5.tmx   (40×20)    Pr6.tmx   (45×22)
Pr7.tmx   (40×20)    Pr8.tmx   (45×22)    Pr9.tmx   (40×20)
Pr10.tmx  (45×20)    Pr11.tmx  (45×22)    Pr12.tmx  (40×20)
Pr13.tmx  (40×20)    Pr14.tmx  (45×20)    Pr15.tmx  (40×20)
Pr20.tmx  (45×25)    Pr25.tmx  (50×25)    Pr30.tmx  (45×25)
```

**`DookuCastle/`** (소형 S 극단 예시)
```
DookuCastleHardInteractionsSpawn.tmx  (3×10)
```

---

### 6-B. 전투 아레나 — L-H 템플릿 레퍼런스
> 확인 포인트: 넓은 전투 공간, 다층 플랫폼, 출구 최소화

**`Ossuary/`** (전 파일 — 19개)
```
Oss1.tmx  (65×16)    Oss2.tmx  (60×20)    Oss3.tmx  (65×20)
Oss4.tmx  (60×22)    Oss5.tmx  (65×22)    Oss6.tmx  (60×24)
Oss7.tmx  (65×24)    Oss8.tmx  (60×26)    Oss9.tmx  (60×30)
Oss10.tmx (46×41)    Oss11.tmx (45×41)    Oss12.tmx (46×35)
Oss13.tmx (45×35)    Oss14.tmx (46×30)    Oss15.tmx (45×30)
Oss16.tmx (46×26)    OssBoss.tmx          OssEntrance.tmx
OssSecret.tmx
```

**`Castle/`** (중형 전투)
```
CastleCombat1.tmx ~ CastleCombat20.tmx
```

---

### 6-C. 수직 이동 패턴 — M-V 템플릿 레퍼런스
> 확인 포인트: 공중 플랫폼 간격, 점프 궤적, 수직 이동 리듬

**`Astrolab/`**
```
ALCombat0.tmx  (45×31)    ALCombat1.tmx  (45×35)    ALCombat2.tmx  (45×35)
ALCombat3.tmx  (45×31)    ALCombat4.tmx  (45×31)    ALCombat5.tmx  (45×35)
ALCombat6.tmx  (45×35)    ALCombat7.tmx  (45×31)    ALCombat8.tmx  (44×35)
ALCombat9.tmx  (44×31)    ALCombat10.tmx (45×31)    ALCombat21.tmx (35×52)
```

**`SewerCorridor/`** (수직 중형 레퍼런스)
```
SC6.tmx   (30×56)    SC7.tmx   (25×54)    SC16.tmx  (25×54)
SC17.tmx  (30×56)
```

**`AncientTemple/`**
```
AncientPit.tmx  (17×55)
```

---

### 6-D. 대형 세로 하강 — L-V 템플릿 레퍼런스
> 확인 포인트: 선반 브레이크 플랫폼 빈도, 낙하 속도감, 벽면 돌출

**`Astrolab/`**
```
ALSecret.tmx   (33×94)
```

**`PurpleGarden/`**
```
PGSecondaryExits2.tmx  (30×81)
```

**`StiltVillage/`**
```
SVMidGate.tmx  (25×99)
```

**`Tumulus/`**
```
TU_LastTeleport.tmx   (24×100)
TU_TransitionExit.tmx (21×100)
```

**`Courtyard/`**
```
CEntrance.tmx  (33×170)   ← 최대 세로 레퍼런스
```

---

### 6-E. 수직 샤프트 — SHAFT 템플릿 레퍼런스
> 확인 포인트: 순수 낙하 공간, 브레이크 선반 0-2개, 벽면 구조

**`Bank/`**
```
BankElevatorHub.tmx    (34×450)   ← 전 맵 통틀어 가장 긴 수직 방
BankEntranceFall.tmx   (36×59)
```

**`Observatory/`**
```
ObsvEntrance.tmx       (31×151)
BossCollector1.tmx     (70×125)
BossCollectorElevator.tmx (10×40)
```

---

### 6-F. 분기 미로 — 출구 3개+ 방 레퍼런스
> 확인 포인트: 출구 배치 방식, 분기점 지형, 길 찾기 유도

**`SewerLabyrinth/`**
```
SLaby1.tmx ~ SLaby21.tmx   (28개 전체)
SewerCreature.tmx  (45×14)
SewerDepthsEntrance.tmx
SewerDepthsEndItems.tmx    (30×7)
SewerDepthsEndSpecial.tmx  (30×7)
```

---

### 6-G. 광장 / 보스 아레나 — PLAZA 템플릿 레퍼런스
> 확인 포인트: 개방감, 환경 오브젝트 배치 밀도, 출구 방향 분산

**`Courtyard/`** (정방형 중심 89개 중 선별)
```
CCombatBuilding1.tmx ~ CCombatBuilding10.tmx
CBuyable1.tmx ~ CBuyable4.tmx
```

**`Cemetery/`**
```
CemBigCrypt.tmx         (52×46)
CemBigCryptKey.tmx      (60×21)
CemCavernExit.tmx       (68×24)
```

**`Astrolab/`** (정방형 아레나)
```
ALCombat0.tmx  (45×31)    ALCombat13.tmx (46×36)    ALCombat14.tmx (46×36)
ALEntrance.tmx             ALExit.tmx
```

---

## 7. Phase 4 슬라이스용 최소 제작 세트

`Task_ItemWorld_VariableRoomGen.md` §저작 가이드 연장.

| 우선순위 | 클래스 | 수량 | 소켓 |
|---|---|---|---|
| 1 | PLAZA (입구) | 1 | L+R+D |
| 2 | M-H (전투) | 4 | L+R / L+R+D / LR 변주 |
| 3 | M-V (하강) | 2 | 상단 진입 + D |
| 4 | SHAFT | 1 | 상단 + D |
| 5 | PLAZA (보스) | 1 | 상단 진입 + 보스 게이트 |
| 6 | S (복도) | 2 | L+R |

총 **11개**로 1지층 슬라이스 검증 가능.
