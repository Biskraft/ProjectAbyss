# DEC-041: Fluid Crest Foam — 폭포 포말 시각 시스템

- **날짜:** 2026-05-17
- **상태:** 확정 · Implemented
- **선행:** `Documents/System/System_World_Fluid.md` §10 (FluidSpawner 설계), 직전 커밋 9583a141 (ThrowableContainer + 유체 V2)

---

## 결정 4건

| # | 항목 | 결정 |
|---|---|---|
| 1 | SSoT | `Sheets/Content_System_FluidTypes.csv` 에 컬럼 `foam_color`(#RRGGBB), `foam_density`(0~1) 2종 추가 (총 19 컬럼) |
| 2 | 시각 분리 | **Crest band**(정적, 3 레이어 rect) = `FluidSpawnerManager.repaintVisual` 통합. **Side spray + Streak highlight**(입자) = 신규 `FluidCrestFoamManager` |
| 3 | 천장 분기 | `ceilingFed` (위 셀이 솔리드) 시 crest band 생략 + side spray 만 수평 jet 형태 |
| 4 | Validate.mjs V7 | foam_color 형식 + foam_density 0~1 빌드 차단 룰 |

---

## 사유

### 시각적 결손
- 기존 `FluidSpawnerManager.repaintVisual` 은 body / edge / glow 사각형만 그려 폭포 상단이 *허공에서 시작* 하는 느낌. 레퍼런스 픽셀아트(2D 메트로베니아 표준) 대비 시각 무게 부족.
- WaterSplash 는 표면 진입/이탈 트리거이므로 폭포 자체엔 작동 안 함 — 별도 시스템 필요.

### 색 SSoT 통합 결정
- foam_color 를 코드 분기(`switch type → color`) 가 아닌 CSV 컬럼으로 둠 → 새 fluid 추가 = CSV 한 줄. 기존 `FluidTypeDef` 패턴과 일관.
- foam_density 0~1 스칼라는 fluid 별 *물리적 자연스러움* 을 반영 — oil(점성↑·거품↓) = 0.15, acid(반응↑) = 0.9.

### 입자 매니저 분리
- crest band 는 segment 위치/크기에 정확히 종속 → `repaintVisual` 안에 통합이 자연.
- side spray / streak 는 수명 관리 + gravity 시뮬이 필요한 *진짜 입자* → 별도 매니저가 응집성 높음.
- WaterSplashManager 와 동일 패턴 채택.

---

## 색 토큰 (각 fluid)

| Fluid | foam_color | foam_density | 의도 |
|---|---|:-:|---|
| water | #D5F0FF | 1.0 | 표준. 가장 활발한 흰 포말 |
| lava | #FFD89A | 0.7 | 화염 잔재 황색 |
| magma | #FFE0A0 | 0.5 | 점성 ↑ → 포말 ↓ |
| oil | #C0865A | 0.15 | 점성 매우 ↑ → 미세 가닥만 |
| acid | #DDF6A8 | 0.9 | 강한 반응, 거품 활발 |

---

## 구현 산출물

- `Sheets/Content_System_FluidTypes.csv` (2 컬럼 추가)
- `game/src/data/FluidTypes.ts` (`FluidTypeDef.foamColor` / `foamDensity` + FALLBACK 갱신)
- `game/src/systems/FluidSpawner.ts` (`WaterfallSegment.ceilingFed` + `getActiveSegments()` + crest band 렌더)
- `game/src/effects/FluidCrestFoam.ts` (신규, ~210줄)
- `game/src/scenes/LdtkWorldScene.ts` / `ItemWorldScene.ts` (인스턴스 + update + clear 와이어업)
- `Sheets/tools/validate.mjs` (V7 룰)
- `game/docs/ui-components.html` (#fluid-spawner 섹션, 5종 미리보기)
- `Documents/System/System_World_Fluid.md` §10.10

---

## 예산

- spray budget 80 / streak budget 60 (씬당)
- spawner 평균 4~8 → 활성 입자 < 80
- < 0.5 ms/frame (60fps perf budget 16ms 대비 안전)
