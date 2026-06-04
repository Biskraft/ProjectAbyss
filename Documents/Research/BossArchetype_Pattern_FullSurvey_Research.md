# 2D 메트로베니아 보스 아키타입·패턴 전수 조사 (Boss Archetype & Pattern Full Survey)

> **작성일:** 2026-06-03
> **목적:** `System_Enemy_BossArchetype.md` (SYS-ENM-BARC)의 골격을 채우기 위한 레퍼런스 전수 조사. 2D 횡스크롤 플랫포머/메트로베니아의 보스 **아키타입(형태·역할)** 과 **공격 패턴 분류**를 5개 게임군 병렬 조사로 도출하고 단일 체계로 종합한다.
> **조사 대상 (5 클러스터, 병렬):**
> - Hollow Knight, Ori (Blind Forest / Will of the Wisps)
> - Castlevania (classic + IGA-vania: SotN/AoS/DoS/OoE), Bloodstained
> - Metroid (Super/Fusion/Samus Returns/Dread), Axiom Verge, Guacamelee 1·2
> - Cuphead, Mega Man / Mega Man X
> - Dead Cells, Blasphemous 1·2, Salt and Sanctuary, The Messenger, Shovel Knight
> **연계 문서:** `System_Enemy_BossArchetype.md` (분류 SSoT — 본 조사가 채울 대상), `System_ItemWorld_Boss.md` (6분류 원천), `BossDesign_SideScrolling_Research.md`, `ItemWorldBoss_PatternDesign_Research.md`

---

## 0. 요약 (Executive Summary)

11개 게임군 전수 조사 결과, 2D 보스는 **11개 형태/역할 아키타입**과 **6대 패턴 분류(× 세부 패턴)** 로 수렴한다. ECHORIS의 기존 시드(형태 5종 / 6분류)는 방향이 맞으며, 본 조사가 그 빈칸을 채운다.

**가장 중요한 발견 4가지 (ECHORIS = 아이템계 파밍 게임 맥락):**

1. **반복 파밍에는 "위상 압축(phase-compression)" 스케일링이 정답이다.** Dead Cells의 Boss Stem Cell(BSC) 모델은 난이도 상승 시 HP를 늘리지 않고 **도입 위상을 건너뛰고 후반 패턴을 앞당긴다.** N번째 처치가 *더 길어지는* 게 아니라 *더 빽빽해진다*. → 아이템계 레어리티/지층 스케일링의 핵심 모델.
2. **3단 가독성(막기/패링/무조건 회피)** 을 색·VFX로 고정하라. Dead Cells의 `빨강 = 막을 수 없음` 규약이 표준. 한 번 정한 색 규약을 절대 위반하지 않는 것이 공정성의 핵심.
3. **텔레그래프 길이는 회피 난도에 비례한다** (Cuphead: 쉬운 공격 ~20프레임 / 어려운 공격 ~60프레임). 모든 공격은 예고된다 — 난이도는 "읽고 반응"에서 나오지 "예측 불가"에서 나오지 않는다.
4. **위상 전환은 수치가 아니라 *정답*을 바꿔야 한다.** 최고의 2페이즈는 약점 위치·아레나·안전지대를 무효화해 플레이어가 *재학습*하게 만든다(Metroid 약점 이동, Ori 아레나 파괴, Blasphemous 패링 무력화).

---

## 1. 보스 아키타입 (형태·역할 분류) — 11종

> 이름이 아니라 **실루엣(form) + 조우 역할(role)** 로 분류. 각 아키타입은 "이렇게 보스를 조립한다"는 템플릿이 된다. ECHORIS 형태 시드(기믹/듀얼/대형고정/군체/대면)와의 매핑을 우측에 표기.

| # | 아키타입 | 정의 | 대표 예 | ECHORIS 형태 시드 매핑 |
|:--|:---------|:-----|:--------|:----------------------|
| **B1** | **듀얼리스트 / 미러** (Duelist/Mirror) | 플레이어 규모. 플레이어의 동사(대시·점프·근접·패링)를 거울처럼 사용. 스페이싱·반응 듀얼 | Hornet·Pure Vessel(HK), Richter·Doppelganger(SotN), Hand of the King(DC), Crisanta(Blasph), MMX 마버릭, Zangetsu | 듀얼 (신규: 미러 변형) |
| **B2** | **비행 / 급강하** (Aerial Swooper) | 대부분 공중. 화면 밖·배경에서 급강하·선회. 지상을 봉쇄해 수직 회피 강제 | Nightmare King Grimm(HK), Shriek(Ori), Ridley(Metroid), Hippogryph·Darkwing Bat(SotN) | (신규 형태) |
| **B3** | **텔레포터 / 암살자** (Teleporter/Assassin) | 소형·초기동. 순간이동·대시로 재배치 후 일격, 사라짐 | Time Keeper(DC), Boomer Kuwanger(MMX), Quirce(Blasph), Specter Knight(SK) | (신규 형태) |
| **B4** | **대형 고정 / 공성 콜로서스** (Siege Colossus) | 화면을 채우는 거구. 고정·완서 이동. 아레나 전역 area-denial(슬램·충격파·빔). 플레이어가 궤도 돌며 빈틈 탐색 | Mora·Soul Master(HK/Ori), Balore(OoE), Kraid(Metroid), Conjunctivius(DC) | 대형고정 |
| **B5** | **고정 포대 / 코어** (Turret/Core) | 완전 고정. 투사체·빔만. 발사 창을 찾는 "퍼즐" | Mother Brain P1(Metroid), Sentinel(Axiom), Cagney Carnation(Cuphead) | 대형고정(하위) |
| **B6** | **약점부위 / 파괴가능 부위** (Weak-Point) | 본체는 장갑. 노출된 서브 부위(눈·배·꼬리)만, 특정 개방 윈도우에만 피해 | Phantoon(눈)·Draygon(배)(Metroid), Granfaloon(코어)(SotN), Dr. Kahl's Robot(Cuphead) | 대형고정(하위) — **메트로베니아 핵심** |
| **B7** | **소환사 / add 컨트롤러** (Summoner) | 직접 위협 낮음. 잡몹·촉수 생성, 종종 add 생존 중 실드/무적. 타겟 우선순위 강제 | Shaft(SotN), Conjunctivius 촉수(DC), Gremory(Blood), Uay Pek(Guac2) | 군체 |
| **B8** | **듀얼 / 트윈 갱크** (Dual/Twin Gank) | 2-3 본체가 위협을 공유·교대. 분산 주의·공간 분할 (Ornstein & Smough 계보) | Lesmes & Infanta(Blasph2), Colos & Suses(Messenger), Watcher Knights(HK, 군체형), Gaibon & Slogra(SotN) | 군체(하위) |
| **B9** | **변신 다단계** (Transforming Multi-Phase) | 단일 개체가 위상마다 형태·무브셋·종종 아레나를 교체. "드라큘라 전통" | Dracula(전 CV), Cuphead 전 보스, Raven Beak(Dread), Radamés(Blasph2), Mother Brain(Metroid) | 대면(최종) |
| **B10** | **건틀릿 / 연속** (Gauntlet) | 미니보스를 연쇄한 하나의 조우. 지구력·구성 시험 | King Dice 9연전(Cuphead), Slogra→Gaibon→Dracula(SCV4), 콜로세움 3인전(SotN) | (신규 형태) |
| **B11** | **환경 / 기믹 / 추격** (Environmental/Chase) | 아레나 기믹·퍼즐로 격파. 또는 전투 없는 추격(이동 즉사 벽) | Crocomire 산성 밀기(Metroid), Ori 탈출 시퀀스, Treasure Knight 부력(SK), Phantom Express 패리(Cuphead) | 기믹 |

### 1.1. ECHORIS 적용 — 형태 시드 보강

기존 시드 5종(기믹/듀얼/대형고정/군체/대면) → 조사 결과 **신규 형태 4종 추가 권장:** 비행(B2)·텔레포터(B3)·약점부위(B6)·건틀릿(B10). 특히 **약점부위(B6)는 메트로베니아 장르의 공격 문법 핵심**이라 ECHORIS 보스에도 1순위 도입 대상이다(§3 참조).

---

## 2. 보스 패턴 아키타입 (공격 패턴 분류) — 6대 × 세부

> ECHORIS 기존 6분류(근접/돌진/투사체/장판/소환/특수)를 척추로, 조사에서 추출한 세부 패턴을 채운다. `System_ItemWorld_Boss.md`의 "25 서브 패턴" 빈칸 대응.

### 2.1. 근접 (Melee)

| 세부 | 설명 | 예 |
|:-----|:-----|:---|
| 스윕/런지 | 근거리 호·찌르기 | Slogra 창 런지, Cerberos 물기, Crisanta 스윙 |
| 다단 콤보 | 고정 타수 연타, 마지막 타 후 처벌 | Pure Vessel 3연타, Time Keeper 2-3타, HotK 콤보 |
| 그랩/잡기 | 포착 후 확정타. 카운터/QTE 창인 경우 多 | Draygon 그랩→그래플 카운터, Bael 혀, Time Keeper hook |

### 2.2. 돌진 (Charge)

| 세부 | 설명 | 예 |
|:-----|:-----|:---|
| 지상 차지 | 바닥 레인 직선 돌진. 점프/벽으로 회피 | Mantis Lance Dash, Behemoth, Conjunctivius 바디슬램 |
| 벽 반사 | 벽 튕김 리코셰 | Armored Armadillo, Sigma P1 |
| 텔레포트 일격 | 재배치 후 즉시 공격 | Boomer Kuwanger, Time Keeper, Quirce 천장낙하 |
| 공중 급강하 | 플레이어 위치 위→직하강 | Mantis Lance Drop, Ridley 다이브, Spark Bat 계열 |

### 2.3. 투사체 (Projectile)

| 세부 | 설명 | 예 |
|:-----|:-----|:---|
| 직선/조준 | 단발 직선·last-position 조준 | Spark Mandrill, Telal 고저 교대 |
| 확산/부채꼴 | 다각 동시 발사, 빈틈이 안전 레인 | Dracula 45°/90° 스프레드, Pure Vessel 7대거, Sting Chameleon 3갈래 |
| 파동(sine) | 물결 궤적 | Cuphead 사행 탄, Flame Mammoth 화염파 |
| 유도 | 추적·last-position | Mother Brain Rinka, Launch Octopus 미사일, Escue 전기구 |
| 바운싱 | 리코셰. 난사 처벌형 | Grim Matchstick 분열 화염구 |
| 부메랑/회귀 | 나갔다 되돌아오는 2회 위협 | Mantis Blade Boomerang, Boomerang Cutter |
| 포물선 lob | 곡사 투척 | Brineybeard 배럴, Flame Mammoth 점프 크러시 |

### 2.4. 장판 (Zone / Area-Denial)

| 세부 | 설명 | 예 |
|:-----|:-----|:---|
| 슬램+충격파 | 착지 충격이 바닥을 타고 벽까지. **점프만 가능(패링 불가)** | Concierge Fire Strike, Mora 슬램, Balore, Soul Master |
| 지속 장판/오라 | 일정 시간 점유 위험 구역. **롤 회피만** | Nightmare King 화염 기둥, Concierge Aura of Laceration, Arachnus 화염 흔적 |
| 낙하/상승 해저드 | 비처럼 쏟아지는·솟구치는 위협 | Cuphead Weepy 양파 비, Chill Penguin 천장 눈보라, Salvador 메테오 |
| 빔/레이저 스윕 | 광역 연속 히트박스가 축을 쓸기 | Mora 입 빔, Balore 눈빔, Raven Beak 소닉붐, Galamoth |
| 화면 전체 | 바닥 전체 무효화. 평면 이탈만 회피 | Shriek P2 전바닥 슬램, Mother Brain Rinka 폭풍, Concierge Shout(회피·패링·롤 불가, 거리만) |

### 2.5. 소환 (Summon)

| 세부 | 설명 | 예 |
|:-----|:-----|:---|
| 잡몹 add | 주의 분산 소환 | Beppi, Shaft, Athetos 센티넬 3기 |
| 촉수+실드 | add 생존 중 본체 무적/실드 (리듬 브레이커) | Conjunctivius 촉수, Legion 시체 군집 |
| 분신/클론 | 자기 복제로 다중 위협 | Jaguar Javier(50%/25% 분신), Uay Pek 클론 웨이브 |

### 2.6. 특수 (Special)

| 세부 | 설명 | 예 |
|:-----|:-----|:---|
| 위상 전환 시그니처 | 위상 경계 전용 연출·무적·신무브 | Dracula 변신, Cuphead 페이즈 전환, Raven Beak 더블 카운터 |
| 기믹/환경 | 아레나 시스템이 진짜 상대 | Crocomire 산성, Phantom Express 패리 이동, Treasure Knight 부력 |
| 패리 베이트 스탠스 | 공격을 유도한 뒤 반격 | Crisanta 패링 스탠스, Esdras 대형 공격 |
| 그랩-카운터 시퀀스 | 잡기 후 반격/탈출 미니 위상 | Draygon, Proteus Ridley 그랩 시퀀스, EMMI 포획 |
| 인레이지 / 가속 | 저HP에서 기존 공격 가속·증강(신규 아님) | Storm Eagle 깃털 추가, Nightmare King 가속, Conjunctivius 촉수 가속·변색 |

---

## 3. 텔레그래프 & 가독성 규약

### 3.1. 채널 (5종)

| 채널 | 규약 | 예 |
|:-----|:-----|:---|
| 윈드업 포즈 | 공격마다 *고유 실루엣* 1개. 플레이어는 탄이 아니라 *포즈*를 읽는다. 무게가 클수록 윈드업이 길다 | HK "공격당 고유 윈드업", Slogra 창 젖힘, Zangetsu 검 충전 |
| 색/플래시 | **`빨강 = 막을 수 없음`이 업계 표준.** 상태·페이즈도 색으로 | Dead Cells 빨강 트레일·심볼, Cuphead `핑크 = 패리 가능`, Conjunctivius 빨강 돌진 빔, MMX Rangda Bangda 눈 색 |
| 오디오 | 공격류별 고유 SFX, 페이즈 전환 시 포효/음악 변화 | Kraid 포효, Gaibon 적색화 사운드, Blasphemous 페이즈 보컬 |
| 위치 | *어디에* 떨어지는지를 사전 포지셔닝으로 예고 | Dracula 기둥 텔레포트, Mantis 벽 클링(부메랑 예고), Slogra 플레이어 위 착지 |
| UI/인디케이터 | 경로 마커·조준선 | Ori Shriek 스워프 경로 표시, Bombardier 착탄 마커 |

### 3.2. 텔레그래프 길이 = 회피 난도 비례 (Cuphead 규칙)

- 쉽게 피하는 공격 → 짧은 윈드업 (~20프레임 ≈ 0.33s @60fps)
- 피하기 어려운 공격 → 긴 윈드업 (~60프레임 ≈ 1s)
- **모든 공격은 예고된다.** ECHORIS 기존 규칙(Tell ≥ 300ms, 보스 등급별 텔레그래프 배율 장군 ×1.2 ~ 대신 ×0.7)과 정합 — 등급이 높을수록 윈드업을 *압축*.

### 3.3. 3단 가독성 (Dead Cells)

> **막기(block) / 패링(parry) / 무조건 회피(must-move)** 를 색·VFX로 한눈에 구분. 대부분의 지향성 공격(근접·투사체·그랩)은 패링 가능, 소수(충격파·오라·화면전체)는 *점프/롤/거리만*. `빨강`은 항상 같은 의미여야 한다(절대 위반 금지).

---

## 4. 위상 전환 모델 (5종)

| 모델 | 정의 | 대표 | ECHORIS 적용 |
|:-----|:-----|:-----|:------------|
| **가산형** (Additive) | 깨끗한 HP%에서 기존 무브셋 유지 + 신무브 추가 | Pure Vessel(66%/33%), Time Keeper(50%) | **저작 저렴 → 지층/등급 스케일링에 적합** |
| **아레나 변형** (Arena-transform) | 위상마다 아레나·안전지대 무효화 | Ori Shriek(바닥 파괴), Mora(바닥→벽→천장) | 비싸다 → 핸드크래프트 월드 보스 한정 |
| **형태 전환** (Form-shift) | 본체 실루엣·히트박스 교체 | Dracula, Cuphead Brineybeard(배 자체가 보스) | 대신(Great God)급 마퀴 보스 |
| **약점 이동** (Weak-point relocation) | 약점 위치가 머리→꼬리, 본체→배로 이동 | Corpius, Yakuza, Kraid(Dread) | **메트로베니아 핵심 — 재학습 강제** |
| **인레이지** (Enrage) | 저HP에서 기존 패턴 가속·증강(신규 아님) | Storm Eagle, Jaguar Javier(분신), Nightmare King | 모든 등급 공통 적용 가능 |

> 최고의 2페이즈는 **수치가 아니라 정답을 바꾼다.** Esdras 페이즈2는 천둥으로 *패링을 처벌*해 회피를 강제. Metroid는 약점을 옮겨 *재학습*을 강제.

---

## 5. 파밍 난이도 스케일링 — Dead Cells BSC 모델 (ECHORIS 최우선)

> 아이템계처럼 *같은 보스를 수백 번* 잡는 게임의 핵심 모델. HP 인플레가 아니라 **밀도**를 올린다.

| 기법 | 내용 | ECHORIS 매핑 |
|:-----|:-----|:------------|
| **위상 압축** | 1+ BSC에서 보스가 **도입 위상(P1)을 건너뛰고 P2부터 시작** | 레어리티/지층 상승 시 장군→왕→신→대신이 더 *빽빽*하게(긴 게 아니라) |
| **무브 승격** | 후반 시그니처 패턴이 일반 공격으로 앞당겨짐(충전 시간 단축) | 고지층에서 대신 전용 패턴을 조기 노출 |
| **플레이어 크러치 감소** | 반복 사용 시 CC(빙결 등) 지속 감소 → 스팸 무력화 | 고지층에서 상태이상 DR 강화 |
| **티어가 콘텐츠 해금** | 진짜 최종 보스(Collector)는 5 BSC 전용 | 심연/Ancient 전용 보스 = 파밍 목적지 |

**핵심 교훈:** N번째 처치는 *더 길어지면(HP↑)* 안 되고 *더 타이트해져야(밀도↑)* 한다. 이것이 야리코미 후기 재미 훼손(HP 인플레)을 피하는 유일한 길.

---

## 6. 빌드/무기 카운터플레이

- **SotN 전통:** 보스는 "구역 탐험의 완결". 처치 시 이동 능력/구역 해금 → 전투 승리를 탐험 해금으로 전환. 세이브룸-보스-능력해금 시퀀스.
- **무기 상성:** 서브웨폰·원소·장비로 같은 보스가 빌드마다 다른 싸움. 다수 빌드에 *유효 해답*을 두되 한 플레이스타일을 하드카운터하지 말 것.
- **MMX 가위바위보 약점 체인:** 각 보스의 드랍이 *다음 보스의 약점* = 방향성 닫힌 루프. 공략 순서 메타 퍼즐. 약점 적중 시 막대 피해·스턴락. 단 기본 무기 경로는 항상 유효 유지.
- **능력 게이트 격파(Metroid/Axiom):** 특정 학습 도구로만 격파(Crocomire 산성 밀기, Draygon 그래플, Guacamelee 색 실드 매칭). → ECHORIS 렐릭(surge/diveAttack/벽점프) 마스터 체크로 보스 설계.

---

## 7. 패턴 선택 시스템 (Pattern Pool)

- **고정 루프(1,2,3,1,2,3) 금지.** Cuphead는 속성별 배열을 셔플(`1,2,1,3,3,2,1,3,2`)하고 RNG는 절제. → *어휘는 암기 가능*, *순서는 반응 적응*. 순수 암기와 순수 반사 사이의 스위트스폇.
- ECHORIS `System_ItemWorld_Boss.md`의 "가중 랜덤 풀에서 선택(Behavior Tree)" 방향과 정합. 거리 기반 패턴픽(Boss01 구현) + 가중 셔플 권장.

---

## 8. 아레나 / 공간 설계

| 원칙 | 내용 | 예 |
|:-----|:-----|:---|
| 경계 갇힌 케이지 | 벽이 듀얼을 한정, 측면 해저드가 과욕 처벌 | Mantis(양측 가시 구덩이) |
| 벽 = 메커닉 | 플레이어 벽클링 회피, 보스 벽 발사·튕김 | Mantis 부메랑, MMX 벽점프, Armadillo |
| 단일 평면 미니멀(고난도) | 지형 크러치 제거, 순수 스페이싱 | Godhome Nightmare King |
| 바닥 봉쇄 → 수직 강제 | 전바닥 공격이 이동 능력(이단점프·대시·다이브) 필수화 | Shriek P2, Mora P3 |
| 파괴되는 아레나 = 에스컬레이션 | 위상마다 발판 파괴 → 공중전 피날레 | Shriek P3-P4 |
| 건틀릿 스폰 스로틀 | add 동시 수 캡으로 공정 유지 | Watcher Knights(총 6, 동시 2) |
| **저작 아레나 ≠ 절차적 경로** | 절차적 게임도 **보스룸은 핸드크래프트·일관**되게 → 암기·파밍 가능 | Dead Cells(경로는 절차적, 보스룸은 고정) |

> **ECHORIS 직접 함의:** 아이템계는 절차적이지만 **보스룸(엔드룸)은 일관된 저작 아레나**여야 파밍 학습이 성립. 경계를 두어 "무조건 회피" 광역 공격에 항상 수직/거리 해답을 보장.

---

## 9. ECHORIS 적용 권고 (보스 아키타입 SSoT 채우기)

`System_Enemy_BossArchetype.md` 골격을 다음으로 채울 것을 권고:

1. **보스 아키타입 정식 축 = `[형태 11종] × [등급 4계층] × [본체 무기 템플릿]`.** 형태는 §1의 B1~B11에서 채택(시드 5종 + 신규 비행/텔레포터/약점부위/건틀릿). 등급은 기존 장군/왕/신/대신.
2. **보스 패턴 아키타입 = §2의 6분류 × 세부.** `System_ItemWorld_Boss.md` "6분류×25서브"의 25 빈칸을 §2 세부 패턴으로 확정.
3. **약점부위(B6) 1순위 도입.** 메트로베니아 공격 문법 핵심. 렐릭/무기로 약점 개방 윈도우 공략 = 능력 게이트 루프 강화.
4. **스케일링 = BSC 위상 압축(§5).** Tier 폐기 결정과 정합 — 등급/지층은 수치+위상 압축으로, HP 인플레 금지.
5. **3단 가독성 + `빨강=막을 수 없음`(§3.3)** 을 보스 텔레그래프 표준으로 명문화.
6. **위상 전환은 약점 이동/정답 무효화 우선(§4).**
7. **패턴 풀 = 가중 셔플(§7),** 고정 루프 금지.

---

## 10. 출처 (Sources)

### Hollow Knight / Ori
- [Mantis Lords](https://hollowknight.wiki/w/Mantis_Lords) · [Nightmare King Grimm](https://hollowknight.wiki/w/Nightmare_King_Grimm) · [Pure Vessel](https://hollowknight.wiki/w/Pure_Vessel) · [Watcher Knights](https://hollowknight.wiki/w/Watcher_Knights)
- [Ori WotW Bosses Guide (GamesHedge)](https://www.gameshedge.com/ori-and-the-will-of-the-wisps-bosses-guide/) · [Mora (Twinfinite)](https://twinfinite.net/guides/ori-will-of-the-wisps-spider-boss-fight-mora/) · [Shriek (NoobFeed)](https://www.noobfeed.com/articles/ori-and-the-will-of-the-wisps-boss-guide-shriek)
- [HK design lesson (Medium)](https://dimasgibi.medium.com/hollow-knight-a-lesson-in-game-design-8cc4ff8aa1cd) · [HK philosophy (Game Developer)](https://www.gamedeveloper.com/design/the-surreal-philosophy-of-hollow-knight)

### Castlevania / Bloodstained
- [Castlevania Crypt — SotN/OoE/AoS Bosses](https://www.castlevaniacrypt.com/sotn-bosses/) · [Dracula/Forms (Wiki)](https://castlevania.fandom.com/wiki/Dracula/Forms) · [Slogra](https://castlevania.fandom.com/wiki/Slogra)
- [Source Gaming — Dracula breakdown](https://sourcegaming.info/2022/07/04/big-baddies-breakdown-dracula-castlevania-series/) · [OoE Boss Guide (GameFAQs)](https://gamefaqs.gamespot.com/ds/945837-castlevania-order-of-ecclesia/faqs/54930)
- [Bloodstained Bosses (TheGamer)](https://www.thegamer.com/bloodstained-ritual-of-the-night-every-boss-how-to-beat-them/) · [Gremory/Bael (Nintendo Life)](https://www.nintendolife.com/guides/bloodstained-walkthrough-part-13-gremory-dominique-and-bael-boss-fights)

### Metroid / Axiom Verge / Guacamelee
- [Super Metroid bosses (TheGamer)](https://www.thegamer.com/super-metroid-main-boss-guide/) · [Metroid Recon](https://metroid.retropixel.net/games/metroid3/bosses.php)
- [Dread bosses (Omega Metroid)](https://omegametroid.com/metroid-dread-walkthrough/bosses/) · [Raven Beak (Nintendo Life)](https://www.nintendolife.com/guides/metroid-dread-raven-beak-final-boss-battle-how-to-beat-raven-beak) · [Melee Counter (Game8)](https://game8.co/games/MetroidDread/archives/345827)
- [Axiom Verge boss review (CritPoints)](https://critpoints.net/2016/12/19/axiom-verge-boss-review/) · [Guacamelee Calaca (Wiki)](https://guacamelee.fandom.com/wiki/Carlos_Calaca) · [Guac 2 boss guide (Gamepur)](https://www.gamepur.com/guides/guacamelee-2-boss-fight-tips)

### Cuphead / Mega Man X
- [Cuphead Boss Design (Epilogue Gaming)](https://epiloguegaming.com/cupheads-boss-design/) · [Cuphead Attack Patterns (Atomic Bob-Omb)](https://atomicbobomb.home.blog/2019/05/18/cuphead-attack-patterns/) · [Frame anticipation rule (Menard, Medium)](https://medium.com/@menardisaac/how-i-created-a-new-cuphead-boss-a6f71f8687c2)
- [MMX1 Bosses (retropixel)](https://megaman.retropixel.net/mmx/1/bosses.php) · [MMX weakness chain (Gameranx)](https://gameranx.com/features/id/157331/article/mega-man-x-legacy-collection-how-to-beat-every-boss-all-weaknesses-guide/)

### Dead Cells / Blasphemous / Salt and Sanctuary / Messenger / Shovel Knight
- [Dead Cells Bosses](https://deadcells.wiki.gg/wiki/Bosses) · [Concierge](https://deadcells.wiki.gg/wiki/The_Concierge) · [Time Keeper](https://deadcells.wiki.gg/wiki/Time_Keeper) · [Conjunctivius](https://deadcells.wiki.gg/wiki/Conjunctivius) · [Parry/unblockable 규약](https://deadcells.fandom.com/wiki/Parry_Shield)
- [Blasphemous boss design notes (snoukdesignnotes)](https://snoukdesignnotes.blog/2021/06/30/boss-design-ft-blasphemous/) · [Blasphemous Bosses (Fextralife)](https://blasphemous.wiki.fextralife.com/Bosses) · [Blasphemous 2 Bosses](https://blasphemous2.wiki.fextralife.com/Bosses)
- [Salt and Sanctuary Bosses (Fextralife)](https://saltandsanctuary.wiki.fextralife.com/Bosses) · [The Messenger Bosses](https://the-messenger.fandom.com/wiki/Bosses) · [Shovel Knight Order of No Quarter](https://shovelknight.fandom.com/wiki/Order_of_No_Quarter)

> **방법론 주석:** 5개 게임군을 병렬 에이전트로 동시 조사 후 단일 분류로 종합. 일부 Fandom 페이지는 자동 fetch에 403을 반환해 검색 인덱스 요약 + 확립된 게임 지식으로 교차 검증함. 정확한 프레임 단위 텔레그래프 타이밍은 공개 출처에 없어 캡처/데이터마이닝이 필요하다.
