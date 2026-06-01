# Chemical Reactions — Code Audit (전수조사)

> 작성일 2026-05-13 · 대상 ECHORIS (PixiJS v8 + TS) · 본 문서는 임시 SSoT 후보 보고서이다.
> 추측 금지 · 모든 진술은 `file:line` 인용 · 발명 수치는 "미확인" 또는 "코드 부재" 로 표기.

---

## 0. 조사 범위 & 정독 파일

| # | 파일 | 역할 |
|---|------|------|
| 1 | `game/src/systems/TileMutator.ts` | frozen/burning/electric overlay + passive interaction + Tier B burnable entity registry |
| 2 | `game/src/systems/TileHazards.ts` | entity hazard DOT + applyFireAttack / applyIceAttack / applyThunderAttack / applyPhysicalAttack |
| 3 | `game/src/effects/FluidSystem.ts` | fluid body flood-fill + cellular gravity + removeCell + evaporation |
| 4 | `game/src/effects/FluidResidue.ts` | per-pixel blot (oil/acid/magma) + 점화 (oil burn) |
| 5 | `game/src/systems/FluidSpawner.ts` | fluid 셀 분출 (water/oil/magma/acid) |
| 6 | `game/src/entities/ThrowableContainer.ts` | 컨테이너 환경 노출 + 충격 → paint |
| 7 | `game/src/entities/BurnableProp.ts` | Tier B 가연 prop ignite/burnout |
| 8 | `game/src/core/Physics.ts` | TILE_* 상수 + isFlammable/isConductor 분류 |
| 9 | `game/src/effects/EgoShard.ts` | 발사체 자체 (impact 콜백은 scene 측) |
| 10 | `game/src/combat/HitManager.ts` | 일반 데미지 계산 (원소 분기 없음) |
| 11 | `game/src/effects/WaterSplash.ts` | water/magma/oil/acid splash 시각 |
| 12 | `game/src/effects/AshRemnant.ts` | burnout 후 잔여 시각 |
| 13 | `game/src/effects/SteamPuff.ts` | 증기 시각 |

추가 정독 (반응 매트릭스가 scene 측에서 닫히는 회로):
- `game/src/scenes/LdtkWorldScene.ts` — onSteamEvent / onEvaporated / onEgoShardImpact / paintContainerImpact / paintFluidSplash / residue contact

---

## 1. 반응 매트릭스 (7 축 × 총 47 반응)

### 축 1 — Cell × Cell (passive interaction)

`TileMutator.tickPassiveInteractions` (`TileMutator.ts:401-430`) — `AUTO_INTERACT_INTERVAL_MS = 1000` ms (`TileMutator.ts:71`).

| ID | 입력 (A + B) | 출력 | 트리거 | 코드 위치 | 상수 | 비고 |
|----|-------------|------|--------|-----------|------|------|
| R-001 | MAGMA + 인접 ICE | ICE → WATER, steam VFX | 1000 ms tick · chance 0.04 | `TileMutator.ts:412-414` | `MAGMA_ICE_MELT_CHANCE = 0.04` (`:74`) | `maybeMutateNeighbourWithSteam` 경로 (`:446-458`) — onSteamEvent + onWallTileChanged 둘 다 발화 |
| R-002 | ICE + 인접 WATER | WATER → frozen WALL (15 s 지속) | 1000 ms tick · chance 0.04 | `TileMutator.ts:416-418` | `ICE_WATER_FREEZE_CHANCE = 0.04` (`:75`), `FREEZE_DURATION_MS = 15000` (`:64`) | `tryFreeze` (`:168-184`) — 만료 시 originalTile 로 복원 |
| R-003 | ACID + 인접 METAL | METAL → AIR (영구) | 1000 ms tick · chance 0.06 | `TileMutator.ts:421` | `ACID_METAL_CORRODE_CHANCE = 0.06` (`:72`) | `maybeMutateNeighbour` 경로 (`:432-443`) — onWallTileChanged 만 발화 (steam X) |
| R-004 | ACID + 인접 MAGMA | ACID 셀 자체 → AIR, steam VFX | 1000 ms tick · chance 0.15 | `TileMutator.ts:422-426` | `ACID_MAGMA_VAPOR_CHANCE = 0.15` (`:73`) | A 가 사라짐. B(MAGMA)는 유지. 위치 비대칭 (acid 셀 기준 검사). |
| R-005 | MAGMA → 인접 flammable (OIL/WOOD/GRASS) | 점화 (burning state) | 600 ms tick · chance per tile (GRASS 0.85 / WOOD 0.30 / OIL 0.55) | `TileMutator.ts:348-365` | `OIL_SPREAD_INTERVAL_MS = 600`, `OIL_SPREAD_CHANCE = 0.55` (`:68-69`); `tileChance` (`:325-328`) | magma = "permanent fire source" — 모든 magma 셀이 매 tick 방사 |
| R-006 | 인접 burning OIL/WOOD/GRASS → 인접 flammable | 점화 (chain) | 600 ms tick · chance per tile (GRASS 0.85 / WOOD 0.30 / OIL 0.55) | `TileMutator.ts:330-342` | 위와 동일 | `spreadOilFire` 본체 |
| R-007 | OIL burning 만료 | OIL → AIR | 15000 ms burn 종료 시 | `TileMutator.ts:258-275` | `BURN_DURATION_BY_TILE[TILE_OIL] = 15000` (`:41`) | onWallTileChanged 발화 (oil 은 wall sprite 아님) |
| R-008 | WOOD burning 만료 | WOOD → AIR | 15000 ms burn 종료 시 | `TileMutator.ts:258-275` | `BURN_DURATION_BY_TILE[TILE_WOOD] = 15000` (`:42`) | onWallTileChanged 발화 |
| R-009 | GRASS burning 만료 | GRASS → AIR | 10000 ms burn 종료 시 | `TileMutator.ts:258-275` | `BURN_DURATION_BY_TILE[TILE_GRASS] = 10000` (`:40`) | onWallTileChanged 발화 |
| R-010 | frozen WALL (originally WATER/MAGMA) | 원래 tile 복원 | 15000 ms 만료 시 | `TileMutator.ts:245-254` | `FREEZE_DURATION_MS = 15000` (`:64`) | 셀이 WALL 인 채로 변경됐으면 복원 안 함 (방어) |
| R-011 | electric overlay | 자연 소멸 | 2500 ms 만료 시 | `TileMutator.ts:278-281` | `ELECTRIC_DURATION_MS = 2500` (`:66`) | 셀 자체 mutate X, overlay 만 |

### 축 2 — Cell × Entity (hazard)

`TileHazards.applyTileHazards` (`TileHazards.ts:91-192`). target = Player/Enemy.

| ID | 입력 (A → target) | 출력 (damage / status) | 트리거 | 코드 위치 | 상수 | 비고 |
|----|-------------------|------------------------|--------|-----------|------|------|
| R-012 | MAGMA cell × entity AABB | 첫 접촉 maxHp × 10% + Burn 15 s 갱신 | 진입 frame 1회 (wasBurning 게이트) | `TileHazards.ts:114-121` | `MAGMA_FIRST_HIT_PCT = 0.10` (`:72`), `MAGMA_BURN_DURATION_MS = 15000` (`:73`) | "5x" 주석 — 5배 강화됨 |
| R-013 | ACID cell × entity AABB | maxHp × 0.5% / 100 ms tick | 체류 중 acidTickAccum | `TileHazards.ts:127-135` | `ACID_TICK_PCT = 0.005`, `ACID_TICK_MS = 100` (`:77-78`) | 명목 5%/s |
| R-014 | CHARGED cell × entity AABB | maxHp × 1% / 2500 ms tick | 체류 중 chargedTickAccum | `TileHazards.ts:138-146` | `CHARGED_TICK_PCT = 0.01`, `CHARGED_TICK_MS = 2500` (`:79-80`) | 상수명에 "TICK_MS = 2500" — 코드 vs 주석(0.5s) 불일치 |
| R-015 | fire overlay (burning OIL/WOOD/GRASS) × entity AABB(+2px) | maxHp × 3% × dt/1000 + Burn 10 s refresh | 매 frame | `TileHazards.ts:152-162` | `FIRE_DPS_PCT = 0.03`, `FIRE_BURN_REFRESH_MS = 10000` (`:81-82`) | fireFx 2px 인플레이션 |
| R-016 | burning BurnableProp × entity AABB(+2px, +1cell inflate) | maxHp × 3% × dt/1000 + Burn 10 s refresh | 매 frame | `TileHazards.ts:153-162`, `TileMutator.ts:532-549` | 위와 동일 | `aabbNearBurningProp` 인접성 검사 |
| R-017 | electric overlay × entity AABB | maxHp × 50% 1회 | overlay 진입 transition (prevInElectric → 현재 in) | `TileHazards.ts:168-172` | `THUNDER_HIT_PCT = 0.50` (`:83`) | 펄스당 1회 |
| R-018 | Burn status (burnRemainingMs > 0) × entity | maxHp × 2% / 5000 ms tick | burn DOT 활성 | `TileHazards.ts:175-186` | `BURN_TICK_PCT = 0.02`, `BURN_TICK_MS = 5000` (`:84-85`) | magma 첫 접촉 / fire overlay 가 burn 부여 |
| R-019 | oil residue blot × entity | oil slip 갱신 (damage 없음) | AABB 점 포함 | `FluidResidue.ts:252-263` | `OIL_LIFE_MS = 5000` (`:45`) | 점화 후엔 R-026 으로 분기 |
| R-020 | acid residue blot × entity | maxHp × 0.5% / 100 ms (player) · ×elementMultiplier(enemy) | AABB 점 포함 | `LdtkWorldScene.ts:2652-2660` (player), `:2741-2757` (enemy) | 0.005 / 100 ms | scene 측에서 처리 (FluidResidue 는 디스패치만) |
| R-021 | magma residue blot × entity | 첫 접촉 maxHp × 2% + Burn 15 s | AABB 점 포함 | `LdtkWorldScene.ts:2662-2670` (player), `:2759-:` (enemy) | 0.02 / 15000 ms (hard-coded) | cell 본체와 동일 |
| R-022 | water cell × entity (impulse) | 빠짐/나옴 splash + spring impulse | waterTransition 토글 | `LdtkWorldScene.ts:2700-2705` | `applyImpulse strength 1.0/0.8` (`:2701`), `impulseVy 150/-100` | 데미지 없음, 시각 + 물리 |

### 축 3 — Cell × Attack (element enchant)

`applyFireAttack` / `applyIceAttack` / `applyThunderAttack` (`TileHazards.ts:217-280`). 또한 EgoShard 충돌 시 scene 측 `onEgoShardImpact` (`LdtkWorldScene.ts:4974-5008`).

| ID | 입력 (A × attack) | 출력 | 트리거 | 코드 위치 | 상수 | 비고 |
|----|-------------------|------|--------|-----------|------|------|
| R-023 | Fire attack × WATER cell | WATER → AIR, removeCell, steam (scene VFX) | AABB 셀 sweep, priority 'steam' | `TileHazards.ts:236-239` | 100% (priority sweep) | scene 측 onSteamEvent 같은 별도 콜이 attack 경로엔 없음. removeCell 만. |
| R-024 | Fire attack × ICE cell | ICE → WATER (영구) | AABB 셀 sweep, priority 'melt' | `TileHazards.ts:240-241`, `TileMutator.ts:187-193` | 100% | onWallTileChanged 발화 |
| R-025 | Fire attack × OIL/WOOD/GRASS cell | 점화 (strong burn, 9000-15000 ms) | AABB 셀 sweep, priority 'ignite' | `TileHazards.ts:243-246`, `TileMutator.ts:199-210` | `BURN_DURATION_BY_TILE` (`TileMutator.ts:38-42`); fallback `BURN_DURATION_MS = 9000` (`:65`) | strong=true 마크 |
| R-026 | Fire attack × BurnableProp footprint | prop.ignite() (catalog burnMs) | tryIgnite fallback | `TileMutator.ts:206-210`, `BurnableProp.ts:159-165` | `BURNABLE_CATALOG[*].burnMs` (`:44-65`) | WoodCrate 12500, BranchPile 4000, Bush 10000, Curtain 6000, Vine 4500 |
| R-027 | Fire attack hitbox × oil residue blot | blot → burning (4000 ms) | AABB 점 포함 | `FluidResidue.ts:269-279`, `LdtkWorldScene.ts:5052-5053` | `OIL_BURN_LIFE_MS = 4000` (`:47`) | igniteN 카운트 반환 |
| R-028 | Ice attack × WATER cell | tryFreeze (15 s WALL) | AABB 첫 매치 (findCellInAABB) | `TileHazards.ts:261-262` | `FREEZE_DURATION_MS = 15000` (`TileMutator.ts:64`) | priority water > magma |
| R-029 | Ice attack × MAGMA cell | tryFreeze (15 s WALL) | AABB 첫 매치 | `TileHazards.ts:263-264` | 위와 동일 | water 가 없을 때만 |
| R-030 | Thunder attack × WATER/METAL/ACID cell | flood-fill chain → 모든 연결 셀 electric overlay 2500 ms | AABB 첫 conductor 매치 | `TileHazards.ts:273-280`, `TileMutator.ts:217-236` | `ELECTRIC_DURATION_MS = 2500` (`:66`) | BFS 4-방향 |
| R-031 | EgoShard fire impact × 2×2 cells | per-cell: ICE→water · WATER→AIR+steam · 그 외 ignite | impact corner-snap 후 4셀 sweep | `LdtkWorldScene.ts:4983-4997` | 인라인 (별도 상수 없음) | residue ignite 32×32 box 도 동시 호출 |
| R-032 | EgoShard ice impact × 2×2 cells | per-cell tryFreeze | impact corner-snap | `LdtkWorldScene.ts:4998-5001` | 위와 동일 | water/magma 만 실제 freeze |
| R-033 | EgoShard thunder impact × 2×2 cells | per-cell applyThunderChain | impact corner-snap | `LdtkWorldScene.ts:5002-5007` | 위와 동일 | isElectric 셀은 스킵 |
| R-034 | Physical attack × BREAKABLE(9) cell | cell → AIR | findCellInAABB | `TileHazards.ts:287-295` | 100% | 일반 검 swing 경로 |

### 축 4 — Entity × Cell (entity → cell 영향)

| ID | 입력 (entity A → cell B) | 출력 | 트리거 | 코드 위치 | 상수 | 비고 |
|----|--------------------------|------|--------|-----------|------|------|
| R-035 | burning BurnableProp → 인접 flammable cell | 점화 (chance 0.50) | 600 ms tick | `TileMutator.ts:367-381` | `0.50` 하드코딩 (`:380`) | entity radiates "strong fire" |
| R-036 | container 깨짐 (impact) × scene grid | BFS flood paint (water/oil/magma/acid) up to fluidVolume cells | takeAttack/impact 시 1회 | `LdtkWorldScene.ts:4874-4951` | `OilDrum 6`, `WaterBarrel 6`, `MagmaCrucible 4`, `AcidVial 4` (`ThrowableContainer.ts:67-72`) | paintable = AIR/GRASS/water/magma/oil/acid (`:4915-4916`) |
| R-037 | container MagmaCrucible 깨짐 | paint 후 인접 flammable cell tryIgnite | impact 1회 | `LdtkWorldScene.ts:4944-4950` | 100% per neighbor | paintedCells 4방향 |
| R-038 | container MagmaCrucible 깨짐 | steam VFX 1.6 strength | impact 1회 | `LdtkWorldScene.ts:4890-4892` | strength 1.6 | water 조우 검사 없음 — 깨질 때 무조건 |
| R-039 | player oil slip 활성 → oil residue 발자국 | 발자국 blot drop (MIN_STEP_DIST = 6 px) | grounded + active + 거리 게이트 | `FluidResidue.ts:99-117`, `LdtkWorldScene.ts:2638-2640` | `MIN_STEP_DIST = 6`, `MAX_BLOTS = 120` (`FluidResidue.ts:44, 46`) | acid/magma 동일 |
| R-040 | player water transition → fluidSystem.applyImpulse | spring impulse + splash | 진입/탈출 frame | `LdtkWorldScene.ts:2700-2705`, `FluidSystem.ts:202-223` | `CENTER_IMPULSE_MUL = 2.2`, `SIDE_IMPULSE_MUL = 0.25` (`FluidSystem.ts:49-50`) | 데미지 없음 |

### 축 5 — Entity × Entity

| ID | 입력 (A × B) | 출력 | 트리거 | 코드 위치 | 상수 | 비고 |
|----|-------------|------|--------|-----------|------|------|
| R-041 | burning BurnableProp → 인접 BurnableProp | other.ignite() | 600 ms tick, chance 0.40 × target.ignitionChance | `TileMutator.ts:382-388` | 0.40 하드코딩 (`:384`) · spec.ignitionChance (`BurnableProp.ts:33`) | 인접성: prop footprint 4-neighbour |
| R-042 | EgoShard × enemy | scene 측 onImpact + 데미지 (scene wiring) | shard 비행 중 enemy AABB 매치 | `EgoShard.ts:301-315` | scene 측 위임 | EgoShard 자체엔 원소 분기 X — element enum 만 전달 |
| R-043 | thrown container × enemy | 1회 impact damage (hasDealtImpact 게이트) | flight 중 collision | `ThrowableContainer.ts:170-176, 638-650` (scene 측 검사) | 코드 부재 (scene 측 검사 위치는 LdtkWorldScene 별도) | hasDealtImpact 으로 멀티히트 방지 |
| R-044 | HitManager (sword swing) × target | calculateDamage (atk vs def) | 콤보 단계별 hitbox 매치 | `HitManager.ts:83-196` | `CombatConst.CritChance/CritMultiplier` 등 | **원소 분기 없음** — 일반 데미지만 |

### 축 6 — Container × Cell (환경 노출 부식/연소)

`ThrowableContainer.tickEnvironment` (`ThrowableContainer.ts:759-818`). per-frame.

| ID | 입력 (kind × cell) | 출력 | 트리거 | 코드 위치 | 상수 | 비고 |
|----|--------------------|------|--------|-----------|------|------|
| R-045 | MetalCrate × ACID cell | acidExposureMs 누적, 1000 ms 마다 1 HP | 4 HP 모두 깎이면 destroy + impact | `ThrowableContainer.ts:786-793` | 1000 ms / 1 HP (`:788`), hp=4 (`:67`) | takeAttack(1) 호출 |
| R-046 | MetalCrate × MAGMA cell | magmaExposureMs 누적, 500 ms 마다 1 HP | 4 HP → 2 s 만에 destroy | `ThrowableContainer.ts:794-801` | 500 ms / 1 HP (`:796`) | "molten heat > corrosion" 의도 |
| R-047 | Wood 계열 × MAGMA cell | 1500 ms 임계 → 전체 HP takeAttack | 누적 1500 ms 도달 시 1회 | `ThrowableContainer.ts:805-808` | 1500 ms (`:807`) | 즉사 (Wood 계열 hp=1) |
| R-048 | Wood 계열 × FIRE overlay cell | 1500 ms 임계 → 전체 HP takeAttack | 누적 1500 ms 도달 시 1회 | `ThrowableContainer.ts:809-812` | 1500 ms (`:811`) | scene 측 isFireCell 콜백 = tileMutator.isOnFire |
| R-049 | Wood 계열 × ACID cell | 3000 ms 임계 → 전체 HP takeAttack | 누적 3000 ms 도달 시 1회 | `ThrowableContainer.ts:813-816` | 3000 ms (`:815`) | 즉사 |

(Crate 와 MetalCrate 의 fire 노출: Wood 계열 분기 (`:804-816`) 에 MetalCrate 는 포함되지 않음 → MetalCrate 는 fire 무효. Crate (plain wood) 도 paintTile=0 / fluidVolume=0 이지만 wood-family 분기에 들어가 fire/magma/acid 에 1500/1500/3000 ms 노출 시 파괴됨)

### 축 7 — Spawner

| ID | 입력 | 출력 | 트리거 | 코드 위치 | 상수 | 비고 |
|----|------|------|--------|-----------|------|------|
| R-050 | FluidSpawner × 타깃 셀 (AIR) | cell ← FLUID_TYPE_TO_TILE[type] | accum ≥ intervalMs 매번 | `FluidSpawner.ts:236-272` | 기본 `intervalMs = 16` (`:124`), `POOL_CELL_CAP = 100` (`:56`) | 타깃 셀이 AIR 가 아니면 throttle |
| R-051 | FluidSpawner basin full | accum 리셋, 분출 일시 정지 | basin 완전히 찬 상태 | `FluidSpawner.ts:242-245` | `BASIN_FILL_INTERVAL_MS = 1200` (`:57`) | 압력 드레인은 별도 (`pressureDrain` `:316-332`) |
| R-052 | FluidSpawner pool > POOL_CELL_CAP | spawner 정지 | downstream 셀 수 100 이상 | `FluidSpawner.ts:251-262` | `POOL_CELL_CAP = 100` (`:56`) | 무한 확산 가드 |
| R-053 | FluidSystem 셀 evaporation (thin strip, no solid floor/no wall brace) | 셀 → AIR + onEvaporated(type) | 250 ms tick · 무작위 1셀 | `FluidSystem.ts:851-884` | `EVAP_INTERVAL_MS = 250` (`:95`), `EVAP_FADE_MS = 650` (`:106`) | scene 측 onEvaporated → fluidResidue.dropAt (oil/acid/magma 만, `LdtkWorldScene.ts:999-1004`) |
| R-054 | FluidSystem.gravityTick | water/oil/magma/acid 셀 낙하 + 확산 | 140 ms tick | `FluidSystem.ts:749-832` | `GRAVITY_TICK_MS = 140` (`:93`) | electric overlay 동행 이동 (`:776`) |

---

## 2. 자가 검증

### 검증 1 — TILE_* 누락 확인

`Physics.ts:43-58` 의 TILE_* 상수 전체 (16개):

| TILE_* | 값 | 반응 매트릭스 등장 여부 |
|--------|----|------------------------|
| TILE_AIR | 0 | R-007/008/009 (출력), R-036 (paintable) — 등장 |
| TILE_WALL | 1 | R-002/R-010 (frozen 출력) — 등장 |
| TILE_WATER | 2 | R-002/R-023/R-028/R-030/R-040/R-050 등 — 등장 |
| TILE_PLATFORM | 3 | **미반응 tile** — 화학 반응 없음 (one-way 물리만) |
| TILE_UPDRAFT | 4 | **미반응 tile** — UpdraftSystem 별도 (조사 범위 외 hazard 아님) |
| TILE_SPIKE | 5 | **미반응 tile** — 물리 데미지 (hazard 매트릭스 외) |
| TILE_MAGMA | 6 | R-001/R-004/R-005/R-012/R-029/R-038/R-046/R-047 등 — 등장 |
| TILE_ICE | 7 | R-001/R-002 (출력)/R-024/R-031 등 — 등장 |
| TILE_CHARGED | 8 | R-014 — 등장 (단, "charged" 셀 자체는 mutate 안 됨. electric overlay 와는 별개) |
| TILE_BREAKABLE | 9 | R-034 — 등장 |
| TILE_VOID | 10 | **미반응 tile** — VoidFogSystem 별도, 화학 반응 없음 |
| TILE_OIL | 11 | R-005/R-006/R-007/R-025/R-050 등 — 등장 |
| TILE_METAL | 12 | R-003/R-030 — 등장 |
| TILE_ACID | 13 | R-003/R-004/R-013/R-020/R-030/R-045/R-049/R-050 등 — 등장 |
| TILE_WOOD | 15 | R-005/R-006/R-008/R-025 등 — 등장 |
| TILE_GRASS | 16 | R-005/R-006/R-009/R-025/R-036 paintable — 등장 |

**미반응 tile 목록 (4종):** TILE_PLATFORM (3) · TILE_UPDRAFT (4) · TILE_SPIKE (5) · TILE_VOID (10).
또한 TILE_CHARGED (8) 는 "셀 자체" 가 다른 셀과 화학 반응하지 않음 (자체적으로 데미지만). 즉 화학 매트릭스의 입력/출력 cell 로 변환되지 않음 — **준-미반응**.

### 검증 2 — 확률/주기 직접 인용 합산

Cell × Cell passive interaction (`TileMutator.ts`) 의 확률·주기 코드 값:

| 상수 | 값 | 인용 |
|------|----|----|
| `AUTO_INTERACT_INTERVAL_MS` | 1000 | `TileMutator.ts:71` |
| `OIL_SPREAD_INTERVAL_MS` | 600 | `TileMutator.ts:68` |
| `OIL_SPREAD_CHANCE` | 0.55 | `TileMutator.ts:69` |
| `ACID_METAL_CORRODE_CHANCE` | 0.06 | `TileMutator.ts:72` |
| `ACID_MAGMA_VAPOR_CHANCE` | 0.15 | `TileMutator.ts:73` |
| `MAGMA_ICE_MELT_CHANCE` | 0.04 | `TileMutator.ts:74` |
| `ICE_WATER_FREEZE_CHANCE` | 0.04 | `TileMutator.ts:75` |
| `FREEZE_DURATION_MS` | 15000 | `TileMutator.ts:64` |
| `BURN_DURATION_MS` (fallback) | 9000 | `TileMutator.ts:65` |
| `ELECTRIC_DURATION_MS` | 2500 | `TileMutator.ts:66` |
| `BURN_DURATION_BY_TILE[GRASS]` | 10000 | `TileMutator.ts:39` |
| `BURN_DURATION_BY_TILE[OIL]` | 15000 | `TileMutator.ts:41` |
| `BURN_DURATION_BY_TILE[WOOD]` | 15000 | `TileMutator.ts:42` |
| Spread 시 `GRASS` chance | 0.85 | `TileMutator.ts:326` |
| Spread 시 `WOOD` chance | 0.30 | `TileMutator.ts:327` |
| Entity radiates fire chance | 0.50 | `TileMutator.ts:380` |
| Entity → entity ignite chance | 0.40 × spec.ignitionChance | `TileMutator.ts:384` |

**모두 직접 인용 — 추측·발명 0건. "미확인" 항목 없음.**

### 검증 3 — fluid × fluid (4×4) / fluid × overlay (3×4) 빈 셀

#### 3-A. fluid × fluid (행=A 셀, 열=B 셀, A는 검사 트리거)

| A↓ \ B→ | WATER | OIL | MAGMA | ACID |
|---------|-------|-----|-------|------|
| **WATER** | (자기) | **부재** | **부재** (fire 공격 시 R-023 으로 water→AIR; 자연 반응 X) | **부재** |
| **OIL** | **부재** | (자기) | R-005 (magma → oil 점화 — 비대칭, magma 측 트리거) | **부재** |
| **MAGMA** | **부재** (얼리는 건 ice 셀 / ice attack) | R-005 (magma → oil 점화) | (자기) | R-004 (acid 측 트리거; magma 는 유지) |
| **ACID** | **부재** | **부재** | R-004 (acid → AIR + steam) | (자기) |

**정의된 fluid × fluid 반응: 2종 (R-004, R-005). 빈 셀 14종.**
직관적으로 있어 보이는 부재 사례:
- water + oil = 떠다님 / 비섞임 — **부재** (둘 다 그냥 인접 셀로 존재. 무거운 fluid가 아래로 가는 것은 gravityTick 의 단순 낙하 (`FluidSystem.ts:749-832`) 만 적용, 밀도 별 분리 코드 없음)
- water + fire (cell-level fire 가 아니라 burning overlay) = 진압 — **부재** (water cell 은 burning overlay 와 공존 불가능; 단 fire attack 이 water 에 닿으면 R-023 으로 water 가 사라짐. "물이 불을 끄는" 능동 반응 코드 없음)
- oil + acid = 부식 또는 반응 — **부재** (코드 부재)
- water + magma = 식어서 stone — **부재** (코드 부재; ice attack 만 magma 를 얼림 R-029)
- magma + oil 자연 ignite 외 magma flow → oil overflow — **부재** (그냥 옆에 있을 뿐 OIL 점화는 R-005)
- water + acid = 희석 — **부재**

#### 3-B. fluid × overlay (행=fluid, 열=overlay)

| fluid↓ \ overlay→ | fire (burning) | electric | frozen |
|-------------------|----------------|----------|--------|
| **WATER** | R-023 (fire attack 만; passive 부재) | R-030 (thunder chain) | R-028 (ice attack 만; passive R-002 도 있음) |
| **OIL** | R-025 (fire attack) / R-005~R-006 (passive spread) | **부재** (acid·water·metal 만 conductor, oil 제외) | **부재** (ice attack 은 water/magma 만) |
| **MAGMA** | (자기) | **부재** | R-029 (ice attack); R-002 의 자연 freeze 도 magma 포함 (R-010 originalTile 분기) |
| **ACID** | **부재** (acid 는 flammable 아님) | R-030 (thunder chain) | **부재** |

**정의된 fluid × overlay 반응: 6종 (R-002, R-023, R-025, R-028, R-029, R-030 — 일부 중복 카운트). 빈 셀 6종.**
직관적 부재:
- oil × electric — 부재 (isConductor 가 oil 미포함, `Physics.ts:124-126`)
- oil × frozen — 부재 (tryFreeze 는 water/magma 만, `TileMutator.ts:170`)
- acid × fire — 부재 (acid 는 isFlammable 아님 `Physics.ts:129-131`)
- magma × fire — 자기 자신 (magma 가 영구 fire source, R-005)

### 검증 4 — 직관 vs 코드 reality 차이 (부재 사실만 기록)

다음 반응은 직관적으로 "있어야 할" 수준이지만 **코드 부재**:

1. **water cell × fire overlay 자연 진압** — 부재. fire overlay 는 OIL/WOOD/GRASS 셀 위에만 존재; water 가 옆에 있어도 끄지 않음. 단, fire ATTACK 이 water 셀에 닿으면 R-023 (water → AIR).
2. **acid × water 희석** — 부재. acid 와 water 는 인접해도 mutate 없음.
3. **oil × water 부유 분리** — 부재. gravityTick (`FluidSystem.ts:749-832`) 은 단순 fluid 셀 → 아래 AIR 셀 낙하만. 밀도 비교 없음. FLUID_VALUES Set 통일 처리.
4. **water + magma 자연 식힘 → stone(WALL)** — 부재. 두 셀이 인접해도 mutate 없음. ice ATTACK 만 magma 를 얼림 (R-029).
5. **oil + acid 자연 반응** — 부재.
6. **water + oil 점성 합성** — 부재.
7. **acid × wood/grass 부식** — 부재. ACID 의 corrosion 대상은 METAL 만 (`TileMutator.ts:421`).
8. **CHARGED(8) 셀의 인접 셀 영향** — 부재. CHARGED 는 hazard (R-014) 만, 다른 셀로 전파 안 함 (electric overlay 와는 다른 시스템).
9. **frozen WATER 셀(WALL) 위 단열** — 부재. ice cap 검사 (`FluidSystem.ts:811-819`) 는 fluid 가 같은 type 일 때만 cap 인정.
10. **container × fire overlay 직접 점화 (drum 이 가연성으로)** — 부재. 컨테이너는 환경 노출만 누적 (R-048). BurnableProp 으로 등록 안 됨.
11. **EgoShard fire 충돌 시 onSteamEvent** — 부재. scene 측 onEgoShardImpact 에서 water 만나면 직접 steamPuff.spawn 호출 (`LdtkWorldScene.ts:4989-4990`); TileMutator.onSteamEvent 콜백은 호출 안 됨 — passive interaction 만 거기로 흐름.
12. **MagmaCrucible × water cell 직접 hit → steam VFX 만 (반응 X)** — Magma paint 가 water 셀을 덮어쓸 수 있고 (paintable list `:4915-4916` 에 water 포함), 결과는 단순 덮어쓰기. 조우 검사 / steam 1회 spawn (R-038) 외 추가 반응 없음.
13. **HitManager 의 원소 데미지 보정** — 부재. HitManager 는 일반 calculateDamage(atk vs def) 만 (`HitManager.ts:118-125`). 원소 인첸트는 별도 attack hook (`applyFireAttack` 등) 에서 cell 측으로만 발화.
14. **BurnableProp × water cell 인접 자연 진화** — 부재. 물 옆에 있어도 burnRemainingMs 자연 감소만 (`BurnableProp.ts:177-187`).
15. **electric overlay × wood/oil/grass 자연 점화** — 부재. electric 은 conductor cell 만 lit, 점화 트리거 X.

---

## 3. 요약

- **총 반응 수: 54건** (R-001 ~ R-054).
  - 축 1 Cell×Cell: 11
  - 축 2 Cell×Entity: 11
  - 축 3 Cell×Attack: 12
  - 축 4 Entity×Cell: 6
  - 축 5 Entity×Entity: 4 (HitManager 무원소 분기 포함)
  - 축 6 Container×Cell: 5
  - 축 7 Spawner: 5

- **자가 검증 4 항목 결과**

| 검증 | 결과 |
|------|------|
| 검증 1 — TILE_* 누락 | 통과 (미반응 4종 명시: PLATFORM/UPDRAFT/SPIKE/VOID, 준-미반응 CHARGED 셀 자체) |
| 검증 2 — 확률/주기 코드 값 직접 인용 | 통과 (17개 상수 모두 file:line 인용, "미확인" 0건) |
| 검증 3 — 매트릭스 빈 셀 | 통과 (fluid×fluid 16칸 중 2 정의 / 14 부재 명시 · fluid×overlay 12칸 중 6 정의 / 6 부재 명시) |
| 검증 4 — 직관 vs 코드 부재 | 통과 (15건 부재 사실만 기록, 제안 없음) |

- **주목할 코드 reality**
  - HitManager 는 **원소 분기 0** — 검 swing 일반 데미지만. 원소 효과는 별도 attack hook 으로만 발화.
  - `MAGMA_FIRST_HIT_PCT = 0.10` (10%) — 문서 주석은 "2% maxHp" (`TileHazards.ts:9`) 와 불일치, 코드는 0.10 (`:72`) "5x 강화" 주석.
  - `CHARGED_TICK_MS = 2500` (코드) vs 주석 "0.5s" (`TileHazards.ts:79-80`) 불일치.
  - magma 셀은 **영구 fire source** 로 작동 (모든 magma 셀이 매 600ms tick 인접 flammable 방사, `TileMutator.ts:348-365`) — GDD 명시 여부 확인 필요.
  - `FREEZE_DURATION_MS = 15000` (15s), `MAGMA_BURN_DURATION_MS = 15000` (15s) — 주석상 "magma 3s Burn" (`TileHazards.ts:9`) 와 큰 차이.
  - oil residue blot ignite 후 4 s 만에 소진 (`OIL_BURN_LIFE_MS = 4000`) — 셀의 oil burn 15 s 와 별개 수명.
