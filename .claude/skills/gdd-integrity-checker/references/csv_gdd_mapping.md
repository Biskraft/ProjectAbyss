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
- **검증 컬럼:** `WeaponID`, `Name`, `Type`, `Rarity`, `BaseATK`, `AreaID`, `InnocentSeed`, `LorePath`, `Description`
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
