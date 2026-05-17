# CSV ↔ GDD 매핑 테이블 (ECHORIS)

> 각 `Sheets/*.csv`(SSoT)와 대응 `Documents/` GDD, 검증 대상 컬럼을 정의한다.
> CSV 값이 권위. GDD 본문·테이블 수치를 여기에 맞춰 동기화한다.

## 1. 무기 리스트

- **CSV:** `Sheets/Content_Stats_Weapon_List.csv`
- **GDD 주 문서:** `Documents/System/System_Combat_Weapons.md`, `Documents/Content/Content_Weapon_List.md`
- **GDD 부 문서:** `Documents/System/System_Equipment_Rarity.md` (BaseATK 레어리티별 분포)
- **검증 컬럼:** `WeaponID`, `Name`, `Type`, `Rarity`, `BaseATK`, `AtkSpeed`, `Range`, `HitboxW`, `HitboxH`
- **검증 포인트:**
  - 무기 ID는 `snake_case` 유지 (`sword_broken`, `sword_magic` 등)
  - `Type` 값이 확정 7무기(Blade/Cleaver/Shiv/Harpoon/Chain/Railbow/Emitter)에 포함되는지 확인 (DEC-026)
  - `Rarity` 값은 `normal`/`magic`/`rare`/`legendary`/`ancient`만 허용

## 2. 무기 로어

- **CSV:** `Sheets/Content_Stats_Weapon_Lore.csv`
- **GDD 주 문서:** `Documents/Content/Content_Weapon_List.md`
- **GDD 부 문서:** `Documents/Content/Content_Item_Narrative_*.md`, `Documents/System/System_ItemNarrative_Template.md`
- **검증 컬럼:** `WeaponID`, `Name`, `Type`, `Rarity`, `BaseATK`, `AreaID`, `MemoryShardSeed`, `LorePath`, `Description`
- **검증 포인트:**
  - `LorePath`가 가리키는 `Sheets/LoreTexts/*.md` 파일 실존 여부
  - `AreaID`가 `Content_System_Area_Palette.csv`에 존재하는지 확인

## 3. 레어리티

- **CSV:** `Sheets/Content_Rarity.csv`
- **GDD 주 문서:** `Documents/System/System_Equipment_Rarity.md`, `Documents/Terms/Glossary.md` (레어리티 등급 빠른 참조)
- **GDD 부 문서:** `Documents/System/System_ItemWorld_Core.md`, `Reference/게임 기획 개요.md`
- **검증 컬럼:** `Rarity`, `Multiplier`, `InnocentSlots`, `Color`, `BareHandAtk`, `InnocentSpawnChance`, `DropChance`
- **필수 일치 항목:**
  - Normal=1.0/2슬롯/#FFFFFF, Magic=1.3/3/#6969FF, Rare=1.7/4/#FFFF00, Legendary=2.2/6/#FF8000, Ancient=3.0/8/#00FF00
  - 이 값이 GDD에서 다르게 기재되면 즉시 Layer 1 불일치로 플래그

## 4. 지층 구성 (StrataConfig)

- **CSV:** `Sheets/Content_StrataConfig.csv`
- **GDD 주 문서:** `Documents/System/System_ItemWorld_FloorGen.md`, `Documents/System/System_ItemWorld_Core.md`
- **GDD 부 문서:** `Documents/System/System_ItemWorld_Boss.md`
- **검증 컬럼:** `Rarity`, `Stratum`, `HpMul`, `AtkMul`, `EnemyCountBonus`, `BossHpMul`, `BossAtkMul`, `ExpMultiplier`
- **검증 포인트:**
  - 레어리티별 지층 개수: Normal=2, Magic=3, Rare=3, Legendary=4, Ancient=4 (+심연)
  - GDD가 "Floor 1-4"로 기재하면 "Stratum" 용어로 수정 (Glossary §Floor/Stratum)

## 5. 메모리 룸

- **CSV:** `Sheets/Content_ItemWorld_MemoryRooms.csv`
- **GDD 주 문서:** `Documents/System/System_ItemWorld_FloorGen.md`, `Documents/System/System_ItemNarrative_Template.md`
- **검증 컬럼:** `WeaponID`, `StratumIndex`, `MemoryRoomName`
- **검증 포인트:**
  - `WeaponID`가 `Content_Stats_Weapon_List.csv`에 존재하는지 확인
  - `StratumIndex`가 해당 레어리티 `StrataConfig` 범위 내인지 확인 (0-based)

## 6. 적 스폰 테이블

- **CSV:** `Sheets/Content_ItemWorld_SpawnTable.csv`
- **GDD 주 문서:** `Documents/System/System_Enemy_Spawning.md`, `Documents/System/System_ItemWorld_FloorGen.md`
- **GDD 부 문서:** `Documents/System/System_ItemWorld_Boss.md`
- **검증 컬럼:** `Rarity`, `Stratum`, `EnemyType`, `Weight`, `Level`, `MinCount`, `MaxCount`, `IsBoss`
- **검증 포인트:**
  - `EnemyType`이 `Content_Stats_Enemy.csv`의 `Type`에 존재하는지 확인
  - `IsBoss=true` 행은 반드시 해당 지층 최종 룸에만 배치된다는 Document 설명과 일치

## 7. 적 스탯

- **CSV:** `Sheets/Content_Stats_Enemy.csv`
- **GDD 주 문서:** `Documents/System/System_Enemy_AI.md`, `Documents/System/System_Enemy_MonsterArchetype.md`, `Documents/Content/Content_Monster_Bestiary.md`
- **GDD 부 문서:** `Documents/System/System_Enemy_BossDesign.md`
- **검증 컬럼:** `Type`, `Level`, `HP`, `ATK`, `DEF`, `DetectRange`, `AttackRange`, `MoveSpeed`, `AttackCooldown`, `JumpTiles`, `Exp`, `MovementType`
- **검증 포인트:**
  - `MovementType` 값 허용 목록 확인 (ground/flying/swimming 등)
  - Bestiary에 수록된 모든 몬스터 Type이 CSV에 존재하는지 확인

## 8. 이노센트

- **CSV:** `Sheets/Content_Innocents.csv`
- **GDD 주 문서:** `Documents/System/System_Innocent_Core.md`
- **검증 컬럼:** `Name`, `Stat`, `BaseValue`
- **검증 포인트:**
  - `Stat` 값이 ATK/INT/HP/DEF 등 공식 3(+보조)스탯 체계 준수 (DEX/SPD/STR/VIT/LCK 사용 시 Layer 4 폐기어 플래그)
  - Tutor 이노센트: `Stat=int`, `BaseValue=1` (Glossary 명시)

## 9. 콤보

- **CSV:** `Sheets/Content_Combat_Combo.csv`
- **GDD 주 문서:** `Documents/System/System_Combat_Action.md`, `Documents/System/System_Combat_HitFeedback.md`
- **검증 컬럼:** `Step`, `HitboxW`, `HitboxH`, `ActiveFrames`, `TotalFrames`, `HitstopFrames`, `Hitstun`, `KnockbackX`, `KnockbackY`, `ShakeIntensity`, `ComboWindow`, `EndLag`
- **검증 포인트:**
  - Auto Combo 3타 연결. 마지막 Step의 `EndLag=600ms` (Glossary Combo End Lag 정의와 일치)
  - `HitstopFrames`는 2-4 범위 (Glossary Hitstop 정의)

## 10. 드랍 확률 풀

- **CSV:** `Sheets/Content_Item_DropRate.csv`
- **GDD 주 문서:** `Documents/System/System_Economy_DropRate.md`, `Documents/Design/Design_Economy_FaucetSink.md`
- **검증 컬럼:** `Pool`, `Rarity`, `Weight`
- **검증 포인트:**
  - `normal` 풀의 weight 합계가 1.0에 근접하는지 확인
  - Glossary "Rarity 드랍 확률" 테이블(60/25/10/4/1)과 기본 풀 일치

## 11. 아이템 성장

- **CSV:** `Sheets/Content_Item_Growth.csv`
- **GDD 주 문서:** `Documents/System/System_Equipment_Growth.md`, `Documents/System/System_Growth_LevelExp.md`
- **검증 컬럼:** `Rarity`, `AtkPerLevel`, `ExpPerLevel`, `MaxLevel`
- **검증 포인트:**
  - `MaxLevel=99` 모든 레어리티 공통 (디스가이아 오마주)
  - GDD에서 "Lv.100" 기재 시 불일치 플래그

## 12. 캐릭터 기본 스탯

- **CSV:** `Sheets/Content_Stats_Character_Base.csv`
- **GDD 주 문서:** `Documents/System/System_Growth_Stats.md`, `Documents/System/System_Growth_LevelExp.md`
- **검증 컬럼:** `Level`, `HP`, `ATK`, `DEF`, `INT`, `ExpToNext`
- **검증 포인트:**
  - Lv1 HP=100, Lv10 HP=300 (테이블 고정값)
  - `ExpToNext` Lv10=0 (최대 레벨 도달)

## 13. 에리어 팔레트

- **CSV:** `Sheets/Content_System_Area_Palette.csv`
- **GDD 주 문서:** `Documents/Design/Design_Art_Direction.md`, `Documents/System/System_World_TileSystem.md`
- **검증 컬럼:** `AreaID`, `Name`, `Layer`, `Brightness`, `Tint`, `DepthBias`, `DepthCenter`, `Stops`, `Description`, `Tileset`
- **검증 포인트:**
  - `Layer` 값: BG/WALL/FG 등 허용 목록
  - `Tileset` 이름이 실제 에셋 폴더에 존재하는지 확인 (Phase 2 이후)

## 14. 데미지 공식

- **CSV:** `Sheets/Content_System_Damage_Formula.csv`
- **GDD 주 문서:** `Documents/System/System_Combat_Damage.md`
- **GDD 부 문서:** `Documents/System/System_Combat_Elements.md`
- **검증 컬럼:** `FormulaID`, `Type`, `Expression`, `DEF_Factor`, `MinDamage`, `RandomMin`, `RandomMax`, `CritMultBase`, `CritMultCap`
- **검증 포인트:**
  - `physical` 공식: `(ATK * SkillMult) - (DEF * DEF_Factor)` 원문 그대로 GDD에 인용되었는지 확인
  - `CritMultBase=1.5`, `CritMultCap=1.5` 일치 (Glossary "크리티컬 고정 5%")

## 15. ItemWorld Fluid 매핑

- **CSV:** `Sheets/Content_ItemWorld_FluidMapping.csv`
- **GDD 주 문서:** `Documents/System/System_World_Fluid.md` (§3.4 Generic IntGrid + 치환 layer)
- **GDD 부 문서:** `Documents/System/System_World_Container.md` (§12.4 Container Pool ID 표)
- **코드 mirror:** `game/src/data/ItemWorldFluidMapping.ts` (`FLUID_MAPPING` 객체)
- **검증 컬럼:** `temperament`, `slot_a`, `slot_b`, `slot_c`, `container_pool_id`
- **검증 포인트:**
  - `temperament` 값은 정확히 `forge` / `iron` / `rust` / `spark` / `shadow` 5개 (DEC-036 5색 기질). 대소문자·오타 불허
  - `slot_a/b/c` 값은 `water` / `magma` / `oil` / `acid` 중 하나 (lava 는 V1 미사용)
  - `container_pool_id` 가 `System_World_Container.md` §12.4 의 Pool ID 표에 *존재* 해야 함
  - CSV 의 모든 row (`forge/iron/rust/spark/shadow` 5개) 가 `ItemWorldFluidMapping.ts` 의 `FLUID_MAPPING` 객체와 *정확히 일치* (값·키)

### 15.1 LDtk IntGrid Generic 마커 cross-validation

- **LDtk 파일:** `game/public/assets/World_ProjectAbyss.ldtk`
- **GDD 주 문서:** `Documents/System/System_World_Fluid.md` §3.4
- **검증 포인트:**
  - LDtk `Collisions` 레이어에 IntGrid value 17/18/19 = `FluidGeneric_A/B/C` 정의 존재
  - **World 룸** (LdtkWorldScene 이 attach 하는 일반 룸) 의 셀 데이터에 17/18/19 사용 **0건** — 월드는 *명시 fluid value* 만 사용
  - **ItemWorld 룸 템플릿** (ItemWorldScene 이 buildFullMap 으로 합치는 룸) 의 셀 데이터에 명시 fluid value (2/6/11/13) 사용 **0건** — 아이템계는 *generic 17/18/19 만* 사용
  - 단, 위 후자는 *템플릿 룸 식별 가능성* 에 의존. 식별 신호가 없으면 *경고만* (오류 아님)

### 15.2 FluidSpawner Generic Type cross-validation

- **LDtk 파일:** `game/public/assets/World_ProjectAbyss.ldtk` 의 `FluidType` enum (uid 1003)
- **GDD:** `Documents/System/System_World_Fluid.md` §10.1 (Type 필드 표)
- **코드:** `game/src/systems/FluidSpawner.ts` (`readFluidSpawnerEntities` 분기) + `game/src/data/ItemWorldFluidMapping.ts` (`resolveGenericFluidType`)
- **검증 포인트:**
  - LDtk `FluidType` enum 에 `Generic_A` / `Generic_B` / `Generic_C` 3 값 존재
  - 코드 `readFluidSpawnerEntities` 가 `generic_a/b/c` (lowercase) 분기 처리 존재
  - `resolveGenericFluidType` 의 반환값이 4 명시 type (`water/magma/oil/acid`) 중 하나만 가능 (lava 등 미지원 type 으로 fallback 금지)

### 15.3 ContainerPools 카탈로그 cross-validation

- **코드 SSoT:** `game/src/data/ContainerPools.ts` (`CONTAINER_POOLS` 객체)
- **GDD:** `Documents/System/System_World_Container.md` §12.4 (Pool 가중치 표)
- **검증 포인트:**
  - `Content_ItemWorld_FluidMapping.csv` 의 모든 `container_pool_id` 값이 `CONTAINER_POOLS` 객체 키로 존재 — 미존재 시 spawn 시점에 빈 배열 fallback (조용한 실패)
  - `CONTAINER_POOLS` 의 각 Pool 의 ContainerKind 값이 `ThrowableContainer.ts` 의 `ContainerKind` enum 6종 (Crate / MetalCrate / OilDrum / WaterBarrel / MagmaCrucible / AcidVial) 안에 존재
  - §12.4 표의 Pool ID 와 코드 `CONTAINER_POOLS` 키 *완전 일치* — 한쪽만 갱신하면 디버전스

## 16. 화학 반응 매트릭스 (Chemical Reactions SSoT)

- **권위 SSoT:** `Documents/System/System_World_ChemicalReactions.md` (54 기존 + 15 신규)
- **로드맵:** `Documents/Design/Design_World_ChemicalReactions_Roadmap.md` (Tier 1/2/3)
- **코드 SSoT:** `game/src/systems/TileMutator.ts` + `game/src/systems/TileHazards.ts` + `game/src/effects/FluidSystem.ts` + `game/src/effects/FluidResidue.ts` + `game/src/entities/ThrowableContainer.ts`

### 16.1 Damage Matrix cross-validation

- **검증 포인트 (Layer 1 — 게임플레이 영향):**
  - `TileHazards.ts:72` `MAGMA_FIRST_HIT_PCT = 0.10` ↔ ChemicalReactions.md §3.1 ↔ Fluid.md §6.3 ↔ TileSystem.md §3.0
  - `TileHazards.ts:73` `MAGMA_BURN_DURATION_MS = 15000` ↔ 동일 위치
  - `TileHazards.ts:77-78` `ACID_TICK_PCT = 0.005`, `ACID_TICK_MS = 100` ↔ 동일 위치
  - `TileHazards.ts:79-80` `CHARGED_TICK_PCT = 0.01`, `CHARGED_TICK_MS = 2500` (⚠️ 코드 주석 "0.5s" 자가-모순 별도 검출)
  - `TileHazards.ts:81-82` `FIRE_DPS_PCT = 0.03`, `FIRE_BURN_REFRESH_MS = 10000`
  - `TileHazards.ts:83` `THUNDER_HIT_PCT = 0.50` (⚠️ TileSystem.md "8%" legacy 정정 필요)
  - `TileHazards.ts:84-85` `BURN_TICK_PCT = 0.02`, `BURN_TICK_MS = 5000` (⚠️ 코드 주석 "1s" 자가-모순)
  - `TileMutator.ts:64-66` `FREEZE_DURATION_MS=15000`, `BURN_DURATION_MS=9000`, `ELECTRIC_DURATION_MS=2500`

### 16.2 Passive Interaction cross-validation

- **검증 포인트:**
  - `TileMutator.ts:71-75` `AUTO_INTERACT_INTERVAL_MS=1000`, `OIL_SPREAD_INTERVAL_MS=600`, `OIL_SPREAD_CHANCE=0.55`, `ACID_METAL_CORRODE_CHANCE=0.06`, `ACID_MAGMA_VAPOR_CHANCE=0.15`, `MAGMA_ICE_MELT_CHANCE=0.04`, `ICE_WATER_FREEZE_CHANCE=0.04`
  - `TileMutator.ts:38-42` `BURN_DURATION_BY_TILE[GRASS]=10000`, `[OIL]=15000`, `[WOOD]=15000`
  - 각 상수 ↔ ChemicalReactions.md §4 표 ↔ TileSystem.md §3.2 자동 상호작용 표 *3축 동기화*

### 16.3 BurnableProp burnMs cross-validation

- **권위:** `BurnableProp.ts:46-62` (`BURNABLE_CATALOG`)
- **legacy 폐기:** `TileSystem.md §7.2.2` (구버전 수치 5-17배 차이) → 삭제 또는 *§3.0.2 와 통합* 후 제거 권장
- **검증 포인트:**
  - WoodCrate=12500, BranchPile=4000, Bush=10000, Curtain=6000, Vine=4500 — 모든 row 코드 ↔ §3.0.2 ↔ ChemicalReactions.md 일치

### 16.4 자가-모순 검출

다음 *코드 주석 vs 코드 상수* 자가-모순은 별도 *Code Internal* 디버전스로 검출:

- `TileHazards.ts:8` 주석 "magma 2%" vs `:72` `MAGMA_FIRST_HIT_PCT = 0.10` (5× 차이)
- `TileHazards.ts:11` 주석 "charged 0.5s tick" vs `:80` `CHARGED_TICK_MS = 2500` (5× 차이)
- `TileHazards.ts:174` 주석 "1s" vs `:85` `BURN_TICK_MS = 5000` (5× 차이)

검출 시: 코드 상수가 권위. 주석을 상수에 맞춰 정정.

### 16.5 Phase 3 카드 등록

다음은 *문서만 명시, 코드 미구현* (orphan spec) — Phase 3 카드로 식별:

- NM-02 Shock 상태이상 (Combat_Damage.md §3 + Combat_Elements.md §3.2)
- NM-03 원소 퓨전 Steam Blast / Plasma Surge / Cryo Shock (Combat_Elements.md §8)
- NM-07 entity 빙결 + 화염 → 증기 폭발 (Combat_Damage.md §5.2)

검증 시 *"orphan — Phase 3 카드"* 표시. 코드 부재가 *오류 아님* (의도된 미구현).

---

## 파생 계산 공식 (Layer 1.2)

다음 파생값은 CSV 원값에서 계산되며, GDD에 등장 시 재계산하여 검증한다.

- **무기 실질 ATK:** `BaseATK × Rarity.Multiplier × (1 + ItemGrowth.AtkPerLevel × Level / BaseATK)`
- **지층 HP/ATK 승수:** StrataConfig의 누적 승수 (동일 레어리티 내 지층 간 단조 증가)
- **이노센트 복종 효과:** `BaseValue × Level × 2` (복종 시 2배, Glossary 정의)
- **Remnant Fragment 획득량:** `floor(Innocent_Level / FRAGMENT_DIVISOR)` (System_Innocent_Core.md §2.7 참조)

## 허용 오차

- 정수 값: 정확히 일치
- 소수 값: ±0.01 이내
- 배율: ±0.05 이내
- 색상 코드(hex): 대소문자 무시, 정확히 일치

## 검색 제외 대상

- `Reference/` 디렉토리 (외부 인사이트 아카이브)
- `Sheets/LoreTexts/` (로어 텍스트, 수치 아님)
- `game/` (코드 변수명은 별도 규칙)
- `.git/`, `node_modules/`, `dist/`, `memory/`
