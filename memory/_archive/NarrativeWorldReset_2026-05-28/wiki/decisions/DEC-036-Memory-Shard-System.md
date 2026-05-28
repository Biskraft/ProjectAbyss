# DEC-036: 이노센트 폐기 + 기억 단편 시스템 도입

> 결정일: 2026-04-28
> 상태: 확정 (Confirmed)
> 영향 범위: 시스템 전반 (Documents/, Sheets/, game/src/, 모든 GDD)

---

## 결정 사항

이노센트 시스템을 전면 폐기하고, 인사이드 아웃의 기억 모델을 척추로 한 **기억 단편 시스템 (Memory Shard System)** 으로 통합한다.

검 Ego(DEC-033)와 이노센트가 모두 "아이템 안에 거주하는 존재"라는 컨셉 중복을 가지고 있었으며, 통합을 통해 스파이크 "아이템에 들어가면, 그 안에 살아있는 세계가 있다 / 나만의 무기를 만든다"를 강화한다.

---

## 핵심 모델 — 인사이드 아웃 매핑

| 인사이드 아웃 | ECHORIS |
|:---|:---|
| 라일리 (호스트) | 무기 |
| 본부의 감정들 | 검 Ego (그 무기의 인격, 단일 화자) |
| 일반 기억 구슬 | **기억 단편 (Memory Shard)** |
| 핵심 기억 (금색 구슬) | **핵심 기억 (Core Memory)** |
| 성격 섬 (Personality Islands) | **정체성 결 (Identity Trait)** |
| 장기 기억 선반 | 기억의 지층 내부 |
| 감정의 색 | **Ego 기질색** (Forge/Iron/Rust/Spark/Shadow) |
| 슬픔이 기쁨 기억을 재채색 | **전이 시 효과 변이** |

---

## 1. 위계 구조 (2-Tier)

### 기억 단편 (Memory Shard)
- 일반 단편. 지층 내 몹/체스트에서 획득
- 단일 효과(스탯·행동·원소). 자유롭게 다른 무기로 전이 가능
- 전이 시 *수신 Ego의 기질색에 따라 효과 변이* (수치 + 이름 + 효과 종류)

### 핵심 기억 (Core Memory)
- 지층 보스 처치 시 100% 드롭 (1개)
- 그 무기의 *정체성 결*을 가동시키는 영혼 단편
- 정체성 슬롯에만 장착. **전이 시 정체성 결이 붕괴**(중대한 결정)

### 정체성 결 (Identity Trait)
- 핵심 기억이 가동시키는 무기의 본질적 성격 한 면
- 무기의 코어 인격은 *결의 합*으로 정의
- 결을 붕괴시키면 그 무기다움이 사라짐

---

## 2. 5색 기질 (Temperament)

| 색 | 한글명 | 기질 | ECHORIS 매핑 |
|:---|:---|:---|:---|
| Forge | 단조 | 분노·열정·공격성 | 주황 — Gladiator/Berserker/Burner 계열 |
| Iron | 강철 | 결연함·냉정 | 청록 — Ironclad/Freezer 계열 |
| Rust | 부식 | 비통·체념·세월 | 회색 — Vampire/Leech/Dietician 계열 |
| Spark | 섬광 | 호기심·경이 | 흰빛 — Tutor/Sprinter/Shocker 계열 |
| Shadow | 그림자 | 의심·교활·은밀 | 자주 — Ghost 계열 |

각 무기 Ego는 *주색 1 + 부색 1*을 가짐. 핸드크래프트 무기(Rustborn 등)는 고정 색 조합. 절차 드롭 무기는 시드 결정.

---

## 3. 슬롯 모델

총 슬롯 수는 기존 레어리티별 카운트 보존. 내부를 *정체성 슬롯* + *기억 슬롯*으로 분할.

| 레어리티 | 정체성 슬롯 (Core 전용) | 기억 슬롯 (자유) | 합계 |
|:---|:---:|:---:|:---:|
| Normal | 2 | 0 | 2 |
| Magic | 3 | 0 | 3 |
| Rare | 3 | 1 | 4 |
| Legendary | 4 | 2 | 6 |
| Ancient | 5 (4 + 심연) | 3 | 8 |

- 정체성 슬롯 = 그 무기의 지층 수와 일치. 보스 처치로 1대1 매칭
- 기억 슬롯은 *Active / Passive* 두 역할 중 하나로 끼움
  - Active: 전투 중 발현 효과
  - Passive: 상시 효과
- 같은 단편이 어느 역할에 들어가느냐에 따라 다른 효과 발현

---

## 4. 상태 모델

| 상태 | 한글명 | 설명 |
|:---|:---|:---|
| Forgotten | 잊혀진 | 지층에 적 NPC로 출현. 50% 효과 |
| Recalled | 회상된 | Ego가 받아들임. 100% 효과, 전이 가능 |

격파 = **회상 (Recall)** — 잊혀진 기억을 Ego가 되찾는 행위.

---

## 5. 전이 시 효과 변이

전이는 모루(Anvil)에서 수행. 원본 단편 소모.

수신 Ego의 *기질색*에 따라 단편이 3축에서 변형:

1. **수치 변동** — 효과 강도 ±
2. **이름 변형** — 단편 이름 재명명 (예: "분노의 단편" → 차분한 Iron Ego 손에서 "삭여낸 분노")
3. **효과 종류 변이** — 효과 카테고리 자체 변환 (불 → 연기, 빛 → 그림자 등)

핵심 기억은 전이 시 정체성 결이 붕괴. 무거운 결정.

---

## 6. 획득 채널 — 아이템계 한정

- 일반 단편: 기억의 지층 내 몹/체스트/시크릿
- 핵심 기억: 지층 보스 100% 드롭
- 월드 상점 / 필드 NPC / 일반 적은 단편을 주지 않음 — 스파이크 정합

---

## 7. 폐기되는 것 (재도입 금지)

- 단편 직접 발화 (화자는 Ego 단 1명)
- 단편 거래 시장
- 무기 외 사용처
- 단편 분신·복제
- Upgrade 슬롯 (Transistor 3-역할 중 가운데 층 미도입)
- 자동 일괄 흡수
- 인사이드 아웃의 기차/추상사고/꿈 제작소 같은 부속 영역

---

## 8. 보존되는 메커닉 (이름만 변경)

- 합성 (Bond) — 같은 색·종류 단편 결합으로 레벨 상승
- 분해 — Tamed 단편 → Remnant Fragment (레어리티 승급 재료)
- 소프트 캡 / 하드 캡 / 스태킹 규칙
- 기본형/행동형/원소형 분류 (5색에 재분포)
- No.1 (서사 단편) — 색 무관, 에코 부착, 슬롯 비용 없음

---

## 영향 범위 (변경 대상)

- **Documents/** 전체 GDD (System_, Design_, UI_, Content_, Plan_, Terms_, Research_, Feedback_)
- **Sheets/** Content_Innocents.csv → Content_MemoryShards.csv
- **game/src/** innocents.ts → memoryShards.ts, 관련 코드
- **CLAUDE.md** 용어 사전
- **Reference/게임 기획 개요.md** 핵심 시스템 요약
- **README.md / mkdocs.yml / website / presentation**

전수조사 결과 약 150여 개 ECHORIS-내부 파일이 변경 대상.
Reference/disgaea-wiki-md/, castlevania-wiki-md/, gdc/, gmtk/ 등 외부 위키·트랜스크립트는 *원전*이므로 변경 제외.

---

## 인용 근거

조사 레퍼런스 5선 (이전 세션 종합):
1. Inside Out (Pixar) — 기억의 색·핵심 기억·성격 섬 모델
2. Transistor (Supergiant) — 검이 영혼/Trace를 흡수, Function 슬롯 빌드
3. NieR: Automata — 무기 사용으로 4단계 Weapon Story 점진 해금
4. Sekiro — 보스 Memory 아이템, 흡수 후 Remnant 보존
5. Dark Souls 3 — Soul Transposition (보스 영혼 → 다양한 출력 변환)

---

## 결정 사슬

- DEC-033 (검 Ego) ← 본 결정의 전제
- DEC-034 (빌더=World Texture) ← 분리된 시스템
- DEC-035 (UI 키컬러 orange + 2-Tier intensity) ← UI 토큰
- **DEC-036 (Memory Shard System)** ← 본 결정
