# Design_ItemWorld_Themes.md — 아이템계 5 테마 통합 SSoT

> **작성 기준:** V2 — 2026-05-17 단조성 비평 후 슬롯 재설계 + 분산 SSoT 4 위치 본 문서 단일 권위화 (V1 = 2026-05-16). V3 (코드/CSV 라벨, 2026-05-13) 는 폐기.
> **권위:** 본 문서가 *시그니처 데이터 + 서술* 통합 SSoT. CSV / TS 는 본 문서 §2 · §3 · §12 표를 *거울* 로 한다.
> **상위 정의:** `memory/wiki/decisions/DEC-036-Memory-Shard-System.md` (5색 기질 정체성)
> **데이터 거울:** `Sheets/Content_ItemWorld_FluidMapping.csv` / `Sheets/Content_System_FluidTypes.csv` / `Sheets/Content_System_Area_Palette.csv` / `game/src/data/ItemWorldFluidMapping.ts` / `game/src/data/ContainerPools.ts`
> **상태:** 데모 출하 직전 — V1 4 테마 노출 (Forge / Iron / Rust / Spark), Shadow 는 v1.0 정식 공개

---

## 0. V2 변경 요약 (비평 회수)

### 0.1 V1 의 단조성 — Spark / Iron 슬롯 비평 (사용자 지적)

**원본 슬롯 (V1):**

| 기질 | slot_a | slot_b | slot_c | 문제 |
| :-- | :-- | :-- | :-- | :-- |
| Spark | water | acid | **water** | slot_a = slot_c 중복 → 단조 |
| Iron | water | water | water | **3중 동일** → 정체성 없음 |

→ *같은 룸 layout 의 3 슬롯이 동일 fluid* 면 *치환 효과 0* — 기질 차별화 실패. **데이터 비평으로 회수**.

### 0.2 V2 새 슬롯 — 차별화 + 화학 시너지 정렬

| 기질 | slot_a | slot_b | slot_c | 핵심 시너지 |
| :-- | :-- | :-- | :-- | :-- |
| **Forge** | magma | oil | water | *Steam Burst* (water+magma 발열 굳음) + *Smelt* (magma+metal) |
| **Iron** | **cyro** | ice | water | *액화 질소 primary signature (Frozen 상태이상)* + Brittle Metal + Frozen Steel + Cold Front. V2.2 2026-05-17 회수 — 신규 fluid `cyro` (TILE=14) 도입으로 Iron 시그니처 강화 |
| **Rust** | acid | oil | water | *Exothermic Steam* (acid+water 발열) + *Oil Acid Sludge* + *Toxic Flash* |
| **Spark** | **charged** | water | acid | *Arc primary(charged)* ↔ *전도 base(water)* ↔ *확장(acid)* — V2.2 회수 (charged 메커닉 보존) |
| **Shadow** | oil | acid | **magma** | *Surface Ignition* + *Oil Acid Sludge* + *작은 magma vent 함정* |

### 0.3 fluid 분포 정합성

| fluid | 등장 기질 | 역할 차이 |
| :-- | :-- | :-- |
| water | Forge, Iron, Rust, Spark | 각 *trigger 매개* (Forge: Steam Burst 발화제 / Iron: Wet base + Wood Frost / Rust: Exothermic 발화제 / Spark: 전도 base) |
| oil | Forge, Rust, Spark, Shadow | 각 다른 역할 (Forge: 점화 연료 / Rust: Sludge 재료 / Spark: **절연체** / Shadow: 함정 base) |
| acid | Rust, Spark, Shadow | (Rust: 부식 source / Spark: chain 확장 / Shadow: Sludge + Toxic) |
| magma | Forge, Shadow | (Forge: 주력 source / Shadow: 작은 *vent* 함정 — *의외성*) |
| ice | Iron 만 | Iron 의 시그니처 *솔리드 빙판* — Brittle / Frozen Steel 셋업 셀 |
| **cyro** (V2.2) | **Iron 만** | **Iron primary signature — 액화 질소 청백 발광 fluid + Frozen 상태이상 (이동 -60% / 2s)** |
| charged | Spark 만 | Spark primary signature (V2.2) — Arc Scan Cycle + Wet-Conductor Spread |

> *같은 fluid* 라도 *기질별 역할* 이 다르면 *플레이 경험 차별화* 성립. 학습 가능한 패턴 인식.

---

## 1. 정의 (DEC-036 인용)

ECHORIS 의 *5색 기질 (Temperament)* 은 무기 Ego 의 인격을 결정하는 5축. *감정의 색* 으로 인사이드 아웃 매핑에서 가져왔으며, 모든 무기는 1차 기질을 가지고 2차 기질을 보조로 둘 수 있다 (`temperamentPrimary` + `temperamentSecondary`).

아이템계 다이브 시점에 *1차 기질* 이 룸의 fluid · 컨테이너 · hazard · 시각 톤을 결정한다 — *같은 룸 템플릿* 이 다이브할 무기에 따라 5가지 다른 룸 경험으로 분기한다.

| 기질 | 색 | 정념 | 시그니처 단어 | 무기 페르소나 | 룸 페르소나 |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **Forge** | 주황 `#FF6633` | 분노 · 열기 | **단조 / 화염 / 분출** | 단조의 망치 · 화염의 불꽃 | 단조 신전 — 빌더 시설의 주력 화로 |
| **Iron** | 청록 `#3E8E7E` | 결연 · 의지 | **냉각 / 빙결 / 분쇄** | 차분한 강철 · 견고한 의지 | 냉각 격납고 — 빙결 발판 + 취약 강철 |
| **Rust** | 회색 `#8E8678` | 체념 · 부식 | **부식 / 발열 / 응고** | 닳아 가는 칼 · 잊혀진 도구 | 부식 라보 — 산성 사고 + 슬러지 |
| **Spark** | 흰빛 `#E8F0FF` | 호기심 · 전류 | **전도 / 절연 / 격발** | 새 발견의 빛 · 시도의 불꽃 | 전기 회로 홀 — 회로 퍼즐 + 검류 격발 |
| **Shadow** | 자주 `#5A3A5A` | 은밀 · 잠복 | **함정 / 사슬 / 점화** | 어둠 속 단검 · 잊혀진 음모 | 잊혀진 골목 — 기름 함정 + 작은 vent |

---

## 2. 시스템 매트릭스 (V2 신규)

### 2.1 Fluid Slot 매핑 (Generic_A / B / C → 실제 cell value)

| 기질 | Slot A (주력) | Slot B (보조) | Slot C (액센트) | 시그니처 hazard |
| :-- | :-- | :-- | :-- | :-- |
| **Forge** | `magma (6)` | `oil (11)` | `water (2)` | Burn 15s (magma 첫 접촉 10% maxHp) + Steam Burst 굳음 |
| **Iron** | `cyro (14)` | `ice (7)` | `water (2)` | **Frozen 상태이상 -60% 2s** + Brittle Metal + cyro 청백 발광 dominant |
| **Rust** | `acid (13)` | `oil (11)` | `water (2)` | Acid DOT (5%/s) + Exothermic Steam radius 데미지 |
| **Spark** | `charged (8)` | `water (2)` | `acid (13)` | Arc Scan Cycle (R-NEW-031) + Wet-Conductor Spread (R-NEW-025) + Thunder Chain |
| **Shadow** | `oil (11)` | `acid (13)` | `magma (6)` | 미끄러짐 + 점화 사슬 + 작은 vent 함정 |

> 데이터 SSoT: `Sheets/Content_ItemWorld_FluidMapping.csv` (V2 갱신 필요)
> 코드 mirror: `game/src/data/ItemWorldFluidMapping.ts` (V2 갱신 필요)
> **이 표 변경 시 CSV + 코드 동기화 필수.**

### 2.2 Container Pool — 두 모델 병존

#### 2.2.1 Slot 모델 (V2.1 신규, 2026-05-17) — FluidSpawner Generic_A/B/C 와 동일 패턴

LDtk `Container` entity 의 `Kind` 필드에 `Generic_A / Generic_B / Generic_C` 마커를 지정하면 다이브 무기 `temperamentPrimary` 와 슬롯 매핑으로 실제 ContainerKind 가 결정된다. 디자이너는 룸 영역마다 *시그니처 슬롯 spawner 배치* 만으로 톤 표현.

| 기질 | Generic_A (primary signature) | Generic_B (secondary) | Generic_C (accent) | 슬롯 시맨틱 |
| :-- | :-- | :-- | :-- | :-- |
| **Forge** | `MagmaCrucible:4` | `OilDrum:2 \| MetalCrate:3` | `Crate:1` | 화로 코어 → 연료/강철 → 잔존 |
| **Iron** | `CyroCanister:4` | `MetalCrate:5` | `WaterBarrel:2 \| Crate:3` | 청백 액화 질소 통 (cyro primary signature) → 강철 → 냉각수/잔존 |
| **Rust** | `AcidVial:4` | `MetalCrate:5` | `Crate:2` | 산성 라보 → 부식 강판 → 잔존 |
| **Spark** | `ChargedCell:4` | `WaterBarrel:3` | `MetalCrate:3 \| Crate:2` | 보라 배터리 통 (charged primary signature) → 전도 base water → 회로 메탈/잔존 |
| **Shadow** | `OilDrum:3` | `AcidVial:2 \| MagmaCrucible:1` | `Crate:4` | 기름 함정 → 부식+작은 vent → 잔존 |

**해석 규칙:**
- 각 슬롯 값은 *작은 가중치 풀* — `Kind:weight` 단일 또는 `Kind:weight|Kind:weight` pipe-delimited
- 마커가 Generic_A/B/C 인데 temperament 미정 (World 룸) → default `forge` 풀로 fallback (`ContainerPools.DEFAULT_TEMPERAMENT`)
- 명시 Kind (`Crate / MetalCrate / OilDrum / WaterBarrel / MagmaCrucible / AcidVial`) 가 우선. 슬롯보다 강한 override

> 데이터 SSoT: `game/src/data/ContainerPools.ts` `CONTAINER_SLOT_POOLS`
> 코드 진입: `ItemWorldScene.ts` / `LdtkWorldScene.ts` Container entity 루프 + `resolveContainerSlotKind`
> CSV 거울 동기화: `Sheets/Content_ItemWorld_FluidMapping.csv` 에 `container_slot_a/b/c` 컬럼 확장 — **후속 작업 카드** (§10.3)

#### 2.2.2 Pool ID 모델 (legacy, ContainerSpawner 전용)

ContainerSpawner entity (rect + Min/Max/Bias) 가 사용하는 *full 가중치 풀* — 슬롯 분리 없이 한 룸에 N개 kind 의 혼합 분포 생성. World 룸 / 비-아이템계 룸에서 주로 사용.

| 기질 | Pool ID | 가중치 (kind:weight) | 톤 |
| :-- | :-- | :-- | :-- |
| **Forge** | `ItemWorld_Forge` | MagmaCrucible:4 / OilDrum:2 / Crate:1 / MetalCrate:3 | 단조 시설 화로 + 기름 |
| **Iron** | `ItemWorld_Iron` | CyroCanister:4 / MetalCrate:5 / Crate:3 / WaterBarrel:2 | cyro 시그니처 + Brittle setup |
| **Rust** | `ItemWorld_Rust` | AcidVial:4 / MetalCrate:5 / Crate:2 | 산성 + 부식 강판 |
| **Spark** | `ItemWorld_Spark` | ChargedCell:4 / WaterBarrel:3 / MetalCrate:3 / OilDrum:1 / Crate:2 | charged 시그니처 + 전도 base + 회로 |
| **Shadow** | `ItemWorld_Shadow` | Crate:4 / OilDrum:3 / AcidVial:2 / MagmaCrucible:1 | 함정 + 잔존 + 작은 vent |

> 데이터 SSoT: `game/src/data/ContainerPools.ts` `CONTAINER_POOLS`
> GDD: `System_World_Container.md` §12.4

> **§2.2 사용 가이드:** 룸 안 *영역별 톤* 이 명확하면 **Slot 모델 (Generic_A/B/C Container entity)** 사용. *광역 혼합 분포* 가 필요하면 **Pool ID 모델 (ContainerSpawner)** 사용. 두 모델은 동일 룸에서 공존 가능.

### 2.3 시그니처 emergent (신규 화학 반응 통합)

각 기질의 *룸에서 자연 발화 가능한 emergent 사슬*. 데모에서 1-2 회 노출되도록 룸 setup 권장.

#### Forge — *분노의 화로*

| 흐름 | 반응 | 시각 임팩트 |
| :-- | :-- | :-- |
| 1 | magma 풀 옆 metal 다리 → `R-NEW-016 Smelt` | metal cell 사라짐 (적색 빛) |
| 2 | water 풀 + magma 풀 인접 → `R-NEW-007 Steam Burst` | water → AIR + 50% magma → WALL 굳음 + steam |
| 3 | WaterBarrel 던지기 → magma 풀 위 → `R-NEW-011 Impact Solidification` | 인접 magma → WALL + 큰 steam + camera shake 4 |
| 4 | Fire 인챈트 × magma → `R-NEW-020 Magma Surge` | magma 1-tile 확장 |
| 5 | Fire 인챈트 × metal → `R-NEW-019 Heat Metal` | 4s fire overlay (entity DOT) |
| 6 | Thunder 인챈트 × magma → `R-NEW-018 Magma Detonation` ⭐ | 큰 plasma 폭발 + camera shake 4 |
| 7 | MagmaCrucible 깨짐 → 인접 OilDrum 점화 → fire chain | 기존 패턴 강화 |

#### Iron — *얼어붙은 강철 + 액화 질소*

> V2.2 (2026-05-17) — `cyro` (TILE_CYRO=14) primary signature 추가. 아래 R-NEW-CYRO-001~007 은 cyro 셀 환경 발화 (Ice enchant 없이 자연 발현). Iron 룸 모든 영역에서 *Brittle / Frozen 셋업이 자생*.

| 흐름 | 반응 | 시각 임팩트 |
| :-- | :-- | :-- |
| 1 | **cyro + magma 인접 → `R-NEW-CYRO-001 Cryo Burst` ⭐** | cyro 셀 → AIR + 광역 magma → WALL **최대 8 셀** (water+magma 의 1.6×) + 강한 steam |
| 2 | cyro 인접 water → `R-NEW-CYRO-002 Cryo Freeze` | water 자연 freeze (4%/tick, ice 보다 4× 빠름) |
| 3 | **cyro 인접 metal → `R-NEW-CYRO-003 Frozen Steel auto` ⭐** | metal → Frozen Steel WALL (Ice enchant 없이도 환경 발화 6%/tick) → Brittle Metal 1-hit 즉파 셋업 |
| 4 | cyro 인접 oil/acid → `R-NEW-CYRO-004 Frozen Oil/Acid auto` | tryFreeze 임시 발판 (8s / 5s) |
| 5 | cyro 인접 wood → `R-NEW-CYRO-005 Wood Frost auto` | wood → 10s frozen WALL (임시 발판) |
| 6 | cyro 인접 grass → `R-NEW-CYRO-006 Grass Wither cryo` | grass → AIR (시들음) |
| 7 | **Fire 인챈트 × cyro → `R-NEW-CYRO-007 Cryo Evaporation`** | cyro → AIR + 강한 steam |
| 8 | entity 가 cyro 셀 접촉 | **Frozen 상태이상 (-60% 이동 / 2s)** + light DOT 1%/1s + fire/burn 즉시 소화 (water 동등) |
| 9 | Ice 인챈트 × metal → `R-NEW-021 Frozen Steel` (legacy) | Ice enchant 강제 발화 — cyro 환경 발화의 명시적 변종 |
| 10 | Physical (검 swing) × Frozen metal → `R-NEW-017 Brittle Metal` ⭐ | 1 hit 즉파 (분쇄 VFX) |
| 11 | MetalCrate 가 ice 위 + 검 swing → `R-NEW-054 Brittle Crate` ⭐ | 4 HP 무시 즉파 |
| 12 | Wood Crate 가 water 위 + fire 근처 → `R-NEW-049 Waterlogged` | 불 면역 (방어 setup) |
| 13 | Wood Crate 가 ice 위 → `R-NEW-051 Frozen Crate` | 모든 환경 면역 (영구 발판) |
| 14 | Ice 인챈트 × wood → `R-NEW-044 Wood Frost` (legacy) | wood → 10s frozen WALL — cyro 환경 발화의 명시적 변종 |
| 15 | water 옆 ice → `R-NEW-040 Cold Front` | water 자기 freeze (점진 확장) |

#### Rust — *발열 부식 사고*

| 흐름 | 반응 | 시각 임팩트 |
| :-- | :-- | :-- |
| 1 | acid + water 인접 → `R-NEW-001 Exothermic Steam` ⭐ | acid → AIR + 강한 steam + radius damage + 컨테이너 위로 발사 |
| 2 | Fire 인챈트 × acid → `R-NEW-003 Toxic Acid Flash` | acid → AIR + 녹색 toxic 증기 |
| 3 | acid + oil 인접 → `R-NEW-008 Oil Acid Coagulation` | oil → 검정 WALL (sludge 봉쇄) |
| 4 | acid + ice 인접 → `R-NEW-009 Acid Ice Crack` | ice → water (시간차 다리 붕괴) |
| 5 | acid + wood/grass 인접 → `R-NEW-026/032` | wood/grass → AIR (부식/시듦) |
| 6 | AcidVial 던지기 → 컨테이너 군집 → `R-NEW-012 Acid Container Chain` | 도미노 파괴 |
| 7 | Ice 인챈트 × acid → `R-NEW-006 Frozen Acid` | acid → 5s 임시 다리 |

#### Spark — *전도와 절연의 회로 퍼즐*

> V2 변경 핵심. *전도 base (water) + 절연체 (oil) + 확장 chain (acid)* 3 요소 조합이 *호기심·발견* 톤의 핵심.

| 흐름 | 반응 | 시각 임팩트 |
| :-- | :-- | :-- |
| 1 | Thunder 인챈트 × water → `R-030 Thunder Chain` | electric chain BFS |
| 2 | oil 셀이 water 풀 사이 → `R-NEW-005 Electric Insulation` | thunder chain 차단 (oil 경계 spark) |
| 3 | acid 셀이 water 와 인접 → `R-NEW-010 전도 오염` | chain 범위 확장 (녹색 arc) |
| 4 | Thunder × magma → `R-NEW-018 Magma Detonation` ⭐ | 큰 polysm 폭발 (검류 격발 시그니처) |
| 5 | Thunder × ice → `R-NEW-022 Shatter Pulse` | ice → AIR + 30% maxHp + 작은 폭발 |
| 6 | Thunder × wood/grass → `R-NEW-046/047 Static` | 1.5s electric overlay |
| 7 | electric 만료 + wood/grass → `R-NEW-034 Static Ignition` | 40% 자연 점화 (지연 함정) |
| 8 | frozen water/metal + thunder → `R-NEW-043 Frozen Conductor` | 50% 약화 chain (도전 요소) |

**퍼즐 디자인 예:**
- *두 water 풀이 oil 셀 한 줄로 분리됨* → Thunder 가 한쪽만 chain → 다른 쪽 닿으려면 *oil 점화로 제거*
- *acid + water 인접* → Thunder 가 *더 멀리* 도달 → 깊은 곳 적/스위치 격발

#### Shadow — *기름 함정의 그림자*

> V2 변경 핵심. *작은 magma vent* 추가로 점화 trap setup 강화.

| 흐름 | 반응 | 시각 임팩트 |
| :-- | :-- | :-- |
| 1 | oil 풀 위 water → `R-NEW-002 Oil Float` | oil 가 water 위로 부상 (수면 발화 setup) |
| 2 | oil + acid 인접 → `R-NEW-008 Oil Acid Coag` | sludge WALL (경로 동적 봉쇄) |
| 3 | 수면 oil 가 fire/magma 인접 → `R-NEW-013 Surface Ignition` ⭐ | 자동 emergent, 수면 화재 |
| 4 | oil 풀 + magma vent (작은 1-2 셀) → `R-NEW-005 점화` | 작은 vent 가 oil 풀 전체 점화 |
| 5 | oil 셀 인접 wood/grass + fire → `R-NEW-024/027 Oil-Soaked` | burn duration 1.67× |
| 6 | Ice 인챈트 × oil → `R-NEW-004 Frozen Oil` | oil → 8s 발판 (임시 우회) |
| 7 | OilDrum 던지기 → 광역 oil paint → fire trap setup |  연쇄 trap 설계 |

---

## 3. 시각 톤 (Visual Tone)

### 3.1 Palette (parallax + ambient) — V2 (2026-05-17 primary fluid 색 정렬)

각 기질의 *primary fluid 색* 이 배경 hue 주도. slot_b/c 는 강조 hue 보조.

| 기질 | primary fluid | 배경 hue (base + 광원/잔향) | 강조 hue (slot_b/c 반영) | parallax tint |
| :-- | :-- | :-- | :-- | :-- |
| **Forge** | magma → **주황** | 짙은 검 + 주황 화로 광원 (`#1A0A05` + `#FF6633`) | 단조 광택 (`#FFBB66`) + 기름 갈색 (`#664422`) | `#3A1408` |
| **Iron** | water → **청록** + ice 청광 | 차가운 청록 회색 (`#1C2A2A` + `#2E4848` water surface) | 강철 광 (`#7AA0A0`) + ice 청광 (`#B0D0E0`) | `#152828` |
| **Rust** | **acid → 녹색** | **산성 녹-회색 (`#1F2A1A` + `#2A4422` acid 안개)** | **acid 형광 (`#88CC44`) + 산화 황 (`#A0883A`)** | **`#1A2A18`** |
| **Spark** | water → 청자 + slot_c acid 녹색 | 청자 백광 (`#1A2230` + `#2A3840` electric base) | 아크 백색 (`#E8F0FF`) + acid arc 녹색 (`#66CC22`) | `#0F1A2A` |
| **Shadow** | oil → **검갈색** + slot_c magma vent | oil 검갈 + 자주 혼합 (`#1A1208` + `#1A0F1A`) | 흐릿한 자수정 (`#7A5A8A`) + 작은 magma vent spot (`#FF6633`) | `#1F1422` |

**V2 변경 핵심:**
- **Rust**: 이전 *회색 사막* (#3A352D) → 현 *산성 녹-회색* (#1F2A1A). primary=acid 이므로 *녹색이 메인*. 사용자 지적으로 회수.
- **Shadow**: 이전 *자주 검정* (#1A0F1A) → 현 *oil 검갈색 + 자주 혼합*. primary=oil 의 *어두운 갈색* 본질 반영. 작은 magma vent 주황 점은 그대로.
- **Iron**: 배경에 water surface (#2E4848) 보조 추가 — water primary 강화.
- **Spark**: 배경에 electric base (#2A3840) 보조 추가 — thunder pulse 톤 부각.
- **Forge**: 기름 갈색 강조 추가 — slot_b=oil 반영.

### 3.2 Halo (FluidSystem 자체 발광)

발광 fluid (V2.2): magma · lava · acid · **charged** · **cyro** (BlurFilter halo pulse). water · oil · ice 는 halo 없음.

| 기질 | 발광 fluid 분포 | 룸 광원 결과 |
| :-- | :-- | :-- |
| **Forge** | magma 풍부 (slot_a) | 따뜻한 다중 광원 — *대장간 화로* 톤. 강도 매우 강 |
| **Iron** | **cyro 풍부 (slot_a, V2.2)** | **청백 발광 dominant** — *액화 질소 격납고* 톤. ice (slot_b) 청광 반사 디테일과 결합 — *Made in Abyss 6층 격리 코어* |
| **Rust** | **acid 풍부 (slot_a)** | **형광 녹색 광원** — *부식 실험실* 톤. Toxic Flash 시 *순간 강렬* |
| **Spark** | **charged 풍부 (slot_a, V2.2)** | **보라 발광 dominant** — Arc Scan Cycle 의 *전기선 깜빡임* + Thunder pulse spike |
| **Shadow** | 작은 magma vent (slot_c) 만 | 어두운 base + *vent 점만 빛남* (Made in Abyss 메가스트럭처 톤) |

### 3.3 시각 분위기 카드 (한 줄 묘사)

플레이어가 *첫 진입 5초* 안에 느껴야 할 톤:

| 기질 | 첫 5초 인상 |
| :-- | :-- |
| **Forge** | "용광로 안에 들어왔다. 단조의 망치 소리가 멀리서 울린다." |
| **Iron** | "액화 질소가 안개처럼 흐른다. 청백 발광이 깊은 곳을 비춘다. 강철은 영하에서 굳어있다." |
| **Rust** | "산성 안개. 녹색 형광이 깜빡인다. 모든 것이 *부식 중*." |
| **Spark** | "전기가 흐른다. 회로의 푸른 빛이 깊은 곳까지 이어진다." |
| **Shadow** | "기름 위 그림자. 멀리 단 하나의 점이 빛난다. *vent*." |

---

## 4. 청각 톤 (Audio Direction)

> 상세: `Documents/System/System_Audio_Direction.md` + `Sheets/Content_System_Audio_Events.csv`.

| 기질 | BGM cue (V2 예정) | ambient SFX | 시그니처 SFX |
| :-- | :-- | :-- | :-- |
| **Forge** | `iw_forge_loop_01` | 화로 송풍 + 망치 멀리 | magma boil + 단조 일격 + steam_burst |
| **Iron** | `iw_iron_loop_01` | 응결수 떨어짐 + 금속 진동 + ice creak | brittle shatter + frozen steel |
| **Rust** | `iw_rust_loop_01` | 산성 fizz + 녹슨 진동 | acid_flash + sludge bubble |
| **Spark** | `iw_spark_loop_01` | 전기 hum + 회로 tick | thunder crackle + insulation spark |
| **Shadow** | `iw_shadow_loop_01` | 침묵 + 흐릿한 발자국 | oil drip + 작은 magma vent hiss + 그림자 속삭임 |

---

## 5. 내러티브 모티프

| 기질 | 시설 모티프 | 검 Ego 대사 (V2 어조) |
| :-- | :-- | :-- |
| **Forge** | 단조 신전 — 거대 빌더의 *생산의 신전* | "여기서 만들어졌다. 망치 소리가 아직도 들린다." |
| **Iron** | 냉각 격납고 — 식어버린 *결연의 보관소* | "차게 굳었구나. 그러나 끊어지진 않는다." |
| **Rust** | 부식 라보 — 산화한 *실험의 잔해* | "녹은 시간이다. 잊혀진 시도들이." |
| **Spark** | 전기 회로 홀 — 살아 있는 *호기심의 회로* | "여전히 흐른다. 누군가가 시도한 빛이." |
| **Shadow** | 잊혀진 골목 — 빛이 닿지 않은 *은밀한 통로* | "여기에 누가 있었는가. 흔적조차 흐릿하다." |

---

## 6. 데모 우선순위

| 데모 노출 | 기질 | 노출 룸 수 | 시그널 강도 | 핵심 demo emergent |
| :-: | :-- | :-: | :-- | :-- |
| ◎ | Forge | 2-3 | BLAME!/단조 시설 louder | Smelt + Steam Burst + Impact Solidification |
| ○ | Iron | 1 | 차분 톤 콘트라스트 + *Sekiro 분쇄* | Brittle Metal + Brittle Crate (와우 모먼트) |
| ◎ | Rust | 2 | 부식 라보 — 1차 niche *시설 폐기* + *Exothermic 사고* | Exothermic Steam + Toxic Flash + Oil Acid Sludge |
| ○ | Spark | 1 | 전기 회로 퍼즐 + 검류 격발 | Magma Detonation + 전도/절연 퍼즐 |
| ✕ | Shadow | 0 (trailer 컷 1) | v1.0 정식 | (데모 외) Surface Ignition + magma vent |

---

## 7. 5색 기질 *고유 와우 모먼트* (각 기질 1개)

각 기질의 *데모 트레일러 1 컷 후보* — 1차 niche 시그널 *louder*.

| 기질 | 와우 모먼트 | 시각 임팩트 |
| :-- | :-- | :-- |
| **Forge** | WaterBarrel 을 magma 풀에 던져 *지형이 굳어 발판이 되는* 순간 | 큰 steam + camera shake + WALL 생성 |
| **Iron** | Ice 인챈트 후 Frozen MetalCrate 를 *검 1회로 분쇄* | Brittle shatter VFX (Sekiro 톤) |
| **Rust** | acid 풀에 water 가 흘러들어 *발열 폭발 + 컨테이너가 위로 발사* | radius damage + 컨테이너 vy -200 |
| **Spark** | Thunder × magma → *큰 plasma 폭발* + 인접 적 50% maxHp 한방 | 보라 PUFF_TINT_PLASMA + shake 4 |
| **Shadow** | oil 풀 위로 *작은 magma vent* 한 방울 → 수면 전체 화재 | Surface Ignition 자동 emergent |

---

## 8. Cross-Reference (분산 SSoT 일람)

| 영역 | 위치 | 역할 |
| :-- | :-- | :-- |
| 5색 기질 정의 원전 | `memory/wiki/decisions/DEC-036-Memory-Shard-System.md` | 인사이드 아웃 매핑 + 정체성 |
| Fluid 매핑 데이터 SSoT | `Sheets/Content_ItemWorld_FluidMapping.csv` | 5×3 slot + container_pool_id |
| Fluid 매핑 코드 mirror | `game/src/data/ItemWorldFluidMapping.ts` | runtime 매핑 |
| Container Pool 카탈로그 | `game/src/data/ContainerPools.ts` | 9 Pool |
| Fluid 시스템 GDD | `Documents/System/System_World_Fluid.md` §3.4, §10 | Generic IntGrid + Spawner |
| Container 시스템 GDD | `Documents/System/System_World_Container.md` §12.4 | Pool 가중치 |
| **화학 반응 SSoT (V2 신규)** | **`Documents/System/System_World_ChemicalReactions.md`** | **54 + 39 신규 반응 매트릭스** |
| **화학 반응 매트릭스** | **`Documents/Design/Design_ChemicalReactions_FullMatrix.md`** | **4 매트릭스 시각 표** |
| **화학 반응 로드맵** | **`Documents/Design/Design_World_ChemicalReactions_Roadmap.md`** | **Tier 1/2/3 + 의존성** |
| **화학 반응 테스트 케이스** | **`Documents/System/System_World_ChemicalReactions_TestCases.md`** | **76 체크박스 + 룸 setup** |
| Audio 방향 | `Documents/System/System_Audio_Direction.md` | BGM/SFX 방향 |
| Audio Event 카탈로그 | `Sheets/Content_System_Audio_Events.csv` | cue id SSoT |
| 무기 Ego (검 인격) | `Documents/System/System_Combat_Weapons.md` | 무기-기질 결합 |
| 메모리 코어 정의 | `Documents/System/System_Memory_Core.md` | 핵심 기억 / 단편 |
| Shadow 마을 design | `Documents/Design/Design_ItemWorld_Town_Shadow.md` | Shadow 한 기질 룸 |

---

## 9. 갱신 규칙

1. *데이터 변경* (slot / pool / 가중치) — CSV 또는 코드 카탈로그 *먼저 갱신*, 본 문서 §2 표는 *거울* 사후 동기화
2. *기질 정체성 변경* (색 / 정념 / 페르소나) — DEC-036 갱신 후 본 문서 §1 동기화
3. *데모 우선순위 변경* — §6 만 갱신
4. *cross-validation* 은 `gdd-integrity-checker` §16 룰이 자동 검출
5. *V2 단조성 비평 회수* — Spark/Iron 슬롯 재설계는 본 문서 §0 에 명시. 향후 재단조화 결정 시 §0 참조

---

## 10. 거울 동기화 상태 (P0 stale 추적)

> 본 문서 §2.1 / §2.2 / §3.1 권위 표와 실제 거울 (CSV / TS) 의 값이 다른 항목. 동기화 완료 시 행 삭제.

### 10.1 Fluid Slot 매핑 거울 동기화

**상태:** 전체 SSoT 일치 ✓ (Spark V2.2 2026-05-17 회수 완료, ⚠ 카드 해소)

### 10.2 거울 동기 완료 항목 ✓

- **Fluid Slot 매핑 10 항목 (2026-05-17 동기화)**:
  - Forge slot_a/b/c (water→magma/oil/water)
  - Iron slot_a (water→**cyro**) — V2.2 신규 fluid 액화 질소 primary signature
  - Iron slot_c (acid→water)
  - Rust slot_a/b/c (water/acid/oil→acid/oil/water)
  - Shadow slot_a/b (water/oil→oil/acid)
  - **Spark slot_a/b swap (water/charged→charged/water) — V2.2 회수, charged primary signature 채택**
- **신규 fluid `cyro` (TILE_CYRO=14) 추가** (V2.2 2026-05-17):
  - `game/src/core/Physics.ts` TILE_CYRO + isCyro + isInCyro
  - `Sheets/Content_System_FluidTypes.csv` cyro 행
  - `game/src/data/FluidTypes.ts` FluidType union 'cyro'
  - `game/src/effects/FluidSystem.ts` FLUID_CELL_TYPES + halo
  - `game/src/systems/FluidSpawner.ts` FluidSpawnerType 'cyro'
  - `game/src/systems/TileHazards.ts` CYRO_TICK + frozenRemainingMs + CYRO_FROZEN_SLOW_PCT export
  - `game/src/combat/ElementAffinity.ts` hazardToElement cyro → 'ice'
- **신규 ContainerKind 2종 추가** (V2.2, LDtk enum 명명 고정):
  - `ChargedCell` — Spark primary signature container (보라 배터리 통, 깨지면 charged 풀 spawn)
  - `CyroCanister` — Iron primary signature container (청백 액화 질소 통, 깨지면 cyro 풀 spawn + Frozen 상태)
- Container Pools 5 종 (`game/src/data/ContainerPools.ts`) = §2.2.2 일치
- Container Slot Pools 5×3 (`game/src/data/ContainerPools.ts`) = §2.2.1 일치
- Area Palette 5 종 (`Sheets/Content_System_Area_Palette.csv`) = §3.1 일치
- Fluid Mapping CSV / TS = §2.1 권위 표 완전 일치
- LDtk enum 표기 — `Cyro` PascalCase (오타 고정, 사용자 명시 2026-05-17). 코드는 lowercase `cyro` / `TILE_CYRO` / `isCyro` 로 일관 mirror.

### 10.3 미해결 / 후속

| 항목 | 우선순위 | 비고 |
| :-- | :-- | :-- |
| Shadow 본격 도입 | v1.0 | 데모 trailer 컷 1개 |
| 2차 기질 (temperamentSecondary) 영향 | V2 | 현재 1차만, 2차는 *blend* 로 약하게 |
| Parallax tint 실제 구현 | V2 | §3.1 hex 코드 mirror, LdtkRenderer 측 미구현 |
| BGM cue 실제 자산 | V2 | ElevenLabs 의뢰 5 cue |
| Iron *metal-flooded* 변종 | V2 (skip) | V2 ice 시너지로 대체 — 미실현 |
| `System_World_TileSystem.md` §2.8 charged 폐기 라벨 정리 | V2 | TIL-08 "제작 필요" stale — 실제 구현 완료 |
| `Content_ItemWorld_FluidMapping.csv` 에 `container_slot_a/b/c` 컬럼 확장 | V2.1 | §2.2.1 Slot 모델 데이터 SSoT 거울. 값 형식 `Kind:weight\|Kind:weight` |

---

## 11. V2 비평 — Spark / Iron 단조 사례 학습

**비평 입력 (사용자, 2026-05-17):** "Spark = water/acid/water 가 단조롭지 않은가? 비평적으로 검토하라."

**확장 비평 (재검토):**
- Spark 의 slot_a = slot_c = water → *두 슬롯이 같은 fluid* → 룸 안 *3 영역 중 2 영역 동일* → 시각/메커닉 단조
- Iron 의 *3 슬롯 모두 water* → *템플릿 치환 효과 0* → "기질 따라 룸이 달라진다" 의 *Spark/Iron 차별화 실패*
- 5 기질 중 *4 기질에 water 등장* — 정합성 양호. 단 *역할 다름* 명시 필요

**V2 회수 결정:**
- Spark: **charged** / water / acid — *Arc primary / 전도 base / 확장* (V2.2 2026-05-17 회수 — V2 oil 절연 회로 안은 charged 메커닉 보존 우선으로 폐기)
- Iron: water / **ice** / water — *Brittle / Frozen Steel / 임시 발판* 시너지
- Shadow: oil / acid / **magma** — *기존 oil/acid 톤 + magma vent 의외성*

**원칙 도출:**
> 5 기질의 3 슬롯에서 *같은 fluid 가 2 슬롯 이상 등장* 하지 않도록 한다 (Iron 의 water-ice-water 는 예외 — *환경 셀로 차별*).
> *fluid type 다양성* + *역할 차별화* 양쪽 점검.

이 원칙을 향후 *기질 slot 재설계* 시 항상 적용.

---

## 12. charged 속성 전수 — Spark 기질 시그니처 메커닉 (2026-05-17 통합)

> **목적:** charged 관련 정보가 6 위치 (`Physics.ts` / `FluidTypes.csv` / `TileHazards.ts` / `TileMutator.ts` / `FluidSystem.ts` / `TileSystem.md`) 에 분산되어 메커닉 전모 추적 불가. 본 §12 가 *charged 단일 권위 SSoT* — 정의 · 데이터 · 동작 · 시너지 · 거울 · stale 모순 통합.
> **데이터 거울:** `Sheets/Content_System_FluidTypes.csv` (charged 행) / `game/src/core/Physics.ts` (TILE_CHARGED=8) / `game/src/systems/TileHazards.ts` (tick 수치) / `game/src/effects/FluidSystem.ts` (Arc Scan / Wet-Conductor 상수).

### 12.1 이중 정체성 (정적 hazard tile + dynamic fluid body)

charged 는 **단일 TILE_ID 8** 이지만 *두 가지 동작 모드* 를 가진다 — 이게 분산 분류의 근본 원인.

| 모드 | 조건 | 처리 시스템 | 효과 |
| :-- | :-- | :-- | :-- |
| **정적 hazard** | TILE_CHARGED 셀 (placement 무관) | `TileHazards.ts:applyTileHazards` | 체류 시 1%/2.5s tick DOT |
| **dynamic fluid body** | TILE_CHARGED 셀이 *연결된 풀 모양* | `FluidSystem.ts:bodies` | Arc Scan Cycle + Wet-Conductor Spread |

두 모드는 *동시 발현*. 즉 풀 모양 charged 영역에 entity 가 들어가면 `TileHazards` tick + `FluidSystem` arc 양쪽 동시 작동.

### 12.2 권위 데이터 표

| 항목 | 권위 값 | 출처 | 비고 |
| :-- | :-- | :-- | :-- |
| TILE_ID | `8` | `Physics.ts:51` `TILE_CHARGED = 8` | — |
| 통과/솔리드 | 통과 (passable) | `Physics.ts` 분류 | — |
| 표면 색 (fluid render) | `#A05AE5` (보라) | `FluidTypes.csv` `charged` 행 `surface_color` | FluidSystem halo 적용 |
| body 색 (fluid render) | `#3A1A66` (어두운 보라) | `FluidTypes.csv` `body_color` | — |
| glow 색 | `#C088FF` | `FluidTypes.csv` `glow_color` | 발광 fluid 4종 중 하나 |
| Tick DOT | `maxHp × 1%` / `2,500 ms` | `TileHazards.ts:88-89` `CHARGED_TICK_PCT=0.01` / `CHARGED_TICK_MS=2500` | 체류 시간 비례 |
| Arc Discharge damage | `maxHp × 5%` | `FluidSystem.ts:161` `ARC_DAMAGE_PCT=0.05` | discharge 적중 1회 |
| Charge Inhabit buff | `3,000 ms` | `FluidSystem.ts:163` `ARC_CHARGED_BUFF_MS=3000` | water/metal/acid 1회 thunder chain 트리거 |
| Element Affinity 그룹 | `thunder` | `ElementAffinity.ts:57` | — |
| FluidSpawner type | `'charged'` | `FluidSpawner.ts:28` | tile=8 매핑 |
| Generic 마커 매핑 | Spark slot_b (stale V3) | `ItemWorldFluidMapping.ts:60` | §10.1 ⚠ 재검토 카드 |

### 12.3 동작 — 정적 hazard

`isInCharged(AABB, roomData)` 가 true 인 entity 에 대해 `applyTileHazards` 가:

1. `chargedTickAccum += dtMs`
2. 누적 ≥ 2,500 ms 마다 `maxHp × 1%` damage (`source = 'charged'`)
3. 영역 이탈 시 `chargedTickAccum = 0` 리셋

> **Player / Enemy / ThrowableContainer 적용:** Player.ts 와 Enemy.ts 가 HazardTarget 인터페이스의 `chargedTickAccum` 필드를 보유. ThrowableContainer 의 MetalCrate 만 `chargedRemainingMs` 별도 카운트 — TILE_CHARGED 접촉 중 charged 상태 유지, 다음 thunder hit 시 강화 (`isCharged()` true).

### 12.4 동작 — Wet-Conductor Spread (R-NEW-025)

`FluidSystem.attachGrid` / `rebuildFromGrid` 직후 1회 호출되는 `markElectrifiedBodies()`:

1. `bodies.filter(b => b.type === 'charged')` 추출
2. 각 charged body 의 cells 가 water body cells 와 *4-인접* 인지 검사
3. 인접한 water body → `isElectrified = true` (영구 마크)
4. 비용: `O(charged_cells × 4)`

**결과:** 전도화 water body 는 charged body 와 *동일하게* Arc Scan Cycle 진행. 즉 water + charged 풀이 인접하면 *두 풀 모두 전기적으로 위험*.

### 12.5 동작 — Arc Scan Cycle (R-NEW-031 v2)

`charged body` 또는 `electrified water body` 가 *4 페이즈 사이클* 진행:

| 페이즈 | 지속 시간 | 동작 |
| :-- | :-- | :-- |
| **scan** | (가변) | 인접 conductor 검색 — 전기선 후보 결정 |
| **hold** | 1,500 ms | arc 선 완전 연결, 깜빡임 강화 (warning) |
| **discharge** | 즉시 | `onArcDischarge` 콜백 — entity damage + charged buff + thunder chain trigger |
| **recover** | 3,000 ms | 사이클 휴식, 끝나면 다시 scan |

각 ArcLink 의 target 종류별 효과:
- **entity (player / enemy):** `ARC_DAMAGE_PCT × maxHp` thunder damage + `ARC_CHARGED_BUFF_MS` Charge Inhabit buff
- **metal container:** `chargedRemainingMs` 마크 (다음 thunder 적중 시 강화)
- **fluid (water):** `isElectrified = true` 보강

### 12.6 동작 — Charge Inhabit (entity buff)

`target.chargedStateMs > 0` 인 entity 는 *전도화 상태* — `applyTileHazards` 가:

1. AABB 내 water / metal / acid 셀 1개 검색
2. 발견 시 `mutator.applyThunderChain(roomData, gx, gy)` 1회 trigger
3. buff 소비 (`chargedStateMs = 0`)

즉 Arc Discharge 에 맞은 entity 는 *3 초 동안 다음 conductor 셀 접촉 시 보조 thunder chain* 을 일으킨다 — 시그니처 wow.

### 12.7 동작 — Thunder Chain conductor 그룹

`TileMutator.applyThunderChain` 의 conductor 판정:

```
isStandardConductor = (t === WATER || t === METAL || t === ACID || t === CHARGED)
```

즉 charged 셀은 **water / metal / acid 와 동일한 전도체 그룹**. thunder chain BFS 가 이 4 종을 통해 전파.

**R-NEW-028 Charge Multiplier:** charged 풀 안에서 발생한 electric overlay 는 *duration 2 배*. 즉 *charged 풀 위에 thunder 직격* 시 *DOT 가 두 배 오래 적용*.

### 12.8 화학 반응 매트릭스에서의 charged 역할

> 권위: `Documents/Design/Design_ChemicalReactions_FullMatrix.md` (매트릭스) + `Documents/System/System_World_ChemicalReactions.md` (54 반응)

| 반응 | 트리거 | 결과 |
| :-- | :-- | :-- |
| **R-NEW-021 Arc Discharge** | Arc Scan discharge | entity thunder damage + Charge Inhabit buff |
| **R-NEW-025 Wet-Conductor** | charged body + water body 인접 | water body isElectrified=true |
| **R-NEW-028 Charge Multiplier** | charged 풀 안 electric overlay | duration 2× |
| **R-NEW-031 Arc Scan Cycle** | charged or electrified water body | 4-phase 사이클 |
| **R-NEW-040 Cold Front (역)** | charged + ice — 미정 | charged 풀의 ice 화 가능성 (미구현) |
| **R-NEW-043 Frozen Conductor** | charged + frozen water | thunder chain 50% 약화 (도전 요소) |
| **R-NEW-046 Wooden Static** | charged 인접 wood | wood electric 1.5s (점화 X, 펄스만) |
| **R-NEW-047 Grass Field Charge** | charged 인접 grass | grass 정전기 — Player 미끄러짐 무효 + 이동 -20% |

### 12.9 stale 모순 (즉시 정리 필요)

| 항목 | stale 위치 | stale 값 | 본 SSoT 정답 | 우선도 |
| :-- | :-- | :-- | :-- | :-: |
| Tile 색상 | `System_World_TileSystem.md` §2.8 | `#FFEE44` 노랑 | **`#A05AE5` 보라** (FluidTypes.csv) | P1 — TileSystem.md 정정 |
| Tick 시간 | `System_World_TileSystem.md` §2.8 + §3.1 | `0.5 s` | **`2.5 s`** (`CHARGED_TICK_MS=2500`) | P1 — TileSystem.md 정정 (이미 `ChemicalReactions.md §3.1` 에서 자가 검출됨) |
| 뇌 펄스 | `System_World_TileSystem.md` §3.1 | `maxHp × 8%` | **`maxHp × 50%`** (`THUNDER_HIT_PCT=0.50`) | P1 — TileSystem.md 정정 (`ChemicalReactions.md §3.1` DIV-C-19 자가 검출됨) |
| TIL-08 구현 라벨 | `System_World_TileSystem.md` §1 | "P1 ⬜ 제작 필요" | **구현 완료** (TileHazards / TileMutator / FluidSystem 전부 작동) | P1 — TileSystem.md 정정 |
| LDtk slot 8 identifier | `World_ProjectAbyss.ldtk` IntGrid 슬롯 | `null` | **`Charged`** (PascalCase) | P2 — LDtk 데이터 추가 |
| Spark slot_b | `ItemWorldFluidMapping.ts:60` + `FluidMapping.csv` | `TILE_CHARGED` (V3 stale) | **`oil`** (§10.1 V2) — 단 §10.1 ⚠ 재검토 카드 결정 후 | P0 — 재검토 결정 대기 |

### 12.10 디자인 정리 — charged 의 톤 정체성

charged 는 *전기 hazard tile* 이지만 **fluid 외형** (보라 풀) 으로 그려진다. 디자인 의도:

- **세계관 정당화:** 거대 빌더의 *노출 회로* / 부서진 reactor 의 *플라즈마 누출* / 폐허 연구소의 *잔존 전기장*
- **시그니처 위협:** *서서히 갉는 DOT (정적)* + *예측 가능한 wind-up 폭격 (Arc Cycle hold 1.5s)* — Sekiro 의 *간자키 패링 윈드업* 톤과 유사. 회피 가능한 위협
- **Spark 기질 결합 (V2.2 2026-05-17 확정):** 호기심 · 전류 · 격발. spark 무기의 *fluid signature 본질*. **slot_a=charged primary** 로 승격되어 Arc Scan Cycle + Wet-Conductor Spread 가 spark 룸 첫 인상 메커닉으로 자연 발현. V2 의 *oil 절연 회로* 안 (slot_b=oil) 은 charged dynamic 메커닉 보존 우선으로 폐기. slot_b=water 가 conductor base 로 작동하여 Wet-Conductor 4-인접 전도화 트리거.

### 12.11 cross-link (charged 분산 위치 → 본 §12 권위로 통합)

| 분산 위치 | 본 §12 대응 | 통합 후 권한 |
| :-- | :-- | :-- |
| `System_World_TileSystem.md` §2.8 (charged tile) | §12.2 · §12.3 | 본 §12 권위. TileSystem.md §2.8 는 stale 색·시간 정정 후 거울 |
| `System_World_TileSystem.md` §3.1 (charged tick / 뇌 펄스) | §12.2 | 본 §12 권위 |
| `System_World_Fluid.md` §3.4 §10 (charged Spark slot) | §10.1 ⚠ | 본 §10 권위 |
| `System_World_ChemicalReactions.md` (R-NEW-021/025/028/031) | §12.8 | 본 §12 가 charged 시점 narrative. 반응 매트릭스 자체는 ChemicalReactions.md 가 권위 |
| `Sheets/Content_System_FluidTypes.csv` charged 행 | §12.2 거울 | 데이터 SSoT (수치) |
| `game/src/core/Physics.ts` TILE_CHARGED | §12.2 거울 | TILE_ID SSoT |
| `game/src/systems/TileHazards.ts` CHARGED_TICK_* | §12.2 거울 | tick 수치 SSoT |
| `game/src/effects/FluidSystem.ts` ARC_* | §12.2 거울 | Arc Cycle 수치 SSoT |

---

## 13. cyro (액화 질소) 속성 전수 — Iron 기질 시그니처 메커닉 (2026-05-17 V2.2 통합)

> **목적:** cyro 관련 정보가 9 위치 (`Physics.ts` / `FluidTypes.csv` / `TileHazards.ts` / `TileMutator.ts` / `FluidSystem.ts` / `FluidSpawner.ts` / `ItemWorldFluidMapping.ts` / `ContainerPools.ts` / `TileSystem.md §2.14`) 에 분산. 본 §13 이 *cyro 단일 권위 SSoT* — 정체성 · 데이터 · 동작 · 화학 반응 · 컨테이너 · 디자인 의도 · 거울 · 미해결 통합.
> **데이터 거울:** `Sheets/Content_System_FluidTypes.csv` (cyro 행) / `game/src/core/Physics.ts` (TILE_CYRO=14) / `game/src/systems/TileHazards.ts` (CYRO_TICK / CYRO_FROZEN / CYRO_SLOW) / `game/src/systems/TileMutator.ts` (CYRO_* chance 상수).
> **LDtk 표기:** `Cyro` (PascalCase, 오타 고정 사용자 명시 2026-05-17). 영문 정상 표기 *cryo* 가 아닌 *cyro* 로 코드베이스 전체 일관.

### 13.1 정체성

cyro 는 **Iron 기질의 primary fluid signature** (V2.2 회수). 다른 기질의 primary 와 동격:
- Forge primary = magma (주력 hazard)
- Rust primary = acid (부식 source)
- Spark primary = charged (Arc Scan Cycle)
- Shadow primary = oil (함정 base)
- **Iron primary = cyro (액화 질소, Frozen 상태이상 + 광역 Cryo Burst)**

기존 Iron slot_a=water 가 *룸 첫 인상 약함* 비평에 대한 회수 — 신규 fluid TILE_CYRO 도입으로 *솔리드 ice 와 동시 발현* (ice 는 정적 발판, cyro 는 dynamic fluid body).

### 13.2 권위 데이터 표

| 항목 | 권위 값 | 출처 | 비고 |
| :-- | :-- | :-- | :-- |
| TILE_ID | `14` | `Physics.ts:57` `TILE_CYRO = 14` | 통과 가능 (passable) |
| LDtk enum | **`Cyro`** PascalCase | `World_ProjectAbyss.ldtk` IntGrid 14 + ContainerKind | 오타 고정 |
| 표면 색 (fluid render) | `#A0E0F0` 청백 | `FluidTypes.csv` cyro 행 `surface_color` | FluidSystem halo 적용 |
| body 색 | `#4080B0` 어두운 청 | `FluidTypes.csv` `body_color` | — |
| glow 색 | `#C0F0FF` | `FluidTypes.csv` `glow_color` | 발광 fluid 5 종 중 하나 (magma · lava · acid · charged · cyro) |
| foam 색 | `#E0F8FF` | `FluidTypes.csv` `foam_color` | water 와 유사한 청백 |
| Tick DOT | `maxHp × 1%` / `1,000 ms` | `TileHazards.ts:CYRO_TICK_PCT/MS` | charged (2.5s) 의 2.5× 빠른 tick |
| damage_dps (CSV) | `12` | `FluidTypes.csv` | charged(8) ~ acid(15) 사이 |
| Frozen 상태이상 | `2,000 ms` refresh | `TileHazards.ts:CYRO_FROZEN_MS` | 셀 접촉 중 매 프레임 refresh, 이탈 후 자연 감소 |
| Frozen 이동 감소 | `60%` (`CYRO_FROZEN_SLOW_PCT` export) | `TileHazards.ts` | Player/Enemy 측 max speed multiplier 로 적용 (wire-up §13.9) |
| 점성 / 부력 / drag | viscosity 1.1 / buoyancy 0.8 / dragMul 1.3 | `FluidTypes.csv` | water 보다 약간 점성 + 무거움 + 끌림 |
| Fire 소화 | water 동등 | `TileHazards.ts:applyTileHazards` extinguishesFireInWater 확장 | entity 가 cyro 셀 안이면 burn/fire 즉시 제거 |
| FluidSpawner type | `'cyro'` | `FluidSpawner.ts:28` | tile=14 매핑, debug color `#A0E0F0` |
| Generic 마커 매핑 | Iron slot_a | `ItemWorldFluidMapping.ts:59` | V2.2 swap (water → cyro) |
| 컨테이너 시그니처 | `CyroCanister` (defaultFluidVolume=5, fluidColor #A0E0F0) | `ThrowableContainer.ts` | LDtk 명명 고정 |

### 13.3 동작 — 정적 hazard (TileHazards.applyTileHazards)

`isInCyro(AABB, roomData)` 가 true 인 entity 에 대해:

1. `cyroTickAccum += dtMs`
2. 누적 ≥ 1,000 ms 마다 `maxHp × 1%` damage (`source = 'cyro'`)
3. **`frozenRemainingMs = CYRO_FROZEN_MS` (2000ms) refresh** (셀 접촉 중 매 프레임 갱신)
4. **fire/burn 즉시 소화** — `extinguishesFireInWater` 분기에 cyro 포함 (water 동등)
5. 셀 이탈 시:
   - `cyroTickAccum = 0` 리셋
   - `frozenRemainingMs -= dtMs` (자연 감소 — 셀 밖에서도 *최대 2초 잔류*)

**Player / Enemy 적용:** HazardTarget 인터페이스의 `cyroTickAccum` + `frozenRemainingMs` 필드 보유. Player.ts / Enemy.ts 가 `frozenRemainingMs > 0` 동안 max speed × `(1 - CYRO_FROZEN_SLOW_PCT)` 적용 (§13.9 wire-up).

### 13.4 동작 — Dynamic fluid body (FluidSystem)

cyro 셀이 *연결된 풀 모양* 이면 FluidSystem 이 자동 흡수:
- **flood-fill** — 4-인접 cyro 셀이 하나의 FluidBody 로 묶임 (water 와 동등 propagation 0.18)
- **halo 발광** — magma / lava / acid / charged 와 동일 BlurFilter pulse halo. 청백 발광이 룸 첫 인상 dominant
- **gravityTick** — cellular gravity 로 sideways spread + 낙하. viscosity 1.1 라 water 보다 약간 느림
- **surface wave** — water 와 동일 spring + ambient wave + impulse splash
- **cellular gravity 이동** — cyro 셀이 이동하면 전기 overlay 와 동일 패턴으로 frozen 상태 transfer 는 별도 (현재 미구현, 후속 검토)

### 13.5 화학 반응 매트릭스 (7 종)

> 권위: `System_World_TileSystem.md §2.14` 표 + 본 §13.5. 코드: `TileMutator.tickPassiveInteractions` + `applyFireAttack`.

| 반응 ID | 트리거 | 결과 | 확률/효과 | 디자인 의도 |
| :-- | :-- | :-- | :-- | :-- |
| **R-NEW-CYRO-001 Cryo Burst** ⭐ | cyro 셀 + 인접 magma | cyro → AIR, **인접 magma → WALL 최대 8 셀**, steam + `onSteamBurst` callback | 100% | 시그니처 wow — water+magma Steam Burst R-NEW-007 의 *1.6× 광역* (액화 질소 극저온의 폭발성) |
| **R-NEW-CYRO-002 Cryo Freeze** | cyro 셀 + 인접 water | water → `tryFreeze` (FreezeState) | 4%/tick | ice 의 1%/tick 의 4× — 룸 안 water 풀이 점진적으로 빙판화 |
| **R-NEW-CYRO-003 Frozen Steel auto** ⭐ | cyro 셀 + 인접 metal | metal → `tryFreezeMetal` (Brittle setup) | 6%/tick | Ice enchant 없이도 환경 발화. *Brittle Metal R-NEW-017 검 1-hit 분쇄* setup 자생 |
| **R-NEW-CYRO-004 Frozen Oil/Acid auto** | cyro 셀 + 인접 oil / acid | tryFreeze (Frozen Oil 8s / Frozen Acid 5s 임시 발판) | 4%/tick | R-NEW-004 / R-NEW-006 의 환경 변종. 룸 동적 발판 생성 |
| **R-NEW-CYRO-005 Wood Frost auto** | cyro 셀 + 인접 wood | wood → 10s frozen WALL | 3%/tick | R-NEW-044 의 환경 변종 |
| **R-NEW-CYRO-006 Grass Wither cryo** | cyro 셀 + 인접 grass | grass → AIR (시들음) | 2%/tick | acid R-NEW-032 와 동일 패턴, 느린 cryogenic burn |
| **R-NEW-CYRO-007 Cryo Evaporation** | Fire enchant attack 이 cyro 셀 적중 | cyro → AIR + steam | 100% | water R-NEW-003 동등 — *제거 카운터*. Fire enchant 검으로 cyro 풀을 제거할 수 있음 |

**부수 효과 (반응 ID 없이 작동):**
- **Fire entity 소화** — entity 가 cyro 셀 접촉 시 `extinguishFireDebuffs()` (TileHazards.applyTileHazards) → burn 즉시 제거. water 동등
- **Frozen 상태이상** — cyro 셀 접촉 중 `frozenRemainingMs = 2000ms` refresh, 이탈 후 자연 감소
- **Ice enchant × cyro** — *무반응*. 이미 차가운 fluid 라 추가 freeze 의미 없음
- **Thunder × cyro** — *후속 검토*. 현재는 cyro 가 conductor 아님 (Physics.isConductor 미포함)

### 13.6 컨테이너 — CyroCanister

| 항목 | 값 | 출처 |
| :-- | :-- | :-- |
| ContainerKind | `CyroCanister` | `ThrowableContainer.ts:18` |
| LDtk enum | `CyroCanister` | World_ProjectAbyss.ldtk:8972 |
| HP | 1 | drum 패턴 1-hit 파괴 |
| paintTile | **14 (TILE_CYRO)** | 깨질 때 cyro 풀 spawn |
| defaultFluidVolume | **5** | magma(4) ~ water/oil(6) 사이 *위험 시그니처* |
| fluidColor | `#A0E0F0` | FluidTypes.csv cyro `surface_color` 일치 |
| collisionInset | drum (1px) | drum 4 종과 동일 |
| sprite key | `cyro_0` | atlas Row 3 slot 1 (32, 96) 예약 |
| atlas slice 상태 | **미도착** — `SLICE_TEXTURES['cyro_0'] = null` (Graphics fallback) | `ThrowableContainer.ts:108` 주석 해제 시 활성화 |
| Iron Generic_A pool | `CyroCanister:4` 단일 | `ContainerPools.ts` CONTAINER_SLOT_POOLS.iron.generic_a |
| Iron full pool | `CyroCanister:4 / MetalCrate:5 / Crate:3 / WaterBarrel:2` | `ContainerPools.ts` CONTAINER_POOLS.ItemWorld_Iron |

**깨짐 시 자연 발현 시퀀스:**
1. 검 swing 또는 throw impact → `paintContainerImpact('CyroCanister', gx, gy, 5)`
2. 인접 5 셀 paint 가능한 곳 (air / grass / 기존 fluid) 에 TILE_CYRO 페인트
3. FluidSystem 이 다음 frame 에 자동 인식 → cyro FluidBody 생성 + halo 시작
4. 인접 magma 가 있으면 **R-NEW-CYRO-001 Cryo Burst 즉시 trigger**
5. 인접 metal 이 있으면 6%/tick 으로 점진적 Frozen Steel 화

### 13.7 디자인 의도 — Iron 톤 정체성 V2.2

cyro 는 *액화 질소 fluid* 인데 **dynamic fluid body** + **Frozen 상태이상** 결합으로 Iron 기질의 본질을 강화한다.

- **세계관 정당화:** 거대 빌더의 *극저온 격납고* / 폐허 연구소의 *액화 질소 누출* / *Made in Abyss 6층 격리 코어* 톤. *영하의 정적*
- **시그니처 위협:** *느린 짓누름 DOT* (1%/1s) + *이동 -60% Frozen* 의 조합 — 적이 cyro 풀 밟으면 *천천히 굳어 압살* 되는 톤. Sekiro 의 *얼음동결 패링* 패턴과 유사
- **Iron 기질 결합:** 결연 · 의지 · 빙결. *얼어붙은 강철 보관소* 의 *움직임이 멈춘* 톤. *Brittle 분쇄 wow* 가 cyro 환경에서 자생 발화
- **데모 적합도:** 1차 niche *Made in Abyss 청록 + 거대 시설* 신호 강함. Forge 의 주황 / Rust 의 녹색 / Spark 의 보라 / Shadow 의 검갈 과 색감 분리 명확

**Player 활용 (긍정):**
- Fire 인챈트 적 / 자신 burn 상태 → cyro 풀로 *피난* (water 동등 즉시 소화)
- Fire 인챈트 검으로 cyro 풀 *제거* (R-NEW-CYRO-007 Cryo Evaporation)
- cyro 풀 + magma 풀 인접 setup 발견 시 *원거리에서 검 swing* 으로 Cryo Burst trigger (광역 magma 굳음 → 발판 생성)

**Player 위협 (부정):**
- cyro 풀 안에서 이동 -60% — 적 회피 어려움
- Frozen 잔여 2 초 — 풀에서 나와도 *느림 잔류*
- 적이 Frozen Metal 위에서 검 휘두를 때 *plate 분쇄* 로 *역공* 가능

### 13.8 시각 / 청각 톤

- **시각 (FluidSystem):** 청백 surface (`#A0E0F0`) + 어두운 청 body (`#4080B0`) + glow halo (`#C0F0FF`) BlurFilter pulse. water 와 비교해 *foam 작음 (density 0.7)* — 액체 질소가 거품이 적은 차분한 표면. ice 시너지 발현 시 청광 반사 디테일 결합
- **청각 (Audio_Events.csv 후속):** *액화 질소 hiss* + *극저온 crystal cracking* ambient. 시그니처 SFX `cyro_drip` / `cyro_freeze` (후속 ElevenLabs 의뢰)
- **카메라 shake (Cryo Burst):** water+magma Steam Burst 보다 1.5× 강 (광역 8 셀 반영). shake=4-6

### 13.9 미해결 카드

| 항목 | 우선도 | 비고 |
| :-- | :-- | :-- |
| **Frozen 이동 -60% wire-up** | **P0** | `Player.ts` / `Enemy.ts` 의 max speed 계산부에 `(target.frozenRemainingMs > 0 ? 1 - CYRO_FROZEN_SLOW_PCT : 1)` 곱하기 1-2 줄. *현재 상태이상 데이터만 있고 실제 느려짐 X* |
| CyroCanister atlas sprite | P1 | Aseprite 로 Row 3 slot 1 (32, 96) 에 추가 + `crate_01_atlas.json` slices 배열에 `crate_cyro_01` 항목 추가 + `ThrowableContainer.ts:108` 주석 해제 |
| Cryo Evaporation steam VFX | P1 | applyFireAttack 의 cyro 분기에 *청백 steam puff* 별도 톤 추가 (현재 generic steam) |
| BGM cue `iw_iron_loop_01` 갱신 | P2 | 액화 질소 hiss 톤 반영 — ElevenLabs 의뢰 |
| cyro + ice 시너지 강화 | P2 | 현재 ice 가 cyro 와 인접해도 *추가 효과 X*. ice 두께 / 영구화 / 시각 보강 후속 검토 |
| Thunder × cyro 도체화 | P2 | 후속 결정. 현재는 비도체 |
| `System_World_ChemicalReactions.md` 정식 등록 | P1 | R-NEW-CYRO-001~007 을 본 매트릭스에 추가 |

### 13.10 cross-link (cyro 분산 위치 → 본 §13 권위로 통합)

| 분산 위치 | 본 §13 대응 | 통합 후 권한 |
| :-- | :-- | :-- |
| `System_World_TileSystem.md §2.14` (cyro tile + 상호작용 7종) | §13.2 · §13.3 · §13.5 | 본 §13 권위. TileSystem.md §2.14 는 매트릭스 거울 |
| `System_World_Fluid.md §3.1` (IntGrid 표 cyro 행) | §13.2 거울 | 본 §13 권위. Fluid 시스템 일반 spec 은 Fluid.md 유지 |
| `Sheets/Content_System_FluidTypes.csv` cyro 행 | §13.2 거울 | 데이터 SSoT (수치) |
| `game/src/core/Physics.ts` TILE_CYRO + isCyro + isInCyro | §13.2 거울 | TILE_ID + helper SSoT |
| `game/src/systems/TileHazards.ts` CYRO_TICK_* / CYRO_FROZEN_MS / CYRO_FROZEN_SLOW_PCT | §13.2 · §13.3 거울 | tick / Frozen 수치 SSoT |
| `game/src/systems/TileMutator.ts` CYRO_*_CHANCE | §13.5 거울 | 7 반응 확률 SSoT |
| `game/src/effects/FluidSystem.ts` FLUID_CELL_TYPES + halo 분기 | §13.4 거울 | fluid body 처리 SSoT |
| `game/src/systems/FluidSpawner.ts` FluidSpawnerType + TILE map | §13.2 거울 | spawner type SSoT |
| `game/src/data/ItemWorldFluidMapping.ts` iron slot_a=TILE_CYRO | §13.1 거울 | 기질 매핑 SSoT |
| `game/src/data/ContainerPools.ts` CyroCanister | §13.6 거울 | 컨테이너 풀 SSoT |
| `game/src/entities/ThrowableContainer.ts` CyroCanister CATALOG | §13.6 거울 | 컨테이너 spec SSoT |

### 13.11 변경 이력

| 일자 | 버전 | 요약 |
| :-- | :-- | :-- |
| 2026-05-17 | V2.2 | cyro 신규 fluid 도입 — Iron primary signature, 7 반응 + Frozen 상태이상 + CyroCanister 컨테이너 |
| 2026-05-17 | V2.2 | **본 §13 통합 SSoT 추가** — 분산 9 위치 단일 권위화. LDtk enum `Cyro` 오타 고정 명시 |
