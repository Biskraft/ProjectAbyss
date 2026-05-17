# System_World_ChemicalReactions.md — 화학 반응 시스템 SSoT

> **상태:** V1 통합 SSoT 신설 (2026-05-16)
> **권위:** 본 문서는 화학 반응 매트릭스의 *최고 권위*. 충돌 시 코드 reality 우선, 본 문서 다음 권위.
> **방법론:** 3 에이전트 병렬 전수조사 + 3축 cross-validation (코드 / 기존 GDD / 신규 디자인) 후 통합.
> **임시 출처:** `_temp_ChemicalReactions_CodeAudit.md` (Agent A) / `_temp_ChemicalReactions_DocAudit.md` (Agent B) / `_temp_ChemicalReactions_NewDesign.md` (Agent C) — 통합 후 archive 또는 삭제.

> **자매 문서:** `Documents/Design/Design_World_ChemicalReactions_Roadmap.md` (신규 emergent 로드맵)

---

## 1. 개요

ECHORIS 의 화학 반응 시스템은 *cell × cell* 의 passive interaction, *cell × entity* hazard, *cell × attack* enchant trigger, *entity × cell/entity*, *container × cell*, *spawner* 7 축으로 구성된다. 코드 측 SSoT 는 다음 5 파일:

- `game/src/systems/TileMutator.ts` — passive interaction + overlay 상태
- `game/src/systems/TileHazards.ts` — entity hazard + element attack
- `game/src/effects/FluidSystem.ts` — fluid body + cellular gravity + cell mutation
- `game/src/effects/FluidResidue.ts` — 잔존물 (oil/acid/magma)
- `game/src/entities/ThrowableContainer.ts` — 컨테이너 환경 노출

본 문서는 *코드 reality* 와 *디자인 의도* 의 동기화된 공식 표를 보유한다. 수치 변경 시 *코드 우선 변경* + *본 문서 갱신* 순서 (반대 금지).

---

## 2. 매트릭스 요약 (54 반응)

Agent A 의 전수조사에 따라 ECHORIS 의 화학 반응 시스템은 총 **54개 반응** 으로 구성된다.

| 축 | 개수 | 대표 |
| :--- | :-: | :--- |
| Cell × Cell (passive) | 11 | acid+metal → AIR, magma+ice → water |
| Cell × Entity (hazard) | 11 | magma 첫 접촉 10% + Burn 15s |
| Cell × Attack (enchant) | 12 | Fire × water → steam, Ice × magma → frozen |
| Entity × Cell | 6 | burning prop → 인접 flammable 점화 |
| Entity × Entity | 4 | thrown container × enemy, burning prop chain |
| Container × Cell | 5 | drum 깨짐 → paint, magma 노출 1.5s → 파괴 |
| Spawner | 5 | FluidSpawner / FluidSystem evaporation / gravityTick |
| **총합** | **54** | — |

**미반응 TILE 4종:** PLATFORM (3) / UPDRAFT (4) / SPIKE (5) / VOID (10) — 의도된 *물리 전용* tile.
**준-미반응:** TILE_CHARGED (8) — hazard 만, 자체 mutate 안 함.

---

## 3. Cell × Entity Damage Matrix (권위 수치)

> **권위 결정:** Agent A 가 코드에서 추출한 상수값을 *권위* 로 둔다. 직전 문서들의 수치는 *legacy* 이며 정정 대상.

### 3.1 SHIPPABLE 수치 (코드 file:line + 상수명 인용)

| 위협 | 수치 | 코드 위치 | 비고 |
| :--- | :--- | :--- | :--- |
| **magma 첫 접촉** | `maxHp × 10%` 즉시 + Burn 15s 갱신 | `TileHazards.ts:72` `MAGMA_FIRST_HIT_PCT = 0.10` | 2026-05-14 5× 강화 (이전 2%) |
| **magma Burn 지속** | 15,000 ms | `TileHazards.ts:73` `MAGMA_BURN_DURATION_MS = 15000` | — |
| **acid tick** | `maxHp × 0.5%` per 100 ms | `TileHazards.ts:77-78` `ACID_TICK_PCT = 0.005` / `ACID_TICK_MS = 100` | ~5%/s 명목 |
| **charged tick** | `maxHp × 1%` per **2,500 ms** | `TileHazards.ts:79-80` `CHARGED_TICK_PCT = 0.01` / `CHARGED_TICK_MS = 2500` | ⚠️ 코드 주석 "0.5s" 와 자가-모순 |
| **fire overlay DPS** | `maxHp × 3% × dt/s` + Burn 10s refresh | `TileHazards.ts:81-82` `FIRE_DPS_PCT = 0.03` / `FIRE_BURN_REFRESH_MS = 10000` | AABB+2px 인플레이션 |
| **thunder pulse** | `maxHp × 50%` 단발 | `TileHazards.ts:83` `THUNDER_HIT_PCT = 0.50` | ⚠️ 보스 한방 setup. 문서 8% 는 legacy |
| **Burn DOT** | `maxHp × 2%` per **5,000 ms** | `TileHazards.ts:84-85` `BURN_TICK_PCT = 0.02` / `BURN_TICK_MS = 5000` | ⚠️ 코드 주석 "1s" 와 자가-모순 |
| **frozen 지속** | 15,000 ms | `TileMutator.ts:64` `FREEZE_DURATION_MS = 15000` | "shippable" — Combat 측 1.5~2s spec 무시 |
| **burn 기본 지속** | 9,000 ms (fallback) / 15,000 ms (OIL/WOOD) / 10,000 ms (GRASS) | `TileMutator.ts:38-42`, `:65` | Combat 측 spec 3s 무시 |
| **electric overlay** | 2,500 ms | `TileMutator.ts:66` `ELECTRIC_DURATION_MS = 2500` | — |

### 3.2 정정 결정 — Layer 1 디버전스 16건

다음은 *문서 vs 코드* 불일치 중 *코드 reality 가 권위* 인 항목:

| DIV ID | 항목 | 문서 | 코드 (= 정답) |
| :--- | :--- | :--- | :--- |
| DIV-C-01 | oil residue 잔존 | 10,000 ms | **5,000 ms** |
| DIV-C-11 | Burn tick 간격 | 1 s | **5 s** |
| DIV-C-12 | Burn DOT (Combat_Elements 단독) | 0.03 | **0.02** |
| DIV-C-13 | Burn 기본 지속 (Combat 측) | 3 s | **9-15 s** (cell 종 별) |
| DIV-C-14 | Freeze 지속 (Combat 측) | 1.5-2 s | **15 s** (shippable) |
| DIV-C-15 | Shock 지속 | 2 s | **2.5 s** |
| DIV-C-16 | Shock speed reduction | 0.30 vs 0.40 | **코드 미구현** (NM-02) |
| DIV-C-18 | Charged tick | 0.5 s | **2.5 s** |
| DIV-C-19 | Charged 뇌 펄스 | 8% | **`THUNDER_HIT_PCT = 50%`** 와 동일 메커니즘 |
| DIV-C-20 | Thunder 풀 펄스 | 8% | **50%** (보스 한방 setup) |
| DIV-C-33 | TileSystem.md 자가-모순 oil burn 1.8s vs 15s | — | **15 s** |
| DIV-C-03~07 | BurnableProp burnMs (§7.2.2 outdated) | 800-2500 ms | **§3.0.2 = 코드** (4000-12500 ms) |

**Layer 2 (시각만):** 8건 — 본 문서 §7 자세히.
**Layer 3 (주석):** 5건 — 본 문서 §7 자세히.

---

## 4. Cell × Cell Passive Interaction

> **SSoT:** `TileMutator.tickPassiveInteractions` — `AUTO_INTERACT_INTERVAL_MS = 1000 ms` (코드 `TileMutator.ts:71`).

| ID | 입력 (A + B) | 출력 | chance | 코드 |
| :-: | :--- | :--- | :-: | :--- |
| R-001 | MAGMA + 인접 ICE | ICE → WATER + steam VFX | 4 % / 1s | `TileMutator.ts:412-414` |
| R-002 | ICE + 인접 WATER | WATER → frozen WALL (15s 지속) | 4 % / 1s | `:416-418` |
| R-003 | ACID + 인접 METAL | METAL → AIR (영구) | 6 % / 1s | `:421` |
| R-004 | ACID + 인접 MAGMA | ACID → AIR + steam | 15 % / 1s | `:422-426` |
| R-005 | MAGMA → 인접 flammable | 점화 (GRASS 85 % / WOOD 30 % / OIL 55 %) | 600 ms tick | `:348-365` |
| R-006 | burning OIL/WOOD/GRASS → 인접 flammable | 점화 (chain) | 동일 chance / 600 ms tick | `:330-342` |
| R-007 | OIL burning 만료 | OIL → AIR | 15,000 ms | `:258-275` |
| R-008 | WOOD burning 만료 | WOOD → AIR | 15,000 ms | `:258-275` |
| R-009 | GRASS burning 만료 | GRASS → AIR | 10,000 ms | `:258-275` |
| R-010 | frozen WALL 만료 | 원래 tile 복원 | 15,000 ms | `:245-254` |
| R-011 | electric overlay 만료 | 자연 소멸 | 2,500 ms | `:278-281` |

### 4.1 핵심 발견 — magma 영구 fire source

`MAGMA cell 은 매 600 ms 마다 4-neighbour flammable cell 을 점화 시도` (`TileMutator.ts:348-365`). 즉 *Burn out 없이 영원히 연쇄 점화 source* 로 작동. 직전 문서들이 이 메커니즘을 *명시하지 않았으나* 게임플레이의 핵심 backbone. **본 문서 §4 표에 R-005 행으로 권위 확정.**

### 4.2 fluid × fluid 매트릭스 (4×4 = 16 칸)

| A↓ \ B→ | WATER | OIL | MAGMA | ACID |
| :--- | :--- | :--- | :--- | :--- |
| **WATER** | — | (부재) | (부재 — ice attack 시 R-029) | (부재) |
| **OIL** | (부재) | — | **R-005** (magma → oil 점화) | (부재) |
| **MAGMA** | (부재) | (R-005 동) | — | **R-004** (acid → AIR) |
| **ACID** | (부재) | (부재) | (R-004 동) | — |

**정의 = 2 / 부재 = 14.** 14 빈 셀이 *신규 emergent 1차 타깃 영역* (로드맵 §3.1 참조).

### 4.3 fluid × overlay 매트릭스 (4×3 = 12 칸)

| fluid↓ \ overlay→ | fire (burning) | electric | frozen |
| :--- | :--- | :--- | :--- |
| **WATER** | R-023 (fire attack) | R-030 | R-002 + R-028 |
| **OIL** | R-005-R-006-R-025 | (부재) | (부재) |
| **MAGMA** | self | (부재) | R-029 + R-002 (originalTile=MAGMA) |
| **ACID** | (부재) | R-030 | (부재) |

**정의 = 6 / 부재 = 6.** 부재 6칸 (oil×electric, oil×frozen, acid×fire, acid×frozen, water×fire-passive, magma×fire-self) 도 *신규 emergent 영역*.

---

## 5. Cell × Attack (Element Enchant)

> **SSoT:** `TileHazards.applyFireAttack / applyIceAttack / applyThunderAttack` + EgoShard 충돌 `LdtkWorldScene.onEgoShardImpact`.

| ID | 입력 | 출력 | 코드 |
| :-: | :--- | :--- | :--- |
| R-023 | Fire × WATER | WATER → AIR + steam | `TileHazards.ts:236-239` |
| R-024 | Fire × ICE | ICE → WATER 영구 | `:240-241` |
| R-025 | Fire × OIL/WOOD/GRASS | 점화 (BURN_DURATION_BY_TILE) | `:243-246` |
| R-026 | Fire × BurnableProp footprint | prop.ignite() | `:206-210` |
| R-027 | Fire × oil residue blot | blot → burning 4000 ms | `FluidResidue.ts:269-279` |
| R-028 | Ice × WATER | tryFreeze (15s WALL) | `:261-262` |
| R-029 | Ice × MAGMA | tryFreeze (15s WALL) | `:263-264` |
| R-030 | Thunder × WATER/METAL/ACID | flood-fill chain 2500 ms | `:273-280` |
| R-031 | EgoShard fire impact × 2×2 cells | per-cell sweep + residue ignite | `LdtkWorldScene.ts:4983-4997` |
| R-032 | EgoShard ice impact × 2×2 cells | per-cell tryFreeze | `:4998-5001` |
| R-033 | EgoShard thunder impact × 2×2 cells | per-cell applyThunderChain | `:5002-5007` |
| R-034 | Physical × BREAKABLE(9) | cell → AIR | `:287-295` |

**핵심 발견 — HitManager 원소 분기 0:** 검 swing 일반 데미지 (`HitManager.ts:83-196`) 는 *원소 분기 없음*. 원소 효과는 모두 *attack hook* 으로만 cell 측에 발화. 즉 *적 데미지에 fire/ice/thunder 보정 없음*.

---

## 6. Entity × Cell / Entity × Entity / Container × Cell / Spawner

> 자세한 매트릭스는 임시 파일 (Agent A) 의 §1 축 4-7 참조 — 본 문서는 *권위 결정 사항만* 인용.

### 6.1 컨테이너 환경 노출 (R-045~R-049)

`ThrowableContainer.tickEnvironment` (`ThrowableContainer.ts:759-818`):

| Kind family | acid | magma | fire overlay |
| :--- | :--- | :--- | :--- |
| **Wood family** (Crate · 4 Drum) | 3.0 s → 즉파 | 1.5 s → 즉파 | 1.5 s → 즉파 |
| **MetalCrate** | 1.0 s 마다 1 HP (4 HP = 4 s) | 0.5 s 마다 1 HP (4 HP = 2 s) | 면역 |

**문서 정정:** Agent B 의 DIV 검증으로 *모두 일치* 확인. 본 표가 권위.

### 6.2 magma 영구 fire source + Container

MagmaCrucible 깨짐 → magma cell paint → 인접 flammable 즉시 점화 (R-037, `LdtkWorldScene.ts:4944-4950`). 이는 *600 ms passive spread 를 기다리지 않는 즉발* 분기. 동시에 SteamPuff strength 1.6 (R-038, `:4890-4892`).

---

## 7. 디버전스 정정 결정 일람

> Agent B 가 식별한 30 디버전스에 대한 *최종 결정*.

### 7.1 코드 → 문서 정정 (Layer 1 = 즉시)

Agent B 의 디버전스 (a) Orphan Spec / (b) Undocumented / (c) 수치 불일치 중 *Layer 1* 16건:

| ID | 결정 | 후속 |
| :--- | :--- | :--- |
| DIV-A-01 | 원소 퓨전 (Steam Blast/Plasma Surge/Cryo Shock) | **Orphan 유지 → Phase 3 카드** (Roadmap §4 후속) |
| DIV-B-01 | magma 영구 fire source | **본 문서 §4.1 으로 문서화 완료** |
| DIV-B-02 | aabbNearBurningProp 인접 데미지 | **본 문서 §3.1 fire overlay 행 + 코드 참조 완료** |
| DIV-C-01 | oil residue 5000ms | TileSystem.md / Fluid.md §6.4 정정 (5000ms 로) |
| DIV-C-03~07 | BurnableProp burnMs §7.2.2 outdated | TileSystem.md §7.2.2 *삭제 또는 §3.0.2 와 통합* |
| DIV-C-11 | Burn tick 5s | TileSystem.md / Fluid.md 정정 (5s 로) |
| DIV-C-12 | Burn DOT 0.02 | Combat_Elements.md 정정 (0.02 로) |
| DIV-C-13 | Burn 기본 지속 9-15s | Combat_Damage.md / Combat_Elements.md 정정 + *cell 종 별 분리 명시* |
| DIV-C-14 | Freeze 지속 15s | Combat_Damage.md / Combat_Elements.md 정정 |
| DIV-C-15 | Shock 2.5s | Combat_Damage.md 정정 |
| DIV-C-16 | Shock 미구현 | Combat 측 모두 *"Phase 3 spec — 미구현"* 표시 |
| DIV-C-18 | Charged tick 2.5s | TileSystem.md 정정 + 코드 주석도 정정 |
| DIV-C-19 | Charged 펄스 50% | TileSystem.md 정정 |
| DIV-C-20 | Thunder 펄스 50% | TileSystem.md 정정 + *"보스 한방 setup"* 명시 |
| DIV-C-33 | oil burn 15s 통일 | TileSystem.md §2.11 자가-모순 정정 |

### 7.2 사용자 컨펌 필요 (Q3 미답)

- **Thunder pulse 50%** — 코드 reality 가 의도된 변경인지 (보스 한방 setup) 또는 *legacy 8%* 가 원래 의도인지. 본 문서는 *코드 50% 권위* 로 진행하나, 사용자 컨펌 시 변경 가능.

### 7.3 후속 카드 (Phase 3)

- NM-02 Shock 상태이상 코드 구현
- NM-03 원소 퓨전 (Steam Blast / Plasma Surge / Cryo Shock) 코드 구현
- NM-07 적 빙결 + 화염 → 증기 폭발 (entity 상태이상 기반 — cell-level R-NEW-007 와 별개)
- NM-04 Glossary 화학 반응 용어 등록
- NM-05 Audio Events CSV 의 반응 SFX cue 추가 (6종)

---

## 8. 자가 검증 (3축 cross-check)

### 8.1 Agent A ↔ Agent B 코드 인용 일치

| 항목 | Agent A 인용 | Agent B 인용 | 결과 |
| :--- | :--- | :--- | :--- |
| MAGMA_FIRST_HIT_PCT = 0.10 | `TileHazards.ts:72` | `TileHazards.ts:72` | ✅ 일치 |
| CHARGED_TICK_MS = 2500 | `:79-80` | `:79-80` | ✅ |
| THUNDER_HIT_PCT = 0.50 | `:83` | `:83` | ✅ |
| FREEZE_DURATION_MS = 15000 | `TileMutator.ts:64` | `:64` | ✅ |
| OIL_LIFE_MS = 5000 | `FluidResidue.ts:45` | `:45` | ✅ |
| ACID_TICK_MS = 100 | `TileHazards.ts:78` | `:78` | ✅ |
| OIL_SPREAD_INTERVAL_MS = 600 | `TileMutator.ts:68` | `:68` | ✅ |

→ 두 독립 조사가 같은 코드 reality 를 *완전 일치* 로 짚음. 코드 reality 권위 확정.

### 8.2 Agent C 제안 ↔ Agent A 빈 셀 매핑

Agent C 의 15 신규 반응이 Agent A 가 식별한 *부재 영역* 을 채우는지:

| Agent C R-NEW-XXX | Agent A 부재 영역 (§4.2/4.3 또는 §1 검증 4) | 매핑 |
| :--- | :--- | :--- |
| 001 (water+acid 희석) | fluid×fluid #14 부재 | ✅ |
| 002 (oil 부상) | 검증 4 #3 oil 부유 분리 | ✅ |
| 003 (acid×fire attack) | fluid×overlay acid×fire 부재 | ✅ |
| 004 (oil×ice attack) | fluid×overlay oil×frozen 부재 | ✅ |
| 005 (oil 전기 절연 시각화) | 기존 R-030 명시 강화 | ✅ |
| 006 (acid×ice attack) | fluid×overlay acid×frozen 부재 | ✅ |
| 007 (water+magma → WALL) | 검증 4 #4 water+magma 식힘 stone 부재 | ✅ |
| 008 (oil+acid 응고) | 검증 4 #5 oil+acid 자연 반응 부재 | ✅ |
| 009 (acid+ice 균열) | fluid×overlay 신규 | ✅ |
| 010 (electric+acid tint) | R-030 시각화 | ✅ |
| 011 (WaterBarrel+magma → WALL) | container×cell 확장 | ✅ |
| 012 (AcidVial 연쇄) | container×container 신규 | ✅ |
| 013 (oil-on-water 발화) | R-NEW-002 부산물 emergent | ✅ |
| 014 (water 가 metal 보호) | R-NEW-001 부산물 emergent | ✅ |
| 015 (oil+ice 솔리드 슬릭) | entity hazard 확장 | ✅ |

→ 15 제안 모두 Agent A 의 부재 영역과 *직접 매핑*. 충돌 0건.

### 8.3 코드 변경 회귀 가능성

| Agent C 제안 | 영향 영역 | 회귀 위험 |
| :--- | :--- | :--- |
| R-NEW-004 (oil ice attack) | `tryFreeze` 확장 — `originalTile` | **낮음** (직전 작업으로 originalTile 인자 추가됨) |
| R-NEW-007 (magma → WALL) | `onWallTileChanged` 콜백 | **중간** — ItemWorldScene mask 가 *WALL 변환 셀* 도 cover 해야 (mask 확장 필요) |
| R-NEW-011 (container magma 굳음) | `paintContainerImpact` 확장 | **중간** (기존 paintFluidSplash 로직과 분기 신설) |
| 기타 cell × cell passive | `tickPassiveInteractions` else-if 체인 | **낮음** (기존 패턴 답습) |

### 8.4 niche 정렬 평균

Agent C 15 제안의 점수 합계 = 61, 평균 = **4.07 / 5**. 기준치 3.5 초과 0.57. 시그널 강함.

### 8.5 5색 기질 균형

| 기질 | Tier 1 (7개) |
| :--- | :--- |
| Forge | R-NEW-007, R-NEW-011 |
| Iron | R-NEW-004 |
| Rust | R-NEW-003, R-NEW-009 |
| Spark | R-NEW-005 |
| Shadow | R-NEW-002 |

→ 5색 전부 1+개. 균형 통과.

---

## 9. 갱신 규칙 (반복 정합성 보장)

1. **수치 변경** — 코드 상수 *우선 변경* + 본 문서 §3 표 *동시 갱신*. 다른 GDD 문서는 본 SSoT 인용 (값 직접 박지 않음).
2. **신규 반응 추가** — `Documents/Design/Design_World_ChemicalReactions_Roadmap.md` 의 Tier 분류 거쳐 본 SSoT 의 §4-§6 표에 row 추가.
3. **반응 삭제** — *반응 ID 보존* 후 *DEPRECATED* 표시 (재사용 금지).
4. **자가-모순 발견 시** — 코드 reality 가 권위. 코드 주석 / GDD / 본 문서 *모두 코드에 맞춤*.
5. **gdd-integrity-checker** 가 자동 검증 (다음 §10 룰 참조).

---

## 10. gdd-integrity-checker §16 룰 (신규 추가)

`.claude/skills/gdd-integrity-checker/references/csv_gdd_mapping.md` 에 §16 신규 절 추가 — *반응 매트릭스 cross-validation*:

1. `TileHazards.ts` 의 상수 (MAGMA_FIRST_HIT_PCT / CHARGED_TICK_MS / THUNDER_HIT_PCT / BURN_TICK_MS 등) 가 본 문서 §3.1 의 표와 *완전 일치*
2. `TileMutator.ts` 의 상수 (FREEZE_DURATION_MS / 모든 chance 상수) 가 본 문서 §4 의 표와 일치
3. `FluidResidue.ts` 의 OIL_LIFE_MS / LIFE_MS / OIL_BURN_LIFE_MS 가 본 문서와 일치
4. `BurnableProp.ts` 의 BURNABLE_CATALOG burnMs 가 본 문서와 일치 (TileSystem.md §3.0.2 = 권위, §7.2.2 = 폐기)
5. *코드 주석* 의 수치 텍스트도 코드 상수와 일치 (CHARGED_TICK_MS = 2500 vs 주석 "0.5s" 같은 자가-모순 검출)

---

## 11. 다음 단계

1. **Layer 1 디버전스 16건 정정** — TileSystem.md §3 / Fluid.md §6 / Container.md / Combat_*.md 일괄 갱신 (별도 PR 권장)
2. **Tier 1 신규 반응 7개 구현** — Roadmap §3.1 참조, 추정 ~10 시간
3. **임시 파일 3건 정리** — `_temp_ChemicalReactions_*.md` archive 또는 삭제 (사용자 결정)
4. **Phase 3 카드 등록** — Shock 상태이상 / 원소 퓨전 / Audio cue 6종 / Glossary 용어 (NM-02/03/04/05/07)

---

## 12. 임시 파일 출처 (cross-reference)

본 통합 SSoT 의 *원본 데이터* 는 다음 3 임시 파일에 보존:

- `Documents/System/_temp_ChemicalReactions_CodeAudit.md` — Agent A 의 54 반응 매트릭스 (전체 표)
- `Documents/System/_temp_ChemicalReactions_DocAudit.md` — Agent B 의 30 디버전스 상세
- `Documents/System/_temp_ChemicalReactions_NewDesign.md` — Agent C 의 15 신규 emergent 상세

본 SSoT 통합 후 archive (`memory/wiki/audits/2026-05-16_chemical_reactions/`) 또는 삭제 권장. 사용자 결정 대기.
