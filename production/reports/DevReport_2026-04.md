# ECHORIS 개발 보고서 — 2026년 4월

> 작성일: 2026-06-08 · 대상 기간: 2026-04-01 ~ 2026-04-30
> 근거: git 커밋 155건 (dev 위키 일지는 미운용 기간 — git 히스토리 실측)
> 단계: Phase 1 심화 → 웹 배포 본격화 → 첫 플레이테스트 루프

---

## 1. 한눈에 보기

4월은 ECHORIS가 **"내 컴퓨터 속 프로토타입"에서 "공개된 게임 echoris.io"로** 나온 달이다. 커밋 155건(월간 최다)으로, 세계 구조와 내러티브 정체성을 확정하고, 웹사이트·커스텀 도메인·문서 사이트를 띄우고, 네 차례 외부 플레이테스트(04-17·04-20·04-27·04-29)를 돌려 피드백 루프를 처음 가동했다. 동시에 God Object 분해 등 구조 리팩토링으로 코드 기반도 정비했다.

| 지표 | 값 |
| :--- | :--- |
| 커밋 수 | 155건 (월간 최다) |
| 플레이테스트 | 4회 (04-17·04-20·04-27·04-29) |
| 신규 의사결정(DEC) | DEC-026·027·033·034·035·036·037·038 |
| 핵심 사건 | echoris.io 도메인 연결, "Project Abyss"→"ECHORIS" 개명 |

---

## 2. 주차별 흐름

### 2-1. 1주차 (04-02 ~ 04-08) — 세계 구조 + 내러티브 정체성 확정
- **수직 대공동(The Shaft) 세계 구조 전면 개편** + 구역→층위 ~270건 치환(21파일). 카메라 줌 시스템 + 구역 줌 존.
- **Erda = 킬리(BLAME!) 오마주 과묵 주인공**으로 재설계. 동행 캐릭터=일시 동행, 마르타=흔적만 남는 부재 캐릭터.
- **2-Space 모델 전환:** 3-Space → 2-Space(허브 삭제, 퀘스트/대화 DEPRECATED), 재귀적 진입 → 순환 진입.
- **수익화 전략(D-14):** 웹 무료 + Steam 프리미엄 모델 확정.
- **아트 디렉션 전환:** 고딕 다크 판타지 → 메가스트럭처 + 판타지. Midjourney v7 컨셉아트 12장.
- **렐릭(능력 게이트) 구현:** 대시를 기본 조작 → 렐릭으로 전환, 다이브 어택, 역류의 쇄도(Surge), 수중 호흡(20초 산소 + 비네트).
- 발코니 종료 시퀀스(에코 공명 + ECHORIS 타이틀 + 'To be continued'), 이동 물리 전수 재조정(14파일).
- Phase A 전투 폴리시: StatGate, Guardian 보스, 크리티컬, 슈퍼아머, 대시 무적 제거.

### 2-2. 2주차 (04-09 ~ 04-16) — 웹 배포 + 개명 + 아키텍처 정비
- MemoryDive 진입 연출 + Gold 시스템 + 적 밸런스.
- **LDtk Multi-World 병합**(Layout + ItemStratum 단일 프로젝트) + 아이템계 대규모 확장(클리어/재진입/지층 선택/포털 복원).
- GA4 텔레메트리 시스템 + KPI 분석. 좀비 코드 삭제(Dialogue/ThoughtBubble/VirtualPad).
- **echoris.io 커스텀 도메인 연결**(04-15) + 홈페이지 + /play/ 구조 전환 + 투톤 grunge 로고 + 소셜 링크.
- **God Object 분해 Phase 1+3** — EnemyFactory·EndingSequence·UpdraftSystem 추출.
- **MkDocs + Material 문서 사이트** + **"Project Abyss" → "ECHORIS" 전 문서 일괄 개명**(04-16).
- 보스 디자인 리서치 + 100무기 다양성 프레임워크.

### 2-3. 3주차 (04-17 ~ 04-23) — 플레이테스트 루프 가동 + 아트/UI
- **멀티 아틀라스 파이프라인 + 팔레트/로어 CSV SSoT + world 타일셋**, CSV Tileset authoritative.
- **플레이테스트 04-17 피드백 구현(A1-A17)** + Sacred Pickup.
- **Erda 캐릭터 스프라이트/애니메이션** + 아이템 아이콘 64px + 무기 히트박스/FX 시스템.
- **플레이테스트 04-20 P0/P1 구현 + CSV 정합성 검증기.** Pattern D(Proximity Interaction) + ProximityRouter(DEC-027). GA4 전면 개편(4대 버그 + P1 9종) + GA4 대시보드.
- HUD 스킨 시스템 + UI 문서 4종, 절차적 타일 장식(ProceduralDecorator) + 구조물 레이어, 패럴랙스 3레이어.

### 2-4. 4주차 (04-24 ~ 04-30) — 빌더·UI 대개편 + 토폴로지 결정
- Anvil 슬롯/InventoryUI 개편 + StrataConfig 난이도 하향 + HUD/세이브포인트/Depth gauge 폴리시.
- **God Object 분해** — 씬 책임을 6개 컨트롤러로 분리. 카메라 bounds 버그 + look-ahead.
- **GiantBuilder 엔티티** + LegRig + AreaTitle, ProceduralPrimitives, VoidDrop/VoidFogSystem.
- DEC-033/034 내러티브 개편 + 검 Ego + EgoDialogue.
- **DEC-035** UI 키컬러 orange + 2-Tier intensity + PlayerBuffSystem + 대규모 UI 개편.
- **DEC-036 Memory Shard 통합 + DEC-037 Ant Colony(방사형) 토폴로지** + DEC-038 Town of Orphaned Shadows.
- 골드 드랍 confetti 물리(1/5/10/50/100 액면). Switch/SavePoint props + **플레이테스트 04-27/04-29 피드백**.

---

## 3. 주요 마일스톤

1. **echoris.io 공개** (04-15) — 커스텀 도메인 + 홈페이지 + /play/ 구조 + 로고. 게임이 외부에 노출되기 시작.
2. **"ECHORIS" 정체성 확정** (04-16) — 전 문서 개명 + MkDocs 문서 사이트.
3. **세계·내러티브 재설계** — 수직 대공동(The Shaft) + Erda 과묵 주인공 + 2-Space 모델 + 렐릭 능력 게이트.
4. **플레이테스트 루프 가동** (4회) — 외부 피드백을 P0/P1로 분류·구현하는 사이클 첫 확립 + CSV 정합성 검증기 도입.
5. **아키텍처 정비** — God Object 분해(씬→6 컨트롤러), 멀티 아틀라스/CSV SSoT 파이프라인.
6. **아이템계 토폴로지 결정** (DEC-037 Ant Colony 방사형) + Memory Shard(DEC-036).

---

## 4. 의사결정 (DEC) 요약

| ID | 주제 |
| :--- | :--- |
| DEC-026 | 로어 무기 재매핑 |
| DEC-027 | Pattern D — Proximity Interaction(ProximityRouter) |
| DEC-033/034 | 내러티브 개편 + 검 Ego |
| DEC-035 | UI 키컬러 orange + 2-Tier intensity |
| DEC-036 | Memory Shard 통합 |
| DEC-037 | 아이템계 토폴로지 — Ant Colony(방사형) |
| DEC-038 | Town of Orphaned Shadows |

---

## 5. 평가 · 5월 이월

### 잘된 것
- 게임이 **공개 제품(echoris.io)으로 전환** + 정체성(ECHORIS) 확정.
- 플레이테스트 → 피드백 분류 → 구현 루프를 처음 확립 — 4월의 가장 큰 성과.
- 세계 구조·내러티브·아트 디렉션의 굵은 줄기 결정.

### 부채 · 리스크
- 세계/내러티브를 한 달 안에 여러 번 재정의(구역→층위, 3→2-Space, 아트 디렉션 전환) — 방향은 좋아졌으나 문서 정합성 보수 비용 큼(5-Layer 검증 반복).
- 빌더/장식/UI에 폴리시 커밋 다수 — 코어 루프 완결보다 표면 다듬기 비중.

### 5월 이월
- 오디오 파이프라인 + i18n(KR/EN) 구축.
- 유체·화학 환경 시스템으로 게임플레이 깊이 확장.
- Steam 페이지 + 투자 자산(피치덱) 준비.

---

> 본 보고서는 git 실측 기록 기반이다. (해당 기간 dev 위키 일지 미운용)
