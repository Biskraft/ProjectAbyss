# System_World_Fluid.md — Dynamic Fluid 시스템 (초안)

> **작성 기준:** 신규 시스템 초안 (Implementation TBD)
> **참고 소스:** `game/src/core/Physics.ts` (`isInWater`, `isWater`), `game/src/entities/Player.ts` (`consumeWaterTransitionEvent`, `waterSplash`), `game/public/assets/World_ProjectAbyss.ldtk` (`Collisions` IntGrid `value=2 "water"`)
> **필수 참고:** `Documents/Terms/Project_Vision_Abyss.md`, `Documents/Design/Design_Art_Direction.md`
> **상태:** 초안 — V1 스코프·데이터 모델 정의. 구현 PR 시 본문에 코드 file:line 인용 추가.

---

## 1. 개요

LDtk `Collisions` IntGrid `value=2` 로 마킹된 영역을 **유체 영역(Fluid Region)** 으로 격상한다. 단일 시스템이 `water` / `lava` / `liquid_metal` / `acid` 등 다양한 fluid type 을 데이터로 표현하며, 표면 wave 시뮬레이션 + entity 진입 일렁임 + type 별 시각/물리/피해 속성을 제공한다.

**핵심 결정:**

1. **영역 마커는 IntGrid `value=2` 단일** — 모든 fluid 가 같은 IntGrid value 를 공유한다. 새 fluid 추가 시 IntGrid 정의를 건드리지 않는다.
2. **Fluid type 결정은 LDtk Entity `FluidVolume` 의 `Type` enum 으로** — 영역을 감싸는 rect entity 가 type 을 명시. entity 없는 영역은 default `water` 로 fallback.
3. **속성은 데이터 (Sheets/CSV) SSoT** — `Content_System_FluidTypes.csv` 가 시각·물리·피해 파라미터를 보유. 코드는 enum 매칭만 한다.
4. **시뮬레이션은 spring-based 표면** — 표면 컬럼별 spring 배열 + 인접 tension 전파. PixiJS Mesh 로 렌더.

---

## 2. 설계 의도 (Design Intent)

**1차 niche 시그널:** BLAME!/메이드 인 어비스 페르소나 — 거대 메가스트럭처 안 침묵하는 호수, 식어가는 용암, 고대 시설의 응고 수은. 정적인 water tile 보다 dynamic surface 가 *깊이감·고립감* 신호를 louder 하게 만든다.

**스파이크 정렬:** dynamic fluid 자체는 "아이템계 살아있는 세계" 스파이크를 직접 강화하지 않지만, 아이템계 내부의 단조 강판 톤 (주황 부식) 에 **응고 수은 / 액체 금속** 으로 적용하면 inversion 컨셉(월드 청록 ↔ 아이템계 주황) 을 강화한다.

**MDA 목표:**

- **Aesthetic:** Sensation (entity 진입 splash·일렁임) + Submission (조용한 호수 표면의 ambient wave)
- **Dynamic:** fluid type 별 다른 hazard 행동 (lava=damage tick, liquid_metal=점착, acid=DOT)
- **Mechanic:** 부력·드래그·진입/탈출 이벤트는 모든 fluid 공통, 추가 효과만 type 별

**거절 신호:** 매끈한 사인파 단순 shader, 입자 기반 풀-fluid sim. 픽셀아트 톤과 디버전스.

---

## 3. 데이터 모델

### 3.1 LDtk 표현

**Layer:** `Collisions` (기존)

| 요소 | 표현 | 비고 |
|---|---|---|
| 영역 마커 | IntGrid `value=2 "water"` (기존 그대로) | 모든 fluid 공통 — value 이름은 legacy, 의미는 "fluid region" |
| Type 메타 | Entity `FluidVolume` (rect, 새로 추가) | 룸 안 0..N 개. rect 가 IntGrid 영역과 교집합인 모든 셀에 그 type 적용 |
| Default | 매칭되는 entity 없는 셀 | `Type = water` fallback |

**Entity `FluidVolume` 스펙 (LDtk Editor 정의):**

```
identifier: FluidVolume
resizable: true (rect)
pivot: top-left
fields:
  - Type: enum FluidType (water / lava / liquid_metal / acid / ...) default=water
  - SurfaceColorOverride: color? (null = CSV 의 type 기본)
  - DepthMul: float = 1.0 (룸별 부력/드래그 강도 미세 조정)
```

**영역 추출 알고리즘 (룸 진입 시 1회):**

1. IntGrid `value=2` 셀을 flood-fill 로 connected component 분할 → 각 component = 한 `FluidBody`.
2. 각 component 의 top row 셀들의 윗변을 surface line 으로 추출 (column 별 surface Y).
3. 룸의 모든 `FluidVolume` entity 와 component 교차 검사 → component 의 type 결정. 교차 없으면 `water`.

### 3.2 FluidType 데이터 (Sheets/Content_System_FluidTypes.csv)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | string | enum 키 (`water` / `lava` / `liquid_metal` / `acid`) |
| `display_name` | string | 디버그/UI용 |
| `surface_color` | hex | 표면 mesh tint |
| `body_color` | hex | 잠긴 영역 tint (entity 통과 시) |
| `glow_color` | hex? | 발광 fluid (lava). null = 발광 없음 |
| `surface_k` | float | spring stiffness (0.01~0.05). 높을수록 빠른 복원 |
| `surface_damping` | float | spring damping (0.01~0.05). 높을수록 wave 빠르게 가라앉음 |
| `propagation` | float | 인접 spring tension 전파 계수 (0.1~0.3) |
| `viscosity` | float | 부력 복귀 속도. water=1.0, liquid_metal=0.3 (걸쭉) |
| `buoyancy_mul` | float | 부력 배율. water=1.0, lava=0.6 (가라앉음), liquid_metal=1.5 (튕김) |
| `entity_drag_mul` | float | 잠긴 entity 의 vx·vy drag. lava=2.0, acid=1.2 |
| `damage_dps` | int | 잠긴 entity 에 가하는 초당 피해. water=0, lava=40, acid=15 |
| `damage_type` | string | `none` / `fire` / `acid` / `crush` (Combat 시스템 element 와 연동) |
| `splash_sprite` | string | 진입 splash 자산 id (water=fx_splash_01, lava=fx_lava_splash_01) |
| `bubble_emitter` | string? | 잠긴 entity 가 뿜는 bubble VFX id. null = 비활성 |
| `surface_sfx` | string | 일렁임 ambient SFX id |
| `enter_sfx` | string | 진입 sfx id |

**확장 원칙:** 새 fluid 는 CSV 한 줄 + `FluidType` enum 한 항목 + splash 자산만 추가. 코드 분기 없음.

### 3.3 코드 측 데이터 구조 (요약)

```typescript
// FluidTypes.ts (CSV 로드 결과)
export const FLUID_TYPES: Record<FluidType, FluidTypeDef> = { ... };

// FluidBody (룸 진입 시 1회 생성)
class FluidBody {
  type: FluidType;
  bounds: Rectangle;             // AABB of connected component
  cells: Set<string>;            // "col:row" 키. AABB 안 어느 셀이 fluid 인지
  surface: SurfaceColumn[];      // 표면 column 별 spring 상태
  mesh: Mesh;                    // PixiJS Mesh (top edge geometry)
}

interface SurfaceColumn {
  x: number;        // world X (px)
  y0: number;       // resting surface Y
  y: number;        // current Y
  vy: number;       // velocity
}
```

---

## 4. 시뮬레이션 모델 (Spring Surface)

**Spring 간격:** 8px (룸 width 640 기준 ~80 컬럼; 룸당 1~2 fluid body 가정 시 update 수십~수백 회 — 무시 가능 비용).

**매 프레임 update (per FluidBody):**

```
for each column i:
    F = -k * (y - y0)              # 복원력
    F += -damping * vy             # 감쇠
    F += propagation * (y[i-1] - y) + propagation * (y[i+1] - y)   # 인접 전파
    vy += F * dt
    y  += vy * dt
```

**Ambient wave:** 시간 진행에 따른 매우 작은 노이즈 impulse (per body 마다 1~2 column 에 sub-px 임펄스) — type 별 `surface_k` 가 작은 fluid (liquid_metal) 는 ambient 도 작음.

**Entity 진입 impulse:**

- entity 의 vy 가 양수 (떨어짐) + 표면 통과 프레임 → 해당 column 의 `vy += entity.vy * impulse_factor`
- `impulse_factor` 는 entity mass · fluid `buoyancy_mul` 함수
- splash VFX + sfx 동시 트리거 (`splash_sprite`, `enter_sfx`)

---

## 5. 렌더링

**PixiJS Mesh — surface strip:**

- 정점: 각 column 의 (x, y) + 같은 x 의 body bottom (또는 룸 base Y) 두 점
- triangulation: zig-zag triangle strip
- shader: 기본 fragment 는 `surface_color` 단색 + alpha. lava 는 `glow_color` 추가 add-blend pass.
- 픽셀아트 톤 보존: subdivision 8px (mesh quad 한 변), nearest filtering, snap-to-pixel.

**잠긴 entity 표현 (V2 후보):**

- entity sprite 에 `body_color` 톤 멀티플라이 + 굴절 ripple (별도 displacement shader).
- V1 은 단순 alpha overlay 만.

---

## 6. Entity 상호작용

| 이벤트 | 트리거 | 처리 |
|---|---|---|
| 진입 (enter) | entity AABB 가 fluid cell 과 교집합 시작 | splash impulse + `enter_sfx` + `splash_sprite` + `submerged=true` 플래그 |
| 잠김 (submerged) | entity center 가 fluid cell 안 | `entity_drag_mul` drag 적용 + (수영 가능 entity 면) buoyancy + `damage_dps` tick + `bubble_emitter` |
| 탈출 (exit) | submerged → false 전환 | small splash + `enter_sfx` (대칭) |
| 표면 이동 (skim) | 표면 y±2px 안에서 vx 진행 | column 마다 작은 impulse (배·돌맹이가 수면 위 미끄러지듯) — V2 |

**기존 시스템 통합:**

- `Player.consumeWaterTransitionEvent` 는 그대로 사용. event 값 `+1/-1` 외 `fluidType: FluidType` 필드 추가.
- `WaterSplash` / `WaterBubbles` VFX 매니저는 `type` 인자 받도록 확장 — `splash_sprite` / `bubble_emitter` 데이터로 분기.
- Combat HitManager 의 element-based damage 와 `damage_type` 연결 (lava=fire damage, acid=acid damage).

---

## 7. 확장 예시 — 신규 fluid 추가 절차

**예: `mercury` (응고 직전 수은, 아이템계 단조 강판 톤) 추가.**

1. `Content_System_FluidTypes.csv` 에 한 줄 추가:
   ```
   mercury,Mercury Pool,#C0B8A8,#7A6E5C,null,0.04,0.06,0.15,0.4,0.7,1.8,0,none,fx_mercury_splash_01,null,sfx_mercury_amb,sfx_mercury_splash
   ```
2. `FluidType` enum 에 `mercury` 추가.
3. 자산 추가 — `fx_mercury_splash_01` (Aseprite → atlas 자동 export 파이프라인 사용).
4. LDtk 룸에 `FluidVolume` entity 배치 + `Type=mercury` 지정.
5. 코드 변경 없음.

**검증:** 새 fluid 추가 시 코드 분기 / 함수 / 클래스 추가가 없으면 확장성 통과.

---

## 8. V1 스코프 vs V2+ 후속

### V1 (Phase 2 polish — 2~3일 추정)

- [x] 데이터 모델: IntGrid `value=2` + `FluidVolume` entity + `FluidTypes.csv` 로드
- [x] `FluidBody` 생성 (룸 진입 시 flood-fill + surface 추출)
- [x] Spring surface 시뮬레이션 (k, damping, propagation)
- [x] Mesh 렌더 (단색 + alpha)
- [x] Entity 진입 splash impulse + 기존 VFX 통합
- [x] `water` 타입만 완전 구현 + `lava` 데이터/자산 한 세트 (확장 검증용)

### V2 (Phase 2~3, 우선순위 낮음)

- 잠긴 entity displacement / 굴절 shader
- 표면 skim 이동 impulse
- 인접 column 의 height 차이 임계값 → wave breaking VFX (foam)
- `liquid_metal` / `acid` / `mercury` 타입 자산·튜닝
- 멀티플레이어 동기화 (Phase 3) — 결정론적 spring 또는 host-authoritative + 보간

### V2.5 (스파이크 강화 옵션)

- 아이템계 내부 fluid 가 무기 Ego 의 기억 단편과 상호작용 (예: `Forge` 기질 단편 장착 시 lava 데미지 무효 + 잠시 표면 위 걷기)
- 검 Ego 가 fluid type 별 다른 대사 ("이 강은 기억이 흐른다", "녹지 않은 분노가 끓고 있다")

---

## 9. 리스크 & 미해결 이슈

| 리스크 | 영향 | 대응 |
|---|---|---|
| Spring 시뮬레이션이 픽셀아트 톤과 너무 매끈해 부조화 | 시각 디버전스 | 8px subdivision 유지 + Y 좌표 snap-to-pixel. 필요 시 column spacing 16px 로 완화 |
| LDtk Entity 추가가 기존 룸 마이그레이션 비용 | 1인 개발 부담 | entity 없는 영역 = water fallback. 기존 룸 무수정 가능 |
| 멀티플레이 (Phase 3) 동기화 발산 | 클라이언트 별 wave 차이 | host-authoritative 시뮬, 클라이언트 보간. 결정론적 simulation 옵션 보류 |
| Fluid VFX 자산 부족 (lava splash, mercury splash) | 신규 fluid 추가 시 자산 작업 필요 | V1 은 water 만 완전 구현. lava 는 placeholder tint 만 |
| CSV ↔ enum 동기화 누락 | runtime 에러 | `gdd-integrity-checker` skill 에 fluid 검증 룰 추가 |

---

## 10. 결정 기록 (Decision Log)

| 항목 | 결정 | 이유 |
|---|---|---|
| 영역 마커 단일 IntGrid value | `value=2` 유지 | 기존 룸 호환 + 확장 시 IntGrid 정의 안 건드림 |
| Type 결정 위치 | LDtk Entity `FluidVolume` | 룸 안 다수 fluid 공존 가능 + entity 없으면 water fallback 으로 마이그레이션 비용 0 |
| 속성 SSoT | Sheets/CSV | ECHORIS 데이터 우선 원칙 (Combo.csv, FluidTypes.csv 패턴 일치) |
| 시뮬레이션 | Spring + Mesh | 픽셀아트 + 횡스크롤 액션에 적합. 입자 sim 은 over-engineering |
| V1 스코프 | water 완전 + lava 데이터 검증 | 확장성 1차 증명 후 점진 확장 |

---

## 11. 다음 단계

1. **사용자 컨펌:** 본 초안 검토. 특히 §3 데이터 모델, §8 V1 스코프.
2. **컨펌 후:** `Sheets/Content_System_FluidTypes.csv` 스키마 + `water` / `lava` 두 줄 작성 → LDtk Editor 에 `FluidVolume` entity 추가 → 구현 PR.
3. **구현 순서:** (1) CSV 로드 + enum (2) `FluidBody` flood-fill (3) Spring update (4) Mesh 렌더 (5) Entity splash 통합 (6) 테스트 룸 1개에 lava 적용 확장 검증.
