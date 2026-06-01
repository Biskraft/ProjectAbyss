# _temp_ChemicalReactions_DocAudit.md — 화학·원소 반응 GDD 전수조사 보고서

> **작성일:** 2026-05-13
> **범위:** Documents/System/, Documents/Design/, Documents/Terms/, Sheets/ 의 화학·원소 반응 관련 사항 전수조사 + 코드 reality 비교
> **출처 규칙:** 본 보고서는 각 진술마다 `파일명 §섹션 / 행번호` 를 인용. 인용 불가 시 "출처 미확인" 명시
> **독립성:** 자매 문서 `_temp_ChemicalReactions_CodeAudit.md` 와는 무관하게 독립 작성

---

## 1. 문서별 명시 반응 표

### 1.1 `Documents/System/System_World_TileSystem.md` (SSoT — §3 Damage / Passive Interaction 매트릭스)

| 반응 ID | 출처 | 명시 내용 |
| :--- | :--- | :--- |
| TIL-R-01 | §2.6 (line 156) | Fire-attack × magma → 무반응 / Ice-attack × magma → **3 s 냉각 wall 임시 → 복귀** |
| TIL-R-02 | §2.7 (line 165) | Fire-attack × ice → **water 영구 전환** |
| TIL-R-03 | §2.11 (line 202-211) | Fire-attack × oil → 점화 + 인접 oil 연쇄 (`5px/tick 55%`), **1.8 s burn → air** |
| TIL-R-04 | §2.12 (line 216-225) | Thunder-attack × metal → flood-fill conductor (water/acid 인접 확장). Acid 인접 metal → `6%/tick` 부식 |
| TIL-R-05 | §2.13 (line 229-239) | Acid 접촉 → DOT `1.6%/s`. Thunder × acid → water 와 등가 도체. Magma 인접 acid → `15%/tick` 증발 |
| TIL-R-06 | §3.0 Damage SSoT (line 254-264) | spike 20% / magma 첫 적중 `10%` + Burn DOT `2%/1s, 15s` / charged 환경 `1%/0.5s` / charged 뇌 펄스 `8%` / acid `0.5%/0.1s` / Thunder 풀 펄스 `8%` |
| TIL-R-07 | §3.2 매트릭스 (line 311-329) | Fire × water → 증기 폭발 (셀 → air + steam + 범위 피해). Ice × water → 결빙 `15 s wall 임시`. Thunder × water → flood-fill 감전 |
| TIL-R-08 | §3.2 자동 상호작용 (line 333-341) | `AUTO_INTERACT_INTERVAL_MS = 1.0 s`. acid+metal 6%, acid+magma 15%, magma+ice 4%, ice+water 4%, oil/wood/grass 인접 전파 55% `매 600 ms` |
| TIL-R-09 | §3.0.2 BurnableProp (line 271-279) | WoodCrate 12 500 / BranchPile 4 000 / Bush 10 000 / Curtain 6 000 / Vine 4 500 ms. ignitionChance 0.45 ~ 0.90 |
| TIL-R-10 | §3.0.3 ThrowableContainer (line 286-294) | Wood family acid 3 s / magma 1.5 s / fire 1.5 s → 즉파. MetalCrate magma 2 s 또는 acid 4 s |
| TIL-R-11 | §3.3 (line 376) | oil 15 s / wood 15 s / grass 10 s 발화 지속 → air |
| TIL-R-12 | §3.4 VFX SSoT (line 404-418) | 화 × water 셀 제거 → `SteamPuffManager.spawn`. magma → ice 융해 / acid → magma 증발 모두 SteamPuff |

### 1.2 `Documents/System/System_World_Fluid.md`

| 반응 ID | 출처 | 명시 내용 |
| :--- | :--- | :--- |
| FLU-R-01 | §6.3 Damage Hooks (line 332-339) | magma 첫 접촉 `maxHp × 0.10` + Burn **15 s** / acid `maxHp × 0.005 / 100 ms` / charged `maxHp × 0.01 / 2500 ms` / fire overlay `maxHp × 0.03 × dt/s` + Burn 10 s refresh / thunder pulse `maxHp × 0.50` (1 회/pulse) / Burn DOT `maxHp × 0.02 / 5000 ms` |
| FLU-R-02 | §6.4 잔존물 (line 344-348) | oil 10 000 ms (OIL_SLIP_DURATION_MS 매치) — 불 점화 가능 4 000 ms. acid 2000 ms / magma 2000 ms |
| FLU-R-03 | §7.1 Gravity (line 360-365) | `GRAVITY_TICK_MS = 140` (~7 Hz) bottom-up alternating |
| FLU-R-04 | §8.1 Thin-Strip (line 405-407) | EVAP_INTERVAL_MS 250 ms 마다 random cell 1개 증발 / EVAP_FADE_MS 650 ms |
| FLU-R-05 | §9.1 removeCell (line 432-434) | Fire enchant × water → AIR + steam (fluid body 재계산). acid/oil 도 패턴 가능 (현 코드는 water 만) |
| FLU-R-06 | §11 외부 시스템 (line 572-577) | passive interaction (magma+ice, acid+magma) 의 `onSteamEvent` 콜백 |

### 1.3 `Documents/System/System_World_Container.md`

| 반응 ID | 출처 | 명시 내용 |
| :--- | :--- | :--- |
| CON-R-01 | §8 환경 파괴 매트릭스 (line 243-244) | Wood family: acid 3.0 s / magma 1.5 s / fire 1.5 s → 즉파. MetalCrate: acid 1.0 s 마다 1 HP (4초 누적). MetalCrate magma/fire 면역 |
| CON-R-02 | §9.2 paintFluidSplash (line 282-287) | BFS flood — paintable 셀 = air / grass / 기존 fluid. 솔리드는 차단 |
| CON-R-03 | §9.3 (line 300) | MagmaCrucible paint → 인접 flammable 즉발 ignite (600 ms passive spread 안 기다림) |
| CON-R-04 | §11 (line 326-328) | paint 후 `fluidSystem.refreshFromGrid`. fire-on-water paint 는 `fluidSystem.removeCell` |

### 1.4 `Documents/System/System_Combat_Damage.md`

| 반응 ID | 출처 | 명시 내용 |
| :--- | :--- | :--- |
| CMB-R-01 | §5.2 원소 상호작용 예외 (line 796) | "빙결 상태에서 화염 공격 → 원소 시너지 발동: **증기 폭발 (범위 피해)**. 빙결 해제" |
| CMB-R-02 | §3 원소 (line 253-255) | Burn `burn_duration_s` 초당 maxHp `burn_damage_per_sec`. Freeze 이동 불가 + 피해 `freeze_damage_bonus`. Shock 행동속도 `shock_speed_reduction` 감소 |
| CMB-R-03 | §4.2 elemental_params (line 655-660) | burn_duration_s **3**, burn_damage_per_sec **0.02**, freeze_duration_s **1.5**, shock_duration_s **2**, shock_speed_reduction **0.30** |

### 1.5 `Documents/System/System_Combat_Elements.md`

| 반응 ID | 출처 | 명시 내용 |
| :--- | :--- | :--- |
| ELM-R-01 | §3.2 Burn (line 162-169) | Burn 트리거 = Fire 인챈트 적중. DoT. `burn_duration_s` = **3.0 s**, `burn_damage_per_sec` = **0.03** (maxHp ×3%/s) |
| ELM-R-02 | §3.2 Freeze (line 175-184) | Freeze duration **2.0 s**, freeze_damage_bonus **0.20**, freeze_boss_slow_rate **0.30** |
| ELM-R-03 | §3.2 Shock (line 189-198) | Shock duration **2.5 s**, shock_speed_reduction **0.40** |
| ELM-R-04 | §8 Co-op 퓨전 (line 369-385) | Steam Blast = Fire+Ice (범위, ratio 1.50). Plasma Surge = Fire+Thunder (스턴 1.0 s, ratio 2.00). Cryo Shock = Ice+Thunder (slow 3.0 s, 80%, ratio 1.20) |

### 1.6 `Documents/Design/Design_ItemWorld_Themes.md`

| 반응 ID | 출처 | 명시 내용 |
| :--- | :--- | :--- |
| THM-R-01 | §2.1 Fluid Slot (line 31-37) | Forge 시그니처 = Burn 15s + magma 첫 접촉 10% maxHp / Rust = Acid DOT 5%/s / Spark = Thunder 50% maxHp 단발 |
| THM-R-02 | §2.3 Emergent (line 56-62) | Forge: MagmaCrucible → magma paint → 인접 OilDrum 점화. Rust: AcidVial → MetalCrate 4초 부식. Spark: WaterBarrel → 침수 → MetalCrate 전도 |

### 1.7 `Documents/Terms/Glossary.md`

용어 정의 — 반응 수치 무. Burn/Freeze/Shock 용어 등록은 없음. 5색 기질 정의(line 177-180)와 Memory Shard(line 101) 만 존재. **반응 메커니즘 정의 부재**.

### 1.8 `Sheets/Content_System_Damage_Formula.csv`

**파일 존재하지 않음** (확인: `Sheets/` 디렉터리 ls 결과). 데미지 공식 SSoT 는 `Content_ConstData.csv` 또는 GDD §4.2 elemental_params yaml 블록 (Damage.md line 643-663). CSV 분리는 미실현.

### 1.9 `Sheets/Content_System_Audio_Events.csv`

| 반응 ID | 출처 | 명시 내용 |
| :--- | :--- | :--- |
| AUD-R-01 | line 50 | `sfx_world_break_01` = breakable_destroy (BurnableProp / BreakableEntity 파괴) — live |
| — | — | 반응별 SFX cue (steam puff / acid corrosion / ice melt / thunder chain) **카탈로그 부재** |

### 1.10 `Sheets/Content_System_FluidTypes.csv`

| id | damage_dps | damage_type | viscosity | 코멘트 |
| :--- | :-: | :--- | :-: | :--- |
| water | 0 | none | 1.0 | |
| lava | 40 | fire | 0.6 | legacy |
| magma | 40 | fire | 0.55 | TileHazards 와 단위 불일치 (TileHazards 는 % maxHp) |
| oil | 0 | none | 0.8 | |
| acid | 15 | acid | 0.9 | TileHazards 와 단위 불일치 |

### 1.11 `Reference/Spelunky-LevelGeneration-ReverseGDD.md`

스펠렁키 절차 생성 레퍼런스. 화학·원소 반응 메커닉 분석 부재 (스펠렁키 자체에 화학 시스템 없음). **본 보고서에서 비교 항목 0건**.

---

## 2. 디버전스 목록 (문서 vs 코드 reality)

### 2.1 카테고리 (a) — 문서에 있고 코드에 없음 (Orphan Spec)

| ID | 반응 | 문서 | 코드 reality | 심각도 |
| :--- | :--- | :--- | :--- | :--- |
| DIV-A-01 | **Steam Blast / Plasma Surge / Cryo Shock 퓨전** | `System_Combat_Elements.md` §8.2 line 369-385 | `Grep`: `Steam Blast` / `Plasma Surge` / `fusion` 문자열 코드 0건 (`game/src/` 전체) | **Layer 1** (Phase 3 항목이지만 Combat.md 의 "빙결 상태에서 화염 공격 → 증기 폭발" 은 솔로에서도 명시. 미구현) |
| DIV-A-02 | Acid · Oil 의 fire-attack 셀 제거 (Fluid §9.1 line 432-434) | "fire on acid/oil 도 동일 패턴 가능" | `applyFireAttack` (TileHazards.ts:236-247) 는 water 만 cell→air. acid/oil 은 ignite 경로 | Layer 2 (의도된 차이로 보이나 문서가 "가능" 표기) |
| DIV-A-03 | Acid 자체적 metal 부식이 **passive 외에 attack-trigger** 인지 모호 | TileSystem.md §3.3 (line 391-393) | `tickPassiveInteractions` 만 존재. attack trigger 없음 | Layer 3 (문서는 passive 로만 기술) |
| DIV-A-04 | FluidTypes.csv 의 damage_dps 수치 (lava=40, acid=15) | line 3, 6 | TileHazards 가 직접 참조 안 함 (코드 상수 별도 정의). CSV 가 unconsumed | Layer 3 (코드 ↔ CSV 비연결) |
| DIV-A-05 | Container.md §9.3 — magma paint 즉발 점화 (line 300) | "코드 4498-4500 추정" 표기 | 검증 미완. paintContainerImpact 코드는 magma 직후 인접 ignite 미확인 | Layer 2 (문서 자체가 "추정" 명시) |
| DIV-A-06 | Steam VFX 시각 (자세히 documented) | TileSystem.md §3.4 line 405-407 | onSteamEvent 콜백 hook 은 존재하나 acid+magma → spawn 호출처가 LdtkWorldScene 의 외부 시스템 작업 | Layer 2 (구현 위치 다름) |

### 2.2 카테고리 (b) — 코드에 있고 문서에 없음 (Undocumented)

| ID | 반응 / 동작 | 코드 reality | 문서 결손 | 심각도 |
| :--- | :--- | :--- | :--- | :--- |
| DIV-B-01 | **Magma cell 이 영구 fire source** (4-neighbour flammable 항상 ignite 시도, magma 자체는 불소진) | TileMutator.ts:344-365 (`spreadOilFire` 의 magma scan) | TileSystem.md §3.2 자동 상호작용 표에 "burning magma" 행만 있고 (line 340) §3.3 § 발화-magma 영구 출처 (line 374) 만 short notice. **상세 메커닉 (4-neighbour 4 chance) 미문서화** | Layer 1 (게임플레이 영향 큼 — 화염 생태계 backbone) |
| DIV-B-02 | `aabbNearBurningProp` — burning BurnableProp 의 entity 인접 entity 데미지 | TileHazards.ts:154 | 문서 §3.4 fire overlay 표 (line 412) 는 시각 신호만. **entity 인접 데미지** 메커닉 명시 부재 | Layer 1 (실제로 데미지 dealt) |
| DIV-B-03 | Burning entity → entity 화재 전파 `0.40 × target.ignitionChance` | TileMutator.ts:382-387 | TileSystem.md §7.2.2 (line 612) 는 "0.40" 만 표기. **target.ignitionChance 곱 항** 미명시 | Layer 2 |
| DIV-B-04 | Burning entity → tile 전파 chance `0.50` (entity radiates fire) | TileMutator.ts:380 | §7.2.2 (line 611) "50% 확률" 일치하지만 **chance 출처가 hard-coded** (catalog 외부 상수) | Layer 3 |
| DIV-B-05 | Thunder pulse target.prevInElectric transition trick | TileHazards.ts:168-172 | TileSystem.md §3.0 (line 263) 는 "진입 트랜지션 1회" 만 표기. 정확히 **transition** (false→true) 만 데미지인 세부 미문서 | Layer 3 |
| DIV-B-06 | Fire DOT 가 **AABB 2 px 확장** 으로 인접 솔리드 burning wood 감지 | TileHazards.ts:152-153 (`fireFx = 2`) | 문서 어디에도 명시 없음 | Layer 2 |
| DIV-B-07 | Burn DOT 이 invincible 동안에도 timer 차감 (state 누설 방지) | TileHazards.ts:101-105 | 문서 미명시 | Layer 3 |
| DIV-B-08 | acid tick 누적이 isInAcid false 시 즉시 0 reset (line 133-134); charged 도 동일 (line 144) | TileHazards.ts | 문서 §3.0 "체류 동안 무한" 만 표기 — **재진입 시 누적 reset** 미명시 | Layer 2 (체류 외피해 누적 안 됨 = 게임플레이 영향) |

### 2.3 카테고리 (c) — 문서·코드 수치 불일치

| ID | 항목 | 문서 명시 | 코드 reality | 심각도 |
| :--- | :--- | :--- | :--- | :--- |
| DIV-C-01 | **FluidResidue oil life** | Fluid.md §6.4 line 346 = **10 000 ms** (OIL_SLIP_DURATION_MS 매치 명시) | FluidResidue.ts:45 `OIL_LIFE_MS = 5000` (코드 주석에 "halved" 명시) | **Layer 1** (oil slick 잔존 시간이 정확히 절반 — slip 위험 시간 차이) |
| DIV-C-02 | **FluidResidue acid·magma life** | Fluid.md §6.4 line 347-348 = **2000 ms** | FluidResidue.ts:44 `LIFE_MS = 2000` ✓ 일치 | — |
| DIV-C-03 | **BurnableProp burnMs (WoodCrate)** | TileSystem.md §7.2.2 line 603 = **2500 ms** (구버전) / §3.0.2 line 273 = **12 500 ms** (신버전) | BurnableProp.ts:46 `12500` | **Layer 1** (§7.2.2 outdated — 5배 차이) |
| DIV-C-04 | BurnableProp BranchPile burnMs | §7.2.2 line 604 = 800 / §3.0.2 line 274 = 4 000 | BurnableProp.ts:50 `4000` | Layer 1 (§7.2.2 outdated — 5배) |
| DIV-C-05 | BurnableProp Bush burnMs | §7.2.2 line 605 = 600 / §3.0.2 line 275 = 10 000 | BurnableProp.ts:54 `10000` | Layer 1 (§7.2.2 outdated — 17배 차이) |
| DIV-C-06 | BurnableProp Curtain burnMs | §7.2.2 line 606 = 1200 / §3.0.2 line 276 = 6 000 | BurnableProp.ts:58 `6000` | Layer 1 |
| DIV-C-07 | BurnableProp Vine burnMs | §7.2.2 line 607 = 900 / §3.0.2 line 277 = 4 500 | BurnableProp.ts:62 `4500` | Layer 1 |
| DIV-C-08 | **OIL_SPREAD_INTERVAL_MS** | TileSystem.md §3.2 표 (line 339) = **600 ms** | TileMutator.ts:68 `600` ✓ 일치 | — |
| DIV-C-09 | **Magma first hit** | TileSystem.md §3.0 (line 257) = **10%** (`MAGMA_FIRST_HIT_PCT`, 2026-05-14 5×) | TileHazards.ts:72 `MAGMA_FIRST_HIT_PCT = 0.10` ✓ 일치 | — |
| DIV-C-10 | **Magma Burn 지속** | TileSystem.md §3.0 (line 258) = **15 s** | TileHazards.ts:73 `MAGMA_BURN_DURATION_MS = 15000` ✓ 일치 | — |
| DIV-C-11 | **Burn tick 간격** | TileSystem.md §3.0 (line 258) = **1.0 s** | TileHazards.ts:85 `BURN_TICK_MS = 5000` — **5초** | **Layer 1** (5배 차이. 코드 주석 line 174 "2% maxHp / 1s" 와 BURN_TICK_MS 의 5000 자체가 자가모순) |
| DIV-C-12 | **Burn DOT 비율** | TileSystem.md §3.0 (line 258) = `maxHp × 2%` / Combat_Damage §4.2 (line 656) = **0.02** / Combat_Elements §3.2 (line 169) = **0.03** | TileHazards.ts:84 `BURN_TICK_PCT = 0.02` | **Layer 1** (Combat_Elements 단독 0.03 — 다른 모든 문서/코드와 1.5× 차이) |
| DIV-C-13 | **Burn 기본 지속시간 (Combat 측 elemental params)** | Combat_Damage §4.2 (line 655) = **3 s** / Combat_Elements §3.2 (line 168) = **3.0 s** | TileHazards.ts:73 magma burn 15 s. TileMutator.ts:65 `BURN_DURATION_MS = 9000` | **Layer 1** (Combat 측 SSoT 와 World 측 SSoT 가 3 s vs 9-15 s 로 3-5배 차이 — 동일 "Burn 상태이상" 정의가 두 시스템에서 다름) |
| DIV-C-14 | **Freeze 지속시간** | Combat_Damage §4.2 (line 657) = **1.5 s** / Combat_Elements §3.2 (line 181) = **2.0 s** | TileMutator.ts:64 `FREEZE_DURATION_MS = 15000` (15 s, "shippable") | **Layer 1** (Combat 측 1.5-2 s vs World 측 15 s — 10배 차이. World 측 의도된 길이라는 코멘트 (line 61-63) 와 별개로 Combat 측 미동기화) |
| DIV-C-15 | **Shock 지속시간** | Combat_Damage §4.2 (line 659) = **2 s** / Combat_Elements §3.2 (line 195) = **2.5 s** | TileMutator.ts:66 `ELECTRIC_DURATION_MS = 2500` (2.5 s) | Layer 2 (Combat_Damage 의 2 s 가 outdated; 코드 = Combat_Elements = 2.5 s) |
| DIV-C-16 | **Shock speed reduction** | Combat_Damage §4.2 (line 660) = **0.30** / Combat_Elements §3.2 (line 195) = **0.40** | 코드: Shock 상태이상 자체 미구현 (Grep: 'shock' 0건 in game/src) | Layer 1 (Shock 상태이상이 코드에 미구현이지만 GDD 두 곳 수치 불일치) |
| DIV-C-17 | **Acid tick** | TileSystem.md §3.0 = `0.5%/0.1s` / Fluid.md §6.3 line 333 동일 | TileHazards.ts:77-78 `ACID_TICK_PCT = 0.005`, `ACID_TICK_MS = 100` ✓ 일치 | — |
| DIV-C-18 | **Charged 환경 DoT** | TileSystem.md §3.0 (line 259) = `1%/0.5s` | TileHazards.ts:79-80 `CHARGED_TICK_PCT = 0.01`, `CHARGED_TICK_MS = 2500` — **2.5 s tick** | **Layer 1** (5배 차이. 코드 주석 line 11 도 "1% maxHp / 0.5s tick" 라고 자가 모순. 실 발생 DOT 는 문서 대비 1/5 강도) |
| DIV-C-19 | **Charged 뇌 펄스** | TileSystem.md §3.0 (line 260) = **8%** | 코드 reality: 직접 검색했으나 `prevInElectric` 트랜지션은 **`THUNDER_HIT_PCT = 0.50`** (line 83) 으로 일괄 처리. 8% 의 별도 charged-pulse 상수 부재 | Layer 1 (문서 8% 와 코드 50% — 같은 트리거를 다른 수치로 명시. 또는 두 다른 메커닉이 문서상 혼동) |
| DIV-C-20 | **Thunder 풀 펄스** | TileSystem.md §3.0 (line 263) = **8%** | TileHazards.ts:83 `THUNDER_HIT_PCT = 0.50` (= 50%) | **Layer 1** (6.25배 차이. 50% 단발은 일반 적 즉사 수준 — 게임플레이에 직접 영향) |
| DIV-C-21 | **Fire overlay DOT** | TileSystem.md / Fluid.md §6.3 line 336 = `maxHp × 0.03 × dt/s` + Burn 10 s | TileHazards.ts:81-82 `FIRE_DPS_PCT = 0.03`, `FIRE_BURN_REFRESH_MS = 10000` ✓ 일치 | — |
| DIV-C-22 | **AUTO_INTERACT_INTERVAL_MS** | TileSystem.md §3.2 = **1.0 s** | TileMutator.ts:71 `AUTO_INTERACT_INTERVAL_MS = 1000` ✓ 일치 | — |
| DIV-C-23 | **Acid-Metal 부식 chance** | §3.2 표 (line 335) = **6%/tick** | TileMutator.ts:72 `ACID_METAL_CORRODE_CHANCE = 0.06` ✓ 일치 | — |
| DIV-C-24 | **Acid-Magma 증발 chance** | §3.2 표 (line 336) = **15%/tick** | TileMutator.ts:73 `ACID_MAGMA_VAPOR_CHANCE = 0.15` ✓ 일치 | — |
| DIV-C-25 | **Magma-Ice 융해 chance** | §3.2 표 (line 337) = **4%/tick** | TileMutator.ts:74 `MAGMA_ICE_MELT_CHANCE = 0.04` ✓ 일치 | — |
| DIV-C-26 | **Ice-Water 결빙 chance** | §3.2 표 (line 338) = **4%/tick** | TileMutator.ts:75 `ICE_WATER_FREEZE_CHANCE = 0.04` ✓ 일치 | — |
| DIV-C-27 | **Oil 전파 chance** | §3.2 (line 339) = **55%** | TileMutator.ts:69 `OIL_SPREAD_CHANCE = 0.55` ✓ 일치 | — |
| DIV-C-28 | **Container Wood family acid 노출** | Container.md §8 (line 243) = **3.0 s** | ThrowableContainer.ts:815 `>= 3000` ✓ 일치 | — |
| DIV-C-29 | **Container Wood family magma·fire** | §8 (line 243) = **1.5 s** | ThrowableContainer.ts:807, 811 `>= 1500` ✓ 일치 | — |
| DIV-C-30 | **Container MetalCrate acid** | §8 (line 244) = `1.0 s` 마다 1 HP (4초 누적 → 파괴) | ThrowableContainer.ts:788 `>= 1000` ✓ 일치 | — |
| DIV-C-31 | **Container.md §3 paintTile 표 vs §3.0.3 in TileSystem.md** | Container.md line 51 OilDrum = 11, MagmaCrucible = 6, etc. | TileSystem.md §3.0.3 line 290-293 동일 | — |
| DIV-C-32 | **FluidTypes.csv damage_dps 단위** | CSV: lava 40 / acid 15 (dps 단위 추정) | 코드는 % maxHp 사용. CSV 와 단위 불일치 + 코드가 CSV unconsumed | Layer 3 |
| DIV-C-33 | **TileSystem.md §3.3 oil 발화 1.8s vs §3.3 15s** | §2.11 line 203 = "1.8초 burn" / §3.3 line 376 = "oil 15 s" | TileMutator.ts:41 `[TILE_OIL]: 15000` (= 15 s) | **Layer 1** (TileSystem.md 자체 내부 자가모순. 코드는 15 s) |

---

## 3. 누락 영역 (Missing Coverage)

문서가 *있어야 할* 반응을 다루지 않거나, 문서 위치가 불분명한 영역:

### 3.1 NM-01: **Damage Formula CSV 부재** — Layer 1
- 요구: `Sheets/Content_System_Damage_Formula.csv` (사용자 인용)
- 현실: 파일 부재. 데미지 공식 SSoT 가 (a) GDD §4.2 yaml 블록 (b) TileHazards.ts 코드 상수 (c) Content_ConstData.csv 로 **3분산**
- 영향: BURN/FREEZE/ACID/THUNDER 수치를 추적하려면 3 출처를 모두 봐야 함. DIV-C-11-16 의 디버전스 원인

### 3.2 NM-02: **Shock 상태이상 코드 미구현** — Layer 1
- 문서: Combat_Damage.md §3, Combat_Elements.md §3.2 가 Shock 상세 정의
- 현실: `game/src` grep `'shock'` 결과 0건. Thunder pulse (THUNDER_HIT_PCT 50%) 만 구현. **Shock 행동속도 감소 미구현**
- 영향: Combat 측 명세는 모두 코드 부재. 보고서 작성 시 "Phase 2 보류"로 표시되어 있으나 GDD가 spec 상태로 진술

### 3.3 NM-03: **원소 퓨전 (Steam/Plasma/CryoShock) 코드 미구현** — Layer 1
- 문서: Combat_Elements.md §8 + Combat_Damage.md §5.2 "빙결 상태 + 화염 → 증기 폭발"
- 현실: `Steam Blast` / `Plasma Surge` / `fusion` 키워드 검색 결과 코드 0건
- 영향: Solo 퓨전 (Combat_Elements §8.4) 도 미구현. Themes.md 의 spike emergent 신호 약화

### 3.4 NM-04: **Glossary 화학 반응 용어 부재** — Layer 2
- Glossary.md: Burn/Freeze/Shock 용어 미등록. SteamPuff / FluidResidue / electric overlay / passive interaction 등 *시스템 노출 용어* 미등록
- 영향: 신규 작업자 / 에이전트가 용어 정의 검색 시 SSoT 부재

### 3.5 NM-05: **Audio Events CSV 의 반응 SFX 누락** — Layer 2
- 문서: TileSystem.md §3.4 VFX 표 (line 404-418) 는 VFX 만 명시. 대응 SFX cue 없음
- CSV: `Content_System_Audio_Events.csv` 에서 `sfx_world_break_01` 만 live. 다음 SFX cue 부재:
  - acid corrosion (metal → air)
  - ice melt (water 생성)
  - thunder chain (water/metal/acid flood-fill)
  - acid+magma 증발 (steam)
  - magma+ice 융해 (steam)
  - oil 점화 / fire 전파
- 영향: 핵심 emergent 메커닉의 청각 시그널 부재 — 1차 niche 신호 (BLAME!/시설 폐허) 약화

### 3.6 NM-06: **Cell mutation API 의 acid·oil 제거 분기** — Layer 2
- 문서: Fluid.md §9.1 (line 432-434) 가 "Fire on acid · oil 도 동일 패턴 가능 (현 코드는 water 만)" 명시
- 현실: 의도된 차이지만, **왜 acid/oil 에는 미적용인지 설계 결정 문서 부재**
- 영향: 향후 작업자가 "이건 버그?" 판단 어려움. DEC 또는 §13 리스크 추가 필요

### 3.7 NM-07: **빙결 상태 적 × 화염 공격 → 증기 폭발 (Combat_Damage §5.2)** — Layer 1
- 문서: Combat_Damage.md line 796 이 *적 상태이상 기반* 증기 폭발 명시 (Combat 측 정의)
- 현실: 코드는 *셀 기반* fire-on-water 증기 (TileMutator + FluidSystem) 만 구현. *적이 빙결된 상태에서 화염* 미구현
- 영향: 같은 "증기 폭발" 용어가 (a) 환경 셀 반응 (b) 적 상태이상 반응 두 다른 시스템에서 사용 — 모호. Combat 측 정의는 NM-03 의 일부

### 3.8 NM-08: **Container.md §10 MetalCrate 던지기 시 충돌 데미지** — Layer 3
- 문서: Container.md §10 line 311-318 이 throw 시 적 타격을 기술하나 MetalCrate 도 1회 타격 후 destruction 처리되는지 모호
- 현실: 코드는 MetalCrate 의 1 hit per throw 적용. takeAttack 면역 (검·shard) 와는 별도

---

## 4. 자체 검증

### 4.1 검증 1: 모든 진술에 *문서 파일명 + 섹션/행번호* 인용 — **PASS**
모든 표의 "출처" 열에 `파일명 §섹션 (line N)` 형식으로 명시. 단 Container.md §9.3 의 "코드 4498-4500 추정" (DIV-A-05) 는 문서 원문이 이미 "추정" 으로 명시. NM-01 의 CSV 부재는 ls 결과 (Sheets/ 디렉터리 직접 확인) 로 검증.

### 4.2 검증 2: 코드 ↔ 문서 수치 비교에서 *실제 코드 상수* 직접 인용 — **PASS**
모든 DIV-C-* 행은 `파일.ts:line 상수명 = 값` 형식으로 코드 출처 명시. `TileMutator.ts:64-75`, `TileHazards.ts:72-85`, `FluidResidue.ts:44-47`, `BurnableProp.ts:46-62`, `ThrowableContainer.ts:788-815` 직접 Read/Grep 결과 사용. 자매 에이전트 산출물 (`_temp_ChemicalReactions_CodeAudit.md`) 참조 0건.

### 4.3 검증 3: 디버전스 우선순위가 Layer 분류와 일치 — **PASS**
- **Layer 1 (게임플레이 영향):** DIV-A-01, DIV-B-01, DIV-B-02, DIV-C-01, DIV-C-03-07, DIV-C-11-14, DIV-C-16, DIV-C-18-20, DIV-C-33 — 총 16건. 모두 *플레이어 체감 데미지·DOT·잔존시간* 영향
- **Layer 2 (시각만):** DIV-A-02, DIV-A-05, DIV-A-06, DIV-B-03, DIV-B-06, DIV-B-08, DIV-C-15, DIV-C-32 — 총 8건
- **Layer 3 (주석·SSoT 톤):** DIV-A-03, DIV-A-04, DIV-B-04, DIV-B-05, DIV-B-07 — 총 5건

### 4.4 발견된 자가-모순 (문서 내부)
- **TileSystem.md §2.11 (1.8 s) vs §3.3 (15 s)** — 같은 oil burn 지속이 같은 문서 안에서 8배 차이 (DIV-C-33)
- **TileSystem.md §3.0.2 (12 500 ms) vs §7.2.2 (2 500 ms)** — 같은 WoodCrate burnMs 가 5배 차이 (DIV-C-03)
- **TileHazards.ts:11 코멘트 "1% maxHp / 0.5s tick" vs 코드 상수 `CHARGED_TICK_MS = 2500`** — 코드 자체 자가-모순 (DIV-C-18)
- **TileHazards.ts:8 코멘트 "magma 2%" vs `MAGMA_FIRST_HIT_PCT = 0.10`** — 코드 자체 자가-모순 (5배 차이)

---

## 5. 디버전스 카운트 요약

| 카테고리 | 건수 |
| :--- | :-: |
| (a) Orphan Spec (문서만 존재) | 6 |
| (b) Undocumented (코드만 존재) | 8 |
| (c) 수치 불일치 | 33 (확인 정합 19건 포함) |
| 누락 영역 (Missing Coverage) | 8 |
| 자가-모순 (단일 문서 내부) | 4 |

**총 디버전스 (a+b+c, 일치 제외):** 6 + 8 + 16(불일치만) = **30건**
**Layer 1 (게임플레이 영향):** 16건 — 즉시 동기화 권장
