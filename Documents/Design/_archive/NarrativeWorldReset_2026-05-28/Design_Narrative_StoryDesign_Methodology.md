# ECHORIS — 내러티브 / 스토리 디자인 방법론 (Master)

> **문서 ID:** D-18
> **문서 상태:** Established (canon) — 2026-05-28 락
> **선행 SSoT:**
> - `Documents/Content/Content_Direction.md` (CNT-DIR-001, 테마 / 시놉시스 / 내러티브 단일 뿌리)
> - `Documents/Content/Content_Direction_SeedAnalysis.md` (CNT-DIR-002, 4 시드 + Violet 자막 fact base)
> - `Documents/Design/Design_Narrative_HanJeongHeung_Archetype.md` (한정흥 implementation spec, DEC-042/043)
> - `Documents/Design/Design_Narrative_Worldbuilding.md` (D-12, 환경 서사 7 원칙)
> - `Documents/Design/Design_ItemWorld_Onboarding_SwordEgo.md` (DES-IW-ONB-01, 검 Ego 온보딩)
> - DEC-033 (검 Ego 단독 화자) / DEC-036 (Memory Shard) / DEC-038 (그림자 마을) / DEC-039 (Trapdoor Descent) / DEC-042 (한정흥) / DEC-043 (다중 결말 3+1) / DEC-046 (Identity Archive) / DEC-047 (위령)

---

## 0. 본 문서의 위치

본 문서는 ECHORIS 의 *내러티브 / 스토리 디자인 방법론* 의 **단일 마스터 SSoT** 다. 다음 세 질문에 답한다:

1. **메인 스토리는 어떻게 쓰는가?** (§3)
2. **서브 / 사이드 스토리는 어떻게 쓰는가?** (§4)
3. **"플레이어블한 스토리" 란 무엇인가?** (§2 + §5)

본 문서는 *방법론* 이다. 구체적 시놉시스·플롯·캐릭터는 CNT-DIR-001 / Content_Story_Synopsis.md 가 SSoT. *문화적 골격* 은 Design_Narrative_HanJeongHeung_Archetype.md 가 SSoT. *대사 spec* 은 CNT-DIR-002 §8 + 본 문서 §10 이 SSoT.

분석 자료 — `Reference/` 폴더의 60+ 문서 + 8 채널 폴더 + 위키 2 종을 8 병렬 에이전트로 deep dive (2026-05-28):
- 메인 스토리 — `witcher3_인사이트.md` + `sakurai_인사이트.md` + `timcain_인사이트.md` + `noclip_인사이트.md`
- 사이드 / 서브 — `Reverse_GDD_SideQuest_Narrative_Framework.md` + `Hades_Boon_Reverse_GDD.md` + `Disgaea_ItemWorld_Reverse_GDD.md`
- 플레이어블 / 환경 — `designdocs_인사이트.md` + `extracredit_인사이트.md` + `jonastyroller_인사이트.md` + `UnfamiliarMechanic_Teaching_Research_Environmental.md` + GDC 인사이트 5 종
- 아이템계 진입 — `InnerSpace_Entry_Research_*.md` × 6
- 한정흥 — `HanJeongHeung_Research_*.md` × 7
- 장르 — `Metroidvania Game Design Deep Dive.md` + `castlevania-wiki-md/` + `disgaea-wiki-md/`
- Rustborn 화법 — `Violet_Evergarden_Analysis_for_Rustborn.md`
- 메타 / GDD — `게임 기획서 작성법 (Damion Schubert GDC).md` + `How to Write a Great Design Document.pdf` + Sakurai + Cain + Jonas

---

## 1. 단일 명제

> **ECHORIS 의 모든 스토리는 *위령 (DEC-047)* 의 외피를 입은 *위로 (meta)* 다.**
> **그 위로의 작동 메커니즘은 *한정흥 (DEC-042)* 순환이며, 그 전달 매체는 *메커닉·환경·페이싱·침묵·검 Ego 단독 화자* 의 5 채널이다.**

이 명제 위에 메인 / 사이드 / 환경 / 진입 / 결말 모든 결정이 포개진다.

---

## 2. 플레이어블 스토리의 단일 정의

### 2.1. 정의

> **플레이어블 스토리 = 결말로 견인되는 인과 사슬이 아니라, 결말을 *몰라도* 매 순간 플레이어가 능동적으로 상태를 변화시키는 *씬의 연속*. 플롯은 씬에서 씬으로 이동하는 *실(thread)* 일 뿐이다.**

위쳐 3 *Bloody Baron* 퀘스트가 *메인이면서 사이드 호의 깊이* 를 갖는 이유 = "씬이 플롯을 이긴 구조" [확인함, witcher3 §2-1]. Chandler 인용: *"좋은 플롯이란 좋은 씬을 만들어내는 플롯이다. 이상적인 미스터리는 결말이 빠져 있어도 읽고 싶은 것."*

### 2.2. 시네마틱 vs 플레이어블 비교

| 축 | 플레이어블 | 시네마틱 |
|:--|:--|:--|
| 정보 전달 매체 | 메커닉·환경·페이싱 (묵시) | 대사·컷씬·내레이션 (명시) |
| 플레이어 역할 | 해석자·실험자·생존자 | 관객·선택지 클릭자 |
| 실패의 정의 | *서사적 정보* (Dark Souls "YOU DIED") | 진행 단절·이탈 |
| 페이싱 통제권 | 플레이어 (탐험 속도·휴식) | 작가 (컷 길이·시간) |
| 결말 | 행위의 *시스템적 누적* (Ancient 수렴) | 분기 선택지 결과 |
| 재플레이 가치 | 메커닉 발견·시스템 마스터리 | 미해본 분기 소비 |
| **ECHORIS 위치** | **여기 — 풀 플레이어블 niche** | **사용 안 함 (첫 30분 컷씬 0건)** |

### 2.3. 다섯 채널

ECHORIS 의 플레이어블 스토리는 *5 채널* 에서 동시에 작동한다. 어느 한 채널만으로 서사가 완결되지 않으며, 다섯 채널의 *공명* 이 곧 의미다.

1. **메커닉 = 메타포** (Extra Credits *Mechanics as Metaphor*, Spec Ops / Undertale 패턴) — *아이템에 들어간다 = 회상시킨다* 의 메커닉 자체가 메시지
2. **환경 = 묵시적 화자** (Dark Souls / BLAME! / Hollow Knight / Tunic) — *말 없는 잔해·시체·부식 풍경* 이 화자
3. **페이싱 = 호흡** (CDPR Sasko 40초 / 사쿠라이 "느린 것은 죄악") — 신호 (signal) ↔ 침묵 (noise drop) 의 교차 리듬
4. **검 Ego = 단독 화자** (DEC-033) — Erda 0 대사 + Rustborn 1-3 줄 압축
5. **시간 누적 = 친밀** (Hades 패턴) — 같은 NPC / 무기 재만남이 *마모* 가 아닌 *layer 추가* 가 되는 구조

---

## 3. 메인 스토리 작성 방법론

### 3.1. 메인 스토리의 정의 / Side 와의 경계

- **출처 [확인함]:** Tim Cain — *"Critical Path 는 어떤 빌드로도 완주 가능해야 한다. 사이드는 건너뛰어도 클리어 가능해야 한다. 필수 아이템/NPC 가 사이드에 있으면 안 된다."* (timcain §1 Non-Linear)
- **방법론:** Critical Path = (a) 모든 빌드 / 스타일이 통과 (b) 최소 3 해법 (ECHORIS = ATK / INT / 능력) (c) 게이트 잠금 자원은 메인에만 배치. 사이드는 *밀도와 향* 을 만들지만 Critical Path 의 *통과 가능성* 을 절대 깨지 않는다
- **ECHORIS 적용:** Critical Path = *Erda 가 The Shaft 최하층 도달 + 위령 완수* 단일 명제. Stratum 보스 = 메인 비트. 무기별 위령 호 (천도 / 합침 / 두고 떠남) 는 사이드처럼 자유롭게 진입 가능, Ancient 수렴 시 메인으로 격상되는 *밀도 전환 구조*
- **anti-pattern:** 스파이크 강화 명목으로 핵심 위령을 사이드 무기에만 배치 → 미진입 플레이어가 결말 의미 상실

### 3.2. 3 막 / 5 막 / Hero's Journey 사용 여부

- **출처 [확인함]:** Pawel Sasko (CDPR) — *"감정적으로 강렬한 순간들을 먼저 정하고 그 주변으로 이야기를 짠다. Fire vs Ember 를 구분하라"* (witcher3 §3-1). Sakurai — *"클라이맥스부터 시작하라"* (sakurai §4-6)
- **방법론:** 게임 매체에서 3 막 구조는 *작가의 도구* 이지 *플레이어의 경험 구조* 가 아니다. 작가는 **감정 비트 (Fire) 4-7 개를 먼저 박고**, 그 사이를 게임플레이로 채운다. Hero's Journey 의 *Refusal of Call* 같은 비트는 게임에서 플레이어 동기를 죽이므로 *Call 만 남기고 Refusal 삭제* 가 보통
- **ECHORIS 적용 — Fire 비트 5 개 락:**
  1. Rustborn 첫 발화 (Stage 0)
  2. 첫 위령 완수 (Stage 1)
  3. 한정흥 결 발현 (Stage 3)
  4. 변질된 원본 조우 (Stage 4)
  5. Ancient 수렴 선택 (Stage 5)
- Ember (배경 디테일) 는 5 Fire 사이를 메트로베니아 탐험 + 아이템계 야리코미 루프로 채움. 판소리 5 조 정합 (§7.3)
- **anti-pattern:** Save the Cat 비트시트 그대로 이식 → *읽는 영화* 가 됨. Refusal of Call 도입 → 첫 30분 동력 상실

### 3.3. 플레이 시간 vs 서사 시간 (체감 시간 설계)

- **출처 [확인함]:** Bartosz (CDPR) — *"플레이어는 40초마다 무언가에 집중할 수 있어야 한다"* (witcher3 §6-4). Sasko — *"빈 시간 (Breathing Room) 이 인간적인 순간을 만든다"* (witcher3 §3-2). Sakurai — *"느린 것은 죄악이다... 게임 조작 실시간 비율을 측정하라"* (sakurai §5-5)
- **방법론:** 30 시간 캠페인의 *체감 시간* = (40초 이벤트 밀도) × (감정 비트 간격) × (정적 휴식 비율). CDPR 황금비 = *행동 → 정보 → 정적 → 비트* 4 박자 반복
- **ECHORIS 적용:** Stratum 1 = 40초 이벤트 밀도 강제 (절차적 룸 템플릿 제약). 보스 클리어 직후 *즉시 다음 층으로 강제 이동 금지*. Rustborn 1-2 줄 발화 + 시각적 잔향 5-10초 의무. 회수 무기는 월드 모루에서 *침묵 비트* 1회 강제
- **anti-pattern:** *야리코미 = 빠른 회전* 으로 휴식 0 → 위령 명제가 *의식 (ritual)* 으로 체감되지 않고 *그라인드* 로 전락

### 3.4. Hook 의 위치와 강도 — 3 단 분배

- **출처 [확인함]:** Sakurai — *"가능하다면 게임의 하이라이트를 처음에 보여줘라. FF7 오프닝, 신 광신화 파르테나는 1분 안에 메두사 등장"* (sakurai §4-6). Noclip / DOOM 2016 — *"영화의 첫 15분 규칙: 게임 전체의 판매 증명서"* (noclip §2-1). Sasko — *"정보의 의도적 제거"* (witcher3 §2-2)
- **3 단 분배:**
  - (a) **첫 5 분 = 감각 Hook** — 스케일 / 조작감 / 타격감의 즉발 전시
  - (b) **첫 1 시간 = 질문 Hook** — 의도적 정보 누락으로 *플레이어가 갈구하게* 만듦
  - (c) **첫 5 시간 = 판돈 Hook** — 감정 비트 1 발현, 플레이어가 그만둘 수 없는 정서적 채무 생성
- **ECHORIS 적용:**
  - (a) The Shaft 수직 강하 + 거대 빌더 실루엣 + Rustborn 첫 발화
  - (b) 잊혀진 자 1-2 명 등장, *이름 / 사연 비공개*, "왜 잊혀졌는가" 가 질문 Hook
  - (c) 첫 위령 완수 (천도 / 합침 / 두고 떠남 중 자연 선택), 한정흥 *근간 정서 락* 이 정서적 채무로 작동
- **anti-pattern:** 첫 30분 컷씬 금지 원칙을 *Hook 없음* 으로 오해 → 감각 Hook 까지 삭제. Hook 없는 침묵 = 진입 이탈

### 3.5. 플롯 비트의 메커닉 발현 — 행동으로 보여주기

- **출처 [확인함]:** Sasko — *"세계의 가치관을 직접 설명하지 않았다. 환경 자체가 체화한다"* (witcher3 §2-3). Noclip — *"기근 마을에서 모든 싱싱한 음식을 제거했다"* (witcher3 §5-1)
- **방법론:** *말하지 말고 *제거* 하라*. 비트는 *추가* 가 아니라 *환경의 결손 / 일관성* 으로 발현. 기근은 소시지가 없는 것으로, 전쟁은 검 자루만 남은 광경으로, 상실은 *플레이어가 갈 수 있었지만 갈 필요가 사라진 방* 으로. 메커닉 자체가 메타포일 때 가장 강하다 (Hades 의 죽음 = 귀가)
- **ECHORIS 적용:** 한정흥 비트 = 무기 표면의 단조 흔적 + 본/세피아 톤 환경 + Heartbeat 사운드 + Rustborn EQ 변화의 *4 채널 동시* (project_no_damascus_terminology 정합). 위령 완료 = *적이 적이 아니게 됨* 의 메커닉 (Forgotten → Recalled 슬롯 전이) — 시스템 자체가 위령 행위
- **anti-pattern:** Rustborn 이 *"이 검은 슬픈 과거를 가지고 있다"* 직접 발화 → 묵시적 서사가 *exposition* 으로 전락, 침묵 화자의 무게 붕괴

### 3.6. 클라이맥스 = 게임 시스템의 정점 동기화

- **출처 [확인함]:** Sasko — *"Fire 가 없으면 Ember 만으로는 영혼이 없다... 베세미르 죽음 = 시리의 전환점"* (witcher3 §3-1). Tim Cain — *"엔딩 슬라이드는 메인 + 가능한 많은 사이드를 마무리"* (timcain §1)
- **방법론:** 마지막 보스 = *마지막 의미*. 시스템의 정점 (최대 콤보 / 최대 빌드 / 최후 능력) 이 *서사의 정점과 동일한 행동* 으로 표현. 분리되면 *전투 끝났는데 컷씬으로 뒷처리* 안티패턴. Hades — *마지막 대화 = 마지막 전투의 부산물*
- **ECHORIS 적용:** Ancient 수렴 = 최후 결말 (DEC-043). Ancient 무기 = 시스템 정점 (레어리티 최고 + 4 지층 + 심연). 마지막 위령 행위 = 모든 기억 단편 슬롯의 *최종 배치 선택* — 시스템과 결말이 동일 행동
- **anti-pattern:** 최후 보스 = *Erda 의 스탯 체크* 일 뿐이고 결말은 무관한 컷씬으로 분리됨 → DEC-043 다중 결말이 *선택* 이 아니라 *메뉴* 가 됨

### 3.7. 메인 결말의 다중 분기 처리

- **출처 [확인함]:** Sasko — *"양쪽 모두를 잘 준비시켜서 결과를 예측 못하게... 어느 쪽이든 나쁜 결과로 설계"* (witcher3 §4-1). *"느껴질 때 선택지를 제공하라"* (witcher3 §4-2). Tim Cain — *"엔딩 슬라이드로 발견 못한 사이드까지 마무리해 리플레이 유도"*
- **방법론:** 다중 결말의 무게 = (a) *양쪽의 동등한 매력* (b) *플레이어가 그 감정을 느끼는 순간 선택지 제시* (c) *결과의 가시성 텔레그래프*. 백지 주인공이면 선택이 *기능* 으로만 작동, 정의된 주인공 위에서야 *나는 누구인가* 의 선택이 됨
- **ECHORIS 적용:** 3+1 결말 — 천도 / 합침 / 두고 떠남은 *위령 행위의 자연 누적* 으로 분기 (별도 메뉴 선택 아님). Ancient 수렴은 4번째 결말, *야리코미를 끝까지 간 자에게만 가시화* 되는 숨겨진 비트. Erda 침묵 + Rustborn 단독 화자 = *정의된 주인공 페어*. 선택은 *"Erda 가 어떤 사람인가"* 가 아니라 *"이 검과 Erda 가 함께 무엇을 남길 것인가"*
- **anti-pattern:** 결말 직전 *"A/B/C 중 선택하시오"* 메뉴 = BioWare 안티패턴. 분기가 행동의 누적이 아니라 *서명* 으로 전락. 위령 명제 붕괴

---

## 4. 서브 / 사이드 스토리 작성 방법론

### 4.1. 사이드의 정의 — *메인이 아닌 것 vs 다른 의미*

- **출처 [확인함]:** Reverse_GDD_SideQuest_Narrative_Framework §8.1 (Witcher 3 Secondary 115 + Witcher Contract 28). Chris Avellone 4 대 원칙 §8.3 *"사이드는 메인 플롯 / 지역을 보강하되, 메인의 stake 를 넘어서면 안 된다"*
- **방법론:** 사이드 = 메인의 *부속* 이 아니라 *다른 종류의 의미*. Bloody Baron 은 분량 (40 페이지 스크립트) · 민담 깊이 · 도덕적 무게에서 메인을 능가하지만 *시리 탐색이라는 메인 stake 자체는 침범하지 않음*. 정의 기준 = "메인 결말 변경 권한 보유 여부" 가 아니라 *"다른 페이스 · 다른 톤 · 다른 인물 layer 진입 권한"*
- **ECHORIS 적용:** 메인 = 검 Ego 정체성 결 회수 (DEC-046 + DEC-047). 사이드 = *각 무기 1 자루 = 한 망자 1 명의 위령*. 메인 = *Erda 가 심연을 내려간다*, 사이드 = *이 1 자루의 Rustborn 이 누구였는가* — stake 분리 · 정서 동일
- **anti-pattern:** Fallout 4 Radiant *"Another Settlement Needs Your Help"* — 메인과 의미 차별화 0, *수량을 위한 수량*. ECHORIS 300 무기가 빠질 함정

### 4.2. 사이드의 Hook 과 완결성

- **출처 [확인함]:** §3.2 *"Hook 발견 방식: NPC 대화 / 환경 단서 / 이벤트 트리거 3 분기"*. Avellone — *"사이드 완료 시간 약 15 분 목표"*
- **방법론:** 사이드는 *발견 → 수행 → 결말* 이 한 세션 안에 닫혀야 함. Hook 3 채널 — (a) NPC 대화 (b) 환경 단서 (c) 트리거. 결말 = 즉각 결과 + 선택적 장기 파급. 15분 단위가 mid-core 의 자연 호흡
- **ECHORIS 적용:** Hook = *무기 입수 순간* (월드 드롭 / 보스 처치 / 그림자 마을 거주민 손에서 회수). 완결 단위 = *1 지층 다이브 = 약 15-30 분 = 1 망자 회상 1 세트*. Stratum 1 → 1차 위령 호 닫힘. Magic 등급 = Stratum 2 = 2 막. Ancient 가 5 막 구조에 정확히 매핑 (한정흥 5 막 = 판소리 5 조)
- **anti-pattern:** 무기 1 자루가 *모든 등급에서 동일한 회상* 제공 → 1 막에서 발견할 것이 없어 hook 사망

### 4.3. 사이드의 밀도 — 의도적 비대칭

- **출처 [확인함]:** §8.1 Witcher 3 분포 — White Orchard 5 / Velen 33 / Novigrad 37 / Skellige 35 / Kaer Morhen 4. §6.4 *"지역당 최대 5 개 밀도 제한", "동일 위치 유형 2 회 연속 금지"*. Hades_Boon §5.1 (Legendary 10% / Duo 12% / Epic 5% / Rare 10%)
- **방법론:** 짧은 사이드 (프라이팬 · 15 분) 와 긴 사이드 (Baron · 5 시간) 의 비율을 의도적 비대칭. Witcher 3 = *지역의 톤이 강한 곳에 사이드 밀도 집중* (Velen / Novigrad), 도입부 (White Orchard) / 종결부 (Kaer Morhen) 의도적 희소
- **ECHORIS 적용:** 무기 등급 = *자동 밀도 곡선*. Normal 1 지층 · Magic 2 · Rare 3 · Legendary 4 · Ancient 4 + 심연. **Ancient = 메인급 깊이 (5 막), Normal = 15 분 1 막 단편**. 그림자 마을 거주민 (DEC-038) 은 *지역 NPC* 가 아니라 *무기-거주민 mapping 1:1* — 마을 자체 밀도는 0, 무기 측에 100% 집중
- **anti-pattern:** 모든 무기를 5 막으로 → 양산 부담 폭증 + 메인 stake 침범 (Rustborn 35 단어 예산 위반)

### 4.4. 사이드의 재방문 / 재실행 — 두 모델

- **출처 [확인함]:** Disgaea_ItemWorld §1.6 *"같은 아이템 재진입 매 세션"*. Hades_Boon §1.2 *"매 사망 = 휘발이므로 다음 런 동기"*. Jon Ingold inkle — *"상태 트리 = High Water Mark"*
- **방법론 — 두 모델 병존:**
  - (a) **누적형 (Hades)** — 같은 NPC 재만남 = 시간 함축 서사. 친분 단계 / Nectar / Keepsake
  - (b) **변주형 (Disgaea)** — 같은 아이템 다른 다이브 = 절차적 표면 변화 + 영구 강화 누적
- 공통점 = *재방문이 손해가 아니라 layer 추가* 임을 시스템이 명시
- **ECHORIS 적용:** 1 자루 무기 다이브 = *Disgaea 절차적 표면* + *Hades 누적 회상 layer*. Stratum 1 첫 다이브 회상 단편 ≠ 두 번째 다이브. 검 Ego 대사는 *플레이어가 이 무기에 몇 번 들어왔는지* 를 알고 어조 변함. **그림자 마을 거주민도 *같은 실루엣 + 다른 무기 가져오면 다른 침묵*** — 형태 동일 · 정서 변주
- **anti-pattern:** 재방문 시 동일 단편 회상 반복 = Disgaea *"맥락 없는 반복"* §8.2

### 4.5. 사이드 → 메인 영향 / 비영향

- **출처 [확인함]:** Witcher 3 — *"약 36 개 결말 상태 조합, 3 개 대체 엔딩 — 사이드 선택이 메인 엔딩에 영향"*. Avellone — *"사이드가 메인 stake 를 넘어서면 안 된다"*
- **방법론:** *서사 stake* 와 *상태 영향* 을 분리. 사이드는 메인의 *결말 페이지* 를 흔들지 못하되, 메인 *마지막 절의 정서 채색* 은 흔들 수 있음. Witcher 3 = 시리 생존 / 황녀 / 위처 — 3 엔딩 모두 사이드 누적의 합산
- **ECHORIS 적용:** DEC-043 3+1 결말. 무기 사이드 = *Ancient 결말 트리거 풀* (Ancient 4 자루 이상 5 막 완수 → 4th 엔딩 분기). 일반 무기 사이드는 메인 엔딩 변경 0, 단 *에필로그 모놀로그의 단어 선택* 에 누적 반영 (한정흥 정서 락)
- **anti-pattern:** 무기 1 자루가 메인 엔딩을 뒤집음 → Ancient 5 막의 무게 희석 + 양산 부담 메인급 폭증

### 4.6. NPC 1 명 = 미니 사이드 호

- **출처 [확인함]:** §8.1 *"NPC 동기의 다양성이 서사 품질 결정"*. §5.3 NPC 변수 풀 25 종 (의뢰인 5 · 피해자 5 · 적대자 5 · 조력자 5 · 증인 5). Hades — *"12 신 × 반복 만남 = 캐릭터 노출 빈도"*
- **방법론:** *NPC = 사이드의 최소 단위*. 25 역할 × 5 감정 톤 = 변수 풀. 각 NPC 는 *1 번 만남 닫힘 호* + *N 번 만남 누적 layer* 양쪽 보유
- **ECHORIS 적용:** NPC 대화 0 줄 원칙 (DEC-033) ⇒ *NPC 1 명 = 무기 1 자루*. 무기 = 회상 단편 + Ego 대사 + 음향 EQ (Rustborn voice EQ) 3 채널의 *침묵 NPC*. 그림자 마을 거주민도 1:1 mapping. **25 역할 풀 → 5 색 기질 (Forge / Iron / Rust / Spark / Shadow) × 5 감정 = 25 슬롯**
- **anti-pattern:** 무기 회상에 대사 NPC 등장 → 검 Ego 단독 화자 원칙 파괴

### 4.7. 환경 서사 = 사이드

- **출처 [확인함]:** witcher3 §2-3 *"묵시적 서사 — 세계의 가치관을 직접 설명하지 않음"*. §5-1 *"기근 속의 소시지 문제 — 환경 디테일의 내러티브 일관성"*
- **방법론:** *대사 없이 공간이 말함*. 시체 배치 · 메모 · 파괴 흔적 · 색채 변화. 환경 사이드 = 별도 트리거 없이 공간 진입만으로 시작 · 완결
- **ECHORIS 적용:** 아이템계 절차적 지층 자체가 *사이드 서사 컨테이너*. 무기 종류별 지층 톤 차별 — Rustborn = 부식 강판 · 세피아 · 잔존물 (project_actual_art_style_breakable). **환경 anchor 5 종** (project_no_damascus_terminology): 본/세피아 톤 · 단조 불꽃 particle · Erda 실루엣 · Heartbeat 음향 · Rustborn EQ. 다마스커스 시각 표현 금지, 이 5 anchor 로 환경 사이드 완결
- **anti-pattern:** 환경 사이드를 텍스트 메모 / 일기로 보충 → NPC 대화 0 줄 원칙 우회 시도

### 4.8. 사이드의 언어적 부담 조절

- **출처 [확인함]:** Rustborn 35 단어 예산 (project_onboarding_methodology_locked). Baron = 40 페이지 스크립트 (메인급 사이드). Hades 슬롯 5 채널 (자원 - 효과 - 회수 - 확장 - 조작)
- **방법론:** 언어 부담 = *대사 단어 수* 가 아니라 *플레이어가 해석해야 할 layer 수*. 대사 0 줄 게임은 layer 를 *VFX · 음향 · 공간 · 아이템 · 시간* 5 채널로 분산
- **ECHORIS 적용 — 무기 1 자루 사이드의 5 채널 예산:**
  1. Ego 대사 35 단어 한정
  2. 회상 환경 1 지층
  3. Heartbeat 음향 1 패턴
  4. 단조 불꽃 VFX 1 색
  5. Erda 실루엣 반응 1 샷
- Ancient 5 막 = *단어 늘리기 금지*, 각 채널을 *막마다 변주*. 한정흥 살풀이 spine 이 5 막 sonic palette 변화로
- **anti-pattern:** 검 Ego 가 사이드 1 자루당 200 단어 폭주 = 단독 화자 침묵 원칙 (DEC-033) 의 본질 파괴

### 4.9. Disgaea Item World 모델의 ECHORIS 강화 계승

[확인함] Disgaea §7.3 *"공간적 메타포의 몰입 효과 — 아이템 안에 들어간다 = 유저 심리 모델 변화"*. §1.6 *"아이템 = 탐험할 수 있는 세계"*. 디스가이아 모델은 *narrative wrapper 0* — 아이템에 이름·등급·스탯만 부여하고 던전은 100% 절차적. 서브 스토리는 *유저 매몰 비용 자체* 가 만들어내는 정서 (수십 시간 키운 *내* 아이템).

**ECHORIS = 이 모델을 *narrative wrapper 1 자루당 1 위령호* 로 강화 계승.**

| 축 | Disgaea | ECHORIS |
|:--|:--|:--|
| 절차적 던전 양산 | ✅ 0 비용 | ✅ 0 비용 (계승) |
| 서사 wrapper | ❌ 0 | ✅ 무기 1 자루 = 1 망자 위령호 |
| 매몰 비용 | ✅ | ✅ (계승) |
| 한정흥 정서 락 | ❌ | ✅ (DEC-042) |

양산 부담은 wrapper 만큼만 증가, 던전 양산은 절차적으로 0 비용.

### 4.10. Hades 누적 NPC 서사의 ECHORIS 적용

[확인함] Hades §1.2 *"12 신 × 런마다 재만남 = 캐릭터 노출 빈도"*. 같은 NPC 가 *런 1 · 런 50 · 런 200* 에서 모두 다른 대사 — *플레이 시간 자체가 서사 변수*.

ECHORIS 적용 — **대사 누적이 아니라 침묵의 미세 변주 누적** 으로 등가 효과:
- (a) **그림자 마을 거주민:** dialogue 0 줄 (DEC-038) ⇒ *실루엣 자세 변화* + *Heartbeat 음향 EQ 변화* 로 누적 표현. 거주민이 *N 번 같은 무기로 다이브하는 Erda 를 어떻게 침묵으로 바라보는가*
- (b) **멀티플레이 동료** (Phase 3+): 지금 코드 0 줄, *친분 단계 → emote 변화* 정도 안전. 본격 Hades 패턴 채택은 Phase 3 진입 전 별도 락

핵심 시금석 — Hades 패턴의 본질은 *반복이 진부함이 아니라 친밀이 되는 메커니즘*. 1차 niche (Transistor / BLAME!) 신호 강화.

---

## 5. 플레이어블 / 환경 서사 9 방법

### 5.1. "Show, don't tell" → "Play, don't show"

- **출처 [확인함]:** Extra Credits *Metaphor is Meaning / Mechanics as Metaphor I·II / Narrative Mechanics*. "메커닉이 곧 이야기"
- **방법론:** 영화의 *Show, don't tell* 은 게임에선 한 단계 더 내려간다. *말로 설명하지 말고 보여주지도 마라 — 플레이어가 직접 행하게 하라*. 정보 덤프 없는 세계관 구축, 미사일 커맨드처럼 *메커닉 자체가 메시지*
- **ECHORIS 적용:** *아이템에 들어간다* 스파이크 = 메인 메시지. 컷씬 0 건, Rustborn 발화는 *플레이어 행동을 미러링* 하는 보조 채널일 뿐
- **anti-pattern:** 검 Ego 가 *환경 묘사* 를 대신 말함 ("이곳은 한때 대장간이었지...") = Dead Space 신호 과잉

### 5.2. 환경 = 마지막 스토리텔러

- **출처 [확인함]:** UnfamiliarMechanic_Env 패턴 7. Bloodborne / Hollow Knight / Returnal / Subnautica / Animal Well
- **방법론:** *NPC 가 말 없는 환경이 분위기 화자*. *시체 · 잔해 · 부식 풍경 · 형해* 가 텍스트 없이 *"이전에 누가 여기서 무엇을 했는가"* 를 전달
- **ECHORIS 적용:** *기억의 지층 = 무기의 부식 강판 단면* 이 직접 화자. Erda 가 *부서진 무기 + 형해* 옆에서 단편을 줍는 환경 비트가 *"여기 들어간 자가 있었다"* 의 묵시적 서사
- **anti-pattern:** log 가 환경과 동떨어진 텍스트 덩어리. 단편 = 환경에서 *주워야* 의미

### 5.3. 40 초 법칙 / 페이싱 곡선 3 스케일

- **출처 [확인함]:** Extra Credits *Pacing*. 아크 → 씬 → 액션 세 스케일 모두에서 *강렬 → 이완 → 점진상승 → 해소* 반복. CDPR Sasko *Signal vs Noise* (탐험 line 181)
- **방법론:** 정보 1 조각 노출 단위 = *플레이어의 인지 호흡* 에 종속. *40 초* 는 한 환경 비트가 다음 비트로 넘어가기 전 주의 지속 단위의 ECHORIS 시간 상수
- **ECHORIS 적용:** 한 *지층 룸* 당 환경 디테일 1 개 · 검 Ego 1 발화 · 전투 1 조우 = 약 40 초의 *signal beat*. 그 직후 안전 통로 = *noise drop*
- **anti-pattern:** 신호 과밀 — Dead Space 식 *같은 정보 7 가지 형태*

### 5.4. 묵시적 서사 (Implicit Narrative)

- **출처 [확인함]:** EC *In Defense of Imagination*. CDPR *Subtraction of Information*. Hollow Knight NPC *정보를 주는 데 인색*
- **방법론:** 플레이어가 *해석해서 채우는* 빈칸이 곧 서사의 자기지분. 명시 vs 묵시 비율은 niche 일수록 묵시 쪽. BLAME! / 메이드 인 어비스 팬은 *해석 과정 자체* 를 보상으로 인식
- **ECHORIS 적용:** Rustborn 첫 30 분 35 단어 예산. 단편 효과 텍스트도 *의도적 모호* (Animal Well 도구 패턴). 플레이어가 *환경 실험으로* 어휘를 풀게
- **anti-pattern:** 모든 단편에 친절한 설명 부착 → niche 신호 희석

### 5.5. Fire / Ember 원칙

- **출처 [확인함]:** GDC 탐험 line 179 — CDPR Sasko *"Cool Scene = Ember, 감정적 충격 (죽음 · 배신 · 상실) = Fire"*. D-12 동일 어휘
- **방법론:** *멋진 장면 (Ember) 만 나열하면 영혼 없는* 이야기. *감정적 비트 (Fire) 가 구조의 뼈대*. Ember 는 Fire 의 *맥락 강화 디테일* 로만 존재
- **ECHORIS 적용:** Fire = 한정흥 근간 정서 (DEC-042) — 살풀이 spine · 5 막 결말. Ember = 환경 디테일 (부식 강판 결, 형해, 단조 불꽃 particle). **모든 Ember 는 Fire 한 흐름에 기여해야지, *독립 컬렉터블* 이 아니다**
- **anti-pattern:** 모든 룸에 *cool* 환경 디테일 균등 분포 → Fire 가 묻힘

### 5.6. 시선 차단 = 정보 제거

- **출처 [확인함]:** CDPR Tost *Benefits of Missing Out* — *Perception of Exclusivity = Line of Sight Breaking*
- **방법론:** *보이는 것보다 안 보이는 것* 이 강한 서사. 거대 구조물의 *안 보이는 천장* (BLAME!), 안개 너머 다음 지층의 *암시만 있는 윤곽*
- **ECHORIS 적용:** 월드 수직 대공동 — *천장이 안 보이는* 카메라 컷, 지층 N+1 Trapdoor 가 *낙하 직전까지 다음을 안 보여줌* (DEC-039)
- **anti-pattern:** 미니맵에 모든 지층 윤곽 노출 → exclusivity 파괴

### 5.7. 시스템 서사 (Systemic Narrative) — 메커닉 = 주제

- **출처 [확인함]:** EC *Mechanics as Metaphor I·II*. Spec Ops / Undertale / Brothers / Papers Please
- **방법론:** *플레이어의 선택과 메커닉의 작동방식 = 메시지*. Undertale 공격 시스템 = *"선택은 도덕적이다"*. Disgaea 무한 다이브 = *"수련은 끝이 없다"* 의 *경험적 증명*
- **ECHORIS 적용:** *아이템 안에 들어간다* = *"기억은 외부 탐험이 아니라 내부 진입"* 의 메커닉 메타포. *Trapdoor Descent* = *"심연은 선택 아닌 낙하"* — DEC-039 메커닉이 *한정흥 정서* (DEC-042) 의 시스템적 동형. *다중 결말 3+1* (DEC-043) = Ancient 수렴이 *모든 결말의 흔적이 무기에 남는다* 의 메타포
- **anti-pattern:** 컷씬으로 주제 *말하기*. 시스템과 주제 불일치 (Bioshock 해킹 미니게임 EC line 40)

### 5.8. 긴장 곡선 = 호흡

- **출처 [확인함]:** Jonas Tyroller *How to Create Tension* (jonastyroller §14): *Buildup + Uncertainty + Difficulty*. CDPR Sasko *쉬는 시간의 가치* — "포옹 · 담배 · 침묵" 비트
- **방법론:** 고긴장과 저긴장 *교차 리듬*. *침묵* 은 단순 휴식이 아닌 *서사 비트* — 플레이어가 환경을 *흡수* 하는 시간
- **ECHORIS 적용:** 메트로베니아 탐험 (저긴장 환경 흡수) ↔ 아이템계 야리코미 (고긴장 전투 + 단편 회상) 의 *2-Space 분리* 자체가 매크로 호흡. 보스 처치 후 *쉬는 방* = 대장간 / 세이브 포인트. Erda 0 대사 정책 덕에 침묵 비트가 *자연스러움*
- **anti-pattern:** 아이템계 진입 후 즉시 다음 전투 = *납치 피드백*

### 5.9. 시스템 = 서사 통합 사례 4 건

- **Spelunky** [확인함] — *데드볼* (감금된 NPC 구출 시 휴대 페널티) = *"사랑은 짐이다"* 메커닉 메타포. 절차적 + 영구사망 = *모험은 일회성이다* 의 시스템 증명
- **Disgaea (Item World)** [확인함] — *아이템 안에 들어가서 무한 강화* 메커닉이 *수련 = 내적 여정* 의 메타포. ECHORIS 의 직계 조상
- **Hollow Knight** [확인함] — Mantis Village 공간 구조가 곧 능력 게이트 = *돌아올 약속을 환경에 기록*. 지도 = to-do list
- **BLAME!** [추측임, 만화] — 메가스트럭처 *수직 끝없음* + *주인공 무발화* = *"탐색은 정의되지 않는다"* 의 공간 메타포. ECHORIS The Shaft 직접 매핑

---

## 6. 아이템계 진입 = 서사적 임계점 8 항목

### 6.1. 임계점 (Threshold) 의 정의

- **출처 [확인함]:** Campbell *Belly of the Whale* / Eliade *Symplegades, Two Pillars*
- **요지:** 임계점은 *면 (line)* 이 아니라 *압착되는 협착부*. Campbell — *능동적 통과가 아닌 수동적 삼킴*. Eliade — 문턱은 *분리이자 통과인 paradox*, *균질성의 균열*. *능동에서 수동으로의 자세 전환* 이 시그니처
- **ECHORIS 적용:** 모루 = *Symplegades*. Erda 가 검 위로 *능동 점프* 가 아닌 *흡입 / 낙하* 자세. DEC-039 Trapdoor 의 학술 정당화. Stratum 1 첫 진입의 *멈춤 (0.3-0.5초) → 표시 → 낙하* 3 beat 가 *균질성의 균열* 을 신체에 새김
- **anti-pattern:** *DIVE 버튼 → 즉시 fade* — 면 (line) 으로 처리하면 paradox 소멸

### 6.2. 앵커 연속성 — 3 중 anchor

- **출처 [확인함]:** Inception 토템 / Spider-Verse 색수차 / Heartbeat 등가물
- **요지:** Nolan — *관객이 신체적으로 외운 패턴 한 가지* 가 마지막 1 회의 변화에 *모든 무게* 를 싣는다. Spider-Verse — *몸은 안 변하지만 환경은 변한다*. 앵커 없는 변환 = *컷*, 앵커 있는 변환 = *통과*
- **ECHORIS 3 중 anchor 권장:**
  1. **Heartbeat 음향** 60Hz / 1.2초 loop, 외부 volume 0.15 + lowpass → 임계 0.5초 전 volume 0.4 crescendo → 내부 ambient 통합
  2. **Erda 픽셀 silhouette** outline 두께 · dither · 본세피아 톤 1px 변동 없음
  3. **단조 불꽃 잔재 etching** 화면 외곽 0.3초 잔존
- **anti-pattern:** 검 표면 텍스처와 던전 벽 텍스처가 *팔레트만 같고 결 motif 가 다른* 경우. 앵커 = *동일 motif 의 스케일 차이*

### 6.3. 입력 동사 (Input Verb) — Carry Phase

- **출처 [확인함]:** Edith Finch / Cocoon Carry-Through-Space
- **요지:** menu click 의 결함 = *carry phase 0초, hold-to-commit 0초, body-schema shift 0개* = *scene-load* 의 동의어. Cocoon 핵심 = *carry phase 가 별도 verb 로 존재* (lift → carry → drop → enter 4-input combo)
- **ECHORIS 적용 — 3 단계 권장:**
  - **즉시 (1 dev-week, baseline):** Hold-to-Place — E key 2초 hold + KeyPrompt #FFA41B gauge + snap + push-through 1.5초
  - **Phase 2 후반 (3 dev-week, 권장):** Cocoon Carry-and-Drop — 검을 인벤토리 → Erda 손에 visible sprite → carry mode (-20% 속도, 공격 불가) → drop on anvil → E hold 1초 → push-through 1.5초
  - **Phase 3 (헌사):** Maquette 재귀 grammar 1 회 노출
- **anti-pattern:** *F 1 회 → 즉시 fade* — carry / commit 0초 압축 = scene-load 와 phenomenology 동일

### 6.4. 규모 변환 — Texture Survival

- **출처 [확인함]:** Powers of Ten / Honey I Shrunk the Kids / Eliade imago mundi / Borges Aleph
- **요지:** ECHORIS catchphrase 는 *작은 것 안에 더 큰 것* (Eliade imago mundi + Borges Aleph) 노선. Ant-Man / Innerspace 의 *큰 → 작은 단방향* 노선 **아님**. 검 = *닫힌 그릇이면서 우주의 축소판* (Vas Hermeticum + imago mundi). 핵심 = **Honey I Shrunk 의 *Texture Survival*** — 질감 유지, 위계만 변형
- **ECHORIS 적용:** 검 종류별 *서명 질감* (부식 강판 / 본·세피아 결 / 청동 패턴) 정의 후, *해당 검의 던전 벽 타일 = 그 질감의 32×32 확대판*. 플레이어가 던전 벽을 보다가 *"이거 내 검 표면 무늬다"* 의 *지연된 깨달음* = 스파이크 신호. Powers-of-Ten readout 디제틱화 = *STRATUM N + FORGE TEMP* 이중 readout
- **anti-pattern:** 검 표면과 던전 환경이 *완전히 별개 art family*. 재귀 진입 (아이템계 내부에서 다른 아이템계) 도입 — DEC 폐기 항목

### 6.5. 영화의 진입 grammar 7 device

- **출처 [확인함]:** InnerSpace Cinema §3
- **7 패턴:**
  1. **Gravity Re-axis** (Inception 도시 접기) — 진입 = 물리 법칙 위상 교환
  2. **Medium Bleed** (Spider-Verse) — *세계가 아닌 세계를 그리는 매체가 변함*, 픽셀 grid 일시적 4px→8px 거칠어짐
  3. **Mirror Door** (Coraline) — 입구/출구 sprite 동일, 통과 행위만 유일 증거
  4. **Ritual of Lighting** (Spirited Away) — 컷 아닌 *점등의 점진 의례*. 모루 주변 4-6 화로 불씨 순차 점등
  5. **Mismatched Action** (Paprika) — 검 *내려놓는* 마지막 frame == 검 안 *발 디딤* 첫 frame
  6. **Amnesia Cut** (Annihilation) — 0.3-0.5초 암전, 통과 자체를 *생략*
  7. **Vanishing of Human Scale** (BLAME!) — establishing shot, Erda 가 거대 협곡의 1 픽셀
- **ECHORIS 베이스라인 권장 (3 주):** Collapsing Set + Medium Bleed + Exponential Scale + Vanishing + Slit-Scan 결합. Heartbeat 음향 즉시 1 주 내 구현
- **anti-pattern:** anchor 없는 변환 (컷) + 모든 step 명시적 (Amnesia Cut 누락)

### 6.6. 게임의 진입 grammar

- **출처 [확인함]:** InnerSpace Games §1 Cocoon / §2 Parabox / §3 Maquette / §11 10 Design Moves
- **요지:** **Cocoon** — 들기 / 놓기 단일 동사가 진입 / 이탈 양방향 동일, *외부 마지막 1 프레임과 내부 첫 1 프레임이 카메라 줌만으로 연결*. **Parabox** — 격자 일치, 같은 시각 언어로 *시점의 스케일 변경* 자명화. **Maquette** — *재귀 grammar 1 회만 노출 후 닫기*. **Disgaea 2003** — 메뉴 → 추상 워프 = 2026 관객에게 *씬 로딩* 으로 읽힘. 보존할 것 = *commit 자원* (Mr. Gency = ECHORIS Memory Anchor)
- **ECHORIS 최종 합성:** **B (Gorogoa drag-align) + A (Cocoon 8 단계) + D (Maquette 1 회)** — 벽 검 카드를 모루로 드래그 → 결 정렬 → 카드가 모루 흡수 → 검 표면 클로즈업 던전 미니맵 1 회 깜빡 (첫 진입만) → 카메라 줌-페이드 → Erda 강하 → 던전 도착 시 위쪽 하늘에 검 결 잔존
- **anti-pattern:** Disgaea 1 *추상 워프 + Item Worlder NPC*. 2026 관객은 *디제틱 작업 행위* 요구

### 6.7. *납치 피드백* anti-pattern (락)

- **출처 [확인함]:** Threshold §1 Campbell *Belly of the Whale* + InputVerb 휴식/진입 분리 + 메모리 `feedback_itemworld_entry_keep.md`
- **요지:** Campbell 의 *수동적 삼킴* 은 *동의 후* 의 수동성. 동의 없는 끌어내림 = *납치*. Cocoon 4 단계는 매 step 이 *플레이어 입력* — 동의의 누적이 *서사적 동의*
- **ECHORIS 락:**
  - **Stratum 1 첫 진입 = 현행 페이드 유지 (폴 다운 금지)**
  - **Stratum N → N+1 만 Trapdoor 능동 인터랙트** (보스 처치 후 플레이어가 trapdoor 위에 서서 능동 입력)
  - 휴식 (passive idle) ≠ 진입 (active input verb) 분리
- **anti-pattern:** Stratum 1 첫 진입에 폴 다운 / trapdoor / 자동 끌어내림 = 명시적 폐기

### 6.8. 서사적 무게 차등 — 레어리티 × 첫 진입 매트릭스

- **출처 [확인함]:** Games §1 Cocoon 첫 진입 5-6초 vs 반복 1-2초
- **요지:** 첫 진입 = *5-6초 풀 시퀀스*, 반복 = *1-2초 단축*. 무게 평준화 방지 = *희소성*. 매번 같은 페이드 = 의례 무게 0
- **ECHORIS 매트릭스:**
  - Normal 첫 진입 = 2.5초 (Powers-of-Ten readout)
  - Normal 반복 = 1초
  - Magic-Rare 첫 진입 = 5초 (Medium Bleed + Vanishing)
  - Legendary 첫 진입 = 6-10초 (제안 C 헌사)
  - **Ancient 첫 진입** = DEC-043 한정흥 결말 수렴 정합, *Maquette 1 회 + 한정흥 살풀이 spine + Pari Gongju 음향 잔향* **12-15초 시그니처**
- **anti-pattern:** 모든 레어리티 / 모든 회차 동일 페이드 — Normal 의 가벼움이 Ancient 까지 평준화

### 6.9. 진입의 서사적 행위 단일 정의

> **ECHORIS 의 아이템계 진입 = 조문 (弔問).** 검은 *Vas Hermeticum* (닫힌 그릇) 이자 *imago mundi* (우주의 축소판) 이며, 그 안에는 무기 Ego 의 *잊혀진 기억* 이 적으로 잠들어 있다. Erda 는 검을 *carry* 하여 (능동 동의의 누적), 모루 (Symplegades) 위에 *놓고* (능동 입력), *수동 삼킴* (Belly of the Whale / 한국 무속 *신내림* 의 vector 반전 — 영이 내려오는 것이 아니라 *내가 영의 자리로 내려간다*) 의 자세로 *조문* 한다. 3 중 anchor (Heartbeat + 검 표면 결 + Erda silhouette) 가 *두 세계가 아니라 한 실체의 두 관찰 스케일* 임을 *신체적으로* 증명한다. 진입은 *scene-load* 가 아니라 *위령 의례의 1 비트* — 매 다이브가 한정흥 *근간 정서 락* 을 1 회씩 갱신하는 행위다.

---

## 7. 한정흥 메서드 = ECHORIS 정서 OS

### 7.1. 한정흥 trinity 정의 (7 편 종합)

- **출처 [확인함]:** Theory §0/§11/§12, Kliterature §1, *Korean Social Emotions* Springer 2022
- **요지:** 한정흥은 분리 가능한 세 감정이 아니라 **동역학적 짝 (dyadic coupling)**:
  - **한 (恨)** — *발효된 슬픔 · 미해결 부정의 · 구조적 폭력의 신체화된 잔여*. "한국인의 본질" 이 아닌 *구조 손상의 지표 (indexes structural injury)* [Sandra So Hee Chi Kim 2017]
  - **정 (情)** — *"we-ness 로 연결된 개인들 사이의 정서적 유대"* [Choi Sang-Chin]. 친밀 없이 *근접 · 반복* 만으로 발생. hwabyung 에 대한 *protective factor*
  - **흥 (興)** — *"절망을 부정하지 않으면서 솟구치는 생명력"*. 수평적 · 일상적 vibrancy. shinmyeong (신명, 수직적 황홀) 과 구별
- **셋 중 하나만 가동 시 함정:** 한 단독 (음울) / 흥 단독 (허영) / 정 단독 (신파)
- **ECHORIS 적용:** 한 = Shaft 침묵 + 수직 외화 (BGM ambient drone, 색온도 0.3 미세 변동) / 정 = Rustborn 일방향 호명 + Erda 침묵 / 흥 = Forge 단편 4 초 카니발 (세션 < 5% 빈도)
- **anti-pattern:** *"Korean people are defined by 5,000 years of accumulated sorrow"* essentialism

### 7.2. 한 → 정 → 흥 → 다음 한 순환 구조

- **출처 [확인함]:** *Korean Social Emotions* — *"Through eating, drinking, singing, and dancing together, people emit exhilaration (heung), dissolve negative feelings (han), and build up intimacy and mutual bond (jeong)"*. Squid Game 시즌 3 — 기훈의 한이 다음 세대 (아기) 로 *이월*
- **요지:** 한정흥은 단방향이 아니라 *순환*. 한이 풀린 자리에 정이 깊어지고, 정의 잉여가 흥으로 발화되며, 흥의 잔열 위에 *다음 한* 이 적층
- **ECHORIS 적용:** DEC-043 다중 결말 = *종착이 아니라 한 순환의 종점이자 다음 순환의 기점*. Ancient 수렴 = 셋이 동시 충족된 *True ending 이지만 새 한의 씨앗을 남김*. 아이템계 재진입 (야리코미) = 이 순환의 ludic 형식
- **anti-pattern:** 한을 단발 폭발 + 카타르시스로 해소시키고 닫는 헐리우드 3 막 구조

### 7.3. 판소리 5 조 정서 곡선 (Rustborn 대사 + sound)

- **출처 [확인함]:** Kpop §5.1 jangdan 매핑, Theory §4

| jangdan | BPM | 한정흥 위치 | K-pop 대응 |
|:--|:--|:--|:--|
| **진양조** | 30-45 | 한의 응고 (체념된 그리움) | IU *밤편지*, Jung Jae-il *Belt of Faith* |
| **중모리** | 60-90 | 한 → 정 전환 (조용한 발견) | BTS *Spring Day* |
| **중중모리** | 80-100 | 정의 누적 | BTS *Black Swan* studio |
| **자진모리** | 100-130 | 정 → 흥 가속 | Stray Kids *Thunderous*, Leenalchi *Tiger* |
| **휘모리** | 130+ | 흥의 분출 | Jambinai *Onda* peak |

- **핵심 학습:** jajinmori → hwimori 전환 = *abrupt cut* 이 아닌 **점진 accelerando**
- **ECHORIS 적용:** Rustborn 대사 곡선 = 진양조 (초반 침묵) → 자진모리 (보스 앞 발화 가속) → 휘모리 (Forge 단편 발동). BGM tempo 자동 가속 메커닉
- **anti-pattern:** 트로트 kkeokk-gi (꺾기) 직접 모방 — 글로벌 청취가 enka · 뽕끼와 구분 못함

### 7.4. 살풀이 3 단 — 위령 × 위로 변환

- **출처 [확인함]:** Theory §10/§15 (학술적으로 가장 단단한 mapping). Laurel Kendall musok 학술
- **요지:** 살풀이 = 무당이 sal (살, 저주) 을 *자기 psyche 로 흡수* → 신체에 장착 → *춤으로 방출*
- **ECHORIS 적용:** **DEC-036 기억 단편 메커닉이 살풀이와 구조적으로 동형 (structurally isomorphic)**:
  - *Forgotten 단편 격파 = 흡수*
  - *슬롯 장착 = 인격 통합*
  - *무기로 발산 = 전투*
- 이것이 ECHORIS resolution mechanism 의 *학술 spine* 이며, Sandra Kim critique 를 통과하면서 한 substrate 를 정당화하는 유일한 통로
- **anti-pattern:** 살풀이 의상 · 무당 시각화 직접 노출 — fetishization 직격

### 7.5. Reverse Engineering — 명시 없이 작동하는 K-cinema

- **출처 [확인함]:** Kcinema §1-5, Kdrama §1.1-1.7
- **요지:** 2010+ 세대 (봉/이/박/나) 는 임권택 *서편제* (1993) 의 *판소리 직접 발화 · 민족 풍경 · 강제 상속* 을 **의도적으로 거절**. 외국 관객이 *Han 이라는 단어 없이* 한을 받음
  - **봉준호** — 한을 *건축* (공간 / 수직성). Parasite 반지하 = 한의 데이터구조
  - **이창동** — 한을 *기다림* (시간 / 롱테이크). Burning 사양 댄스 = 흥이 한 절정에서 새어나옴
  - **박찬욱** — 한을 *디자인* (시점 / 매체). Decision to Leave iPhone 번역기 = 매개 정
  - **셀린 송** — *Past Lives* 에서 inyeon (因緣) 은 자막에 두 번 명시, han 은 한 번도 호명 안 함. ECHORIS 마케팅 전략의 시네마 prefiguration
- **ECHORIS 적용:** *봉준호 공간 도구함 + 이창동 침묵 도구함* 의 교집합 = silent protagonist + 수직 메가스트럭처. 보스 격파 후 2.5초 카메라 자동 정지 (Burning 응시 시간 게임 이식)

### 7.6. 한정흥 Anti-pattern 9 건 (마케팅 필수 회피)

1. ❌ *"Han is a uniquely Korean essence flowing in our blood"* — Sandra Kim 비판 직격
2. ❌ 5,000년 누적 슬픔 — Yanagi colonial trope 직접 복제
3. ❌ Han ≈ saudade / mono no aware 환원
4. ❌ Jeong 을 *"여성의 헌신적 사랑"* 으로 재현 — Cho Nam-joo 학술 수용 이후 정치 부담
5. ❌ Heung 을 *"K-pop 흥겨움"* 으로 환원 — Suk-Young Kim critique
6. ❌ 신파 BGM lament + 울음 클로즈업 — 2010+ K-drama 전 진영 거부
7. ❌ 한복 · 태극 · 한옥 직접 시각화 — fetishization
8. ❌ Dave the Diver 식 코믹 톤 휘말림 — DEC-042 한정흥 락 충돌
9. ❌ Killing Stalking 식 trauma bonding jeong — 건강한 jeong 으로 못박음

### 7.7. 매체별 한정흥 작동 차이

- **문학 (한강):** 2 인칭 호명 *"너"* 로 죽은 자 부르기. *Human Acts* — 산 자가 죽은 자를 부른다. 감각 디테일 (온도 · 질감 · 소리) 이 craft 방법론
- **K-pop:** Heung 을 *글로벌 단위로 재발명한 거의 유일한 산업 코퍼스*. half-time → double-time 후렴 전환, pre-drop hush + 일제 폭발, 꽹과리 1-2 hit 정체성 마커
- **Webtoon:** 수직 스크롤 = ECHORIS 매체 사촌. Solo Leveling *System UI* = 한정흥 역사상 가장 성공적인 *흥 전달 장치*. 캐릭터 침묵, System 이 말한다
- **K-drama:** 시간 누적 정. *My Mister* 동훈-지안 — 로맨스 아닌 정, 작은 동작이 정 형성
- **퀴어 fiction (박상영 *Love in the Big City*):** Heung 이 prestige prose 에 살아남은 유일 동시대 사례 — 수다스러움, 농담조 회상, 세대어
- **ECHORIS 적용:** 한강 2 인칭 호명 → Rustborn 이 Erda 를 *"you"* 로 부름. Webtoon System UI → Memory Shard 회상 화면 *중앙 · monospaced · silence panel* 3 박자. K-pop jangdan 5 조 → BGM 곡선

### 7.8. 한정흥이 게임에서 작동한 사례 — ECHORIS 계보

- **Lies of P** (Round8 2023) — Belle Époque 폐허 미장센 + Hotel Krat 불변 NPC 자리 + 거짓말 시스템 = *"참고 삼킨 진실"* 의 한 메커닉화
- **Limbus Company** (Project Moon 2023) — 가장 Han-coded 한국 게임. **E.G.O = Memory Shard 거의 동형** (*trauma 입으면 강해지지만 sanity 손상*). Mirror Dungeon = Item World 절차적 던전. Yi Sang (이상) 시인 직접 인용
- **Stellar Blade** — Adam partner-voice = Rustborn 건조한 동반자 모델. parry haptic
- **Dave the Diver** — Heung 마스터클래스. **단, 톤 휘말림은 DEC-042 와 충돌. Dave 식 코믹 차용 금지**
- **Past Lives** (영화이나 game 적 호흡) — 24 년 비대칭 매개 정 = Rustborn-Erda dyad 의 영상 prefiguration

**ECHORIS 계보 위치:** Lies of P (미장센) + Limbus (메커닉 동형) + Past Lives (매개 정) 교집합. *건강한* 사부-제자 jeong (Eleceed Kayden ↔ 지우) 을 추가 anchor.

### 7.9. 명시 노출 금지의 grammar — 5 layer 합

한정흥 직역 · 한복 시각화 · K-game 호명을 금지한 상태에서 한정흥은 **다섯 layer 의 합** 으로 전달된다:

1. **Sound 곡선** — jangdan 5 조를 BGM tempo 자동 가속으로 ludic 번역. 꽹과리 · 해금 1-2 hit 만으로 정체성 마커
2. **공간 미장센** — Shaft 수직 색온도 데이터 테이블 — 봉준호 *Parasite* 수직 한을 게임 카메라로 직접 인용. 환경이 얼굴 클로즈업 대체
3. **화자 비대칭** — 한강 *Human Acts* 2 인칭 호명 + *Omniscient Reader's Viewpoint* 비대칭 정 = Rustborn 이 Erda 보다 더 많이 안다. 정의 *비대칭 안정화*
4. **대사 톤 절제** — 편혜영 *The Hole* terse elliptical + 김영하 one-line paragraph = Rustborn 1-3 줄 대사 스타일
5. **결말 분기** — Hanpuri / Salpuri / Hwabyung-release 3-end + Ancient 수렴 = *Past Lives* 가 inyeon 만 자막에 두고 han 은 호명 안 한 전략의 게임 등가물

> **시그너처 내부 명제 (외부 발화 금지):** *"We did not invent the substrate; we structured the resolution."*

---

## 8. 장르 융합 — 메트로베니아 × 디스가이아 야리코미

### 8.1. 두 전통의 충돌과 결합

| 축 | 메트로베니아 전통 | 디스가이아 전통 | ECHORIS 선택 |
|:--|:--|:--|:--|
| 주인공 | 침묵 (The Knight) / 최소 대사 (Alucard) | 수다 (Laharl-Etna-Flonne) | **메트로베니아 (Erda 0 대사)** |
| 서사 매체 | 환경 + 단편 lore | 메인 챕터 컷씬 | **메트로베니아 (환경) + 검 Ego 1 자루당 chapter** |
| 결말 분기 | Hollow Knight 4 결말 / SotN 다중 결말 | Ally Kill 카운터 + 의회 법안 (Disgaea 10 결말) | **두 모델 결합 (DEC-043 3+1)** |
| 보스 | 인격화 (공간의 인격) | 무명 기능적 (Item General/King/God) | **인격 + 기능 동시 (5 색 기질 × 4 archetype)** |
| 아이템계 서사 | (없음) | (없음, 무한 파밍) | **각 무기 = 1 망자 위령 (DEC-046)** |

### 8.2. 비선형 서사 제약

[확인함] Deep Dive §할로우 나이트. 메트로베니아 서사 = **순서 독립**:
- (a) 각 서사 비트는 *자기완결*
- (b) 핵심 정보는 *복수 경로 중복 배치*
- (c) 결말 수렴은 *최종 영역 1 곳에서만 강제*

**ECHORIS 적용:** 무기 획득 순서는 *플레이어마다 다름* → 각 무기 Ego 서사는 *자기완결*. DEC-042 한정흥 근간 정서는 *환경 톤* 으로 항상 깔리고, 결말 분기 컷은 *최종 지점 1 곳* 에서 수렴 (DEC-043 3+1 Ancient).

**anti-pattern:** *"무기 A 를 먼저 얻어야 무기 B 서사 이해"* 의존 체인. 무기 간 *cross-reference 0* 원칙.

### 8.3. 역전 성 / 심연 = 서사적 회수

[확인함] SotN Inverted Castle (200.6% 맵 달성률). Hollow Knight 후반 영역. **역전 성 = 이미 탐험한 공간의 의미 역전 = 서사적 회수.**

**ECHORIS 적용:** *심연 (Abyss) 지층* (Ancient 전용, 4 지층 + 심연) = ECHORIS 판 역전 성. 검 Ego 의 *정체성 결이 붕괴/재조립* 되는 서사 클라이맥스. DEC-043 Ancient 수렴 결말 트리거 위치로 정합.

**anti-pattern:** 심연을 *단순 추가 콘텐츠* 로 처리. 심연 진입 = 해당 무기의 *정체성 결 전체 컷신* 강제.

### 8.4. Hollow Knight 4 결말 = DEC-043 직접 선례

[확인함] Hollow Knight 4 결말 (The Hollow Knight / Sealed Siblings / Dream No More / Embrace the Void) = *플레이어 누적 행동* (Voidheart 장착, 꿈 영역 클리어, Hornet 동반) 으로 분기 — **디스가이아 트리거 모델 (Ally Kill 카운터) 과 메커닉 동일, 톤은 메트로베니아**. 침묵 주인공 The Knight 는 결말 컷에서도 0 대사.

**ECHORIS DEC-043 = 정확히 이 구조의 차용:**
- 3 결말 = 한정흥 5 막 톤 변주
- +1 Ancient 수렴 = **Embrace the Void 등가** = 심연 지층 + 모든 정체성 결 통합 후 도달하는 무기 신격화 결말
- Hollow Knight Embrace the Void 가 *최난도 콘텐츠 완료 후 단독 해금* 이듯, Ancient 수렴은 *Ancient 등급 무기 + 심연 완주* 게이트

### 8.5. 콘텐츠 양산 — 핸드크래프트 vs 템플릿

[확인함] Tim Cain *"메인 스토리는 수제, 서브 콘텐츠는 절차적"*. Jonas *"싸게 해서 관대하게"*. **300 무기 = 템플릿 시스템 + 절차적 변주 + 핸드크래프트 시드.**

**ECHORIS 적용:**
- **핸드크래프트 (~5 자루):** Erda 검 (Rustborn) / 한정흥 3 결말 시그니처 무기 / Ancient 수렴 무기
- **템플릿 (295 자루):** 5 색 기질 × 25 몬스터 × 4 지층 = 절차적 슬롯에 *Forgotten 단편* 채워서 양산
- **SSoT:** fluid Geo System + Master CSV (DEC-046)

**anti-pattern:** 300 무기 모두 핸드크래프트 시도 → 1 인 개발 8 년 소요.

---

## 9. Rustborn 화법 보강 — CNT-DIR-002 §8 위에 layering

> 본 절은 CNT-DIR-002 §8 (Violet 6 항목 화법 spec) 의 *보강 layer*. 중복 회피, 추가 spec 만.

### 9.1. 부정문 미러링 락

[확인함] Reference/Violet_Evergarden_Analysis_for_Rustborn §5.3. Violet EP07 *"불타고 있지 않습니다"* → 7 화 후반 *"불타고 있습니다"* 의 역전 구조.

**ECHORIS 적용:** Stage 0 의 *"I feel nothing"* 가 Stage 4 에서 *"I felt nothing. That was wrong."* 으로 그대로 회수되는 수미상관 grammar. 부정문 = *미래의 긍정문에 대한 약속어음*.

### 9.2. 처분 요청 → 살아도 됩니까 — 판단 주체 전환

[확인함] Violet 분석 §5.2. **Stage 0 Rustborn 이 *"Discard me when you find a stronger one"* 발화 → Stage 5 에서 *플레이어가 더 강한 무기 입수 후에도 Rustborn 을 다시 장착하는 행위 자체* 가 정서 사건** 이 되도록 코드 / UI 레이어에서 hook 필요. *판단 주체* 가 무기에서 플레이어로 이전.

### 9.3. 발화 빈도 톱니 곡선 (Stage 0~6)

[추측임 — Violet TV 정량 측정 미수행, Reference §1.3 정성 묘사 기반]

| Stage | wpm | 톤 | Violet 미러 |
|:--|:--|:--|:--|
| 0 | ~25-35 | 튜토리얼 dump, 도구 매뉴얼 | EP01 |
| 1 | ~15-20 | 행정 거절, 단음절 | EP02 |
| 2 | ~10-15 | 관찰 + 질문 | EP03-06 |
| 3 | ~8-12 | 감각 보고, 신체 어휘 | EP07 직전 |
| 4 | **~30-40 [SPIKE]** | 감정 폭발 | EP07 *Burning* |
| 5 | ~12-18 | 부분 이해, *"조금"* | EP13 |
| 6 | ~3-6 | 침묵 회수 | EP14 |

**Stage 4 spike 가 락.** 평탄 감소 곡선만 짜면 정서 카타르시스 사라짐. *내러티브 트리거 조건* = 보스전 직전 / 핵심 기억 회상 / Erda 사망 위기 중 후속 결정 필요.

### 9.4. Stage-게이트 어휘 화이트 / 블랙리스트

[확인함] Violet 분석 §5.4 — *"무기는 필요하지 않습니다"* 가 어휘 카테고리 전환을 명시적으로 선언

| Stage | 허용 어휘 | 금지 어휘 |
|:--|:--|:--|
| 0-1 | command, task, function, discard, deploy | feel, want, remember |
| 2-3 | weight, cold, heavy, dim, dry (신체) | love, fear, grief |
| 4 | burning, breaking, shaking (폭발 spike) | calm, fine |
| 5 | little, slightly, I think | certainly, fully |
| 6 | I waited, I came, you | command, weapon (퇴행 트리거 외) |

**퇴행 락:** Stage 5-6 에서도 위기 보스전 직전 1 라인만 *"You may use me. I am a weapon"* — Violet 극장판 미러.

### 9.5. 검 Ego × Erda 비대칭 호명 grammar

[확인함] Violet & Gilbert 호명은 *완전 비대칭* — Violet 평생 *"少佐 (소령님)"* 단 한 호칭. Gilbert *"Violet"* 이름 호명. **호칭 비대칭 = 정의 (定義) 의 비대칭** 의 grammar.

**ECHORIS 적용:** Rustborn 만 *"Erda"* 호명, Erda 는 0 대사. **그러나 Erda 의 *대응 grammar* 가 비대칭 정의 작동을 위해 필요** — *행동 호명*: 검을 *집어드는 동작 / 휘두르기 / 칼집에 거는 단조 동작* 의 frame-perfect 반복. Stage 5+ 에서 Erda 가 칼자루를 *평소보다 0.5초 더 길게 쥐는* 한 frame 단위 차이 = Gilbert *"Violet, you don't have to..."* 등가 응답. UI: *Erda 의 칼자루 접촉 길이* 가 정서 metric.

### 9.6. 아야나미 레이 layering — DEC-033 *"+ Rei"* spec 화

[추측임 — EVA 자막 부재] Rei 의 시그니처:
- 단답 (5 음절 이하)
- 비대칭 동공 정지
- 동조율 metric
- *"나는 대체될 수 있다"* 의 자기 도구화
- **Violet 과 달리 질문하지 않음** (Violet 은 "사랑이 뭔가요" 묻지만 Rei 는 묻지 않음)

**Violet base + Rei layer 처방:**
- **질문 빈도 50% 컷** (CNT-DIR-002 §8.2 항목 3 의 빈도 spec 대비)
- **사과 어휘 → 침묵 또는 *". . ."* 치환** (CNT-DIR-002 §8.2 항목 5 의 EN 로케일 우려 *과도하게 일본적* 위험 처방과 동일)
- **Rustborn 음성 EQ 에 *0.2-0.4초 reverb tail + breath cut-off***
- **3-frame 동공 정지** = Rustborn UI 의 *blade highlight 3-frame freeze*
- **동조율 metric** = Erda 의 칼자루 접촉 시간 + 무기 swap 빈도의 inverse. *"동조율"* UI label 노출 금지 (메타포 비주얼 anchor 만 허용)

---

## 10. 1 인 개발 내러티브 메타 방법론 — 10 항목

### 10.1. Design Document 의 정의

[확인함] Damion Schubert GDC 2007/2008. **GDD 5 목표** = ① 합의 ② 부서간 비전 공유 ③ 일정 ④ 초점 ⑤ 상충 사전 발견. **12 원칙 핵심** = 짧게 / 우선순위 / 보여주기 / 사용자 스토리 / 코드-콘텐트 분리 / 중복제거 / 애매한 표현 금지 / 이유 (FAQ) 포함.

**ECHORIS 적용:** *기획자는 What 정의, How 는 구현자에게*. Documents/ 5 단계 구조가 이미 *짧고 분리된 마스터-참조* 모델. CNT-DIR-001/002 가 SSoT, 다른 문서는 *"DIR-001 §X 참조"* 로 통일. **신규 시나리오 비트는 *"플레이어는 첫 30분에 ~를 경험한다"* 사용자 스토리 형식.**

**anti-pattern:** GDD 에 *"검 Ego 의 대사 비트를 어떻게 큐잉할지"* 같은 How 기술 → 구현 자유 박탈.

### 10.2. Design Document 갱신 주기

[확인함] Schubert *"10. 가끔 프로세스를 재검토하라"* — *6 개월 유효기간*. Tim Cain — *"2 년 후 디자인 필러 변경하면 2 년이 무효화됨"*.

**ECHORIS 적용:** DEC-NNN 체계가 *변경 로그* 역할. 한정흥 락 (DEC-042) / 위령 락 (DEC-047) / 검 Ego 락 (DEC-033) 은 *재논의 금지* 영역. 그 외 콘텐츠 비트는 분기 단위 재검토.

**anti-pattern:** Phase 2 도중 *Core Fantasy* 까지 갱신 → 누적 작업 무효화.

### 10.3. Documentation 적정량 (1 인 개발)

[확인함] Schubert *"2. 짧게 써라"*. Jonas *스코프 폭발* 경고.

**ECHORIS 적용:** Documents/Design/Design_*.md 한 파일당 **~1,500 단어 상한**. Fina 협업 종료 후 *시나리오 작가 onboarding 용 두꺼운 바이블* 작성 충동 거부. CNT-DIR-001/002 + 메모리 락 카드로 충분.

**anti-pattern:** 검 Ego 대사 톤 · 억양 · EQ 를 *작가 onboarding 용* 으로 두꺼운 문서화 → Victor 1인 진행에 무의미.

### 10.4. Iteration — 언제 멈추는가

[확인함] Tim Cain *"Temple 실패에서 Fallout 성공보다 더 많이 배웠다"*. Jonas *3 일 시장 검증* / Thronefall *9 아이디어 → 4 프로토타입 → 1*. Sakurai *분해 → 분석 → 재구성*.

**ECHORIS 적용:** Phase 2 *첫 30분 비트* 가 iteration 최상위 단위. 비트 단위 5-10 회 playtest 후 ≥3 명 동일 신호 시 다음 비트. Onboarding 35 단어 예산은 그 안에서 iteration.

**anti-pattern:** 검 Ego 첫 1 줄 대사를 50 회 다듬는 동안 *아이템계 진입 비트 자체* 가 검증 안 됨.

### 10.5. Vertical Slice

[확인함] Jonas *3 일 검증* + Tim Cain 코어 루프 프로토타입.

**ECHORIS Vertical Slice:** *월드 탐험 → 아이템 획득 → 아이템계 1 지층 → 강화 → 월드 새 게이트 돌파* 의 한 사이클 완주. Phase 2 의 Steam Coming Soon 트레일러 = vertical slice 그 자체. **MVP 컷오프 = 첫 30 분 + 아이템계 1 다이브.**

**anti-pattern:** vertical slice 에 *4 지층 + 멀티플레이* 까지 넣으려는 충동.

### 10.6. Solo Dev Scope 통제

[확인함] Jonas Four Pillars Scope — *작은 코어 + 점진 확장*. Tim Cain *Simple but Deep*. **Jonas — *"Do not start with a level. Start with a mechanic"* — 메카닉 1 개를 재조합으로 콘텐츠 양산.**

**ECHORIS 적용:** 300 무기 = *재조합 양산* 필수. 5 색 기질 × 25 몬스터 × fluid 컨테이너 = Disgaea Geo System 재해석. 무기당 핸드크래프트 서사는 5 개 *핵심 결* 만, 나머지는 5 색 기질 변주.

**anti-pattern:** 300 무기에 *개별 시나리오 대사* 작성 시도.

### 10.7. Playtest / Player Feedback 처리

[확인함] Jonas — *"1-2 명이 같은 말 = 무시 가능 / 3 명 이상 = 반드시 수정"*. Sakurai §3-3 — *"어쨌든 클리어하지 못하는 것보다는 낫다"*. **피드백 = 증상이지 처방 아님.** 플레이어가 솔루션 제시하면 *솔루션 무시 + 문제만 추출*.

**ECHORIS 적용:** Playtest 2026-04-17 ~ 04-25 P0 누적이 *온보딩 심볼 프롬프트 + 보스 HUD 재설계* 트리거. **시그널 KPI = 1 차 niche 만족도** (BLAME! / Disgaea / Transistor 팬). 캐주얼 플레이어 *"친절함" 요청 = 디자인적으로 거절*.

**anti-pattern:** 1 명의 *"검 Ego 가 말이 많아요"* 피드백으로 35 단어 예산 위반.

### 10.8. Storytelling Pipeline — 1 인 개발 흐름

[확인함] Schubert *"콘텐트로부터 코드를 분리"*. Tim Cain *설정 → 스토리 → 메카닉* 순서.

**ECHORIS 5 단계 파이프라인:**
```
기획 (CNT-DIR-001/002 §X)
   ↓
시나리오 비트 (Documents/Design/Design_Narrative_*.md, 5 막 spine, ≤1,500 단어)
   ↓
대사 키 등록 (Content_Localization.csv, weapon.erda.greet 형식, 35 단어/scene 예산)
   ↓
구현 (t("key") + 검 Ego SFX 큐)
   ↓
검수 (playtest 3 명 패턴 + locale build 자동 검증)
```

Victor 가 5 단계 모두 담당 ⇒ *각 단계 산출물은 다음 단계에 직접 입력 가능한 포맷* 으로. 산문 X, 비트 리스트 + 키 + 35 단어 예산 O.

**anti-pattern:** Word 산문으로 시나리오 작성 → CSV 키화 시 *2 차 번역* 손실.

### 10.9. 콘텐츠 양산 — 템플릿화 vs 핸드크래프트

[확인함] Tim Cain *"메인 스토리는 수제, 서브 콘텐츠는 절차적"*. Jonas *"싸게 해서 관대하게"*.

**ECHORIS 양산 모델:**
- **핸드크래프트 영역 (~5 자루):** Erda 검 (Rustborn) / 한정흥 결말 분기 3 자루 / Ancient 수렴 무기
- **템플릿 영역 (295 자루):** 5 색 기질 × 25 몬스터 × 4 지층 = 절차적 슬롯 + Forgotten 단편 채워서 양산
- **SSoT 양산 도구:** fluid Geo System + Master CSV

### 10.10. Cutting Scope — 무엇을 자르고 무엇을 남기는가

[확인함] Sakurai *분해 → 분석 → 재구성*. Schubert *우선순위 5 단계 + 약점 제거 (Cull the Weak)*.

**자르는 기준:** *코어 판타지를 강화하지 않으면 자른다*. 자르지 않는 것 = *스파이크 신호*.

**이미 자른 17 건 + 폐기 누적** (재도입 금지 락):
- 허브 (3-Space → 2-Space) / Innocent (DEC-036 흡수) / 재귀 진입 (DEC-039) / 안개 변신 (Mist Form SotN 카피 우려) / Lore 무기 (DEC-023 → DEC-046) / iPad 저성능 분기 / 판타지 톤 아이템 서사 (DEC-041) / 퀘스트 시스템 (SYS-QST-01) / 대화 시스템 (SYS-DLG-01) / NPC 직접 대사 / etc.

**남기는 것 = 스파이크 신호:**
- 검 Ego 첫 1 줄
- 아이템계 1 다이브
- 5 색 기질
- fluid Geo System
- 한정흥 정서 spine
- 위령 명제

### 10.11. 역할 구분 — Victor 1 인 통합

[확인함] Schubert *기획자 What / 구현자 How*. Sakurai *분해 → 분석 → 재구성*.

| 역할 | 책임 | ECHORIS 산출물 |
|:--|:--|:--|
| **내러티브 디자이너** (구조) | 검 Ego × Erda 침묵 × 5 막 spine 의 *시스템 설계* | 본 문서 + DEC 락 |
| **작가** (시놉시스 / 세계관) | CNT-DIR-001/002 + 한정흥의 *테마 / 정서 spine* | CNT-DIR-001/002, Synopsis |
| **라이터** (대사) | Content_Localization.csv 의 *35 단어 예산 내 문자열* | CSV 키 |

Fina 협업 종료 (2026-05-27) 후 *외부 라이터 재섭외 금지*. **세 역할이 *동일 인격* 안에 있으므로 산출물 포맷이 모두 *Victor 가 그 다음 단계에 직접 투입 가능한 형식* 이어야 함** (산문 X, 비트+키+예산 O).

Schubert *"외부 비평 없는 기획서는 살아남지 못한다"* 경고는 1 인 개발 맥락에서 *playtest 3 명 패턴* 으로 대체.

---

## 11. 통합 결정 락 (Established)

본 문서로 *Established (canon)* 락:

1. **§1 단일 명제** — 위령 외피 × 위로 meta × 한정흥 순환 × 5 채널 매체
2. **§2 플레이어블 스토리 정의** — *씬의 연속*, 5 채널 공명. 시네마틱 / 플레이어블 비교표는 *ECHORIS = 풀 플레이어블 niche* 락
3. **§3 메인 스토리 7 항목** — Critical Path / Fire 비트 5 / 40 초 / Hook 3 단 / 행동 발현 / 시스템 정점 / 다중 분기
4. **§4 사이드 8 항목 + Disgaea 강화 계승 + Hades 침묵 변주** — *무기 1 자루 = 한 망자 위령호* 락
5. **§5 플레이어블 9 방법** — Play don't show / 환경 = 마지막 화자 / 40 초 / 묵시 / Fire & Ember / 시선 차단 / 시스템 = 주제 / 호흡 / 통합 사례
6. **§6 아이템계 진입 8 항목** — 임계점 / 3 중 anchor / Carry Phase / Texture Survival / 7 device / Game grammar / 납치 금지 / 무게 차등
7. **§7 한정흥 9 항목** — trinity / 순환 / 판소리 5 조 / 살풀이 3 단 / Reverse Eng / 9 anti-pattern / 매체별 / 게임 사례 / 5 layer grammar
8. **§8 장르 융합 5 항목** — 메트로베니아 톤 × 디스가이아 메커닉의 *최초 결합 시도*
9. **§9 Rustborn 보강 6 항목** — 부정문 미러링 / 처분 요청 hook / 톱니 곡선 / 어휘 게이트 / Erda 행동 호명 / Rei layer
10. **§10 메타 11 항목** — GDD / iteration / vertical slice / scope / playtest / pipeline / 양산 / 컷팅 / 역할 분리

---

## 12. 후속 작업

본 문서 락 직후 다음 작업이 *시금석을 갖고* 진행 가능:

1. **CNT-DIR-001 갱신 PR** — CNT-DIR-002 §11 + 본 문서 §9 의 보강 사항 SSoT 동기화 (11+ 건)
2. **`Design_Narrative_Rustborn_VoiceSpec.md` 신규 작성** — §9 의 6 항목 + CNT-DIR-002 §8.2 의 6 항목 = 12 항목 화법 락 문서 (EN 로케일 사과 빈도 치환 규칙 포함)
3. **`Content_Rustborn_Onboarding_Sequence.md` 검수** — §9.4 Stage-게이트 어휘 화이트/블랙리스트로 회수 검수
4. **첫 5 명 Echo-Bearer 캐릭터 brief** — §4.6 NPC 1:1 mapping + §7.7 매체별 한정흥 적용
5. **DEC-040 sonic palette 발주 spec** — §7.3 판소리 5 조 jangdan BPM 데이터로 ElevenLabs 프롬프트 작성
6. **아이템계 진입 sequence v2 spec** — §6 의 3 중 anchor + Carry Phase + 무게 차등 매트릭스 통합
7. **Steam About v4 / 트레일러 카피 v2** — §7.9 5 layer grammar 정합 + CNT-DIR-002 §10 카피 풀에서 도출

---

## 13. 학술 · 인터뷰 응답 grammar

본 문서 락이 *외부 비평 · 인터뷰* 에서 백래시 받을 때:

| 비평 | 응답 |
|:--|:--|
| *"또 다른 grief tourism 게임"* | 본 게임의 위령 = *플레이어 자신의 위로* 변환. Spiritfarer / Celeste 와 동일 계보 |
| *"왜 한국 테마를 숨기는가?"* | 한정흥 = 내부 spec, 외부 신호 = 침묵 · 호명 · 환경 변화. 데이브 더 다이버 / Past Lives 선례 |
| *"부정적 감정 낭만화 우려"* | Inside Out 2 임상 자문 (Lisa Damour) 과 동일 입장 — *부정적 감정은 추방 대상이 아니라 자기 정체성의 한 결* |
| *"아웃사이더 서사 진부함"* | Victor 가 *자기 자신과 자기 같은 사람을 위로하기 위해* 만드는 게임. 일반화된 outsider claim 아닌 *1 인 개발자의 1 인칭 위로 편지* |
| *"4 children's films 가 sci-fi 에 안 어울림"* | 정서 DNA 는 매체 · 장르 무관 동일. Wreck-It Ralph *I'm bad and that's good* = BLAME! / Transistor 의 정서적 본질과 동일 코어 |
| *"왜 디스가이아 + 메트로베니아 인가?"* | 디스가이아 *아이템계 = 절차적 무한* 메커닉을 메트로베니아 *침묵 + 환경 서사* 톤으로 *세계 최초 결합*. 한정흥 정서가 그 결합의 *접합 grammar* |

---

## 14. 문서 일관성 점검

- [x] 마크다운 링크 뒤 공백 정합
- [x] `~` 미사용
- [x] 이모지 0 건
- [x] 한국어 존댓말 / 일본어 0 건
- [x] [확인함]/[추측임]/[근거 없음] 태그 적용
- [x] DEC-041 판타지 어휘 0 건
- [x] DEC-042 한정흥 backbone 정합
- [x] DEC-043 다중 결말 정합
- [x] DEC-047 위령 Core Purpose 정합
- [x] Must / Should / Nice-to-have / Must Not 우선순위 용어
- [x] CNT-DIR-001/002 와 cross-reference 일치
- [x] Victor 4 시드 명시 노출 금지 (외부 카피) — 본 문서는 내부 SSoT, 외부 노출 금지

---

**Cross-references:**
- `Documents/Content/Content_Direction.md` (CNT-DIR-001) — 테마 / 시놉시스 / 내러티브 단일 뿌리
- `Documents/Content/Content_Direction_SeedAnalysis.md` (CNT-DIR-002) — 4 시드 + Violet 자막 fact base
- `Documents/Design/Design_Narrative_HanJeongHeung_Archetype.md` — 한정흥 implementation spec
- `Documents/Design/Design_Narrative_Worldbuilding.md` (D-12) — 환경 서사 7 원칙
- `Documents/Design/Design_ItemWorld_Onboarding_SwordEgo.md` (DES-IW-ONB-01) — 검 Ego 온보딩
- `Documents/Content/Content_Story_Synopsis.md` (CNT-STR-001) — 시놉시스 spine
- `Documents/Content/Content_Rustborn_Onboarding_Sequence.md` — Stage 0~1 대사
- `Documents/Terms/Project_Vision_Abyss.md` §1 (위령 Core Purpose / DEC-047)
- `Reference/Subtitle/` — 자막 원본 7 편 + Violet Evergarden 14 화
- `Reference/witcher3_인사이트.md` / `Reverse_GDD_SideQuest_Narrative_Framework.md` / `HanJeongHeung_Research_*.md` × 7 / `InnerSpace_Entry_Research_*.md` × 6 / `Metroidvania Game Design Deep Dive.md` / `Disgaea_ItemWorld_Reverse_GDD.md` / `Hades_Boon_Reverse_GDD.md` / `Violet_Evergarden_Analysis_for_Rustborn.md` / `게임 기획서 작성법 (Damion Schubert GDC).md` / `sakurai_인사이트.md` / `timcain_인사이트.md` / `jonastyroller_인사이트.md` / `noclip_인사이트.md` / `designdocs_인사이트.md` / `extracredit_인사이트.md` / `UnfamiliarMechanic_Teaching_Research_Environmental.md` / GDC 인사이트 5 종
- `memory/wiki/decisions/DEC-033 / 036 / 038 / 039 / 042 / 043 / 046 / 047`
- `memory/project_core_purpose_requiem.md` / `project_meta_purpose_consolation.md` / `project_hjh_archetype_locked.md` / `project_onboarding_methodology_locked.md` / `project_no_damascus_terminology.md`
