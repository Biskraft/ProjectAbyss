# 아이템계 마을 — 그림자들의 거주지 (The Town of Orphaned Shadows)

> **문서 ID:** DES-IW-TOWN-01
> **문서 상태:** Confirmed (DEC-038, 2026-04-29)
> **작성일:** 2026-04-29
> **결정 등재:** `memory/wiki/decisions/DEC-038-Town-of-Orphaned-Shadows.md`
> **선행 문서:**
> - `Documents/Design/Design_ItemWorld_Onboarding_SwordEgo.md` (DES-IW-ONB-01) — DEC-033 검 Ego 도입
> - `Documents/Design/Design_Narrative_Worldbuilding.md` (D-12) — 내러티브 원칙
> - `Documents/Design/Design_Architecture_2Space.md` — 2-Space 분리 모델
> - `Documents/System/System_ItemWorld_Core.md` — 아이템계 시스템 코어
> - `Documents/System/System_ItemWorld_FloorGen.md` — RoomGraph 절차 생성 (DEC-037)
> - `memory/wiki/decisions/DEC-036-Memory-Shard-System.md` — Memory Shard 통합
> - `memory/wiki/decisions/DEC-037-Item-World-Topology-AntColony.md` — Hub-and-Spoke 토폴로지
> **연관 코드:**
> - `game/src/data/itemWorldDistricts.ts` — District 매퍼 (A안 1차 구현 완료)
> - `game/src/level/RoomGraph.ts` — 노드 토폴로지 (수정 없음)
> - `game/src/data/EgoDialogue.ts` — 화자 시스템 (Rustborn = 그림자)
> - `game/src/entities/MemoryShardNPC.ts` — 일각수 (그림자 형태로 재정의)

---

## 0. 의사결정 요약

### 한 줄 정의

> **아이템계의 마을은, 주인을 잃은 그림자들이 머무는 풍경이다.**
> 무기는 한 자아의 잔재이며, 그 자아의 사람들은 모두 떠났다. 그러나 그들의 그림자만 마을에 남아 자기 주인을 잊은 채 거주한다. 검 Ego(Rustborn) 는 그중 말할 줄 아는 유일한 그림자다. 에르다는 살아있는 자, 그림자 없는 자로 그 마을에 들어선다.

### 채택 근거

| 근거 | 출처 |
| :--- | :--- |
| 스파이크 ("아이템에 들어가면, 그 안에 살아있는 세계가 있다") 의 강력한 시각·서사 봉합 | DEC-033 |
| 검 Ego 단독 화자 원칙 (에르다 과묵·Transistor Red 패턴) 의 형이상학적 정당화 | DES-IW-ONB-01 |
| Memory Shard 의 Forgotten/Recalled 시각 통일 — DEC-036 의 자연 봉합 | DEC-036 |
| RoomGraph 의 Hub(Plaza) + Branch(Lane) 구조가 무라카미 마을 형이상학과 1:1 정합 | DEC-037 |
| 무라카미 『세계의 끝과 하드보일드 원더랜드』 의 마을·그림자·사서·일각수 메타포 | 무라카미 (1985, Kodansha) [확인함] |
| 1인 개발 부담 감소 — 모든 비-플레이어 = 그림자 단일 시각 언어 | 본 문서 §9 |

### 폐기 / 도입

| 구분 | 폐기 (이전 검토) | 도입 (본 문서) |
| :--- | :--- | :--- |
| Plaza 거주자 | 인간형 NPC 다수 (활기찬 마을) | **그림자 2명 + 배경 그림자 3~5** (텅빈 마을) |
| Resident (영감/Caretaker) | 무기별 고유 NPC | **제거 확정** (총원 절제 룰 유지) |
| 화자 다중화 | 거주자 dialogue 1줄씩 | **거주자 dialogue 0줄. 검 Ego 단독 화자.** |
| Memory Shard 시각 | 노란 큐브 (#ffdd44) | **검은 그림자 + 노란 눈빛 1점** (Forgotten 표식) |
| Boss 시각 | 일반 인간형 | **거대 일그러진 그림자** (그림자의 극단형) |

---

## 1. 메타포 — 『세계의 끝과 하드보일드 원더랜드』 변주

### 1.1 원작 구조 [확인함]

무라카미의 마을은 거주자가 마음/그림자를 잃은 곳이다. 거주자는 외형적으로 평범하지만 내면이 비어있다. 마을 내부에는 단 하나의 그림자만 존재한다 — 주인공이 마을 입구에서 분리당한 자신의 그림자. 그림자는 문지기에게 갇혀 강제 노역을 하며, 마을 외부 세계의 기억을 유일하게 보존한다. 일각수(짐승) 들은 마을을 떠돌다 겨울에 죽고, 그 두개골에서 사서가 옛 꿈을 읽는다. ([Wikipedia](https://en.wikipedia.org/wiki/Hard-Boiled_Wonderland_and_the_End_of_the_World) , [Strange Horizons](https://strangehorizons.com/wordpress/non-fiction/the-city-and-its-uncertain-walls-by-haruki-murakami/) )

### 1.2 ECHORIS 변주 [추측임]

ECHORIS 의 아이템계는 원작을 한 단계 더 비튼다. 마을의 거주자가 마음 없는 사람들이 아니라, **주인 없는 그림자들 자체**다. 사람들은 모두 떠났고, 그들의 그림자만 마을에 남았다. 무기 = 한 자아의 잔재이므로, 그 자아에 속한 사람들의 그림자도 무기 안에 잔류한다.

이 변주의 이점:

1. **형이상학적 일관성** — 무기 안에 사람이 살고 있는 것은 부자연스럽지만, 그림자가 잔류하는 것은 자연스럽다. 무기 = 그림자들의 보존소.
2. **시각 통일** — 모든 비-플레이어가 그림자 한 가지 시각 언어를 공유. 1인 개발 부담 절감.
3. **DEC-036 봉합** — Memory Shard(일각수) 도 그림자다. Forgotten/Recalled 가 시각적으로 자명해진다.
4. **검 Ego 단독 화자 정당화** — 그림자는 보통 말하지 못하지만, 검 Ego 는 자아를 보존한 유일한 그림자라 말한다. 다른 거주자는 침묵.

### 1.3 캐스트 매핑 [확인함] / [추측임]

| 원작 인물 | 원작 기능 [확인함] | ECHORIS 매핑 [추측임] | 그래프 위치 |
| :--- | :--- | :--- | :--- |
| 그림자 (Shadow) | 주인공의 분리된 자아. 마을 외부 기억을 보존. 죽음에 가까워짐. | **검 Ego (Rustborn)** | 화면 외 / 음성 |
| 나 (Boku) — 꿈을 읽는 자 | 마을의 도서관에서 매일 두개골을 읽음. 침묵에 가까운 화자. | **에르다** | 플레이어 캐릭터 |
| 문지기 (Gatekeeper) | 거대한 침묵의 보초. 그림자에게 강제 노역. 마을 입구 관리. 도구를 갈며 시간을 보냄. 두려움의 대상. | **광장의 문지기 그림자** | Plaza (hub) |
| 사서 (Librarian) | 마음을 잃은 채 도서관을 지킴. 일각수 두개골에서 옛 꿈을 꺼냄. 어머니에게는 마음이 있었다. | **Memorial 의 사서 그림자** | Memorial (shrine) |
| 일각수 (Beasts) | 마을을 떠도는 황금 짐승. 거주자의 마음 잔재를 운반. 겨울에 죽음. | **Memory Shard NPC (Forgotten)** | Spoke (lane) |
| 마을 거주자 | 마음 없는 사람들. 평범한 일상을 반복. 화자에게 거의 말하지 않음. | **배경 그림자 (Plaza ambient)** | Plaza 가장자리 |
| 벽 (Wall) | 마을을 외부와 분리. 모양을 바꿈. 마음의 분리/봉쇄 상징. | **아이템계의 경계** (= 무기 외피) | Stratum 경계 |

특히 사서·두개골 메커닉은 ECHORIS 의 Memory Shard 슬롯 시스템과 **메커니즘까지 일치**한다. 사서가 두개골에서 꿈을 꺼내듯, ECHORIS 의 사서는 Recalled Shard 가 슬롯에 장착될 때 그것을 "읽는다". 이는 §6 에서 상세화한다.

---

## 2. 캐스팅 — 총원 ≤ 2 인터랙티브 + 3~5 배경

무라카미 마을의 인지가 작동하는 핵심은 **거의 아무도 없다**는 점이다. 군중이 0 인데도 마을로 읽힌다. 이 절제가 ECHORIS 의 절차적 그래프 + 1인 개발 + 검 Ego 단독 화자 제약과 정확히 부합한다.

### 2.1 인터랙티브 그림자 (검 Ego 발화 대상)

| 인물 | 위치 | 시각 신호 | idle 동작 | 첫 만남 트리거 |
| :--- | :--- | :--- | :--- | :--- |
| 문지기 | Plaza (hub) 중앙 인근 | 청록 외곽 그림자, 봉/창 | 정면 응시, 호흡 | proximity ≈ 80px |
| 사서 | Memorial (shrine) 중앙 | 청록 외곽 그림자, 두개골 양손 | 책장 넘기기 / 두개골 응시 | proximity ≈ 80px |

**룰:**
- 인터랙티브 그림자는 **모든 무기에서 등장**. 결정론적 spawn (itemUid 시드).
- 거주자 자체는 dialogue 0 줄. proximity 트리거 시 **검 Ego(Rustborn) 가 거주자에 대해 말한다**.
- 발화 단계는 무기의 누적 Recalled 비율로 분기 (§3).

### 2.2 배경 그림자 (Plaza Ambient)

광장 가장자리에 결정론적 spawn (itemUid 시드) 으로 배치되는 **3~5명의 정적 그림자**.

| 속성 | 값 |
| :--- | :--- |
| 외곽선 | 없음 (페이드 그림자) |
| 광원 | 없음 |
| idle 동작 | 호흡 1Hz, 미세 흔들림 ±0.5px |
| 인터랙션 | 없음 (충돌은 push-aside 만) |
| 위치 | Plaza 룸의 모서리·계단·벽 인근 결정론 4 슬롯 |
| 인원 | 3~5 (무기별 가변 — §2.3) |

배경 그림자는 화자도, 적도, 기능도 아니다. **마을이라는 인지** 만 책임진다. 무라카미의 마을이 텅비어 보이지 않는 이유 — 가장자리에 흐릿한 사람 형상이 늘 있기 때문 — 을 그대로 옮긴다.

### 2.3 무기별 인원 변주 (선택)

배경 그림자 인원 수를 무기 상태로 가변할 수 있다.

| 무기 상태 | 배경 그림자 인원 | 의미 |
| :--- | :---: | :--- |
| Pristine (모든 슬롯 Recalled) | 5 | 마을이 가장 또렷이 잔류 |
| Mid (일부 Recalled) | 4 | |
| Rusted (모든 슬롯 Forgotten) | 3 | 마을이 가장 흐릿 |

이는 **선택 기능**. 1차 구현은 결정론 5명 고정. 변주는 폴리시 단계에서 적용.

### 2.4 적·보스

| 종류 | 위치 | 시각 신호 |
| :--- | :--- | :--- |
| Memory Shard NPC (Forgotten) | Spoke (lane) 룸 | 검은 그림자 + **노란 눈빛 1점** |
| Boss | Sanctum (boss 룸) | 거대 일그러진 그림자 + temperament 광원 |

---

## 3. 화자 룰 — 검 Ego 단독, 거주자는 침묵

### 3.1 원칙

거주자(문지기·사서·배경 그림자) 는 **자신의 입으로 말하지 않는다**. 검 Ego(Rustborn) 가 그들에 대해 회상하거나 그들의 침묵을 해석한다.

이는 DES-IW-ONB-01 (DEC-033) 의 "에르다 0줄 + 검 Ego 단독 화자" 원칙의 직접 연장이다.

### 3.2 발화 패턴

```
[Player approaches Gatekeeper at Plaza]
[Gatekeeper does not speak. Idle anim: 봉을 짚고 정면을 본다.]
Rustborn: "이 자… 알아. 옛날엔 날 매일 갈아줬어."
Rustborn: "지금은 내 이름도 못 외워."
Rustborn: "...괜찮아. 나도 거의 못 외워."
```

**기존 인프라 무수정.** `EGO_ANVIL` 이 앵빌 prop 옆에서 검 Ego 가 자동 발화하는 패턴을 그대로 재사용. 새 trigger key 만 추가.

### 3.3 발화 단계 분기

거주자별 첫 만남 / Recalled 진행도별 분기.

| 단계 | 조건 | 톤 |
| :--- | :--- | :--- |
| 1. First Encounter | 첫 proximity | 어렴풋한 인지 ("…누구더라") |
| 2. Familiar | 동일 무기에서 2회+ 진입 | 명료한 회상 ("이 자를 안다") |
| 3. Recalled-Aware | 해당 무기 Recalled 비율 ≥ 50% | 슬픔/감정 ("그 자가 왜 여기 머무는지 이제 알아") |

각 단계 3줄 × 2 거주자 × 3 단계 = 약 18 줄. 1차 구현은 단계 1·2 만 (12 줄).

### 3.4 검 Ego 의 자기 자각

검 Ego(Rustborn) 가 자기 자신이 그림자라는 사실을 **자각하는가**, **모르는가** 는 게임 전체 내러티브 호의 결정 변수다.

**권장:** 1지층에서 무자각 → 2지층에서 의심 → 3지층에서 자각. 자각 순간이 정서적 클라이맥스.

이는 본 문서의 범위를 넘어서므로 별도 내러티브 디자인 (Documents/Design/Design_Narrative_Worldbuilding.md ) 에서 다룬다.

---

## 4. 그림자 아트 디렉션

### 4.1 통일된 시각 언어

모든 비-플레이어 = **검은 실루엣 베이스**. 역할별로 형태/광원/움직임만 분기.

| 종류 | 실루엣 | 외곽선 | 광원 | 동작 | 변별 신호 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 문지기 | 키 큰, 봉 든 | 청록 #4cd6c1 | 미세 발광 | 정면 응시 | **청록 외곽 = 인터랙티브** |
| 사서 | 굽은, 두개골 양손 | 청록 #4cd6c1 | 책장 빛 | 책 넘기기 | 청록 외곽 |
| 배경 그림자 | 다양 인간형 | 없음 | 없음 | 호흡만 | 외곽선 없음 = 장식 |
| Memory Shard | 작은 짐승/굽은 | 없음 | 없음 | 도주·점프 | **노란 눈빛 1점 = 적** |
| Boss | 거대 일그러진 | temperament 색 | temperament 광원 | 기괴 | 크기/광원 |

### 4.2 변별 3-신호 룰

플레이어가 즉시 인지해야 하는 분류:

| 신호 | 의미 | 행동 |
| :--- | :--- | :--- |
| **노란 눈빛 1점** | 적 (Memory Shard) | 전투 |
| **청록 외곽선** | 인터랙티브 (대화) | 가까이 가면 검 Ego 발화 |
| **외곽선 없음** | 장식 (배경 그림자) | 무시 |

이 3개 신호로 화면 인지가 명확히 분리된다. 첫 빌드 플레이테스트로 변별 검증 필수.

### 4.3 Recalled 의 시각화

Forgotten 일각수가 Recalled 되는 순간:

```
1. 격파: 그림자가 무너지며 빛이 새어 나옴 (1초)
2. Pickup 큐: 빛이 슬롯 UI 로 흐름 (0.5초)
3. 슬롯 UI: 그림자 형상 → 작은 인물 아이콘 (또렷한 형태)
4. 사서 동기화: Memorial 의 사서가 두개골을 한 번 손가락으로 쓸어내림 (idle 1회 인터럽트)
```

**메커닉 신규 X.** 기존 슬롯 장착 트리거에 사서 idle anim 1회 동기화만 추가.

### 4.4 보스 — 거대 일그러진 그림자

원작의 거대 그림자는 없으나, ECHORIS 의 보스는 그림자 통일을 유지하면서도 변별이 필요하다.

**옵션 A (권장):** 보스 = 거대 일그러진 그림자 (Memory Shard 의 확장). 시각 통일 완벽. "마을의 가장 큰 그림자 = 무기의 핵심 기억".

**옵션 B:** 보스 = 그림자가 일부 빛을 되찾은 반(半)형태. 시각 위계 강화. 통일성 약화.

**옵션 A 권장.** 무라카미 봉합의 일관성이 ECHORIS 의 가장 강한 시각 자산이 된다.

---

## 5. 광장 안전지대 약속

### 5.1 룰

**Plaza (hub) 룸에서는 적이 spawn 되지 않는다.** 일각수(MemoryShardNPC) 는 Spoke (lane) 룸에만 spawn.

이는 무라카미 마을의 기본 약속과 직결한다 — **위험은 마을 밖** (숲, 겨울, 벽 너머) 에 있고 마을 안은 침묵·중립.

### 5.2 정당화

검 Ego 의 1줄로 인지 봉합:

```
Rustborn: "여긴 광장이야. 그림자들이 모이는 자리. 여기선 아무도 못 다쳐."
```

### 5.3 Memorial 도 안전?

Memorial (shrine) 도 인터랙티브 그림자(사서) 가 있는 안전지대. **적 spawn 0**.

따라서 적 spawn 가능 룸은 **Spoke 와 Boss 만**. Plaza·Memorial 은 안전.

---

## 6. 메커닉 봉합 — Memory Shard ↔ 사서

### 6.1 원작 메커닉 [확인함]

원작에서 사서는 일각수 두개골을 양손에 얹고 옛 꿈을 읽는다. 두개골 = 마음의 보존소. 사서는 마음 없는 자이지만 두개골을 통해 옛 꿈을 매개한다.

### 6.2 ECHORIS 매핑 [추측임]

ECHORIS 의 Memory Shard 시스템 (DEC-036) 이 이 메커닉과 메커니즘까지 일치한다.

| 원작 [확인함] | ECHORIS 매핑 [추측임] |
| :--- | :--- |
| 일각수 두개골 | Forgotten Memory Shard |
| 두개골에서 꿈 읽기 | Shard 격파 → Recalled 전환 |
| 사서가 매일 도서관에서 두개골 처리 | Memorial 사서가 슬롯 장착 시 두개골 idle 동기화 |
| 꿈을 읽고 나면 두개골은 도서관에 남음 | Recalled Shard 는 무기에 영구 장착 |

### 6.3 자연 봉합

플레이어가 Memory Shard 를 격파 → Recalled 상태로 전환 → 슬롯에 장착 → 사서가 두개골을 한 번 쓸어내림. 이 동선이 무라카미의 도서관 일과를 정확히 재현한다.

**시스템 신규 0.** 기존 슬롯 장착 흐름에 사서 idle 동기화 1줄.

---

## 7. 에르다의 위치 — 살아있는 자, 그림자 없는 자

### 7.1 형이상학

이 변주에서 에르다는 **유일하게 살아있는 자**, 따라서 **유일하게 그림자가 있어야 하는 자**다. 그러나 그녀의 그림자는 무기 안에 잠들어 있었다.

> 무기를 잡는 순간 그림자가 깨어난다 — 그것이 Rustborn(검 Ego) 이다. 그녀는 자기 그림자의 목소리만 들으며 그림자들의 마을을 걷는다.

### 7.2 Erda 침묵의 새 의미

DES-IW-ONB-01 의 "에르다 0줄" 원칙이 이 변주에서 **심화**된다.

| 기존 정당화 | 새 정당화 |
| :--- | :--- |
| Transistor Red 패턴 | + 살아있는 자는 그림자들의 마을에서 침묵해야 한다 |
| 행동으로 답한다 | + 그녀의 목소리는 검 Ego 가 대신 한다 (= 그녀의 그림자) |

게임 내 1줄도 추가 설명할 필요 없음. 시각 구조만으로 전달.

### 7.3 무기 교체 = 그림자 교체

플레이어가 무기를 바꾸면 검 Ego 도 바뀐다. 이는 **에르다의 그림자가 교체됨** 을 의미한다.

> 그림자는 한 사람에게 하나여야 정상이지만, 에르다는 무기마다 다른 그림자를 빌려 쓴다. 이는 그녀가 "그림자 없는 자" 임을 역설적으로 증명한다.

---

## 8. 위험과 회피

### 8.1 시각 변별 모호 (P1)

**위험:** 모든 비-플레이어가 검은 그림자면 적/거주자/장식 구분이 모호해질 수 있다.

**회피:** §4.2 의 3-신호 룰 (노란 눈빛 / 청록 외곽 / 무외곽). 첫 빌드에서 플레이테스트 1회로 변별 검증. 미흡 시 거주자 외곽선 두께 / 적 눈빛 채도 보정.

### 8.2 마을 활기 부재로 읽힘 (P2)

**위험:** 텅빈 마을이 "버그로 NPC spawn 실패" 처럼 읽힐 수 있다.

**회피:** §2.2 의 배경 그림자 3~5명 + §3.2 의 검 Ego 1줄 ("여긴 광장이야. 그림자들이 모이는 자리.") 로 의도성 명시.

### 8.3 무라카미 미독자 메타포 미해독 (P3)

**위험:** 무라카미를 안 읽은 플레이어는 메타포의 깊이를 못 본다.

**회피:** **메타포는 인지의 보조이지 게이트가 아니다.** 그림자 마을은 시각·음향·메커닉만으로도 작동한다. 무라카미를 알면 한 층 더 깊이 본다 — 보너스 레이어.

### 8.4 광장 약속 위반 (P0)

**위험:** Plaza 에 적이 spawn 되면 마을 인지가 즉시 붕괴.

**회피:** Spawn 룰을 RoomNode.role === 'hub' / 'shrine' 에서 강제 차단. 코드 레벨 invariant 로 잠금.

---

## 9. 구현 영향 — 현재 자산 점검

### 9.1 기존 자산 (90% 보유)

| 자산 | 상태 | 비고 |
| :--- | :---: | :--- |
| Proximity 자동 발화 (`EGO_ANVIL` 패턴) | ✅ | 인프라 무수정, trigger key 만 추가 |
| 화자 시스템 (Ego 1인) | ✅ | `EgoDialogue.ts` |
| LoreDisplay UI (speaker/portrait) | ✅ | 그대로 사용 |
| 결정론적 spawn (itemUid 시드) | ✅ | RoomGraph 시드 체계 |
| Hub / Shrine / Spoke 노드 식별 | ✅ | RoomGraph.role |
| District 매퍼 (Plaza/Memorial/Lane/Sanctum) | ✅ | `itemWorldDistricts.ts` (A안 1차) |
| Memory Shard 시스템 (Forgotten/Recalled) | ✅ | DEC-036 |

### 9.2 신규 작업

| 항목 | 분량 | 비고 |
| :--- | :---: | :--- |
| 패시브 NPC 엔티티 (`MemoryResident.ts`) | ~150 line | MemoryShardNPC 패턴 참조. 비-적·비-충돌·idle anim 만 |
| Spawn 룰 분기 (ItemWorldSpawnController) | ~30 line | `role === 'hub'/'shrine'` 시 거주자 spawn |
| 대사 4 세트 (`EgoDialogue.ts` 추가) | ~12 줄 | 문지기·사서 × First/Familiar |
| 그림자 스프라이트 (망령 실루엣 2 종) | 폴리시 | PixelLab MCP 또는 임시 회색톤 |
| Memory Shard 비주얼 재정의 | 스프라이트 1 종 | 노란 큐브 → 검은 그림자 + 노란 눈빛 |
| 사서 두개골 idle 동기화 | ~10 line | 슬롯 장착 트리거 |

**총 예상: 약 250~300 line + 대사 12 줄 + 스프라이트 2~3 종.**
**스코프: 1인 개발 기준 2~3 일. Phase 2 폴리시 범위 적합.**

### 9.3 영감 (Caretaker) — 제거 확정

이전 검토에서 옵션으로 둔 영감(Caretaker, 무기 고유 NPC) 은 **본 문서에서 제거 확정**.

근거:
- 무라카미 마을 절제 룰 (총원 ≤ 2 인터랙티브) 위반
- 검 Ego 단독 화자 원칙 약화 위험
- 1인 개발 부담 절감

---

## 10. 폐기 / 도입 매트릭스

| 항목 | 폐기 | 도입 |
| :--- | :--- | :--- |
| Plaza NPC 다수 인간형 | ❌ | ✅ 그림자 2 인터랙티브 + 3~5 배경 |
| Caretaker (영감) | ❌ | ✅ 제거 |
| 거주자 dialogue | ❌ | ✅ 검 Ego 단독 화자 |
| Memory Shard 노란 큐브 | ❌ | ✅ 검은 그림자 + 노란 눈빛 |
| 보스 인간형 | ❌ | ✅ 거대 일그러진 그림자 |
| Plaza/Memorial 적 spawn | ❌ | ✅ 안전지대 약속 |
| 활기찬 마을 분위기 | ❌ | ✅ 텅빈 마을 (무라카미 절제) |

---

## 11. 후속 작업 (이 문서 채택 시)

1. **DEC 신설 검토** — DEC-038 "Item World as Town of Orphaned Shadows" 로 정식 의사결정 등록 검토.
2. **Glossary 업데이트** — `Documents/Terms/Glossary.md` 에 신규 용어 추가:
   - 그림자 마을 (Town of Shadows)
   - 문지기 (Gatekeeper)
   - 사서 (Librarian)
   - 배경 그림자 (Ambient Shadow)
3. **System_ItemWorld_Core.md 통합** — 본 문서의 §2 캐스팅, §5 안전지대를 시스템 명세에 반영.
4. **MemoryResident 엔티티 구현** — `game/src/entities/MemoryResident.ts` (§9.2).
5. **EgoDialogue 라인 추가** — 문지기·사서 First/Familiar 4 세트.
6. **Memory Shard 비주얼 재정의** — `MemoryShardNPC.ts` 색상 + 스프라이트 교체.
7. **플레이테스트 변별 검증** — §4.2 3-신호 룰 인지 테스트.

---

## 12. 레퍼런스

### 1차 자료

- 무라카미 하루키 (1985). 『세계의 끝과 하드보일드 원더랜드』 (世界の終りとハードボイルド・ワンダーランド). Kodansha. [확인함]

### 2차 자료

- [Hard-Boiled Wonderland and the End of the World — Wikipedia](https://en.wikipedia.org/wiki/Hard-Boiled_Wonderland_and_the_End_of_the_World) — 그림자/문지기/사서 기능 정리 [확인함]
- [The City and Its Uncertain Walls by Haruki Murakami — Strange Horizons](https://strangehorizons.com/wordpress/non-fiction/the-city-and-its-uncertain-walls-by-haruki-murakami/) — 벽 메타포, 마음/그림자 분리 [확인함]
- [Hard-Boiled Wonderland — Book Oblivion](https://bookoblivion.com/2018/04/23/hard-boiled-wonderland-and-the-end-of-the-world/) — 일각수·꿈 읽기 메커닉 [확인함]
- [Living is Feeling — Julia Knox (Medium)](https://juliameadk.medium.com/living-is-feeling-haruki-murakamis-hard-boiled-wonderland-and-the-end-of-the-world-260d1a7b0660) — 그림자 = 마음의 자아 표상 [확인함]

### 게임 레퍼런스 [확인함]

- **Transistor (Supergiant, 2014)** — 침묵 주인공(Red) + 말하는 무기 패턴. 검 Ego 의 직접 레퍼런스.
- **Hollow Knight (Team Cherry, 2017)** — Dirtmouth 의 텅빈 마을 인지. 광장 안전지대 약속의 표준.
- **Hades (Supergiant, 2020)** — House of Hades 의 hub 광장 + 소수 인터랙티브 캐릭터 패턴.
- **Disgaea Item World (NIS)** — 아이템 내부 절차적 던전 원형. ECHORIS 가 변주.

### 내부 참조 [확인함]

- DEC-033 — 스파이크 재정의 + 검 Ego 도입
- DEC-036 — Memory Shard 통합 (`memory/wiki/decisions/DEC-036-Memory-Shard-System.md` )
- DEC-037 — Hub-and-Spoke 토폴로지 (`memory/wiki/decisions/DEC-037-Item-World-Topology-AntColony.md` )
- DES-IW-ONB-01 — 첫 아이템계 온보딩 + 검 Ego 화자 (`Documents/Design/Design_ItemWorld_Onboarding_SwordEgo.md` )
- D-12 — 내러티브 원칙 (`Documents/Design/Design_Narrative_Worldbuilding.md` )

---

> **상태:** Confirmed (DEC-038, 2026-04-29). 후속 작업 §11 진행 중.
