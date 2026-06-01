# 장비 복원 경로 시스템 (Equipment Recovery Path System) — SYS-EQP-03

> **준거 상위 (Authority):** T-03, D-11
> **2026-05-24 전면 재작성 (DEC-046).** 이전 버전의 *아이템 레벨 0-99 / 보스 처치 영구 ATK +N / 레어리티 승급 (피티 시스템)* 메커닉은 모두 폐기되었다. 장비 성장은 *강화* 가 아니라 *기억 복원* 으로 재정의되었다.

## 구현 현황 (Implementation Status)

> **최근 업데이트:** 2026-05-24
> **문서 상태:** `재설계 완료 (DEC-046 반영)`
> **2-Space:** Item World (주), World (부)
> **기둥:** 야리코미 (주), 메트로베니아 탐험 (부)

| 기능 ID   | 분류     | 기능명 (Feature Name)                       | 우선순위 | 구현 상태    | 비고 (Notes)                                              |
| :-------- | :------- | :------------------------------------------ | :------: | :----------- | :-------------------------------------------------------- |
| EGP-01-A  | 게이지   | Memory Recovery % (0-100)                   |    P0    | 대기         | 아이템 레벨 시스템 폐기. SYS-MEM-01 §2.1 SSoT             |
| EGP-02-A  | 진행     | 보스 처치 → Memory Fragment 해금 + Recovery 점프 |    P0 | 대기         | 영구 ATK +N 폐기. SYS-MEM-01 §2.3                         |
| EGP-02-B  | 진행     | 일반 활동 → Recovery 점진 누적              |    P0    | 대기         | 0.1-1% 누적, 다음 보스까지 게이지                         |
| EGP-03-A  | effective stat | Recovery 기반 스탯 자동 산정          |    P0    | 대기         | `effectiveStat = baseStat × (0.4 + Recovery × 0.006) × rarityMultiplier` |
| EGP-04-A  | 이름     | Stage별 이름 진화 (Name Evolution)          |    P0    | 대기         | nameStage0-4 5단계                                        |
| EGP-05-A  | 컬렉션   | Identity Archive 인물 아카이브               |    P0    | 대기         | 무기 컬렉션과 별도. 인물 단위 진행도                      |
| EGP-06-A  | 재방문   | Re-Dive (100% 복원 후 재진입)               |    P1    | 대기         | 다른 해석의 Fragment + effective stat +5% per 회차        |
| EGP-07-A  | UI       | Recovery 게이지 + Fragment 컬렉션 UI         |    P0    | 대기         | UI_Inventory §3.5 / UI_Identity_Archive 신규              |

> **폐기 항목 (구 EGP):** EGP-01 아이템 레벨, EGP-02 EXP 수급, EGP-03 레어리티 승급(피티), EGP-04 기억 단편 슬롯 추가(보스 보상), EGP-06 심연 진화 1-3단계.

---

## 0. 필수 참고 자료 (Mandatory References)

* DEC-046 (시스템 결정): `memory/wiki/decisions/DEC-046.md`
* Writing Standards: `Documents/Terms/GDD_Writing_Rules.md`
* Project Vision: `Documents/Terms/Project_Vision_Abyss.md`
* Glossary: `Documents/Terms/Glossary.md`
* 레어리티 시스템: `Documents/System/System_Equipment_Rarity.md` (SYS-EQP-01)
* 장비 슬롯 시스템: `Documents/System/System_Equipment_Slots.md` (SYS-EQP-02)
* 아이템계 코어: `Documents/System/System_ItemWorld_Core.md` (SYS-IW-01)
* 기억 복원 코어: `Documents/System/System_Memory_Core.md` (SYS-MEM-01) — *진행 메커닉 SSoT*
* 측량사의 에코 쐐기 기준 예시: `Documents/Content/Content_Item_Narrative_SurveyorEchoWedge.md`

---

## 1. 개요 (Concept)

### 1.1. 설계 의도 (Intent)

> **"이 무기를 한 번 더 두드리면 다음 단계로 올라간다"** 는 *강화의 언어* 다.
> **"이 사람의 다음 페이지를 보면 또 한 면이 드러난다"** 는 *복원의 언어* 다.

ECHORIS의 장비는 *드랍된 잠재력의 씨앗* 이 아니라 *처음부터 완성된 한 사람의 인생* 이다. 단, 그 인생은 100년 전에 끝났고, 기억은 흩어져 있다. 플레이어는 그 흩어진 기억을 회수하여 잠재력의 50%만 발현되던 무기를 100% 발현 상태로 *해방* 한다.

이것은 *강화* 와 본질적으로 다르다:
- 강화는 *없던 힘을 더하는 것*
- 복원은 *원래 있던 힘을 깨우는 것*

성장 경로는 **단일 축** 으로 통합된다:

> **Memory Recovery %** — 0%에서 100%까지의 단일 게이지. 모든 진행이 이 게이지에 집결된다.

이전 시스템의 세 축(아이템 레벨 / 보스 영구 보너스 / 레어리티 승급)은 모두 폐기. Recovery 게이지 하나가 모든 진행을 표현한다.

### 1.2. 설계 근거 (Reasoning)

| 결정 | 근거 | 기각된 대안 |
| :--- | :--- | :--- |
| 단일 진행 축 (Recovery %) | 세 축이 분리되면 플레이어가 *수치 최적화 게임* 으로 인식. 단일 축은 *한 인생의 완성도* 라는 단일 정서 | 아이템 레벨 + 보너스 + 승급 3축 유지 — 강화 던전 정체성 |
| 보스 보상 = 문장 + Recovery 점프 | ATK +N은 *수치 보상*, 문장은 *서사 보상*. 같은 행동의 보상 의미를 완전히 다르게 만든다 | ATK +N 유지 + 문장 병기 — 서사 부산물화 |
| effective stat = baseStat × 함수(Recovery) | 스탯과 서사를 *분리* 하면 게이트 시스템과 충돌. *통합* 하여 "복원 = 잠재력 해방"의 직관 확보 | 스탯과 Recovery 독립 — 게이트 동작 모호 |
| 레어리티 승급 폐기 | 승급은 *수치 다음 단계로의 도약*. ECHORIS에서는 무기가 처음부터 완성되어 있다. *승급* 이 아니라 *발견* | 승급 유지 + 피티 시스템 — 강화 던전 정체성 잔존 |
| Re-Dive로 무한 야리코미 확보 | 100% 복원 후 동기 소실 우려에 대한 대응. 단, 무한 레벨업이 아니라 *인물의 다른 면 보기* | 100% 후 다른 아이템으로 이동만 — 단일 인물 야리코미 깊이 ↓ |
| Identity Archive 분리 | 인벤토리는 *물건* 의 정서. 아카이브는 *사람* 의 정서. 둘은 다른 컬렉션 정서 | 인벤토리에 통합 — 컬렉션 정서 희석 |

### 1.3. 3대 기둥 정렬 (Pillar Alignment)

| 기둥 | 복원 경로에서의 구현 |
| :--- | :--- |
| 메트로베니아 탐험 | Recovery → effective stat → 스탯 게이트 해금. *"이 무기의 인생을 끝까지 보면 본래 힘이 깨어나 게이트가 열린다"* — 강화가 아니라 *해방* |
| 아이템계 야리코미 | 300명 × 4 Fragment + Re-Dive 3회 + Network Fragment 합 = 약 5,000개 텍스트 컬렉션. 야리코미의 *질적 깊이* (수치 → 인물) |
| 온라인 멀티플레이 | 같은 인물의 다른 단편을 두 플레이어가 각자 회수하여 함께 한 인생 복원. 사회적 의미가 *기여* 가 아니라 *공동 회상* |

### 1.4. 저주받은 문제 검증 (Cursed Problem Check)

| 긴장 | 위험 A | 위험 B | 설계의 선택 |
| :--- | :--- | :--- | :--- |
| 성장 깊이 vs 신규 진입성 | 복잡한 시스템 — 진입 장벽 | 단순한 시스템 — 야리코미 깊이 ↓ | 시스템은 단순 (Recovery 게이지 1개), 콘텐츠는 깊음 (300명 × 4 Fragment) |
| 영구 진행 vs 반복 동기 | 영구 100% → 동기 소멸 | 초기화 시스템 → 노력 무효화 | 영구 100% 유지 + Re-Dive로 같은 인생의 다른 면 보기 (반복은 *동일 대상의 입체화*) |
| Normal vs Ancient 가치 | Normal 가치 ↓ → 초반 경험 공허 | Ancient 가치 ↓ → 야리코미 동기 ↓ | Normal = 짧고 강렬한 1인의 인생, Ancient = 길고 복잡한 1인의 인생. 모두 동일하게 가치 있는 *한 사람* |
| 수치 최적화 vs 서사 몰입 | 수치 게임 — 1차 niche 신호 ↓ | 서사만 — 게이트 시스템 동작 모호 | effective stat이 Recovery에서 *자동 파생*. 플레이어는 수치 최적화를 *하지 않아도* 자연 성장 |

### 1.5. 위험과 보상 (Risk & Reward)

| 전략 | 위험 (Risk) | 보상 (Reward) |
| :--- | :--- | :--- |
| Normal 아이템 100% 복원 (단일 다이브) | 짧지만 첫 다이브 시 사망 위험 | 1번의 발견으로 한 인생 완성. Identity Archive 첫 인물 등록 |
| Ancient 아이템 100% 복원 도전 | 4지층 + 심연. 가장 어려운 보스 | *진명* 해금. Era 단편 해금 가능성 |
| Re-Dive (이미 100% 복원한 인생) | 추가 시간 투자, 보상의 *감각* 변화 | 인물 입체화 + Identity Archive 카테고리 완성 가속 |
| 인물 간 연결망 추적 | 두 아이템 모두 100% 복원 필요 | Network Fragment — 두 사람의 관계 1차 자료 |
| 카테고리 18개 첫 인물 1명씩 복원 | 18 다이브 시간 | Identity Archive 카테고리 횡단 완성 → 시대적 윤곽 |

---

## 2. 메커닉 (Mechanics)

### 2.1. 단일 진행 축

장비 아이템의 성장은 단일 축 `Memory Recovery (0-100)` 으로 통합된다. 모든 효과(스탯, 이름, 결, 컬렉션)는 이 단일 게이지에서 파생된다.

```
모든 진행 → memoryRecovery += delta
  ↓
[자동 파생]
  ├─ effectiveStat = baseStat × (0.4 + Recovery × 0.006) × rarityMultiplier
  ├─ currentStage = floor(Recovery / 25)  (0-4)
  ├─ displayName = item.nameStage[currentStage]
  └─ activeTraits = unlockedFragments.map(f => f.identityTrait)
```

> **SSoT:** Recovery 진행 규칙은 `System_Memory_Core.md` (SYS-MEM-01) §2.1. 본 문서는 *장비 시스템에서의 적용* 만 다룬다.

### 2.2. Recovery 게이지

#### 게이지 증가 경로 요약

| 경로 | 증가량 | 비고 |
| :--- | :--- | :--- |
| 지층 보스 처치 | +25% (즉각 점프, 레어리티별 ±α) | Memory Fragment 1개 해금 동시 |
| 일반 적 처치 | +0.1% | 점진 누적 |
| 방 클리어 | +0.3% | 클리어 보너스 |
| 서사 오브젝트 상호작용 | +0.5% | 측량 일지, 마지막 표지 등 |
| 비밀방 발견 | +1.0% | 가장 강한 점진 보상 |

상세: `System_Memory_Core.md` §2.1

#### Recovery 상한

- 1회차 다이브: 100% 상한
- Re-Dive 1회차 후: 100% 유지 (Recovery는 상한 도달, Re-Dive는 별도 카운터)
- Re-Dive 카운터: 최대 3 (인물당)

### 2.3. effective stat 산정

#### 공식

```
effectiveStat(rarity, baseStat, recovery, reDiveCount) =
  baseStat
  × (0.4 + recovery × 0.006)           ← Recovery 배율 (0% → 0.4, 100% → 1.0)
  × rarityMultiplier[rarity]           ← 레어리티 배율 (Normal 1.0 ~ Ancient 3.0)
  × (1 + reDiveCount × 0.05)           ← Re-Dive 보너스 (0회 → 1.0, 3회 → 1.15)
```

> **⚠️ CSV 데이터 규약:**
> `Sheets/Content_Stats_Weapon_List.csv` 의 `BaseATK` 값은 **rarity 배율이 사전 적용된 최종값** 으로 저장된다. 예: `sword_ancient.BaseATK = 45 (= 15 × 3.0)` — 15는 baseline, ×3.0은 Ancient 배율.
>
> 따라서 코드 측 구현에서는 `rarityMultiplier` 항을 **별도 곱셈으로 처리하지 않는다**. 공식의 `× rarityMultiplier`는 *데이터에 이미 반영된 의미적 분해* 일 뿐이며, 실제 계산은 `effectiveStat = csvBaseStat × (0.4 + Recovery × 0.006) × (1 + reDive × 0.05)` 다.
>
> **신규 무기 데이터 추가 시:** baseline × rarity 배율 을 *사전 계산* 하여 CSV에 입력.
>
> **⚠️ effective stat 갭 인지 사항:** 본 공식 하에 100% Recovery effective stat = baseStat 자체 (예: Rare 검 baseATK 26 → 100% Recovery effective ATK = 26). 구 시스템(아이템 레벨 + 보너스 포함 시 약 53)보다 *낮은 값* 으로 도달한다. 이는 *의도된 결과* — Recovery 패러다임에서는 *"완전 복원 = 본래 잠재력"* 이 정의이며, 갭 보정을 위해선 게이트 수치 / 적 스탯 등 외부 수치 시스템을 *낮춰서* 재튜닝하는 방향을 권장 (baseStats 직접 상향은 사용자 결정으로 보류, 2026-05-24).

#### 적용 스탯

- `effectiveATK`
- `effectiveINT`
- `effectiveHP_bonus` (장비 부여 HP)

> 기타 부가 효과(공격 속도, 크리티컬 등)는 Identity Trait의 효과로 처리. effective stat 공식에 포함되지 않음.

#### 예시 (측량사의 에코 쐐기 / Magic 등급)

> **CSV BaseATK = 20** (= 15 baseline × 1.3 rarity 사전 적용). 코드는 이 값에 *rarity를 추가로 곱하지 않는다*.

| Recovery | Stage | effective ATK 계산 | 결과 |
| :---: | :---: | :--- | :---: |
| 0% | 0 (Unknown) | 20 × 0.4 | 8 |
| 25% | 1 (Survey Tool) | 20 × 0.55 | 11 |
| 50% | 2 (Guild Survey Tool) | 20 × 0.7 | 14 |
| 75% | 3 (The Last Wedge) | 20 × 0.85 | 17 |
| 100% | 4 (Surveyor's Echo Wedge) | 20 × 1.0 | 20 |
| 100% + Re-Dive 3 | 4 + Re-Dive | 20 × 1.0 × 1.15 | 23 |

> 정수 처리: `ceil()` 적용 (`System_Equipment_Rarity.md` §2.2 정합).
>
> **수치 갭 (미해결):** 구 시스템 Magic Lv 15 + 보스 보너스 ≈ 41. 신 시스템 100% Recovery = 20. 약 50% 갭이 존재한다. 이는 게이트 수치 / 적 스탯 등 *외부 수치 시스템* 의 재튜닝으로 해결 예정 — *baseStats 직접 상향은 사용자 결정으로 보류* (2026-05-24).

### 2.4. 이름 진화 (Name Evolution)

#### 자동 갱신 규칙

Recovery 단계가 변경되는 순간 모든 UI에서 표시 이름이 즉각 갱신된다.

```
function getDisplayName(item):
  stage = floor(item.memoryRecovery / 25)  # 0 ~ 4
  return item.def.nameStage[stage]
```

#### 갱신 트리거 UI

| UI | 갱신 동작 |
| :--- | :--- |
| 인벤토리 그리드 | 셀 이름 즉각 변경 |
| 인벤토리 중앙 칼럼 | 헤더 이름 즉각 변경 |
| 장착 표시 (HUD) | 즉각 변경 |
| Return Result 화면 | *이전 이름 → 새 이름* 연출 (페이드 전환 0.5초) |
| Identity Archive | 카드 이름 즉각 변경 |

#### Stage 변경 연출 (보스 처치 시)

```
[보스 처치]
  ↓
[Memory Fragment 해금 연출 — 문장이 타자기로 등장]
  ↓
[Recovery 게이지 25% 점프 애니메이션 (1초)]
  ↓
[Stage 변경 감지 시: 아이템 이름 변경 연출]
  │  - 이전 이름이 페이드 아웃
  │  - 새 이름이 페이드 인 + 글로우 1회
  │  - 사운드: 부드러운 차임
  ↓
[정체성 결 가동 알림]
  │  - "공명의 결 — 약점 노출 적에 ATK +12%"
  ↓
[Return Result 화면 또는 다음 지층 선택 UI]
```

### 2.5. 정체성 결 (Identity Trait) 가동

#### 가동 규칙

```
unlockedTraits = item.unlockedFragments
  .map(f => f.identityTrait)
  .filter(t => t != null)
```

- Stage 1 Fragment 해금 → Trait 1 가동
- Stage 2 Fragment 해금 → Trait 1+2 가동 (누적)
- ...
- Stage 4 Fragment 해금 → Trait 1+2+3+4 가동

> **빌드 의미:** 무기 교체 = 가동 결의 조합 전체 교체. 측량사의 에코 쐐기 (공명+끝을 보는+정체성 핵)와 격벽 수리공의 망치(수리+인내+성실)는 완전히 다른 빌드.

#### 결의 효과 종류

| 효과 종류 | 예시 |
| :--- | :--- |
| 상시 스탯 변경 | "격벽 인접 시 INT +8%" |
| 행동 변형 | "처치 시 ATK 5% 누적 (최대 25%, 피격 시 50% 감소)" |
| 자원 회복 | "약점 노출 적 처치 시 HP +5%" |
| 환경 상호작용 | "측량 일지 발견 시 Recovery +2% 추가" |

> **이전 시스템의 Active/Passive 분리는 폐기.** 모든 결은 *상시 가동* 이지만, 결 자체에 발동 조건(`triggerCondition`)이 포함되어 있어 효과가 *조건부* 로 발생한다.

### 2.6. Re-Dive (재다이브)

#### 진입 조건

- 아이템 Recovery = 100%
- Re-Dive 카운터 < 3
- 인벤토리에서 아이템 선택 → Anvil → Dive 선택 시 *재다이브 모드* 진입 (시스템이 자동 인식)

#### Re-Dive 시 변화

| 항목 | 변화 |
| :--- | :--- |
| 지층 구조 | 동일 (같은 절차 시드) |
| 보스 패턴 | 동일 |
| 환경 시각 | *팔레트 시프트* (회상의 색조가 다름. 1차 시안, 2차 자주, 3차 회색) |
| Memory Fragment | *다른 해석* 의 단편 (회한 → 자긍심 → 후회) |
| Identity Trait | 결의 *효과 변형* (예: ATK +12% → INT +12% 또는 ATK +10% + INT +5%) |
| effective stat | Re-Dive 1회당 +5% 곱셈 (1.05 / 1.10 / 1.15) |
| Recovery 게이지 | 영향 없음 (100% 유지) |

#### Re-Dive 상한

- 회차 상한 3회 (인물당)
- 3회 완료 = Identity Archive 해당 인물 *완전 입체화* 상태. 별도 칭호 부여 가능

### 2.7. Identity Archive 컬렉션

#### 등록 규칙

| 시점 | Identity Archive 동작 |
| :--- | :--- |
| 아이템 첫 획득 | `[Unknown]` 상태로 카테고리 미분류 등록 |
| Stage 1 도달 | 카테고리 자동 분류 + *직업명* 표시 |
| Stage 4 도달 | *진명* 표시 + Identity Trait 전체 표시 + Fragment 전체 표시 |
| Re-Dive 완료 | 회차별 Fragment 추가 표시 |

#### 카테고리 진행도

```
[측량사 (Surveyor)]
─────────────────────────
완전 복원: 1 / 5
일부 복원: 2 / 5  
미발견:    2 / 5

[1] Surveyor of the Last Wedge        ████████████████ 100%
[2] Surveyor of the Cracked Bulkhead  ████░░░░░░░░░░░░ 25%
[3] Surveyor of the Forgotten Route   ████████░░░░░░░░ 50%
[ ] ???                                                  0%
[ ] ???                                                  0%
```

> 카테고리 5명 전원 100% 복원 시: **Echo Chord 해금** — *"모든 측량사들은 같은 일지 양식을 쓴다 — 30년 전부터 변하지 않았다."*

### 2.8. 폐기된 메커닉 (전 시스템과의 비교)

| 폐기 항목 | 폐기 이유 | 대체 방식 |
| :--- | :--- | :--- |
| 아이템 레벨 0-99 | "Lv.N"은 강화의 언어 | Memory Recovery 0-100% — 복원의 언어 |
| 아이템 EXP 누적 | 레벨업 패러다임의 일부 | Recovery 점진 누적 (다음 보스까지의 게이지) |
| 보스 처치 영구 ATK +N | 강화 보상 정체성 | Memory Fragment + Recovery 점프 + 정체성 결 가동 |
| `permanentBonus = BaseStat × (0.05 + level/400) × bossTierMultiplier` | 강화 공식 | `effectiveStat = baseStat × (0.4 + Recovery × 0.006) × rarityMultiplier × (1 + reDive × 0.05)` |
| 레어리티 승급 (피티 시스템) | "Magic → Rare 승급"은 *수치 도약*. 무기는 처음부터 완성 | 폐기. 레어리티는 *처음부터 결정* (드랍 시점에 확정) |
| 승급 재료 (Echo Shard, Memory Fragment 재료) | 승급 시스템 폐기에 따른 부수 폐기 | 없음 |
| 심연 진화 1-3단계 (Ancient 전용) | 강화 던전 정체성의 정점 | Re-Dive 3회 + Network Fragment 추적 |
| 에르다 강화 대사 ("이 검을 한 번 더 벼리면…") | 강화 어휘 | 검 Ego 대사 ("…드디어 본래 모습이 떠올라.") — DEC-033 검 Ego 시스템 |

---

## 3. 규칙 (Rules)

### 3.1. Recovery 게이지 규칙

| 규칙 ID | 규칙 | 예외 |
| :--- | :--- | :--- |
| EGP-R01 | Recovery 증가는 아이템계 내에서만 발생한다. 월드 탐험으로는 증가하지 않는다 | 없음 |
| EGP-R02 | Recovery는 100%를 상한으로 한다. 초과 진행은 버려진다 | Re-Dive 카운터로 별도 추적 |
| EGP-R03 | 보스 처치 시 Recovery 점프는 *즉각 적용* | 사망/네트워크 단절 시에도 보존 |
| EGP-R04 | 재방문 클리어 지층의 보스 재처치는 추가 Fragment를 주지 않는다 | Re-Dive 모드는 별도 — 다른 Fragment 부여 |
| EGP-R05 | 사망 탈출 시 *현재 다이브 중 점진 누적분* 만 손실. 보스 처치 점프분은 보존 | 첫 아이템계 진입 특례(SYS-IW-01 §2.3): 사망해도 손실 없음 |

### 3.2. Memory Fragment 규칙

| 규칙 ID | 규칙 | 예외 |
| :--- | :--- | :--- |
| EGP-R10 | Fragment 해금은 보스 처치 즉시 발생 | 없음 |
| EGP-R11 | Fragment는 아이템에 영구 귀속. 무기 분실/파괴해도 Identity Archive에 보존 | 없음 |
| EGP-R12 | 동일 보스 재처치는 추가 Fragment를 주지 않는다 | Re-Dive 모드: 다른 회차 Fragment 부여 |
| EGP-R13 | Fragment 해금은 즉각 정체성 결 가동 트리거 | 결의 효과 종류에 따라 발동 조건이 별도일 수 있음 |
| EGP-R14 | Stage 4 Fragment는 *Fire 모멘트* 로 작성되어야 한다 | 작성 가이드: `System_ItemNarrative_Template.md` |

### 3.3. effective stat 규칙

| 규칙 ID | 규칙 | 예외 |
| :--- | :--- | :--- |
| EGP-R20 | effective stat은 매 프레임 재계산 가능 (성능 영향 미미) | 캐시는 Recovery 변경 / 장비 교체 / Re-Dive 시점에만 무효화 |
| EGP-R21 | effective stat 정수 처리는 `ceil()` 적용 | 레어리티 배율 적용과 동일 |
| EGP-R22 | 스탯 게이트 판정에는 effective stat 적용 | 없음 |
| EGP-R23 | 베이스 스탯(`baseStats`)은 무기 정의에 고정. 강화로 변경되지 않음 | 없음 (Phase 2 baseStats 상향 재조정 작업은 일회성) |

### 3.4. Identity Archive 규칙

| 규칙 ID | 규칙 | 예외 |
| :--- | :--- | :--- |
| EGP-R30 | 아이템 첫 획득 시 Archive에 `[Unknown]` 등록 | 동일 정의의 무기가 이미 100% 복원된 경우: 신규 인스턴스는 *다른 인물* 로 등록 (절차 시드 차이) |
| EGP-R31 | Fragment 해금 시 Archive 페이지 즉각 갱신 | 없음 |
| EGP-R32 | 무기 분실/판매 시 Archive 항목 *유지* (인물의 기억은 무기에 종속되지 않음) | 없음 |
| EGP-R33 | 카테고리 5명 100% 복원 시 Echo Chord 1개 해금 | 없음 |
| EGP-R34 | 30명 이상 100% 복원 시 Era Echo 1개 해금 | 시대별 분류는 카테고리와 별도 |

---

## 4. 수치 설계 (Numerical Design)

### 4.1. 진행 시뮬레이션

**시나리오: Magic 등급 측량사의 에코 쐐기 (baseATK 15)**

```
[Stage 0 / Recovery 0%]
  이름: Unknown Wedge
  effectiveATK: 15 × 0.4 × 1.3 = 7.8 → 8
  Active Traits: 없음

[아이템계 진입 — 지층 1 진행]
  - 일반 적 10마리 처치: +1.0%
  - 방 4개 클리어: +1.2%
  - 측량 일지 상호작용: +0.5%
  - 결정질 표지 모음 상호작용: +0.5%
  - 닳은 망치 받침대 상호작용: +0.5%
  [지층 1 진행 누적: +3.7%]
  Recovery: 3.7%

[지층 1 보스 (잔향의 회랑지기) 처치]
  Recovery: 3.7% + 25% = 28.7% (Stage 0 → Stage 1)
  Fragment 해금: "두드리고 듣는다. 그게 전부였어."
  이름 변경: Unknown Wedge → Survey Tool
  결 가동: 공명의 결 (약점 노출 적 ATK +12%)
  effectiveATK: 15 × (0.4 + 0.287 × 0.006) × 1.3 = 15 × 0.572 × 1.3 = 11.15 → 12

[지층 2 진행 누적: +3.5%]
  Recovery: 32.2%

[지층 2 보스 (균열의 첨두) 처치]
  Recovery: 32.2% + 25% × 2 = 82.2% (Magic은 2 stage = 보스 처치당 50% 점프)
  
  [수정: Magic 등급 규칙 재확인]
  Magic은 2지층 = 보스 2회 = stage 0→2→4 (50% per boss)
  ∴ Recovery: 32.2% + 50% = 82.2% — 게이지가 Stage 2 (50%) 통과
                                   하지만 보스 처치는 50% 점프이므로 결과적으로 Stage 4 도달

[더 정확한 시뮬: 보스 처치 시 stageJump 정확 적용]
  Magic 보스 1: Recovery → max(Recovery, 50%) (Stage 0 → Stage 2 강제)
  Magic 보스 2: Recovery → max(Recovery, 100%) (Stage 2 → Stage 4 강제)
  
  결과:
  - 지층 1 보스 처치 후: Recovery = 50% (이름 = Guild Survey Tool, Stage 2)
  - 지층 2 보스 처치 후: Recovery = 100% (이름 = Surveyor's Echo Wedge, Stage 4)
  - effectiveATK 최종: 15 × 1.0 × 1.3 = 19.5 → 20
```

> **점진 누적분의 역할:** Stage 사이 게이지가 채워지는 만큼 effective stat이 *부드럽게* 상승. 보스 처치는 *결정적* 점프. 둘이 결합하여 *둘 다 의미 있는* 진행 체감.

### 4.2. 레어리티별 보스 처치 stageJump 테이블

| 레어리티 | 지층 수 | 보스 1 | 보스 2 | 보스 3 | 보스 4 | 심연 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Normal | 1 | → 100% (Stage 4 직행) | — | — | — | — |
| Magic | 2 | → 50% (Stage 2) | → 100% (Stage 4) | — | — | — |
| Rare | 3 | → 33% (Stage 1) | → 67% (Stage 2) | → 100% (Stage 4) | — | — |
| Legendary | 4 | → 25% (Stage 1) | → 50% (Stage 2) | → 75% (Stage 3) | → 100% (Stage 4) | — |
| Ancient | 4+심연 | → 25% | → 50% | → 75% | → 100% | Re-Dive 영역 |

> **점진 누적분과의 결합:** 점진으로 Recovery가 32%가 된 상태에서 Magic 보스 1을 잡으면 → Recovery = max(32%, 50%) = 50%. 점진 부분은 *손실* 되지 않으며 *흡수* 된다. 다음 보스까지 0%부터 다시 누적되는 게 아니라 50%부터 누적.

### 4.3. effective stat 곡선 비교

#### 구 시스템 (아이템 레벨 + 보스 보너스, Lv 0→15, Rare 검 baseATK 15)

```
Lv 0:  15 × 1.0 × 1.7 = 25.5 → 26
Lv 15: 15 × 1.75 × 1.7 + permBonus(약 8) = 44.6 + 8 = 52.6 → 53
배율: 26 → 53 (×2.04)
```

#### 신 시스템 (Recovery 0→100%, Rare 검 baseATK 15)

```
Recovery 0%:   15 × 0.4 × 1.7 = 10.2 → 11
Recovery 100%: 15 × 1.0 × 1.7 = 25.5 → 26
배율: 11 → 26 (×2.36)
```

> **수치 갭:** 신 시스템의 100% Recovery는 구 시스템의 Lv 0과 동등. 이는 의도된 변경 — 베이스 스탯 자체를 *원래 의도된 잠재력* 으로 재정의해야 한다.

#### baseStats 보정 (2026-05-24 최종)

> **2026-05-24 사용자 결정 (옵션 B-2 채택):** Rustborn baseATK 15 → 35 (×2.333) 상향. 다른 모든 Blade 무기도 동일 비율로 상향. *Recovery 40% (Lv 4 호환) 시점에 effective ATK 42* 도달이 곡선 기준점.

**최종 baseATK 값 (Blade 7개):**

| WeaponID | 구 BaseATK | 신 BaseATK | Recovery 40% ATK | Recovery 100% ATK |
|:--|:--:|:--:|:--:|:--:|
| sword_broken | 8 | 19 | 23 | 29 |
| sword_rustborn | 15 | **35** | **42** ✓ | 53 |
| sword_magic | 20 | 47 | 57 | 71 |
| sword_rare | 26 | 61 | 74 | 92 |
| sword_legendary | 33 | 77 | 93 | 116 |
| sword_ancient | 45 | 105 | 126 | 158 |

**적용된 공식 (DEC-046 폴백):**
```
effectiveAtk = ceil(baseAtk × (1.0 + Recovery × 0.005) × (1 + reDive × 0.05))
```
- Recovery 0% → ×1.0 (구 시스템 막 드랍 상태와 거의 동등)
- Recovery 40% (Lv 4 호환) → ×1.2
- Recovery 100% (Stage 4 진명) → ×1.5
- Re-Dive 3 추가 → ×1.15

> **결정 근거:** 사용자가 *"Rustborn 4레벨 공격력 33 → 42"* 명시. Lv 4 = Recovery 40%로 환산하여 `35 × 1.2 = 42` 가 목표값에 정확 일치. 다른 무기는 동일 비율(×2.333) 적용으로 등급 차별화 유지.

> **알려진 한계:** 본 작업은 Blade 라인 7개만 적용. Cleaver / Shiv / Harpoon / Chain / Railbow / Emitter 30개 무기의 `BaseATK` 컬럼은 *원래부터 비어 있는 상태* — 신 baseline 으로 별도 작성 필요.

### 4.4. Recovery 게이지 점진 누적 시뮬

**가정: Magic 아이템 1 다이브 (지층 2개)**

| 활동 | 빈도 | 누적 Recovery |
| :--- | :---: | :---: |
| 일반 적 처치 (×30) | 30회 × 0.1% | +3.0% |
| 방 클리어 (×8) | 8회 × 0.3% | +2.4% |
| 환경 오브젝트 (×4) | 4회 × 0.5% | +2.0% |
| 비밀방 발견 (×1) | 1회 × 1.0% | +1.0% |
| **점진 누적 합계** |  | **+8.4%** |
| 보스 1 처치 | | → 50% (점진분 흡수) |
| 보스 2 처치 | | → 100% (점진분 흡수) |

> **설계 의도:** 점진 누적은 *Stage 사이 점프에 흡수* 된다. 플레이어가 점진 활동을 *최적화* 할 필요 없다 — 보스만 잡으면 자동 100%. 단, 점진 활동을 한 만큼 *Stage 사이 effective stat 상승* 의 부드러움이 다르다.

---

## 5. 예외 처리 (Edge Cases)

### 5.1. Recovery 상한 처리

- Recovery가 100%에 도달한 시점에 점진 활동을 더 한 경우: 초과분 무시. UI에 *"이미 완전 복원됨"* 토스트
- Re-Dive 진입 후 Recovery는 *별도 변수* 로 추적되지 않음 — Re-Dive 카운터만 증가. Recovery는 100% 고정

### 5.2. 보스 처치 점프 vs 점진 누적

- 점진으로 Recovery 75%에 도달한 상태에서 Magic 보스 1 처치 시: `max(75%, 50%) = 75%` 유지 → 그러나 Stage 1 Fragment는 *해금되어야 한다*
- 처리: 보스 처치는 *Stage 진행* 과 *Fragment 해금* 두 작용. Recovery는 max 처리, Fragment는 항상 해금. Stage가 이미 점진으로 도달한 경우 이름은 *유지*

### 5.3. baseStats 보정 마이그레이션

- 기존 구 시스템 세이브 데이터의 아이템: `level: number` 필드가 존재
- 마이그레이션: `memoryRecovery = level × 10` (Lv 10 → 100%) 변환
- 단, Fragment 미해금 상태 → 단편 단순 배정: stageReached = floor(Recovery / 25) 까지 Fragment 자동 해금

### 5.4. 아이템 분실/판매

- 무기 자체는 사라지지만 Identity Archive 항목은 *유지*
- 다른 동일 정의의 무기 획득 시 *다른 인물* 로 등록 (절차 시드 차이로 다른 인생)

### 5.5. 100% 복원 직후 동기

- 아이템이 100% 복원되어 *다음에 할 일* 이 모호한 순간
- 처리: Return Result 화면에 *카테고리 추천* — *"같은 측량사 동료의 무기를 발견할 수 있는 위치: 격벽 4 표면"* 표시
- 인물 카테고리 미완성도 시각화 → 자연스러운 다음 목표

---

## 6. 의존성 (Dependencies)

### 6.1. 이 시스템이 받는 것 (Inputs)

| 시스템 | 제공 데이터 | 참조 문서 |
| :--- | :--- | :--- |
| 기억 복원 코어 (SYS-MEM-01) | Recovery 게이지 규칙, Fragment 데이터, Identity Trait 규칙 | `System_Memory_Core.md` |
| 아이템계 코어 (SYS-IW-01) | 보스 처치 이벤트, 일반 적 처치/방 클리어 이벤트, 환경 오브젝트 이벤트 | `System_ItemWorld_Core.md` |
| 장비 레어리티 (SYS-EQP-01) | `rarityMultiplier`, 레어리티별 지층 수 | `System_Equipment_Rarity.md` |
| 장비 슬롯 (SYS-EQP-02) | `baseStats`, 장비 착용/해제 상태 | `System_Equipment_Slots.md` |
| 콘텐츠 시트 | `nameStage0-4`, Fragment 텍스트, 결 정의 | `Sheets/Content_Item_Master.csv`, `Sheets/LoreTexts/Fragments/` |

### 6.2. 이 시스템이 제공하는 것 (Outputs)

| 수신 시스템 | 제공 데이터 | 용도 |
| :--- | :--- | :--- |
| 데미지 시스템 | `effectiveATK` | 전투 데미지 계산 |
| 스탯 게이트 | `effectiveStat` 전체 | 게이트 해금 판정 |
| UI 인벤토리 | 표시 이름, Recovery %, 해금 Fragment 목록, 가동 결 목록 | 인벤토리/Anvil/HUD 표시 |
| UI Identity Archive | 인물 카테고리별 진행도, Fragment 텍스트 전체 | 아카이브 화면 |
| UI Return Result | 이번 다이브 Recovery 변화, 해금 Fragment, 이름 진화 이벤트 | 귀환 결과 화면 |

### 6.3. 연동 계약 (Integration Contract)

```yaml
provides:
  - effectiveStat:
      type: "Record<StatType, number>"
      computed_on: "equip / recovery-change / re-dive-change"

  - memoryRecovery:
      type: number
      range: "0.0 ~ 100.0"

  - displayName:
      type: string
      computed: "item.def.nameStage[floor(recovery/25)]"

  - unlockedFragments:
      type: "FragmentId[]"

  - activeTraits:
      type: "IdentityTrait[]"

consumes:
  - from: System_ItemWorld_Core
    events: ["BOSS_KILL", "ENEMY_KILL", "ROOM_CLEAR", "ENVIRONMENT_INTERACT", "SECRET_FOUND"]

  - from: System_Memory_Core
    data: ["Fragment 카탈로그", "Identity Trait 카탈로그", "Recovery 진행 규칙"]

  - from: System_Equipment_Rarity
    data: ["rarityMultiplier", "stratumCount"]
```

---

## 7. 튜닝 노브 (Tuning Knobs)

| 파라미터 | 기본값 | 범위 | 카테고리 | 근거 |
| :--- | :---: | :--- | :--- | :--- |
| `RECOVERY_BASE_RATIO` | 0.4 | 0.3-0.5 | Feel | Recovery 0% 시 effective stat 비율. 낮을수록 *복원의 의미* 강화 |
| `RECOVERY_RANGE_RATIO` | 0.006 | 0.004-0.008 | Curve | Recovery 100% 시 효과 = `0.4 + 100 × 0.006 = 1.0`. 조정 시 함께 |
| `BOSS_KILL_RECOVERY_JUMP` | 레어리티별 | 표 §4.2 | Gate | 보스 처치 점프량. 레어리티별 stage 수와 정합 |
| `ENEMY_KILL_RECOVERY` | 0.1 | 0.05-0.2 | Feel | 일반 적 처치 점진 |
| `ROOM_CLEAR_RECOVERY` | 0.3 | 0.2-0.5 | Feel | 방 클리어 보너스 |
| `ENVIRONMENT_INTERACT_RECOVERY` | 0.5 | 0.3-1.0 | Feel | 서사 오브젝트 (1회 한정) |
| `SECRET_FOUND_RECOVERY` | 1.0 | 0.5-2.0 | Feel | 비밀방 발견 — 가장 강한 점진 보상 |
| `RE_DIVE_STAT_BONUS` | 0.05 | 0.03-0.10 | Curve | Re-Dive 1회당 effective stat 곱셈 보너스 |
| `RE_DIVE_MAX_COUNT` | 3 | 2-5 | Gate | 인물당 Re-Dive 회차 상한 |

> 모든 파라미터 SSoT: `Sheets/Content_ConstData.csv` 신규 그룹 `Item.Recovery.*`

---

## 8. 작가의 복원 서사 (Recovery Narrative)

### 8.1. 검 Ego 대사 (강화 대사 폐기)

이전 시스템의 *에르다 강화 대사* 는 폐기. 대신 *검 Ego 대사* 가 Recovery 단계에 따라 갱신된다.

**검 Ego 대사 예시 (측량사의 에코 쐐기 — Stage별):**

| Stage | 검 Ego 대사 (안전 구역에서 잠시 멈출 때) |
| :--- | :--- |
| Stage 0 (Unknown) | (대사 없음 — 검은 침묵한다) |
| Stage 1 (Survey Tool) | "...두드리고 듣는다. 그게 전부였어." |
| Stage 2 (Guild Survey Tool) | "균열은 거짓말을 하지 않아. 사람만 거짓말을 하지." |
| Stage 3 (The Last Wedge) | "위에 있는 사람들은 보고서를 원했어. 나는 답을 원했어." |
| Stage 4 (Surveyor's Echo Wedge) | "끝까지 본 것 같아. 그게 무엇이었는지는 아직도 모르겠지만." |

> 대사 작성 가이드: `Documents/System/System_ItemNarrative_Template.md` §3 검 Ego 대사 규칙

### 8.2. Return Result 화면 텍스트 변경

이전: `"Iron Blade Lv.3 → Lv.4 / ATK 45 → 52 (+7)"`
신: `"Survey Tool → Guild Survey Tool / Memory recovered: 50%"`

수치는 *부산물* 로 작게 표시. 메인은 *이름 변화* 와 *Fragment 텍스트*.

상세: `Documents/UI/UI_ItemWorld_ReturnResult.md` (재작성 대기)

---

## 9. 수락 기준 (Acceptance Criteria)

### 9.1. 기능 기준

| 항목 | 판정 기준 |
| :--- | :--- |
| Recovery 게이지 | 보스 처치 → 즉각 점프 / 일반 활동 → 점진 누적 / 점프와 누적이 max로 결합 |
| 이름 진화 | Stage 변경 즉시 표시 이름 갱신, 연출 재생 |
| Fragment 해금 | 보스 처치 즉시 Identity Archive에 영구 등록 |
| 정체성 결 가동 | Fragment 해금과 동시에 결의 효과 적용 |
| effective stat | Recovery × rarityMultiplier × baseStat 정확 산정 |
| Re-Dive 진입 | 100% Recovery 아이템 선택 시 자동 Re-Dive 모드 진입 |
| Identity Archive | 아이템 획득 시 `[Unknown]` 등록 / Stage 변경 시 즉각 갱신 |

### 9.2. 경험 기준

| 시나리오 | 목표 경험 | 검증 방법 |
| :--- | :--- | :--- |
| Magic 아이템 100% 복원 (35-50분) | 진명 해금 순간이 *기억에 남는 모멘트* 가 됨 | 플레이어 인터뷰: "방금 무엇이 가장 기억에 남나?" — 답이 *문장* 또는 *진명* 이면 성공 |
| 보스 처치 후 Recovery 50% → 100% | "이번 보스를 잡으니 진명이 떠올랐다" 의 인과 명확 | 화면 연출 인지 여부 |
| 100% 복원 후 다음 다이브 선택 | 다음 다이브 동기가 *수치* 가 아닌 *사람 이름* | 인터뷰: "다음에 어떤 아이템에 들어가고 싶나?" 의 답 형식 |
| Identity Archive 처음 열람 | *자발적* 으로 다시 열어봄 | 세션 중 Archive 열람 횟수 추적 (평균 2회 이상) |
| Re-Dive 진입 | "같은 인생을 다시 본다"는 정서적 동기 | 100% 복원 아이템 중 Re-Dive 진입률 30% 이상 |

### 9.3. 밸런스 기준

- Phase 2 기준: Magic 아이템 100% 복원에 소요되는 세션 수: **1-2 세션** (세션당 평균 45분)
- effective stat 100% Recovery 시 구 시스템 Lv 15 보스 보너스 포함값의 ±10% 이내 (전투 밸런스 보존)
- Identity Archive 첫 카테고리 완성(5명) 도달 시간: **15-25시간**
- Identity Archive 100% (300명 전원) 도달 시간: **200-400시간** (야리코미)

---

## 10. 변경 이력 (Changelog)

| 날짜 | 버전 | 변경 사항 |
| :--- | :--- | :--- |
| 2026-05-24 | 2.0 | DEC-046 전면 재작성 — Memory Recovery 패러다임 전환. 아이템 레벨·EXP·보스 영구 보너스·레어리티 승급(피티)·심연 진화 전부 폐기. Recovery % + Fragment + Identity Trait + Identity Archive + Re-Dive 도입. |
| 2026-03-29 | 1.0 | 초안 — 아이템 레벨 0-99, 보스 영구 보너스, 레어리티 승급(피티) 시스템. |

---

**다음 단계:**
1. `Sheets/Content_Stats_Weapon_List.csv` baseStats × 2.0 일괄 상향
2. `Sheets/Content_Item_Master.csv` 에 `nameStage0-4` 5개 컬럼 추가 + 측량사의 에코 쐐기 5단계 이름 등록
3. `Sheets/Content_ConstData.csv` 에 `Item.Recovery.*` 그룹 신규 등록
4. `Documents/UI/UI_Identity_Archive.md` 신규 작성
5. `Documents/System/System_ItemNarrative_Template.md` Stage별 검 Ego 대사 가이드 추가
