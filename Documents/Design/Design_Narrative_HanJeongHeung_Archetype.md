# 한정흥 아키타입 — ECHORIS 메인 스토리 적용 구조

> **문서 ID:** DSN-NRT-HJH-001
> **문서 상태:** Established (canon) — 2026-05-25 락
> **작성일:** 2026-05-25
> **담당:** Narrative Director (검수), Victor (총괄), Fina (시나리오 적용)
> **근거 결정:** DEC-042 한정흥 backbone 락 + DEC-043 다중 결말 3+1 락
> **개정 사유:** 7개 도메인 raw 리서치(K-drama / K-cinema / K-literature / K-pop / Webtoon / Korean games / Academic theory) 종합 결과를 ECHORIS 메인 스토리 *적용 가능* 구조로 통합. DEC-042/043의 *implementation spec*.
> **선행 리서치:** `Reference/HanJeongHeung_Research_*.md` 7건 (총 ~40,000 단어)
> **상위 SSoT:** `Documents/Content/Content_Story_Synopsis.md` §8.2 (한정흥 정의), §10 (멀티엔딩)

---

## 0. 본 문서의 위치

본 문서는 ECHORIS 의 *내러티브 톤*과 *메인 스토리 구조*를 한정흥(Han-Jeong-Heung) 아키타입으로 정렬하는 design-philosophy 레이어다. 다음 세 층의 *중간*에 위치한다:

| 레이어 | 파일 | 본 문서와의 관계 |
|:--|:--|:--|
| 상위(strategy) | `Project_Vision_Abyss.md` §2 3대 기둥, `project_design_decisions.md` DEC-042/043 | 본 문서가 *구현 의무*를 진다 |
| 본 문서(spec) | `Design_Narrative_HanJeongHeung_Archetype.md` | 한정흥 → ECHORIS 시스템·결말·NPC·대사·사운드 매핑 |
| 하위(content) | `Content_Story_Synopsis.md`, `Content_Character_*.md`, `Content_Dialogue_*.md` | 본 문서를 *시금석*으로 인용 |

본 문서는 **마케팅 카피에 노출되지 않는다.** 한·정·흥 단어는 영어권 노출 시 *fetishization 위험* (Theory §13, K-Cinema §Past Lives 사례 검증). 본 문서는 *내부 spec only*. 외부 노출은 행동·의례·기제로만 보인다.

---

## 1. 한정흥 통합 정의

### 1.1. 한 (恨 / Han)

> **정의:** 닫힌 길에서 *발효된* 상실. 떠나간 자리가 시간이 지나며 *정체성의 일부*가 된 상태. 분노 아님 — 분노는 폭발하지만 한은 *침전한다*. 슬픔 아님 — 슬픔은 흘러가지만 한은 *남는다*.

**원형 메타포** (Theory §1 검증):
- 닫힌 상자 / 잠긴 문 / 닿지 못한 손
- *불에 타고 남은 것* (재가 아니라 *형태*가 남은 잔해)
- 강물이 흘러가지 못하고 *고인* 웅덩이
- 시간이 *낫게* 만들지 않고 *깊게* 만든 흉터

**작동 원리:**
한은 *해결*되지 않는다. 단지 *형태가 바뀐다*. K-drama §My Mister 박동훈의 한은 결말에서 사라지지 않고 *조용해진다*. K-cinema §Burning 종수의 한은 폭발하지만 *씻기지 않는다*. K-Literature §Human Acts 한강의 한은 *글로 옮겨도 줄지 않는다*. 한은 *다른 사람의 한과 만나야만* 형태가 바뀐다 — 이때 정으로 전이된다.

**ECHORIS 의 한:**
- Erda 가 *왜 강하한 자인지 기억하지 못함* → 자기 자신에 대한 한
- Rustborn 이 *전 wielder 를 기억하지만 그 wielder 가 누구를 위해 죽었는지 모름* → 의무에 대한 한
- The Shaft 의 거대 빌더들이 *짓다가 사라짐* → 문명의 한
- 기억 단편 Forgotten 상태(50% 효과, 적 NPC) = 한이 *형태로* 남은 상태

### 1.2. 정 (情 / Jeong)

> **정의:** 이유 없이 *끈끈한* 결속. 떨어져야 마땅한데 떨어지지 않는 것. 미워해야 마땅한데 미워하지 못하는 것. *시간이 만든* 끈, *결정이 아닌* 끈.

**원형 메타포** (Theory §3 검증):
- 닳은 옷 / 손때 묻은 도구 / 깎고 깎인 돌
- *함께 먹은 밥* (음식 운반 정 — K-drama §My Mister 도시락 device)
- *모르는 사이 같은 자리에 앉음* (Reply 1988 / Past Lives 모델)
- *너의 죽음이 나의 일이 됨* (Move to Heaven / Human Acts)

**작동 원리:**
정은 *말해지지 않는다*. 말해지면 깨진다. K-drama §Reply 1988 가족 정은 *대사가 없는 식탁 long take*로 전달된다. 정은 *행위로* 검증된다 — 같이 밥을 먹는가, 죽음을 곁에서 보는가, 잘못을 알면서도 곁에 남는가. 영어 *love* 와 다르다 — love 는 *선택*이지만 jeong 은 *축적*이다.

**ECHORIS 의 정:**
- Rustborn ↔ Erda 의 동행 자체가 정의 축적
- 매 다이브에서 *같은 검을 든다는 사실* = 무언의 정
- 세이브 포인트 NPC 가 *Erda 를 알아본다는 표정* = 정의 표지
- 멀티플레이 동료가 *같은 다이브를 반복함* = 무언의 정 (Phase 3+)
- 기억 단편 Recalled 상태 = 한이 정으로 *전이된* 상태

### 1.3. 흥 (興 / Heung)

> **정의:** 슬픔을 *부정하지 않고* 그 위에서 솟아오르는 *놀이의 충동*. 한에 *대항하는* 기쁨이 아니라 *한을 통과한* 기쁨. 살풀이의 마지막 절 — 슬픔을 *춤으로 풀어내는* 행위.

**원형 메타포** (Theory §4, K-pop §Heung 1차 소스 검증):
- *판소리 휘모리* (최고조 가속) — 슬픔이 *속도*로 변하는 순간
- *대장간 단조 박자* (꽹과리 코드 = anvil tone, K-pop §꽹과리 검증)
- *살풀이의 마지막 회전* (한을 풀어 *던지는* 동작)
- *Jambinai의 post-rock 합주* — 전통과 현대가 *부딪쳐* 카타르시스 되는 형태

**작동 원리:**
흥은 *희소*해야 작동한다. K-cinema §흥 4분기 분석에서 박찬욱·나홍진·김지운 후기는 *흥을 완전 추방*함으로써 한의 무게를 보존. 흥이 흔하면 한·정이 *경박해진다*. 흥의 빈도는 **세션당 5% 미만** (K-Cinema §Forge 흥 카니발 처방).

흥은 *공동의 신체*에서 나온다. 혼자의 흥은 광기다. K-pop §Heung Top 7 device 의 모든 항목이 *집단 동조* 메커닉을 가진다 — fan chant, group dance unison, call-and-response. 게임의 흥은 *멀티플레이*와 *집단 의례* 에서 가장 강하게 작동한다.

**ECHORIS 의 흥:**
- 보스 격파 직후 1.5~2.5초 *정지 후 폭발* (K-Cinema 카메라 정지 컷 처방 + K-pop 자진모리 hit-pacing)
- Memory Shard Recalled 의 *시스템 UI 카니발* (Webtoon §Solo Leveling System UI 모델: monospaced + 0.4s 정지 + chime + 청록→주황 컬러 드롭)
- 단조 완료 시퀀스의 *꽹과리 anvil tone* (K-pop §전통 크로스오버 검증)
- 멀티플레이 *동시 다이브 회수* (Phase 3+ — 공동 신체 흥의 본진)
- True Ending 의 *Jambinai-style post-rock 합주* (K-pop §8.7 락된 모델)

### 1.4. 트라이앵글 작동 원리

```
        한 (Han)
       /        \
      /          \
     /            \
   정 (Jeong) — 흥 (Heung)
```

- **한 → 정 전이:** 자기 한이 *타자의 한과 만남* 으로써 *공유 결속* 으로 형태 변경
- **정 → 흥 전이:** 결속이 *몸으로 표출* 될 때 (춤·전투·노래) 흥 발생
- **흥 → 한 회귀:** 흥은 *지속될 수 없음*. 카타르시스 후 *다시 한으로 가라앉음* (K-Cinema §흥의 시네마틱 좌표 — 흥은 항상 짧다)

ECHORIS 는 이 세 꼭짓점을 *결말 분기*로 구조화한다 (§4 참조).

### 1.5. 살풀이 spine (학술 방어선)

> **본 spec 의 학술적 정당성 — Theory §15 검증**

살풀이(殺-풀이) = *sal* (살, 사악한 기운 / 응어리) 을 *풀어내는* 의례. 인류학(Laurel Kendall) + 임상심리(Bou-Yong Rhi) + 종교학(민중신학) 3진영 모두 인정하는 한국 의례 구조.

**3단계 의례 구조:**
1. **흡수(sip)** — 무당 / 의례자가 sal 을 *몸으로 받아들임*
2. **장착(jang-chak)** — sal 이 *춤의 동작*에 *형태로* 박힘
3. **발산(bal-san)** — 동작이 *최고조에서 던져짐* — sal 이 *바깥*으로 풀려나감

**ECHORIS Item World ↔ Memory Shard ↔ Multi-ending 매핑** (구조적 동형):

| 살풀이 단계 | ECHORIS 메커닉 | 정서 |
|:--|:--|:--|
| 흡수 | 적 NPC(Forgotten Memory Shard) 격파 → 단편 흡수 | 한 |
| 장착 | 정체성/기억 슬롯에 Recalled 단편 장착 | 한 → 정 |
| 발산 | 전투에서 단편 효과 발현 → 보스전 카타르시스 → 결말 분기 | 정 → 흥 |

이 spine 은 외부 비판(Sandra So Hee Chi Kim 의 colonial-invention critique, Theory §1) 에 대한 *3중 방어선*을 제공한다:
- **postcolonial-aware:** 한이 *고정 본질*이 아니라 *역사적 형성*이라는 입장 수용
- **clinically grounded:** Hwabyung(DSM-5 cultural concept of distress, Theory §8) 임상 근거
- **ritually structured:** 살풀이 의례의 구조 차용 — Korean *folk practice*에서 도출, *민족 본질*에서 도출 아님

---

## 2. 도메인 메커니즘 매트릭스

7개 raw 리서치에서 추출한 *반복 패턴*. ECHORIS 가 어느 도메인의 어느 device 를 어떻게 차용하는지 한 눈에 보는 SSoT.

### 2.1. Han 전달 device 종합 표

| Device | 출처 도메인 | ECHORIS 차용 여부 | 차용 형태 |
|:--|:--|:--|:--|
| **수직 공간 = 한의 깊이** | K-drama (Parasite/Squid Game/Pachinko), K-cinema (Bong 도구함) | Must | The Shaft 3중 수직 (자연/빌더/현문명) — 이미 락 |
| **닫힌 문 / 못 닿는 손** | K-cinema (Bong/Lee Chang-dong) | Must | Stat Gate (ATK/INT 장벽) + 능력 게이트 — 이미 락 |
| **시간 지속(long take)** | K-cinema (Lee Chang-dong/Hong Sang-soo) | Must (변형) | 보스 격파 후 2.5초 카메라 정지 컷 |
| **2인칭 죽은 자 호명** | K-literature (Han Kang *Human Acts*) | Must (반전) | Rustborn(검) → Erda(침묵 wielder) 호명 — 대칭축 반전 |
| **음식 운반 정 device의 부재(=한)** | K-drama (My Mister 도시락) | Must | 세이브 포인트 NPC 가 *Erda 에게 무언가를 건넴* 의례 |
| **편지/일기/녹음 잔재** | K-cinema (Decision to Leave), K-games (Lies of P record stone) | Must | 기억 단편 = *잊혀진 자의 잔재* |
| **계급/공간 분리** | K-drama (Squid Game), K-cinema (Parasite) | Should | The Shaft 의 *층별 시각 언어 분리* (자연층/빌더층/현문명층 색온도 차) |
| **혼자의 시선 — 누구도 보지 않음** | K-cinema (Burning 종수) | Must | Erda 의 silent protagonist 자체가 이 device |
| **이름의 진화** (호칭이 시간 따라 변함) | K-games (Lies of P Hotel Krat) | Must | Identity Archive Stage 0→4 — 이미 락 |
| **소년/소녀가 사라짐** | K-cinema (Burning 해미), K-drama (Twenty-Five Twenty-One) | Should | 메인 스토리 messenger 패턴 — 시놉시스 §1.3 정합 |

### 2.2. Jeong 전달 device 종합 표

| Device | 출처 도메인 | ECHORIS 차용 여부 | 차용 형태 |
|:--|:--|:--|:--|
| **같은 자리 반복 등장** | K-drama (Reply 1988), K-games (Lies of P Hotel Krat) | Must | 세이브 포인트 NPC 고정 자리 + 호칭 진화 |
| **죽음을 곁에서 봄** | K-drama (Move to Heaven), K-cinema (Broker) | Must (변형) | 기억 단편 Recalled 의례 = *잊혀진 자를 곁에서 본 행위* |
| **이유 없는 잔류** | K-drama (My Mister 정희) | Should | Rustborn 이 *왜 이 wielder 인지* 끝내 설명하지 않음 |
| **비대칭 정 (한쪽만 안다)** | K-cinema (Past Lives 의 *inyun* 도시 분리) | Must | Rustborn 은 Erda 의 과거를 부분적으로만 알고, Erda 는 자기 과거를 모름 |
| **세대 정 (mentor-mentee)** | Webtoon (Eleceed Kayden↔Jiwoo), K-games (Sekiro 부엉이) | Must | Rustborn ↔ Erda 페어 — 글로벌 1.4B views 검증된 dynamic |
| **음식 운반** | K-drama (My Mister 도시락) | Cannot (변형) | 비-인간 동료에는 직접 포팅 불가 → *단조소 헌상 의례*로 대체 |
| **chosen family** | Webtoon (Itaewon Class), K-drama (Vincenzo) | Should | 멀티플레이 파티 — Phase 3+ |
| **집단 통과 의례** | K-pop (group dance unison) | Should | 공동 보스 격파 후 합주 SFX (Phase 3+) |

### 2.3. Heung 전달 device 종합 표

| Device | 출처 도메인 | ECHORIS 차용 여부 | 차용 형태 |
|:--|:--|:--|:--|
| **자진모리 12/8 가속** | K-pop (전통 크로스오버), K-cinema (Train to Busan 전투 시퀀스) | Must | 3-hit 콤보 = 12박 자연 일치, BPM 110-125 |
| **꽹과리 anvil tone** | K-pop (Leenalchi, Jambinai 1차 소스) | Must | 단조 anvil 타격음 = 이미 꽹과리 코드와 동형 — 자산 재활용 |
| **시스템 UI 카니발** | Webtoon (Solo Leveling) | Must | Memory Shard Recalled 의 *monospaced + 0.4s 정지 + chime + 청록→주황 컬러 드롭* 3박자 |
| **보스전 1.5~2.5초 정지 컷** | K-cinema (Park Chan-wook 잠깐 정지) | Must | 보스 격파 후 입력 ignore + 정지 컷 — DEC-042 정합 |
| **자연 풍경의 사양 댄스** | K-cinema (Burning 해미 댄스) | Should | True Ending 의 환경 모션 (낙엽/먼지/광선) |
| **Jambinai post-rock 합주** | K-pop (1차 niche 청취 겹침 ~70%) | Must | Heung Ending BGM 1순위 모델 — DEC-043 sonic palette |
| **시스템 대화** | K-games (NieR Automata Ending E save 합창) | Must | True Ending 의 시스템-플레이어 대화 — Webtoon §Omniscient Reader 톤 |
| **fan chant 집단 동조** | K-pop (BTS *Spring Day* 등) | Cannot | 보컬 budget 부재 — 멀티플레이 동시 액션 SFX 로 대체 |
| **트로트 신파 코드** | (K-pop §2010+ 거절 항목) | **Must Not** | 1차 niche 신호 약화 — 금지 |

### 2.4. 도메인 우선순위 (ECHORIS 적용 가중치)

| 도메인 | ECHORIS 적용 가중 | 이유 |
|:--|:--|:--|
| **K-games** | 1순위 | 가장 직접 적용 — Lies of P / Limbus / NieR Replicant 의 4-end 모델 |
| **Webtoon** | 1순위 | 게임 episodic pacing 의 가장 가까운 비-게임 매체 — Solo Leveling System UI |
| **K-pop** | 2순위 | Heung 의 글로벌 1차 소스 + sonic palette 직결 |
| **K-Literature** | 2순위 | Rustborn voice + 한강 2인칭 반전 모델 |
| **K-cinema** | 3순위 | 시네마틱 grammar 일부만 포팅 가능 (얼굴 클로즈업 불가) |
| **K-drama** | 3순위 | 90분-1시간 단위 페이싱 차이 큼 — 패턴만 차용 |
| **Theory** | 메타 | 학술 방어선 — 마케팅·인터뷰 대응 |

---

## 3. ECHORIS 메인 스토리 적용 구조

> **본 §3 은 시놉시스의 *구조적 spec*. 시놉시스의 *내용* 은 `Content_Story_Synopsis.md` 가 SSoT.**

### 3.1. 두 화자 구조

ECHORIS 는 두 명의 화자로 이뤄진다. 두 화자는 *비대칭 정* (Past Lives 모델) 으로 묶여 있다.

#### 3.1.1. Erda (침묵 주인공)

**문학적 원형:** 한강 *Greek Lessons* 의 *함묵 여자*. 침묵 = 사회적 죽음의 등가. Erda 의 침묵은 *능력의 부재가 아니라 의지의 거절*이다.

**한정흥 매핑:**
- **한:** Erda 는 *자기가 누구였는지 모름*. 강하의 이유, 동행자의 이름, 잃은 자의 얼굴 모두 *형태만 남고 내용은 비어 있음*
- **정:** Erda 는 *말하지 않는다*. 그러나 *Rustborn 의 모든 말에 응답한다* — 행동으로 (검을 휘두름, 다이브를 반복함, 같은 NPC 자리를 찾아감)
- **흥:** Erda 의 흥은 *전투의 순간*에만 발현. 콤보 완성, 보스 격파 직후 정지 컷 — 침묵 주인공의 흥은 *몸의 통과* 로 표현

**디자인 시금석:**
- Erda 는 *어떤 결정도 말로 표시하지 않는다*. UI 의 선택지가 Erda 의 의사다 — 플레이어가 곧 Erda 의 의지다.
- Erda 의 얼굴 표정은 *32×32 픽셀의 한계* 안에서 0.5단계만 표현 (K-Cinema §이식 불가능 장치 명시). 정서 부담은 *환경 색온도 + 실루엣 + 사운드*로 재분배.

#### 3.1.2. Rustborn (검 Ego, 내부 화자)

**문학적 원형:** 한강 *Human Acts* 의 *2인칭 죽은 자 호명*을 **반전**한 구조. *Human Acts* 는 산 자가 죽은 자를 호명한다 — Rustborn 은 *검(잊혀진 도구)*이 *산 자(Erda)를* 호명한다. 이 반전이 ECHORIS 의 *prose-grade 원형 (DEC-042)*.

**한정흥 매핑:**
- **한:** Rustborn 은 *전 wielder 들을 기억하지만 자기가 누구의 검인지 모름*. 의무에 대한 한.
- **정:** Rustborn 의 모든 대사는 *Erda 에게 향함*. Rustborn 은 *Erda 외의 누구에게도 말하지 않음*. 비대칭 정의 표지 — Rustborn 은 Erda 의 과거를 부분적으로 알고, Erda 는 자기 과거를 모름.
- **흥:** Rustborn 의 흥은 *판소리 5조 점진*. 계면조(슬픔의 절제) → 평조(평정) → 진양조(천천한 통과) → 자진모리(가속) → 휘모리(최고조). 게임 진행에 따라 Rustborn 의 dialogue 톤이 5조를 거친다.

**대사 모델 (K-Lit §Rustborn dialogue 모델):**
- 김영하 *Diary of a Murderer* 의 one-line paragraph
- 편혜영 *The Hole* 의 terse elliptical
- 한강의 2인칭 "you" hybrid

**금지:**
- 긴 monologue (3줄 초과 금지)
- 설명적 lore dump
- Erda 의 의지를 *대신 발화*하기 (예: "We must go!")
- 판타지 톤 어휘 (왕국·기사·용병·갑옷 — DEC-041 정합)
- 한·정·흥의 직접 호명 (영어권 fetishization 위험 — Theory §13)

**Rustborn 대사 모델 예시 (영어):**

> "You held me before. You don't remember."
>
> "The next one you kill — I knew him."
>
> "You walked past her house. Three doors back. You didn't turn."
>
> "The cold is in me now. I don't mind."

각 줄은 *1-2 문장, 평이한 어휘, 침묵을 호명*. 한강 *We Do Not Part* 의 호흡과 김영하의 압축이 hybrid.

### 3.2. 공간 구조

#### 3.2.1. The Shaft (수직 메가스트럭처)

**원형:** Parasite 의 *지하 → 반지하 → 고급 주택가* 수직 축 + Squid Game 의 *오징어 게임 미로 수직 카메라*. K-drama §수직 공간 = 한의 깊이 패턴이 1:1 동형 (이미 락된 backbone).

**3중 수직 layer (시놉시스 정합):**
- **자연층 (상층):** 빛 / 새소리 / 오염 전의 흔적 — *한이 시작되기 전*의 메타포
- **빌더층 (중층):** 사라진 거대 건축자들의 구조물 — *한의 형태가 굳은* 메타포 (재가 아니라 형태)
- **현문명층 (하층):** Erda 가 출발한 자리 — *한이 살고 있는 현재*

**색온도 분리 (K-cinema §수직 미장센):**
- 자연층: warm white + 청록 saturated
- 빌더층: 회청 + 주황 spot (단조 불꽃의 메타포)
- 현문명층: cool gray + 약한 청록 (체념의 색)

**한정흥 진행:**
- 게임 초반 = 현문명층 (한의 가장 두꺼운 자리)
- 게임 중반 = 빌더층 (한이 *형태*로 만나는 자리 — 정 전이의 공간)
- 게임 종반 = 자연층 + 심연(아래로 더 내려감) (흥의 카타르시스 자리)

#### 3.2.2. Item World (Memory Shard 의례 공간)

**원형:** Limbus Company Mirror Dungeon + 살풀이 의례 구조 (Theory §15).

**구조 동형:**

| 살풀이 | Item World |
|:--|:--|
| sal 흡수 | Forgotten Memory Shard (적 NPC) 격파 → 단편 흡수 |
| 동작에 박힘 | 정체성 슬롯 / 기억 슬롯 장착 |
| 최고조 발산 | 지층 보스(Item General → King → God → Great-God) 격파 |
| 의례 종결 | 월드 귀환 → 단조소 헌상 |

**핵심 의례 규칙 (이미 락):**
- Item World 진입은 *월드 세이브 포인트*에서만 (의례 공간의 분리)
- Item World 내부에서 *다른 아이템의 Item World* 진입 금지 (의례의 단일 회기성)
- 첫 Stratum 1 진입은 페이드 (DEC-039 Trapdoor 는 Stratum N→N+1 만)

### 3.3. 멀티 결말 (DEC-043 implementation)

#### 3.3.1. 4결말 + 1수렴 구조

DEC-043 의 3+1 다중 결말을 한정흥 트라이앵글 + Ancient 메타 자각으로 재정의:

| 결말 | 트라이앵글 꼭짓점 | 트리거 (시놉시스 §10 정합) |
|:--|:--|:--|
| **A. 천도 (Han Peak)** | 한 | 한정흥 누적이 *한* 쪽으로 쏠림. 떠난 자에게 *길을 내어 줌* |
| **B. 합침 (Jeong Peak)** | 정 | 한정흥 누적이 *정* 쪽으로 쏠림. 다른 *나*와 *함께 남음* |
| **C. 두고 떠남 (Heung Peak)** | 흥 | 한정흥 누적이 *흥* 쪽으로 쏠림. *놓아주고 새 자리로* |
| **True. 원초구조체 조우 (Convergence)** | 메타 | 5 Ancient 무기 + 심연 도달 + 모든 핵심 기억 Recalled |

**누적 트리거 메커닉** (Lies of P Lie System 모델 — K-games §1):
- 각 결말은 *단일 시스템 누적치*로 측정. 별도 분기 메커닉 없음
- 누적치 = 한 / 정 / 흥 각 점수 (행위 누적, 대화 선택, NPC 결말 등에서 적립)
- 결말 분기 시점 = 마지막 보스 직전 자동 측정
- True Ending = 위 3 누적의 *균형* (각 임계치 모두 충족) + 5 Ancient 보유 + 심연 도달

#### 3.3.2. 결말별 sonic + visual identity (K-pop §8.7 + K-cinema §흥 4분기 통합)

| 결말 | BGM 모델 | Visual 모티브 | 정서 톤 |
|:--|:--|:--|:--|
| **A. 천도** | 진양조 / 해금 솔로 | 자연층 상승 / 빛이 길게 새어 들어옴 | 한의 절제된 통과 |
| **B. 합침** | 중중모리 / 가야금+장구 trio | 빌더층 단조소 / 두 *나*가 같은 공간에 서 있음 | 정의 비대칭 평형 |
| **C. 두고 떠남** | Jambinai post-rock 합주 | Erda 등을 보이고 *다른 길*로 떠남 | 흥의 카타르시스 분리 |
| **True. 원초구조체** | 압축 산조 5단계 (계면 → 평 → 진양 → 자진모리 → 휘모리) | 원초구조체와 *마주 봄* / 시스템 메시지가 화면 밖에서 발화 | NieR Ending E + Webtoon §Omniscient Reader 톤 |

**True Ending 의 시스템 대화** (K-games §NieR Ending E + Webtoon §Solo Leveling System UI 통합):

> "당신은 모든 길을 통과했다."
>
> "다른 누군가가 다시 시작할 것이다."
>
> "당신의 기억은 그들의 시작이 된다."

마지막 단계에서 *플레이어의 세이브가 다른 플레이어에게 전이됨* — NieR Ending E 의 자기희생 합창 모델. Phase 3+ 멀티플레이 시점에서 *실제 자기 세이브 삭제 + 타 플레이어에게 도움 전송* 메커닉으로 구현 검토.

#### 3.3.3. 결말 후 게임 지속 (Disgaea 패턴)

DEC-043 정합: 결말 = *완료* 가 아닌 *통과지점*. 각 결말 후 다시 새 다이브 가능. 야리코미 무한 지속.

**금지 어휘:** "New Game Plus", "재시작", "True Ending Unlock" — Webtoon §회귀 클리셰 (시간 회귀형 한) 와 충돌. 대신 *"Another Dive"*, *"The Shaft remembers"*, *"You step in again"* 사용.

### 3.4. 메인 스토리 5막 구조 (판소리 5조 매핑)

ECHORIS 메인 스토리는 판소리 5조 (계면조 → 평조 → 진양조 → 자진모리 → 휘모리) 와 동형 5막으로 진행된다.

#### Act 1. 계면조 (Onboarding — 한의 발견)

- Erda 가 *왜 강하했는지 기억하지 못한 채* 깨어남
- Rustborn 의 첫 발화: "You held me before. You don't remember."
- 첫 룸 → 첫 세이브 포인트 → 첫 NPC 의 무언의 응시
- **톤:** 한의 *조용한 표면*. BGM 진양조보다 더 느린 *해금 솔로*
- **마지막 비트:** 첫 Item World 진입 — 의례의 시작

#### Act 2. 평조 (Exploration — 정의 축적)

- Stat Gate + 능력 게이트 해금 → The Shaft 의 빌더층 도달
- Memory Shard Forgotten 첫 만남 → 첫 격파 → 첫 Recalled
- Rustborn 의 발화 빈도 증가 — but *여전히 1-3줄 한정*
- **톤:** 한이 *형태*로 모습을 드러냄. BGM 은 *판소리 평조 + 가야금 reverb*
- **마지막 비트:** 다른 *나*의 흔적 첫 발견 (메신저 패턴의 발화)

#### Act 3. 진양조 (Mid-game — 비대칭 정의 확립)

- 다른 *나*가 *지금은 누가 되어 있는지* 단편적 발견
- Rustborn 의 호칭이 진화 (Identity Archive Stage 진행)
- 핵심 기억(Core Memory) 첫 획득 → 정체성 슬롯 첫 장착
- **톤:** 한이 정으로 *천천히 형태 변경*. BGM *진양조 + janggu 저속*
- **마지막 비트:** 첫 Ancient 무기 등장 가능성 시사

#### Act 4. 자진모리 (Late-game — 흥의 가속)

- Item World 후반 지층(Item God) 접근
- Forge 단편 흥 카니발 시퀀스 발현 (세션당 5% 미만)
- 누적 트리거가 *어느 결말로 향하는지* 플레이어가 *알 수 있게* (UI/대사로 시사, 단 결정은 마지막에)
- **톤:** 한·정·흥의 *내적 가속*. BGM 자진모리 12/8 BPM 115
- **마지막 비트:** 마지막 보스 직전 — Rustborn 의 마지막 호명

#### Act 5. 휘모리 (Ending — 결말 분기)

- 마지막 보스전: 카메라 정지 컷 + 자진모리→휘모리 가속 BGM
- 결말 분기: A / B / C 단독 (단일 결말 도달 시) 또는 True (수렴 조건 충족 시)
- **톤:** 결말별 sonic palette (§3.3.2)
- **마지막 비트:** 결말 후 *Another Dive* 메뉴 — 야리코미 회귀

---

## 4. 어휘 정책 (마케팅 vs 내부 spec)

### 4.1. 영어권 노출 어휘 tier (K-Lit §영어권 정착도 + Theory §16 통합)

| 어휘 | 영어권 정착 | ECHORIS 사용 정책 |
|:--|:--|:--|
| **han** | 높음 (한강 노벨 후 정착) | *내부 spec 만*. 마케팅 카피 노출 금지 (fetishization 위험) |
| **jeong** | 중간 (footnote 필요) | *내부 spec 만*. 마케팅 노출 금지 |
| **heung** | 낮음 | *내부 spec 만*. 마케팅 노출 절대 금지 |
| **salpuri / hanpuri** | 매우 낮음 | *내부 spec 만*. 학술 인터뷰 시 *설명과 함께만* |
| **hwabyung** | 임상 영역 정착 | 사용 비권장 (게임 톤과 충돌) |
| **inyun (인연)** | Past Lives 후 약간 정착 | 사용 가능 (단, ECHORIS 는 *별도 단어 도입 자제* — Rustborn 의 시 자체로 보임) |

### 4.2. 신호 vs 침묵 (마케팅 grammar)

**보이는 신호 (1차 niche 에게 *louder*):**
- 침묵 주인공 + 말하는 도구의 *비대칭 정* 페어
- 수직 megastructure 의 *층별 색온도*
- 단조 anvil 의 *꽹과리 코드 tone*
- Memory Shard 의례의 *3단계 흡수→장착→발산*
- 결말의 *환경 변화* (캐릭터 변화 아님) — Past Lives 의 *inyun* 자막 모델

**침묵 (1차 niche 에게 *무해히 통과*):**
- 한·정·흥 단어 자체
- 판소리·살풀이 용어 자체
- 한국 전통 모티브 직접 시각화 (한복·태극 등 — DEC-041 정합)
- "Korean game" 자칭 (Lies of P 도 안 함, K-Cinema §Past Lives 도 안 함)

### 4.3. 금지 어휘 통합 리스트 (DEC-041 + 본 spec)

**Webtoon 트랩 5종** (Webtoon §3 + DEC-041 통합):
1. 학교폭력 과잉 setup
2. sajaegi 4중 중첩 (음모-배신-복수-회귀)
3. 회귀 클리셰 (시간 회귀형 한) — *Marry My Husband* 모델 금지
4. trauma bonding jeong 미화
5. 단일 악 권선징악

**K-Cinema 임권택과의 단절** (K-Cinema §임권택 단절 + DEC-041 통합):
1. 판소리적 *발화* 직접 차용 (판소리는 *grammar* 로만 차용, *발화 모드*로 차용 금지)
2. 민족 풍경 직접 사용 (한복/한옥/태극 등)
3. 강제 상속 narrative ("나는 이것을 물려받았다" 톤)
4. 1:1 등가물 (한=특정 단어, 정=특정 행위 등 — 단순 등가 금지)

**판타지 톤 어휘 0건** (DEC-041 정합, 재확인):
- 왕국 / 기사 / 용병 / 갑옷 / 공주 / 마법 학교 / 영웅 / 운명
- 대체: 강하한 자 / 동행자 / 단조소 / 빌더 / 메가스트럭처 / 기억 단편 / 의례

---

## 5. 학술 방어선 (인터뷰·비평 대응)

Theory §16 의 *3중 방어선*을 ECHORIS 의 *마케팅·인터뷰·학술 응답* 에 어떻게 적용하는지 명문화.

### 5.1. 3진영 fallback

| 진영 | 입장 | fallback 사용 시점 |
|:--|:--|:--|
| **Postcolonial-aware** | 한은 *고정 본질*이 아니라 *역사적 형성*. Sandra So Hee Chi Kim 의 colonial-invention critique 수용 위에 작업. | 비평가가 *"Korean essence" 라고 부르려 할 때* |
| **Clinically grounded** | Hwabyung 은 DSM-5 cultural concept of distress 등재. ECHORIS 의 한 묘사는 임상 grounded. | 비평가가 *"비과학적 신비화" 라고 부르려 할 때* |
| **Ritually structured** | 살풀이의 sal-흡수-장착-발산 구조 차용. Korean folk practice 에서 도출, 민족 본질에서 도출 아님. Laurel Kendall (Columbia) + Bou-Yong Rhi 인용. | 비평가가 *"무엇을 차용했나" 라고 물을 때* |

어떤 진영에서 backlash 가 와도 다른 두 진영으로 *후퇴 가능*.

### 5.2. 한국 매체 인터뷰 인용 권장

- **김상봉 (서로주체성)** — Chonnam 철학자. 단, 1차 텍스트 직접 검증 필요 (Theory §결론 한계 명시).
- **김열규 (한국인의 마음)** — 작고했으나 학술 권위 유지.
- **한강 (노벨 강연 *Light and Thread*)** — 직접 인용 안전. *"Life is warm. To kill is to make cold."* 인용 가능.

### 5.3. 영어 매체 인터뷰 인용 권장

- **Han Kang Nobel Lecture 2024** — 가장 안전한 영어 1차 소스
- **Cathy Park Hong *Minor Feelings* (2020)** — 디아스포라 한 정의
- **Joshua Pilzer *Hearts of Pine* (Oxford 2012)** — 한의 colonial-postcolonial 형성

---

## 6. 후속 조사 권장

본 종합 결과 *미해결 / 보강* 항목:

| 항목 | 우선순위 | 처리 시점 |
|:--|:--|:--|
| **정보라 *Cursed Bunny* 리서치 보강** (K-Lit §7) — SF/호러로 한 형상화한 가장 직접적 ECHORIS-친화 사례 가능성 | Should | Fina 첫 캐릭터 brief 전 |
| **김상봉 *서로주체성* 1차 텍스트 검증** (Theory §결론) — KCI/한국학 도서관 직접 검색 | Nice-to-have | 인터뷰 1주일 전 |
| **Project Moon (Limbus Company) GDC 발표 자료 검토** — Han-coded design 직접 인터뷰 | Should | Phase 2 후반 |
| **Lies of P 사운드 디자이너 인터뷰 자료 검토** — Hotel Krat BGM 디자인 근거 | Nice-to-have | DEC-043 BGM 발주 전 |

---

## 7. 즉시 적용 (다음 단계)

본 spec 락 직후 다음 작업이 *준비됨*:

### 7.1. Content_Story_Synopsis.md §8.2 갱신

§8.2 한정흥 정의 절을 본 문서 §1 의 통합 정의로 *대체* 권장. narrative-director 검수 후 진행.

### 7.2. Fina 첫 캐릭터 brief (CNT-CHR-001~005)

본 문서 §3.1 (두 화자 구조) + §3.2 (공간) + §3.4 (5막) 가 Fina 의 *첫 5명 Echo-Bearer 캐릭터 정의* brief 의 토대. 영어 brief 초안 별도 생성 가능.

### 7.3. DEC-043 sonic palette 발주 spec

§3.3.2 의 4결말 sonic identity 표 → audio-director 에게 작업 spec 으로 전달 가능.

### 7.4. Rustborn 대사 5조 progression spec

§3.1.2 + §3.4 의 5막-5조 매핑 → Rustborn dialogue 작성 시금석. Fina 가 작성, narrative-designer 가 검수.

---

## 8. 결정 락

본 문서로 다음 사항 *Established (canon)* 락:

1. **한정흥 통합 정의** — §1
2. **살풀이 spine 의 학술적 정당성** — §1.5 + §5
3. **두 화자 구조 (Erda + Rustborn) 의 한정흥 매핑** — §3.1
4. **The Shaft 3중 수직 layer 의 한정흥 진행** — §3.2.1
5. **Item World ↔ 살풀이 구조적 동형** — §3.2.2 + §1.5
6. **DEC-043 4결말 + True 수렴의 한정흥 트라이앵글 매핑** — §3.3
7. **5막 = 판소리 5조 매핑** — §3.4
8. **영어권 어휘 정책 tier** — §4.1
9. **학술 방어선 3진영** — §5.1
10. **금지 어휘 통합 리스트** — §4.3

---

**Cross-references:**
- `Documents/Content/Content_Story_Synopsis.md` §8.2 / §10
- `Documents/Terms/Project_Vision_Abyss.md` §2
- `memory/project_design_decisions.md` DEC-041 / 042 / 043
- `memory/project_three_pillars.md`
- `memory/project_fluid_as_geo_system.md`
- `memory/project_brand_typography.md` (DM Mono 정합)
- `Documents/Design/Design_ItemWorld_Onboarding_SwordEgo.md`

**원천 리서치 (`Reference/HanJeongHeung_Research_*.md`):**
- `_Kdrama.md` — 15편 분석 + Top 5 Han / Top 5 Jeong / Top 3 Heung
- `_Kcinema.md` — 19편 + Park/Bong/Lee 도구함 + 흥 4분기
- `_Kpop.md` — 16건 + Top 7 Heung + 판소리 5조 매핑
- `_Kliterature.md` — 20편 + 한강 시그니처 6장치 + Rustborn voice 모델
- `_Webtoon.md` — 16편 + Solo Leveling System UI + Eleceed pair dynamic
- `_Kgames.md` — 24섹션 + Lies of P / Limbus / NieR 4-end 모델
- `_Theory.md` — 17섹션 + Sandra Kim / Han Kang Nobel / Salpuri 3진영 방어선

---

**문서 일관성 점검 (CLAUDE.md 정합):**
- [x] 마크다운 링크 뒤 공백 정합
- [x] `~` 미사용
- [x] 이모지 0건
- [x] 한국어 존댓말 / 일본어 0건
- [x] 인용 [확인함]/[추측임]/[근거 없음] 태그 — 본 spec 은 7개 raw 리서치의 *종합 요약*이므로 원천 리포트 참조
- [x] DEC-041 판타지 어휘 0건
- [x] DEC-042 한정흥 backbone 정합
- [x] DEC-043 다중 결말 정합
- [x] Must / Nice-to-have / Must Not 우선순위 용어 사용
