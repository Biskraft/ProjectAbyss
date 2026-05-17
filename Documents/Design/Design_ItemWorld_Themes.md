# Design_ItemWorld_Themes.md — 아이템계 5 테마 통합 디자인

> **작성 기준:** V2 — 2026-05-17 단조성 비평 후 슬롯 재설계 + 신규 화학 반응 적용 (V1 = 2026-05-16)
> **상위 정의:** `memory/wiki/decisions/DEC-036-Memory-Shard-System.md` (5색 기질 정체성)
> **시스템 SSoT:** §8 cross-reference 참조
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
| **Iron** | water | **ice** | water | *Frozen Steel* + *Brittle Metal* + *Wood Frost* + *Cold Front* |
| **Rust** | acid | oil | water | *Exothermic Steam* (acid+water 발열) + *Oil Acid Sludge* + *Toxic Flash* |
| **Spark** | water | **oil** | acid | *전도(water)* ↔ *절연(oil)* ↔ *확장(acid)* — 회로 퍼즐 |
| **Shadow** | oil | acid | **magma** | *Surface Ignition* + *Oil Acid Sludge* + *작은 magma vent 함정* |

### 0.3 fluid 분포 정합성

| fluid | 등장 기질 | 역할 차이 |
| :-- | :-- | :-- |
| water | Forge, Iron, Rust, Spark | 각 *trigger 매개* (Forge: Steam Burst 발화제 / Iron: 차분 응결 base / Rust: Exothermic 발화제 / Spark: 전도 base) |
| oil | Forge, Rust, Spark, Shadow | 각 다른 역할 (Forge: 점화 연료 / Rust: Sludge 재료 / Spark: **절연체** / Shadow: 함정 base) |
| acid | Rust, Spark, Shadow | (Rust: 부식 source / Spark: chain 확장 / Shadow: Sludge + Toxic) |
| magma | Forge, Shadow | (Forge: 주력 source / Shadow: 작은 *vent* 함정 — *의외성*) |
| ice | Iron 만 | Iron 의 유일 시그니처 — *frozen 시너지 독점* |

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
| **Iron** | `water (2)` | `ice (7)` | `water (2)` | (직접 hazard 약함) + Brittle 분쇄 시그니처 |
| **Rust** | `acid (13)` | `oil (11)` | `water (2)` | Acid DOT (5%/s) + Exothermic Steam radius 데미지 |
| **Spark** | `water (2)` | `oil (11)` | `acid (13)` | Thunder 50% maxHp 단발 + 절연 퍼즐 |
| **Shadow** | `oil (11)` | `acid (13)` | `magma (6)` | 미끄러짐 + 점화 사슬 + 작은 vent 함정 |

> 데이터 SSoT: `Sheets/Content_ItemWorld_FluidMapping.csv` (V2 갱신 필요)
> 코드 mirror: `game/src/data/ItemWorldFluidMapping.ts` (V2 갱신 필요)
> **이 표 변경 시 CSV + 코드 동기화 필수.**

### 2.2 Container Pool 가중치 (V2 갱신)

| 기질 | Pool ID | 가중치 (kind:weight) | 톤 |
| :-- | :-- | :-- | :-- |
| **Forge** | `ItemWorld_Forge` | MagmaCrucible:4 / OilDrum:2 / Crate:1 / MetalCrate:3 | 단조 시설 화로 + 기름 |
| **Iron** | `ItemWorld_Iron` | Crate:3 / **MetalCrate:5** / WaterBarrel:2 | 단조 강철 + Brittle setup (ice 위 MetalCrate) |
| **Rust** | `ItemWorld_Rust` | AcidVial:4 / MetalCrate:5 / Crate:2 | 산성 + 부식 강판 |
| **Spark** | `ItemWorld_Spark` | WaterBarrel:3 / OilDrum:2 / MetalCrate:3 / Crate:2 | 전도 base + 절연체(oil) + 회로 |
| **Shadow** | `ItemWorld_Shadow` | Crate:4 / **OilDrum:3** / AcidVial:2 / MagmaCrucible:1 | 함정 / 잔존 / 작은 vent |

> 데이터 SSoT: `game/src/data/ContainerPools.ts`
> GDD: `System_World_Container.md` §12.4
> **V2 변경: Iron MetalCrate 가중치 ↑ (Brittle setup), Spark OilDrum 추가 (절연체), Shadow MagmaCrucible 1 추가 (vent).**

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

#### Iron — *얼어붙은 강철*

| 흐름 | 반응 | 시각 임팩트 |
| :-- | :-- | :-- |
| 1 | Ice 인챈트 × metal → `R-NEW-021 Frozen Steel` | metal → 15s WALL (originalTile=METAL) |
| 2 | Physical (검 swing) × Frozen metal → `R-NEW-017 Brittle Metal` ⭐ | 1 hit 즉파 (분쇄 VFX) |
| 3 | MetalCrate 가 ice 위 + 검 swing → `R-NEW-054 Brittle Crate` ⭐ | 4 HP 무시 즉파 |
| 4 | Wood Crate 가 water 위 + fire 근처 → `R-NEW-049 Waterlogged` | 불 면역 (방어 setup) |
| 5 | Wood Crate 가 ice 위 → `R-NEW-051 Frozen Crate` | 모든 환경 면역 (영구 발판) |
| 6 | Ice 인챈트 × wood → `R-NEW-044 Wood Frost` | wood → 10s frozen WALL (임시 발판) |
| 7 | water 옆 ice → `R-NEW-040 Cold Front` | water 자기 freeze (점진 확장) |

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

발광 fluid: magma · lava · acid (BlurFilter halo pulse). water · oil · ice 는 halo 없음.

| 기질 | 발광 fluid 분포 | 룸 광원 결과 |
| :-- | :-- | :-- |
| **Forge** | magma 풍부 (slot_a) | 따뜻한 다중 광원 — *대장간 화로* 톤. 강도 매우 강 |
| **Iron** | 발광 fluid 없음 (water/ice/water) | 정적 톤 — ambient 만. ice 청광 반사 디테일만 |
| **Rust** | **acid 풍부 (slot_a)** | **형광 녹색 광원** — *부식 실험실* 톤. Toxic Flash 시 *순간 강렬* |
| **Spark** | acid (slot_c, 보조) + thunder pulse | 약한 형광 녹색 + Thunder 시 순간 강한 백광 *spike* |
| **Shadow** | 작은 magma vent (slot_c) 만 | 어두운 base + *vent 점만 빛남* (Made in Abyss 메가스트럭처 톤) |

### 3.3 시각 분위기 카드 (한 줄 묘사)

플레이어가 *첫 진입 5초* 안에 느껴야 할 톤:

| 기질 | 첫 5초 인상 |
| :-- | :-- |
| **Forge** | "용광로 안에 들어왔다. 단조의 망치 소리가 멀리서 울린다." |
| **Iron** | "냉각수가 떨어진다. 강철이 차게 굳어있다." |
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

## 10. 미해결 / 후속 카드

| 항목 | 우선순위 | 비고 |
| :-- | :-- | :-- |
| Iron slot_b *ice* (V2 적용) | **V1 데모** | 코드/CSV 동기화 필요 |
| Spark slot_b *oil* (V2 적용) | **V1 데모** | 코드/CSV 동기화 필요 |
| Shadow slot_c *magma* (V2 적용) | **V1 데모** | 코드/CSV 동기화 필요 |
| `Content_ItemWorld_FluidMapping.csv` V2 갱신 | **V1 데모** | 본 문서 §2.1 거울 |
| `ItemWorldFluidMapping.ts` V2 갱신 | **V1 데모** | 본 문서 §2.1 거울 |
| `ContainerPools.ts` Spark/Shadow Pool 갱신 | **V1 데모** | §2.2 |
| Shadow 본격 도입 | v1.0 | 데모 trailer 컷 1개 |
| 2차 기질 (temperamentSecondary) 영향 | V2 | 현재 1차만, 2차는 *blend* 로 약하게 |
| Parallax tint 실제 구현 | V2 | §3.1 hex 코드 mirror, LdtkRenderer 측 미구현 |
| BGM cue 실제 자산 | V2 | ElevenLabs 의뢰 5 cue |
| Iron *metal-flooded* 변종 | V2 (skip) | V2 ice 시너지로 대체 — 미실현 |

---

## 11. V2 비평 — Spark / Iron 단조 사례 학습

**비평 입력 (사용자, 2026-05-17):** "Spark = water/acid/water 가 단조롭지 않은가? 비평적으로 검토하라."

**확장 비평 (재검토):**
- Spark 의 slot_a = slot_c = water → *두 슬롯이 같은 fluid* → 룸 안 *3 영역 중 2 영역 동일* → 시각/메커닉 단조
- Iron 의 *3 슬롯 모두 water* → *템플릿 치환 효과 0* → "기질 따라 룸이 달라진다" 의 *Spark/Iron 차별화 실패*
- 5 기질 중 *4 기질에 water 등장* — 정합성 양호. 단 *역할 다름* 명시 필요

**V2 회수 결정:**
- Spark: water / **oil** / acid — *전도 / 절연 / 확장* 3-요소 회로 퍼즐
- Iron: water / **ice** / water — *Brittle / Frozen Steel / 임시 발판* 시너지
- Shadow: oil / acid / **magma** — *기존 oil/acid 톤 + magma vent 의외성*

**원칙 도출:**
> 5 기질의 3 슬롯에서 *같은 fluid 가 2 슬롯 이상 등장* 하지 않도록 한다 (Iron 의 water-ice-water 는 예외 — *환경 셀로 차별*).
> *fluid type 다양성* + *역할 차별화* 양쪽 점검.

이 원칙을 향후 *기질 slot 재설계* 시 항상 적용.
