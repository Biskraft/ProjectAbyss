# Design_ChemicalReactions_Implementation_Plan.md — 전체 구현 계획

> **상태:** V1 통합 구현 계획 (2026-05-16)
> **범위:** 54 신규 반응 (R-NEW-001-054 = Agent C 15 + Matrix 39) 일괄 구현 + 기존 16 디버전스 정정
> **권위 SSoT:** `Documents/System/System_World_ChemicalReactions.md`
> **데이터 입력:**
> - `Documents/Design/Design_ChemicalReactions_FullMatrix.md` (54 후보 매트릭스 + 점수)
> - `Documents/Design/Design_World_ChemicalReactions_Roadmap.md` (Tier 1/2/3 분류)
> - `Documents/System/_temp_ChemicalReactions_NewDesign.md` (R-NEW-001-015 12 필드 명세)
> - `Documents/System/_temp_ChemicalReactions_Matrix39_Design.md` (R-NEW-016-054 12 필드 명세 — 작성 중, Agent 위임)
> **사용자 의지:** 모두 한 번에 진행 — Tier 1/2/3 동시 사이클

---

## 1. 범위

### 1.1 구현 대상 (54 신규 + 16 정정 = 70 작업)

| 카테고리 | 개수 | 출처 | 비고 |
| :--- | :-: | :--- | :--- |
| **신규 반응 — Tier 1** (강력 5/5/5) | 13 | R-NEW-001-007/011/013 + Matrix 16-020 | 데모 V1 |
| **신규 반응 — Tier 1-2 후보** (13-14) | 8 | R-NEW-021-030 | V1 |
| **신규 반응 — Tier 2** (10-12) | 13 | R-NEW-031-042 | V1.0 |
| **신규 반응 — Tier 3** (7-9 + 자동 emergent) | 20 | R-NEW-043-054 + emergent | V2 |
| **Layer 1 디버전스 정정** | 16 | Agent B DocAudit | 문서 동기화 |
| **Phase 3 카드 등록** | 3 (NM-02/03/07) | Combat_*.md orphan | V2-V3 |

### 1.2 제외 (의식적 거절)

- **⬛ 거절 15 칸** — 솔리드 동위 (wood+metal 등) / Physical × fluid·metal / Container 동위. 시각·gameplay 정당화 불가.
- **Phase 3 카드 본격 구현** — Shock 상태이상 / 원소 퓨전 / entity 빙결 증기. *카드 등록만*, 본 사이클 구현 외.

---

## 2. 작업 패키지 (Work Package) 분할

10개 WP. 의존성 그래프는 §3 참조.

### 2.1 WP1 — Core Infrastructure (~3h)

기존 코드 *확장 인프라* 작업. 신규 반응 다수가 의존.

| 작업 | 위치 | LOC | 의존 | 비고 |
| :--- | :--- | :-: | :--- | :--- |
| `tryFreeze` 에 TILE_OIL / TILE_ACID 추가 | `TileMutator.ts:160-184` | 8 | — | R-NEW-004, R-NEW-006, R-NEW-016-Brittle Metal |
| `tryFreeze` originalTile 분기 색상 (5종) | `TileMutator.ts` + 렌더러 | 12 | tryFreeze 확장 | frozen oil/acid/metal/wood/grass 색 |
| `SteamPuffManager.spawn` tint 파라미터 | `SteamPuff*.ts` | 8 | — | R-NEW-003 (toxic green) / R-NEW-011 (water+magma 강조) |
| 자기 자신 셀 변환 헬퍼 `maybeMutateSelfIfNeighbour` | `TileMutator.ts` | 12 | — | R-NEW-001, R-NEW-008 등 |
| `paintContainerImpact` 확장 — magma 굳음 분기 | `LdtkWorldScene.ts:4944~` + `ItemWorldScene.ts` | 20 | — | R-NEW-011 |
| `applyThunderChain` `onElectricInsulated` 콜백 | `TileMutator.ts:217-236` | 8 | — | R-NEW-005, R-NEW-010 |
| `applyFireAttack` priority 함수 확장 (acid 추가) | `TileHazards.ts:228-249` | 6 | — | R-NEW-003 |
| `applyIceAttack` AABB 첫 매치 → 모든 셀 sweep | `TileHazards.ts:257-266` | 8 | — | R-NEW-004, R-NEW-006 |
| **WP1 합계** | | **82 LOC** | | |

### 2.2 WP2 — Cell × Cell Passive 추가 (~5h)

`TileMutator.tickPassiveInteractions` 의 if/else if 체인 확장. WP1 완료 의존.

| 반응 (예상 ID) | 입력 | 출력 | LOC | 비고 |
| :--- | :--- | :--- | :-: | :--- |
| R-NEW-007 | water + magma | AIR + steam + magma→WALL 50% | 22 | 와우 모먼트 |
| R-NEW-016 (Smelt) | magma + metal | METAL → AIR | 10 | Forge 시그니처 |
| R-NEW-001 | water + acid | acid → water | 12 | Rust 룸 핵심 |
| R-NEW-002 | oil + water (oil 부상) | 셀 교환 | 10 | Shadow + R-NEW-013 부산물 |
| R-NEW-008 | oil + acid | oil → WALL (sludge) | 14 | Shadow 봉쇄 |
| R-NEW-009 | acid + ice | ice → water | 6 | Rust 체인 |
| R-NEW-023 (Damp Wood) | water + wood | wood 점화 면역 + 진압 | 14 | Iron 방어 |
| R-NEW-024 (Oil-Soaked Wood) | oil + wood | wood 점화 chance 0.30 → 0.60 + dur ↑ | 8 | Shadow chain |
| R-NEW-025 (Oil Coating) | oil + metal | metal 부식 50% 감속 / fire 점화 시 발열 DOT | 16 | Iron+Shadow |
| R-NEW-026 (Acid Eats Wood) | acid + wood | wood → AIR (5s) | 8 | Rust 확장 |
| R-NEW-027 (Oil-Soaked Grass) | oil + grass | grass 점화 100% + dur ↑ | 6 | Shadow chain |
| R-NEW-031 (Slow Rust) | water + metal | metal → AIR (느림) | 8 | 30s 압박 |
| R-NEW-032 (Wither) | acid + grass | grass → AIR (3s) | 6 | Rust 일관성 |
| R-NEW-033 (Condensation) | metal + ice | water droplet 잔존 | 12 | Iron 미세 위험 |
| R-NEW-038 (Hydration) | water + grass | grass 확장 | 10 | Phase 4 시드 |
| R-NEW-039 (Crossover) | wood ↔ grass burn chain | 명시화 (기존 R-006 강화) | 4 | 발견성 |
| R-NEW-040 (Cold Front) | water + ice | water → freeze (1%/1s) | 6 | Iron 점진 |
| **WP2 합계** | | | **~172 LOC** | |

### 2.3 WP3 — Tile × Overlay 추가 (~4h)

`TileMutator` overlay 시스템 확장 + `TileHazards` entity 영향.

| 반응 (예상 ID) | 입력 | 출력 | LOC | 비고 |
| :--- | :--- | :--- | :-: | :--- |
| R-NEW-017 (Brittle Metal) | metal + frozen overlay | Physical 1 hit → AIR | 14 | Iron 시그니처 |
| R-NEW-028 (Heated Metal) | metal + fire overlay | DOT 1%/1s + acid 부식 2× | 16 | Forge 핵심 |
| R-NEW-029 (Plasma Channel) | magma + electric | electric chain 3-tile (약화) | 12 | Spark+Forge |
| R-NEW-034 (Static Ignition) | wood + electric | 2.5s 후 ignite (chance 0.40) | 10 | Spark 함정 |
| R-NEW-035 (Frost Preservation) | wood + frozen | 점화 면역 | 6 | Iron 차단 |
| R-NEW-041 (Field Charge) | grass + electric | Player slip 무효 + slow | 8 | Spark 일관성 |
| R-NEW-042 (Frozen Field) | grass + frozen | 점화 면역 | 4 | Iron 일관성 |
| R-NEW-043 (Frozen Conductor) | ice + electric | 50% 약화 chain | 8 | Spark 약전도 |
| **WP3 합계** | | | **~78 LOC** | |

### 2.4 WP4 — Tile × Attack Enchant 확장 (~4h)

`TileHazards.applyFireAttack / applyIceAttack / applyThunderAttack` 확장.

| 반응 (예상 ID) | 입력 | 출력 | LOC | 비고 |
| :--- | :--- | :--- | :-: | :--- |
| R-NEW-003 | Fire × acid | acid → AIR + toxic steam + 인접 DOT | 18 | Rust 핵심 |
| R-NEW-018 (Magma Detonation) | Thunder × magma | 2-tile 폭발 + 50% maxHp | 22 | Forge+Spark 와우 |
| R-NEW-019 (Heat Metal) | Fire × metal | 4s fire overlay (셀 metal 유지) | 14 | Forge+Iron |
| R-NEW-020 (Magma Surge) | Fire × magma | magma 1-tile 확장 | 12 | Forge 지형 무기화 |
| R-NEW-021 (Frozen Steel) | Ice × metal | frozen + 취약화 | 10 | Iron 분쇄 |
| R-NEW-022 (Shatter Pulse) | Thunder × ice | ice → AIR + 30% maxHp | 14 | Spark 폭발 |
| R-NEW-004 | Ice × oil | oil → frozen WALL 8s | 10 | Iron 발판 |
| R-NEW-006 | Ice × acid | acid → frozen WALL 5s | 14 | Rust 통로 |
| R-NEW-005 | Thunder × oil | 절연 (oil 차단) | 12 | Spark 퍼즐 |
| R-NEW-030 (Chop Wood) | Physical × wood | wood → AIR | 6 | 탐험 일반 |
| R-NEW-036 (Cut Grass) | Physical × grass | grass → AIR + 보상 | 10 | 탐험 + 보상 |
| R-NEW-037 (Break Ice) | Physical × ice | ice → AIR | 6 | 탐험 부숨 |
| R-NEW-044 (Wood Frost) | Ice × wood | frozen WALL 10s | 6 | Iron 발판 |
| R-NEW-045 (Field Frost) | Ice × grass | frozen WALL 5s | 4 | Iron 일관성 |
| R-NEW-046 (Wooden Static) | Thunder × wood | 1.5s electric | 4 | Spark 변형 |
| R-NEW-047 (Grass Static) | Thunder × grass | 1.5s electric | 4 | Spark 일관성 |
| R-NEW-048 (Reinforced Ice) | Ice × ice | 지속 +5s + Physical 면역 | 8 | Iron 자기 강화 |
| **WP4 합계** | | | **~174 LOC** | |

### 2.5 WP5 — Container × Tile 환경 노출 (~2h)

`ThrowableContainer.tickEnvironment` 확장.

| 반응 (예상 ID) | 입력 | 출력 | LOC | 비고 |
| :--- | :--- | :--- | :-: | :--- |
| R-NEW-049 (Waterlogged Crate) | Wood Crate + water | fire 면역 (1.5s threshold 무한) | 8 | Iron+Shadow |
| R-NEW-050 (Oil-Soaked Crate) | Wood Crate + oil | fire 0.5s 즉파 | 6 | Shadow 고위험 |
| R-NEW-051 (Frozen Crate) | Wood Crate + ice/frozen | 환경 면역 | 8 | Iron 영구 발판 |
| R-NEW-052 (Slowly Rusting) | MetalCrate + water | 1 HP / 30s | 10 | Iron 장기 |
| R-NEW-053 (Coated Metal) | MetalCrate + oil | acid 부식 50% 감속 | 8 | Shadow 강화 |
| R-NEW-054 (Brittle Crate) | MetalCrate + ice | 1 hit 즉파 | 12 | Iron 분쇄 |
| **WP5 합계** | | | **~52 LOC** | |

### 2.6 WP6 — Container × Cell + Entity 확장 (~3h)

기존 `paintContainerImpact` 와 entity 측 처리.

| 반응 | 위치 | LOC | 비고 |
| :--- | :--- | :-: | :--- |
| R-NEW-011 (Impact Solidification) | `paintContainerImpact` (WP1 인프라) | 20 | WaterBarrel + magma → WALL |
| R-NEW-012 (Acid Container Chain) | 장면 측 `onContainerDestroyed` | 18 | AcidVial 도미노 |
| **WP6 합계** | | **~38 LOC** | |

### 2.7 WP7 — VFX / SFX 자산 + Code Hook (~6h)

자산 작업 + 코드 hook.

| 자산 | 종류 | 우선순위 | 사용처 |
| :--- | :--- | :-: | :--- |
| Acid flash green smoke (`#CCDD44`) | VFX | Must | R-NEW-003 |
| Magma solidify SFX | SFX (steam_burst + pitch down) | Must | R-NEW-007, R-NEW-011, R-NEW-020 |
| Metal smelt SFX (drip + sizzle) | SFX | Must | R-NEW-016 |
| Brittle metal shatter VFX | VFX (glass break) | Must | R-NEW-017, R-NEW-054 |
| Heated metal glow shader | VFX (orange overlay) | Should | R-NEW-019, R-NEW-028 |
| Magma detonation 폭발 VFX | VFX (radial flash + shock) | Must | R-NEW-018 |
| Electric arc tint variants (green / plasma) | VFX | Should | R-NEW-010, R-NEW-029 |
| Frozen oil/acid/metal 셀 색상 | 코드 상수 | Must | tryFreeze 확장 |
| Sludge wall sprite (oil-acid 응고) | sprite | Should | R-NEW-008 |
| Acid sizzle SFX (3 variants) | SFX | Should | R-NEW-001, R-NEW-009, R-NEW-026 |
| Oil soak / oil drip SFX | SFX | Should | R-NEW-024, R-NEW-027 |
| Static ignition spark SFX | SFX | Could | R-NEW-034 |
| Hydration grass extend sprite | sprite | Could (Phase 4) | R-NEW-038 |
| **WP7 합계** | | **~6h** | + Audio AI 의뢰 |

### 2.8 WP8 — 데이터 카탈로그 갱신 (~2h)

CSV / TS 코드 카탈로그 확장.

| 작업 | 위치 | LOC |
| :--- | :--- | :-: |
| `Content_System_Audio_Events.csv` — 신규 SFX cue 13종 추가 | `Sheets/` | 13 row |
| `Sheets/Content_System_ChemicalReactions.csv` 신설 — 54 반응 ID/이름/타입/수치 | `Sheets/` (신규) | 54 row |
| `BURNABLE_CATALOG` 확장 (oil-soaked wood/grass) | `BurnableProp.ts:46-65` | 6 |
| `FluidTypes.csv` — 단위 정정 (% maxHp 로 통일) | `Sheets/Content_System_FluidTypes.csv` | 5 row 수정 |
| **WP8 합계** | | **~80 LOC + CSV 60 row** |

### 2.9 WP9 — 디자이너 룸 작업 (~10h)

| 작업 | 룸 수 | 비고 |
| :--- | :-: | :--- |
| Forge_Test_Room (R-NEW-007/011/016/018/019/020 검증) | 1-2 | 와우 모먼트 |
| Iron_Test_Room (R-NEW-017/021/049/051/054 검증) | 1-2 | Sekiro 톤 |
| Rust_Test_Room (R-NEW-003/006/009/026 검증) | 1 | 화학 라보 |
| Spark_Test_Room (R-NEW-005/010/018/022/029 검증) | 1 | 전기 회로 |
| Shadow_Test_Room (R-NEW-002/008/024/050 검증) | 1 | 은밀 함정 |
| 통합 데모 룸 (4 테마 노출 4룸) | 4 | 데모용 |
| **WP9 합계** | **9-11 룸** | |

### 2.10 WP10 — 테스트 + QA (~5h)

- 각 신규 반응 *단위 검증* — 검증 시나리오 (FullMatrix.md §3.2/§4.2/§5.2/§6.2 또는 Roadmap §3.X)
- 회귀 검증 — 기존 54 반응 무영향 확인
- TS 컴파일 0 에러 (각 WP 후 검증)
- gdd-integrity-checker §16 자동 cross-validation

### 2.11 WP11 — 문서 동기화 (~3h)

| 작업 | 위치 | 비고 |
| :--- | :--- | :--- |
| 16 Layer 1 디버전스 정정 | TileSystem.md / Fluid.md / Container.md / Combat_*.md | Agent B 의 DIV-C-* 목록 |
| `System_World_ChemicalReactions.md` §4-§6 매트릭스 표 row 추가 | SSoT | R-NEW-001-054 row |
| `Design_ItemWorld_Themes.md` §2.3 emergent 표 갱신 | Themes | 5 기질 시그니처 emergent |
| `gdd-integrity-checker §16` 룰 확장 | skill | 54 신규 ID 자동 검증 |
| 임시 파일 3건 archive | `memory/wiki/audits/2026-05-16_chemical_reactions/` | _temp_*.md 보존 |
| Phase 3 카드 등록 | DEC 또는 후속 카드 문서 | NM-02/03/07 |
| **WP11 합계** | **~3h** | |

---

## 3. 의존성 그래프

```
WP1 (Core Infrastructure)
 ├─→ WP2 (Cell × Cell passive)        ┐
 ├─→ WP3 (Tile × Overlay)             ├─→ WP10 (QA)
 ├─→ WP4 (Tile × Attack Enchant)      ┘
 ├─→ WP5 (Container × Tile env)
 ├─→ WP6 (Container × Cell + Entity)
WP7 (VFX/SFX) — WP2/WP3/WP4/WP5/WP6 의 시각 hook 채움
WP8 (데이터 카탈로그) — WP2/WP3/WP4/WP5/WP6 와 병렬 가능
WP9 (디자이너 룸) — WP10 와 동시 (QA 룸 = 디자이너 룸)
WP11 (문서) — 모든 WP 완료 후 최종 sync
```

### 3.1 핵심 의존 사슬

```
1. WP1 tryFreeze 확장 (originalTile + 5 색)
        ↓
2. WP4 R-NEW-004 (Ice × oil) + R-NEW-006 (Ice × acid) + R-NEW-021 (Frozen Steel)
        ↓
3. WP5 R-NEW-051 (Frozen Crate)
        ↓
4. WP3 R-NEW-017 (Brittle Metal) + R-NEW-035 (Frost Preservation)

1. WP1 paintContainerImpact 확장 (magma 굳음 분기)
        ↓
2. WP6 R-NEW-011 (Impact Solidification)
        ↓
3. WP2 R-NEW-007 (magma+water passive 자기 변환)

1. WP1 SteamPuffManager tint
        ↓
2. WP4 R-NEW-003 (Toxic steam green)
3. WP2 R-NEW-007 (water+magma steam 강조)

1. WP1 onElectricInsulated 콜백
        ↓
2. WP4 R-NEW-005 (Thunder × oil 절연)
3. WP3 R-NEW-010 (전도 오염 시각화)
```

---

## 4. 구현 순서 (의존성 토폴로지)

### 4.1 Phase I — 인프라 (3h)

**WP1 (Core Infrastructure)** — 모든 후속 작업의 전제.

1. `tryFreeze` 확장 (oil/acid 추가 + originalTile 색상 5종)
2. `SteamPuffManager` tint 파라미터
3. `maybeMutateSelfIfNeighbour` 헬퍼
4. `paintContainerImpact` magma 굳음 분기
5. `onElectricInsulated` 콜백
6. `applyFireAttack` priority 함수 + acid 분기
7. `applyIceAttack` AABB sweep (전체 셀)

**검증:** TS 컴파일 0 에러. 기존 54 반응 회귀 0건.

### 4.2 Phase II — Cell-level 신규 반응 (16h)

WP2 / WP3 / WP4 / WP5 / WP6 *병렬* 작업 가능. 의존 없는 순서:

**Day 1 (~6h):** Tier 1 강력 (5/5/5 = 5개) — 가장 큰 시그널부터.

- R-NEW-016 (Smelt) — WP2
- R-NEW-017 (Brittle Metal) — WP3
- R-NEW-018 (Magma Detonation) — WP4
- R-NEW-019 (Heat Metal) — WP4
- R-NEW-054 (Brittle Crate) — WP5

**Day 2 (~6h):** Tier 1 후보 (14) + 핵심 5/5/5 잔여.

- R-NEW-020 (Magma Surge) — WP4
- R-NEW-021 (Frozen Steel) — WP4
- R-NEW-007 (Magma Steam Burst) — WP2 (큰 작업)
- R-NEW-011 (Impact Solidification) — WP6
- R-NEW-003 (Toxic Acid Flash) — WP4

**Day 3 (~4h):** Tier 1-2 (13점) — Shadow / Spark / 일반 강화.

- R-NEW-002 (Oil Float) — WP2 → R-NEW-013 자동 부산물
- R-NEW-001 (Steam Dilution) — WP2 → R-NEW-014 자동 부산물
- R-NEW-022 (Shatter Pulse) — WP4
- R-NEW-023 (Damp Wood) — WP2
- R-NEW-024 (Oil-Soaked Wood) — WP2
- R-NEW-025 (Oil Coating) — WP2
- R-NEW-028 (Heated Metal overlay) — WP3
- R-NEW-049 (Waterlogged Crate) — WP5
- R-NEW-050 (Oil-Soaked Crate) — WP5
- R-NEW-030 (Chop Wood) — WP4

### 4.3 Phase III — Tier 2/3 채움 (8h)

남은 31 반응. 의존성 적음. 사이클 단순.

WP2/3/4/5 의 *낮은 점수 반응* 순차 추가 — 각 ~10 분.

### 4.4 Phase IV — 자산 + 데이터 + 룸 (~13h)

병렬 가능:
- **WP7 VFX/SFX** (~6h) — 자산 작업 (Aseprite + Audio AI)
- **WP8 데이터 카탈로그** (~2h) — CSV / TS 갱신
- **WP9 디자이너 룸** (~10h) — 9-11 룸

### 4.5 Phase V — 검증 + 문서 (~8h)

- **WP10 QA** (~5h) — 단위 + 통합 + 회귀
- **WP11 문서** (~3h) — Layer 1 정정 + SSoT 갱신 + Themes / gdd-integrity

---

## 5. 일정 추정 (총)

| Phase | 작업 | 시간 |
| :-: | :--- | :-: |
| I | 인프라 (WP1) | 3h |
| II | Cell-level 핵심 (Day 1+2+3) | 16h |
| III | Tier 2/3 채움 | 8h |
| IV | 자산 + 데이터 + 룸 | 13h |
| V | 검증 + 문서 | 8h |
| **합계** | | **~48h** |

**1인 개발 기준 — 6-7 작업일.** 데모 일정과 충돌 시 *Tier 1 (Day 1+2)* 만 12h 분리 가능 (V1 데모 노출).

---

## 6. 위험 + 회귀 방지

| 위험 | 영향 | 대응 |
| :--- | :--- | :--- |
| WP1 의 `tryFreeze` 확장이 기존 R-002 (ice+water freeze) 회귀 유발 | Layer 1 | originalTile 디폴트 = TILE_WATER 유지 + 5색 분기 후 추가 |
| WP4 의 `applyFireAttack` priority 변경이 기존 R-023 (water→steam) 회귀 | Layer 1 | priority 'steam' 최우선 유지, 'toxic' 은 그 다음 |
| WP6 의 magma → WALL 변환이 ItemWorldScene mutation mask 와 충돌 | Layer 2 | mask 가 *AIR + WALL 변환 셀* 모두 처리하도록 확장 (별도 작업) |
| WP2 의 self 변환 (water+acid 희석) 이 R-006 burn chain 과 timing 충돌 | Layer 2 | else-if 순서 — acid 분기 안에 self 변환 먼저, neighbor 변환 다음 |
| WP7 의 신규 SFX 13종 자산 의뢰가 외부 (ElevenLabs) 의존 | Schedule | Tier 1 SFX 5종 우선 의뢰, 나머지 Tier 2 이후 |
| `paintContainerImpact` 확장이 기존 4 fluid paint 회귀 | Layer 1 | 신규 magma 굳음 분기는 *paint 직후 별도 sweep* (기존 paint 로직 그대로) |
| LDtk 룸 9-11개 일괄 작업이 *기존 룸 마이그레이션* 충돌 | Schedule | 신규 룸 별도 LDtk Level 로 (기존 룸 무수정) |
| `Content_System_ChemicalReactions.csv` 신설이 *기존 CSV 빌드 파이프라인* 영향 | Layer 3 | 검증 단계만 사용, runtime 비참조 |
| 5색 균형이 *Forge·Iron 편중* (강력 후보 8중 Forge 4 + Iron 4) | Design | Rust/Spark/Shadow 추가 5/5/5 후보 발굴은 *V1.0 이후* 별도 카드 |

---

## 7. 자산 목록 (Must / Should / Could)

### 7.1 VFX (8종)

- **Must:** Acid green smoke / Magma solidify steam / Brittle shatter / Magma detonation 폭발
- **Should:** Heated metal glow / Electric arc tint variants (3종)
- **Could:** Hydration grass extend / Sludge wall sprite

### 7.2 SFX (13종)

- **Must:** acid_flash / magma_solidify / metal_smelt / brittle_shatter / magma_detonation
- **Should:** acid_sizzle × 3 / oil_drip / heated_metal_hum
- **Could:** static_ignition / cut_grass / chop_wood

### 7.3 Sprite (1종)

- **Should:** Sludge wall (`#1A1208`) — R-NEW-008

### 7.4 Shader (1종)

- **Should:** Heated metal orange overlay — R-NEW-019

---

## 8. 외부 의존

- **Audio AI** (ElevenLabs) — SFX 13종 의뢰 (Tier 1 5종 즉시, 나머지 V1.0 이전)
- **Aseprite 자산** — VFX 4-8종 (자체 + ase:watch 파이프라인)
- **LDtk Editor** — 룸 9-11개 디자인 + Container/FluidSpawner entity 배치
- **Sheets/CSV** — gdd-integrity-checker 자동 검증 의존

---

## 9. 사용자 컨펌 사항

이 계획을 *지금 실행* 하려면 다음 4 항목 컨펌이 필요합니다.

### 9.1 Thunder pulse 50% — 의도된 변경?

코드 `THUNDER_HIT_PCT = 0.50` 가 *legacy 8%* 에서 변경된 상태. 본 계획은 *50% 권위* 로 진행. **반대 의사 있으면 코드 회귀 (WP11 의 일부)**.

### 9.2 Rust 5/5/5 후보 부재 — V1.0 이후 추가?

데모 4 테마 중 Rust 의 *5/5/5 신규 후보 0개*. *Acid Storm / Toxic Detonation* 같은 후보 추가 발굴 작업을 *별도 카드* 로 보류할까요, 아니면 *현 계획에 포함* 할까요?

### 9.3 거절 ⬛ 15 칸 — 거절 유지?

특히 *Physical × fluid* (5건) 가 *마법 검 정체성* 측면에서 재고 가치 있다는 의견 (직전 Q2). *유지* / *Physical × magma·water 일부 추가* 중 선택.

### 9.4 Phase 3 카드 (NM-02/03/07)

본 계획에서는 *후속 카드 등록* 만. *Shock 상태이상 / 원소 퓨전 / entity 빙결 증기* 의 코드 구현은 *Phase 3 (멀티플레이 시기)* 까지 보류.

---

## 10. 다음 단계 — 실행 사이클 진입

사용자 컨펌 후 다음 순서로 실행:

1. **Agent 결과 통합** — `_temp_ChemicalReactions_Matrix39_Design.md` (현재 작성 중) 의 R-NEW-016-054 12 필드 명세 통합
2. **WP1 인프라 작업 시작** — TS 컴파일 0 에러 유지하며 점진적 변경
3. **각 WP 사이클** — 작업 → TS 검증 → 테스트 룸 검증 → 다음 WP
4. **WP10 통합 QA** — 전체 회귀
5. **WP11 문서 동기화** — Layer 1 정정 + SSoT 갱신
6. **데모 빌드 출하** — `/build` + `/deploy`

---

## 11. 부록 — 진행 추적 표 (TaskList)

총 70 작업. 본 사이클 진입 시 *TaskCreate* 로 일괄 등록.

| WP | 작업 수 | 우선 |
| :-: | :-: | :-: |
| WP1 | 7 | P0 |
| WP2 | 17 | P1 |
| WP3 | 8 | P1 |
| WP4 | 17 | P1 |
| WP5 | 6 | P2 |
| WP6 | 2 | P2 |
| WP7 | 13 | P2 (자산) |
| WP8 | 4 | P2 |
| WP9 | 9-11 | P3 (디자이너) |
| WP10 | 5 | P3 (QA) |
| WP11 | 6 | P4 (문서) |
| **합계** | **94-96 작업** | |
