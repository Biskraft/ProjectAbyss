# 한 방(Room)당 시각 테마 수 리서치 -- Dead Cells / Celeste / Hollow Knight 등

> **목적:** 2D 픽셀아트 레퍼런스 게임들이 **한 방(Room/Screen)에 몇 가지 시각 테마(레이어/팔레트/타일셋 변주)를 사용하는지** 조사하여, ECHORIS의 CSV 기반 AreaPalette + 멀티 아틀라스 파이프라인의 적정 범위(최소~최대)를 정한다.
> **작성일:** 2026-04-17
> **작성자:** Researcher
> **관련 세션:** 2026-04-17 세션 3-5 (팔레트 프로덕션 전환, Area_Palette.csv, 멀티 아틀라스 lazy 로더)

---

## 1. 결론 요약 (TL;DR)

| 항목 | 최소 | 표준 | 최대 |
|:---|:---|:---|:---|
| **시각 레이어(depth planes)** | 3개 (BG/MG/FG) | 5-7개 | 10+ (Hollow Knight/Ori) |
| **타일셋(tileset) 수** | 1개 | 2개 (Solid + BG tile) | 3개 (+FG tile) |
| **팔레트 행(palette row)** | 1행 | 2행 (BG/WALL 보색 페어) | 3행 (+Deco/Accent) |
| **프롭(props) 종수** | 0 | 5-10 | 20+ |
| **파티클/VFX 시스템** | 0 | 1-2 | 3-4 |

**ECHORIS 권장값:**
- **최소 구성 (3 테마):** BG palette row 1 + WALL palette row 1 + 캐릭터/UI 미필터 레이어 1
- **표준 구성 (5 테마):** BG + WALL + Seal(심연벽) + 프롭 + 파티클
- **최대 구성 (7 테마):** 위 + FG 오버레이 + 깊이 그라디언트(depthBias) 2차 변조

---

## 2. 용어 정의

리서치에서 "테마"는 다음 중 하나를 의미:

| 개념 | 정의 | 레퍼런스 예 |
|:---|:---|:---|
| **Depth Layer** | 카메라와 다른 거리의 2D 평면 (파랄랙스 속도 다름) | Hollow Knight "수십 개 2D 평면" |
| **Tileset** | 충돌/솔리드 타일의 아틀라스 한 장 | Celeste의 Solid tileset |
| **Palette Row** | 1D LUT에서 특정 바이옴을 정의하는 색상 램프 | Dead Cells 바이옴 전환 |
| **Prop Set** | 타일에 덧붙이는 장식 스프라이트 묶음 | Celeste의 "background props" |

이 문서에서 **"테마 수 = Depth Layer + Tileset + Palette Row의 종합적 풍성함 지표"** 로 간주.

---

## 3. 게임별 분석

### 3.1 Dead Cells -- 바이옴 단위 단일 팔레트 + 레이어 파랄랙스

| 축 | 수치 |
|:---|:---|
| 시각 레이어 | ~5 (Far parallax BG / Mid BG / Solid / Entities / FG 실루엣) |
| 타일셋 | 바이옴당 1개 (그레이스케일 원본) |
| 팔레트 | **방 단위 1 팔레트 고정** (바이옴 전체에서 공유) |
| 그라디언트 스톱 | 8-9 stops (실제로 "1D LUT"임에도 hue-rich 이유) |
| 특이점 | 배경 타일은 그레이스케일 1종, 바이옴별 팔레트 스왑만으로 다양성 구현 |

**핵심 인사이트:** Dead Cells는 "한 방당 팔레트 1행"이지만 그라디언트 스톱을 8-9개 배치하여 BG/MG/FG 모두가 동일 팔레트 내 다른 휘도 구간을 점유 → 계층이 자연 분리됨.

### 3.2 Celeste -- 레이어 8층 + 자동 타일 + 프롭 랜덤화

[Aran P. "Celeste Tilesets, Step-by-Step"](https://aran.ink/posts/celeste-tilesets) 분석:

| 레이어 | 내용 | 풍성함 기여 |
|:---|:---|:---|
| 1. 파랄랙스 페인팅 BG | 아티스트가 그린 전경 그림 | 바이옴 정체성 |
| 2. 정적 BG | 중거리 일러스트 | 대기감 |
| 3. BG 타일 | 구멍 있는 auto-tileset | 공간 깊이 |
| 4. BG 프롭 | 세부 장식 스프라이트 | 스토리텔링 |
| 5. Solid 타일셋 | 플레이 가능 지오메트리 (auto-tile) | 게임플레이 |
| 6. FG 프롭 | 눈/식물 등 | 몰입감 |
| 7. 파티클 (여러 시스템) | 다양한 깊이 | 동적감 |
| 8. 셰이더 효과 | 전체 장면 그라디언트 필터 | 톤 통일 |

**타일 변주 수치:**
- 방향별 가장자리 타일 1-4개 변주 (랜덤 배치)
- 인필(infill) 타일 ~10개
- **2×2 조합으로 16×16 타일 1,600종 고유 표현 가능**

**핵심 인사이트:** Celeste는 "한 방에 8 테마"를 무난하게 운용. 타일 수는 적게, 조합·랜덤화·프롭으로 풍성함 확보.

### 3.3 Hollow Knight / Ori -- 3 전략층 × 각 층 다수 서브레이어

| 층 | 서브 레이어 | 역할 |
|:---|:---|:---|
| **Foreground** | 실루엣, 스탈라그마이트, 날아다니는 벌레 | 공간감, 장소 고유성 |
| **Middle Ground** | 플레이 레이어 (높은 대비 + 두꺼운 아웃라인 + 선명 컬러) | 가독성 보장 |
| **Background** | 다리 → 안개 → 절벽 → 먼 산... (3-4 depth plane) | 파랄랙스 깊이 |

> *"dozens of 2D planes stacked on top of each other in 3D space"* (Ori/HK 공통)

**풍성함 기법:**
- MG는 대비/아웃라인/채도를 **타 층보다 의도적으로 강하게** → 전투 가독성
- BG에 블룸, 파티클, 동적 조명 적극 활용
- 장소별로 FG 재료가 완전히 다름 (Forgotten Crossroads=벌레 실루엣, City of Tears=비 파티클)

**핵심 인사이트:** 2D지만 **"3D 평면 수십 개"** 로 구성 → 최대값은 10-20+. 단, 이는 유니티 3D 공간 기반. 2D 순수 엔진(PixiJS)에서는 10층이 상한선.

### 3.4 Super Pixel Meadow / Mushroom Caves (itch.io 에셋 표준)

| 에셋 | 파랄랙스 레이어 수 |
|:---|:---|
| Super Pixel Meadow | **7층 루핑 BG** |
| Mushroom Caves | 4층 루핑 BG |
| 일반 플랫포머 팩 | 3-5층 |

**핵심 인사이트:** 에셋 마켓 표준은 **4-7층**. Celeste 수준을 아마추어도 구현 가능하도록 설계됨.

---

## 4. 공통 원칙 (레퍼런스 통합)

### 4.1 "최소 3 / 표준 5-7 / 최대 10"의 법칙

2D 픽셀아트 횡스크롤 게임의 한 방(Room)은 대체로:
- **최소 3 레이어**: FG / MG / BG (Hollow Knight 기본 3 스트라타)
- **표준 5-7 레이어**: BG 파랄랙스 + BG 타일 + BG 프롭 + Solid + FG 프롭 + 파티클 + 셰이더 (Celeste 기본)
- **최대 10+ 레이어**: 3 스트라타 각각 3-4 서브레이어 (Hollow Knight/Ori 하이엔드)

### 4.2 MG 강조 원칙 (Hollow Knight 인용)

> 플레이어가 실제로 상호작용하는 MG는 **FG/BG보다 채도·대비·아웃라인을 강하게** 유지해야 가독성 손상 없음.

→ ECHORIS에 시사: 플레이어/적/핵심 플랫폼은 **PaletteSwapFilter 바깥** 고정 팔레트(현재 설계 그대로 유지).

### 4.3 "타일 적게, 조합 많이" 원칙 (Celeste)

10-15개 기본 타일 + auto-tile 로직 = 수천 종 외관. 변주 수보다 **조합 로직**이 중요.

### 4.4 "팔레트 1개라도 그라디언트 8-9 stops" 원칙 (Dead Cells)

한 방에 팔레트 행 1개만 써도 stops가 많으면 BG/MG/FG 휘도가 자연 분리되어 풍성해 보임.

---

## 5. ECHORIS 적용안

### 5.1 현재 상태 점검 (2026-04-17 기준)

| 요소 | 현 구현 | 레퍼런스 대비 |
|:---|:---|:---|
| Depth Layer | BG + Solid(wall) + Seal + Entity + UI = **5층** | Celeste 표준과 동등 |
| Tileset | `world_01` + `SunnyLand_ext` 멀티 아틀라스 lazy 로드 | 바이옴 확장성 확보 |
| Palette Row | BG + WALL 보색 페어 × 6 바이옴 = 12행 | Dead Cells 수준 이상 |
| Gradient Stops | 팔레트당 8-9 stops | Dead Cells 동등 |
| Props | LDtk Entity로 배치 (제한적) | Celeste 대비 부족 |
| Particles/VFX | 현 시점 미구현 | Phase 1 후반 도입 권장 |

### 5.2 권장 테마 편성 (Room 단위)

#### 🟢 최소 구성 (MVP 방)
```
1. BG Palette Row 1 (바이옴 기본 BG)
2. WALL Palette Row 1 (보색 페어 WALL)
3. 엔티티 (필터 외부, 고정 팔레트)
```
**총 3 테마.** Phase 1 초기 프로토타입 임계점. 이 이하는 "빈 방" 인식 유발.

#### 🟡 표준 구성 (Shipping 방)
```
1. BG Palette Row
2. WALL Palette Row (보색)
3. Seal 벽 (0x101010 mortar + brick 패턴) ← 이미 구현됨
4. 프롭 스프라이트 (배경 장식, 2-5종)
5. 엔티티 (필터 외부)
6. 파티클 1-2종 (단조 불꽃, 먼지, 포자 등)
```
**총 5-6 테마.** Phase 1 졸업 수준. Celeste 중급 방과 동등.

#### 🔴 최대 구성 (Boss/랜드마크 방)
```
1. Far Parallax BG (일러스트 레이어)
2. Mid BG Palette Row
3. BG Props
4. WALL Palette Row
5. Solid Tile Variants (auto-tile)
6. FG 프롭 (실루엣, 천장)
7. 파티클 3-4종 (대기, 불티, 잿가루, 광원)
8. 셰이더 오버레이 (깊이 그라디언트 + tint 펄스)
```
**총 8 테마.** 보스방/월드 랜드마크/아이템계 4티어 보스방 전용. 상시 유지 시 GPU·VRAM 부담.

### 5.3 바이옴별 팔레트 편성 지침

Dead Cells 8-9 stops 원칙 적용:
- BG row: 0.00 (심연) → 0.30 (그림자) → 0.55 (미드톤) → 0.80 (하이라이트) → 1.00 (강조)
- WALL row: BG의 **반대 hue** + **더 넓은 대비** (MG 가독성 확보)

#### 최소 바이옴 팔레트 쌍 (2개 행)
- World: `world_shaft_bg` + `world_shaft_wall` (청록/주황 반전)

#### 최대 바이옴 팔레트 쌍 (3개 행까지 확장 가능)
- 레어리티 Boss방에 **Accent row** 추가
  - 예: IW Legendary 보스 = `iw_legendary_bg` + `iw_legendary_wall` + `iw_legendary_accent` (황금 포인트)
- 단, 3행 이상은 "보스방 한정"으로 제한 (일반 방은 2행 유지)

### 5.4 방 단위 복잡도 예산

Phase 1 프로토타입 기준 GPU/메모리 예산:

| 구성 | 팔레트 행 | 아틀라스 | 프롭 인스턴스 | 파티클 시스템 |
|:---|:---:|:---:|:---:|:---:|
| 최소 | 2 | 1 | 0-3 | 0 |
| 표준 | 2 | 1-2 | 5-10 | 1-2 |
| 최대 (보스) | 3 | 2 | 15-20 | 3 |

**경고선:**
- 팔레트 행 > 3: Tint/Brightness로 해결 가능한 변주가 많음 → 낭비
- 아틀라스 > 3: 멀티 아틀라스 lazy 로더가 커버 가능하나 초기 로딩 체감
- 프롭 > 25: 드로우콜 급증, PixiJS ParticleContainer로 묶기 권장

---

## 6. 질문 응답 (사용자 원질문)

> **"한 방에서 최대-최소 몇 가지 테마가 필요한지"**

| 구분 | 테마 수 | 근거 |
|:---|:---:|:---|
| **절대 최소** | 3 | Hollow Knight 3 스트라타 (FG/MG/BG), 이 이하는 "빈 방" |
| **실질 최소** | 4-5 | Dead Cells 바이옴 기본 (BG파랄랙스+BG타일+Solid+Entity+팔레트) |
| **표준** | 5-7 | Celeste 기본 레이어 수 |
| **하이엔드** | 8-10 | Hollow Knight/Ori 파랄랙스 풍부 방 |
| **상한** | ~12 | 그 이상은 2D 파이프라인에서 성능/메모리 역효과 |

---

## 7. 관련 ECHORIS 문서/데이터

- `Sheets/Content_System_Area_Palette.csv` -- 12행 팔레트 DB (6 바이옴 × BG/WALL)
- `game/src/effects/PaletteSwapFilter.ts` -- 1D LUT 셰이더, Brightness/Tint/Depth 유니폼
- `game/src/scenes/LdtkWorldScene.ts` -- 멀티 아틀라스 lazy 로더
- `game/src/scenes/ItemWorldScene.ts` -- rarity → AreaID 매핑, aggregate 컨테이너
- `Documents/Research/DeadCells_GrayscalePalette_Research.md` -- 팔레트 스왑 기초 리서치
- `Documents/Design/Design_Art_Direction.md` -- 청록/주황 색상 계약

---

## 8. 출처

- [Aran P. -- Celeste Tilesets, Step-by-Step](https://aran.ink/posts/celeste-tilesets)
- [Sarah Mitchell -- The Art of Hollow Knight (Medium)](https://medium.com/3d-environmental-art/the-art-of-hollow-knight-f4c05dda3882)
- [Hallownest -- Mapping Process #1: Room by Room](https://www.hallownest.net/mapping-process-1/)
- [Super Pixel Meadow Tileset (7-layer parallax 사례)](https://untiedgames.itch.io/super-pixel-meadow-tileset)
- [Mushroom Caves (4-layer parallax 사례)](https://luizguilherme-a.itch.io/mushroom-caves)
- [Pinnguaq -- Pixel Art Tile Permutations](https://pinnguaq.com/learn/pixel-art/pixel-art-3c-tile-permutations-in-graphicsgale/)
- [SLYNYRD Pixelblog 20 & 28 -- Tile Variation Strategies](https://www.slynyrd.com/blog/2019/8/27/pixelblog-20-top-down-tiles)
- 이전 리서치 `DeadCells_GrayscalePalette_Research.md` (2026-04-17)

---

## 9. 결론 및 후속 과제

**결론:** ECHORIS는 현재 5층 depth + 12행 팔레트 + 2 아틀라스 + 8-9 stops 구성으로 **Celeste 표준 + Dead Cells 팔레트 풍성함**에 도달. 일반 방에 **팔레트 2행(BG+WALL) + 프롭 5-10 + 파티클 1-2**로 충분.

**후속 과제:**
1. **프롭 시스템 정립** -- LDtk Entity 기반 배경 장식 스폰 규칙 (방당 5-10개)
2. **파티클 시스템 도입** (Phase 1 후반) -- 단조열/먼지/포자/잿가루 4종 기본 라이브러리
3. **보스방 전용 3행 팔레트 확장** -- IW Legendary/Ancient 보스에 Accent row 검토
4. **FG 오버레이 레이어** -- 스탈라그마이트/실루엣용 전방 레이어 (현재 미구현)
5. **가독성 검증** -- MG(플레이) 레이어가 BG/FG보다 채도 우위인지 체크리스트화
