# 기억 복원 코어 시스템 (Memory Recovery Core System) — SYS-MEM-01

> **2026-05-24 전면 재작성 (DEC-046).** 이전 버전의 5색 기질 · Active/Passive 슬롯 · 전이/합성 · 효과 변이 메커닉은 모두 폐기되었다. 시스템의 목적이 "무기 강화"에서 "한 사람의 삶 복원"으로 전환되었다.

## §0. 필수 참고 자료 (Mandatory References)

- DEC-046 (시스템 결정): `memory/wiki/decisions/DEC-046.md`
- Project Vision: `Documents/Terms/Project_Vision_Abyss.md`
- 아이템계 코어: `Documents/System/System_ItemWorld_Core.md` (SYS-IW-01)
- 장비 성장 경로: `Documents/System/System_Equipment_Growth.md` (SYS-EQP-03)
- 장비 레어리티: `Documents/System/System_Equipment_Rarity.md`
- 측량사의 에코 쐐기 기준 예시: `Documents/Content/Content_Item_Narrative_SurveyorEchoWedge.md`
- DEC-036 (구 시스템 — 부분 폐기): `memory/wiki/decisions/DEC-036-Memory-Shard-System.md`

---

## 구현 현황 (Implementation Status)

> 최근 업데이트: 2026-05-24
> 문서 상태: `재설계 완료 (DEC-046 반영)`
> 2-Space: Item World (아이템계), World (스탯 게이트 판정)
> 기둥: 야리코미 (주), 메트로베니아 탐험 (부), 온라인 멀티플레이 (부)

| 기능 ID  | 분류      | 기능명                                       | 우선순위 | 구현 상태 | 비고                                                |
| :------- | :-------- | :------------------------------------------- | :------: | :-------- | :--------------------------------------------------- |
| MEM-01-A | 코어      | Memory Recovery % 게이지 (0-100)             |    P0    | 대기      | 아이템 레벨 0-99를 대체                              |
| MEM-02-A | 코어      | 이름 진화 (Name Evolution) 5단계             |    P0    | 대기      | Recovery 단계마다 이름 변경                          |
| MEM-03-A | 코어      | Memory Fragment (문장) 해금                  |    P0    | 대기      | 보스 처치 시 1개씩 영구 해금                         |
| MEM-04-A | 코어      | 정체성 결 (Identity Trait) 가동              |    P0    | 대기      | Fragment마다 1개의 결, 무기의 모든 스킬/효과 결정    |
| MEM-05-A | 코어      | Identity Archive (인물 아카이브) UI          |    P0    | 대기      | 무기가 아니라 사람들의 삶을 모으는 컬렉션            |
| MEM-06-A | 메커닉    | Recovery 점진 누적 (전투/탐험)               |    P1    | 대기      | 0.1-1% 점진 누적. 다음 Fragment까지의 진행 게이지    |
| MEM-07-A | 메커닉    | 재다이브 (Re-Dive) 단편 변이                 |    P2    | 대기      | 100% 복원 후 재진입 시 다른 해석의 단편 등장         |
| MEM-08-A | 메커닉    | 인물 연결망 (Echo Network)                   |    P2    | 대기      | 두 인물 100% 복원 시 관계 단편 해금                  |
| MEM-09-A | 게이트    | 스탯 게이트 = Recovery 기반 effective stat   |    P0    | 대기      | `effectiveStat = baseStat × (0.4 + Recovery × 0.006)` |

---

## §1. 개요 (Concept)

### §1.1. 설계 의도 (Intent)

> "플레이어가 측량사의 에코 쐐기에서 얻는 것은 ATK +22가 아니다. *한 측량사가 왜 보고서를 쓰지 않았는가* 다. 무기를 강화하는 게임이 아니라, 무기 한 자루에 남은 인생 하나를 복원하는 탐사 게임이다."

플레이어가 아이템계에 들어가는 이유는 *수치를 올리기 위해서*가 아니라 *이 사람의 마지막을 보기 위해서* 다.

측량사의 에코 쐐기를 100% 복원하면 그 무기는 단순히 강해진 검 한 자루가 아니라 — 100년 전 격벽 4에서 비정상 진동을 감지하고 보고서를 쓰지 않은 채 격벽 5 아래로 내려가 돌아오지 않은 한 사람의 인생 전체다.

이것이 ECHORIS의 야리코미다. 300개의 무기는 300명의 인생이며, 모든 무기를 100% 복원하는 것은 300명의 잊혀진 삶을 되찾는 것이다.

### §1.2. 설계 근거 (Reasoning)

| 설계 결정 | 채택 이유 | 기각된 대안 |
| :--- | :--- | :--- |
| 아이템 레벨 → Memory Recovery % | "Lv.3"는 강화의 언어. "Recovery 67%"는 복원의 언어. 같은 진행도 표현이지만 정체성이 다르다 | 아이템 레벨 유지 — 디스가이아 클론 인식 위험 |
| 보스 보상 = 문장(Fragment) + Recovery 점프 | ATK +14보다 *"보고하지 않은 건 비밀이어서가 아니야. 끝을 보고 싶었을 뿐이야"* 가 강한 보상이다. 수치는 부산물 | ATK 영구 +N — 강화 던전 정체성 |
| 이름 진화 5단계 | "Unknown → 진명"의 4번 발견이 가장 즉각적으로 *정체를 밝혀냄* 을 체감시킨다 | 이름 고정 — 발견의 감각 부재 |
| 정체성 결 = 무기의 모든 스킬 | 일반 단편을 폐기하면 "Berserker 단편 + Ghost 단편" 같은 빌드 자유도가 사라지지만, *어떤 인물의 무기를 선택하느냐* 가 더 강한 빌드 선택이 된다 | 5색 기질 유지 — 시스템 복잡도 ↑, 서사 희석 |
| Identity Archive | 무기 인벤토리는 *물건* 목록이지만 Identity Archive는 *사람* 목록. 컬렉션의 정서가 다르다 | 무기 컬렉션만 — 한정흥 정서 락 약화 |
| 스탯 = Recovery 부산물 | 스탯 게이트는 유지하되 "무기를 이해할수록 본래 힘이 깨어난다"로 재정의. 강화 어휘 추방 | ATK를 독립 진행축으로 유지 — 강화 던전 잔재 |

### §1.3. 3대 기둥 정렬 (Pillar Alignment)

| 기둥 | Memory Recovery에서의 구현 |
| :--- | :--- |
| 메트로베니아 탐험 | Recovery %가 effective stat을 결정 → 스탯 게이트 해금. 단, 동기는 *"이 게이트를 뚫기 위해 강해진다"* 가 아니라 *"이 인생을 끝까지 보면 본래 힘이 깨어나 게이트도 열린다"* |
| 아이템계 야리코미 | 300명의 인생 × 평균 4 Fragment = 1,200개 문장의 컬렉션. Identity Archive 100% 완성 = 야리코미 최종 목표 |
| 온라인 멀티플레이 | 깊은 인생(Legendary/Ancient)의 보스 Fragment는 파티 협력이 현실적. 두 플레이어가 같은 인물의 다른 단편을 회수하여 *함께 한 사람을 복원* |

### §1.4. 저주받은 문제 검증 (Cursed Problem Check)

| 긴장 | 위험 A | 위험 B | 설계의 선택 |
| :--- | :--- | :--- | :--- |
| 서사 깊이 vs 야리코미 수치 | 서사만 — 야리코미 수치 깊이 ↓ | 수치만 — 서사 부산물화 | 서사가 *진행 단위*, 수치는 *부산물*. Recovery %가 양쪽을 잇는 단일 게이지 |
| 빌드 자유 vs 무기 정체성 | 자유 단편 시스템 — 모든 검이 같은 빌드 | 정체성 결만 — 빌드 다양성 ↓ | 빌드 다양성 = *어떤 인물의 무기를 선택하느냐 + 어떤 Fragment를 활성화하느냐*. 300명의 인생 = 300개의 빌드 |
| 100% 복원 후 동기 | 동기 소멸 → 야리코미 종료 | 무한 갱신 → 서사 희석 | 재다이브(Re-Dive) 시스템 — 같은 인생을 다른 *해석* 으로 재방문 (회한 → 자긍심) |
| 1차 niche vs 미드코어 | niche 깊이만 — 진입장벽 ↑ | 미드코어 친화만 — 1차 niche 신호 ↓ | Recovery %는 미드코어에게 *진행도 게이지*, 1차 niche에게 *복원 의례*. 단일 UI가 두 페르소나 모두에게 louder |

### §1.5. 위험과 보상 (Risk & Reward)

| 행동 | 리스크 | 리턴 |
| :--- | :--- | :--- |
| 아이템계 진입 (Fragment 목적) | 지층 탈출 실패 시 진행 손실 | Fragment 1개 영구 해금 + Recovery 25% 점프 + 이름 진화 |
| 100% 복원 도전 (최심 보스) | 가장 어려운 보스 + 최장 다이브 | *진명* 해금. Identity Archive에 해당 인물의 완전한 인생 등록 |
| 재다이브 | 추가 시간 투자 | 같은 인생의 다른 해석. 인물 입체화 |
| 인물 간 연결망 추적 | 두 무기를 모두 100% 복원해야 함 | 관계 단편 (Echo Network) — 인물 간 1차 관계 자료 |

---

## §2. 메커닉 규칙 (Mechanics & Rules)

### §2.1. Memory Recovery % — 단일 진행 게이지

모든 장비 아이템은 0-100% 범위의 단일 게이지 *Memory Recovery* 를 가진다. 아이템 레벨(0-99)은 존재하지 않는다.

#### Recovery 게이지 증가 경로

| 경로 | 증가량 | 비고 |
| :--- | :--- | :--- |
| 지층 보스 처치 | **+25% 즉각 점프** (Legendary/Ancient는 ±α 조정) | Memory Fragment 1개 해금 동시 발생 |
| 일반 적 처치 | +0.1% | 점진 누적. 다음 보스까지의 게이지 |
| 방 클리어 | +0.3% | 클리어 보너스 |
| 환경 오브젝트 상호작용 | +0.5% | 측량 일지, 마지막 표지 등 (서사 오브젝트) |
| 비밀방 발견 | +1.0% | 가장 강한 점진 보상 |

> **설계 의도:** 보스 처치가 게이지의 *결정적* 진행을, 일반 활동이 *점진적* 진행을 담당한다. 보스 처치 한 번이 일반 활동 250회분과 같다. 이는 "보스를 잡아야 다음 단계로 간다"의 정량적 표현.

#### Recovery 단계 (Recovery Stages)

| 단계 | Recovery % | 의미 |
| :--- | :---: | :--- |
| Stage 0 | 0% | Unknown — 정체불명 |
| Stage 1 | 25% | 직업/용도 확인 |
| Stage 2 | 50% | 소속 확인 |
| Stage 3 | 75% | 운명/별명 확인 |
| Stage 4 | 100% | 진명 확인 — 인생 완전 복원 |

**레어리티별 Stage 수 조정:**

| 레어리티 | 지층 수 | Stage 수 | 각 보스 처치 시 Recovery 증가 |
| :--- | :---: | :---: | :---: |
| Normal | 1 | 2 (Stage 0 → Stage 4) | 100% (1번의 발견으로 완전 복원) |
| Magic | 2 | 3 (Stage 0 → 2 → 4) | 50% per boss |
| Rare | 3 | 4 (Stage 0 → 1 → 2 → 4) | 33% per boss (마지막 보스 = 34%) |
| Legendary | 4 | 5 (Stage 0 → 1 → 2 → 3 → 4) | 25% per boss |
| Ancient | 4+심연 | 5 + Abyss | 25% per boss + 심연 5% × N (재다이브 영역) |

> **Normal 특례 (DEC-039 정합):** Normal 등급은 1지층 단일 다이브. 1번의 보스 처치로 Stage 0 → Stage 4 직접 점프. 짧고 강렬한 인생 한 편.

### §2.2. 이름 진화 (Name Evolution)

각 Stage에 도달하는 순간 아이템의 *표시 이름* 이 변한다. 이는 시각/시스템적으로 가장 즉각적인 *발견의 체감* 이다.

#### 명명 규칙 (Naming Convention)

| Stage | 이름 패턴 | 측량사의 에코 쐐기 예시 |
| :--- | :--- | :--- |
| Stage 0 (Unknown) | `Unknown {category}` | `Unknown Wedge` |
| Stage 1 (직업/용도) | 직업/도구의 일반명 | `Survey Tool` |
| Stage 2 (소속) | 길드/조직명 + 도구명 | `Guild Survey Tool` |
| Stage 3 (운명/별명) | 별명/사건명 + 정관사 | `The Last Wedge` |
| Stage 4 (진명) | 인물 + 본질 (완전한 진짜 이름) | `Surveyor's Echo Wedge` |

> **명명 SSoT:** `Sheets/Content_Item_Master.csv` 의 각 아이템 행에 `nameStage0` ~ `nameStage4` 5개 컬럼 추가. 무기 디자이너는 5개 이름을 모두 작성해야 한다.

#### 인벤토리 표시 규칙

- 인벤토리 그리드의 아이템 이름은 *현재 Stage* 의 이름으로 표시
- Identity Archive에는 *Stage 4 진명* 으로 항목 등록 (단, 미복원 인물은 *Stage 0 Unknown* 으로 등록)
- 같은 종류의 무기 2개가 인벤토리에 있고 한쪽만 Stage 4 도달 시: 표시 이름이 다르므로 자연 구분

### §2.3. Memory Fragment (문장) — 보스 보상의 본체

지층 보스 처치 시 ATK +N이 아니라 **한 문장의 Memory Fragment** 가 해금된다. 이것이 보상의 본체다.

#### Fragment 구조

```yaml
Fragment:
  id: string                # 예: "F_SURVEYOR_LAST_WEDGE"
  itemId: string            # 소속 아이템
  stageUnlock: 1-4          # 어느 Stage에 해금되는가
  textKey: i18n_key         # i18n 텍스트 키
  narrativeRole: "core"     # core(필수) / branch(선택)
  identityTrait:            # 이 단편이 가동시키는 정체성 결
    name: "끝을 보는 결"
    effect: "처치 시 ATK 5% 누적 (최대 25%, 피격 시 50% 감소)"
    flavor: "보고서보다 답을 우선하는 충동"
```

#### Fragment 예시 (측량사의 에코 쐐기)

| Stage | Fragment 텍스트 | Identity Trait |
| :--- | :--- | :--- |
| 1 | "두드리고 듣는다. 그게 전부였어." | 공명의 결 — 약점 노출 적에 ATK +12% |
| 2 | "균열은 거짓말을 하지 않아. 사람만 거짓말을 하지." | (Stage 1과 통합 가동) |
| 3 | "위에 있는 사람들은 보고서를 원했어. 나는 답을 원했어." | 끝을 보는 결 — 처치 시 ATK 5% 누적 |
| 4 (Fire) | **"보고하지 않은 건 비밀이어서가 아니야. 끝을 보고 싶었을 뿐이야."** | 측량사의 정체성 핵 — 격벽 인접 시 INT +8% |

> **설계 원칙:** Stage 4 Fragment는 *Fire 모멘트* 다. 그 인생을 한 문장으로 응축한 것. 작성 가이드는 `Documents/System/System_ItemNarrative_Template.md` 참조.

### §2.4. 정체성 결 (Identity Trait) — 무기의 모든 스킬

이전 시스템의 *Active/Passive 단편*, *5색 기질 적합성*, *효과 변이* 는 모두 폐기. 무기의 모든 스킬·효과는 **정체성 결의 합** 이다.

#### 결의 구조

각 정체성 결은 단일 효과 + 단일 발동 조건 + 단일 플레이버를 가진다.

```yaml
IdentityTrait:
  id: string
  triggerCondition: "always" | "on_hit" | "on_kill" | "on_dodge" | ...
  effect:
    type: "atk_multiplier" | "stat_bonus" | "behavior_change" | ...
    value: number
    cap?: number
  flavor: string             # 결의 정서적 의미
```

#### 가동 규칙

- **Stage 1 Fragment 해금** → Identity Trait 1 가동
- **Stage 2 Fragment 해금** → Identity Trait 2 가동 (1과 누적)
- ...
- **Stage 4 Fragment 해금** → Identity Trait 4 가동 (1+2+3+4 모두 누적)

> **레어리티별 결 수 = Stage 수.** Normal = 1결 / Magic = 2결 / Rare = 3결 / Legendary = 4결 / Ancient = 4결 + Abyss 단편.

#### 빌드 다양성 확보

이전 시스템처럼 *단편 슬롯에 무엇을 끼우느냐* 의 빌드는 사라진다. 대신:

- **무기 선택 = 빌드 선택.** 300개 무기는 300개의 결 조합 = 300개의 빌드
- **무기 교체 = 빌드 교체.** 측량사의 에코 쐐기 (공명+끝을 보는 결+정체성 핵) ≠ 격벽 수리공의 망치 (수리의 결 + 인내의 결)
- **부분 복원 빌드.** Stage 2까지만 복원한 상태도 의도적 빌드가 될 수 있다 (특정 결만 원할 때)

### §2.5. Identity Archive (인물 아카이브)

무기 컬렉션과 별도로 *인물 컬렉션* 이 존재한다. 이것이 야리코미의 정서적 핵심이다.

#### 아카이브 구조

```
IDENTITY ARCHIVE
─────────────────────────────────────
[Unknown]    Surveyor      [측량사]
             격벽 측량사 길드
             100년 전 격벽 4 표면에 박힌 채 발견
             
             ◆ "보고하지 않은 건 비밀이어서가
                아니야. 끝을 보고 싶었을 뿐이야."
             
             Recovery: ████████████████ 100%

[Unknown]    Bulkhead Repairman  [격벽 수리공]
             ───────────────────────────────
             ░░░░░░░░░░░░░░░░ 0% (Unknown)

[Unknown]    Abyss Diver  [심연 잠수사]
             ───────────────────────────────
             ████░░░░░░░░░░░░ 25%
             ◆ "물의 아래에는 또 다른 위가 있어."
```

#### 아카이브 페이지 구성 요소

| 요소 | 내용 |
| :--- | :--- |
| 인물 명칭 | Stage 0 = `[Unknown]`, Stage 4 = `[진명]` |
| 직업 | Stage 1부터 표시 |
| 소속 | Stage 2부터 표시 |
| 발견 위치 | Stage 0부터 표시 (Origin §1.3) |
| 운명 한 줄 | Stage 3부터 표시 |
| Memory Fragment 목록 | Stage별 해금된 Fragment 전부 |
| Identity Trait 목록 | 해금된 결 전부 |
| Recovery 게이지 | 진행도 시각화 |
| 무기 아이콘 (소형) | 어떤 무기 안에 살았는가 |

#### 아카이브의 메타 컬렉션

- **인물 카테고리 분류**: 측량사 / 수리공 / 잠수사 / 운반자 / 기록관 / 단조공 / 경비병 / 해방파 / 수호단 ... (15-20 카테고리)
- **카테고리 100% 완성 시**: 카테고리 전체에 *연결망 단편(Echo Network)* 1개 해금. 예: *"모든 측량사들은 같은 일지 양식을 쓴다 — 30년 전부터 변하지 않았다."*

### §2.6. 재다이브 (Re-Dive)

100% Recovery 완성한 아이템도 재진입할 수 있다. 단, 이번엔 *다른 해석* 의 단편이 등장한다.

#### Re-Dive 규칙

| 회차 | Fragment 톤 | 예시 (측량사 Stage 4) |
| :---: | :--- | :--- |
| 1차 (최초) | 회한 / 침묵 | "보고하지 않은 건 비밀이어서가 아니야. 끝을 보고 싶었을 뿐이야." |
| 2차 (Re-Dive) | 자긍심 / 직업 윤리 재정의 | "측량의 본질은 보고가 아니라 답이야. 그걸 위에서 정해주지 않았을 뿐." |
| 3차 (Re-Dive×2) | 후회 / 가족의 시선 | "그날 일지에는 안 적었지만, 집에는 편지 한 통 두고 갔어." |

> **상한:** 인물당 최대 3회 Re-Dive. 3회 완료 = 그 인생의 *모든 면* 을 본 상태.

#### Re-Dive 동기 설계

플레이어가 재다이브하는 이유:
1. **인물 입체화** — 한 사람을 한 면으로 기억하지 않기 위해
2. **Identity Archive 완성** — 모든 단편 컬렉션 (1차+2차+3차)
3. **Effective Stat 미세 상향** — Re-Dive 1회당 effective stat 곱셈 보너스 +5% (선택적 야리코미 깊이)

### §2.7. Echo Network (인물 간 연결망)

세계관 인물들은 서로를 알았다. 측량사와 격벽 수리공은 길드 동료였다. 두 인물의 *진명* 을 모두 알게 되면 연결망이 활성화된다.

#### 연결망 단편 (Network Fragment)

| 조건 | 결과 |
| :--- | :--- |
| 인물 A, B 모두 Stage 4 도달 | A↔B 관계의 *Network Fragment* 1개 해금 |
| 같은 카테고리 인물 5명 모두 Stage 4 | 카테고리 *Echo Chord* 해금 (예: 측량사 5명 → 측량사 길드 전체 단편) |
| 30명 이상 Stage 4 | 시대 *Era Echo* 해금 (예: 100년 전 격벽 측량사 길드의 마지막 해) |

#### Network Fragment 예시

> **측량사 × 격벽 수리공:**
> *"같이 술 마시던 사이였어. 측량사가 사라진 그날 밤도, 수리공은 그가 술집에 오지 않은 걸 이상하게 생각하지 않았어 — 측량사는 원래 약속을 잘 어겼으니까."*

### §2.8. 스탯 = Recovery의 부산물

스탯 게이트는 유지된다. 단, 스탯은 *Recovery에서 파생* 된다.

#### 공식

```
effectiveATK = baseATK × (0.4 + Recovery × 0.006) × rarityMultiplier
effectiveINT = baseINT × (0.4 + Recovery × 0.006) × rarityMultiplier
effectiveHP_bonus = baseHP × (0.4 + Recovery × 0.006) × rarityMultiplier
```

> **⚠️ 구현 노트 (2026-05-24):** `Sheets/Content_Stats_Weapon_List.csv` 의 `BaseATK` 는 **rarity 배율이 사전 적용된 최종값** 으로 저장된다 (예: `sword_ancient.BaseATK = 45 = 15 × 3.0`). 따라서 *코드 측 실제 계산* 은 `rarityMultiplier` 항을 곱하지 *않는다*.
>
> **2026-05-24 폴백 공식 (Phase 2 임시):**
> ```
> effectiveStat = csvBaseStat × (1.0 + Recovery × 0.005) × (1 + reDive × 0.05)
> ```
> - Recovery 0% → ×1.0 (구 시스템 호환)
> - Recovery 50% → ×1.25
> - Recovery 100% → ×1.5 (구 시스템 Lv15+보너스와 거의 동등)
>
> **의미 재해석:** 본래 DEC-046 정의("100% = 본래 잠재력")는 baseStats × 2.0 상향이 결정되면 복귀. 현재 폴백은 *Recovery를 +50% 부가 표출* 로 해석. 정서적 정의(복원=해방)는 유지.

| Recovery | 효과 배율 |
| :---: | :---: |
| 0% | 40% (잠재력의 절반 미만) |
| 25% | 55% |
| 50% | 70% |
| 75% | 85% |
| 100% | 100% (잠재력 완전 발현) |

> **설계 의도:** 무기는 *원래의 힘* 을 가지고 있다. 단, 그 힘은 사용자가 무기의 기억을 *이해* 했을 때 발현된다. 강화가 아니라 *해방* 이다.

#### Re-Dive 추가 보너스

Re-Dive 1회마다 effective stat 배율에 +5% 곱셈. (1회 = ×1.05, 2회 = ×1.10, 3회 = ×1.15)

### §2.9. 폐기된 메커닉 (전 시스템과의 비교)

| 폐기 항목 | 폐기 이유 | 대체 방식 |
| :--- | :--- | :--- |
| 일반 단편 5색 기질 (Forge/Iron/Rust/Spark/Shadow) | 빌드 시스템이 *수치 조합* 게임이 되면 서사가 부산물화. 무기 = 인물 = 빌드 일체화 정합 ↓ | 정체성 결이 모든 효과를 결정. 색은 *시각 토큰* 으로만 잔존 가능 |
| Active/Passive 슬롯 역할 분리 | 같은 단편이 다른 역할로 끼우면 빌드 조합 폭발 — 무기의 *인격* 이 흐려짐 | 정체성 결은 항상 *상시 가동* (전투 발동 조건은 결 자체에 포함) |
| 단편 전이 (Transfer) + 효과 변이 | "Berserker [Forge] → Rust 무기로 전이하면 녹슨 분노로 변이" — 매력적이지만 인물 동질성 파괴 | Re-Dive로 대체. 다른 *해석* 을 받지만 *다른 인물의 단편으로 변형* 되지는 않음 |
| 단편 합성 (Bond) — 동색 동형 레벨 합산 | 단편 = 수치 자원의 패턴. 서사 자원으로 재정의되면 합성 의미 없음 | Identity Archive 완성 (인물 100% + Re-Dive 3회) 로 대체 |
| 단편 분해 → Remnant Fragment → 레어리티 승급 | 레어리티 승급 자체 폐기 (DEC-046). 인물 카테고리 100% 완성으로 대체 | Echo Network 해금 |
| Forgotten / Recalled 이분법 + 50%/100% 효과 배율 | "단편이 적 NPC로 출현 → 격파 = 회상" 구조는 강력하지만, *문장* 보상과 어울리지 않음 | 보스 처치 = Memory Fragment 직접 해금. 잡몹은 점진 Recovery 누적 |

> **마이그레이션:** 이미 작성된 CSV의 단편 데이터(`Sheets/Content_MemoryShards.csv`)는 *주변 인물의 잔향* 으로 재해석될 수 있다 (예: Berserker 단편 → 분노한 격벽 수리공의 잔향). 단, 이는 P2 작업이며 본 결정에서 우선 폐기 처리.

---

## §3. 콘텐츠 (Content)

### §3.1. 인물 카테고리 (1차 18개)

| # | 카테고리 | 영문 | 대표 무기 | 환경 |
| :-: | :--- | :--- | :--- | :--- |
| 1 | 측량사 | Surveyor | 측량사의 에코 쐐기 (CNT-ITM-001) | 격벽 회랑 |
| 2 | 격벽 수리공 | Bulkhead Repairman | (예정) | 격벽 표면 |
| 3 | 심연 잠수사 | Abyss Diver | (예정) | 심연 수로 |
| 4 | 케이블 운반자 | Cable Bearer | (예정) | 수직 케이블 통로 |
| 5 | 도면 기록관 | Drafting Archivist | (예정) | 기록 침전소 |
| 6 | 단조공 | Forge Smith | (예정) | 옛 단조소 폐허 |
| 7 | 경비병 | Guard | (예정) | 중앙 성채 외곽 |
| 8 | 해방파 연구원 | Liberation Researcher | (예정) | 마법 연구소 폐허 |
| 9 | 수호단 | Wardens | (예정) | 카타콤 |
| 10 | 빙결 보존사 | Cryo-Keeper | (예정) | 빙결 동굴 |
| 11 | 관측자 | Observer | (예정) | 천공의 탑 |
| 12 | 신호수 | Signaller | (예정) | 격벽 5 |
| 13 | 측량사 가족 | Surveyor's Kin | (예정) | 외곽 거주구 |
| 14 | 행상인 | Traveling Merchant | (예정) | 격벽 사이 |
| 15 | 의약사 | Apothecary | (예정) | 기록 침전소 |
| 16 | 음악가 | Musician | (예정) | 중앙 성채 |
| 17 | 광부 | Miner | (예정) | 결정질 광맥 |
| 18 | 카엘 오르스 동시대 영웅들 | Era 3 Heroes | (예정) | 심연의 구 |

### §3.2. Stage 4 Fragment 작성 원칙

Stage 4 (진명 해금)의 Fragment는 *Fire 모멘트* 다. 다음 원칙을 준수한다:

1. **한 문장** — 두 문장 이상 금지. 응축이 본질
2. **현재형 또는 과거형 1인칭** — 인물이 직접 말한다
3. **설명 금지** — 보여줘야 한다. *"그는 외로웠다"* 가 아니라 *"그날 일지에는 안 적었지만, 집에는 편지 한 통 두고 갔어."*
4. **모순/긴장 포함** — 한 면만 보여주지 않는다. *"보고하지 않은 건 비밀이어서가 아니야. 끝을 보고 싶었을 뿐이야"* 는 직업 윤리 위반과 인간적 충동을 동시에 담는다
5. **세계관 단어 1개 이상** — *격벽*, *측량*, *심연*, *기록* 등. 인물이 그 시대 그 직업의 사람임을 증명

상세 작성 가이드: `Documents/System/System_ItemNarrative_Template.md`

---

## §4. 연동 (Integration)

### §4.1. 아이템계 연동

| 연동 지점 | 방향 | 세부 규칙 |
| :--- | :--- | :--- |
| 지층 보스 처치 | IW → MEM | Memory Fragment 1개 해금 + Recovery 단계 점프 + 이름 진화 트리거 |
| 일반 적/방 클리어 | IW → MEM | Recovery 0.1-0.3% 점진 누적 |
| 환경 오브젝트 상호작용 | IW → MEM | Recovery 0.5-1.0% (서사 오브젝트 한정) |
| Re-Dive 진입 | IW → MEM | 단편 해석 톤 변경 시드 갱신 |

### §4.2. 장비 시스템 연동

장비 데이터 구조에 *Memory Fragment* 와 *Identity Trait* 가 귀속된다.

```yaml
ItemInstance:
  uid: number
  def: WeaponDef
  rarity: Rarity
  memoryRecovery: number          # 0.0 ~ 100.0
  unlockedFragments: FragmentId[] # 해금된 Fragment 목록
  reDiveCount: number             # 0 ~ 3
  reDiveFragments: FragmentId[]   # Re-Dive 단편 (회차별)
  # --- DEPRECATED ---
  # level: number               # 폐기
  # exp: number                 # 폐기
  # innocents: Innocent[]       # 폐기
```

### §4.3. 스탯 게이트 연동

```
게이트 판정 흐름:
  에르다가 게이트 접촉
    ↓
  게이트 타입 (ATK/INT) 확인
    ↓
  장착 장비의 effectiveStat 계산
    ↓
    effectiveStat = baseStat × (0.4 + Recovery × 0.006) × rarityMultiplier
    ↓
  effectiveStat ≥ GATE_THRESHOLD → 해금
```

> **UX 갱신:** 게이트 UI에 *"이 무기를 더 복원하면 열린다"* 표시 (기존 *"이 무기를 강화하면 열린다"* 폐기).

### §4.4. UI 연동

| UI 화면 | 표시 정보 |
| :--- | :--- |
| Inventory 그리드 | 셀에 현재 Stage 이름 + Recovery 게이지 (좌하단 4px 막대) |
| Inventory 중앙 칼럼 | Recovery % + 다음 Stage까지 남은 진행 + 현재 해금된 Fragment 목록 |
| Inventory 우측 칼럼 (Anvil 모드) | 지층 미니맵 + *"이 다이브에서 해금될 Fragment 미리보기"* (실루엣만) |
| Identity Archive | 별도 화면. 카테고리별 인물 목록 + 진행도 |
| Return Result | Fragment 해금 연출 (문장이 *타자기* 처럼 한 글자씩 등장) |

---

## §5. 밸런스 (Balance)

### §5.1. Recovery 진행 속도 목표

| 시나리오 | 목표 시간 |
| :--- | :--- |
| Normal 아이템 100% 복원 (단일 다이브) | 15-25분 |
| Magic 아이템 100% 복원 | 35-50분 |
| Rare 아이템 100% 복원 | 50-70분 |
| Legendary 아이템 100% 복원 | 90-120분 |
| Ancient 아이템 100% 복원 | 120-180분 + 심연 무한 |
| Identity Archive 18 카테고리 첫 인물 100% | 25-40시간 (메인 진행) |
| Identity Archive 100% (300명 전원) | 200-400시간 (야리코미) |

### §5.2. effective stat 배율 검증

레벨 10 Normal 검 (DEC-036 구 시스템) 대비 100% Recovery Normal 검 비교:

```
구 시스템 (Lv 10 Normal):
  ATK = 15 × 1.0 × (1 + 10 × 0.05) = 15 × 1.5 = 22.5 → 23

신 시스템 (100% Recovery Normal):
  ATK = 15 × 1.0 × (0.4 + 1.0 × 0.006 × 100) = 15 × 1.0 × 1.0 = 15

신 시스템 (100% Recovery Normal + boss 처치 영구 보너스 폐기):
  ATK = 15 ← 베이스 스탯 그대로
```

> **수치 갭 처리:** 구 시스템 대비 100% 시점에서도 50% 가까이 낮아진다. 이는 의도된 변경 — *강화* 가 아니라 *해방* 이므로 베이스 스탯 자체가 *원래 의도된 잠재력* 이어야 한다. 따라서 `Sheets/Content_Stats_Weapon_List.csv` 의 baseStats를 1.5-2배 상향 조정해야 한다. (별도 Phase 2 작업)

### §5.3. Fragment 작성 비용

300무기 × 평균 4 Fragment = 1,200개 문장. 작가가 작성해야 할 양:

- **MVP (Phase 2):** 5무기 × 4 Fragment = 20개 문장 (Stage 4 = 5개의 Fire 모멘트)
- **Beta (Phase 3):** 100무기 × 4 Fragment = 400개 문장
- **Launch (Phase 4):** 300무기 × 4 Fragment + Re-Dive × 3 × 300 = 1,200 + 900 = 2,100개 문장
- **Network Fragment:** 인물 간 관계 30-50쌍 = 30-50개 문장

> **작가 SSoT:** `Sheets/LoreTexts/Fragments/{itemId}.md` (신규 디렉토리).

---

## §6. 수용 기준 (Acceptance Criteria)

### 기능 기준

- [ ] 아이템 인스턴스에 `memoryRecovery: number` 필드 존재 (0.0 ~ 100.0)
- [ ] 보스 처치 시 Fragment 해금 + Recovery 단계 점프 동시 발생
- [ ] 일반 적 처치/방 클리어 시 Recovery 점진 누적 (0.1-0.3%)
- [ ] Stage 변경 시 아이템 이름이 변함 (nameStage0~4)
- [ ] 정체성 결이 Stage에 비례하여 가동 (Stage N = Trait 1~N 누적)
- [ ] effectiveStat = baseStat × (0.4 + Recovery × 0.006) × rarityMultiplier 적용
- [ ] Identity Archive 화면에 카테고리별 인물 목록 표시
- [ ] Identity Archive에 해금된 Fragment 전부 영구 보존
- [ ] 100% Recovery 아이템 재진입 시 Re-Dive 모드 진입
- [ ] Re-Dive 시 다른 해석의 Fragment 등장

### 체험 기준

- [ ] Stage 4 Fragment 해금 순간이 *지층 클리어의 정점* 으로 느껴지는가 (수치 보상보다 강한가)
- [ ] 다음 다이브 선택 시 *"케이블 운반자 이야기가 궁금하다"* 가 *"Legendary 검을 키우고 싶다"* 보다 자주 나오는가
- [ ] 인물 이름이 변하는 순간(Stage 1 → 2 등)이 시각적으로 즉각 인지되는가
- [ ] Identity Archive 페이지를 *자발적으로* 다시 열어보는가
- [ ] 100% 복원 후 *다음 인물* 로 자연스럽게 이동하는가 (시스템 강제 없이)
- [ ] effective stat이 100% 시점에 *해방감* 으로 느껴지는가 (강화 누적이 아닌)

---

**작성자:** Systems Designer (DEC-046 반영)
**최종 업데이트:** 2026-05-24
**변경 이력:**
- 2026-05-24: DEC-046 전면 재작성 — Memory Recovery 패러다임 전환. 5색 기질·전이/합성·효과 변이 폐기. Memory Fragment + Identity Trait + Identity Archive + Name Evolution 도입.
- 2026-04-28: DEC-036 (구버전) — 기억 단편 시스템 도입. 5색 기질, Active/Passive 슬롯, 효과 변이.

**다음 단계:**
1. `Sheets/Content_Item_Master.csv` 에 `nameStage0~4` 5개 컬럼 추가
2. `Sheets/Content_Stats_Weapon_List.csv` baseStats 1.5-2배 상향 (effective stat 갭 보정)
3. `Sheets/LoreTexts/Fragments/` 디렉토리 신설 + 측량사의 에코 쐐기 4 Fragment 작성
4. Identity Archive UI 명세 작성 (`Documents/UI/UI_Identity_Archive.md` 신규)
