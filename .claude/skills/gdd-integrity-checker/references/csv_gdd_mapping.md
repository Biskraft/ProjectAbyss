# CSV ↔ GDD 매핑 테이블

> 각 CSV(SSoT)와 대응 GDD 문서, 검증 대상 컬럼을 정의합니다.

## 원거리 무기

- **CSV:** `Sheets/Content_Stats_Weapon_RangeList.csv`
- **GDD:** `Documents/System_Weapons_Range.md`
- **검증 컬럼:** `Damage_Max`, `RPM`, `Mag_Size`, `Range_Start`, `Range_End`, `Reload_s`, `HS_Mult`
- **파생 검증:**
  - TTK 테이블: `STK = ceil(150 / Damage_Max)`, `TTK = (STK-1) × (60000/RPM)`
  - 헤드샷 원킬: `Damage_Max × HS_Mult > 150` → 원킬 가능 여부

## 근접 무기

- **CSV:** `Sheets/Content_Stats_Weapon_MeleeList.csv`
- **GDD:** `Documents/System_Weapons_Melee.md`
- **검증 컬럼:** `Base_Damage`, `Attack_Speed`, `Range_m`, `Durability`, `Breach_Efficiency`

## 방어구

- **CSV:** `Sheets/Content_Stats_Armor_ArmorList.csv`
- **GDD:** `Documents/System_Combat_Armor.md`
- **검증 컬럼:** `Mitigation_Rate_%`, `Durability`, `Weight_kg`

## 가젯

- **CSV:** `Sheets/Content_Stats_Gadget_GadgetList.csv`
- **GDD:** `Documents/Gadgets/Gadget_*.md` (각 가젯별)
- **검증 컬럼:** `Damage`, `Duration_s`, `Cooldown_s`, `Range_m`

## 제작 레시피

- **CSV:** `Sheets/Content_System_Craft_Recipes.csv`
- **GDD:** 각 무기/아이템 관련 GDD 문서 내 비용 언급
- **검증 컬럼:** `Res_Scrap_Parts_unit`, `Res_Tech_Unit_unit`, `Res_Core_Module_unit`

## 무기 강화

- **CSV:** `Sheets/Content_System_Weapon_Enhancement.csv`
- **GDD:** `Documents/System_Ingame_Enhancement.md`
- **검증 컬럼:** `Cost`, `Effect_Value`, `Currency`

## 팀 업그레이드

- **CSV:** `Sheets/Content_System_Team_Upgrade.csv`
- **GDD:** `Documents/System_Team_Upgrade.md`
- **검증 컬럼:** `Effect_Value`, `Cost`, `Currency`

## 자원 생성기

- **CSV:** `Sheets/Content_System_Resource_Generator.csv`
- **GDD:** `Documents/System_Economy_Overview.md`, `Documents/Design_Economy_Faucet_Sink.md`
- **검증 컬럼:** `Amount`, `Interval_s`
- **파생 검증:** 분당 생산량 = `Amount × (60 / Interval_s)`

## 매치 설정

- **CSV:** `Sheets/Content_System_Match_Config.csv`
- **GDD:** `Documents/System_Match_Lifecycle.md`, `Documents/System_Player_Death_Rules.md`
- **검증 컬럼:** `Value` (각 Config_Key별)

## 매치 타임라인

- **CSV:** `Sheets/Content_System_Match_MatchTimeline.csv`
- **GDD:** `Documents/System_Match_Lifecycle.md`
- **검증 컬럼:** `Start_min`, `End_min`, `Event`

## 빌드 패턴

- **CSV:** `Sheets/Content_System_Build_Patterns.csv`
- **GDD:** `Documents/Design_Meta_Strategy.md`
- **검증 컬럼:** 총 비용(Scrap + Tech), 아이템 수량

## 대미지 상호작용

- **CSV:** `Sheets/Content_System_Damage_InteractionMatrix.csv`
- **GDD:** `Documents/System_Combat_Damage.md`
- **검증 컬럼:** 매트릭스 값 (Dealer Tag × Receiver Tag)

## 상태이상

- **CSV:** `Sheets/Content_System_State_StatusEffects.csv`
- **GDD:** `Documents/System_State_StatusEffects.md`
- **검증 컬럼:** `Duration_s`, `Damage_Per_Tick`, `Tick_Interval_s`

## 파쿠르 수치

- **CSV:** `Sheets/Content_System_Move_ParkourMetrics.csv`
- **GDD:** `Documents/System_Player_Movement.md`
- **검증 컬럼:** `Min_Height_cm`, `Max_Height_cm`, `Duration_s`, `Invincible_Frame_unit`
- **매핑 주의:** `MOV_PKR_DVE`(다이빙 구르기)는 GDD의 `tactical_dive`(§2.6)에 대응. `dodge_roll`(§2.5)과는 별개 동작

## 행동 제한 매트릭스

- **CSV:** `Sheets/Content_System_Action_RestrictionMatrix.csv`
- **GDD:** `Documents/System_Controls_Input_Rules.md`
- **검증 컬럼:** 매트릭스 값 (Action × State)

## 건축 블록

- **CSV:** `Sheets/Content_Level_Build_BuildingBlocks.csv`
- **GDD:** `Documents/System_Building_Mechanics.md`
- **검증 컬럼:** `HP`, `Cost_Scrap`, `Cost_Tech`, `Cost_Core`

## 좀비 스폰

- **CSV:** `Sheets/Content_System_Zombie_SpawnRules.csv`
- **GDD:** `Documents/System_Character_NPC.md`
- **검증 컬럼:** `Net_Worth_Min_unit`, `Net_Worth_Max_unit`, `Spawn_Level`, `Density_Modifier`, `Respawn_Time_s`, `Max_Units_Per_Spawn_Point`, `Unit_Tier_Distribution`

## 캐릭터 기본 스탯

- **CSV:** `Sheets/Content_Stats_Character_Base.csv`
- **GDD:** `Documents/System_Character_Player.md`
- **검증 컬럼:** `HP`, `Speed_mps`, `Stamina`

## 플레이어 기본 스탯

- **CSV:** `Sheets/Content_Stats_Player_BaseStats.csv`
- **GDD:** `Documents/System_Player_Health.md`
- **검증 컬럼:** `Max_HP`, `Regen_Rate`, `Fall_Damage_Threshold`
