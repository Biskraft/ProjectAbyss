# ECHORIS GDD 마스터 로드맵 (기획서 전체 목록)

> **작성일:** 2026-04-13
> **작성자:** Director (Claude)
> **목적:** ECHORIS에 필요한 모든 기획 문서를 나열하고, Build 단계별 우선순위를 정한다.
> **기준:** 스파이크("아이템에 들어가면, 그 아이템의 기억이 던전이 된다") 강화 여부

---

## 범례

| 상태 | 의미 |
|:-----|:-----|
| Done | 작성 완료 |
| Fix | 작성됐으나 정합성 수정 필요 |
| NEW | 미작성 - 신규 제작 필요 |
| DEP | DEPRECATED - 삭제된 스펙 |

| 빌드 | 의미 |
|:-----|:-----|
| B0 | Build 0 - 내부 검증 (첫 30분 수직 슬라이스) |
| B1 | Build 1 - 지인 테스트 |
| B2 | Build 2 - 클로즈드 알파 |
| B3 | Build 3 - 퍼블릭 데모 / Steam |

---

## 0. Terms (메타 문서) - 6개

| ID | 문서명 | 상태 | 빌드 | 비고 |
|:---|:-------|:-----|:-----|:-----|
| T-01 | Project Vision | Done | - | 3대 기둥, 핵심 판타지, 타겟 유저 |
| T-02 | GDD Writing Rules | Done | - | 5단계 구조, 네이밍 규칙 |
| T-03 | Glossary | Done | - | 공식 용어 사전 |
| T-04 | Document Index | Fix | B0 | DEPRECATED 항목 정리 + 신규 문서 반영 필요 |
| T-05 | GDD Roles | Done | - | 역할/책임 정의 |
| T-06 | Sheets Writing Rules | Done | - | CSV SSoT 규칙 |

---

## 1. Design (설계 원칙/철학) - 14개 (11 Done + 1 Fix + 2 NEW)

| ID | 문서명 | 상태 | 빌드 | 비고 |
|:---|:-------|:-----|:-----|:-----|
| D-01 | Architecture 2-Space | Done | - | 월드 + 아이템계 분리 모델 |
| D-02 | Core Loop Circulation | Done | - | 탐험-획득-강화-해금 순환 |
| D-03 | Difficulty Progression | Done | - | 난이도 곡선 철학 |
| D-04 | Metroidvania Philosophy | Done | - | 능력 게이트 기반 비선형 탐험 |
| D-05 | Yarikomi Philosophy | Done | - | 극한 플레이 설계 원칙 |
| D-06 | **Online Design Principles** | **NEW** | **B2** | 멀티플레이 설계 원칙. 레퍼런스: `OnlineCoop_Netcode_Research.md` |
| D-07 | Economy Faucet & Sink | Done | - | 자원 순환 철학 |
| D-09 | Combat Philosophy | Done | - | 타격감/전투 리듬/보스전 철학 |
| D-10 | Level Design Standards | Done | - | 레벨 디자인 표준 |
| D-11 | Progression & Reward | Done | - | 성장 곡선/보상 심리 |
| D-12 | Narrative & Worldbuilding | Done | - | 아이템 서사 체계 |
| D-13 | WorldLayout GridVania | Done | - | 그리드바니아 분석 |
| D-14 | Monetization Strategy | Done | - | itch.io 무료 -> Steam 프리미엄 |
| D-15 | Art Direction | Fix | B0 | Tier별 팔레트, UI 톤, 적/보스 디자인 미확정 섹션 보강 필요 |
| D-16 | Tutorial / Environmental Teaching | Done | - | 환경 교습 철학 |
| D-17 | **Art Animation Spec** | **NEW** | **B0** | 스프라이트 크기 규격, 키프레임 원칙, 프레임수 표. 레퍼런스: `PixelArt_Animation_Principles_Research.md` |

---

## 2. System (시스템 메커닉) - 총 44개

### 2.1 Core: 3C (Character / Camera / Control) - 3개

| ID | 문서명 | 상태 | 빌드 | 비고 |
|:---|:-------|:-----|:-----|:-----|
| SYS-3C-01 | Character Design | Done | - | 물리, 상태 머신, 히트박스 |
| SYS-3C-02 | Camera System | Done | - | Follow, DeadZone, Room Transition |
| SYS-3C-03 | Control Scheme | Done | - | 키보드/게임패드, 입력 버퍼 |

### 2.2 전투 시스템 (Combat) - 7개 (4 Done + 3 NEW)

| ID | 문서명 | 상태 | 빌드 | 비고 |
|:---|:-------|:-----|:-----|:-----|
| SYS-CMB-01 | Action System | Done | - | 3타 콤보, 대시, 공중 공격 |
| SYS-CMB-02 | Damage System | Fix | B0 | **MP/회피 잔여 섹션 삭제 필요 (DEC-009)**. 3스탯 기반 재작성 |
| SYS-CMB-03 | Weapons & Slots | Done | - | 5종 무기 차별화 |
| SYS-CMB-04 | **SubWeapon System** | **NEW** | **B1** | 보조 무기/투사체. 캐슬바니아 `Relic.md`, `Glyph System.md` 참고 |
| SYS-CMB-05 | **Elemental Affinity** | **NEW** | **B1** | 화/빙/뇌 + 무속성. 레퍼런스: `ElementalSystem_Comparison_Research.md` |
| SYS-CMB-06 | **Status Effects** | **NEW** | **B1** | 화상/동결/감전/독 등. 디스가이아 `Evility.md` + 캐슬바니아 `Stat Boost.md` 참고 |
| SYS-CMB-07 | Hit Feedback | Done | - | 사쿠라이 8기법 |

### 2.3 성장 시스템 (Growth) - 2개 (1 Fix + 1 Done)

| ID | 문서명 | 상태 | 빌드 | 비고 |
|:---|:-------|:-----|:-----|:-----|
| SYS-LVL-01 | Stat System | **Fix** | **B0** | **6스탯 -> 3스탯(ATK/INT/HP) 전면 재작성 필요 (DEC-009)**. 디스가이아 `Statistics.md` 참고 |
| SYS-LVL-02 | Level & Experience | Done | - | 경험치 곡선, 레벨업. 디스가이아 `Experience.md` + `Rank.md` 참고 |

### 2.4 장비 시스템 (Equipment) - 3개 (3 Done)

| ID | 문서명 | 상태 | 빌드 | 비고 |
|:---|:-------|:-----|:-----|:-----|
| SYS-EQP-01 | Equipment Slots | Done | - | 무기/방어구/악세서리 슬롯 |
| SYS-EQP-02 | Rarity System | Done | - | Normal-Ancient 5등급. 디스가이아 `Rank.md` 참고 |
| SYS-EQP-03 | Item Growth Path | Done | - | 아이템 레벨/경험치/강화 경로 |

### 2.5 월드 시스템 (World) - 7개 (5 Done + 2 NEW)

| ID | 문서명 | 상태 | 빌드 | 비고 |
|:---|:-------|:-----|:-----|:-----|
| SYS-WLD-01 | World Map Structure | Done | - | 수직 하강 토폴로지, Critical Path |
| SYS-WLD-02 | Zone Design | Fix | B0 | **Concordia Hub -> Save Point Concordia 개명 (DEC-009)** |
| SYS-WLD-03 | Ability Gating | Done | - | 렐릭 기반 능력 게이트. 캐슬바니아 `Relic.md`, `Double Jump.md`, `Back Dash.md` 참고 |
| SYS-WLD-04 | Stat Gating | Done | - | ATK/INT 이중 스탯 게이트 |
| SYS-WLD-05 | World ProcGen | Done | - | 핸드+절차 혼합 |
| SYS-WLD-06 | **Save & Warp** | **NEW** | **B0** | 세이브 포인트 메커닉, 워프, 대장간/상점 통합. 캐슬바니아 세이브 룸 체계 참고 |
| SYS-WLD-07 | **Secrets & Rewards** | **NEW** | **B1** | 숨겨진 방, 파괴 가능 벽, 비밀 보상. 캐슬바니아 `Boss Rush Mode.md` 참고 |

### 2.6 월드 환경 (World Environment) - 3개 (전부 NEW)

| ID | 문서명 | 상태 | 빌드 | 비고 |
|:---|:-------|:-----|:-----|:-----|
| SYS-WLD-08 | **Vertical Gimmicks** | **NEW** | **B1** | 상승 기류, 엘리베이터, 붕괴 바닥, GBE 오마주 기믹. 레퍼런스: `Vertical_Traversal_Gimmicks_Research.md` |
| SYS-WLD-09 | **Hazards & Traps** | **NEW** | **B1** | 가시, 증식벽, 산성, 낙하. 현재 코드(Spike, GrowingWall, CrackedFloor)의 설계 문서화 |
| SYS-WLD-10 | **Tile System** | Done | - | 타일셋 규격, IntGrid, 오토타일 |

### 2.7 아이템계 시스템 (Item World) - 5개 (4 Done + 1 NEW)

| ID | 문서명 | 상태 | 빌드 | 비고 |
|:---|:-------|:-----|:-----|:-----|
| SYS-IW-01 | Item World Core | Done | - | 진입/탈출, 지층 구조, 재사이클. 디스가이아 `Item World.md` 참고 |
| SYS-IW-02 | IW Strata Generation | Done | - | 4x4 방 그리드, Critical Path, Chunk 삽입 |
| SYS-IW-03 | IW Boss System | Done | - | 수문장-왕-신-대신, 패턴 설계 |
| SYS-IW-05 | Mystery Room & Events | Done | - | 기억의 방, 이벤트 |
| ~~SYS-IW-06~~ | ~~Geo Effects~~ | DEP | - | 삭제. Diablo Rift 특성(Modifier) 방식으로 재설계 예정 — 별도 시스템으로 후일 기획 |

### 2.8 아이템 서사 (Item Narrative) - 3개 (3 Done)

| ID | 문서명 | 상태 | 빌드 | 비고 |
|:---|:-------|:-----|:-----|:-----|
| SYS-INR-01 | Item Narrative Template | Done | - | 기원 4축, 테마 풀 |
| SYS-INR-02 | Environment Pool | Done | - | 환경 서사 풀 |
| SYS-INR-03 | Monster Pool | Done | - | 몬스터 서사 풀 |

### 2.9 이노센트 시스템 (Innocent) - 1개

| ID | 문서명 | 상태 | 빌드 | 비고 |
|:---|:-------|:-----|:-----|:-----|
| SYS-INC-01 | Innocent Core | Done | - | 4분류 12종, 야생/복종. 디스가이아 `Specialist.md`, `Innocent Town.md` 참고 |

### 2.10 적 & AI (Enemy) - 3개 (2 Done + 1 NEW)

| ID | 문서명 | 상태 | 빌드 | 비고 |
|:---|:-------|:-----|:-----|:-----|
| SYS-MON-01 | Enemy AI Behavior | Done | - | 제네릭 FSM, 아키타입 |
| SYS-MON-02 | Boss Design | Done | - | 패턴 분류, 4-Layer 모듈러 합성 |
| SYS-MON-03 | **Enemy Spawning** | **NEW** | **B0** | 스폰 규칙, 밀도, 리스폰 로직, weight 기반 분포. CSV SSoT 확정 포함 |

### 2.11 멀티플레이 (Multiplayer) - 4개 (전부 NEW, Phase 3)

| ID | 문서명 | 상태 | 빌드 | 비고 |
|:---|:-------|:-----|:-----|:-----|
| SYS-MP-01 | **Multiplayer Architecture** | **NEW** | **B2** | 서버 권위, WebSocket. 레퍼런스: `OnlineCoop_Netcode_Research.md` |
| SYS-MP-02 | **Party System** | **NEW** | **B2** | URL 링크 합류, 1-2인 (Phase 3), 최대 4인 (Phase 4+), 아이템 오너 귀속. 디스가이아 멀티 참고 |
| SYS-MP-03 | **Network Sync** | **NEW** | **B2** | 클라이언트 예측, 롤백, 대역폭 |
| SYS-MP-04 | **Ghost Message** | **NEW** | **B2** | 비동기 메시지, 다크소울 혈흔 오마주 |

### 2.12 경제 시스템 (Economy) - 2개 (전부 NEW)

| ID | 문서명 | 상태 | 빌드 | 비고 |
|:---|:-------|:-----|:-----|:-----|
| SYS-ECO-01 | **Resource Circulation** | **NEW** | **B1** | Gold, Remnant Fragment, 분해/합성 경로. 레퍼런스: `Equipment_DropRate_Economy_Research.md`, `EndgameLoop_Economy_Research.md` |
| SYS-ECO-02 | **Drop Rate Table** | **NEW** | **B1** | 레어리티별 드롭률, 기대값 곡선, 파밍 시간 시뮬레이션. 디스가이아 `Item Duplication.md` 참고 |

### 2.13 UI 시스템 (UI) - 5개 (1 Done + 4 NEW)

| ID | 문서명 | 상태 | 빌드 | 비고 |
|:---|:-------|:-----|:-----|:-----|
| SYS-UI-01 | Minimap | Done | - | Fog of War, 방 표시 |
| UI-01 | **HUD Layout** | **NEW** | **B0** | HP바, ATK/INT 표시, 아이템계 진행률, 미니맵 위치 |
| UI-02 | **Inventory UI** | **NEW** | **B0** | 장비 비교, 이노센트 슬롯, 레어리티 색상. 현재 코드(`InventoryUI.ts`) 설계 문서화 |
| UI-03 | **Map UI** | **NEW** | **B1** | 전체 맵, 게이트 마커, 미탐색 영역 |
| UI-04 | **Item World UI** | **NEW** | **B1** | 지층 진행, 보스 체력, 클리어 배지, 재사이클 프롬프트 |

### 2.14 오디오 (Audio) - 2개 (전부 NEW)

| ID | 문서명 | 상태 | 빌드 | 비고 |
|:---|:-------|:-----|:-----|:-----|
| SYS-AUD-01 | **Audio Direction** | **NEW** | **B1** | 사운드 팔레트, BGM 방향, SFX 우선순위. 레퍼런스: `AudioDirection_SoundDesign_Research.md` |
| SYS-AUD-02 | **Audio Implementation** | **NEW** | **B1** | Howler.js 통합, BGM 전환, SFX 이벤트 매핑 |

### 2.15 세이브 & 진행 (Save & Progress) - 1개 (NEW)

| ID | 문서명 | 상태 | 빌드 | 비고 |
|:---|:-------|:-----|:-----|:-----|
| SYS-SAV-01 | **Save Data Schema** | **NEW** | **B0** | 세이브 포맷, 마이그레이션 전략, localStorage vs 서버. 현재 `SaveManager.ts` 설계 문서화 |

### 2.16 분석 (Analytics) - 1개 (Done)

| ID | 문서명 | 상태 | 빌드 | 비고 |
|:---|:-------|:-----|:-----|:-----|
| SYS-TEL-01 | Analytics Telemetry | Done | - | 이벤트 추적, KPI |

### 2.17 성능 (Performance) - 1개 (NEW)

| ID | 문서명 | 상태 | 빌드 | 비고 |
|:---|:-------|:-----|:-----|:-----|
| SYS-PRF-01 | **Performance Budget** | **NEW** | **B1** | 프레임 버짓(16ms), 메모리, 에셋 크기. 레퍼런스: `WebGameFeel_Optimization_Research.md` |

### 2.18 접근성 (Accessibility) - 1개 (NEW)

| ID | 문서명 | 상태 | 빌드 | 비고 |
|:---|:-------|:-----|:-----|:-----|
| SYS-ACC-01 | **Accessibility Standards** | **NEW** | **B2** | 컬러블라인드, 키 리매핑, 텍스트 크기. 리서치 미완 (추가 리서치 필요) |

---

## 3. Content (콘텐츠 목록) - 12개 (4 Done + 8 NEW)

| ID | 문서명 | 상태 | 빌드 | 비고 |
|:---|:-------|:-----|:-----|:-----|
| CNT-00 | World Bible | Done | - | 세계관, 빌더, 대공동, 격벽 |
| CNT-EXP-001 | 첫 30분 경험 플로우 v3 | Done | - | 22 스크린, 대사 0줄 |
| CNT-ITM-001 | Item Narrative: 할아버지의 부엌칼 | Done | - | 샘플 아이템 서사 |
| CNT-ITM-002 | Item Narrative: First Sword | Done | - | 첫 검 서사 |
| CNT-01 | **Weapon List** | **NEW** | **B0** | 5종(검/대검/단검/활/지팡이) x 5레어리티 = 25개 무기 상세. CSV 연동 |
| CNT-02 | **Armor & Accessory List** | **NEW** | **B1** | 방어구/악세서리 목록, 세트 효과 |
| CNT-03 | **Innocent Catalog** | **NEW** | **B1** | 12종 이노센트 상세 (행동 패턴, 스탯 보너스, 출현 조건) |
| CNT-04 | **Monster Bestiary** | **NEW** | **B0** | 적 전체 목록 (아키타입, 스탯, 행동, 드롭). CSV SSoT 기반 |
| CNT-05 | **Zone & Biome List** | **NEW** | **B1** | 7 Tier 구역 상세 (환경, 적 분포, 게이트 조건, 팔레트) |
| CNT-06 | **Relic List** | **NEW** | **B1** | 렐릭 전체 목록 (대시/이단점프/벽점프/다이브/역류/수중호흡 등). 캐슬바니아 `Relic.md`, `Ability Soul.md` 참고 |
| CNT-07 | **Boss List** | **NEW** | **B1** | 월드 보스 + 아이템계 보스(수문장/왕/신/대신) 전체. 패턴/스탯/드롭 |
| CNT-08 | **Room Template Catalog** | **NEW** | **B1** | 월드 + 아이템계 방 템플릿 목록, 난이도 태그, 사용 빈도 |

---

## 4. CSV 데이터 시트 - 16개 (12 Done + 4 NEW)

| 시트 | 상태 | 빌드 | 연결 문서 |
|:-----|:-----|:-----|:----------|
| Content_Stats_Character_Base.csv | Done | - | SYS-LVL-01 |
| Content_Stats_Weapon_List.csv | Fix | B0 | MPCostSkill 컬럼 삭제 필요 |
| Content_Stats_Enemy.csv | Fix | B0 | GDD 수치 불일치 해소 필요 |
| Content_System_Damage_Formula.csv | Done | - | SYS-CMB-02 |
| Content_ItemWorld_MemoryRooms.csv | Done | - | SYS-IW-05 |
| Content_ItemWorld_SpawnTable.csv | Done | - | SYS-MON-03 |
| Content_StrataConfig.csv | Done | - | SYS-IW-02 |
| Content_Item_Growth.csv | Done | - | SYS-EQP-03 |
| Content_Item_DropRate.csv | Done | - | SYS-ECO-02 |
| Content_Innocents.csv | Done | - | SYS-INC-01 |
| Content_Rarity.csv | Done | - | SYS-EQP-02 |
| Content_Combat_Combo.csv | Done | - | SYS-CMB-01 |
| **Content_Stats_Armor_List.csv** | **NEW** | **B1** | SYS-EQP-01, CNT-02 |
| **Content_Relic_List.csv** | **NEW** | **B1** | SYS-WLD-03, CNT-06 |
| **Content_Zone_Config.csv** | **NEW** | **B1** | SYS-WLD-02, CNT-05 |
| **Content_Boss_Stats.csv** | **NEW** | **B1** | SYS-MON-02, CNT-07 |

---

## 5. 리서치 - 48개 Done + 2 NEW

| 상태 | 영역 | 필요 리서치 | 빌드 |
|:-----|:-----|:-----------|:-----|
| Done | 아이템계 | 6개 (Core, Innocent, Growth, ProcGen, UX, Summary) | - |
| Done | 이노센트 | 5개 (Combat, Growth, Classification, Multiplayer, Narrative) | - |
| Done | 게임 시스템 | 16개 (Combat, Boss, Level, Enemy, Vertical 등) | - |
| Done | 내러티브/월드 | 5개 (BLAME!, Biomega, ProceduralNarrative, Killy 등) | - |
| Done | 마케팅/경제 | 4개 (WebMarketing, Retention, Monetization, KPI) | - |
| Done | 기술 | 4개 (Netcode, WebGameFeel, ItemWorldEntry, PixelArt) | - |
| Done | 레벨 디자인 | 5개 (Flow, Macro, Micro, Minimap, LevelDesign_Progression) | - |
| Done | 기타 | 3개 (Dialogue UI, Elemental, DualStat) | - |
| **NEW** | **접근성** | **Accessibility_Standards_Research.md** | **B2** |
| **NEW** | **넷코드 상세** | **Netcode_ClientPrediction_Research.md** (롤백, 예측) | **B2** |

---

## 6. Build별 우선순위 요약

### Build 0 - 내부 검증 (핵심 루프 재미 검증)

**Fix 필수 (정합성):**
1. `System_Growth_Stats.md` - 6스탯 -> 3스탯 전면 재작성
2. `System_Combat_Damage.md` - MP/회피 섹션 삭제
3. `System_World_ZoneDesign.md` - Concordia Hub -> Save Point 개명
4. `Content_Stats_Enemy.csv` - GDD vs CSV 수치 SSoT 확정
5. `Content_Stats_Weapon_List.csv` - MPCostSkill 컬럼 삭제
6. `Document_Index.md` - DEPRECATED 항목 + 신규 문서 반영

**NEW 필수:**
1. `SYS-MON-03` Enemy Spawning - 스폰 규칙/weight 분포/리스폰
2. `SYS-SAV-01` Save Data Schema - 세이브 포맷/마이그레이션
3. `UI-01` HUD Layout - 최소 HUD 배치
4. `UI-02` Inventory UI - 장비 비교/이노센트 표시
5. `D-17` Art Animation Spec - 스프라이트 규격/프레임 표
6. `CNT-01` Weapon List - MVP 검 1종 5레어리티 상세
7. `CNT-04` Monster Bestiary - 현재 적 4종 + 보스 1종 문서화

**소계:** Fix 6 + NEW 7 = **13개 문서 작업**

---

### Build 1 - 지인 테스트

**NEW:**
1. `SYS-CMB-04` SubWeapon System
2. `SYS-CMB-05` Elemental Affinity
3. `SYS-CMB-06` Status Effects
4. `SYS-WLD-07` Secrets & Rewards
5. `SYS-WLD-08` Vertical Gimmicks
6. `SYS-WLD-09` Hazards & Traps
7. `SYS-ECO-01` Resource Circulation
8. `SYS-ECO-02` Drop Rate Table
9. `SYS-AUD-01` Audio Direction
10. `SYS-AUD-02` Audio Implementation
11. `SYS-PRF-01` Performance Budget
12. `SYS-WLD-06` Save & Warp (B0에서 시작, B1에서 완성)
13. `CNT-02` Armor & Accessory List
14. `CNT-03` Innocent Catalog
15. `CNT-05` Zone & Biome List
16. `CNT-06` Relic List
17. `CNT-07` Boss List
18. `CNT-08` Room Template Catalog
19. `UI-03` Map UI
20. `UI-04` Item World UI
21. 4개 CSV 신규 (Armor, Relic, Zone, Boss)

**소계: 21개 문서 + 4 CSV = 25개 작업**

---

### Build 2 - 클로즈드 알파

**NEW:**
1. `D-06` Online Design Principles
2. `SYS-MP-01-04` Multiplayer 4개 (Architecture, Party, Network, Ghost)
3. ~~`SYS-IW-06` Geo Effects~~ — 삭제 (Diablo Rift Modifier로 재설계 예정)
4. `SYS-ACC-01` Accessibility Standards
5. 2개 리서치 (접근성, 넷코드 상세)

**소계: 8개 문서 + 2 리서치 = 10개 작업**

---

### Build 3 - 퍼블릭 데모 / Steam

이 단계에서는 신규 기획서보다 **기존 문서의 검증/갱신**이 중심:
- 전체 문서 정합성 최종 감사
- 플레이테스트 결과 반영 밸런스 패치 문서화
- Steam 스토어 페이지 콘텐츠 (별도 마케팅 문서)
- 패치노트 / 체인지로그 문서화

---

## 7. 전체 통계

| 구분 | Done | Fix | NEW | DEP | 총계 |
|:-----|:----:|:---:|:---:|:---:|:----:|
| Terms | 5 | 1 | 0 | 0 | 6 |
| Design | 12 | 1 | 1 | 0 | 14 |
| System | 26 | 3 | 17 | 7 | 47 |
| Content | 4 | 0 | 8 | 0 | 12 |
| CSV | 10 | 2 | 4 | 0 | 16 |
| Research | 48 | 0 | 2 | 0 | 50 |
| **합계** | **105** | **7** | **32** | **7** | **145** |

> **현재 상태:** 105개 완료 / 7개 수정 필요 / 33개 신규 제작 필요 / 6개 삭제됨
> **B0까지:** 13개 작업 (Fix 6 + NEW 7)
> **B1까지:** +25개 작업
> **B2까지:** +10개 작업

---

## 8. 레퍼런스 활용 맵

어떤 기획서를 쓸 때 어떤 레퍼런스를 참고해야 하는지 매핑.

### 디스가이아 위키 (disgaea-wiki-md/)

| 위키 문서 | 참고 대상 기획서 |
|:----------|:----------------|
| Item World.md | SYS-IW-01, SYS-IW-02 |
| Specialist.md / Innocent Town.md | SYS-INC-01, CNT-03 |
| Statistics.md | SYS-LVL-01 (3스탯 재작성) |
| Experience.md / Rank.md | SYS-LVL-02, SYS-EQP-02 |
| Weapon.md / Equipment.md | SYS-CMB-03, CNT-01 |
| Dark Assembly.md | 참고만 (ECHORIS 미도입) |
| Evility.md | SYS-CMB-06 (Status Effects) |
| ~~Geo Effects.md~~ | 삭제. Diablo Rift Modifier로 재설계 예정 |
| Item Duplication.md | SYS-ECO-02 (드롭률 참고) |
| Magichange.md | 참고만 (ECHORIS 미도입) |
| Reincarnation.md | 참고만 (DEPRECATED) |

### 캐슬바니아 위키 (castlevania-wiki-md/)

| 위키 문서 | 참고 대상 기획서 |
|:----------|:----------------|
| Relic.md / Ability Soul.md | SYS-WLD-03, CNT-06 |
| Double Jump.md / Back Dash.md / Dash.md | SYS-3C-01, SYS-WLD-03 |
| Symphony of the Night.md | D-04, SYS-WLD-01, 전반 |
| Glyph System.md | SYS-CMB-04 (SubWeapon 참고) |
| Boss.md / Boss Rush Mode.md | SYS-MON-02, CNT-07 |
| Critical Hit.md / Stat Boost.md | SYS-CMB-02, SYS-LVL-01 |
| Enemy Data 파일들 | SYS-MON-01, CNT-04 |
| Curse of Darkness.md | SYS-EQP-03 (제작 시스템 참고) |
| Block.md | SYS-CMB-01 (방어 메커닉) |

### 기존 리서치 -> 기획서 매핑

| 리서치 | 대상 기획서 |
|:-------|:-----------|
| PixelArt_Animation_Principles | D-17 Art Animation Spec |
| AudioDirection_SoundDesign | SYS-AUD-01 |
| WebGameFeel_Optimization | SYS-PRF-01 |
| SilentTutorial_EnvironmentalTeaching | D-16 (Done) |
| Vertical_Traversal_Gimmicks | SYS-WLD-08 |
| Equipment_DropRate_Economy | SYS-ECO-01, SYS-ECO-02 |
| EndgameLoop_Economy | SYS-ECO-01 |
| OnlineCoop_Netcode | D-06, SYS-MP-01-04 |
| EnemyDesign_MobArchetype | SYS-MON-03, CNT-04 |
| BossDesign_SideScrolling | CNT-07 |
| ItemWorld_DepthReward_RiskBalance | SYS-IW-01 보완 |
| ElementalSystem_Comparison | SYS-CMB-05 |
