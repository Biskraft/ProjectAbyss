# 전체 디자인 문서 마스터 인덱스 (Document Master Index)

> 작성일: 2026-03-23
> 프로젝트: Project Abyss (메트로베니아 x 아이템계 온라인 액션 RPG)
> 상태: 기존 = 작성 완료, 신규 = 작성 필요

---

## 폴더 구조

```
Documents/
├── Terms/              # 메타 문서 (규칙, 용어, 비전)
├── System/             # 핵심 시스템 GDD (SYS_*)
│   ├── Core/           # 핵심 메커닉 (전투, 이동, 카메라)
│   ├── ItemWorld/      # 아이템계 관련
│   ├── Progression/    # 성장/스탯/장비
│   ├── World/          # 월드/존/맵
│   ├── Multiplayer/    # 온라인/파티/자동사냥
│   └── Economy/        # 경제/자원/거래
├── Design/             # 설계 원칙 (DSG_*)
├── Content/            # 콘텐츠 목록 (CNT_*)
├── UI/                 # UI/HUD 명세 (UI_*)
├── Balance/            # 밸런스/수식 (BAL_*)
├── Tech/               # 기술 아키텍처 (TECH_*)
└── LiveOps/            # 라이브 서비스/시즌 (LIVE_*)

Sheets/                 # CSV 데이터 시트
Reference/              # 레퍼런스 (분석서, 위키, GDC 인사이트)
```

---

## 1. Terms/ - 메타 문서

| # | 파일명 | 설명 | 상태 |
| :--- | :--- | :--- | :--- |
| T-01 | Project_Vision.md | 프로젝트 비전, 3대 기둥, 톤 & 매너, 핵심 판타지 | 신규 |
| T-02 | GDD_Writing_Rules.md | GDD 작성 표준 (5단계 구조, 마크다운 규칙) | 신규 (스킬 writing-rules 기반) |
| T-03 | Glossary.md | 공식 용어 사전 (폐기 용어 포함) | 신규 |
| T-04 | Document_Index.md | 전체 GDD 문서 목록 및 상태 추적 | 이 문서 |
| T-05 | Sheets_Writing_Rules.md | CSV 시트 작성 규칙 (ID-First, 줄임말) | 신규 |
| T-06 | Sheets_Data_Dependency_Map.md | CSV 데이터 의존성 맵 | 신규 |

---

## 2. System/Core/ - 핵심 메커닉

> 참조: 캐슬바니아 (전투/이동), GDC 전투 & 액션 인사이트

| # | 파일명 | 설명 | 위키 참조 | 상태 |
| :--- | :--- | :--- | :--- | :--- |
| SC-01 | SYS_Combat_Base.md | 기본 전투 시스템 (공격, 히트박스, 히트리액션, 무적프레임) | CV: Alucard, Sub-Weapons | 신규 |
| SC-02 | SYS_Combat_Damage.md | 데미지 계산 공식 (ATK, DEF, 원소, 크리티컬) | DG: Statistics, Critical Hit, Elemental Affinity | 신규 |
| SC-03 | SYS_Combat_Skill.md | 액티브 스킬 시스템 (스킬 슬롯, 쿨다운, 스킬 레벨) | DG: Spell, Skill Level, Special Technique | 신규 |
| SC-04 | SYS_Combat_StatusEffect.md | 상태이상 시스템 (독, 동결, 석화, 저주 등) | DG: Status Ailment / CV: 상태이상 | 신규 |
| SC-05 | SYS_Combat_Boss.md | 보스 전투 설계 원칙 (패턴, 페이즈, 보상) | CV: Dracula, Death / DG: Item Bosses | 신규 |
| SC-06 | SYS_Combat_Enemy_AI.md | 적 AI 시스템 (Token 기반, 행동 패턴, 어그로) | GDC: Token AI, Authored vs Systemic | 신규 |
| SC-07 | SYS_Movement.md | 캐릭터 이동 (걷기, 달리기, 점프, 대시, 낙하) | CV: Alucard 이동 | 신규 |
| SC-08 | SYS_Movement_Ability.md | 특수 이동 능력 (이단점프, 벽타기, 안개변신, 수중호흡, 역중력) | CV: Ability Soul, Relics | 신규 |
| SC-09 | SYS_Camera.md | 횡스크롤 카메라 시스템 (Camera Window, Cue Focus, Region) | GDC: How Cameras in Side-Scrollers Work | 신규 |

---

## 3. System/ItemWorld/ - 아이템계

> 참조: 디스가이아 Item World, Innocent, Mystery Gate, Pirates

| # | 파일명 | 설명 | 위키 참조 | 상태 |
| :--- | :--- | :--- | :--- | :--- |
| SI-01 | SYS_ItemWorld_Core.md | 아이템계 핵심 구조 (100층, 시드, 진입/탈출) | DG: Item World, Mr. Gency's Exit | 신규 |
| SI-02 | SYS_ItemWorld_FloorGen.md | 층 생성 파이프라인 (시드 결정, 레이아웃, 지형, 오브젝트, 이벤트) | DG: Item World / Spelunky ReverseGDD | 신규 |
| SI-03 | SYS_ItemWorld_Boss.md | 아이템계 보스 (장군/왕/신/대신, 패턴, 보상) | DG: Item Bosses | 신규 |
| SI-04 | SYS_ItemWorld_Event.md | 특수 이벤트 (미스터리 게이트, 이노센트 타운, 해적 조우) | DG: Mystery Gate, Innocent Town, Pirates | 신규 |
| SI-05 | SYS_ItemWorld_Recursive.md | 재귀적 진입 (최대 깊이 3, 깊이 보너스, 제한) | DG: Item World (D3) | 신규 |
| SI-06 | SYS_ItemWorld_GeoEffect.md | 지오 이펙트 패널 (필드 변형, 보너스/패널티) | DG: Geo Effects, Living Geo Symbol | 신규 |
| SI-07 | SYS_Innocent_Core.md | 이노센트 핵심 (Wild/Tamed, 종류, 레벨, 효과) | DG: Specialist, List of Innocents (D1~D6) | 신규 |
| SI-08 | SYS_Innocent_Farm.md | 이노센트 팜 (합성, 번식, 듀얼, 이동) | DG: Specialist 합성 | 신규 |
| SI-09 | SYS_Innocent_Capture.md | 이노센트 포획 메카닉 (아이템계 내 Wild 이노센트 전투) | DG: Capturing | 신규 |

---

## 4. System/Progression/ - 성장/스탯/장비

> 참조: 디스가이아 Statistics, Rarity, Weapon Mastery, Reincarnation

| # | 파일명 | 설명 | 위키 참조 | 상태 |
| :--- | :--- | :--- | :--- | :--- |
| SP-01 | SYS_Stat_Core.md | 6대 스탯 시스템 (STR, INT, DEX, VIT, SPD, LCK) | DG: Statistics, Attack, Defense, Speed 등 | 신규 |
| SP-02 | SYS_Stat_Growth.md | 레벨업/성장곡선 (EXP 공식, Soft/Hard Cap, Diminishing) | DG: Level, Experience, Level grinding | 신규 |
| SP-03 | SYS_Equipment_Core.md | 장비 시스템 (무기, 방어구, 악세서리, 슬롯) | DG: Weapon, Items, Accessories | 신규 |
| SP-04 | SYS_Equipment_Rarity.md | 레어리티 시스템 (Common~Mythic, 스탯 배율, 이노센트 슬롯) | DG: Rarity, Rank | 신규 |
| SP-05 | SYS_Equipment_Enhancement.md | 장비 강화 (아이템계 클리어, 이노센트, 합성) | DG: Item World 보상, Item Assembly | 신규 |
| SP-06 | SYS_Weapon_Type.md | 무기 종류별 특성 (검, 창, 도끼, 활, 지팡이, 권갑 등) | DG: Sword, Spear, Axe, Bow, Gun, Fist, Staff | 신규 |
| SP-07 | SYS_Weapon_Mastery.md | 무기 숙련도 (사용 시 숙련, 히든 스킬 해금) | DG: Weapon Mastery, Armsmaster | 신규 |
| SP-08 | SYS_Class_Core.md | 클래스/직업 시스템 (역할, 해금 조건, 스탯 적성) | DG: Class, Aptitude | 신규 |
| SP-09 | SYS_Class_Skill.md | 클래스별 스킬 트리 (액티브/패시브) | DG: Evility, Combo Skill | 신규 |
| SP-10 | SYS_Reincarnation.md | 전생 시스템 (리셋 성장, 보너스, 전생 횟수) | DG: Reincarnation, Super Reincarnation | 신규 |

---

## 5. System/World/ - 월드/존/맵

> 참조: 캐슬바니아 SotN 맵 구조, GDC 탐험 & 레벨 디자인 인사이트

| # | 파일명 | 설명 | 위키 참조 | 상태 |
| :--- | :--- | :--- | :--- | :--- |
| SW-01 | SYS_World_Structure.md | 월드 전체 구조 (허브&스포크, 구역 연결, 지름길) | CV: Castle Map, Zone connections | 신규 |
| SW-02 | SYS_World_Gate.md | 게이트 시스템 통합 (스탯 게이트 + 능력 게이트 + 진행도 게이트) | CV: Ability Soul / DG: Statistics | 신규 |
| SW-03 | SYS_World_MapGen.md | 맵 생성 (매크로 핸드크래프트 + 마이크로 절차적, Room Template) | Spelunky ReverseGDD | 신규 |
| SW-04 | SYS_World_Save.md | 세이브/워프/체크포인트 시스템 | CV: Save Room, Warp Room | 신규 |
| SW-05 | SYS_World_Secret.md | 비밀/숨겨진 구역 (발견 조건, 보상, 재방문 가치) | CV: Hidden areas | 신규 |
| SW-06 | WLD_Zone_Hub.md | 중앙 성채 (허브) 존 설계 | CV: Marble Gallery (중앙부) | 신규 |
| SW-07 | WLD_Zone_Graveyard.md | 묘지/카타콤 존 설계 | CV: Underground Caverns | 신규 |
| SW-08 | WLD_Zone_Laboratory.md | 마법 연구소 존 설계 | CV: Alchemy Laboratory | 신규 |
| SW-09 | WLD_Zone_IceCave.md | 빙결 동굴 존 설계 | CV: Underground Caverns (ice) | 신규 |
| SW-10 | WLD_Zone_Tower.md | 천공의 탑 존 설계 | CV: Clock Tower | 신규 |
| SW-11 | WLD_Zone_Abyss.md | 심연의 구 존 설계 (최종 구역) | CV: Castle Keep | 신규 |
| SW-12 | WLD_Zone_Inverted.md | 반전 구역 (역중력 해금 후) | CV: Inverted Castle | 신규 |

---

## 6. System/Multiplayer/ - 온라인/파티/자동사냥

> 참조: GDC 멀티플레이 & 네트워크 인사이트

| # | 파일명 | 설명 | 위키 참조 | 상태 |
| :--- | :--- | :--- | :--- | :--- |
| SM-01 | SYS_Network_Architecture.md | 네트워크 아키텍처 (WebSocket, 서버 권한, 클라이언트 예측) | GDC: Rollback, Division 2 | 신규 |
| SM-02 | SYS_Party_Core.md | 파티 시스템 (초대, 합류, 공간별 인원 제한) | DG: Team Attack, Support | 신규 |
| SM-03 | SYS_Party_Scaling.md | 파티 난이도 스케일링 (HP/ATK/보상 배율) | GDC: Balance, Scaling | 신규 |
| SM-04 | SYS_Matchmaking.md | 매치메이킹 (레벨, 존, 목적별) | GDC: Matchmaking for Engagement | 신규 |
| SM-05 | SYS_AutoHunt_Core.md | 자동사냥 3-Tier (사냥터/아이템계순찰/오프라인원정) | DG: Auto Battle (D6) | 신규 |
| SM-06 | SYS_AutoHunt_Efficiency.md | 자동사냥 효율 제한 (직접 플레이 대비 60~70%) | GDC: Idle Games | 신규 |
| SM-07 | SYS_Hub_Social.md | 허브 소셜 기능 (채팅, 이모트, 거래) | GDC: Ultima Online, Social | 신규 |
| SM-08 | SYS_Disconnect.md | 접속 해제/재접속 처리 (파티 중, 보스전 중) | GDC: Networking | 신규 |
| SM-09 | SYS_AntiCheat.md | 치트 방지 (서버 검증, 시드 검증, 행동 감지) | GDC: Spelunky 2 Deterministic | 신규 |

---

## 7. System/Economy/ - 경제/자원/거래

> 참조: 디스가이아 경제, GDC 밸런스 & 경제 인사이트

| # | 파일명 | 설명 | 위키 참조 | 상태 |
| :--- | :--- | :--- | :--- | :--- |
| SE-01 | SYS_Economy_Core.md | 경제 순환 구조 (Faucet/Sink, 자원 흐름도) | GDC: Albion Online Economy | 신규 |
| SE-02 | SYS_Economy_Currency.md | 재화 시스템 (골드, 마나, 프리미엄 재화) | DG: Mana, HL (Hell) | 신규 |
| SE-03 | SYS_Economy_Shop.md | 상점 시스템 (NPC 상점, 가격 결정) | DG: Rosen Queen, Hospital, Cheat Shop | 신규 |
| SE-05 | SYS_Economy_Resource.md | 자원 종류 (월드 소재, 아이템계 소재, 허브 전용) | - | 신규 |
| SE-06 | SYS_Economy_Craft.md | 제작 시스템 (장비 제작, 소모품 제작) | DG: Item Assembly / GDC: Astroneer Crafting | 신규 |

---

## 8. Design/ - 설계 원칙

| # | 파일명 | 설명 | 상태 |
| :--- | :--- | :--- | :--- |
| D-01 | DSG_Circulation.md | 3-Space 순환 구조 원칙 (World ↔ Item World ↔ Hub) | 신규 |
| D-02 | DSG_Difficulty_Curve.md | 난이도 곡선 설계 (존별, 아이템계 층별, 솔로/파티) | 신규 |
| D-03 | DSG_Onboarding.md | 신규 유저 온보딩 (튜토리얼, 단계적 시스템 해금) | 신규 |
| D-04 | DSG_Retention_Loop.md | 리텐션 루프 설계 (일일/주간/시즌 목표) | 신규 |
| D-05 | DSG_Risk_Reward.md | 위험과 보상 설계 원칙 (깊은 층 = 높은 보상) | 신규 |
| D-06 | DSG_Player_Motivation.md | 플레이어 동기 분류 (탐험가/장인/모험가 페르소나) | 신규 |

---

## 9. Content/ - 콘텐츠 목록

> 참조: 디스가이아 무기/클래스/이노센트 목록, 캐슬바니아 적/장비 목록

| # | 파일명 | 설명 | 위키 참조 | 상태 |
| :--- | :--- | :--- | :--- | :--- |
| C-01 | CNT_Monster_List.md | 몬스터 도감 (일반, 엘리트, 보스) | CV: Enemy Data / DG: Monster Classes | 신규 |
| C-02 | CNT_Monster_Boss.md | 보스 상세 (패턴, 페이즈, 드롭 테이블) | CV: Dracula, Death / DG: Item Bosses | 신규 |
| C-03 | CNT_Weapon_List.md | 무기 목록 (종류별, 등급별) | DG: List of Weapons (D1~D6) | 신규 |
| C-04 | CNT_Armor_List.md | 방어구 목록 | DG: List of Armor / CV: Alucard Mail | 신규 |
| C-05 | CNT_Accessory_List.md | 악세서리 목록 | DG: List of Accessories (D2~D5) | 신규 |
| C-06 | CNT_Innocent_List.md | 이노센트 전체 도감 | DG: List of Innocents (D1~D6) | 신규 |
| C-07 | CNT_Skill_List.md | 스킬 전체 목록 (클래스별, 무기별) | DG: List of Skills/Spells | 신규 |
| C-08 | CNT_Evility_List.md | 패시브(에빌리티) 전체 목록 | DG: List of Evilities (D3~D6) | 신규 |
| C-09 | CNT_Class_List.md | 클래스/직업 전체 목록 | DG: List of All Classes | 신규 |
| C-10 | CNT_Consumable_List.md | 소모품 목록 (포션, 탈출, 버프) | DG: Items / CV: Items | 신규 |
| C-11 | CNT_RoomTemplate_List.md | 룸 템플릿 목록 (월드용, 아이템계용) | Spelunky ReverseGDD | 신규 |
| C-12 | CNT_GeoEffect_List.md | 지오 이펙트 종류 목록 | DG: Geo Effects | 신규 |
| C-13 | CNT_Quest_List.md | 퀘스트 목록 (메인, 서브, 일일, 주간) | DG: Quest Shop | 신규 |
| C-14 | CNT_Achievement_List.md | 업적/도전과제 목록 | - | 신규 |
| C-15 | CNT_NPC_List.md | NPC 목록 (상점, 퀘스트, 허브) | DG: Rosen Queen, Hospital | 신규 |

---

## 10. UI/ - UI/HUD 명세

| # | 파일명 | 설명 | 상태 |
| :--- | :--- | :--- | :--- |
| U-01 | UI_HUD_InGame.md | 인게임 HUD (HP, MP, 미니맵, 스킬바, 버프) | 신규 |
| U-02 | UI_Inventory.md | 인벤토리 화면 (장비, 소모품, 이노센트) | 신규 |
| U-03 | UI_Equipment.md | 장비 장착/비교 화면 | 신규 |
| U-04 | UI_ItemWorld_Entry.md | 아이템계 진입 화면 (아이템 선택, 파티 구성) | 신규 |
| U-05 | UI_Map.md | 월드 맵 화면 (탐험율, 게이트 표시, 워프) | 신규 |
| U-06 | UI_InnocentFarm.md | 이노센트 팜 화면 (합성, 번식, 이동) | 신규 |
| U-07 | UI_Shop.md | 상점 화면 | 신규 |
| U-08 | UI_Party.md | 파티 화면 (초대, 상태, 킥) | 신규 |
| U-09 | UI_AutoHunt.md | 자동사냥 설정 화면 | 신규 |
| U-10 | UI_ClassSkill.md | 클래스/스킬트리 화면 | 신규 |
| U-11 | UI_Result.md | 결과 화면 (전투 종료, 아이템계 클리어) | 신규 |

---

## 11. Balance/ - 밸런스/수식

> 참조: GDC 밸런스 & 경제 인사이트, balance-formulas.md

| # | 파일명 | 설명 | 상태 |
| :--- | :--- | :--- | :--- |
| B-01 | BAL_Damage_Formula.md | 데미지 공식 상세 (물리, 마법, 원소, 크리티컬) | 신규 |
| B-02 | BAL_Growth_Curve.md | 성장곡선 (EXP, 스탯, 장비 스케일링) | 신규 |
| B-03 | BAL_ItemWorld_Scaling.md | 아이템계 층별 난이도/보상 스케일링 | 신규 |
| B-04 | BAL_Innocent_Effect.md | 이노센트 효과 수치 (레벨, 합성, Wild/Tamed) | 신규 |
| B-05 | BAL_Party_Scaling.md | 파티 인원별 밸런스 배율 | 신규 |
| B-06 | BAL_Economy_Flow.md | 재화 유입/유출 시뮬레이션 | 신규 |
| B-07 | BAL_TTK_Benchmark.md | TTK/TTD 기준표 (상황별 목표 시간) | 신규 |
| B-08 | BAL_AutoHunt_Efficiency.md | 자동사냥 효율 상세 (3-Tier별 수치) | 신규 |

---

## 12. Tech/ - 기술 아키텍처

| # | 파일명 | 설명 | 상태 |
| :--- | :--- | :--- | :--- |
| A-01 | TECH_Architecture_Overview.md | 전체 기술 아키텍처 (클라이언트, 서버, DB) | 신규 |
| A-02 | TECH_Client_Rendering.md | 클라이언트 렌더링 (PixiJS v8, 스프라이트, 파티클) | 신규 |
| A-03 | TECH_Client_StateManager.md | 클라이언트 상태 관리 (게임 루프, 씬, 입력) | 신규 |
| A-04 | TECH_Server_GameLogic.md | 서버 게임 로직 (Node.js/Rust, 권한 모델) | 신규 |
| A-05 | TECH_Server_Database.md | 데이터베이스 설계 (PostgreSQL, Redis) | 신규 |
| A-06 | TECH_Network_Protocol.md | 네트워크 프로토콜 (WebSocket 메시지, 직렬화) | 신규 |
| A-07 | TECH_ProcGen_Pipeline.md | 절차적 생성 구현 (시드, 템플릿, 검증) | 신규 |
| A-08 | TECH_Physics_Collision.md | 물리/충돌 시스템 (히트박스, 타일맵) | 신규 |
| A-09 | TECH_Asset_Pipeline.md | 에셋 파이프라인 (스프라이트시트, 로딩, 캐시) | 신규 |
| A-10 | TECH_DevOps.md | 개발 환경/배포 (Vite, CI/CD, 스테이징) | 신규 |

---

## 13. LiveOps/ - 라이브 서비스

| # | 파일명 | 설명 | 상태 |
| :--- | :--- | :--- | :--- |
| L-01 | LIVE_Season_System.md | 시즌 시스템 (3~6개월 주기, 월드 재생성, 시즌 패스) | 신규 |
| L-02 | LIVE_Event_Framework.md | 이벤트 프레임워크 (기간 한정 이벤트, 보상) | 신규 |
| L-03 | LIVE_Monetization.md | 수익화 모델 (코스메틱, 편의, 시즌 패스) | 신규 |
| L-04 | LIVE_Update_Cadence.md | 업데이트 주기 (핫픽스, 패치, 시즌 업데이트) | 신규 |
| L-05 | LIVE_Analytics_KPI.md | 핵심 KPI 및 분석 (DAU, 리텐션, ARPU, 전환율) | 신규 |

---

## 14. Sheets/ - CSV 데이터 시트

| # | 파일명 | 연동 GDD | 상태 |
| :--- | :--- | :--- | :--- |
| S-01 | Content_Stats_Character_Base.csv | SP-01, SP-02 | 신규 |
| S-02 | Content_Stats_Weapon_List.csv | SP-06, C-03 | 신규 |
| S-03 | Content_Stats_Armor_List.csv | C-04 | 신규 |
| S-04 | Content_Stats_Accessory_List.csv | C-05 | 신규 |
| S-05 | Content_Stats_Monster_List.csv | C-01 | 신규 |
| S-06 | Content_Stats_Boss_List.csv | C-02, SC-05, SI-03 | 신규 |
| S-07 | Content_Stats_Innocent_List.csv | SI-07, C-06 | 신규 |
| S-08 | Content_Stats_Skill_List.csv | SC-03, C-07 | 신규 |
| S-09 | Content_Stats_Evility_List.csv | SP-09, C-08 | 신규 |
| S-10 | Content_Stats_Class_List.csv | SP-08, C-09 | 신규 |
| S-11 | Content_Stats_Consumable_List.csv | C-10 | 신규 |
| S-12 | Content_System_Damage_Formula.csv | SC-02, B-01 | 신규 |
| S-13 | Content_System_Growth_Curve.csv | SP-02, B-02 | 신규 |
| S-14 | Content_System_IW_FloorScaling.csv | SI-01, B-03 | 신규 |
| S-15 | Content_System_Economy_Currency.csv | SE-02, B-06 | 신규 |
| S-16 | Content_System_GeoEffect_List.csv | SI-06, C-12 | 신규 |
| S-17 | Content_Level_RoomTemplate_World.csv | SW-03, C-11 | 신규 |
| S-18 | Content_Level_RoomTemplate_IW.csv | SI-02, C-11 | 신규 |
| S-19 | Content_System_Quest_List.csv | C-13 | 신규 |
| S-20 | Content_System_Shop_Inventory.csv | SE-03 | 신규 |

---

## 15. Reference/ - 레퍼런스 (작성 완료)

| # | 파일명 | 분류 |
| :--- | :--- | :--- |
| R-01 | 게임 기획 개요.md | 전체 기획 개요 |
| R-02 | 캐슬바니아 시스템 분석.md | Metroidvania 참조 |
| R-03 | 디스가이아 시스템 분석.md | Item World 참조 |
| R-04 | Metroidvania Game Design Deep Dive.md | 장르 심층 분석 |
| R-05 | Disgaea_ItemWorld_Reverse_GDD.md | Item World 역분석 |
| R-06 | Spelunky-LevelGeneration-ReverseGDD.md | 절차적 생성 역분석 |
| R-07 | DeadCells-LevelGeneration-ReverseGDD.md | Dead Cells 역분석 |
| R-08 | 게임 기획서 작성법 (Damion Schubert GDC).md | GDD 작성법 |
| R-09 | GDC_인사이트_전투_액션.md | GDC 전투 인사이트 |
| R-10 | GDC_인사이트_절차적생성_로그라이크.md | GDC 절차적 생성 인사이트 |
| R-11 | GDC_인사이트_탐험_레벨디자인.md | GDC 탐험 인사이트 |
| R-12 | GDC_인사이트_밸런스_경제.md | GDC 밸런스 인사이트 |
| R-13 | GDC_인사이트_멀티플레이_네트워크.md | GDC 멀티 인사이트 |
| R-14 | sakurai_인사이트.md | 사쿠라이 디자인 철학 |
| R-15 | timcain_인사이트.md | 팀 케인 디자인 철학 |
| R-16 | extracredit_인사이트.md | Extra Credits 인사이트 |
| R-17 | jonastyroller_인사이트.md | 레벨 디자인 인사이트 |
| R-18 | noclip_인사이트.md | 개발 다큐멘터리 인사이트 |
| R-19 | designdocs_인사이트.md | 기획 문서 인사이트 |
| R-20 | WIKI_INDEX.md | 위키 참조 인덱스 |

---

## 문서 통계

| 카테고리 | 문서 수 | 상태 |
| :--- | :--- | :--- |
| Terms (메타) | 6 | 신규 |
| System/Core (핵심 메커닉) | 9 | 신규 |
| System/ItemWorld (아이템계) | 9 | 신규 |
| System/Progression (성장) | 10 | 신규 |
| System/World (월드/존) | 12 | 신규 |
| System/Multiplayer (멀티) | 9 | 신규 |
| System/Economy (경제) | 6 | 신규 |
| Design (설계 원칙) | 6 | 신규 |
| Content (콘텐츠) | 15 | 신규 |
| UI (UI/HUD) | 11 | 신규 |
| Balance (밸런스) | 8 | 신규 |
| Tech (기술) | 10 | 신규 |
| LiveOps (라이브) | 5 | 신규 |
| Sheets (CSV) | 20 | 신규 |
| Reference (레퍼런스) | 20 | 완료 |
| **총계** | **156** | 신규 136 / 완료 20 |

---

## 작성 우선순위

### Phase 1: MVP 핵심 (개발 착수 필수)

1. T-01 Project_Vision.md
2. SC-01 SYS_Combat_Base.md
3. SC-02 SYS_Combat_Damage.md
4. SC-07 SYS_Movement.md
5. SC-09 SYS_Camera.md
6. SI-01 SYS_ItemWorld_Core.md
7. SI-02 SYS_ItemWorld_FloorGen.md
8. SP-01 SYS_Stat_Core.md
9. SP-03 SYS_Equipment_Core.md
10. SW-01 SYS_World_Structure.md
11. SM-01 SYS_Network_Architecture.md
12. A-01 TECH_Architecture_Overview.md

### Phase 2: 핵심 확장

13~24: SI-07, SI-08, SP-02, SP-04, SC-05, SW-02, SW-03, SM-02, SE-01, B-01, B-02, A-07

### Phase 3: 콘텐츠/밸런스

25~: Content 문서, Balance 문서, UI 문서, 나머지 CSV

### Phase 4: 라이브 서비스

L-01 ~ L-05, 나머지 Design 문서
