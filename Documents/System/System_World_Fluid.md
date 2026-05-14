# System_World_Fluid.md — Dynamic Fluid 시스템 (V2)

> **작성 기준:** 코드 reality 역추출 (2026-05-14) — V1 초안 (2026-05-04) 을 실제 구현 V1 + 부분 V2 반영본으로 갱신.
> **참조 소스:** `game/src/effects/FluidSystem.ts` · `game/src/effects/FluidResidue.ts` · `game/src/effects/WaterSplash.ts` · `game/src/effects/AshRemnant.ts` · `game/src/systems/TileMutator.ts` · `game/src/systems/TileHazards.ts`
> **상위 SSoT:** `Documents/System/System_World_TileSystem.md` (§3 IntGrid × Damage / Passive Interaction 매트릭스)
> **자매 문서:** `Documents/System/System_World_Container.md` (paintTile · 환경 파괴 매트릭스 연계)
> **상태:** V2 (구현 진행 중) — water 완전 / magma · oil · acid 시각 + 시뮬 완료, 폭포 spawner 는 신규 설계

---

## 1. 개요

LDtk Collisions IntGrid 의 **fluid cell 값 4종** 을 spring surface + cellular gravity 로 동적 시뮬레이션하는 시스템. 정적 sprite 한 셀이 아니라, *흐르고 · 떨어지고 · 증발하고 · 분리되는* 유체로 표현된다.

**핵심 결정 (V1→V2 변경 포함):**

1. **fluid cell 값 4종** — `2 (water)` / `6 (magma)` / `11 (oil)` / `13 (acid)`. 각 값은 자체 connected-component 로 분리 flood-fill, 다른 type 과 절대 병합 안 됨 (인접 water/magma → 2 body).
2. **Hybrid render — sub-tile 표면** — IntGrid 셀은 16 px 유지하되, 표면 column 은 4 px 간격으로 4 배 dense. Spring + `quadraticCurveTo` 곡선 보간으로 Noita-ish 액체 표면을 16 px 격자 위에 얹는다.
3. **Cellular gravity (sand-like flow)** — V1 의 정적 surface 시뮬레이션 위에 추가된 V2 메커니즘. 매 140 ms 마다 fluid cell 이 down / diagonal-down / horizontal 순으로 빈 공기 셀로 자동 이동.
4. **속성은 코드 데이터 (`FluidTypes.ts`) — CSV 는 후속 분리 후보** — V1 초안의 `Content_System_FluidTypes.csv` 는 보류. 현재는 `FluidTypes.ts` 가 SSoT. 4종 → 6+종 확장 시 CSV 분리.
5. **Self-illuminating halo** — magma / lava / acid 는 BlurFilter 기반 외부 halo + 펄스. water / oil 은 halo 없음.
6. **Cell mutation API** — Fire-on-water (cell → AIR) 같은 동적 변경이 표면 simulation 을 깨지 않도록 `removeCell` / `maybeSplit` / `transferWaveState` 가 wave momentum 을 신구 body 간 이양.

---

## 2. 설계 의도 (Design Intent)

**1차 niche 시그널:** BLAME! / Made in Abyss 페르소나 — 거대 시설 안 침묵하는 호수 · 식어가는 용암 호수 · 단조 시설의 응고 수은 / 산화 용액. *정적인 water tile 보다 동적 surface + 흐름 + 증발 + 분리* 가 깊이감 · 고립감 신호를 louder 하게.

**스파이크 정렬 (V2 강화):** Fluid 자체는 "아이템계 살아있는 세계" 스파이크를 직접 강화하지 않으나, *컨테이너 + Fluid + TileMutator 3축 emergent* 가 아이템계 단조 강판 톤에서 "기억의 액체화" 메타포로 작동:

- OilDrum 깨짐 → 흘러내려 fire 에 점화 → 적 처치 → 잔존 ash 가 룸에 기록을 남김
- MagmaCrucible 깨짐 → ice 가 melt + steam → water body 생성 → 회로 형성 → Thunder enchant 50% 한방
- 모두 1차 niche (Sekiro / Hollow Knight / Noita) 의 "환경 무기화" 기대치 충족.

**MDA 목표:**

- **Aesthetic:** Sensation (액체 일렁임 / halo 펄스 / 증발 shrink) + Submission (조용한 호수 표면의 ambient wave) + Discovery (cell mutation 이 만드는 새 흐름)
- **Dynamic:** type 별 시각 / 물리 / 화학 분기 + cellular gravity 가 만드는 emergent 흐름
- **Mechanic:** 부력 · 드래그 · 진입/탈출 이벤트 공통 + type 별 hazard / 시너지 분기

**거절 신호:** 입자 기반 풀-fluid sim · 매끈한 사인파 단순 shader · 모든 fluid 가 같은 색 알파. 1차 niche 시그널 희석.

---

## 3. 데이터 모델

### 3.1 LDtk IntGrid 값 (4종)

`Collisions` Layer 의 IntGrid value:

| value | type | 색 (`bodyColor` 기준) | 시각 alpha | 발광 halo |
| :-: | :--- | :--- | :-: | :-: |
| **2** | `water` | 청록 | 0.75 | 없음 |
| **6** | `magma` | 주황-적색 | 0.95 | 있음 (pulse) |
| **11** | `oil` | 어두운 갈색 | 0.95 | 없음 |
| **13** | `acid` | 형광 녹색 | 0.75 | 있음 (pulse) |

**확장 규칙:** 새 type 추가 = `FluidTypes.ts` 의 `FLUID_TYPES` 객체에 한 줄 + `FLUID_CELL_TYPES` 배열에 `{ value, type }` 한 줄. IntGrid 정의 추가는 LDtk 에 신규 value 등록 필요.

### 3.2 LDtk Entity `FluidVolume` (water 한정 type override)

V1 의 "모든 영역을 water value 로 마킹하고 entity 로 type 분류" 안은 *부분만* 채택. 현 구현:

- IntGrid value 자체가 1차 type 분류 (4종)
- `FluidVolume` entity 는 **water (value=2)** 영역에 한해 type override 가능 (legacy lava 지원용)
- magma / oil / acid 영역은 entity 와 무관하게 value 가 곧 type

**Entity 스펙:**

```
identifier: FluidVolume
resizable: true (rect)
pivot: top-left
fields:
  - Type: enum FluidType (water / lava / magma / oil / acid / ...) default=water
    ※ 실효는 water 영역에서만 — 다른 value 영역은 무시
```

**flood-fill 알고리즘:**

1. `FLUID_CELL_TYPES` 의 각 value 에 대해 visited 마스크 공유 + 4-neighbour flood-fill
2. 각 component → 1 `FluidBody`
3. component 가 IntGrid value 2 (water) 인 경우만 `FluidVolume` entity AABB 교차 검사 → entity Type 으로 override

### 3.3 코드 측 데이터 구조

```typescript
// FluidTypes.ts (코드 SSoT — V2 의 CSV 분리는 후속)
type FluidType = 'water' | 'magma' | 'lava' | 'oil' | 'acid';
interface FluidTypeDef {
  bodyColor: number;
  surfaceColor: number;
  glowColor: number | null;        // halo 색, null = halo 없음
  surfaceK: number;                // spring stiffness
  surfaceDamping: number;
  propagation: number;             // 인접 column tension 전파
}

// FluidSystem 내부
interface FluidBody {
  type: FluidType;
  def: FluidTypeDef;
  cells: Set<number>;              // packed key = gy * gridW + gx
  bounds: { minX, minY, maxX, maxY };  // px (left-local)
  surface: SurfaceColumn[];        // 4 px 간격 sub-tile column
  topRow: Map<number, number>;     // gx → 최상단 gy
  bottomRow: Map<number, number>;  // gx → 최하단 gy
  gfx: Graphics;                   // body polygon
  haloGfx: Graphics | null;        // 발광 halo (BlurFilter)
  ambientPhase: number;            // 0..1, ambient impulse 트리거 누적
  haloPhaseMs: number;             // halo pulse phase
}

interface SurfaceColumn {
  x: number; y0: number;           // resting world Y
  y: number; vy: number;            // current state
}
```

---

## 4. 시뮬레이션 모델 (Spring + Sub-Tile Surface)

### 4.1 상수 (현 코드 기준)

| 상수 | 값 | 의미 |
| :--- | :-: | :--- |
| `COLUMN_SPACING` | **4 px** | sub-tile column 간격 (16 px 셀당 4 column). V1 의 8 px 대비 2 배 dense |
| `AMBIENT_AMP` | **0.55** | ambient wave 진폭 |
| `AMBIENT_PERIOD_MS` | **380** | ambient impulse 주기 |
| `IMPULSE_FALLOFF_PX` | **16** | splash 즉시 인접 범위 = 1 tile |
| `CENTER_IMPULSE_MUL` | **2.2** | 진입 지점 column 가중치 (깊게 dip) |
| `SIDE_IMPULSE_MUL` | **0.25** | 즉시 인접 column 가중치 (좁고 약하게) |

### 4.2 표면 곡선 — quadratic curve + 5-tap smoothing

격자 상의 1-cell 계단(stair-step) 을 표면이 그대로 16 px 점프로 표시하면 액체로 안 보인다. 두 단계 보정:

1. **5-tap weighted average (resting y0):** `topRow[gx]` 값을 가중치 `1·2·3·2·1` 로 평균 → resting y0 에 ⅓-cell 슬로프로 부드럽게 보간
2. **quadraticCurveTo 곡선:** 매 프레임 drawBody 가 column 점 사이를 직선이 아닌 quadratic curve 의 midpoint 통과 곡선으로 그림

결과: 격자 셀 1 개 차이가 16 px 점프가 아니라 ⅓-셀 슬로프로 보임. 물리 (cells, gravity) 는 여전히 16 px 격자에서만 동작.

### 4.3 Spring 한 프레임 (per Body)

```
sizeFactor = clamp((columnCount - 4) / 8, 0, 1)
damping' = def.surfaceDamping + (1 - sizeFactor) * 0.35   // 작은 body 일수록 빠르게 감쇠

// Type 별 ambient 프로파일
ampMul, periodMul = lookup(type):
    magma|lava → 2.4, 0.45   // 더 크고 빈번한 거품
    oil        → 0.7, 1.6    // 무겁고 느림
    acid       → 1.2, 0.8
    water      → 1.0, 1.0

// Ambient impulse (size 가 작으면 비활성)
if sizeFactor > 0:
    ambientPhase += dt / (AMBIENT_PERIOD_MS * periodMul)
    while ambientPhase >= 1:
        idx = randomInt(0..n)
        amp = (random - 0.5) * AMBIENT_AMP * sizeFactor * ampMul
        cols[idx].vy += amp
        cols[idx±1].vy += amp * 0.6
        cols[idx±2].vy += amp * 0.3

// 2-pass spring (prevY 보존으로 인접 양방향 동등)
prevY = snapshot(cols.y)
for i in 0..n-1:
    f = -k * (y - y0) - damping' * vy
    f += propagation * (prevY[i-1] - y) + propagation * (prevY[i+1] - y)
    vy += f * dt * 0.06
    y  += vy * dt * 0.06
    // Aggressive snap (작은 body 의 무한 떨림 차단)
    if sizeFactor < 0.2 && |y - y0| < 0.5 && |vy| < 0.05:
        y = y0; vy = 0
```

### 4.4 Splash Impulse (`applyImpulse(worldX, worldY, vy)`)

외부 entity 진입 / 잠김 / 탈출 시 1회 호출.

```
body = queryBodyAt(worldX, worldY)
nearestColumn = body.surface min by |x - worldX|
strength = clamp(vy * 0.015, -6, 6)

nearestColumn.vy += strength * CENTER_IMPULSE_MUL   // 중심 깊게
for r in 1..reach (= IMPULSE_FALLOFF_PX / COLUMN_SPACING = 4):
    falloff = 1 - r / (reach + 1)
    sub = strength * falloff * SIDE_IMPULSE_MUL
    cols[nearestIdx ± r].vy += sub
```

결과: 진입 지점은 깊고 좁은 dip, 옆으로의 wave 는 spring propagation 이 시간에 따라 자연 전파.

---

## 5. 렌더링

### 5.1 Body Polygon

매 프레임 `drawBody(body)` 가 polygon 4 변을 그림:

1. **Top edge** — surface column quadraticCurveTo 곡선
2. **Right side** — 마지막 column top → 마지막 column bottom (stair-step 시작점)
3. **Bottom edge R→L** — `bottomRow` 의 column 별 stair-step (16 px 격자 정렬)
4. **closePath** — vertical left side

Stair-step bottom 이 의미하는 것: 룸 바닥이 평탄하지 않거나 fire-on-water 로 가운데 셀이 사라진 경우, polygon 모양이 실제 cell footprint 그대로 — 공기 갭을 채우지 않는다.

**Alpha (type 별):**

| type | bodyAlpha |
| :--- | :-: |
| water · acid | 0.75 (반투명, 배경/플레이어가 비쳐 보임) |
| magma · lava · oil | 0.95 (거의 불투명, 두꺼운 액체) |

### 5.2 Surface Stroke

`surfaceColor` 1 px stroke alpha 0.9 — 액체 표면의 highlight 라인.

### 5.3 Inline Body Glow (lava 등)

`glowColor !== null` 인 경우 표면 직하 4 px 깊이의 add-blend 띠. alpha 0.55. surface column 곡선을 따라 그려져 magma 의 "표면 바로 아래가 더 뜨거움" 느낌.

### 5.4 External Halo (BlurFilter, magma / lava / acid)

별도 `haloGfx` 에 `BlurFilter({ strength: 8, quality: 4 })` 적용 → soft glow.

**Pulse:** `haloPhaseMs` 1800 ms 주기 sine. brightness 가 펄스.

**3 단 halo 구조 (위에서 아래로 그려짐):**

| layer | lift | pad | alpha 기준 |
| :--- | :-: | :-: | :--- |
| Outer halo (넓고 약한 빛 둘레) | 24 px 위 | 12 px 옆 확장 | `0.18 + pulse * 0.10` |
| Inner halo (좁고 강한 빛) | 10 px 위 | body 폭 동일 | `0.35 + pulse * 0.15` |
| Hot core line (표면 1 px 흰선) | 1 px 위 | — | `0.55 + pulse * 0.30` |

이 3단이 겹쳐 magma / acid 의 self-illuminating 광원 효과를 만든다.

### 5.5 픽셀아트 톤 보존

- COLUMN_SPACING 4 px → 1 셀당 4 column → 격자 셀당 4 segment 곡선
- quadraticCurveTo 는 AA 곡선이지만, 격자 셀 단위 표면 형태는 유지 (1-cell stair 가 ⅓-cell slope 로만 부드러워짐)
- nearest filtering, snap-to-pixel 은 atlas 자산 측 유지

---

## 6. Entity 상호작용

### 6.1 진입 / 잠김 / 탈출 (FluidSystem.applyImpulse + Player 측 hooks)

| 이벤트 | 트리거 | 처리 |
| :--- | :--- | :--- |
| 진입 (enter) | entity AABB 가 fluid cell 과 교집합 시작 | `applyImpulse(centerX, surfaceY, vy)` + `waterSplash.spawn(x, surfaceY, strength, fluidType)` + `submerged = true` |
| 잠김 (submerged) | entity center 가 fluid cell 안 | `queryFluidAt` 으로 def 조회 → Player 의 drag / buoyancy / Hazards damage tick 적용 |
| 탈출 (exit) | submerged → false | small `applyImpulse` (탈출 vy) + 잔존물 시작 |

### 6.2 Splash VFX (`WaterSplashManager`)

4종 fluid 색 팔레트:

| fluidType | drop color | crown color |
| :--- | :--- | :--- |
| water | `#9bd6e8` | `#d5f0ff` |
| magma | `#ffaa44` | `#ffd070` |
| oil | `#664422` | `#886633` |
| acid | `#88cc44` | `#aadd66` |

Crown ellipse (260 ms) + 9 droplet arc (520 ms 베이스). gravity 480 px/s² 로 떨어짐.

### 6.3 Damage Hooks (TileHazards.ts 의 `applyTileHazards`)

**SSoT:** `Documents/System/System_World_TileSystem.md` §3.2.

요약 표 (변경 시 TileSystem.md 우선 갱신):

| Hazard | 트리거 | 효과 |
| :--- | :--- | :--- |
| magma 첫 접촉 | `isInMagma(AABB)` | `maxHp * 0.10` 즉시 + Burn 15 s |
| acid | `isInAcid(AABB)` | 100 ms 마다 `maxHp * 0.005` |
| charged | `isInCharged(AABB)` | 2500 ms 마다 `maxHp * 0.01` |
| fire overlay | `aabbHasOverlay('fire')` + 2 px expand | `maxHp * 0.03 * dt/s` + Burn 10 s refresh |
| thunder pulse | `aabbHasOverlay('electric')` transition | `maxHp * 0.50` (1 회/pulse) |
| Burn DOT | `burnRemainingMs > 0` | 5000 ms 마다 `maxHp * 0.02` |

### 6.4 잔존물 (FluidResidueManager)

3종: oil / acid / magma. fluid 노출 후 발자국 + 증발 시점에 잔존.

| type | life | 특수 |
| :--- | :-: | :--- |
| oil | 10000 ms (= OIL_SLIP_DURATION_MS 매치) | 불에 점화 가능 (4000 ms 연소) |
| acid | 2000 ms | 접촉 시 acid tick |
| magma | 2000 ms | 접촉 시 magma DOT + Burn refresh |

발자국 트리거: `emit(type, footX, footY, active, grounded, intensity)` — 디바운스 거리 6 px. 한 셀에 너무 많은 blot 쌓이지 않도록 MAX_BLOTS = 120 글로벌 캡.

---

## 7. Cellular Gravity — Sand-like Flow

V2 의 핵심 신규 메커니즘. spring surface 위에 fluid cell 자체가 떨어지고 퍼지는 layer.

### 7.1 트리거 + 빈도

```
GRAVITY_TICK_MS = 140             // ~7 Hz
gravityAccum += dtMs
if gravityAccum >= 140:
    gravityTick(roomData)
```

### 7.2 알고리즘 (한 tick 안의 한 cell 의 결정)

순서: **bottom-up**, 행마다 좌→우 / 우→좌 *alternating* (편향 방지).

```
for each fluid cell (gy, gx) bottom-up + alternating:
    if cell is fluid value (2/6/11/13):
        skip if frozen
        skip if locked thin-strip cell
        skip if ice-capped by same-type cells above
        1. tryMove (gx, gy) → (gx, gy+1)            // fall straight
        2. tryMove (gx, gy) → (gx±1, gy+1) random   // fall diagonal
        3. tryMove (gx, gy) → (gx±1, gy)            // horizontal spread
```

`tryMove` 는 destination 이 AIR (value 0) 일 때만 성공. fluid type 보존 — water 셀이 magma 셀로 변하지 않음.

### 7.3 Ice Cap 보호

수직 위로 같은 fluid type 셀이 이어지다가 frozen 셀에 도달하면 → "capped" → 이 fluid 는 안 떨어진다. 의도: 빙결된 water 표면 *아래* magma 셀은 안 빠짐 (현실 물리 모방).

### 7.4 Electric Overlay Transfer

water 셀이 이동할 때 thunder pulse 의 electric overlay 도 같이 이동 (`tileMutator.transferElectricOverlay`). 안 그러면 빈 AIR 셀에 orphan electric 이 남아 부조리.

### 7.5 GravityTick → rebuildFromGrid

cell 위치가 바뀌면 flood-fill 결과도 바뀜. tick 안에서 1+ cell 이라도 이동했으면 `rebuildFromGrid` 호출 → 모든 body 재구성. **Wave momentum 은 transferWaveState 로 신구 body 간 closest-x match 로 이양** (표면이 매 tick 마다 resting position 으로 튀는 것 방지).

---

## 8. Thin-Strip Evaporation

### 8.1 정의

`isThinStrip(body)`: 모든 column 이 정확히 1 cell 깊이인 body. 즉 한 행짜리 잔존 puddle.

이런 body 는 cellular gravity 의 horizontal-spread 가 자기 자신 안에서 셀을 무한 셔플 → 시각적으로 "shimmering 멈추지 않는 풀". 그래서:

1. **Cellular gravity 에서 LOCK** — thin-strip 셀은 안 움직임
2. **EVAP_INTERVAL_MS = 250 ms 마다 random cell 1 개 증발** — 끝나면 puddle 자연 소멸

### 8.2 증발 시 시각 (`spawnEvaporatingDrop`)

cell 위치에 fade drop graphics 추가:

- 시작: 16×16 cell 크기 사각 (center-bottom anchored)
- EVAP_FADE_MS = 650 ms 동안 scale linear 0 → 사라짐
- bottom edge 가 floor 에 고정 → "바닥으로 가라앉으며 사라짐" 시각

### 8.3 onEvaporated 콜백

evaporation 직전 `onEvaporated(gx, gy, fluidType)` 발화. Scene 이 이를 받아 `FluidResidueManager.dropAt` 호출 → 영구 (10 s) 잔존물. oil 증발 → oil 잔존, acid → acid 잔존, magma → magma 잔존.

> **water 증발 = 잔존물 없음** — 물은 흔적을 안 남긴다 (디자인 결정, 청정 시각 유지).

---

## 9. Cell Mutation API

런타임 cell 변경을 지원하면서도 표면 simulation 의 연속성을 유지하는 API.

### 9.1 `removeCell(gx, gy)`

호출처:

- Fire enchant on water → water 셀 AIR 로 → steam → `removeCell` 호출 → fluid body 재계산
- Fire enchant on acid · oil (있다면) 도 동일 패턴 (현 코드는 water 만 호출됨)

처리:

```
body = bodies.find(b => b.cells.has(key))
body.cells.delete(key)
if body.cells.size === 0:
    destroy body
else:
    maybeSplit(body)
```

### 9.2 `maybeSplit(body)`

cell 한 개 제거 후 4-connected 검사:

- 1 component → `rebuildBody(body)` (in-place 갱신)
- N component → 기존 body 파괴 + N 개 sub-body 생성, 각각 `transferWaveState` 로 wave momentum 이양

### 9.3 `transferWaveState(newBody, oldSurface, oldAmbient)`

각 새 column 에 대해 old surface 의 closest-x column 찾기 (TILE 내 범위만). `newCol.y = oldCol.y`, `newCol.vy = oldCol.vy * 0.5` (이양 시 살짝 감쇠). `ambientPhase` 도 복사.

결과: cell 추가/제거가 표면 "snap back to rest" 없이 자연스럽게 보임.

### 9.4 `refreshFromGrid(roomData)` 공개 entry

외부 (ice melt 등 fluid cell 추가) 에서 강제 재계산 요청. 내부적으로 `rebuildFromGrid` 호출. **컨테이너 paint 직후 필수** — 새 fluid cell 이 FluidBody 에 인지되지 않으면 polygon 이 안 그려짐.

---

## 10. Fluid Spawner — 폭포 (신규 설계, Implementation TBD)

> **목적:** "흐름 시작점" 을 LDtk 에서 명시할 수 있게 한다. 룸 위 cliff 에서 떨어지는 폭포, 천장에서 떨어지는 산성 비, 균열에서 흘러나오는 magma 응고류 등. 정적 IntGrid 만으로는 *유한* 풀 만 표현 가능했으나, Spawner 가 cell 을 *지속 생성* 하므로 영구 흐름을 만든다.

### 10.1 LDtk Entity `FluidSpawner` 스펙

**Identifier:** `FluidSpawner`
**Resizable:** true (rect, 보통 폭 1-8 셀 × 높이 1 셀)
**Pivot:** top-left
**시각:** rect 의 *bottom edge* 가 fluid cell 이 솟아나는 source line

| Field | Type | 기본값 | 설명 |
| :--- | :--- | :-: | :--- |
| `Type` | enum FluidType | `water` | 생성할 fluid 종류 |
| `Rate` | float | 4.0 | 초당 생성 cell 수 (Curtain 은 column 분산, Stream 은 집중) |
| `Pattern` | enum SpawnPattern | `Curtain` | `Curtain` / `Stream` / `Splatter` — 아래 10.3 |
| `Pressure` | int | 30 | 활성 fluid cell 한도. 초과 시 일시 정지 (paint pressure 자동 조절) |
| `JitterMs` | float | 80 | spawn 시간 균등 분포 ± jitter (자연스러운 비주기) |
| `Active` | bool | true | 시작 활성 상태 |
| `StopTrigger` | ref Entity? | null | switch / lever / event entity 참조. trigger 발화 시 Active 토글 |
| `RampUpMs` | float | 0 | 룸 진입 후 N ms 동안 Rate 가 0 → 최대로 선형 증가 (음향 cue 와 동기화) |

### 10.2 알고리즘 — 한 spawn step

```
if !Active: skip
if (currentFluidCellsInRoom of Type) >= Pressure: skip
candidates = []
for each cell in rect bottom row:
    if collisionGrid[gy][gx] === 0:        // AIR
        candidates.push([gx, gy])
if candidates.empty: skip                   // 이미 source 가 fluid 로 막힘
target = pickCandidate(candidates, pattern, rng)
collisionGrid[target.gy][target.gx] = TILE_VALUE[Type]
fluidSystem.refreshFromGrid(collisionGrid)   // 새 cell → flood-fill 통합
rerenderTilemap()
```

spawn 후 `gravityTick` 이 자연스럽게 cell 을 아래로 흘려보냄. spawner 는 *source 만* 책임, *경로* 는 cellular gravity 가 결정.

### 10.3 Pattern 별 후보 선택

| Pattern | 선택 규칙 | 시각 결과 |
| :--- | :--- | :--- |
| **Curtain** | 모든 candidate uniform random | 폭 전체에서 균등하게 떨어지는 폭포 (넓은 막) |
| **Stream** | 중앙 column (또는 `CenterBias` field 로 지정한 column) 가중치 5x, 옆 2x, 끝 1x | 가운데 집중된 좁은 흐름 (수도꼭지) |
| **Splatter** | uniform 80% + 옆 1-2 cell 랜덤 튐 20% | 불규칙 산성 비 / 단속적 magma 분출 |

### 10.4 Rate / JitterMs 의 시간 분포

```
nextSpawnMs = (1000 / Rate) + (random - 0.5) * JitterMs * 2
```

Rate=4.0, JitterMs=80 → 평균 250 ms ± 80 ms. 균등 펄스가 아닌 자연스러운 불규칙 spawn.

### 10.5 Pressure 의 의미

Spawner 가 끊임없이 cell 을 만들면 룸 전체가 fluid 로 가득 차서 cellular gravity 가 부담을 받는다. `Pressure = 30` 의 의미:

- "이 spawner 가 만들어낸 fluid type 의 cell 이 룸 안에 30 개 이하일 때만 spawn"
- 플레이어가 fluid 를 소비 / 증발 / removeCell 로 줄이면 다시 spawn 시작
- 자기-조절 시스템: 룸이 fluid 로 가득 차지 않음

복수 spawner 가 같은 type 을 만드는 경우 cell 카운트는 *룸 전체* 기준 공유.

### 10.6 Pattern 별 권장 사용처

| 시나리오 | Type / Pattern / Rate / Pressure |
| :--- | :--- |
| 거대 폭포 (월드 진입 룸) | water / Curtain / 8.0 / 60 |
| 빌더 시설의 응고 magma 누출 | magma / Stream / 1.5 / 12 |
| 천장 균열의 산성 비 | acid / Splatter / 2.0 / 20 |
| 깨진 oil 파이프 | oil / Stream / 3.0 / 25 |
| 보스방 점진 침수 (RampUp 사용) | water / Curtain / 12.0 / 200, RampUpMs=20000 |

### 10.7 StopTrigger — 인터랙티브 정지

월드 시나리오 예:

- 보스방 입구 폭포 → 보스 처치 후 `StopTrigger = bossDeathEvent` → 폭포 정지 → 룸 통과 가능
- 막힌 통로의 산성 비 → 천장 균열 vent 를 차단하는 entity (`AcidVent`) 가 `StopTrigger` → 박스로 vent 막으면 비 정지

LDtk 의 entity ref field 표현 — Phase 2 event 시스템과 동기화.

### 10.8 V1 스코프 (구현 시)

- [ ] LDtk `FluidSpawner` entity 정의 + `SpawnPattern` enum
- [ ] Loader 통합 (룸 진입 시 spawner 인스턴스 생성, room 떠날 때 destroy)
- [ ] 매 frame `tickSpawners(dtMs)` — Rate/JitterMs 누적 + Pattern 별 후보 선택 + cell paint + `refreshFromGrid`
- [ ] Pressure 카운터 (룸 단위 type 별 cell 카운트 캐시)
- [ ] 디버그 시각화: `?debug` + rect 외곽선 + 활성 상태 표시 + Pressure 게이지

### 10.9 V2+ 확장

- `CenterBias` field (Stream 의 집중 column 지정)
- `Sound` field — spawn 시 spatial SFX (drip / pour / hiss)
- `OnPressureFull` event field — Pressure 도달 시 외부 entity 발화 (수위 트리거)
- 음수 spawn = drain (cell 을 빨아들임, 배수구 entity)

---

## 11. 외부 시스템 연계 요약

| 시스템 | 연계 방향 | 호출처 / 효과 |
| :--- | :--- | :--- |
| **ThrowableContainer** | Container → Fluid | `paintContainerImpact` 후 `fluidSystem.refreshFromGrid` — drum 파괴가 새 fluid body 생성 |
| **TileMutator** | Fluid ↔ Mutator | gravityTick 에 `tileMutator.isFrozen` 콜백 + `transferElectricOverlay` — frozen cap / electric 추적 |
| **TileHazards** | Fluid → Damage | `isInMagma` / `isInAcid` / `isInCharged` / `aabbHasOverlay('fire')` 가 fluid cell 직접 판정 |
| **FluidResidue** | Fluid evaporation → Residue | `onEvaporated` 콜백이 발자국 시스템과 같은 잔존물 매니저 호출 |
| **WaterSplash** | Fluid enter/exit → VFX | `applyImpulse` 와 같은 시점에 호출, type 별 색 팔레트 |
| **SteamPuff** | Fluid 화학반응 → VFX | passive interaction (magma+ice, acid+magma) 의 `onSteamEvent` 콜백 + 컨테이너 magma paint |
| **EgoShard** | impact → removeCell? | 현 구현은 fluid 안 통과 — 후속 옵션 |

---

## 12. V1 / V2 / V3 스코프

### V1 (완료)

- [x] IntGrid 4 value flood-fill + body 생성
- [x] Spring surface 시뮬레이션 (per-type ambient 프로파일)
- [x] Graphics polygon 렌더 + quadratic curve 곡선
- [x] Entity splash impulse + WaterSplash 통합 (4 type 색 팔레트)
- [x] Damage hooks (TileHazards 통합)
- [x] BlurFilter halo + pulse (magma/lava/acid)

### V2 (부분 완료 — 코드상 존재, 튜닝/검증 진행)

- [x] Cellular gravity (sand-like flow)
- [x] Thin-strip evaporation + fade drop
- [x] Cell mutation API (`removeCell` / `maybeSplit` / `transferWaveState`)
- [x] FluidResidueManager (oil 점화 포함)
- [x] Hybrid sub-tile column (4 px) + 5-tap smoothing
- [ ] Fluid Spawner (§10 — 신규 설계, 미구현)
- [ ] `FluidTypes` CSV 분리 (현 코드 SSoT 유지 중)

### V3 (Phase 2 후속 / Phase 3 멀티)

- 잠긴 entity displacement / 굴절 shader
- 표면 skim 이동 impulse (배·돌이 수면 위 미끄러짐)
- 멀티플레이어 동기화 — host-authoritative + 보간, deterministic cellular gravity option
- mercury / nitric / liquid_metal 같은 신규 type 추가
- 아이템계 fluid 가 무기 Ego 의 기억 단편과 상호작용 (5색 기질 — Forge magma 무효, Spark water charged-imm 등)

---

## 13. 리스크 & 미해결

| 리스크 | 영향 | 대응 |
| :--- | :--- | :--- |
| Cellular gravity tick 140 ms 가 큰 룸에서 비용 큼 | 30+ Hz 게임 루프 안에서 fluid cell 1000개 룸 = ~1ms / tick 추정 | spatial 인덱싱 보류, body 단위 dirty flag 도입 검토 |
| Thin-strip evaporation 이 의도된 puddle 까지 말려버림 | 디자이너 의도와 충돌 | LDtk entity `FluidVolume` 에 `Permanent: bool` field 추가 검토 (V3) |
| Spawner Pressure 한도가 다른 fluid 와 *type 별 분리* 가 아니라 *룸 전체* 인지 모호 | 보스방 다중 spawner 시 동작 차이 | §10.5 처럼 *type 별 룸 단위* 로 명시. 구현 시 검증 |
| 4 px sub-column 표면 곡선이 픽셀아트 톤과 미세 충돌 | 시각 디버전스 | 현 상태 양호 — 1 픽셀 AA 만 발생. snap-to-pixel 필터 V3 검토 |
| Cell mutation API 의 wave transfer 가 split 시 column 부족하면 wave 손실 | drowning effect 사라짐 | 현 closest-x within TILE 룰 유효, 추가 튜닝 후속 |

---

## 14. 결정 기록 (Decision Log — V1 / V2 통합)

| 항목 | 결정 | 이유 |
| :--- | :--- | :--- |
| Fluid value 4종 분리 (water/magma/oil/acid) | IntGrid value 가 곧 type | 다른 type 절대 안 섞임 + LDtk 표현 단순 |
| Type override entity 는 water 만 적용 | V1 의 "전부 value=2 + entity" 안에서 축소 | 마이그레이션 비용 0 + value 기반이 더 직관적 |
| Hybrid sub-tile column (4 px) | 격자 16 px 유지 + 표면만 dense | Noita-ish 톤 with 횡스크롤 픽셀아트 호환 |
| Cellular gravity 도입 | spring surface 만으로는 부족 | "fluid 가 흐른다" 신호가 1차 niche 시그널의 핵심 |
| Thin-strip lock + evaporate | spread 의 무한 셔플 차단 | 시각 안정 + 잔존물 시스템과 자연스럽게 연결 |
| Cell mutation wave transfer | snap-back 차단 | 깨진 fluid 가 시각적으로 자연스러움 |
| Halo BlurFilter 3 단 + pulse | 단순 add-blend 보다 풍부 | self-illuminating 1차 시그널 강화 (magma 호수의 빛이 룸을 비추는 톤) |
| Spawner 신설 (§10) | 영구 흐름 표현 | 정적 IntGrid 만으로는 폭포 / 비 / 누출 불가 |

---

## 15. 다음 단계

1. **§10 Fluid Spawner 검토 + 컨펌:** Pattern 3종 (Curtain / Stream / Splatter) 이 충분한가? Pressure 자기-조절이 적절한가?
2. **LDtk Editor 정의 추가:** `FluidSpawner` entity + `SpawnPattern` enum
3. **Loader + tickSpawners 통합:** `FluidSystem.attach` 옆에 `FluidSpawnerSystem.attach` 추가
4. **Pressure 카운터 구현:** `FluidSystem` 에 `cellCountByType` 캐시 추가 (gravityTick 후 갱신)
5. **`FluidTypes` CSV 분리 결정:** 4 type 으로 머무는 한 코드 SSoT 유지 가능, 6+ type 부터 CSV 분리
6. **gdd-integrity-checker 룰 추가:** IntGrid value ↔ FluidType enum ↔ paintTile (Container) 3축 동기화 검증
