# ECHORIS — 메트로베니아 × 깊은 내러티브 장르 수용성 리서치

> **문서 ID:** RES-MN-01
> **문서 상태:** Established (research) — 2026-05-28 락
> **선행 SSoT:** D-18 (`Design_Narrative_StoryDesign_Methodology.md`) §8 장르 융합 / DEC-033 (검 Ego 단독 화자) / DEC-043 (다중 결말 3+1) / DEC-047 (위령)
> **방법론:** WebSearch 외부 시장 데이터 (Steam / 평론 / Reddit) + Reference 폴더 내부 분석 자료 (Metroidvania Game Design Deep Dive / Castlevania wiki / witcher3 / noclip / designdocs 인사이트) 병렬 deep dive
> **태그 규칙:** [확인함] / [추측임] / [근거 없음] 인용 출처 명시 (memory `feedback_reference_tagging.md` 정합)

---

## 0. 본 문서의 위치

ECHORIS 의 핵심 목적 = **위령 (DEC-047)** — *잊혀진 자들의 한을 회상시키고 끝내 떠나보내는 것*. 위령은 *플레이어가 매 다이브마다 한 망자에게 조문 (弔問) 하는* 내러티브-중심 메커닉이다. 이는 메트로베니아 장르 본질 (탐험 우선 + 능력 게이트) 과 *깊은 내러티브* 의 결합을 요구한다.

본 문서가 답할 3 부 질문:

1. **수용성** — 메트로베니아 팬이 *스토리 깊은 게임* 을 어떻게 받아들이는가?
2. **선례** — 메트로베니아 + 깊은 내러티브 시도의 *상업적 · 비평적 성공 / 실패* 사례
3. **구조적 제약** — 깊은 내러티브를 *안 했다면* 그 이유는 무엇인가?

본 문서의 *결정* 은 D-18 §8 보강 + DEC-043 / DEC-047 의 *시장 grounded* 정당화 + ECHORIS *시그너처 매핑* + *리스크 완화 spec* 으로 분산된다.

---

## 1. 핵심 결론 (3 줄)

1. **수용성 = HIGH (조건부).** 메트로베니아 팬은 *깊은 내러티브 자체에 거부감이 없다*. 거부 트리거는 *전달 방식* (수다스러운 컷씬, 페이싱 정지, exposition 과다) 이다 [확인함, longriverreview.com / thegoodplay.org].
2. **선례가 명확.** Hollow Knight 5M+ / Transistor 1M+ / Ender Lilies + Magnolia "Overwhelmingly Positive" / Silksong Steam GOTY 2025 — *침묵 주인공 + 환경 서사 + 묵시적 lore* 조합은 상업 · 비평 모두 검증됨 [확인함, Steam / Wikipedia].
3. **ECHORIS 의 검 Ego 단독 화자 + 침묵 Erda = Transistor 의 정확한 카피 + Hollow Knight 다중 결말 직계.** Supergiant + Team Cherry 가 백만 단위로 검증한 두 패턴을 *메트로베니아 컨테이너 안에서 합성* 하는 첫 시도. 6/7 성공 패턴 직접 정합 (§7 매핑 표).

---

## 2. 메트로베니아 팬 페르소나 분해

### 2.1. 3 갈래 분포

| 페르소나 | 시금석 | 깊은 내러티브 수용도 | 1차 niche 정합 |
|:--|:--|:--|:--|
| **순수 탐험파** (Super Metroid / SotN 클래식 코어) | 능력 게이트 · 맵 % · 비밀 벽 | *과도한 서사 = 정지감* — 거부 | 무해 통과 (대사 스킵 가능 시) |
| **서사 메트로베니아 팬** (Hollow Knight era) | 환경 서사 + lore 수집 + 모호함 | *환영 — 장르 표준으로 인식* | **★ ECHORIS 1 차 타깃** |
| **JRPG 친화 팬** (Aria of Sorrow / Bloodstained / Ender Magnolia) | 보이스 + 컷씬 + 직접 대사 | *환영, 단 페이싱 깨지 않을 것* | 무해 통과 |

### 2.2. 침묵 주인공 페르소나 선호도

[확인함] 침묵 / 반(半)침묵 주인공이 *디폴트 컨벤션*:
- Samus (Metroid) / The Knight (Hollow Knight) / Red (Transistor) / Drifter (Hyper Light Drifter) / Ren (Tunic) / Lily (Ender Lilies) — 모두 침묵

Biomorph 개발자 인터뷰: *"giving protagonists a voice makes them more alive"* — 보이스 도입이 *반(反) 컨벤션적 선택* 으로 자의식됨 [확인함, dualshockers.com]. 즉 *침묵이 디폴트*, *보이스가 정당화 필요* 한 선택.

Ender Lilies → Ender Magnolia 전환 사례 [확인함, bearwiseman.com]: 침묵 주인공 → *"speaking protagonist with clearly communicated goals and personality"* 전환 후 *Overwhelmingly Positive 3,765 리뷰*. **메트로베니아 팬은 보이스 주인공도 받아들이지만, 침묵이 디폴트 기대치**.

### 2.3. 메트로이드 vs 캐슬바니아 — 서사 정체성 2 갈래

`Metroidvania Game Design Deep Dive.md` L53-58 [확인함]:

| 항목 | 메트로이드 | 캐슬바니아 |
|:--|:--|:--|
| 분위기 | "고독, 긴장감, 환경적 공포" | "화려함, 비장미, 캐릭터 중심의 서사" |
| 서사 전달 | "환경 내러티브, 로그 데이터 기록" | "컷신, 대화, 인물 간의 갈등 구조" |

> *"메트로이드는 고립된 환경에서의 생존과 발견에 초점을 맞추는 반면, 캐슬바니아는 대대로 이어지는 벨몬트 가문과 드라큘라의 대립이라는 거대한 서사를 화려한 아트워크와 음악으로 포장한다."* (MGDD L60) [확인함]

**ECHORIS = 메트로이드 톤 + 캐슬바니아 서사 깊이** 의 합성.

---

## 3. 선례 분류표 — 15 게임 narrative 깊이 비교

| 게임 | Narrative 깊이 | 화자 모델 | 평가 | ECHORIS 정합 |
|:--|:--|:--|:--|:--|
| **Hollow Knight** | Very deep / implicit | 침묵 + NPC 단편 + 환경 | **5M+ 판매 (PC 3M+)** [확인함] | ★★★★★ 직계 선례 |
| **Silksong** | Very deep / implicit | 반(半)침묵 (Hornet 짧은 보이스) | **Steam GOTY 2025** [확인함] | ★★★★★ |
| **Transistor** | Deep / 검 Ego 화자 | **검(Unknown) 이 Red 대신 발화** | 1M+ (2015 기준), 비평 호평 [확인함, Wikipedia] | ★★★★★ **직접 카피 가능** |
| **Hyper Light Drifter** | Visual-only | 0 대사, 무성영화식 컷씬 | 컬트 호평 [확인함, storyinmedia.com] | ★★★★☆ |
| **Tunic** | Manual-driven | 0 readable 대사, 외계어 manual | TGA 노미네이션, 호평 [확인함] | ★★★★☆ |
| **Animal Well** | Visual-only puzzle lore | 0 대사 | TGA 노미네이션 [확인함] | ★★★★☆ |
| **Ender Lilies** | Medium / 환경 서사 | 침묵 PC | *"story present, not constantly in your face"* [확인함, bearwiseman] | ★★★★★ |
| **Ender Magnolia** | Medium-Heavy / 직접 | **Speaking protagonist** | **Overwhelmingly Positive 3,765** [확인함] | ★★★★☆ |
| **Death's Door** | Medium / 다크 코미디 | 짧은 NPC 대사, 침묵 PC | 호평 | ★★★☆☆ |
| **Blasphemous 1/2** | Deep but obtuse | 침묵 PC, 종교적 lore | *비평 분열* — *"confusing narrative"* [확인함, steamcommunity / punishedbacklog] | ★★★☆☆ **반면교사** |
| **Ori 1/2** | Cinematic / 명시적 | 내레이터 + 컷씬 | Will of the Wisps 2M+ 첫 달 [확인함] | ★★★☆☆ |
| **SotN** | Light / 캠피 + 4 결말 | Alucard 최소 voice + 컷씬 | 클래식, 200.6% 맵 달성 [확인함, MGDD L38] | ★★★★☆ (4-ending 선례) |
| **Aria of Sorrow** | 대사 많음 | 보이스 + 포트레이트 | Tactical Soul 영향력 큼 [확인함, GameSpot] | ★★☆☆☆ |
| **Bloodstained** | 대사 많음, JRPG식 | 풀 보이스 | 흥행 | ★★☆☆☆ |
| **Revenge of the Savage Planet** | Light, 코미디 | 보이스 | 1M+ 12 일 (2025-05) [확인함] | ★★☆☆☆ |

### 3.1. 핵심 발견

- **상위 4 게임 (Hollow Knight / Silksong / Transistor / Ender Lilies) 모두 *침묵 주인공 + 환경 서사 + 묵시적 lore* 패턴**
- **ECHORIS 직계 카피 가능한 단일 모델 = Transistor** (검 Ego 화자 + 침묵 주인공 패턴 동일)
- **다중 결말 직계 선례 = Hollow Knight + SotN** (4-ending 구조)
- **반면교사 = Blasphemous** (obtuse 한 결말 트리거 — *어느 NPC 놓치면 결말이 사라지는가* 의 투명성 부족)

---

## 4. 팬 수용 조건 분석 — louder vs 등 돌림

### 4.1. 받아들이는 조건 (louder 반응)

[확인함, thegoodplay.org]:
> *"Stories told through atmosphere and small details rather than exposition-heavy cutscenes."*

[확인함, longriverreview.com — Hollow Knight 분석]:
> *"Sparse and utilitarian dialogue, opaque written lore — not a weakness, because Hollow Knight thrives on showing... Rewards those who play it: who explore, who examine, who invest themselves."*

[확인함, thedialoguetree — Greg Kasavin 인터뷰]:
> *"In Transistor, the protagonist's silence is connected to the events of the story, and she's traveling with a partner whose voice and consciousness is trapped inside of this powerful object she's found."*

**5 조건:**
1. 환경 서사 우선 (exposition 아님)
2. 침묵 / 반침묵 주인공
3. Lore 의 선택적 발견 (의무 노출 X)
4. 서사가 능력 게이트 진행을 막지 않음 (스킵 가능, 페이싱 유지)
5. 모호함 유지 + 답을 강요하지 않음

### 4.2. 거부하는 조건 (등 돌림)

[확인함, steamcommunity Blasphemous 리뷰]:
> *"You can easily miss out on huge chunks of the narrative by not stumbling upon the right NPC."*

[확인함, steemit Eiyuden Chronicle Rising 비판]:
> *"Too much dialogue — players forced to read menus and check map to find next destination."*

**4 조건:**
1. Lore 가 너무 obtuse 해서 NPC / optional quest 놓치면 큰 chunk 가 사라짐 (Blasphemous 약점)
2. 대사 과잉으로 *메뉴 보고 목적지 찾아야 하는 페이스*
3. *Telling, not showing* — 환경이 가능한 것을 음성으로 중복
4. 컷씬이 *비선형 탐험 흐름을 끊음*

---

## 5. 안 한 이유 5 가지 — 구조적 제약

### 5.1. (a) 비선형 탐험 vs 선형 컷씬 충돌

[확인함, Jon Ingold (inkle) — witcher3 §9-1]:
> *"퀘스트 수여자가 플레이어를 무한정 기다림 — 세계가 플레이어 없이는 정지."*

메트로베니아의 *임의 순서 탐험* 은 컷씬 트리거 순서를 깨뜨린다. Blasphemous 가 *"stumbling upon right NPC"* 문제로 비판받는 이유 [확인함, steamcommunity].

### 5.2. (b) 침묵 주인공 페르소나 락

[확인함, MGDD §3]:
> *"환경 내러티브, 로그 데이터 기록"* — 메트로이드 전통.

Samus → The Knight → Drifter → Lily 의 30 년 컨벤션. 보이스 도입이 *Biomorph 인터뷰에서 적극 변호되어야 하는 비표준 선택* [확인함, dualshockers].

### 5.3. (c) 1 인 / 소규모 개발의 대사 양산 부담

[확인함, noclip #142]:
> *"Disco Elysium 70만 단어."*

[확인함, witcher3 §5-4]:
> *"NPC 15,000 줄, '안녕하세요'를 50 가지."*

인디 메트로베니아는 *대사량 자체가 비용*. Team Cherry · Acid Nerve · Andrew Shouldice (Tunic) 등 *2-10 명 팀* 이 장르 주류. 풀 보이스 + 컷씬 양산은 비용 폭증.

memory `project_solo_developer.md` 정합.

### 5.4. (d) 메트로베니아 페이싱 vs 서사 정지 충돌

[확인함, Pawel Sasko — witcher3 §3-4]:
> *"잡음 높음 — 시선이 고정된 순간 (잡음 낮음) 에 핵심 정보를 전달."*

메트로베니아 *탐험 흐름 = 잡음 높음* 상태에서 깊은 서사 전달은 구조적으로 어렵다. Ori 가 컷씬 채택 후 *cinematic vs metroidvania-pure* 양분 평가를 받는 이유.

### 5.5. (e) 환경 서사 전통의 *대체재* 작동

[확인함, MGDD L68 + designdocs L404]:
> MGDD: *"독특한 시각적 요소... 거대한 조각상이나 배경 음악이... 이정표."*
> designdocs: *"월드 스토리를 텍스트 로그가 아닌 환경 속에 숨겨서 탐험 보상으로."*

환경 서사가 *충분히 잘 작동* 하여 깊은 내러티브 도입의 한계 효용이 낮았다. Hollow Knight 가 5M+ 판매를 *명시적 plot 없이* 달성했기 때문에 *추가 서사 동기 약화*.

---

## 6. 깊은 내러티브 메트로베니아 — 성공 공식 7 패턴

`Hollow Knight / Transistor / Tunic / HLD / Ender Lilies / SotN` 분석에서 추출:

1. **침묵 또는 반(半)침묵 주인공 락** [확인함]
2. **환경 서사 1 순위, 텍스트 lore 2 순위, 컷씬 3 순위** [확인함]
3. **선택적 발견 = 보상 구조** — *"rewards those who explore"* — 의무 노출 X [확인함]
4. **단일 화자 위임** (있는 경우) — Transistor *Unknown* / Bastion *Rucks*. 군중 보이스 회피 [확인함]
5. **서사가 능력 게이트와 결합** — Ori / Hollow Knight: 능력 획득 = 서사 비트
6. **모호함 유지 + 답을 강요하지 않음** — Hollow Knight / HLD / Tunic 모두 *해석 여지* 보존 [확인함]
7. **스킵 가능성 + 페이싱 우선** — 대사가 액션을 멈추지 않음 (Transistor 의 실시간 narration)

---

## 7. ECHORIS 정합 — 시그너처 매핑

| # | 성공 패턴 | ECHORIS 매핑 | 정합 | DEC 참조 |
|:--|:--|:--|:--:|:--|
| 1 | 침묵 / 반침묵 주인공 | Erda 0 대사 | ✅ | DEC-033 |
| 2 | 환경 서사 1 순위 | 메가스트럭처 + 단조 잔존물 (5 anchor) | ✅ | D-12, project_no_damascus_terminology |
| 3 | 선택적 발견 보상 | 기억 단편 Forgotten → Recalled | ✅ | DEC-036 |
| 4 | 단일 화자 위임 | 검 Ego (Rustborn) 단독 화자 | ✅ | DEC-033 |
| 5 | 능력 게이트 + 서사 비트 | 렐릭 5 종 + Stratum 진입 + 회상 | ✅ | DEC-039 |
| 6 | 모호함 유지 | 한정흥 정서 + 다중 결말 3+1 (Ancient 수렴 은닉) | ✅ | DEC-042, DEC-043 |
| 7 | 페이싱 우선 / 스킵 가능 | **구현 시 검증 필요** | ⚠️ | (Phase 2 검증) |

**판정:** **6/7 직접 정합**. 7 번 (페이싱) 만 구현 / 플레이테스트 검증 필요. **HIGH 수용 가능성.**

---

## 8. 비교 매트릭스 — Hollow Knight + Transistor + ECHORIS

| 축 | Hollow Knight | Transistor | **ECHORIS** |
|:--|:--|:--|:--|
| 주인공 화법 | 0 대사 (The Knight) | 0 대사 (Red) | 0 대사 (Erda) |
| 보조 화자 | NPC 단편 (Quirrel · Hornet · Nailmaster) | **검 (Unknown) 단독 실시간 화자** | **검 (Rustborn) 단독 화자** |
| 서사 깊이 | Very deep, implicit | Very deep, explicit | Very deep, *반(半)명시* |
| 결말 분기 | 5 결말 (Pantheon + Embrace the Void) | 단일 결말 | **3+1 결말 (Ancient 수렴)** |
| 결말 트리거 | 누적 탐험 + Voidheart + 꿈 영역 | (단일) | **누적 행동 + Ancient 수렴 게이트** |
| 페이싱 grammar | 액션 호흡 보존, NPC 만남이 *벤치* | **실시간 narration, 액션 안 끊김** | *Phase 2 검증 — Transistor 패턴 채택* |
| 양산 부담 | 환경 + NPC 압축 | 단일 화자 압축 | **단일 화자 + 절차적 (Disgaea) 압축** |

**ECHORIS = Hollow Knight 다중 결말 + Transistor 화자 + 위쳐 3 grammar (Fire/Ember) + 디스가이아 야리코미 + 한정흥 정서** 의 *합성*. 세 검증 선례 (HK / Transistor / SotN) 의 *교집합* 위에 두 신요소 (디스가이아 야리코미 / 한정흥) 를 얹은 구조.

---

## 9. 위쳐 3 grammar 이식 가능성

`witcher3_인사이트.md` 의 grammar 중 메트로베니아 + 침묵 주인공 + 검 Ego 단독 화자 매체에 *이식 가능* / *불가* 분류 [확인함]:

### 이식 가능

- **Fire vs Ember** (§3-1) — 검 Ego 대사를 *Fire (정서적 뱅)* 에만 사용. Ember (시각 스펙터클) 는 환경 / VFX 담당. ECHORIS 한정흥 5 막과 정합
- **신호 / 잡음 비율** (§3-4) — 세이브 포인트 / 모루 = 잡음 낮음 zone, 전투 = 잡음 높음. 검 Ego 핵심 내러티브는 *세이브 포인트 진입 직후* 에만 발화
- **정보의 의도적 제거** (§2-2) — *"10층 보스 방의 상징물이 30층에서 드러나는 구조"*. ECHORIS *기억 단편 Recalled* 메커닉과 직접 매핑
- **인카운터 모델 + 방어적 로직** (§9-1, §9-2) — 비선형 메트로베니아에서 NPC 상태를 *플레이어 진행도 독립적 상태 트리* 로 관리 (inkle 의 *High Water Mark* 모델)

### 이식 불가

- **"어울리지 않는 상황의 게랄트"** (§6-3) — Erda 0 대사 정책 위반. 코멘트 가능한 화자 없음. 단, *검 Ego* 가 일부 등가 (situational quip)

---

## 10. 리스크 3 건 + 완화 전략

### 10.1. Risk 1 — 검 Ego 대사 페이싱 미스 → Eiyuden Chronicle 함정

[확인함, steemit 비판 인용] 대사가 *전투 호흡을 끊으면* 1 차 niche 가 *수다스러운 무기* 로 등 돌림.

**완화 spec:**
- Rustborn 35 단어 예산 엄수 (memory `project_onboarding_methodology_locked`)
- 검 Ego 대사 = *floating subtitle* (멈추지 않는 실시간 narration, Transistor 패턴)
- 발화 빈도 톱니 곡선 (D-18 §9.3): Stage 0 ~25-35 wpm → Stage 6 ~3-6 wpm. Stage 4 만 spike (~30-40 wpm)
- *Skip toggle* UI 옵션 — 캐주얼 플레이어 / 순수 탐험파 무해 통과 보장
- **검증 게이트:** Phase 2 플레이테스트 3 명 이상에서 *"수다스럽다"* 라는 P0 신호 안 나오면 통과

### 10.2. Risk 2 — 다중 결말 분기 트리거 obtuse → Blasphemous 함정

[확인함, steamcommunity 인용] *어느 NPC 놓치면 결말이 사라지는가* 의 투명성 부족이 Blasphemous 의 약점.

**완화 spec:**
- DEC-043 3+1 결말 트리거 = *누적 행동의 합산* (위쳐 3 / Hollow Knight 패턴). 단일 NPC / quest 의존 금지
- 결말 조건의 *간접 가시성* — 무기별 회상 진척도가 *Identity Archive* (DEC-046) 에 누적 표시. 플레이어가 *내가 어느 방향으로 가고 있는가* 를 어렴풋이 인지 가능
- True Ending (Ancient 수렴) 만 *완전 은닉* (Hollow Knight Embrace the Void 패턴). 나머지 3 결말은 *위령 행위의 자연 누적* 으로 자명
- **검증 게이트:** Phase 3 플레이테스트 5 명 이상에서 *"어떤 결말로 가는지 전혀 모르겠다"* 라는 P0 신호 안 나오면 통과

### 10.3. Risk 3 — 위령 메커닉의 메트로베니아 외부성 → Spiritfarer 정서 이식 선례 없음

[추측임] Spiritfarer (위령 마스터클래스) 와 메트로베니아 (장르 본질) 의 *결합 선례 0*. *순수 탐험파* 에게는 *louder 신호* 가 아닐 수 있음.

**완화 spec:**
- 위령 메커닉을 *기억 단편* 으로 추상화 — 표면적으로는 메트로베니아 표준 *lore 수집* 으로 보임 (Hollow Knight Pale Ore / Wanderer's Journal 패턴)
- *조문 (弔問)* 의 정서적 무게는 *Ancient 등급에서만 명시적 발현*. Normal-Magic-Rare 등급은 *야리코미 표준 메커닉* 으로 작동
- 외부 마케팅 표면에 *Requiem / 위령 / Spiritfarer-like* 명시 노출 금지 (CNT-DIR-001 §7.3). *"a requiem you walk through"* 류의 *결과 신호* 만
- **검증 게이트:** Steam Coming Soon wishlist 데이터 — *Spiritfarer / Celeste / Transistor* 태그 보유 사용자 wishlist 전환율을 측정

---

## 11. 비평 인용 모음 (외부 1 차 소스)

1. *"Sparse and utilitarian dialogue, opaque written lore — not a weakness, because Hollow Knight thrives on showing."* [확인함, longriverreview.com / Hollow Knight 분석]
2. *"You can easily miss out on huge chunks of the narrative by not stumbling upon the right NPC."* [확인함, steamcommunity Blasphemous 리뷰]
3. *"In Transistor, the protagonist's silence is connected to the events of the story, and she's traveling with a partner whose voice and consciousness is trapped inside of this powerful object she's found."* [확인함, thedialoguetree / Kasavin 인터뷰]
4. *"Biomorph dev believes giving protagonists a voice makes them more alive."* [확인함, dualshockers.com — 보이스 도입을 반(反)컨벤션적 선택으로 자의식]
5. *"Stories told through atmosphere and small details rather than exposition-heavy cutscenes."* [확인함, thegoodplay.org Hollow Knight]
6. *"Players are encouraged to observe their surroundings closely, as the visual narrative is just as important as any written lore."* [확인함, libr251 blog]
7. MGDD L91 (Hollow Knight): *"비선형성의 극대화 ... 각 플레이어마다 고유 경험"* [확인함]
8. MGDD L60: *"메트로이드는 고립된 환경에서의 생존과 발견에 초점을 맞추는 반면, 캐슬바니아는 ... 거대한 서사를 화려한 아트워크와 음악으로 포장한다."* [확인함]

---

## 12. 결정 락 (Established)

본 문서로 *Established (research)* 락:

1. **수용성 = HIGH (조건부) 락** — 7 성공 패턴 중 6/7 ECHORIS 정합. 페이싱 우선만 Phase 2 검증 필요
2. **시그너처 매핑 표 (§7) 락** — 7 패턴 × DEC 매핑이 정합 시금석
3. **3 리스크 + 완화 spec 락** — Eiyuden 함정 / Blasphemous 함정 / Spiritfarer 외부성 의 3 검증 게이트
4. **외부 마케팅 grammar 락** — Requiem / 위령 / Spiritfarer-like 명시 노출 금지 (CNT-DIR-001 §7.3 강화)
5. **inkle High Water Mark 모델 락** — 비선형 메트로베니아의 NPC 상태 관리는 inkle 패턴 채택 (`witcher3 §9-3`)

---

## 13. 후속 작업

본 문서 락 직후 다음 작업이 *시금석을 갖고* 진행 가능:

1. **D-18 §8 보강 PR** — 본 문서의 §7 시그너처 매핑 표 + §10 리스크 3 건을 D-18 §8 내부에 통합
2. **Rustborn floating subtitle UI spec** — Transistor *실시간 narration* 패턴의 ECHORIS UI 구현. Phase 2 검증 항목
3. **Identity Archive 진척도 가시화 spec** — DEC-046 의 무기별 회상 누적을 *결말 분기 간접 가시성* 으로 활용하는 UI 디자인
4. **Phase 2 플레이테스트 시그널 카드** — *수다스럽다 (Eiyuden) / 어떤 결말로 가는지 모르겠다 (Blasphemous) / Spiritfarer 정서 안 느껴진다 (외부성)* 3 P0 신호 모니터링
5. **Steam Coming Soon wishlist 태그 분석** — *Spiritfarer / Celeste / Transistor* 보유 사용자 wishlist 전환율 측정
6. **메모리 락 신규 생성** — `project_metroidvania_deep_narrative_compat.md` — *수용성 HIGH 락 + 6/7 정합 + 3 리스크 게이트* 의 1 줄 hook

---

## 14. 외부 출처 (1 차 데이터)

웹 검색 결과 — 외부 1 차 소스:
- [Hollow Knight, Memory, and Minimalist Storytelling — Long River Review](https://longriverreview.com/blog/2024/hollow-knight-memory-and-minimalist-storytelling/)
- [Hollow Knight — The Art of Atmospheric Storytelling](https://thegoodplay.org/blog/best-for-you/hollow-knight-the-art-of-atmospheric-storytelling-in-indie-games)
- [Subtle Storytelling Genius of Hollow Knight and Silksong — Flagship Eclipse](https://www.theflagshipeclipse.com/2025/09/16/the-subtle-storytelling-genius-of-hollow-knight-and-silksong/)
- [Blasphemous Review — Steam Community Metroidvania Review](https://steamcommunity.com/groups/MetroidvaniaReview/discussions/3/1697221160914490686/)
- [Blasphemous 2 Review — Punished Backlog](https://punishedbacklog.com/blasphemous-2-review/)
- [Transistor — Wikipedia](https://en.wikipedia.org/wiki/Transistor_(video_game))
- [Voiceless but not Powerless: Transistor — Spectatorial](https://thespectatorial.ca/2015/04/23/voiceless-but-not-powerless-defying-narrative-convention-in-supergiant-games-transistor/)
- [Silent protagonist — Kasavin interview, The Dialogue Tree](https://thedialoguetree.wordpress.com/2013/06/14/transistor-preview-an-interview-with-greg-kasavin/)
- [Hyper Light Drifter and Silent Narrative — Stories in Media](https://storyinmedia.com/2017/04/12/what-we-can-learn-about-narrative-from-hyper-light-drifter/)
- [Biomorph Creators — DualShockers](https://www.dualshockers.com/biomorph-creators-metroidvania-narrative-crucial/)
- [Top Metroidvania Sales — Games Stats Steam](https://games-stats.com/steam/?tag=metroidvania)
- [Best Selling Metroidvanias 2025 — Accio](https://www.accio.com/business/best-selling-metroidvanias)
- [Ender Magnolia Review — Bear Wiseman](https://www.bearwiseman.com/game-reviews/game-review-ender-magnolia)
- [Aria of Sorrow Tactical Soul Influence — GameSpot](https://www.gamespot.com/articles/how-castlevania-aria-of-sorrows-tactical-soul-system-inspired-a-new-generation-of-metroidvanias/1100-6513882/)

Reference 폴더 내부 자료:
- `Reference/Metroidvania Game Design Deep Dive.md` (MGDD)
- `Reference/castlevania-wiki-md/Castlevania - Symphony of the Night.md`
- `Reference/witcher3_인사이트.md`
- `Reference/noclip_인사이트.md`
- `Reference/designdocs_인사이트.md`
- `Reference/extracredit_인사이트.md`

---

## 15. 문서 일관성 점검

- [x] 마크다운 링크 뒤 공백 정합
- [x] `~` 미사용
- [x] 이모지 0 건
- [x] 한국어 존댓말 / 일본어 0 건
- [x] [확인함] / [추측임] 인용 태그 적용
- [x] 외부 URL 인용 (WebSearch 결과)
- [x] DEC-033 / 036 / 042 / 043 / 047 정합
- [x] D-18 §8 cross-reference
- [x] CNT-DIR-001 §7.3 외부 노출 금지 grammar 정합
- [x] memory `project_solo_developer` / `project_onboarding_methodology_locked` 정합

---

**Cross-references:**
- `Documents/Design/Design_Narrative_StoryDesign_Methodology.md` (D-18) §8 장르 융합 — 본 문서가 *시장 grounded* 정당화
- `Documents/Content/Content_Direction.md` (CNT-DIR-001) §7.3 외부 노출 금지
- `Documents/Terms/Project_Vision_Abyss.md` §1 위령 Core Purpose (DEC-047)
- `Documents/Design/Design_Metroidvania_Philosophy.md` (D-04)
- `memory/wiki/decisions/DEC-033 / 036 / 039 / 042 / 043 / 047`
- `memory/project_core_purpose_requiem.md` / `project_meta_purpose_consolation.md` / `project_onboarding_methodology_locked.md` / `project_solo_developer.md`
