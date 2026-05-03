# 아이템계 깊이 다이브 — 다지층 연속성·탐험·진척 강화 (Deep Dive)

> **문서 ID:** DES-IW-DIVE-01
> **문서 상태:** Confirmed (DEC-039, 2026-05-02 안 D 채택)
> **작성일:** 2026-05-01 (개정 2026-05-02 — 안 D 수직 딥 다이브 그래프 추가)
> **선행 문서:**
> - `Documents/Design/Design_ItemWorld_Town_Shadow.md` (DES-IW-TOWN-01) — 마을 의미 레이어
> - `Documents/System/System_ItemWorld_Core.md` — 시스템 코어
> - `Documents/System/System_ItemWorld_FloorGen.md` — RoomGraph 절차 생성
> - `memory/wiki/decisions/DEC-037-Item-World-Topology-AntColony.md` — Hub-and-Spoke
> - `memory/wiki/decisions/DEC-038-Town-of-Orphaned-Shadows.md` — 마을 의미 결정
> - `Reference/Metroidvania Game Design Deep Dive.md` — 메트로베니아 장르 분석
> - `Reference/Disgaea_ItemWorld_Reverse_GDD.md` — 디스가이아 원형
> - `Reference/Spelunky-LevelGeneration-ReverseGDD.md` — 스펠렁키 원형
>
> **연관 코드:**
> - `game/src/level/RoomGraph.ts`, `game/src/scenes/ItemWorldScene.ts`
> - `game/src/ui/DepthGauge.ts` — 좌측 수직 깊이 게이지

---

## 0. 의사결정 요약

### 문제 정의

현재 아이템계는 **지층(Stratum) 단위 절차 생성 + 보스 처치 = 다음 지층 전이** 구조다. 이는 디스가이아 원형이지만, ECHORIS 의 메트로베니아·플랫포머 정체성과 정합하지 않는다. 사용자 진단 (2026-05-01):

> "보스를 처치하면 2층으로 가는 거야. 이건 디스가이아스러운데, 메트로베니아나 플랫포머스럽진 않아. 맥락이 끊어지는 느낌이야. 층을 계속 내려가는 플랫포머도 없는 거 같아."

### 한 줄 결론 (제안)

> **아이템계는 단절된 N개의 던전이 아니라, 한 자아의 거대 공동(Megastructure) 을 점점 깊이 내려가는 단일 다이브다.** 지층 경계는 instance break 가 아니라 **마스킹된 폴 다운(masked fall-down) 또는 게이트 통과**로 봉합한다. 마을(Plaza) 은 각 지층 입구에 놓인 정착지가 아니라 **다이브 진행에 따라 점점 깊어지는 같은 공동의 다른 단면**이다.

### 핵심 강화 축 3개

| 축 | 현재 | 제안 |
| :--- | :--- | :--- |
| **연속성** | 보스 처치 → 페이드 → 새 절차 생성 | 보스 게이트 → 폴 다운 연출 → 다음 지층 즉시 노출 |
| **탐험감** | 지층 내 그래프 탐색만 | 위 지층의 흔적이 아래에서 보임 (수직 시선) + 깊이 상시 표시 |
| **진척감** | 지층 보스 처치 = 다음 지층 해금 | + 영구 마을 상태 (회상한 그림자·격파 보스 사체·열린 문 누적) |

---

## 1. 현재 모델 진단

### 1.1 구조

```
[월드 세이브포인트에서 아이템 선택]
  ↓
[Stratum 1: RoomGraph 절차 생성, hub-and-spoke]
  ↓ [Stratum Boss 격파]
  ↓ [StratumClearOverlay → 페이드 → 새 RoomGraph 재생성]
[Stratum 2: 새 RoomGraph]
  ↓ [Boss 격파]
[... Stratum N (레어리티별 2~4)]
  ↓ [최종 Boss = Core Memory]
[월드 귀환]
```

### 1.2 강점

- 지층마다 다른 절차 생성 → 무한 야리코미 가능 (디스가이아 강점 보존)
- DEC-037 hub-and-spoke + DEC-038 마을 메타포 → 각 지층이 자체 완결된 풍경
- 1인 개발 친화 (지층 단위 폴리시)

### 1.3 약점 (사용자 진단 기반)

| 약점 | 증상 | 영향 |
| :--- | :--- | :--- |
| **컨텍스트 단절** | 보스 처치 → 페이드 → 새 맵. "다른 던전에 들어왔다" 인지 | 메트로베니아 단일 세계 정체성 약화 |
| **수직 다이브 부재** | 모든 지층이 평면 그래프. "내려간다" 감각 없음 | 스파이크 ("아이템에 들어가면 살아있는 세계가 있다") 의 *깊이* 차원 약화 |
| **마을 반복** | 지층마다 같은 Plaza 메타포 등장 → 누적 무게감 부재 | DEC-038 의 잔류 신호 메타포 효과 희석 |
| **진척 휘발** | 지층 클리어 시 그래프가 사라짐. 흔적 0 | 메트로베니아의 "내가 이 세계를 누볐다" 감각 부재 |
| **레벨감 부재** | "더 깊이 내려간다" 가 깊이 게이지 외 시각 신호 없음 | Made in Abyss 풍 압박감 부재 |

### 1.4 디스가이아 모델이 ECHORIS 에 맞지 않는 이유

디스가이아의 아이템계는 **턴제 + 캐릭터 위주 RPG** 컨텍스트에서 작동한다. 던전은 통계 인플레의 무대이고 시각적 연속성은 부차적이다. 반면 ECHORIS 는:

- **횡스크롤 액션 메트로베니아** — 공간 인지가 즉각적이고 연속적이어야 한다
- **BLAME!/메이드 인 어비스 톤** (CLAUDE.md, DEC-038) — 거대 수직 구조와 깊이 압박이 핵심 정서
- **2-Space 분리 모델** — 아이템계 자체가 *세계* 여야 한다 (인스턴스가 아니라)

따라서 디스가이아의 instance-break 패턴은 **장르적 부정합**이다.

---

## 2. 레퍼런스 전수조사

총 24 작품 4 카테고리. 모든 인용 [확인함] / [추측임] 태그.

### 2.1 메트로베니아 — 단일 연결 맵 (Instance Break 0)

#### A1. Hollow Knight (Team Cherry, 2017) [확인함]
- **구조:** Dirtmouth (지표 마을) → Forgotten Crossroads → City of Tears → Deepnest → The Abyss. 단일 연결 맵, 지층 경계 무.
- **수직 다이브 처리:** 엘리베이터 (King's Station ↔ City of Tears), 깊은 우물(Crossroads), Stagway 수직 이동. 플레이어가 *내려간 거리*를 명시적으로 인지.
- **마을:** Dirtmouth (1개) + 부분적 거점 (Hot Springs, Resting Grounds, Distant Village). 지표 마을 1개에 모든 NPC 누적.
- **진척:** 지도가 영구 갱신. 지름길(Shortcut) 잠금 해제로 다이브 시간 단축. 보스 처치 = 영구 (사체 잔류, 시체에서 회상 가능).
- **인스피레이션:** *지층 = 같은 세계의 더 깊은 단면*. 위 지층에서 비/안개가 떨어지는 시각 단서.

#### A2. Castlevania: Symphony of the Night (Konami, 1997) [확인함]
- **구조:** 단일 성. 후반 Inverted Castle (반전 성) 으로 두 번째 풀 맵 해금.
- **다이브 처리:** Catacombs 가 가장 깊은 지점. Underground Caverns 통한 수직 하강.
- **트릭:** Reverse Castle 은 *같은 공간의 다른 시간/차원* 으로 해석되어 instance-break 없이 게임 길이 2배.
- **인스피레이션:** "맵 자체는 하나이지만 의미가 누적된다" 패턴.

#### A3. Cave Story (Studio Pixel, 2004) [확인함]
- **구조:** Mimiga Village → Egg Corridor → Grasstown → Sand Zone → Plantation → Sacred Grounds (Hell). 수직 하강 다이브.
- **마을:** Mimiga Village (지표) 가 영구 거점. NPC 가 다이브 진행에 따라 변화 (납치/구출/사망).
- **인스피레이션:** *마을 NPC 가 다이브 진행에 따라 *상태 변화* — 단순 재방문이 아닌 *서사적 누적*.

#### A4. Salt and Sanctuary (Ska Studios, 2016) [확인함]
- **구조:** 단일 섬. 메트로베니아 + 소울즈. Sodden Knight → Bloodless Prince → 다양한 보스.
- **마을:** Sanctuary (다수). 신앙 선택에 따라 NPC 가 변하는 모드 거점.
- **인스피레이션:** *Sanctuary 다중 배치* — 하나의 마을이 아니라 다이브 깊이별 분산 거점. ECHORIS 다지층 마을 분포 패턴 후보.

#### A5. Animal Well (Billy Basso, 2024) [확인함]
- **구조:** 단일 그리드 맵. 수직·수평 모두 활용. XP/레벨 0.
- **다이브:** 명시적 깊이 게이지 없음. 그러나 *플레이어 인지로 형성되는 깊이감* — 지도 가장자리에 도달했을 때 압박.
- **인스피레이션:** *시각 신호 (벽지 색·음향) 만으로 깊이 인지 가능*.

#### A6. Blasphemous (The Game Kitchen, 2019) [확인함] — 차별화 레퍼런스
- **구조:** 단일 연결 맵. 고딕 다크 판타지 (CLAUDE.md 금지 톤).
- **참조 한정:** ECHORIS 차별화를 위해 *어떻게 다르게 할지* 만 참조. 메커니즘은 차용 안 함.

#### A7. Ori and the Will of the Wisps (Moon Studios, 2020) [확인함]
- **구조:** 단일 연결 맵. Mouldwood Depths, Luma Pools 등 수직 다이브 구간 다수.
- **마을:** Wellspring Glades (1개). 다이브 후 귀환·강화·거래.
- **인스피레이션:** *수직 다이브 구간이 메인 진행 축의 일부*. 마을은 hub 1개로 통합.

#### A8. Death's Gambit (White Rabbit, 2018) [확인함]
- **구조:** 단일 맵 메트로베니아 소울즈. 산 정상 → 동굴 깊이 다이브.
- **인스피레이션:** *상승·하강 양방향 다이브*. 수직축이 게임 길이의 중심.

### 2.2 수직 하강 플랫포머·디그 게임

#### B1. Spelunky / Spelunky 2 (Mossmouth, 2008/2020) [확인함]
- **구조:** 절차 생성 단일 화면. 화면 하단 출구로 *떨어져* 다음 레벨로. 페이드 아웃 0.5초 + "Level 1-2" 텍스트만.
- **인스턴스:** 죽으면 처음부터. 한 시도 내에서는 연속.
- **인스피레이션:** **마스킹된 폴 다운** — 출구가 *문* 이 아니라 *바닥의 구멍*. 시각적 "내려간다" 가 즉각 전달.
- **ECHORIS 적용성:** 보스 처치 후 instance break 대신 *보스가 떨어진 자리에 구멍*. 플레이어가 떨어져 다음 지층 진입.

#### B2. Downwell (Moppin, 2015) [확인함]
- **구조:** 무한 수직 다이브. 보스 0 (최종 보스 1개만). 휴식방(상점) 사이로 분절되지만 컷 없음.
- **인스피레이션:** *보스 = 다이브 차단 막* 이 아니라 *상점 = 깊이 단면 중간 거점*.

#### B3. Noita (Nolla Games, 2020) [확인함]
- **구조:** 픽셀 단위 절차 다이브. 바이옴 띠 (Mines → Coal Pits → Snowy Depths → Hiisi Base → Underground Jungle → Vault → Temple of the Art → Lab → The Work). 각 띠 사이 *벽 한 줄*만이 경계.
- **인스피레이션:** **바이옴 띠 패턴** — 지층 경계가 *얇은 벽 1개*. 플레이어가 직접 뚫고 내려감. 보스 처치 + 바닥 함정문 강제 다음 지층.
- **ECHORIS 적용성:** Stratum N 의 보스 룸 바닥 = Stratum N+1 천장. 폴 다운 즉시 전이.

#### B4. Terraria (Re-Logic, 2011) [확인함]
- **구조:** 2D 샌드박스. 깊이 띠 (Surface → Underground → Cavern → Underworld). 깊이는 *플레이어가 직접 판 수직 갱(Hellevator)* 으로 단번에 도달.
- **인스피레이션:** **수직 갱(shaft)** — 단일 수직 통로가 모든 깊이를 관통. 플레이어가 직접 만든 다이브 라인.

#### B5. Steamworld Dig 2 (Image & Form, 2017) [확인함]
- **구조:** 지표 마을(Yarrow) + 깊이 다이브 + 귀환 루프.
- **마을 진척:** 다이브 자원으로 마을 NPC 가 점차 활성화. 마을 자체가 *다이브 함수의 결과* 로 진화.
- **인스피레이션:** **마을-다이브 루프** + **마을 진척 상태 기록**. ECHORIS 의 Plaza 가 다이브 사이클마다 변화하는 안.

#### B6. Dome Keeper (Bippinbits, 2022) [확인함]
- **구조:** 거점(Dome) 방어 + 짧은 다이브 사이클. 거점 = 영구, 다이브 = 휘발.
- **인스피레이션:** *거점 영구 / 다이브 휘발* 의 시간 분리. ECHORIS 의 World ↔ Item World 구조와 동형.

#### B7. A Robot Named Fight (Matt Bitner, 2017) [확인함]
- **구조:** 절차 생성 메트로베니아. Spelunky + Super Metroid 하이브리드.
- **인스피레이션:** *절차 생성과 메트로베니아의 결합 가능성 증명*. 단일 시도 내에서는 인스턴스 깨짐 없음.

### 2.3 깊이 내러티브 (Descent Metaphor)

#### C1. Made in Abyss (Akihito Tsukushi, 2012~) [확인함, 프로젝트 1차 레퍼런스]
- **구조:** 지표 마을 Orth 도시 + 거대 수직 공동 (Abyss). 7 지층 내려갈수록 **저주(귀환 비용)** 증가. 6층 이하부터 귀환 불가.
- **마을:** Orth (1개, 지표). 다이브는 항상 Orth 에서 출발.
- **진척:** 라이센스 등급으로 합법적 진입 깊이 해금.
- **인스피레이션:** **깊이 = 비용 누적**. 단순 난이도가 아니라 **귀환에도 비용**. 지층 1과 7은 같은 공동의 다른 단면.

#### C2. BLAME! (弐瓶勉, 1997~2003) [확인함, DEC-038 1차 레퍼런스]
- **구조:** 거대 메가스트럭처. 빌더의 자동 증식으로 깊이가 정의 불가. 키리이는 *위·아래 방향 자체가 의미를 잃은 공간* 을 떠돈다.
- **인스피레이션:** *깊이 = 절대 거리가 아니라 자아 잔류 신호의 농도 변화*. ECHORIS 의 다지층은 BLAME! 의 *층 구분 모호함* 패턴 차용 가능.

#### C3. ULTRAKILL (Arsi "Hakita" Patala, 2020~) [확인함]
- **구조:** Layers of Hell (Limbo → Lust → Gluttony → Greed → Wrath → Heresy → Violence → Fraud → Treachery + Prelude/Prime). 각 Layer 4 sub-level + 1 Boss + 1 Prime Sanctum.
- **번호 체계:** `P-1, 1-1, 1-2, 1-3, 1-4 BOSS, 2-1, ...` — 명시적 위계.
- **전이:** Layer 끝 → 보스 → "ENTERING LAYER N" 풀스크린 텍스트 + 짧은 cutscene → 다음 Layer. 컷이 있지만 *서사적 의도된 컷*.
- **인스피레이션:** **번호화된 위계** + **컷이 서사 자산**. ECHORIS 도 컷을 숨기지 않고 *가치 있는 모멘트* 로 만들 수 있다.

#### C4. Dark Souls (FromSoftware, 2011) [확인함]
- **구조:** Firelink Shrine → Undead Burg → Lordran 전체 → Anor Londo (상승) → Tomb of Giants (최저 깊이).
- **다이브:** Anor Londo 에서 엘리베이터 단 하나로 The Duke's Archives → Crystal Cave → Catacombs → Tomb of Giants 까지 누적 하강.
- **인스피레이션:** **단일 거점 + 방사형 분기 + 깊이 누적**. Firelink = ECHORIS 의 World 세이브포인트와 동형.

#### C5. Dante's Inferno (1320, 메타포 원형) [확인함]
- **구조:** 9 지옥의 환(circle). 림보 → 색욕 → 식탐 → 탐욕 → 분노 → 이단 → 폭력 → 사기 → 배신.
- **인스피레이션:** **죄목별 테마 지층**. ULTRAKILL 이 직접 차용. ECHORIS 의 5색 기질(Forge/Iron/Rust/Spark/Shadow, DEC-036) 도 동형 — *기질별 지층 테마* 가능.

#### C6. Returnal (Housemarque, 2021) [확인함]
- **구조:** 6 바이옴 (Overgrown Ruins → Crimson Wastes → Derelict Citadel → Echoing Ruins → Fractured Wastes → Abyssal Scar). 죽으면 1바이옴부터 재시작 (단축 가능).
- **인스피레이션:** **죽음 = 즉시 0지점 회귀** + **메타 진척만 영구**. ECHORIS 와 다른 모델이지만 *영구/휘발 분리* 의 한 극단 사례.

### 2.4 마을·거점 다이브 루프

#### D1. Hades (Supergiant, 2020) [확인함]
- **구조:** House of Hades (영구 거점) + Tartarus → Asphodel → Elysium → Styx (휘발 다이브). 죽음 = House 귀환.
- **마을 진척:** 거점 NPC 와의 관계가 다이브 결과물(Nectar/Ambrosia) 로 점진 발전. 마을 자체가 *시간 함수*.
- **인스피레이션:** **House 패턴** — 영구 거점 1개 + 휘발 다이브 N개. ECHORIS 의 World 세이브포인트가 House 역할 가능.

#### D2. Hades II (Supergiant, 2024~) [확인함]
- **구조:** Crossroads (영구 거점) + 양방향 다이브 (Underworld 하강 + Mount Olympus 상승).
- **인스피레이션:** **양방향 다이브** — 동일 거점에서 두 방향. ECHORIS 적용 어려움 (수직 1방향 정체성). 참조만.

#### D3. Disgaea Item World (NIS, 2003~) [확인함, ECHORIS 원형]
- **구조:** 아이템 진입 → Floor 1 → ... → Floor 100 (Innocent Town: Floor 10/20/30/...). 한 다이브 내 인스턴스 break 0. 한 floor 클리어 = 다음 floor 자동 폴 다운.
- **재발견:** 디스가이아 자체는 *floor 간 instance break 가 없다*. **현재 ECHORIS 가 디스가이아보다 더 단절적**. → 디스가이아도 폴 다운 마스킹 사용.
- **인스피레이션:** 원형 자체에 *마스킹 전이* 가 이미 내장. ECHORIS 가 이를 잃었음.

#### D4. The Binding of Isaac (Edmund McMillen, 2011) [확인함]
- **구조:** 각 Floor 절차 생성 + Trapdoor 로 다음 Floor 폴 다운. 페이드 아웃 + 짧은 텍스트.
- **인스피레이션:** **Trapdoor 패턴** — 보스 처치 후 *바닥의 함정문* 이 다음 floor 로 떨어뜨림. 가장 단순하면서 효과적인 마스킹.

#### D5. Slay the Spire (Mega Crit, 2019) [확인함]
- **구조:** 3 Act 노드 사다리. 카드 게임이지만 *위계 다이브* 의 추상화로 가치.
- **인스피레이션:** *Act 사이 명시적 보스* + *Act 별 테마 차이*. ECHORIS 가 이미 가까운 패턴.

---

## 3. 패턴 추출 (6 패턴)

24 작품에서 추출한 다이브 연속성·마을·진척 패턴.

### P1. 마스킹 폴 다운 (Masked Fall-Down)
**원형:** Spelunky / Isaac / Disgaea / Noita
**메커니즘:** 지층 종료 = 보스 룸 바닥 함정문 → 짧은 컷 (≤ 1초) → 다음 지층 천장에서 떨어져 입장.
**효과:** 컷은 있지만 *방향성 (아래로)* 이 유지되어 컨텍스트 봉합.
**ECHORIS 적용 비용:** 낮음. StratumClearOverlay 를 폴 다운 연출로 교체.

### P2. 단일 거대 공동 + 자동 깊이 인지 (Megastructure Single Cavity)
**원형:** BLAME! / Made in Abyss / Hollow Knight Abyss / Hollow Knight Crystal Peak
**메커니즘:** 모든 지층이 *같은 거대 구조의 다른 단면*. 위 지층의 흔적(소리·빛·구조물 그림자) 이 아래에서 보임.
**효과:** "내려왔다" 감각 누적. 메트로베니아 단일 세계 정체성.
**ECHORIS 적용 비용:** 중간. 천장/배경 레이어에 *위 지층 그림자* 한 장만 깔아도 효과.

### P3. 영구 마을 + 휘발 다이브 (Persistent Hub + Volatile Dive)
**원형:** Hades / Steamworld Dig 2 / Dome Keeper / Dark Souls Firelink
**메커니즘:** 거점 1개 영구 + 다이브 결과 누적. 마을 NPC·시각 상태가 다이브 함수로 변화.
**효과:** "내가 이 무기에서 누적으로 무엇을 했는가" 가 마을에 시각화.
**ECHORIS 적용 비용:** 중상. DEC-038 마을 그림자 잔류 상태에 *다이브 횟수·회상 비율* 매핑.

### P4. 깊이 = 비용 누적 (Depth = Cost Accumulation)
**원형:** Made in Abyss (저주) / Dark Souls Tomb of Giants (불 없음)
**메커니즘:** 깊을수록 단순 난이도가 아니라 *귀환·자원·시야* 비용 증가.
**효과:** 깊이가 *수치* 가 아니라 *체감 압박*.
**ECHORIS 적용 비용:** 낮음. Flask 충전 0 / 시야 축소 / Recall 슬롯 잠금 등 1-2개 변수.

### P5. 번호화된 위계 + 서사 컷 (Numbered Layers + Narrative Cuts)
**원형:** ULTRAKILL / Dante's Inferno / Slay the Spire
**메커니즘:** 지층마다 명시 번호·이름·테마. 전이 컷을 *숨기지 않고* 서사 모멘트로.
**효과:** 컷이 약점이 아닌 자산.
**ECHORIS 적용 비용:** 낮음. StratumClearOverlay 를 *Stratum N 진입* 컷으로 의미화.

### P6. 진척 영구화 (Permanent Progress Marker)
**원형:** Hollow Knight 지도·시체·지름길 / SOTN Inverted Castle
**메커니즘:** 격파한 보스 사체·열린 문·발견한 단편이 영구 잔류. 재방문 시 즉시 인지.
**효과:** 메트로베니아 *세계 누적* 감각.
**ECHORIS 적용 비용:** 중상. 무기별 영구 상태(지층별 보스 처치 / Recalled 단편 / 발견한 방) 데이터 구조 확장.

---

## 4. ECHORIS 진단 매트릭스

| 패턴 | 현재 | 이상 | 갭 |
| :--- | :---: | :---: | :--- |
| P1 마스킹 폴 다운 | ✗ (페이드 + 새 그래프) | ✓ | StratumClearOverlay → Trapdoor 연출 |
| P2 단일 거대 공동 | ✗ (지층 평면) | ◐ | 천장 배경에 위 지층 그림자만 추가 |
| P3 영구 마을 + 휘발 다이브 | ◐ (마을 메타포만 영구) | ✓ | DEC-038 마을 그림자에 *다이브 누적 상태* 매핑 |
| P4 깊이 = 비용 | ◐ (난이도 곡선만) | ✓ | Flask·Recall·시야 1-2 변수 추가 |
| P5 번호화 컷 | ◐ (Stratum N 표기 있음) | ✓ | 컷의 서사 가치 강화 |
| P6 진척 영구화 | ✗ (지층 휘발) | ✓ | 무기별 영구 상태 누적 |

**결론:** P1·P5 는 즉시 적용 가능 (저비용·고효과). P2·P3·P4 는 중기. P6 는 장기 (데이터 구조 확장).

---

## 5. 적용 후보안

### 안 A. Megastructure Shaft (단일 수직 공동)

**개념:** 모든 지층이 같은 무기 자아의 거대 공동을 점점 깊이 내려가는 단면. **지층 간 전이** = 폴 다운.

**적용 범위 (중요):**
- 폴 다운은 **Stratum N → N+1 지층 간 전이에만 적용**.
- **Stratum 1 진입은 현행 페이드 유지.** 사유: 이전 빌드 "납치되는 느낌" 피드백. 동의·예고·문맥 (DES-IW-ONB-01) 보존.

**핵심 변경:**
1. StratumClearOverlay → **Trapdoor + Fall Animation** (Stratum N 보스 룸 바닥 = Stratum N+1 천장). Stratum 1 진입은 변경 없음.
2. 천장 배경에 *위 지층 그림자 레이어* 1장 (BLAME! 톤, 청록 점광). Stratum 2 이상에만 적용.
3. DepthGauge 를 stratum-spanning 으로 확장 (현재 2-tier 인지 확인 필요)
4. Stratum 진입 컷 = "ENTERING DEPTH N" 풀스크린 텍스트 (ULTRAKILL 패턴, 1초). Stratum 2 이상에만.

**장점:** P1·P2·P5 동시 충족. DEC-038 BLAME! 메타포 강화.
**단점:** 현재 그래프 구조 무수정 가능하지만 *천장-바닥 연결* 시각 자산 필요.
**비용:** 낮음~중간 (1주 폴리시 작업).

### 안 B. Persistent Town + Dive Loop (영구 마을 진척)

**개념:** 무기당 마을이 영구 상태를 누적. 다이브 횟수·회상 비율·격파 보스가 마을 시각·NPC 동작을 변화.

**핵심 변경:**
1. 무기별 *마을 상태 데이터* 추가:
   - `divesCompleted: number` (다이브 횟수)
   - `recalledShardIds: Set<string>` (영구 회상한 단편)
   - `defeatedBossStrata: Set<number>` (격파한 지층)
2. Plaza 시각 변주:
   - 다이브 1회 = 배경 그림자 +5 (DEC-038 §2.3 의 인원 변주를 영구화)
   - Recalled 50% 도달 = Archivist 메모리 코어 광점 강도 ↑
   - Boss 격파 지층 수 = Plaza 의 봉인된 문 1개 영구 개방
3. Ego 발화 분기 확장:
   - 1회차 / 5회차 / 10회차 / 20회차 / 50회차 동일 무기 진입 시 다른 톤

**장점:** P3·P6 동시 충족. 야리코미 정체성 강화.
**단점:** 데이터 구조 확장 필요. 1차 구현 비용 중상.
**비용:** 중간 (2주 작업).

### 안 C. Depth as Cost (깊이 비용 누적)

**개념:** 깊이가 단순 난이도가 아니라 자원·시야·기능 비용으로 누적.

**핵심 변경:**
1. **Flask 충전 감소 곡선**: Stratum 1 = 3, Stratum 2 = 3, Stratum 3 = 2, Stratum 4 = 1, Stratum 심연 = 0 (귀환 불가 / 영구 클리어 시 보상 이중)
2. **시야 축소** (선택): 깊은 지층일수록 화면 가장자리 어두워짐 (vignette)
3. **Recall 잠금** (선택): Stratum 3 이하부터 일부 슬롯 잠금 → 보스 처치 시 일시 해제

**장점:** P4 충족. Made in Abyss 톤 강화.
**단점:** 밸런스 재조정. 플레이테스트 필수.
**비용:** 중간 (밸런스 작업 1주 + 플레이테스트 1회).

### 안 D. 수직 딥 다이브 그래프 (Vertical Dive Graph) — **채택**

**개념:** 그래프 토폴로지 자체를 *수직* 으로 재정의. Plaza 가 *맨 위*, Boss 가 *맨 아래*. 지층 전이는 보스 룸 바닥 Trapdoor 포탈 능동 인터랙트로 다음 지층 Plaza 천장에 낙하.

**그래프 구조:**

```
[Stratum N Plaza]   ← 천장 파괴 (위에서 떨어져 들어옴)
   ├─ L → [Lane] ─ [Treasure / Combat / Rest / Puzzle]
   ├─ R → [Lane] ─ [Combat / Treasure / Combat]
   └─ D → [Combat] ─ [Combat] ─ [Boss]
                                  │ (처치 후 포탈 활성)
                                  ▼ 인터랙트 → 바닥 물리 붕괴 → 낙하
[Stratum N+1 Plaza] ← 천장 파괴
   ...
```

**핵심 변경:**

1. **그래프 = 수직 딥 다이브** — Plaza 1개(top, hub) + Boss 1개(bottom, boss) + 사이의 분기 가지. 기존 DEC-037 hub-and-spoke 방사형 폐기. critical path = D 우선, 분기 = LR.
2. **Plaza 룸 = LRD only** — Plaza 룸 prefab 의 위(U) 출구 *제거*. 천장 파괴 시각으로 다이브 진입 흔적 표현. LDtk Plaza prefab 분류 갱신.
3. **Boss 룸 = LRU + 처치 후 D 활성** — Boss 룸 prefab 진입은 LRU. 처치 후 바닥에 Trapdoor 포탈 entity 활성 (오렌지 단조열 빛기둥 + SFX). 인터랙트로 바닥 물리 붕괴.
4. **전이 = 능동 포탈 인터랙트** — 보스 처치 자동 폴 다운 X. 포탈을 능동 인터랙트해야 발동. DES-IW-ONB-01 동의·예고·문맥 3요소가 지층 간 전이까지 자연 확장.
5. **Stratum 1 첫 진입 = 페이드 유지** — *"납치되는 느낌"* 피드백 (2026-05-01) 으로 결정 확정. 페이드 후 Plaza 에 *이미 떨어져 들어온* 상태로 시작 (천장 부서짐 시각 일관).
6. **Archive(shrine) = critical path 외 분기 가지 끝** — Plaza 흡수 X. 다이브 중 LR 분기로 발견. DEC-038 안전지대 약속 보존 (적 spawn 0).
7. **부수 효과** — 모든 Plaza 천장이 부서졌으므로 위 지층 그림자 parallax 가 자연 노출. 별도 시각 룰 추가 없이 P2 (단일 거대 공동) 자동 충족. "DEPTH N / MAX" 풀스크린 텍스트는 Stratum 2+ Plaza 진입 시 1초.

**장점:**
- **그래프·다이브 충돌 자체를 토폴로지로 봉합.** 광장 vs 다이브 감성의 모순이 *층위 차* 로 전환.
- **이전 안 C "광장 의례" 자동 흡수.** 광장이 *지층 시작* 이 되어 다음 다이브의 자연 준비 공간이 됨. 보스 후 귀환 워프 *불필요*.
- **DEC-038 그림자 마을 메타포 보존 + 강화.** Gatekeeper/Archivist/Ambient 캐스팅 무수정. Plaza 부서진 천장 = "위에서 그림자가 잔류 신호로 떨어져 내려온다" 의 시각화.
- **P1·P2·P5 동시 충족.** 마스킹 폴 다운 + 단일 메가스트럭처 + 번호화 위계.

**단점:**
- DEC-037 hub-and-spoke 토폴로지 *전면 무효화*. RoomGraph 알고리즘 갱신 필요 (~80~120 line).
- LDtk Plaza/Boss 룸 prefab 출구 패턴 갱신 필요 (~5~10 룸).

**비용:** 중간 (1.5주 폴리시).

---

## 6. 권장 방향 — 안 D 즉시 채택 + 안 B 중기 + 안 C 장기

### 6.1 단계별 권장

| Phase | 안 | 이유 |
| :--- | :--- | :--- |
| **즉시 (Phase 2 폴리시)** | **안 D (수직 딥 다이브 그래프)** | 안 A 의 폴 다운 + 천장 그림자를 *그래프 자체* 에 내장. DEC-037 충돌 해소. 광장 의례 자동 흡수 |
| **중기 (Phase 2 후반)** | 안 B (Persistent Town) | DEC-038 마을 메타포의 자연 확장. 야리코미 강화 |
| **장기 (Phase 3 검토)** | 안 C (Depth as Cost) | 밸런스 영향 큼. 안 D·B 정착 후 |

> **안 A 흡수:** 안 A (Megastructure Shaft) 의 핵심 — Trapdoor 폴 다운, 천장 그림자 parallax, "DEPTH N" 진입 텍스트 — 은 안 D 에 모두 내장. 안 A 는 별도 적용 불필요.

### 6.2 권장 순서 정당화

1. **안 D 먼저** — 컨텍스트 단절 + DEC-037 vs 다이브 충돌 + 광장 위상 모호를 *한 번에 토폴로지로* 봉합. 안 A 의 시각 룰을 그래프 룰로 격상시켜 자연스럽게 충족.
2. **안 B 후속** — 안 D 가 다이브의 *공간·동선* 을 봉합하면, 안 B 는 *시간* 을 봉합. 누적 야리코미 동기 부여.
3. **안 C 보류** — 비용 메커닉은 자칫 좌절감 유발. D·B 가 정착해야 압박감이 *서사적 무게* 로 읽힘.

---

## 7. "마을·탐험·레벨업" 강화 — 구체 액션

### 7.1 마을 강화 (Plaza 누적 의미)

| 액션 | 출처 | 비용 |
| :--- | :--- | :---: |
| 무기당 다이브 횟수 / 회상 비율 / 격파 지층 영구 저장 | 안 B | 중 |
| Plaza 배경 그림자 인원 = `divesCompleted` 함수 (5 → 24명) | DEC-038 §2.3 + 안 B | 저 |
| Plaza 봉인된 문 N개 = 격파 안 한 지층 보스 (격파 시 영구 개방) | 안 A + 안 B | 중 |
| Stratum 1 Plaza 가 모든 지층 입구의 영구 거점 (다지층 들어가도 Plaza 1 으로 귀환 가능) | 안 B | 중상 |
| Archivist 메모리 코어 광점 강도 = 무기 누적 회상 비율 | 안 B + DEC-038 | 저 |

### 7.2 탐험 강화 (수직 공동 인지)

| 액션 | 출처 | 비용 |
| :--- | :--- | :---: |
| Stratum 천장 레이어 = 위 지층 그림자 (parallax, 청록 점광) | 안 A + DEC-038 | 저 |
| 보스 룸 바닥 = Trapdoor 함정문. 보스 처치 시 개방 + 폴 다운 | 안 A | 저 |
| 폴 다운 컷 = 1초 카메라 다운 패닝. 다음 Stratum 천장에서 떨어짐 | 안 A | 저 |
| Stratum 진입 텍스트 = "DEPTH 2 / 4 — IRON" (현재 표기 강화) | 안 A | 저 |
| Stratum N 보스 룸 → Stratum 1 Plaza 직통 귀환 포탈 (영구 잠금 해제) | 안 B | 중 |
| 영구 발견 방 표기 (디버그 그래프 오버레이에 누적 마커) | 안 B | 중 |

### 7.3 진척 강화 (레벨감)

레벨업 = 캐릭터 XP 가 아니라 *위계 진행*. ECHORIS 컨텍스트.

| 액션 | 출처 | 비용 |
| :--- | :--- | :---: |
| Stratum 진입 컷에 *Depth N / Max* 명시 (ULTRAKILL 패턴) | 안 A | 저 |
| 보스 처치 = 영구 마커 (다음 진입 시 보스 룸에 시체 잔류) | 안 A + P6 | 중 |
| 무기 화면 하단 진척 바 (Recalled 비율 / 격파 지층 비율) | 안 B | 저 |
| Pristine / Mid / Rusted 무기 상태 = Plaza 배경 그림자 인원 변주 (DEC-038 §2.3) | DEC-038 + 안 B | 저 |
| 첫 격파 시 Ego 의 *심화 발화* (4회차 침묵 룰 내에서, 보스 격파 시는 예외 1회) | DEC-033 | 저 |

---

## 8. 영향 범위

### 8.1 안 A (Megastructure Shaft) — 즉시 권장

#### 코드
- `game/src/ui/StratumClearOverlay.ts` → Trapdoor + 폴 다운 카메라 패닝 연출로 교체 (~50 line)
- `game/src/scenes/ItemWorldScene.ts` → 보스 룸 바닥 trapdoor 진입점 트리거 (~30 line)
- `game/src/level/RoomGraph.ts` → 변경 없음 (그래프 토폴로지 무수정)
- `game/src/ui/DepthGauge.ts` → stratum-spanning 표시 검토 (현재 상태 확인 필요)
- 천장 배경 레이어 (위 지층 그림자) — `LdtkRenderer` 또는 별도 BackgroundLayer (~80 line)

#### 데이터
- `Sheets/Content_StrataConfig.csv` → `DepthName` 컬럼 추가 검토 (Iron / Rust / Spark / Shadow / Forge — DEC-036 기질 매핑)

#### 자산
- 천장 그림자 텍스처 1종 (parallax tile, 256×256, 청록 점광 산재)
- 폴 다운 SFX 1종 (저음 whoosh)

#### 문서
- `Documents/System/System_ItemWorld_Core.md` § 다이브 연속성 추가
- `Documents/System/System_ItemWorld_Boss.md` § 보스 룸 = Trapdoor 추가
- CLAUDE.md / Glossary 에 "Megastructure Shaft" 용어 추가

### 8.2 안 B (Persistent Town) — 중기

#### 코드
- 무기 데이터에 다이브 누적 필드 추가 (~30 line)
- Plaza 시각 변주 함수 (`MemoryResident.spawn` 분기) (~40 line)
- 봉인된 문 prop + 격파 시 영구 개방 트리거 (~40 line)
- Stratum 1 Plaza 귀환 포탈 (~30 line)

#### 자산
- 봉인된 문 sprite 2 종 (sealed / open)
- Plaza 귀환 포탈 sprite 1 종

### 8.3 안 C (Depth as Cost) — 보류

밸런스 변경 + 플레이테스트 필수. 안 A·B 정착 후 별도 PR.

---

## 9. 잔여 의사결정

1. ~~**안 A 의 Stratum 1 진입 처리**~~ — **결정됨 (2026-05-01): 현재 페이드 유지**.
   - 현재 모델: 월드 세이브포인트 → 아이템 선택 → Stratum 1 진입 (페이드).
   - 폴 다운 통일 안 폐기. 사유: 이전 빌드에서 *"납치되는 느낌"* 플레이테스트 피드백. 동의·예고·문맥 3 요소 (DES-IW-ONB-01, DEC-033) 와 충돌.
   - **적용 범위 한정:** Trapdoor 폴 다운은 **Stratum N → Stratum N+1 지층 간 전이에만** 적용. Stratum 1 진입은 현행 유지.

2. **안 B 의 마을 Plaza 단일화**
   - 현재 모델: 모든 Stratum 에 자체 Plaza (DEC-038).
   - 안 B 변경: Stratum 1 Plaza 만 영구 거점, 나머지는 단순 통과 광장.
   - 결정 필요: 마을 메타포의 *반복* 이 중복인가, 강화인가?

3. **무기 데이터 누적 SSoT 위치**
   - `localStorage` (현재 세이브 시스템) vs. 별도 `WeaponProgress` 테이블.
   - 데이터 구조 확장 시점.

4. **DepthGauge UI 재설계 필요 여부**
   - 현재 좌측 수직 블록. Made in Abyss 풍 *단순 깊이 숫자* 만으로 충분한가?

5. **컷 길이 가이드라인**
   - ULTRAKILL = 컷이 의도된 자산. ECHORIS 는 어디까지 컷을 허용?
   - Trapdoor 폴 다운 1초가 적정한가, 더 짧아야 하는가?

---

## 10. 차별화 — ECHORIS 만의 다이브

레퍼런스 24 작품 중 *완전히 일치하는* 모델은 없다. ECHORIS 의 다이브는 다음 4 요소의 조합으로 고유.

| 요소 | 출처 | ECHORIS 고유성 |
| :--- | :--- | :--- |
| 절차 다이브 | Spelunky / Noita / Disgaea | + |
| 단일 메가스트럭처 정체성 | BLAME! / Hollow Knight | + |
| 거주자 = 잔류 그림자 | DEC-038 (무라카미 + BLAME!) | + |
| 검 Ego 단독 화자 | DEC-033 (Transistor) | = ECHORIS 만의 합 |

ECHORIS 의 다이브 = **"한 자아의 메가스트럭처를 깊이 내려가며, 떠난 자들의 그림자에게 검 Ego 가 말을 걸고, 잊혀진 단편을 회상시킨다."**

이 한 문장이 모든 디자인 결정의 시금석이다.

---

## 11. 후속 작업 (이 문서 채택 시)

1. **DEC 신설 검토** — DEC-039 "Item World Continuous Dive" 로 정식 의사결정 등록 검토.
2. **안 A 구현 PR** — Trapdoor + 천장 그림자 + 폴 다운 컷.
3. **자산 생산** — 천장 그림자 텍스처 (PixelLab MCP), 폴 다운 SFX.
4. **안 B 데이터 구조 설계** — `WeaponProgress` 스키마 결정.
5. **DepthGauge 재검토** — UI 변경 필요 여부.
6. **Glossary 업데이트** — Megastructure Shaft, Trapdoor Descent, Persistent Plaza.
7. **System_ItemWorld_Core.md 통합** — 본 문서 §6 권장 방향을 시스템 명세에 반영.
8. **플레이테스트 변별 검증** — 안 A 1차 빌드에서 *다이브 연속성* 인지 테스트.

---

## 12. 레퍼런스 출처

### 1차 자료 [확인함]

- 弐瓶勉 (1997~2003). 『BLAME!』. 講談社.
- Akihito Tsukushi (2012~). 『メイドインアビス』. 竹書房.
- Dante Alighieri (c.1320). 『La Divina Commedia: Inferno』.

### 게임 — 직접 플레이 / 영상 검증 [확인함]

- Hollow Knight (Team Cherry, 2017)
- Castlevania: Symphony of the Night (Konami, 1997)
- Cave Story (Studio Pixel, 2004)
- Salt and Sanctuary (Ska Studios, 2016)
- Animal Well (Billy Basso, 2024)
- Blasphemous (The Game Kitchen, 2019)
- Ori and the Will of the Wisps (Moon Studios, 2020)
- Death's Gambit (White Rabbit, 2018)
- Spelunky / Spelunky 2 (Mossmouth, 2008/2020)
- Downwell (Moppin, 2015)
- Noita (Nolla Games, 2020)
- Terraria (Re-Logic, 2011)
- SteamWorld Dig 2 (Image & Form, 2017)
- Dome Keeper (Bippinbits, 2022)
- A Robot Named Fight (Matt Bitner, 2017)
- ULTRAKILL (Arsi "Hakita" Patala, 2020~)
- Dark Souls (FromSoftware, 2011)
- Returnal (Housemarque, 2021)
- Hades / Hades II (Supergiant, 2020/2024)
- Disgaea Series Item World (NIS, 2003~)
- The Binding of Isaac (Edmund McMillen, 2011)
- Slay the Spire (Mega Crit, 2019)

### 2차 자료 [확인함]

- [Made in Abyss — Wikipedia](https://en.wikipedia.org/wiki/Made_in_Abyss)
- [Blame! — Wikipedia](https://en.wikipedia.org/wiki/Blame!)
- [Hollow Knight — Hollow Knight Wiki](https://hollowknight.fandom.com/wiki/Hollow_Knight_Wiki)
- [Castlevania: Symphony of the Night — Castlevania Wiki](https://castlevania.fandom.com/wiki/Castlevania:_Symphony_of_the_Night)
- [ULTRAKILL — ULTRAKILL Wiki](https://ultrakill.fandom.com/wiki/ULTRAKILL_Wiki)
- [Spelunky 2 — Spelunky Wiki](https://spelunky.fandom.com/wiki/Spelunky_Wiki)

### 내부 참조 [확인함]

- DEC-033 — 스파이크 재정의 + 검 Ego (`memory/wiki/decisions/DEC-033-*.md`)
- DEC-036 — Memory Shard 통합 (`memory/wiki/decisions/DEC-036-*.md`)
- DEC-037 — Hub-and-Spoke 토폴로지 (`memory/wiki/decisions/DEC-037-*.md`)
- DEC-038 — 그림자 마을 (`memory/wiki/decisions/DEC-038-*.md`)
- `Reference/Metroidvania Game Design Deep Dive.md` — 장르 분석
- `Reference/Disgaea_ItemWorld_Reverse_GDD.md` — 디스가이아 원형 역기획서
- `Reference/Spelunky-LevelGeneration-ReverseGDD.md` — 스펠렁키 역기획서
- `Reference/DeadCells-LevelGeneration-ReverseGDD.md` — 데드셀 역기획서

---

> **상태:** Confirmed (DEC-039, 2026-05-02 안 D 채택). DEC-037 hub-and-spoke 토폴로지는 본 결정으로 무효화 (자료구조는 보존, 위상 룰만 변경). 안 A 는 안 D 에 흡수. 안 B/C 후속.
