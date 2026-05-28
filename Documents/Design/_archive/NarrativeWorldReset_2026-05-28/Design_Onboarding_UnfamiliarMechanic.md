# 생소한 메커닉 전달 방법론 — Unfamiliar Mechanic Teaching

> **문서 ID:** DSN-ONB-UM-001
> **문서 상태:** Established (canon) — 2026-05-25 락
> **작성일:** 2026-05-25
> **담당:** Game Designer (총괄), Narrative Director (Rustborn 톤), UX Designer (UI 변신)
> **선행 리서치:** `Reference/UnfamiliarMechanic_Teaching_Research_*.md` 5건 (총 ~32,300 단어)
> **개정 사유:** ECHORIS Item World 진입 메커닉이 *Disgaea 외에는 친숙하지 않은 메커닉* 으로, 1차 niche 외 영어권 플레이어에게는 *생소함*이 도달 장벽. 5개 도메인 종합으로 *외부 안내 없이* 메커닉을 전달하는 방법론 락.
> **선행 문서:** `Documents/Design/Design_ItemWorld_Onboarding_SwordEgo.md` (DES-IW-ONB-01, Proposal 상태) — 본 문서는 *방법론 spec*, 그 문서는 *Item World 한정 적용 안*.
> **상위 SSoT:** `Documents/Terms/Project_Vision_Abyss.md` §2, `memory/project_design_decisions.md` DEC-033/042

---

## 0. 본 문서의 위치

ECHORIS 는 *복수의* 생소한 메커닉을 갖는다:

1. **Item World 진입** — "아이템에 들어가면 그 안에 살아있는 세계가 있다" (DEC-033)
2. **검 Ego (Rustborn)** — 침묵 주인공 + 말하는 도구
3. **Memory Shard 의례** — Forgotten→Recalled 회상 메커닉
4. **5색 기질(Forge/Iron/Rust/Spark/Shadow)** — 약점·상성·전투 어휘
5. **다중 결말 누적 트리거** — 단일 시스템 누적치가 결말 분기 (DEC-043)
6. **fluid Geo System** — 컨테이너↔fluid 상호작용

위 6개 모두 *외부 안내가 적은* 채로 플레이어가 *직관*해야 한다. 본 문서는 **단일 통합 방법론**을 락 하여 6개 메커닉 각각에 적용한다.

`Design_ItemWorld_Onboarding_SwordEgo.md` (DES-IW-ONB-01) 는 Item World 한정 적용 안. 본 문서가 *상위 방법론*, 그 문서가 *하위 적용 1번*. 다른 메커닉도 본 방법론에 따라 적용 안을 별도 작성한다.

---

## 1. 5개 도메인 합치된 결론 (Cross-Domain Agreement)

5개 raw 리서치(`_MetaUI` / `_Documentation` / `_Environmental` / `_GDC_GMTK` / `_GenreSpecific`)가 *서로 다른 작품군*을 조사했음에도 **동의한 결론** 만 추출. 1개 도메인만 주장한 device 는 §3 에서 별도 평가.

### 1.1. 5개 도메인 모두 동의한 7가지

| # | 합치된 결론 | 주요 근거 작품 |
|:--|:--|:--|
| 1 | **수단(verb)을 행동으로 가르치고, 정당화는 행동 *직후* 텍스트로** | Portal 첫 30분 / Half-Life 2 Ravenholm / Cocoon / Hollow Knight / Hades |
| 2 | **첫 시도는 *안전*하고, 두 번째는 *위험*하다** (Mario 1-1 4-beat) | Mario 1-1 / Portal / Cocoon / BotW Great Plateau / Hades Tartarus |
| 3 | **첫 30분 안에 *전체 core verb 의 하나*가 등장** (Anna Anthropy 원칙) | Portal / Undertale / Inscryption Act 1 / Tunic / Hollow Knight |
| 4 | **튜토리얼 popup 텍스트는 *행동 직후 1-2줄*만** — 그 이상은 신호 과잉 | Half-Life 2 GMTK 분석 / Witness / Tunic / Cocoon |
| 5 | **메커닉을 *반복 노출*로 자발 발화 강제** (scaffolded retrieval) | Hades 매 run / Slay the Spire / Hollow Knight 능력 게이트 / Inscryption 재시작 |
| 6 | **친숙 UI 의미를 *재할당*하면 발견의 쾌감 극대화** — *완전 novel UI* 보다 효과적 | Undertale SAVE 메뉴 / Inscryption Act 1 카드 / Disco Elysium 스킬 |
| 7 | **메커닉 도입 *직전*에 그 메커닉의 *부재*를 느끼게 함** (긴장 사전 설치) | Cocoon 첫 sphere 도입 / Portal 첫 portal / Tunic 매뉴얼 첫 페이지 발견 |

### 1.2. 4개 도메인 이상 동의한 5가지

| # | 합치된 결론 | 동의 도메인 |
|:--|:--|:--|
| 8 | **5단계 진행 곡선** (Introduce → Develop → Test → Twist → Reward) | Environmental / GDC_GMTK / GenreSpecific / Documentation |
| 9 | **첫 메커닉 도입 timing = 15-30분 구간** | Environmental(15-20) / Meta-UI(25-35) / GenreSpecific(15-20) / GDC_GMTK(범위 기재) |
| 10 | **시스템이 *플레이어보다 먼저 변화*하면 gimmick 으로 추락** (YIIK 반례) | Meta-UI / GDC_GMTK / GenreSpecific |
| 11 | **메뉴/인벤토리 자체가 *교습면*이 되면 텍스트 부담 -50%** | Meta-UI / Documentation / GenreSpecific |
| 12 | **invented language(가공 언어)는 *5-10 글리프* 이하 minimum viable 권장** | Documentation / Environmental / GenreSpecific |

### 1.3. 2개 도메인만 동의 (선택 적용)

- **메타 UI 변신**(Inscryption Act 2 식): Meta-UI / GenreSpecific 동의. Documentation/Environmental/GDC_GMTK 는 *과잉* 위험 경고. **ECHORIS 채택: 약화안만** (인벤토리 슬롯 결 시각화 정도, Act 전환식 완전 변신 금지)
- **물리 매뉴얼 페이지 수집**(Tunic 식): Documentation / GenreSpecific 동의. Environmental 은 *2D 횡스크롤 호환성 의문* 경고. **ECHORIS 채택: 30분 한정 노출 + Memory Shard 도감으로 자동 전환**

### 1.4. 도메인 충돌 1건 (조정 필요)

**첫 Item World 진입 timing**:
- Environmental: 15-20분 (Cocoon / HK Vengeful Spirit 모델)
- Meta-UI: 25-35분 (Steam promise 정합, 신뢰 곡선)
- GenreSpecific: 15-20분 (HK Mantis Village Dream Nail 첫 사용 timing)

**조정 (§4.3 확정):** **15-25분 구간**. 15분 = Steam promise 의 *시각적 약속* 충족 (광고와 게임 첫 30분 정합). 25분 상한 = 그 이상은 *지연 폭로* 위험.

---

## 2. 메커닉 분류 (Skill Atom 적용 — Daniel Cook)

각 ECHORIS 메커닉을 *Skill Atom* (Cause-Verb-Effect-Reward 4단) 으로 분해. GDC_GMTK §Cook 원칙 직접 적용.

### 2.1. ECHORIS Skill Atom 표

| 메커닉 | Cause(원인) | Verb(수단) | Effect(효과) | Reward(보상) |
|:--|:--|:--|:--|:--|
| **Item World 진입** | 모루 위에 검을 놓음 | 검 단면이 *열림* | 카메라가 단면으로 진입 | 새 공간 — 다른 art direction |
| **Memory Shard 회상** | Forgotten 단편 격파 | 단편 흡수 (자동) | 도감 entry 자동 갱신 | Recalled 단편을 슬롯에 장착 가능 |
| **5색 기질 상성** | 색이 *눈에 띄게* 다른 적 등장 | 검의 기질색과 비교 | hit damage 가 *크거나 작음* | *왜* 큰지 다음 등장으로 학습 |
| **Stat / Ability Gate** | 게이트 *시각적 차단* | 검 / 능력 시도 | 통과 / 거절 | 거절 시 *다른 길* 시야에 들어옴 |
| **fluid Geo 상호작용** | 컨테이너 + fluid 같은 화면 | 컨테이너 던짐 | 컨테이너 효과가 fluid에 적용 | 새 환경 변화 — 시각으로 명시 |
| **다중 결말 누적** | (대부분 *보이지 않음*) | 행동 누적 | 마지막에 결말 분기 | 결말 시점에 *누적치 visualization* |

**시금석:** Cause / Verb / Effect / Reward 4단이 *동일 화면 안에서* 발생하면 강한 atom. 분리되면 약한 atom — 텍스트 보강 필요.

### 2.2. atom 강도 평가

| 메커닉 | atom 강도 | 텍스트 보강 필요 |
|:--|:--|:--|
| Item World 진입 | 약함 (Effect 가 *공간 전환*이라 즉시 인지) | Rustborn 1줄 (진입 직후) |
| Memory Shard 회상 | 약함 (Reward 가 *슬롯에 들어가는 시각화*면 충분) | 0줄 (도감 자동 갱신만) |
| 5색 기질 상성 | 강함 (Reward 가 *damage 숫자* 가시화면 충분) | 0줄 (Witness/Tunic 모델) |
| Stat / Ability Gate | 강함 | 0줄 |
| fluid Geo 상호작용 | 약함 (Reward 가 *환경 변화*면 충분, 그러나 첫 노출 시 직관 어려움) | Rustborn 1줄 (첫 노출 한정) |
| 다중 결말 누적 | 매우 약함 (Reward 가 *결말 시점*에만) | 결말 시점 *누적치 visualization* — 게임 도중에는 일절 노출 안 함 |

**다중 결말 누적**의 약함은 *의도된 약함*. 게임 도중 노출하면 *행동 선택의 계산화* 가 발생 → 한정흥 정서 (DEC-042) 와 충돌. *결말 시점에만* 누적치 가시화.

---

## 3. ECHORIS 6대 작업 원칙 (방법론 backbone)

§1.1 의 7가지 합치된 결론을 ECHORIS 적용 6대 원칙으로 압축. **모든 onboarding 설계는 본 원칙을 시금석으로 한다.**

### 원칙 1. 행동이 먼저, 정당화는 직후

> *Rustborn 의 모든 발화는 플레이어 행동 직전 예고가 아니라 직후 정당화다.* (Wolpaw delta 원칙)

**금지:** "이 검을 모루 위에 놓으면 들어갈 수 있을 거야"
**허용:** (플레이어가 검을 모루 위에 놓고 진입 후) "You held me before. You don't remember."

### 원칙 2. 첫 시도는 안전, 두 번째부터 위험

> *모든 신규 메커닉의 첫 노출은 사망 위험·자원 소모 없는 환경에서.*

**적용:** 첫 Item World 진입 = 적 0~1마리 / Memory Shard 회상 첫 격파 = 보스 아님 / 5색 기질 첫 노출 = 일반 적

### 원칙 3. 텍스트 예산 = 행동 직후 1-2줄

> *플레이어 행동 직후 1.0~2.5초 내에 Rustborn 1-2줄. 그 이상은 신호 과잉.*

**근거:** Half-Life 2 GMTK *Invisible Tutorial* §line 7-22, Dead Space 정전 시퀀스 (신호 과잉 반례).
**예산표** (§5 상세):

| 시점 | Rustborn 단어 누적 상한 |
|:--|:--|
| 0-5분 | 30 단어 |
| 5-15분 | 60 단어 (누적) |
| 15-30분 | 100 단어 (누적) |
| 30-60분 | 180 단어 (누적) |

### 원칙 4. 반복 노출로 자발 발화

> *플레이어가 메커닉을 *말로 설명하지 않은 채* 행위로 보여주게 한다.* (scaffolded retrieval)

**적용:** Memory Shard 첫 격파 (회상 자동) → 두 번째 격파 (회상 + 슬롯 장착 UI 자동 띄움) → 세 번째 (UI 없이 슬롯 장착 가능). 세 번째에 *플레이어가 직접 슬롯에 끼우는* 행위 = 학습 완료 신호.

### 원칙 5. 친숙 UI 의미 재할당 > 완전 novel UI

> *익숙한 UI 패턴을 새 의미로 *재해석* 하는 것이 *완전 새로운 UI* 보다 강하다.*

**근거:** Undertale SAVE 메뉴의 *canon화*, Inscryption Act 1 카드의 *생명 거래 의미 재할당*, Disco Elysium 스킬의 *NPC화*.
**적용:** ECHORIS 인벤토리 = *Memory Shard 도감 + Rustborn 외화 기억* 의미 재할당. 별도 도감 UI 신설 *대신* 인벤토리 슬롯 자체에 도감 entry 통합.

### 원칙 6. 메커닉 도입 직전 메커닉 부재를 느끼게 함

> *메커닉을 가르치기 전에 *그 메커닉이 없으면 곤란한 상황*을 짧게 노출.* (긴장 사전 설치)

**적용:** Item World 진입 전 *Erda 가 검을 들고 있어도 막다른 길*을 보임 → 모루에 다가가면 *처음으로 열림*. 이 순간 *"검에 답이 있다"* 가 직관됨.

---

## 4. ECHORIS Item World 첫 30분 — 비트 by 비트 spec

본 §4 는 `Design_ItemWorld_Onboarding_SwordEgo.md` (DES-IW-ONB-01, Proposal) 의 *상위 방법론 정합 비트 spec*. 그 문서가 *대사 / 캐릭터 spec*, 본 §4 가 *timing / spatial / camera spec*.

### 4.1. 0-5분: 침묵의 진입 (한의 자리)

| 비트 | 행동 | 환경 | Rustborn | 누적 단어 |
|:--|:--|:--|:--|:--|
| 0:00 | Erda 가 *깨어 있는 상태로* 화면 페이드 인 | 현문명층(하층) cool gray + 약한 청록 | 침묵 | 0 |
| 0:30 | 좌우 이동 → 첫 적 (약함) 시야 | 적 단일, 검 *발 옆에 박혀 있음* | 침묵 | 0 |
| 1:00 | Erda 가 검을 *주워야 진행 가능* | 검을 줍는 순간 — 검에서 작은 빛 1프레임 | 침묵 | 0 |
| 1:30 | 첫 적 격파 | 단조 anvil tone 의 1/4 강도 SFX | 침묵 | 0 |
| 2:00 | 첫 막다른 길 — 시각적으로 *닫혀 있음* | 닫힌 길의 다른 편에 *희미한 빛* | "You held me before." | 4 |
| 3:00 | Erda 가 *모루*에 다가감 (모루는 별도 룸) | 모루 펄스 (#ffa41b 키컬러) | "You don't remember." | 8 |
| 3:30 | 모루 위에 검을 놓을 수 있다는 시각적 affordance | 검↔모루 톤 일치 (본/세피아 + 단조 불꽃 잔재) | 침묵 | 8 |
| 4:30 | 플레이어 입력으로 검을 모루 위에 놓음 | 검 단면이 *열림* — 카메라가 단면으로 진입 | 침묵 | 8 |

**원칙 적용:** 원칙 6 (메커닉 부재 사전 설치 — 막다른 길), 원칙 1 (행동 후 정당화 — 모루 진입 직전 "You held me before"), 원칙 3 (텍스트 예산 8단어 / 30단어 상한).

### 4.2. 5-15분: 첫 다이브 (한이 형태로 만남)

| 비트 | 행동 | 환경 | Rustborn | 누적 단어 |
|:--|:--|:--|:--|:--|
| 5:00 | 진입 완료 — 단면 질감이 *지층 벽 텍스처로 연속* | 빌더층 색 톤 (회청 + 주황 spot) | "I remember this place." | 12 |
| 5:30 | 첫 룸 — 적 0마리 (안전, 원칙 2) | 첫 Forgotten Memory Shard 시각화 (반투명 형상) | 침묵 | 12 |
| 6:00 | 두 번째 룸 — Forgotten Shard 1마리 (전투 약함) | Shard 색 = 검의 기질색과 *시각 대비* | 침묵 | 12 |
| 7:00 | 첫 격파 — Shard 가 검 안으로 흡수 (시각화) | 화면 중앙 *monospaced text*: "MEMORY RECALLED" (Solo Leveling System UI 모델) | 침묵 | 12 |
| 7:30 | 도감 entry 자동 갱신 (UI 1초 띄움 후 자동 닫힘) | 인벤토리에 새 슬롯 *반짝임* | 침묵 | 12 |
| 9:00 | 두 번째 룸 진행 — 다음 Forgotten Shard 격파 | 같은 패턴 반복 (원칙 4 — 반복 노출) | 침묵 | 12 |
| 10:00 | 세 번째 격파 후 *플레이어가 직접 인벤토리 열어야 진행* | 막힌 길 (스탯 게이트) — Shard 장착 시 통과 가능 | "Put it where it belongs." | 17 |
| 12:00 | 플레이어가 슬롯에 Shard 장착 → 스탯 변화 → 통과 | 통과한 길 너머 더 큰 룸 | 침묵 | 17 |
| 14:30 | 첫 지층 보스 시야 (전투 아직 아님) | 보스 룸 입구 텔레그래핑 (#ffa41b 펄스 강) | "It was you, last time." | 23 |

**원칙 적용:** 원칙 2 (첫 격파 안전), 원칙 4 (3회 반복 후 자발 발화), 원칙 5 (인벤토리 = 도감 통합 UI), 원칙 3 (15분에 23단어, 60단어 상한 내).

### 4.3. 15-25분: 첫 보스 (정의 첫 응시)

| 비트 | 행동 | 환경 | Rustborn | 누적 단어 |
|:--|:--|:--|:--|:--|
| 15:00 | 첫 보스전 시작 | BGM 진양조 → 자진모리 가속 | 침묵 | 23 |
| 17:00 | 보스 패턴 첫 노출 | 보스의 첫 hit 가 Erda 에게 닿음 (체력 일부) | 침묵 | 23 |
| 19:00 | 보스 격파 직전 | 보스의 마지막 hit 패턴 telegraph | 침묵 | 23 |
| 20:00 | 보스 격파 — 카메라 2.5초 정지 컷 (K-Cinema 처방) | BGM 가속 휘모리 → 정적 | 침묵 | 23 |
| 22:30 | 보스 영혼 단편 (핵심 기억 / Core Memory) 흡수 | 화면 중앙 *monospaced + 청록→주황 컬러 드롭* | "She remembers you now." | 28 |
| 24:00 | 정체성 슬롯 첫 활성화 — 핵심 기억 장착 가능 | UI 슬롯 진동 + 펄스 | 침묵 | 28 |
| 25:00 | 월드 귀환 (페이드) — Erda 가 모루 위에 검을 들고 서 있음 | 첫 다이브 완료. 현문명층 색조가 *약간 따뜻해짐* (1단계 색 보강) | "We were always going to meet." | 35 |

**원칙 적용:** 원칙 1 (격파 후 정당화 — 보스 격파 직후 회상), 원칙 6 (정체성 슬롯 첫 활성화 = *그것이 없으면 곤란*하던 상태 해결), 원칙 3 (25분에 35단어, 100단어 상한 내).

### 4.4. 25-30분: 정착 (자발 발화)

| 비트 | 행동 | 환경 | Rustborn | 누적 단어 |
|:--|:--|:--|:--|:--|
| 26:00 | Erda 가 *세이브 포인트 NPC* 첫 만남 | NPC 고정 자리. Erda 를 *알아보는* 표정 1프레임 | 침묵 | 35 |
| 27:00 | NPC 가 *무언가를 건넴* (의례) — 작은 빛 1프레임 | 인벤토리에 새 자원 1개 추가 | 침묵 | 35 |
| 28:00 | 플레이어 자율 행동 시간 — 다음 길 / 두 번째 다이브 선택 가능 | 새 길 시야에 들어옴 (원칙 6 — 다음 학습 사전 설치) | 침묵 | 35 |
| 30:00 | 첫 30분 완료 | — | 침묵 | 35 |

**원칙 적용:** 원칙 4 (자발 발화 — 플레이어가 *직접 선택*), 원칙 6 (다음 길 시야 = 다음 학습 사전 설치).

**총 단어 누적: 35 단어 / 100 단어 상한 65% 소비** — 다음 30분(30-60분) 에 180 단어 상한까지 145 단어 여유.

---

## 5. 텍스트 예산표 (Rustborn 한정)

§3 원칙 3 의 단어 예산을 세부 분해. *Erda 는 전 구간 0 단어* — 본 표는 Rustborn 한정.

### 5.1. 단어 예산표

| 시점 | Rustborn 누적 상한 | 단어/분 평균 | 발화 횟수 상한 | 발화당 평균 |
|:--|:--|:--|:--|:--|
| 0-5분 | 30 | 6 | 3 | 10 단어 |
| 5-15분 | 60 (누적) | 3 | 6 (누적) | 5 단어 |
| 15-30분 | 100 (누적) | 2.7 | 12 (누적) | 3.3 단어 |
| 30-60분 | 180 (누적) | 2.7 | 24 (누적) | 3.3 단어 |
| 60-120분 | 320 (누적) | 2.3 | 48 (누적) | 2.6 단어 |
| 120분+ | 무제한 (단 한 발화 당 3줄 ≤ 50 단어 절대 상한) | — | — | — |

**경향:** *시간이 지날수록* 발화당 단어 수가 *감소* → 단순한 한 줄이 더 무거워짐. K-Lit §Rustborn voice model (한강 *We Do Not Part* 호흡 + 김영하 압축) 정합.

### 5.2. 발화 톤 5조 진행 (한정흥 spec §3.4 정합)

| 구간 | 판소리 5조 | Rustborn 톤 |
|:--|:--|:--|
| 0-5분 (계면조) | 슬픔의 절제 | "You held me before." |
| 5-30분 (평조) | 평정 | "I remember this place." |
| 30-90분 (진양조) | 천천한 통과 | "She walked past, three doors back. You didn't turn." |
| 90-150분 (자진모리) | 가속 | "Hold." / "Now." / "Strike." |
| 150분+ (휘모리) | 최고조 | (보스전 한정) "Together. — Now." |

### 5.3. 톤 금지 사항

- Stanley Parable 식 비꼼 (한정흥 정서 충돌)
- Fi (Skyward Sword) 식 과잉 알림 ("80% chance of...")
- 판타지 어휘 (왕국/기사/용병/갑옷 — DEC-041)
- Erda 의 의지 *대신* 발화 ("We must go!")
- 메커닉 설명 ("This is the Item World")
- 한·정·흥 직접 호명 (영어권 fetishization 위험 — DEC-042)

---

## 6. UI 변신 한정안 (§1.3 채택 약화안)

Meta-UI 의 *UI 변신* 권고 중 ECHORIS 가 *채택*하는 범위와 *거절*하는 범위 명문화.

### 6.1. 채택 (Must)

| UI 변신 | 적용 시점 | 강도 |
|:--|:--|:--|
| 인벤토리 슬롯에 *Memory Shard 도감* 통합 | 첫 다이브 직후 | 슬롯에 entry 추가 (별도 도감 UI 없음) |
| 인벤토리 슬롯 *결 시각화* — 5색 기질별 테두리 | 첫 슬롯 활성화 | 색 + 1프레임 펄스 |
| 모루 옆 forge 불꽃 → 진입 직후 환경 ember particle *연속* | 첫 다이브 진입 | 단조 불꽃 잔재 + Heartbeat 1.2s loop 연속 (Cinema §Heartbeat 권장) |
| *MEMORY RECALLED* 화면 중앙 monospaced text | 매 Memory Shard 격파 | DM Mono / 청록→주황 컬러 드롭 / 0.4s 정지 (Webtoon §Solo Leveling System UI 모델) |

### 6.2. 거절 (Must Not)

| UI 변신 | 거절 이유 |
|:--|:--|
| Inscryption Act 전환식 *전체 UI 메타모포시스* | 한정흥 정서 (DEC-042) 와 충돌 — gimmick 위험 |
| Pony Island 식 *UI 손상/glitch* | 절제된 톤 위반 |
| Stanley Parable 식 *내레이션 vs UI* 메타 | Rustborn 톤 (계면조→휘모리) 충돌 |
| DDLC 식 *파일 시스템 조작* | 영어권 1차 niche (BLAME!/Made in Abyss) 신호 약화 |
| Hypnospace Outlaw 식 *전체 OS 시뮬레이션* | 게임 첫 30분 핵심 verb 학습 방해 |

---

## 7. 실패 패턴 (Anti-Pattern) 명시

5개 도메인 모두 일치하여 *경고*한 안티패턴. ECHORIS 가 *반드시* 회피.

### 7.1. YIIK gimmick 패턴 (Meta-UI / GenreSpecific / GDC_GMTK)

**증상:** 메커닉이 *narrative 와 분리되어* 시연만 됨. 플레이어가 *그래서 뭐가 다른가* 라고 묻게 됨.
**ECHORIS 회피책:** 모든 Item World 진입에서 Rustborn 의 *다른 발화 + 다른 색결* 필요. 진입이 *같은 의례의 반복*이지 *같은 cutscene 의 반복*이 아니어야 함.
**비용 부담:** 300 무기 × 5 기질 = 1,500 진입 분기. 이 부담은 §8.2 에서 분리 처리.

### 7.2. Fi 발화 과잉 패턴 (모든 도메인)

**증상:** 도구 NPC 가 *매 상황마다* 발화. 플레이어가 *대화창 닫기*를 학습하게 됨.
**ECHORIS 회피책:** §5 단어 예산. 발화 *trigger 조건*은 §8.3 별표 spec.

### 7.3. Dead Space 정전 신호 과잉 패턴 (Environmental / GDC_GMTK)

**증상:** 위험·중요 신호를 *동시에 3-4개* 노출하면 플레이어가 모두 무시. 단일 신호의 *강도*가 줄어듦.
**ECHORIS 회피책:** 첫 30분 동안 *한 화면에 단일 신호*. UI 펄스·SFX·색 키컬러 중 *하나*만 활성. 추가 신호 필요 시 *시간차*로 분리.

### 7.4. 메뉴 텍스트 룰 누적 (Documentation / GDC_GMTK)

**증상:** 도감/매뉴얼이 *길어질수록* 플레이어가 *읽지 않음*. 첫 페이지 무시 → 전체 무시.
**ECHORIS 회피책:** Memory Shard 도감 entry 1개당 *최대 2줄 / 40 단어*. 단어 수 초과 시 *원천 절단* 시 자동 알림.

### 7.5. 매뉴얼 = 스포일러 위험 (Documentation)

**증상:** Tunic 매뉴얼의 *최종 보스 페이지*가 첫 30분에 발견되면 *기대 무너짐*.
**ECHORIS 회피책:** 매뉴얼 페이지 30분 한정 노출. 30분 이후 *기존 페이지 자동 도감으로 흡수*, 신규 매뉴얼 페이지 *없음*. 매뉴얼 내용은 *Item World 의 작동 원리 한정*. 특정 보스/엔딩/Ancient 정보 *0건*.

---

## 8. 후속 검증·콘텐츠 양산

### 8.1. 플레이테스트 검증 항목 (Phase 2)

본 §4 비트 spec 의 플레이테스트 검증 우선순위:

| # | 검증 항목 | 측정 방법 | 합격 기준 |
|:--|:--|:--|:--|
| 1 | 첫 Item World 진입 timing (15-25분) | 진입 시점 telemetry (TEL-22 신규) | 80% 플레이어가 15-25분 구간 |
| 2 | "납치 피드백" 재발 0건 | 진입 직후 자유 응답 | "갑자기" / "왜 들어가는지" 0건 |
| 3 | 첫 30분 Rustborn 단어 누적 35 (±10) | telemetry | 80% 플레이어가 25-45 단어 노출 |
| 4 | 첫 보스 격파 후 정지 컷 입력 ignore 위반 0건 | 입력 lock 검증 | 입력 ignore 정확히 2.5초 |
| 5 | Memory Shard 첫 회상 후 자발 슬롯 장착 (UI 없이) | 행동 logging | 80% 플레이어가 *3번째 격파부터* 자발 장착 |

### 8.2. 콘텐츠 양산 부담 회피 (Backpack Hero paralysis 모델)

300 무기 × 5 기질 = 1,500 분기 콘텐츠 부담은 *해결 가능*:

- **300 무기 중 Ego 보유 5-15개만 고유 대사** (기존 SwordEgo §2.1 정합)
- **나머지 285개 무기는 *5색 기질별 generic 대사 5종 × 5 = 25 대사*만** 공유
- 첫 30분에는 *Ego 보유 핸드크래프트 무기*만 노출 → 1,500 분기 부담 *0*
- 285개 generic 무기는 Phase 3+ 야리코미 구간에 노출

### 8.3. Rustborn 발화 trigger spec (별표 작업)

§5 단어 예산 + §4 비트 spec 의 *trigger 조건*은 별도 작업 필요:

| Trigger | 위치 | 작업 단위 |
|:--|:--|:--|
| Player action trigger | `Rustborn.ts` (신규 클래스) | 별도 코드 작업 |
| Time-based trigger | 같은 클래스 | — |
| Story state trigger | `StoryState.ts` (신규) | — |
| Spatial trigger | LDtk Editor entity (RustbornSpeechTrigger) | LDtk 작업 |

본 spec 락 후 *gameplay-programmer + ue-blueprint 비교 결정* 으로 구현 위임.

---

## 9. 즉시 적용

본 spec 락 직후 다음 작업이 *준비됨*:

### 9.1. `Design_ItemWorld_Onboarding_SwordEgo.md` (DES-IW-ONB-01) Proposal → Established 승격

본 문서 §4 비트 spec 정합 검증 후 그 문서를 *Established (canon)* 으로 락 가능. narrative-director 검수 트리거.

### 9.2. Rustborn 첫 30분 35 단어 대사 영어 brief

§4 + §5 토대로 Rustborn voice brief 작성 가능. (한정흥 spec §3.1.2 정합)

### 9.3. Environmental §10.1 *검 단면 → 지층 벽 질감 연속 전환* 자산 spec

art-director 에게 직접 전달 가능. 본/세피아 톤 + 단조 불꽃 잔재 particle 연속 + Heartbeat 1.2s loop 음향 anchor 3중 연속 transition.

### 9.4. *MEMORY RECALLED* UI 컴포넌트 spec

`game/docs/ui-components.html` 신규 컴포넌트 섹션 추가 → UI 작성 규칙 (CLAUDE.md) 정합.

### 9.5. TEL-22 telemetry (첫 Item World 진입 timing)

Analytics.ts 신규 이벤트. Phase 2 검증용.

---

## 10. 결정 락

본 문서로 다음 사항 *Established (canon)* 락:

1. **5개 도메인 합치된 결론 12가지** — §1
2. **ECHORIS Skill Atom 표 + 강도 평가** — §2
3. **6대 작업 원칙** — §3
4. **첫 30분 비트 spec** (timing / spatial / camera / Rustborn) — §4
5. **Rustborn 단어 예산표** — §5
6. **UI 변신 채택/거절 범위** — §6
7. **Anti-pattern 5종 명시** — §7
8. **콘텐츠 양산 부담 회피 방식** — §8.2

---

**Cross-references:**
- `Documents/Design/Design_ItemWorld_Onboarding_SwordEgo.md` (DES-IW-ONB-01) — 하위 적용 안 (Proposal)
- `Documents/Design/Design_Narrative_HanJeongHeung_Archetype.md` (DSN-NRT-HJH-001) — §3.1.2 Rustborn voice model 정합
- `Documents/Design/Design_Tutorial_EnvironmentalTeaching.md` — 기존 tutorial 원칙
- `Documents/Content/Content_First30Min_ExperienceFlow.md` (CNT-EXP-001) — 기존 30분 흐름 정합 필요
- `memory/project_design_decisions.md` DEC-033/041/042/043
- `memory/feedback_priority_terminology.md` — Must / Nice-to-have / Must Not
- `memory/project_brand_typography.md` — DM Mono 정합
- `memory/project_key_color_brand.md` — #ffa41b 정합

**원천 리서치 (`Reference/UnfamiliarMechanic_Teaching_Research_*.md`):**
- `_MetaUI.md` — Undertale/Inscryption/OneShot 7편 + UI 의미 재할당
- `_Documentation.md` — Tunic/Outer Wilds/Obra Dinn 6편 + Memory Shard 매뉴얼 격상 권고
- `_Environmental.md` — Cocoon/Portal/HL2/Mario 1-1 12편 + 2D 질감 연속성 대안
- `_GDC_GMTK.md` — Mark Brown 4-step + Daniel Cook skill atoms + Raph Koster 6대 원칙
- `_GenreSpecific.md` — HK/Hades/Balatro/Backpack Hero 28편 + 첫 진입 timing 15-20분

---

**문서 일관성 점검 (CLAUDE.md 정합):**
- [x] 마크다운 링크 뒤 공백
- [x] `~` 미사용
- [x] 이모지 0건
- [x] 한국어 존댓말 / 일본어 0건
- [x] DEC-033/041/042/043 정합
- [x] Must / Nice-to-have / Must Not 우선순위 용어
- [x] 5개 raw 리서치 [확인함]/[추측임]/[근거 없음] 태그는 원천 문서에서 검증
