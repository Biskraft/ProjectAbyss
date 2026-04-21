# Phase 2 (Alpha) 연구 개발 전수 목록

> **작성일:** 2026-04-21
> **목표:** "성장/탐험 쾌감이 있는가?"
> **범위:** 7개 층위 + 능력/스탯 이중 게이트 + 아이템계 전체 지층 + 이노센트 기초
> **추정 기간:** ~12주
> **근거:** `Development_Roadmap.md`, `Roadmap_GDD_MasterPlan.md`, 시스템 문서 47개, 리서치 70개, UI 전수조사 201개

---

## 범례

| 기호 | 의미 |
|:-----|:-----|
| OK | 리서치/문서/구현 완료 |
| PARTIAL | 부분 완료 (보강 필요) |
| **NEW** | 신규 작성/구현 필요 |
| N/A | Phase 2 범위 외 |

---

## 1. 리서치 (Research) -- 기존 70건 대조

> 원칙: Phase 2 구현에 필요한 리서치가 존재하는지, 부족하면 어떤 조사가 필요한지.

### 1.1 리서치 충분 (추가 불필요) -- 52건

| 마일스톤 | 리서치 문서 | 상태 |
|:---------|:-----------|:-----|
| M2.1 월드 확장 | `Metroidvania_MapStructure_GateDesign.md` | OK |
| M2.1 | `Research_LevelDesign_Macro.md` | OK |
| M2.1 | `Research_LevelDesign_Micro.md` | OK |
| M2.1 | `Research_LevelDesign_Flow.md` | OK |
| M2.1 | `LevelDesign_ProgressionShape_Research.md` | OK |
| M2.1 | `BLAME_Biomega_WorldDesign_Research.md` | OK |
| M2.1 | `Research_Vertical_Movement_Relics.md` | OK |
| M2.1 | `Research_Vertical_Traversal_Gimmicks.md` | OK |
| M2.1 | `ProceduralGeneration_World_Research.md` | OK |
| M2.2 게이팅 | `Metroidvania_MapStructure_GateDesign.md` | OK |
| M2.2 | `DualStat_ATK_INT_Balance_Research.md` | OK |
| M2.2 | `Metroidvania_StatSystem_Comparison_Research.md` | OK |
| M2.3 보스 | `BossDesign_SideScrolling_Research.md` | OK |
| M2.3 | `EnemyDesign_MobArchetype_Research.md` | OK |
| M2.4 장비 | `WeaponDiversity_300Weapons_Research.md` | OK |
| M2.4 | `ItemTypes_FullSurvey_Research.md` | OK |
| M2.4 | `ItemDiversity_NonWeapon_FullSurvey_Research.md` | OK |
| M2.4 | `Equipment_DropRate_Economy_Research.md` | OK |
| M2.5 아이템계 | `Disgaea_ItemWorld_CoreMechanics.md` | OK |
| M2.5 | `Disgaea_ItemWorld_ProceduralGeneration.md` | OK |
| M2.5 | `Disgaea_ItemWorld_GrowthEconomy.md` | OK |
| M2.5 | `Disgaea_ItemWorld_UXPatterns.md` | OK |
| M2.5 | `Disgaea_ItemWorld_Research_Summary.md` | OK |
| M2.5 | `ItemWorld_DepthReward_RiskBalance_Research.md` | OK |
| M2.5 | `ItemWorld_EntryTransition_Research.md` | OK |
| M2.6 이노센트 | `Disgaea_ItemWorld_InnocentSystem.md` | OK |
| M2.6 | `Innocent_Combat_Behavior_Research.md` | OK |
| M2.6 | `Innocent_Growth_Economy_Research.md` | OK |
| M2.6 | `Innocent_Classification_Balance_Research.md` | OK |
| M2.6 | `Innocent_Narrative_Worldbuilding_Research.md` | OK |
| M2.6 | `InnocentBalance_BehavioralModifier_Research.md` | OK |
| M2.7 스킬 | `SkillSystem_ActionRPG_Research.md` | OK |
| M2.8 밸런스 | `EndgameLoop_Economy_Research.md` | OK |
| 전투 | `SideScrolling_Combat_System_Research.md` | OK |
| 전투 | `ElementalSystem_Comparison_Research.md` | OK |
| 전투 | `HealingSystem_Recovery_Research.md` | OK |
| 비주얼 | `ItemWorldVisual_MemoryTheme_Research.md` | OK |
| 비주얼 | `DeadCells_GrayscalePalette_Research.md` | OK |
| 비주얼 | `RoomComposition_ThemeLayerCount_Research.md` | OK |
| 비주얼 | `PixelArt_Animation_Principles_Research.md` | OK |
| 오디오 | `AudioDirection_SoundDesign_Research.md` | OK |
| 온보딩 | `SilentTutorial_EnvironmentalTeaching_Research.md` | OK |
| 온보딩 | `Zelda_Onboarding_Evolution_Research.md` | OK |
| 온보딩 | `ItemWorldEntry_NaturalOnboarding_Research.md` | OK |
| UI | `ReferenceGame_UI_UX_Research.md` | OK |
| UI | `Research_HUD_UI_ReferenceGames_Analysis.md` | OK |
| UI | `UX_Layout_Sizing_Research.md` | OK |
| UI | `Inventory_ItemInfo_UI_Research.md` | OK |
| UI | `Research_UI_Component_MasterList.md` | OK |
| UI | `Research_Dialogue_UI_Systems.md` | OK |
| 성능 | `WebGameFeel_Optimization_Research.md` | OK |
| 내러티브 | `ProceduralNarrative_ItemStory_Research.md` | OK |

### 1.2 리서치 부족 -- 신규 조사 필요 (8건)

| # | 주제 | 필요 이유 | 마일스톤 | 기존 리서치 |
|:--|:-----|:---------|:---------|:-----------|
| ~~R-01~~ | ~~접근성 (Accessibility)~~ | ~~색맹 모드, HUD 크기 조절, 키 리매핑, 아시스트 모드 설계 근거~~ | ~~M2.8~~ | **완료 (2026-04-21).** `Research_Accessibility.md` 전면 교체. 8종 게임 + 5종 표준 + P2 최소 12건/P3 확장 13건 |
| R-02 | **일시정지/메뉴 시스템** | 타이틀/일시정지/사망/설정 화면 레퍼런스 분석 | M2.8 | 없음. UI 전수조사(201개)에 목록만 존재 |
| R-03 | **캐릭터 스탯 화면 UX** | SotN/Disgaea/D4 스탯 시트 비교, 정보 배치 원칙 | M2.8 | 없음 |
| R-04 | **아이템계 귀환 결과 화면** | Disgaea/Hades/DC 런 종료 화면 비교, 보상 표시 UX | M2.5 | 없음 |
| R-05 | **NPC 상점 UI** | HK/SotN/BS/D4 상점 UI 레퍼런스, 구매 확인 패턴 | M2.4 | 없음. 세이브 포인트 상점 기능 UI 미정의 |
| R-06 | **적 바리에이션/스케일링** | 층위별 적 스탯 스케일링 + 바리에이션 기법(색상/크기/AI변형) | M2.1 | `EnemyDesign_MobArchetype_Research.md`는 아키타입만. 스케일링 미조사 |
| R-07 | **세이브 슬롯 UX** | 웹 게임 세이브 슬롯 UI, localStorage 한계, 데이터 마이그레이션 | M2.8 | `SaveSync_CoopSession_Research.md`는 코옵 세이브 전용 |
| R-08 | **패스트 트래블** | 메트로베니아 패스트 트래블 UX 비교, 세이브 포인트 간 이동 조건 | M2.1 | 없음 |

---

## 2. GDD (설계 문서) -- 기존 47건 대조

### 2.1 작성 완료 (보강 불필요) -- 31건

| 문서 | 상태 |
|:-----|:-----|
| System_3C_Character.md | OK |
| System_3C_Camera.md | OK |
| System_3C_Control.md | OK |
| System_Combat_Action.md | OK |
| System_Combat_HitFeedback.md | OK |
| System_World_ProcGen.md | OK |
| System_World_ZoneDesign.md | OK |
| System_World_Interactables.md | OK |
| System_World_TileSystem.md | OK |
| System_World_VerticalGimmicks.md | OK |
| System_ItemWorld_FloorGen.md | OK |
| System_ItemWorld_Events.md | OK |
| System_Economy_DropRate.md | OK |
| System_Healing_Recovery.md | OK |
| System_Pickup_Items.md | OK |
| System_Effects_Transitions.md | OK |
| System_Audio_Direction.md | OK |
| System_Analytics_Telemetry.md | OK |
| System_Analytics_Dashboard.md | OK |
| System_Save_DataSchema.md | OK |
| System_Coop_Synergy.md | OK (Phase 3 대기) |
| System_Performance_Budget.md | OK |
| System_ItemNarrative_Template.md | OK |
| System_ItemNarrative_EnvironmentPool.md | OK |
| System_ItemNarrative_MonsterPool.md | OK |
| Design_Architecture_2Space.md | OK |
| Design_CoreLoop_Circulation.md | OK |
| Design_Combat_Philosophy.md | OK |
| Design_Level_Standards.md | OK |
| Design_Tutorial_EnvironmentalTeaching.md | OK |
| Design_Difficulty_Progression.md | OK |

### 2.2 보강 필요 (PARTIAL) -- 10건

| # | 문서 | 보강 내용 | 마일스톤 |
|:--|:-----|:---------|:---------|
| G-01 | **System_Growth_Stats.md** | Lv 11-60 성장 곡선 추가 (현재 Lv 1-10만) | M2.8 |
| G-02 | **System_Growth_LevelExp.md** | Lv 11-60 경험치 요구량 테이블 추가 | M2.8 |
| G-03 | **System_Equipment_Slots.md** | 전체 8슬롯 UI 사양 추가 (Visor/Plate/Gauntlet/Greaves/Rig + Sigil/Seal) | M2.4 |
| G-04 | **System_Equipment_Rarity.md** | 레어리티 승급 규칙 상세화 | M2.5 |
| G-05 | **System_Equipment_Growth.md** | 아이템 Lv 0-99 전체 경험치 곡선, 보스 영구 보너스 상세 | M2.5 |
| G-06 | **System_Combat_Weapons.md** | Cleaver/Shiv/Harpoon/Chain/Railbow/Emitter 6종 상세 스펙 추가 (현재 Blade만) | M2.4 |
| G-07 | **System_Combat_Damage.md** | 원소 상성 배율, 크리티컬 공식, 방어력 감산 상세화 | M2.4 |
| G-08 | **System_Enemy_AI.md** | 적 10종+ 아키타입 AI 추가 (현재 Skeleton/Ghost 2종) | M2.1 |
| G-09 | **System_Player_Abilities.md** | 벽 타기/안개 변신/수중 호흡/역중력 상세 물리 파라미터 (현재 대시/이단점프만 상세) | M2.2 |
| G-10 | **Design_Art_Direction.md** | Tier별 팔레트 확정, 적/보스 디자인 가이드, UI 비주얼 톤 | M2.1 |

### 2.3 신규 작성 필요 -- 13건

| # | 문서 경로 | 내용 | 마일스톤 | 선행 리서치 |
|:--|:---------|:-----|:---------|:-----------|
| G-11 | **System/System_World_MapStructure_Detail.md** | 7개 층위 방 배치도, Critical Path 노드 그래프, 워프 포인트 위치 | M2.1 | OK (Macro/Micro/Flow 3건) |
| G-12 | **System/System_World_FastTravel.md** | 패스트 트래블 규칙, 세이브 포인트 해금 조건, UI | M2.1 | **R-08 선행 필요** |
| G-13 | **System/System_Combat_Elements.md** 보강 | Fire/Ice/Thunder 상태이상 지속/해제 규칙, 원소 상성 매트릭스 | M2.4 | OK (ElementalSystem_Comparison) |
| G-14 | **System/System_Combat_Skills.md** | 스킬 10종 정의 (무기 내장 스킬), 슬롯 4개, 쿨다운 시스템 | M2.7 | OK (SkillSystem_ActionRPG) |
| G-15 | **System/System_ItemWorld_Boss_Patterns.md** | 4등급 보스 구체적 패턴 풀 (6분류 x 25서브), 아레나 규격 | M2.3 | OK (BossDesign) |
| G-16 | **System/System_Enemy_Roster_Phase2.md** | 적 10종+ 상세 스펙 (HP/ATK/행동/드랍/층위 배치) | M2.1 | OK (MobArchetype) |
| G-17 | **System/System_World_BossRoster.md** | 월드 진행 보스 6종 + 숨겨진 보스 6종 상세 스펙 | M2.3 | OK (BossDesign) |
| G-18 | **UI/UI_PauseMenu.md** | 일시정지 메뉴 레이아웃 (계속/스탯/장비/렐릭/설정/종료) | M2.8 | **R-02 선행 필요** |
| G-19 | **UI/UI_StatSheet.md** | 캐릭터 스탯 시트 (ATK/INT/HP/DEF/RES + 장비 합산 표시) | M2.8 | **R-03 선행 필요** |
| G-20 | **UI/UI_EquipmentScreen.md** | 8슬롯 캐릭터 인형 + 장착/해제 UI | M2.4 | OK (Inventory_ItemInfo_UI) |
| G-21 | **UI/UI_ItemWorldResult.md** | 아이템계 귀환 결과 화면 (레벨업/이노센트/스탯 변화 요약) | M2.5 | **R-04 선행 필요** |
| G-22 | **UI/UI_Shop.md** | 세이브 포인트 상점 UI (구매/판매/확인 다이얼로그) | M2.4 | **R-05 선행 필요** |
| G-23 | **UI/UI_TitleScreen.md** | 타이틀 화면 + 메인 메뉴 + 세이브 슬롯 선택 | M2.8 | **R-02 선행 필요** |

---

## 3. CSV 데이터 시트 -- 기존 대조 + 신규

### 3.1 기존 CSV (보강 필요)

| # | 파일 | 보강 내용 |
|:--|:-----|:---------|
| C-01 | `Content_Stats_Character_Base.csv` | Lv 11-60 행 추가 |
| C-02 | `Content_Stats_Weapon_List.csv` | 6종 무기 추가 (현재 Blade 5레어리티만) |
| C-03 | `Content_Rarity.csv` | 승급 규칙 열 추가 |

### 3.2 신규 CSV 필요

| # | 파일 | 내용 | 마일스톤 |
|:--|:-----|:-----|:---------|
| C-04 | **Content_System_Innocent_Pool.csv** | 12종 이노센트 타입/레벨/스탯/드랍 가중치 | M2.6 |
| C-05 | **Content_System_Monster_Roster.csv** | 적 10종+ 스탯/AI/드랍/층위 배치 | M2.1 |
| C-06 | **Content_Level_Zone_Config.csv** | 7개 층위 설정 (난이도/팔레트/적 풀/게이트) | M2.1 |
| C-07 | **Content_System_Skill_List.csv** | 스킬 10종 (이름/쿨다운/데미지/무기 제한) | M2.7 |
| C-08 | **Content_System_IW_BossTable.csv** | 아이템계 보스 4등급 스탯/패턴/보상 | M2.3 |
| C-09 | **Content_System_LevelExp_Curve.csv** | Lv 1-60 경험치 요구량 테이블 | M2.8 |
| C-10 | **Content_System_ItemExp_Curve.csv** | 아이템 Lv 0-99 경험치 요구량 | M2.5 |
| C-11 | **Content_System_StatGate_Thresholds.csv** | 스탯 게이트별 ATK/INT 임계값 + 위치 | M2.2 |
| C-12 | **Content_System_Shop_Inventory.csv** | 상점 판매 아이템 목록/가격/해금 조건 | M2.4 |
| C-13 | **Content_World_Boss_Roster.csv** | 월드 보스 12종 스탯/패턴/보상/층위 | M2.3 |

---

## 4. 코드 구현 -- 마일스톤별 88건

### M2.1 월드 확장 (11건)

| # | 작업 | 상세 | 선행 |
|:--|:-----|:-----|:-----|
| I-01 | 7개 층위 LDtk 맵 | T1-T7 핸드크래프트 레이아웃 | G-11, C-06 |
| I-02 | 층위 간 연결 포탈 | 수직 이동 + 씬 전환 | I-01 |
| I-03 | 층위별 Chunk 풀 확장 | 층위당 20+ Chunk 템플릿 (현재 10개) | I-01 |
| I-04 | 층위별 팔레트 스왑 | 바이옴 색상 자동 적용 | G-10 |
| I-05 | 적 10종+ AI | 아키타입별 FSM 구현 | G-16, C-05 |
| I-06 | 적 스케일링 시스템 | 층위별 스탯 자동 보정 | C-06, R-06 |
| I-07 | 패스트 트래블 | 세이브 포인트 간 워프 | G-12, R-08 |
| I-08 | 구역명 배너 | 층위 진입 시 이름 + 부제 표시 | I-01 |
| I-09 | 환경 기믹 | 엘리베이터/발사대/바람 기류 등 | OK (Vertical_Gimmicks) |
| I-10 | 미니맵 구현 | `UI_Minimap.md` 설계 기반 (128x72, Fog of War) | OK (설계 완료) |
| I-11 | 자동 맵 마커 | 세이브/보스/게이트 7종 아이콘 | I-10 |

### M2.2 게이팅 시스템 (8건)

| # | 작업 | 상세 | 선행 |
|:--|:-----|:-----|:-----|
| I-12 | 이단 점프 렐릭 | 5-6.5타일 수직 상승 | G-09 |
| I-13 | 벽 타기 렐릭 | 순수 벽면 상승 물리 | G-09 |
| I-14 | 안개 변신 렐릭 | 1타일 높이 틈새 통과 | G-09 |
| I-15 | 수중 호흡 렐릭 | 산소 게이지 무제한 | G-09, UI 산소 게이지 |
| I-16 | 역중력 렐릭 | 천장 경로 이동 | G-09 |
| I-17 | ATK 스탯 게이트 | 물리 장벽 파괴 판정 | C-11 |
| I-18 | INT 스탯 게이트 | 마법 봉인 해제 판정 | C-11 |
| I-19 | 게이트 UI 피드백 | "ATK 120 필요" 표시 + 부족/충족 색상 | I-17, I-18 |

### M2.3 보스 시스템 (8건)

| # | 작업 | 상세 | 선행 |
|:--|:-----|:-----|:-----|
| I-20 | 월드 보스 AI 프레임워크 | 페이즈 기반 FSM + 패턴 선택 BT | G-15 |
| I-21 | 월드 진행 보스 3종 | T3/T4/T5 보스 (렐릭 드랍) | G-17, C-13 |
| I-22 | 아이템계 보스 장군 | 지층 2 끝 보스 구현 | G-15, C-08 |
| I-23 | 아이템계 보스 왕 | 지층 3 끝 보스 구현 | I-22 |
| I-24 | 아이템계 보스 신 | 지층 4 끝 보스 구현 | I-23 |
| I-25 | 보스 텔레그래프 시스템 | 다중 감각 예고 (시각/오디오/공간) | G-15 |
| I-26 | 보스 HP 바 구현 | `UI_HUD_MasterPlan.md` 200x6 하단 중앙 + 등급 표시 | OK (설계 완료) |
| I-27 | 보스 아레나 규격 | 4x2 Room 고정 아레나 | G-15 |

### M2.4 장비 확장 (10건)

| # | 작업 | 상세 | 선행 |
|:--|:-----|:-----|:-----|
| I-28 | Cleaver 무기 구현 | 느리지만 강한 타격, 시그니처 메커닉 | G-06, C-02 |
| I-29 | Shiv 무기 구현 | 빠른 연타, 출혈 시그니처 | G-06 |
| I-30 | Harpoon 무기 구현 | 중거리 찌르기, 당기기 시그니처 | G-06 |
| I-31 | Chain 무기 구현 | 범위 공격, 채찍 궤도 | G-06 |
| I-32 | Railbow 무기 구현 | 원거리 INT 스케일링 | G-06 |
| I-33 | Emitter 무기 구현 | 빔 INT 스케일링 | G-06 |
| I-34 | 방어구 슬롯 5종 | Visor/Plate/Gauntlet/Greaves/Rig 장착 시스템 | G-03 |
| I-35 | 장신구 슬롯 3종 | Sigil x2 + Seal x1 | G-03 |
| I-36 | 상점 시스템 | 세이브 포인트 구매/판매 | G-22, C-12, R-05 |
| I-37 | 원소 시스템 구현 | Fire/Ice/Thunder 3원소 + 상태이상 + 상성 | G-13 |

### M2.5 아이템계 전체 지층 (10건)

| # | 작업 | 상세 | 선행 |
|:--|:-----|:-----|:-----|
| I-38 | 레어리티별 전체 지층 | Normal(2) ~ Ancient(4+심연) | G-04, C-10 |
| I-39 | 심연 (Abyss) | Ancient 전용 무한 심층 + 닻 시스템 | I-38 |
| I-40 | 지층별 난이도 스케일링 | 지수 HP + 구간별 데미지 보정 | G-05 |
| I-41 | 미스터리 룸 | 기억의 상인, 점술사, 도전 방 | OK (System_ItemWorld_Events.md) |
| I-42 | 고급 지형 타일 | 얼음/가시/부서지는 바닥/거미줄/상승 기류/어둠 | OK (System_ItemWorld_FloorGen.md) |
| I-43 | 아이템 레벨 전체 곡선 | Lv 0-99 경험치 수급 | G-05, C-10 |
| I-44 | 레어리티 승급 | 아이템계 전 지층 클리어 보상 | G-04 |
| I-45 | 귀환 결과 화면 | 아이템계 종료 후 레벨업/이노센트/스탯 요약 | G-21, R-04 |
| I-46 | 다이브 프리뷰 구현 | T5 풀 프리뷰 패널 (지층/적/보상) | OK (UI_SacredPickup.md) |
| I-47 | Lore Popup 구현 | Sacred Pickup S3 아이템 최초 획득 모달 | OK (UI_SacredPickup.md) |

### M2.6 이노센트 기초 (9건)

| # | 작업 | 상세 | 선행 |
|:--|:-----|:-----|:-----|
| I-48 | Wild/Tamed 상태 관리 | 이분법 상태 전환 로직 | OK (System_Innocent_Core.md) |
| I-49 | 이노센트 12종 데이터 | 4분류(스탯/파밍/상태이상/행동) 12종 정의 | C-04 |
| I-50 | 이노센트 아이템계 조우 | Wild 이노센트 스폰 + 전투 AI | I-48 |
| I-51 | 이노센트 복종 전투 | 도주 속도 70-80%, 복종 완료 이펙트 | I-50 |
| I-52 | 이노센트 합성 | 동종 이노센트 2개 합산 | I-49 |
| I-53 | 이노센트 UI (인벤토리 Level 3) | Detail View Innocent 리스트 | OK (UI_Inventory.md) |
| I-54 | 이노센트 발견/복종 알림 | 토스트 + 특수 아이콘 | I-50 |
| I-55 | 이노센트 슬롯 표시 | 인벤토리 Level 1 좌하단 점 | OK (UI_Inventory.md) |
| I-56 | 세이브 데이터 확장 | Item { innocents: [] } 스키마 마이그레이션 | I-48 |

### M2.7 스킬 시스템 (6건)

| # | 작업 | 상세 | 선행 |
|:--|:-----|:-----|:-----|
| I-57 | 스킬 데이터 구조 | 스킬 10종 정의 (쿨다운/데미지/범위) | G-14, C-07 |
| I-58 | 스킬 슬롯 4개 | 장착/해제 + 무기 제한 | I-57 |
| I-59 | 스킬 실행 엔진 | 입력 → 쿨다운 체크 → 히트박스 생성 → 이펙트 | I-57 |
| I-60 | 스킬 쿨다운 HUD | 4슬롯 아이콘 + 원형 쿨다운 게이지 | I-58 |
| I-61 | 스킬 배정 UI | 일시정지 메뉴 내 스킬 슬롯 배정 화면 | G-18, I-58 |
| I-62 | 무기별 고유 스킬 | 7종 무기 시그니처 메커닉 연동 | I-57, G-06 |

### M2.8 밸런스 & UI & QA (16건)

| # | 작업 | 상세 | 선행 |
|:--|:-----|:-----|:-----|
| I-63 | **일시정지 메뉴** | ESC → 계속/스탯/장비/렐릭/설정/종료 | G-18, R-02 |
| I-64 | **사망 화면** | 사망 후 세이브 포인트 복귀 확인 | G-18 |
| I-65 | **타이틀 화면** | 게임 로고 + Press Start + 배경 | G-23 |
| I-66 | **메인 메뉴** | 새 게임/계속/설정 | G-23 |
| I-67 | **세이브 슬롯 선택** | 복수 슬롯 + 파일 정보 표시 | R-07 |
| I-68 | **설정 - 오디오** | BGM/SFX 볼륨 슬라이더 | -- |
| I-69 | **설정 - 키 리매핑** | 각 액션별 키 재배정 | -- |
| I-70 | **캐릭터 스탯 시트** | ATK/INT/HP + DEF/RES 상세 + 장비 합산 | G-19, R-03 |
| I-71 | **장비 슬롯 화면** | 8슬롯 캐릭터 인형 + 착용/해제 | G-20 |
| I-72 | **렐릭/능력 목록** | 획득한 6종 렐릭 ON/OFF 관리 | -- |
| I-73 | **인벤토리 Level 2 Info Box** | 우측 확장 정보 패널 | OK (UI_Inventory.md) |
| I-74 | **인벤토리 Compare Mode** | C키 장착 vs 선택 비교 | OK (UI_Inventory.md) |
| I-75 | **킬 보상 팝업** | EXP/골드 획득 표시 | -- |
| I-76 | **플레이어 경험치 바** | HUD 또는 일시정지 메뉴 내 표시 | C-09 |
| I-77 | **자동 저장 표시** | 저장 중 아이콘 | -- |
| I-78 | **P2 텔레메트리** | TEL-15~17, 20, 22-30 이벤트 구현 | OK (System_Analytics_Telemetry.md) |

### M2.8+ 접근성 (6건)

| # | 작업 | 상세 | 선행 |
|:--|:-----|:-----|:-----|
| I-79 | 색맹 모드 | 3종 필터 (Deuteranopia/Protanopia/Tritanopia) | R-01 |
| I-80 | HUD 크기 조절 | 50%-150% 스케일 슬라이더 | R-01 |
| I-81 | 화면 흔들림 감소 | Screen Shake 축소/OFF 옵션 | R-01 |
| I-82 | 게임패드 지원 | 컨트롤러 입력 + 버튼 아이콘 전환 | OK (설계 존재) |
| I-83 | 아이콘 + 색상 병행 | 레어리티 색상 + 형태 아이콘 동시 사용 | R-01 |
| I-84 | HUD 토글 | HUD 전체 표시/숨기기 | -- |

---

## 5. 아트/오디오 에셋

### 5.1 스프라이트/타일셋

| # | 에셋 | 상세 | 마일스톤 |
|:--|:-----|:-----|:---------|
| A-01 | 층위별 타일셋 7종 | T1-T7 바이옴 타일 (16px) | M2.1 |
| A-02 | 적 스프라이트 10종+ | 아키타입별 idle/walk/attack/hit/death | M2.1 |
| A-03 | 월드 보스 스프라이트 3종 | T3/T4/T5 진행 보스 | M2.3 |
| A-04 | 아이템계 보스 스프라이트 3등급 | 장군/왕/신 | M2.3 |
| A-05 | 무기 스프라이트 6종 | Cleaver/Shiv/Harpoon/Chain/Railbow/Emitter | M2.4 |
| A-06 | 무기 아이콘 6종 | 인벤토리 그리드용 16x16 | M2.4 |
| A-07 | 방어구/장신구 아이콘 8종 | 슬롯별 아이콘 | M2.4 |
| A-08 | 이노센트 스프라이트 12종 | Wild/Tamed 각각 | M2.6 |
| A-09 | 렐릭 아이콘 6종 | 대시/이단점프/벽타기/안개/수중/역중력 | M2.2 |
| A-10 | 스킬 이펙트 10종 | 스킬별 VFX | M2.7 |
| A-11 | 원소 이펙트 3종 | Fire/Ice/Thunder 히트/상태이상 | M2.4 |
| A-12 | 상점 NPC 스프라이트 | 세이브 포인트 상점 NPC | M2.4 |
| A-13 | UI 아이콘 세트 | 상태이상/버프/게이트/맵 마커 등 | M2.8 |

### 5.2 사운드/음악

| # | 에셋 | 상세 | 마일스톤 |
|:--|:-----|:-----|:---------|
| S-01 | 층위별 BGM 7종 | T1-T7 바이옴 테마 음악 | M2.1 |
| S-02 | 보스전 BGM 2종 | 월드 보스 / 아이템계 보스 | M2.3 |
| S-03 | 무기 SFX 6종 | 무기별 타격/스윙 사운드 | M2.4 |
| S-04 | 스킬 SFX 10종 | 스킬별 발동/히트 사운드 | M2.7 |
| S-05 | 원소 SFX 3종 | Fire/Ice/Thunder 히트/상태이상 | M2.4 |
| S-06 | 이노센트 SFX | 조우/복종/합성 사운드 | M2.6 |
| S-07 | UI SFX 세트 | 메뉴 선택/확인/취소/장착/해제 | M2.8 |

---

## 6. 종합 통계

| 카테고리 | 기존 (OK) | 보강 필요 | 신규 필요 | 합계 |
|:---------|:---------:|:---------:|:---------:|:----:|
| **리서치** | 52 | 1 | 8 | 61 |
| **GDD** | 31 | 10 | 13 | 54 |
| **CSV** | 3 | -- | 10 | 13 |
| **코드 구현** | -- | -- | 84 | 84 |
| **아트 에셋** | -- | -- | 13 | 13 |
| **사운드 에셋** | -- | -- | 7 | 7 |
| **총계** | **86** | **11** | **135** | **232** |

---

## 7. 의존성 체인 (구현 순서)

```
[Phase 2 구현 순서]

Week 1-2: 기반
├── R-01~08 리서치 8건 (병렬 수행)
├── G-01~10 GDD 보강 10건
└── C-01~03 CSV 보강 3건

Week 3-4: 월드 + 게이팅
├── G-11 층위 배치도 → I-01 LDtk 맵
├── G-16 적 로스터 → I-05 적 AI → I-06 스케일링
├── G-09 렐릭 상세 → I-12~16 렐릭 5종
└── C-11 게이트 임계값 → I-17~19 게이트

Week 5-6: 보스 + 장비
├── G-15 보스 패턴 → I-20~27 보스 시스템
├── G-06 무기 상세 → I-28~33 무기 6종
└── G-13 원소 상세 → I-37 원소 시스템

Week 7-8: 아이템계 + 이노센트
├── I-38~44 아이템계 전체 지층
├── C-04 이노센트 풀 → I-48~56 이노센트 기초
└── G-21 귀환 결과 → I-45 결과 화면

Week 9-10: 스킬 + UI
├── G-14 스킬 정의 → I-57~62 스킬 시스템
├── G-18 일시정지 메뉴 → I-63~66 메뉴 시스템
└── G-19~23 UI GDD → I-67~77 UI 구현

Week 11-12: 밸런스 + QA
├── I-78 텔레메트리
├── I-79~84 접근성
└── 플레이테스트 N=5-10
```

---

## 8. 즉시 착수 항목 (Next Actions)

### 1순위: 리서치 (병렬 수행 가능)
1. **R-01** 접근성 전수 조사
2. **R-02** 일시정지/메뉴 시스템 레퍼런스 분석
3. **R-04** 아이템계 귀환 결과 화면 레퍼런스

### 2순위: GDD 보강
4. **G-01** System_Growth_Stats.md Lv 11-60 확장
5. **G-06** System_Combat_Weapons.md 6종 무기 추가
6. **G-09** System_Player_Abilities.md 렐릭 4종 상세

### 3순위: GDD 신규
7. **G-11** 층위 배치도 (M2.1 착수 전 필수)
8. **G-14** 스킬 시스템 (M2.7 착수 전 필수)
9. **G-18** 일시정지 메뉴 (P0 UI 공백 해소)
