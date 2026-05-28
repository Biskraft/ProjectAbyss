# 아이템계 마을 — 그림자들의 거주지 (The Town of Orphaned Shadows)

> **문서 ID:** DES-IW-TOWN-01
> **문서 상태:** Confirmed (DEC-038, 2026-04-29 / sci-fi 메타포 재정렬 2026-04-30 / DEC-039 수직 딥 다이브 통합 2026-05-02)
> **작성일:** 2026-04-29 (개정 2026-04-30, 2026-05-02)
> **결정 등재:** `memory/wiki/decisions/DEC-038-Town-of-Orphaned-Shadows.md` (마을 메타포), `memory/wiki/decisions/DEC-039-Item-World-Continuous-Dive.md` (그래프 토폴로지)
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
> - `game/src/entities/MemoryShardNPC.ts` — Forgotten Shard (그림자 형태로 재정의)
> - `game/src/entities/MemoryResident.ts` — 거주자 엔티티 (Gatekeeper / Archivist / ambient)

---

## 0. 의사결정 요약

### 한 줄 정의

> **아이템계의 마을은, 빌더가 떠난 거대 공동에 잔류한 그림자 신호의 거주지다.**
> 무기는 한 자아의 잔재이며, 그 자아를 운영하던 빌더와 거주자는 모두 떠났다. 그러나 그들의 인간형 신호만 자동화된 보존 공간에 남아 자기 주인을 잊은 채 거주한다. 검 Ego(Rustborn) 는 그중 자아를 보존한 유일한 신호다. 에르다는 살아있는 자, 그림자 없는 자로 그 공동에 들어선다.

### 메타포 이중 프레임

ECHORIS 의 마을은 **두 개의 메타포가 겹친 풍경**이다.

| 레이어 | 메타포 | 담당 |
| :--- | :--- | :--- |
| **시각·공간** (아트 디렉션 1차) | BLAME! / 메가스트럭처 / 자동화 보존소 — 빌더가 떠난 거대 공동, 잔류 신호로서의 인간형 그림자 | 환경/엔티티 시각, 메모리 코어 메커닉 |
| **서사·형이상학** (배후 깊이) | 무라카미 『세계의 끝과 하드보일드 원더랜드』 — 마음을 잃은 거주자, 단독 화자 그림자 | 인물 관계, 침묵 룰, 정서 톤 |

두 메타포는 충돌하지 않는다 — 둘 다 "주인이 떠난 곳에 인간형 잔류물이 머문다" 는 같은 구조를 공유한다. ECHORIS 는 BLAME! 의 시각으로 무라카미의 정서를 운반한다.

### 채택 근거

| 근거 | 출처 |
| :--- | :--- |
| 스파이크 ("아이템에 들어가면, 그 안에 살아있는 세계가 있다") 의 강력한 시각·서사 봉합 | DEC-033 |
| 검 Ego 단독 화자 원칙 (에르다 과묵·Transistor Red 패턴) 의 형이상학적 정당화 | DES-IW-ONB-01 |
| Memory Shard 의 Forgotten/Recalled 시각 통일 — DEC-036 의 자연 봉합 | DEC-036 |
| RoomGraph 의 Hub(Plaza) + Branch(Lane) 구조가 거대 공동의 보존 토폴로지와 1:1 정합 | DEC-037 |
| BLAME! / 메가스트럭처 시각 — 빌더 부재의 거대 공동, 자동화 보존소, 데이터 노드의 시안 광점 | 弐瓶勉 (1997, 講談社) [확인함] |
| 무라카미 『세계의 끝과 하드보일드 원더랜드』 의 단독 화자 그림자·마음 잃은 거주자 정서 | 무라카미 (1985, Kodansha) [확인함] |
| 1인 개발 부담 감소 — 모든 비-플레이어 = 그림자 단일 시각 언어 | 본 문서 §9 |

### 폐기 / 도입

| 구분 | 폐기 (이전 검토) | 도입 (본 문서) |
| :--- | :--- | :--- |
| Plaza 거주자 | 인간형 NPC 다수 (활기찬 마을) | **그림자 2명 + 배경 그림자 ≈20** (텅빈 거주지) |
| Resident (영감/Caretaker) | 무기별 고유 NPC | **제거 확정** (총원 절제 룰 유지) |
| 화자 다중화 | 거주자 dialogue 1줄씩 | **거주자 dialogue 0줄. 검 Ego 단독 화자.** |
| Memory Shard 시각 | 노란 큐브 (#ffdd44) | **검은 그림자 + 노란 눈빛 1점** (Forgotten 표식) |
| Boss 시각 | 일반 인간형 | **거대 일그러진 그림자** (그림자의 극단형) |
| Shrine 거주자 메타포 | 사서(Librarian) + 두개골(Skull) — 무라카미 단일 | **아카이비스트(Archivist) + 메모리 코어(Memory Core)** — BLAME! sci-fi 시각 + 무라카미 정서 |

---

## 1. 메타포 — BLAME! 메가스트럭처 × 무라카미 그림자 마을

### 1.1 BLAME! / 메가스트럭처 [확인함]

弐瓶勉의 BLAME! 세계는 빌더(자동화 건설 기계) 가 정지를 잊은 채 무한히 증식한 거대 공동(Megastructure) 이다. 인류는 떠났거나 멸절했고, 자동화된 보존소·데이터 노드·인간형 흔적만 잔류한다. 거주는 거의 없고, 가끔 시안 광점이 박힌 단자나 데이터 큐브가 정적인 풍경 속에서 동기화 펄스를 발한다. 인간형 그림자는 외형만 인간이며, 자아는 휘발됐다. ([Wikipedia](https://en.wikipedia.org/wiki/Blame!) )

### 1.2 무라카미 마을 [확인함]

무라카미의 마을은 거주자가 마음/그림자를 잃은 곳이다. 거주자는 외형적으로 평범하지만 내면이 비어있다. 마을 내부에는 단 하나의 그림자만 존재한다 — 주인공이 마을 입구에서 분리당한 자신의 그림자. 그림자는 문지기에게 갇혀 강제 노역을 하며, 마을 외부 세계의 기억을 유일하게 보존한다. 거주자는 마음 없는 채 도서관·광장·집을 지킨다. ([Wikipedia](https://en.wikipedia.org/wiki/Hard-Boiled_Wonderland_and_the_End_of_the_World) , [Strange Horizons](https://strangehorizons.com/wordpress/non-fiction/the-city-and-its-uncertain-walls-by-haruki-murakami/) )

### 1.3 ECHORIS 합성 [추측임]

ECHORIS 의 아이템계 마을은 두 메타포를 한 풍경에 겹친다. **시각·메커닉은 BLAME! — 빌더가 떠난 거대 공동·자동화 보존소·시안 데이터 노드·잔류 신호로서의 인간형 그림자**. **인물 관계와 정서는 무라카미 — 단독 화자 그림자(검 Ego), 침묵하는 거주자, 마음을 잃은 자들의 거주지**.

이 합성의 이점:

1. **형이상학적 일관성** — 무기 안에 살아있는 사람이 있는 것은 부자연스럽지만, "빌더가 떠난 거대 공동에 인간형 신호만 잔류한다" 는 자연스럽다. 무기 = 자동화된 그림자 보존소.
2. **시각 통일** — 모든 비-플레이어 = 검은 실루엣 + 청록 단자/광점. BLAME! 데이터 노드의 단일 시각 언어.
3. **DEC-036 봉합** — Memory Shard 는 잔류한 데이터 결정체. Forgotten = 노란 눈빛(오류 신호), Recalled = 시안 동기화(정상 신호) 가 시각적으로 자명해진다.
4. **검 Ego 단독 화자 정당화** — 잔류 신호는 보통 자아를 보존하지 못하지만, 검 Ego 는 자아 데이터가 손상 없이 잔류한 유일한 신호라 말한다. 다른 거주자는 침묵.

### 1.4 캐스트 매핑 [확인함] / [추측임]

| 메타포 원형 [확인함] | 원형 기능 | ECHORIS 매핑 [추측임] | 그래프 위치 |
| :--- | :--- | :--- | :--- |
| 그림자 (무라카미) / 자아 데이터 잔류 신호 (BLAME!) | 분리된 자아·외부 기억 보존 | **검 Ego (Rustborn)** | 화면 외 / 음성 |
| 나 (Boku) — 꿈을 읽는 자 (무라카미) / 침입자 (BLAME! 키리이) | 침묵에 가까운 단독 화자 | **에르다** | 플레이어 캐릭터 |
| 문지기 (무라카미) / 자동화 경비 단자 (BLAME!) | 거대한 침묵의 보초·입구 관리·도구 정비 | **광장의 문지기 (Gatekeeper) 그림자** | Plaza (hub) |
| 사서 (무라카미) / 데이터 보존소 큐레이터 (BLAME!) | 마음 없는 채 보존소 운영. 데이터에서 옛 신호를 꺼냄. | **Archive 의 아카이비스트 (Archivist) 그림자** | Archive (shrine) |
| 일각수 (무라카미) / 손상된 데이터 결정체 (BLAME!) | 거주자의 마음 잔재·자동 보존소를 떠도는 신호 | **Memory Shard NPC (Forgotten)** | Spoke (lane) |
| 마을 거주자 (무라카미) / 인간형 잔류 그림자 (BLAME!) | 마음·자아 없는 인간 외형. 평범한 일상의 반복. | **배경 그림자 (Plaza ambient)** | Plaza 가장자리 |
| 벽 (무라카미) / 메가스트럭처 외피 (BLAME!) | 외부 분리·모양 변화·봉쇄 | **아이템계의 경계** (= 무기 외피) | Stratum 경계 |

특히 아카이비스트·메모리 코어 메커닉은 ECHORIS 의 Memory Shard 슬롯 시스템과 **메커니즘까지 일치**한다. 무라카미의 사서가 두개골에서 꿈을 꺼내듯, BLAME! 의 보존소 큐레이터가 데이터 큐브를 동기화하듯, ECHORIS 의 아카이비스트는 Recalled Shard 가 슬롯에 장착될 때 메모리 코어를 한 번 펄스시킨다. 이는 §6 에서 상세화한다.

---

## 2. 캐스팅 — 총원 ≤ 2 인터랙티브 + 3~5 배경

마을 인지의 핵심은 **거의 아무도 없다**는 점이다. 무라카미 마을과 BLAME! 메가스트럭처 둘 다 군중이 0 인데도 거주지로 읽힌다 — 잔류 신호가 곳곳에 박혀있기 때문. 이 절제가 ECHORIS 의 절차적 그래프 + 1인 개발 + 검 Ego 단독 화자 제약과 정확히 부합한다.

### 2.1 인터랙티브 그림자 (검 Ego 발화 대상)

| 인물 | 위치 | 시각 신호 | idle 동작 | 첫 만남 트리거 |
| :--- | :--- | :--- | :--- | :--- |
| 문지기 (Gatekeeper) | Plaza (hub, 지층 top) 중앙 인근 | 청록 #4cd6c1 외곽 그림자, 봉/창 | 정면 응시, 호흡 | proximity ≈ 80px |
| 아카이비스트 (Archivist) | Archive (shrine, critical path 외 분기 가지 끝) 중앙 | 청록 외곽 그림자, **메모리 코어(데이터 큐브) 양손** | 굽은 자세로 코어 응시, 시안 #88f0e0 광점 미세 떨림 | proximity ≈ 80px |

> **DEC-039 통합 (2026-05-02):** Plaza = 지층 top, Boss = 지층 bottom 의 수직 그래프로 재정의되었다. Archive(shrine) 는 Plaza 와 *분리된 분기 가지 끝* 에 배치되어 옵션 안전지대로 기능한다 (Plaza 흡수 X). 플레이어는 다이브 중 LR 분기로 Archive 를 발견. Plaza 만 천장 파괴 LRD, Archive 는 일반 안전지대 출구 룰 (§5.4).

**룰:**
- 인터랙티브 그림자는 **모든 무기에서 등장**. 결정론적 spawn (itemUid 시드).
- 거주자 자체는 dialogue 0 줄. proximity 트리거 시 **검 Ego(Rustborn) 가 거주자에 대해 말한다**.
- 발화 단계는 무기의 누적 Recalled 비율로 분기 (§3).

### 2.2 배경 그림자 (Plaza Ambient)

광장 가장자리에 결정론적 spawn (itemUid 시드) 으로 배치되는 **다수의 정적 그림자** (1차 구현 ≈ 20명, 적당한 겹침 허용).

| 속성 | 값 |
| :--- | :--- |
| 외곽선 | 없음 (페이드 그림자) |
| 광원 | 없음 |
| idle 동작 | 호흡 1Hz, 미세 흔들림 ±0.5px (개체별 phase 분산) |
| 인터랙션 | 없음 (충돌은 push-aside 만) |
| 위치 | Plaza 룸의 모서리·계단·벽 인근 결정론 슬롯 (wrap + jitter) |
| 인원 | 1차 구현 약 20명, 적당한 겹침 허용 (§2.3) |

배경 그림자는 화자도, 적도, 기능도 아니다. **거주지라는 인지** 만 책임진다. BLAME! 메가스트럭처의 공동이 텅비어 보이지 않는 이유 — 잔류 인간형 신호가 정적인 풍경 속에 박혀있기 때문 — 을 그대로 옮긴다.

### 2.3 무기별 인원 변주 (선택)

배경 그림자 인원 수를 무기 상태로 가변할 수 있다.

| 무기 상태 | 배경 그림자 인원 | 의미 |
| :--- | :---: | :--- |
| Pristine (모든 슬롯 Recalled) | 24 | 잔류 신호가 가장 또렷 |
| Mid (일부 Recalled) | 20 | (현재 1차 구현 기준치) |
| Rusted (모든 슬롯 Forgotten) | 16 | 잔류 신호가 가장 흐릿 |

이는 **선택 기능**. 1차 구현은 결정론 20명 고정. 변주는 폴리시 단계에서 적용.

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

[Player approaches Archivist at Archive]
[Archivist does not speak. Idle anim: 메모리 코어를 양손에 든 채 굽어본다.]
Rustborn: "코어 단자가 살아있다. 빌더가 떠나도 보존소는 돈다."
Rustborn: "이 자가 옛 신호를 한 조각씩 다시 동기화한다."
Rustborn: "...우리도 그 신호 중 하나야."
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
| 아카이비스트 | 굽은, 메모리 코어 양손 | 청록 #4cd6c1 | **시안 #88f0e0 코어 광점** | 코어 응시·미세 떨림 | 청록 외곽 + 시안 광점 |
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
4. 아카이비스트 동기화: Archive 의 아카이비스트가 메모리 코어를 한 번 강하게 펄스시킴 — 시안 광점 alpha 1.0→1.8, scale 1→1.6, 600ms 감쇠 (idle 1회 인터럽트)
```

**메커닉 신규 X.** 기존 슬롯 장착 트리거에 `MemoryResident.pulseCore()` 호출 1줄만 추가.

### 4.4 보스 — 거대 일그러진 그림자

원작에 직접 대응되는 거대 그림자는 없으나, ECHORIS 의 보스는 그림자 통일을 유지하면서도 변별이 필요하다.

**옵션 A (권장):** 보스 = 거대 일그러진 그림자 (Memory Shard 의 확장). 시각 통일 완벽. BLAME! 의 "메가스트럭처 깊이에 응축된 거대 잔류 신호" + 무라카미의 "마을의 가장 큰 그림자 = 무기의 핵심 기억".

**옵션 B:** 보스 = 그림자가 일부 빛을 되찾은 반(半)형태. 시각 위계 강화. 통일성 약화.

**옵션 A 권장.** 두 메타포의 봉합 일관성이 ECHORIS 의 가장 강한 시각 자산이 된다.

---

## 5. 광장 안전지대 약속

### 5.1 룰

**Plaza (hub) 룸에서는 적이 spawn 되지 않는다.** Forgotten Shard(MemoryShardNPC) 는 Spoke (lane) 룸에만 spawn.

이는 두 메타포의 공통 룰과 직결한다 — 무라카미 마을의 "위험은 마을 밖", BLAME! 메가스트럭처의 "보존소 단자는 보호된 정적 영역". Plaza 안은 침묵·중립.

### 5.2 정당화

검 Ego 의 1줄로 인지 봉합:

```
Rustborn: "여긴 광장이야. 그림자들이 모이는 자리. 여기선 아무도 못 다쳐."
```

### 5.3 Archive 도 안전?

Archive (shrine) 도 인터랙티브 그림자(아카이비스트) 가 있는 안전지대. **적 spawn 0**.

따라서 적 spawn 가능 룸은 **Spoke 와 Boss 만**. Plaza·Archive 는 안전.

### 5.4 룸 출구 룰 (DEC-039 통합)

DEC-039 (수직 딥 다이브 그래프) 채택으로 룸 prefab 출구 패턴이 다음과 같이 고정된다:

| 룸 | 그래프 위치 | 출구 패턴 | 사유 |
|:---|:---|:---:|:---|
| Plaza (hub) | 지층 top | **LRD only** | 위(U) 출구 없음. *천장이 파괴된 상태* — 위에서 떨어져 들어온 다이브 진입의 흔적 |
| Archive (shrine) | critical path 외 분기 가지 끝 (옵션) | LRDU 자유 | Plaza 와 분리된 옵션 안전지대. 천장 파괴 시각 X. 일반 룸 출구 룰 적용. 적 spawn 0 (§5.3) |
| Boss | 지층 bottom | **LRU + 처치 후 D** | 처치 *후* 바닥 Trapdoor 포탈 활성. 공격 키 입력 시 바닥 물리 붕괴 |
| 일반 (Combat / Treasure / Rest / Puzzle / Corridor) | critical path 또는 분기 | LRDU 자유 | critical path 는 D 우선, 분기는 LR |

이 출구 룰은 LDtk Plaza/Boss prefab 에서 강제. RoomGraph 생성 시 hub 노드 = top, boss 노드 = bottom, shrine 노드 = 분기 가지 끝으로 배치되어 critical path 가 수직 (Plaza→Boss) 으로 형성된다. 자세한 내용은 DEC-039 (`memory/wiki/decisions/DEC-039-Item-World-Continuous-Dive.md`) 및 DES-IW-DIVE-01 §5 안 D 참조.

---

## 6. 메커닉 봉합 — Memory Shard ↔ 아카이비스트 / 메모리 코어

### 6.1 두 원작 메커닉 [확인함]

| 원형 | 메커닉 |
| :--- | :--- |
| 무라카미 사서 | 일각수 두개골을 양손에 얹고 옛 꿈을 읽음. 두개골 = 마음의 보존소. 사서는 마음 없는 자이지만 두개골을 통해 옛 꿈을 매개. |
| BLAME! 보존소 큐레이터 | 자동화된 데이터 보존소에서 데이터 큐브를 동기화. 시안 광점 단자가 펄스하며 옛 신호를 정상화. |

두 원형은 같은 구조다 — **마음 없는 매개자가 데이터/꿈의 보존소를 운영한다**.

### 6.2 ECHORIS 매핑 [추측임]

ECHORIS 의 Memory Shard 시스템 (DEC-036) 이 이 메커닉과 메커니즘까지 일치한다.

| 원형 [확인함] | ECHORIS 매핑 [추측임] |
| :--- | :--- |
| 두개골 / 손상된 데이터 큐브 | Forgotten Memory Shard |
| 두개골에서 꿈 읽기 / 큐브 동기화 | Shard 격파 → Recalled 전환 |
| 사서·큐레이터의 일과 보존 작업 | Archive 의 아카이비스트가 슬롯 장착 시 메모리 코어 1회 펄스 |
| 처리된 두개골/큐브는 보존소에 남음 | Recalled Shard 는 무기에 영구 장착 |

### 6.3 자연 봉합

플레이어가 Memory Shard 를 격파 → Recalled 상태로 전환 → 슬롯에 장착 → 아카이비스트가 메모리 코어를 한 번 강하게 펄스시킴. 이 동선이 무라카미의 도서관 일과 + BLAME! 의 데이터 동기화를 동시에 재현한다.

**시스템 신규 0.** 기존 슬롯 장착 흐름에 `MemoryResident.pulseCore()` 호출 1줄.

---

## 7. 에르다의 위치 — 살아있는 자, 그림자 없는 자

### 7.1 형이상학

이 변주에서 에르다는 **유일하게 살아있는 자**, 따라서 **유일하게 그림자가 있어야 하는 자**다. 그러나 그녀의 그림자는 무기 안에 잠들어 있었다.

> 무기를 잡는 순간 그림자가 깨어난다 — 그것이 Rustborn(검 Ego) 이다. 그녀는 자기 그림자의 목소리만 들으며 그림자들의 마을을 걷는다.

### 7.2 Erda 침묵의 새 의미

DES-IW-ONB-01 의 "에르다 0줄" 원칙이 이 변주에서 **심화**된다.

| 기존 정당화 | 새 정당화 |
| :--- | :--- |
| Transistor Red 패턴 | + 살아있는 자는 잔류 신호들의 거주지에서 침묵해야 한다 |
| 행동으로 답한다 | + 그녀의 목소리는 검 Ego 가 대신 한다 (= 그녀의 그림자/잔류 자아 신호) |

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

**회피:** §2.2 의 배경 그림자 ≈20명 + §3.2 의 검 Ego 1줄 ("여긴 광장이야. 그림자들이 모이는 자리.") 로 의도성 명시.

### 8.3 메타포 미해독 (P3)

**위험:** BLAME! 도 무라카미도 모르는 플레이어는 메타포의 깊이를 못 본다.

**회피:** **메타포는 인지의 보조이지 게이트가 아니다.** 그림자 마을은 시각·음향·메커닉만으로도 작동한다 — 거대 공동, 청록 단자, 잔류 인간형. 두 메타포 중 하나라도 알면 한 층 더 깊이 본다 — 보너스 레이어.

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
| District 매퍼 (Plaza/Archive/Lane/Sanctum) | ✅ | `itemWorldDistricts.ts` (A안 1차) |
| Memory Shard 시스템 (Forgotten/Recalled) | ✅ | DEC-036 |
| 패시브 NPC 엔티티 (`MemoryResident.ts`) | ✅ | gatekeeper / archivist / ambient 3종 + pulseCore() |
| Spawn 분기 (Plaza/Archive 거주자 + 20 ambient) | ✅ | ItemWorldScene.spawnEnemiesInRoom |
| 대사 4 세트 (Gatekeeper / Archivist × First/Familiar) | ✅ | `EgoDialogue.ts` 추가 12줄 |
| Proximity 트리거 (egoFlags + egoUnlockedEvents) | ✅ | ItemWorldScene.updateResidentEgoTriggers |

### 9.2 잔여 작업

| 항목 | 분량 | 비고 |
| :--- | :---: | :--- |
| 그림자 스프라이트 (망령 실루엣 2 종) | 폴리시 | PixelLab MCP — placeholder Graphics 교체 |
| Memory Shard 비주얼 재정의 | 스프라이트 1 종 | 노란 큐브 → 검은 그림자 + 노란 눈빛 |
| 아카이비스트 코어 idle 동기화 wiring | ~10 line | 슬롯 장착 → `pulseCore()` 호출 |

**1차 구현은 완료.** 잔여는 폴리시 단계 작업.

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
| Plaza NPC 다수 인간형 | ❌ | ✅ 그림자 2 인터랙티브 + ≈20 배경 (적당한 겹침) |
| Caretaker (영감) | ❌ | ✅ 제거 |
| 거주자 dialogue | ❌ | ✅ 검 Ego 단독 화자 |
| Memory Shard 노란 큐브 | ❌ | ✅ 검은 그림자 + 노란 눈빛 |
| 보스 인간형 | ❌ | ✅ 거대 일그러진 그림자 |
| Plaza/Archive 적 spawn | ❌ | ✅ 안전지대 약속 |
| 활기찬 마을 분위기 | ❌ | ✅ 텅빈 거주지 (BLAME! 절제 + 무라카미 침묵) |
| Librarian (사서) + 두개골 (Skull) | ❌ | ✅ Archivist + 메모리 코어 (BLAME! sci-fi 메타포로 재정렬) |
| Memorial 디스트릭트 명 | ❌ | ✅ Archive (보존소) — sci-fi 톤 정합 |
| 단일 무라카미 메타포 | ❌ | ✅ BLAME!(시각·메커닉) × 무라카미(정서·관계) 이중 프레임 |

---

## 11. 후속 작업

1. ~~**DEC 신설 검토**~~ — DEC-038 "Town of Orphaned Shadows" 정식 등재 완료 (`memory/wiki/decisions/DEC-038-Town-of-Orphaned-Shadows.md` ).
2. **Glossary 업데이트** — `Documents/Terms/Glossary.md` 에 신규 용어 추가:
   - 그림자 마을 (Town of Shadows)
   - 문지기 (Gatekeeper)
   - 아카이비스트 (Archivist)
   - 메모리 코어 (Memory Core)
   - 배경 그림자 (Ambient Shadow)
3. **System_ItemWorld_Core.md 통합** — 본 문서의 §2 캐스팅, §5 안전지대를 시스템 명세에 반영.
4. ~~**MemoryResident 엔티티 구현**~~ — 완료. `game/src/entities/MemoryResident.ts` .
5. ~~**EgoDialogue 라인 추가**~~ — 완료. Gatekeeper/Archivist × First/Familiar 12줄.
6. **Memory Shard 비주얼 재정의** — `MemoryShardNPC.ts` 색상 + 스프라이트 교체.
7. **아카이비스트 코어 동기화 wiring** — Recalled Shard 슬롯 장착 시 `pulseCore()` 호출.
8. **플레이테스트 변별 검증** — §4.2 3-신호 룰 인지 테스트.
9. **District 명 마이그레이션 검토** — `itemWorldDistricts.ts` 의 Memorial → Archive 리네임 (선택).
10. **DEC-039 수직 딥 다이브 통합 (2026-05-02 신규):**
    - Plaza 룸 prefab U 출구 제거 + 천장 파괴 시각 적용 (LDtk)
    - Archive 룸을 Plaza 인접 LR 1보로 재배치 (RoomGraph 알고리즘)
    - Boss 룸 prefab D 출구를 Trapdoor 포탈 entity 로 교체 (LDtk + 인터랙트 핸들러)
    - 자세한 영향 범위는 DEC-039 §영향 참조

---

## 12. 레퍼런스

### 1차 자료

- 弐瓶勉 (1997~2003). 『BLAME!』. 講談社 アフタヌーンKC 전 10권. [확인함]
- 무라카미 하루키 (1985). 『세계의 끝과 하드보일드 원더랜드』 (世界の終りとハードボイルド・ワンダーランド). Kodansha. [확인함]

### 2차 자료

- [Blame! — Wikipedia](https://en.wikipedia.org/wiki/Blame!) — 메가스트럭처·빌더·자동화 보존소 세계관 [확인함]
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

> **상태:** Confirmed (DEC-038, 2026-04-29). sci-fi/BLAME! 메타포 재정렬 (2026-04-30) — Librarian/Skull → Archivist/Memory Core. 1차 구현 완료, 잔여는 폴리시 (§9.2, §11).
