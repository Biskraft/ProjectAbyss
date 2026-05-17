# Design_World_ChemicalReactions_Roadmap.md — 화학 반응 emergent 로드맵

> **상태:** V1 설계 (2026-05-16) — Agent C systems-designer 산출 + cross-check 통과
> **권위 SSoT:** `Documents/System/System_World_ChemicalReactions.md` (54 기존 + 15 신규)
> **자매 문서:** `Documents/Design/Design_ItemWorld_Themes.md` (§2.3 emergent 표 갱신 대상)
> **방법론:** 매트릭스 빈 셀 (fluid × fluid 14 + fluid × overlay 6 + 직관 부재 15) 에 대한 신규 emergent 설계 + 디자인 원칙 6항 통과 + 5색 기질 균형 + niche 정렬 4.07/5

---

## 1. 설계 배경

### 1.1 매트릭스 부재 영역 (Agent A 식별)

- **fluid × fluid 매트릭스 16칸 중 14 부재** — water+oil, water+acid, oil+acid, water+magma 등 직관적으로 반응이 있을 법한 조합
- **fluid × overlay 매트릭스 12칸 중 6 부재** — oil×electric, oil×frozen, acid×fire, acid×frozen 등
- **직관 vs 코드 부재 15건** — 예: water 가 fire 자연 진압, oil 부유 분리, acid+wood 부식 등

### 1.2 디자인 원칙 6항 (모든 신규 반응 필수 통과)

1. **1차 niche 정렬** — BLAME!/Made in Abyss/Noita 의 거대 시설 + emergent 화학 톤
2. **스파이크 강화** — "아이템에 들어가면 살아있는 세계"
3. **시각 임팩트** — 플레이어가 *반응을 알아챌* 수준의 시각 변화
4. **5색 기질 정체성 align** — Forge/Iron/Rust/Spark/Shadow 중 하나의 시그니처
5. **콘텐츠 양산성** — 디자이너가 *룸 안에서 4-5개 활용 가능*
6. **구현 비용** — TileMutator.tickPassiveInteractions 1 함수 추가 / 데이터 1 CSV row 수준

### 1.3 설계 검증 결과 (Agent C 자가 검증)

| 검증 | 결과 |
| :--- | :--- |
| 원칙 6항 통과 | 15개 모두 통과 (11 완전 + 4 조건부, 탈락 0) |
| niche 정렬 평균 | **4.07 / 5** (기준치 3.5 초과 0.57) |
| 양산성 (룸 1개 4-5개 활용) | Forge 룸 4 반응 + Rust 룸 5 반응 체인 시나리오 검증 통과 |
| 5색 기질 균형 (Tier 1 5색 1+개) | 통과 (Forge 2 / Iron 1 / Rust 2 / Spark 1 / Shadow 1) |

---

## 2. 신규 반응 카탈로그 (15개)

> 상세 12 필드는 `_temp_ChemicalReactions_NewDesign.md` 참조 (cross-ref archive). 본 문서는 *Tier 분류 + 의존성 + 구현 계획* 위주.

| R-NEW-ID | 이름 | 분류 | 5색 기질 | niche 점수 | LOC | Tier |
| :-: | :--- | :--- | :-: | :-: | :-: | :-: |
| 001 | 증기 희석 / Steam Dilution | cell×cell | Rust | 4 | 12 | 2 |
| 002 | 기름 부상 / Oil Float | cell×cell | Shadow | 4 | 10 | **1** |
| 003 | 산성 연소 / Acid Flash | attack×cell | Rust | 5 | 18 | **1** |
| 004 | 결빙 기름 / Frozen Oil | attack×cell | Iron | 4 | 10 | **1** |
| 005 | 전기 기름막 절연 / Electric Insulation | cell×cell + attack | Spark | 4 | 12 | **1** |
| 006 | 산성 빙결 / Acid Freeze | attack×cell | Rust | 4 | 14 | 2 |
| 007 | 마그마 수증기 폭발 / Magma Steam Burst | cell×cell | Forge | 5 | 22 | **1** |
| 008 | 기름 산성 응고 / Oil Acid Coagulation | cell×cell | Shadow | 3 | 14 | 2 |
| 009 | 얼음 산성 균열 / Ice Acid Crack | cell×cell | Rust | 4 | 6 | **1** |
| 010 | 전도 오염 / Conductor Contamination | cell×cell + attack | Spark | 3 | 8 | 2 |
| 011 | 마그마 굳음 충격 / Impact Solidification | container×cell | Forge | 5 | 20 | **1** |
| 012 | 산성 컨테이너 연쇄 / Acid Container Chain | container×container | Rust | 4 | 18 | 2 |
| 013 | 기름 수면 발화 / Surface Ignition | cell×cell + attack (emergent) | Forge + Shadow | 5 | 0 (R-NEW-002 부산물) | **1** auto |
| 014 | 강철 수문 부식 / Metal Gate Corrosion | container×cell (emergent) | Iron | 3 | 0 (R-NEW-001 부산물) | 2 auto |
| 015 | 얼음 위 기름 슬릭 / Ice Oil Slick | entity hazard | Iron | 4 | 12 | 3 |

---

## 3. Tier 분류 + 구현 계획

### 3.1 Tier 1 — 데모 V1 (7개, 추정 ~100 LOC, ~10 시간)

**기준:** 가장 작은 비용 + 가장 큰 시그널 + 5색 균형.

| R-NEW-ID | 이름 | LOC | 시간 | 기질 | 의존성 |
| :-: | :--- | :-: | :-: | :-: | :--- |
| 003 | 산성 연소 | 18 | 2h | Rust | applyFireAttack 확장 + SteamPuffManager tint |
| 004 | 결빙 기름 | 10 | 1h | Iron | tryFreeze + originalTile (직전 작업으로 인프라 준비됨) |
| 007 | 마그마 수증기 폭발 | 22 | 2h | Forge | maybeSolidifyMagmaOnWater 신규 헬퍼 + onWallTileChanged |
| 009 | 얼음 산성 균열 | 6 | 0.5h | Rust | 기존 maybeMutateNeighbour 재사용 (단독) |
| 011 | 마그마 굳음 충격 | 20 | 2h | Forge | paintContainerImpact 확장 + SteamPuffManager 강도 |
| 005 | 전기 기름막 절연 | 12 | 1.5h | Spark | applyThunderChain BFS + onElectricInsulated 콜백 |
| 002 | 기름 부상 | 10 | 1h | Shadow | tickPassiveInteractions oil 분기 (R-NEW-013 자동 부산물) |

**5색 균형:** Forge 2 / Iron 1 / Rust 2 / Spark 1 / Shadow 1 = ✅

#### 3.1.1 의존성 그래프 (Tier 1)

```
R-NEW-009  (단독)
R-NEW-004  → tryFreeze 확장 (originalTile, 이미 준비됨)
            └→ Tier 2 R-NEW-006 (산성 빙결) 기반
R-NEW-007  → maybeSolidifyMagmaOnWater 신규
            └→ Tier 1 R-NEW-011 (헬퍼 재사용)
R-NEW-003  → applyFireAttack 확장 + SteamPuff tint
R-NEW-005  → applyThunderChain BFS 콜백 추가
            └→ Tier 2 R-NEW-010 (전도 오염) 콜백 재사용
R-NEW-002  → tickPassiveInteractions oil 분기
            └→ R-NEW-013 자동 emergent (0 LOC)
```

#### 3.1.2 자산 필요 (Tier 1)

| 자산 | 종류 | 우선순위 |
| :--- | :--- | :-: |
| acid flash green smoke 파티클 | VFX (SteamPuff tint 파라미터) | Must |
| magma solidify SFX | SFX (기존 steam_burst + pitch down) | Must |
| electric insulated arc VFX | VFX (기존 electric spark + 소멸) | Nice |
| frozen oil 색상 (`#2A3A40`) | 코드 상수 | Must |

#### 3.1.3 디자이너 작업 (Tier 1 테스트 룸)

1. **`Forge_Test_Room`**: magma 풀 + WaterBarrel 1 + OilDrum 1 → R-NEW-007, R-NEW-011 검증
2. **`Rust_Test_Room`**: acid 풀 + ice 셀 인접 + fire trap → R-NEW-003, R-NEW-009 검증
3. **`Iron_Test_Room`**: oil 풀 + ice 인챈트 시나리오 → R-NEW-004 검증
4. **`Spark_Test_Room`**: water+oil 혼합 풀 → R-NEW-005 절연 시각 확인 + R-NEW-002 부상 + R-NEW-013 자동 발화
5. **`Shadow_Test_Room`**: oil + water 풀 → R-NEW-002 부상 검증 (R-NEW-013 emergent)

#### 3.1.4 테스트 시나리오 (Tier 1)

- `R-NEW-007`: magma 2×2 풀 옆 water 1×2 배치 → 30s 관찰 → 일부 magma → WALL 굳음 확인
- `R-NEW-011`: magma 풀 위 WaterBarrel 투척 → 즉시 굳음 + 증기 burst 확인
- `R-NEW-003`: acid 풀에 fire 인챈트 → acid → AIR + 독성 연기 + 인접 데미지 확인
- `R-NEW-009`: acid 풀 옆 ice 셀 30s → ice → water 전환 확인
- `R-NEW-004`: oil 풀에 ice 인챈트 → 8s 결빙 → 복귀 후 oil 재개 확인
- `R-NEW-002`: oil 풀 아래 water 셀 → 시간 경과로 oil 이 water 위로 부상
- `R-NEW-005`: oil 셀로 분리된 water+water 풀 → thunder → 한쪽만 lit + oil 경계 spark 확인
- `R-NEW-013` (자동): R-NEW-002 후 fire → oil 만 발화 → 소진 후 water 노출

#### 3.1.5 구현 상태 (2026-05-16)

| R-NEW-ID | 상태 | 구현 위치 |
| :-: | :--- | :--- |
| 002 | ✅ 구현 완료 | `TileMutator.tickPassiveInteractions` oil 분기 |
| 003 | ✅ 구현 완료 | `TileHazards.applyFireAttack`, `LdtkWorldScene/ItemWorldScene.onEgoShardImpact`, `SteamPuffManager` tint |
| 004 | ✅ 구현 완료 | `TileMutator.tryFreeze`, `TileHazards.applyIceAttack` |
| 005 | ✅ 구현 완료 | `TileMutator.applyThunderChain`, scene `onElectricInsulated` VFX callback |
| 007 | ✅ 구현 완료 | `TileMutator.tickPassiveInteractions` water/magma 분기 |
| 009 | ✅ 구현 완료 | `TileMutator.tickPassiveInteractions` acid/ice 분기 |
| 011 | ✅ 구현 완료 | `LdtkWorldScene/ItemWorldScene.paintContainerImpact` WaterBarrel 분기 |
| 013 | ✅ 자동 성립 | R-NEW-002 로 oil 이 수면 위로 올라온 뒤 기존 fire/oil ignition 경로 사용 |

### 3.2 Tier 2 — V1.0 정식 (5개, 추정 ~70 LOC, ~7 시간)

**기준:** 중간 비용 + 깊이 추가. Tier 1 인프라 활용.

| R-NEW-ID | 이름 | LOC | 시간 | 기질 | 의존성 |
| :-: | :--- | :-: | :-: | :-: | :--- |
| 001 | 증기 희석 | 12 | 1.5h | Rust | maybeMutateSelfIfNeighbour 신규 헬퍼 |
| 006 | 산성 빙결 | 14 | 1.5h | Rust | tryFreeze 확장 (R-NEW-004 의존) |
| 008 | 기름 산성 응고 | 14 | 1.5h | Shadow | maybeSolidifySelfIfNeighbour 헬퍼 |
| 010 | 전도 오염 | 8 | 1h | Spark | applyThunderChain 콜백 (R-NEW-005 인프라) |
| 012 | 산성 컨테이너 연쇄 | 18 | 2h | Rust | 장면 측 onContainerDestroyed 훅 |

#### 3.2.1 의존성 그래프 (Tier 2)

```
R-NEW-001  (단독) → R-NEW-014 자동 (Iron)
R-NEW-006  → R-NEW-004 (tryFreeze 확장 의존)
R-NEW-008  (단독)
R-NEW-010  → R-NEW-005 (콜백 인프라 의존)
R-NEW-012  → onContainerDestroyed 훅 확인
```

#### 3.2.2 자산 필요 (Tier 2)

| 자산 | 종류 | 우선순위 |
| :--- | :--- | :-: |
| acid-ice frozen 색 (`#3A7A6A`) | 코드 상수 | Must |
| oil-acid sludge 색 (`#1A1208`) | 코드 상수 | Must |
| green electric arc VFX | VFX (electric tint) | Nice |
| container chain destroy SFX 딜레이 | SFX 타이밍 | Nice |

#### 3.2.3 테스트 시나리오 (Tier 2)

- `R-NEW-001`: acid 풀 옆 water 30-60s → acid 일부 → water 전환 확인
- `R-NEW-006`: acid 풀 ice 인챈트 → 5s 결빙 → 복귀 후 acid 유지 확인
- `R-NEW-008`: oil + acid 인접 30s → 슬러지 WALL 생성 확인
- `R-NEW-012`: AcidVial 3개 스택 + Crate/WaterBarrel 인접 → 하나 파괴 → 도미노 (0.3s 딜레이) 확인

### 3.3 Tier 3 — V2+ (3개, 추정 ~12 LOC + emergent)

| R-NEW-ID | 이름 | LOC | 의존성 | 비고 |
| :-: | :--- | :-: | :--- | :--- |
| 015 | 얼음 위 기름 슬릭 | 12 | Player.ts oil slip 리팩터 | Player 이동 물리 변경 — 리그레션 위험 |
| 013 | 기름 수면 발화 | 0 | R-NEW-002 완료 시 자동 | 자동 emergent — 문서화만 |
| 014 | 강철 수문 부식 | 0 | R-NEW-001 완료 시 자동 | 자동 emergent — 문서화만 |

---

## 4. Phase 3 카드 (cell-level 외 영역)

Agent B 의 NM 분석에서 *cell-level 외 시스템* 누락 3건. Agent C 의 15 제안 *외부* 영역이며 별도 작업 필요.

| 카드 | 영역 | 출처 | 우선순위 |
| :--- | :--- | :--- | :--- |
| **NM-02 Shock 상태이상 구현** | entity 상태이상 시스템 | `Combat_Damage.md §3` + `Combat_Elements.md §3.2` | V2 (멀티플레이 시기) |
| **NM-03 원소 퓨전** (Steam Blast / Plasma Surge / Cryo Shock) | 협동 enchant 시스템 | `Combat_Elements.md §8` | Phase 3 (Co-op) |
| **NM-07 entity 빙결 × 화염 → 증기 폭발** | entity 상태이상 기반 | `Combat_Damage.md §5.2` | V2 (Shock 과 함께) |

이 3 카드는 *cell-level emergent* (Roadmap 15개) 와 *별도의 entity-level 시스템* 임. 통합 SSoT 의 §7.3 후속 카드 참조.

---

## 5. Tier 1 즉시 구현 절차 (사용자 컨펌 후)

데모 일정에 맞춰 *Tier 1 7개를 한 번의 작업 사이클* 로 구현 가능. 예상 ~10 시간 분량.

### 5.1 구현 순서 (의존성 최소화)

1. **R-NEW-009** (얼음 산성 균열, 6 LOC) — 단독, 가장 작음. 첫 검증용
2. **R-NEW-002** (기름 부상, 10 LOC) — 단독. R-NEW-013 자동 부산물
3. **R-NEW-004** (결빙 기름, 10 LOC) — tryFreeze 확장 (originalTile 인자 활용)
4. **R-NEW-007** (마그마 수증기 폭발, 22 LOC) — maybeSolidifyMagmaOnWater 헬퍼 신규
5. **R-NEW-011** (마그마 굳음 충격, 20 LOC) — paintContainerImpact 확장 (R-NEW-007 헬퍼 재사용)
6. **R-NEW-005** (전기 기름막 절연, 12 LOC) — applyThunderChain 콜백 (R-NEW-010 인프라 준비)
7. **R-NEW-003** (산성 연소, 18 LOC) — applyFireAttack 확장 + SteamPuff tint 파라미터

각 반응 구현 후 *TS 컴파일 + 테스트 룸 검증* 1 사이클. 누적 회귀 방지.

### 5.2 위험 사항

- **R-NEW-007 의 magma → WALL 변환** — ItemWorldScene 의 mutation mask 가 *WALL 변환 셀* 도 처리해야. 현재는 *AIR 셀만* mask. mask 확장 또는 magma 굳음 시 *대체 sprite* 렌더 필요. 사전 결정 필요.
- **R-NEW-011 의 paintContainerImpact 확장** — 기존 paintFluidSplash 로직과 분기 신설. 회귀 검증 필요.
- **R-NEW-003 의 SteamPuffManager tint** — 기존 호출처가 *모두* tint 파라미터를 받도록 default 값 두기 (보수적 호환).

### 5.3 사용자 컨펌 사항

- Tier 1 의 *5색 균형* 이 적절한가 (Forge 2 / Rust 2 vs 다른 기질 1)? Agent C 자체 Q1 — Iron 또는 Shadow 에 추가 R-NEW 를 승격할지
- R-NEW-012 의 도미노 딜레이 0.3s 가 전투 템포에 맞는가? 0.15-0.5s 튜닝 가이드?

---

## 6. 통합 후 갱신 대상 문서

Tier 1 구현 완료 시 다음 문서 동시 갱신:

1. `Documents/System/System_World_ChemicalReactions.md` — §4-§6 표에 R-NEW-001/002/...015 row 추가 (Tier 별 표시)
2. `Documents/System/System_World_TileSystem.md` §3.2 자동 상호작용 표 — Tier 1 7개 반응 행 추가
3. `Documents/System/System_World_TileSystem.md` §3.3 상호작용 상세 — 각 반응 설명 추가
4. `Documents/System/System_World_TileSystem.md` §3.4 VFX SSoT — 신규 VFX 이벤트 행 추가
5. `Documents/Design/Design_ItemWorld_Themes.md` §2.3 Emergent 표 — 5기질 시그니처 emergent 갱신 (Tier 1 매핑)
6. `.claude/skills/gdd-integrity-checker/references/csv_gdd_mapping.md` §16 — 반응 매트릭스 cross-validation 룰 추가

---

## 7. 결정 사항 일람

| 결정 | 채택 |
| :--- | :--- |
| 15 신규 반응 모두 채택 | ✅ |
| Tier 1 = 7개 (5색 균형) | ✅ |
| Tier 2 = 5개 (V1.0 정식) | ✅ |
| Tier 3 = 3개 (V2+) | ✅ |
| 코드 reality 권위 — 문서 정정 16건 | ✅ (System_World_ChemicalReactions.md §7.1 참조) |
| Phase 3 카드 (Shock/퓨전/entity 증기) 별도 처리 | ✅ |
| Tier 1 즉시 구현은 사용자 컨펌 후 | ✅ 완료 (2026-05-16) |
