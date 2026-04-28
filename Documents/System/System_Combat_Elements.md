# 원소 시스템 (Combat Element System)

## 구현 현황 (Implementation Status)

> 최근 업데이트: 2026-04-15
> 문서 상태: Draft
> 2-Space: 전체 (월드 + 아이템계)
> 기둥: 탐험 (주), 야리코미 (주), 멀티플레이 (부)
> 리서치: `Documents/Research/ElementalSystem_Comparison_Research.md`
> 의존: `System_Combat_Damage.md`, `System_Combat_Action.md`, `System_Memory Shard_Core.md`, `System_Coop_Synergy.md`

| 기능 ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 비고 |
|:---|:---|:---|:---:|:---|:---|
| ELM-01-A | 핵심 | 3원소 정의 (Fire/Ice/Thunder) | P1 | 보류 | Phase 2 알파 착수 |
| ELM-01-B | 핵심 | 원소 상성표 적용 | P1 | 보류 | ELM-01-A 선행 필요 |
| ELM-01-C | 핵심 | 원소 해금 (월드 보스 연동) | P1 | 보류 | Fire는 기본 해금 |
| ELM-02-A | 상태이상 | Burn (화상) 적용 및 DoT | P1 | 보류 | |
| ELM-02-B | 상태이상 | Freeze (빙결) 이동 불가 | P1 | 보류 | |
| ELM-02-C | 상태이상 | Shock (감전) 행동 속도 감소 | P1 | 보류 | |
| ELM-03-A | 적 속성 | 적 원소 속성 분류 테이블 | P1 | 보류 | CSV 참조 |
| ELM-04-A | 장비 | 무기별 Echo 인챈트 원소 부여 | P1 | 보류 | `System_Combat_Action.md` §2.2-A |
| ELM-05-A | 아이템계 | 층별 원소 환경 타일 | P2 | 보류 | Phase 2-3 |
| ELM-05-B | 아이템계 | 원소 인챈트 × 드롭 가중치 | P2 | 보류 | Phase 3 평가 |
| ELM-06-A | 기억 단편 | 원소 기억 단편 (Burner/Freezer/Shocker) | P2 | 보류 | `System_Memory Shard_Core.md` |
| ELM-07-A | Co-op | 원소 퓨전 (Steam/Plasma/CryoShock) | P3 | 보류 | `System_Coop_Synergy.md` §3.1 |

---

## 0. 개요 (Concept)

### 0.1. 설계 의도

ECHORIS의 원소 시스템은 한 문장으로 정의한다:

> "어떤 원소 Echo를 가지고 아이템계에 들어가느냐가 그 아이템계 경험 자체를 바꾼다."

원소는 전투 피해 배율 레이어(약점/저항)에 그치지 않는다. Echo 인챈트 선택 → 아이템계 내 원소 기억 단편 분포 → 인챈트 강화 → 더 강한 원소 공격의 순환 루프가 아이템계 스파이크를 직접 강화한다.

3원소(Fire/Ice/Thunder) + 무속성(None)으로 구성된다. 원소 수는 PoE·Dead Cells가 검증한 "삼각 순환 상성의 최소 완전성"인 3종을 기준으로 한다. Dark(암) 원소는 삭제되었다. 풍(風) 원소도 삭제되었다 (재도입 금지).

**스파이크 검증:**

| 질문 | 답 |
|:---|:---|
| 이 시스템이 아이템계 진입 경험을 강화하는가? | Yes — 원소 선택이 어떤 아이템계에 들어갈지, 어떤 기억 단편가 등장할지를 결정 |
| 이 시스템이 없으면 스파이크가 약해지는가? | Yes — 파밍 목표(원소 기억 단편)가 무차별화됨 |
| 이 시스템이 스파이크를 희석시키지 않는가? | Yes — 원소는 아이템계 경험의 내부 레이어이지 별도 공간이 아님 |

### 0.2. 설계 근거

| 결정 | 근거 |
|:---|:---|
| 3원소 (Fire/Ice/Thunder) | PoE·Dead Cells 검증. 삼각 순환 상성. 학습 비용 최소, 밸런싱 관리 가능 |
| Dark 원소 삭제 | 세계관 연결 부재. 5원소 시 밸런싱 복잡도 급증. 재도입 금지 항목 |
| 원소 적중률 100% | 확률 기반 상태이상은 "운 나쁨" 불쾌 경험 생성. 배율로 효과를 제어 |
| 보스 약점 배율 1.5x (일반 2.0x) | 원소 교체로 보스전 난이도가 과도하게 왜곡되는 것을 방지 |
| 원소 해금 = 월드 보스 게이트 | 탐험 → 능력 획득 순환. 첫 30분에 Fire만 존재하여 학습 비용 최소화 |
| 동원소 0.5x 페널티 | "같은 원소로 덮어쓰기"를 막고 원소 다양성을 유도 |
| 저항 최하한 0.5x (면역 금지) | Diablo 2 원소 면역 문제 교훈. 0 데미지는 무력감 유발 |

### 0.3. 3대 기둥 정렬

| 기둥 | 원소 시스템의 기여 |
|:---|:---|
| 탐험가 | 원소 해금이 월드 보스 처치의 보상. "이 보스를 잡으면 새 원소를 얻는다" |
| 장인 | 원소별 기억 단편(Burner/Freezer/Shocker) 수집이 야리코미 파밍 목표를 세분화. 원소 Echo × 아이템계 = 특화 빌드 완성 |
| 모험가 | Co-op 원소 퓨전(Fire+Thunder=Plasma 등)이 파티 시너지의 핵심 하이라이트 |

### 0.4. 저주받은 문제 검증

| 문제 | 해결 방향 |
|:---|:---|
| "약점 원소 없으면 비효율" vs. "모든 빌드가 유효해야 한다" | 원소 배율 차이(0.5x-2.0x)를 "유의미하지만 극단적이지 않게" 설정. 보스는 1.5x로 상한 제한. 무속성 물리 빌드는 DEF 관통 스킬로 보완 |
| "원소 기억 단편 필수" vs. "기억 단편 조합 자유" | 원소 기억 단편는 인챈트 강화 보조. 원소 공격 활성화 조건이 아님. 없어도 기본 원소 공격 가능 |
| "Co-op 퓨전 필수" vs. "솔로도 전부 가능" | 퓨전은 솔로에서도 인챈트 전환으로 가능. 단, 전환 딜레이로 인해 2인이 더 효율적. 강제 의존 없음 |

### 0.5. 위험과 보상

| 빌드 전략 | 위험 | 보상 |
|:---|:---|:---|
| 단일 원소 집중 | 저항 적에게 0.5x 피해. 원소 전환 불가 시 비효율 구간 발생 | 해당 원소 기억 단편 공명 보너스. 아이템계 원소 환경 시너지 |
| 원소 없는 물리 빌드 | 원소 상태이상(Burn/Freeze/Shock) 부재. Co-op 퓨전 기여 불가 | DEF 관통 스킬로 일관된 물리 딜. 원소 저항 고적 상대 시 유리 |
| 멀티 원소 혼용 | Echo 인챈트 전환 딜레이 발생. 원소 기억 단편 분산 | 다양한 상황 대응. 퓨전 솔로 발동 가능 |

---

## 1. 원소 정의 (Element Definitions)

### 1.1. 3원소 + 무속성

| 원소 | 영문 | 색상 | 해금 조건 | 상태이상 |
|:---|:---|:---|:---|:---|
| 화 | Fire | `#FF4400` | 게임 시작 (Echo 기본 내장) | Burn (화상) |
| 빙 | Ice | `#44AAFF` | 월드 보스 처치 (2번째 원소) | Freeze (빙결) |
| 뇌 | Thunder | `#FFEE00` | 월드 보스 처치 (3번째 원소) | Shock (감전) |
| 무 | None | `#CCCCCC` | 기본 상태 (Echo 미적용) | 없음 |

> **원소 해금 순서:** Fire → Ice → Thunder. 월드 보스 처치 시 Echo가 해당 원소를 영구 흡수한다. 해금 순서와 구체적 보스 배치는 `System_Memory Shard_Core.md` §2.2 참조.

> **삭제 원소 (재도입 금지):** Dark (암), Wind (풍). 이 두 원소는 프로젝트 스파이크 축소 과정에서 삭제된 항목이다. 절대 재도입하지 않는다.

### 1.2. 원소 공격 활성화 조건

원소 공격은 Echo로 장착 무기에 인챈트를 적용할 때만 발생한다.

- **인챈트 미적용 (None):** 모든 공격이 물리 데미지. ATK - DEF 공식 적용.
- **인챈트 적용 (Fire/Ice/Thunder):** 해당 원소 데미지 공식 적용. INT × ElementMultiplier - RES. 상태이상 항상 발동.
- **원소 인챈트 전환:** 전투 중 Echo 조작으로 원소 전환 가능. 전환 딜레이는 `System_Combat_Action.md` §2.2-A 참조.

---

## 2. 원소 상성 (Elemental Affinity)

### 2.1. 삼각 순환 관계

```
Fire  → Ice    (화가 빙을 녹인다 → 약점)
Ice   → Thunder (빙이 뇌를 전도 차단한다 → 약점)
Thunder → Fire (뇌가 화를 폭발시킨다 → 약점)
```

각 원소는 다음 원소에 강하고, 이전 원소에 약하다. 동원소는 서로 약하다.

### 2.2. 원소 상성표

| 공격 \ 방어 속성 | Fire | Ice | Thunder | None |
|:---|:---:|:---:|:---:|:---:|
| **Fire** | 0.5x | 2.0x | 1.0x | 1.0x |
| **Ice** | 1.0x | 0.5x | 2.0x | 1.0x |
| **Thunder** | 2.0x | 1.0x | 0.5x | 1.0x |
| **None (물리)** | 1.0x | 1.0x | 1.0x | 1.0x |

> 위 배율은 일반 적(Normal Enemy) 기준이다. 보스에 대한 원소 약점 배율은 2.0x가 아닌 **1.5x**로 상한이 제한된다. 원소 교체 한 번으로 보스 난이도가 과도하게 왜곡되는 것을 방지하기 위한 설계이다.

### 2.3. 배율 정의

| 구분 | 배율 (일반 적) | 배율 (보스) | 상태이상 지속시간 | 조건 |
|:---|:---:|:---:|:---:|:---|
| 약점 (Weakness) | 2.0x | 1.5x | ×1.5 | 공격 원소가 방어 원소의 약점 |
| 중립 (Neutral) | 1.0x | 1.0x | ×1.0 | 무속성 물리, 또는 상성 없음 |
| 저항 (Resistance) | 0.5x | 0.5x | ×0.5 | 동원소, 또는 강한 원소 공격 |
| 저항 최하한 | 0.5x | 0.5x | — | 어떤 경우에도 0.5x 미만 불가 (면역 금지) |

> **면역 금지 원칙:** 적이 특정 원소에 완전 면역(0x)되는 경우는 존재하지 않는다. 저항 배율 최하한은 0.5x. Diablo 2의 원소 면역 시스템이 초래한 "해당 원소 빌드 플레이어의 콘텐츠 배제" 문제를 방지한다.

---

## 3. 상태이상 (Status Effects)

### 3.1. 상태이상 공통 규칙

1. 원소 공격 적중 시 해당 원소 상태이상이 **항상 발동** (100% 발동율. 확률 기반 아님).
2. 동일 상태이상은 **중첩되지 않는다**. 기존 지속시간을 갱신(Refresh)한다.
3. 서로 다른 상태이상은 동시에 최대 3개까지 적용 가능하다.
4. 상태이상 지속시간은 INT에 비례하여 스케일된다: `Duration = Base_Duration × (1 + INT × Int_Duration_Scale)`.
5. 약점 원소 상태이상: 지속시간 ×1.5. 저항 원소 상태이상: 지속시간 ×0.5.
6. 원소 공격은 절대 "Miss"하지 않는다. 저항 적에게도 배율이 적용된 피해가 발생한다.

### 3.2. 상태이상 상세

#### Burn (화상) — Fire 원소

| 항목 | 값 | 파라미터 |
|:---|:---|:---|
| 트리거 | Fire 인챈트 공격 적중 | — |
| 효과 | 지속시간 동안 초당 최대 HP의 X% 피해 | `burn_damage_per_sec` |
| 지속시간 (기본) | `burn_duration_s`초 | `burn_duration_s` |
| INT 스케일 | `Duration = burn_duration_s × (1 + INT × Int_Duration_Scale)` | `Int_Duration_Scale` |
| 중첩 | 불가 (지속시간 갱신) | — |
| 시각 | 붉은 화염 파티클 | — |

> Burn은 DoT(Damage over Time). 순간 피해가 아닌 지속 피해이므로 보스전에서 안정적인 딜을 제공한다. 구체적 수치는 `Sheets/Content_System_Element_Params.csv` 참조.

#### Freeze (빙결) — Ice 원소

| 항목 | 값 | 파라미터 |
|:---|:---|:---|
| 트리거 | Ice 인챈트 공격 적중 | — |
| 효과 | 지속시간 동안 이동 불가. 피해 배율 X% 증가 (취약 상태) | `freeze_damage_bonus` |
| 지속시간 (기본) | `freeze_duration_s`초 | `freeze_duration_s` |
| INT 스케일 | `Duration = freeze_duration_s × (1 + INT × Int_Duration_Scale)` | `Int_Duration_Scale` |
| 중첩 | 불가 (지속시간 갱신) | — |
| 예외 | 보스는 이동 불가가 아닌 이동속도 X% 감소로 대체 | `freeze_boss_slow_rate` |
| 시각 | 파란 결정체 파티클 | — |

> Freeze의 피해 배율 증가는 취약 상태(Vulnerable) 개념이다. 얼어 있는 적에게 주는 모든 피해(원소 포함)가 `freeze_damage_bonus`만큼 증가한다. 보스 이동 불가 면제는 "보스가 움직이지 않으면 재미없다"는 전투 설계 원칙에 따른다.

#### Shock (감전) — Thunder 원소

| 항목 | 값 | 파라미터 |
|:---|:---|:---|
| 트리거 | Thunder 인챈트 공격 적중 | — |
| 효과 | 지속시간 동안 행동 속도 X% 감소 (공격속도 + 이동속도 동시) | `shock_speed_reduction` |
| 지속시간 (기본) | `shock_duration_s`초 | `shock_duration_s` |
| INT 스케일 | `Duration = shock_duration_s × (1 + INT × Int_Duration_Scale)` | `Int_Duration_Scale` |
| 중첩 | 불가 (지속시간 갱신) | — |
| 시각 | 노란 전기 파티클 | — |

> Shock는 CC(군중 제어) 원소. 적의 공격 빈도를 줄여 생존에 기여한다. Dead Cells의 Shock가 인접 적에게 연쇄하는 것과 달리, ECHORIS의 Shock는 단일 대상에게만 적용된다 (절차적 생성 던전에서 연쇄 범위 제어 복잡도를 줄이기 위함).

---

## 4. 데미지 공식 연동 (Formula Integration)

원소 시스템은 `System_Combat_Damage.md`의 데미지 공식 내에 Element_Multiplier로 통합된다.

### 4.1. 원소 데미지 공식

```
Elemental_Damage = max(1, floor(
  (INT × Element_Multiplier - min(RES × RES_Factor, INT × RES_Absorption_Cap))
  × Critical_Multiplier
  × Level_Correction
  × Random(0.9, 1.1)
))
```

> 변수 정의 및 RES_Factor, RES_Absorption_Cap 수치는 `System_Combat_Damage.md` §2.6 참조.

### 4.2. Element_Multiplier 결정 로직

```
Element_Multiplier =
  if (AttackElement == DefenseElement):       Resistance_Multiplier   # 동원소: 0.5x
  elif (AttackElement beats DefenseElement):  Weakness_Multiplier     # 약점: 2.0x (일반) / 1.5x (보스)
  elif (DefenseElement beats AttackElement):  Resistance_Multiplier   # 저항: 0.5x
  else:                                        Neutral_Multiplier      # 중립: 1.0x
```

> 파라미터 값: `Sheets/Content_System_Element_Params.csv` 참조.

### 4.3. 파라미터 목록

```yaml
# Sheets/Content_System_Element_Params.csv 에서 관리
element_params:
  Weakness_Multiplier: 2.0        # 약점 배율 (일반 적)
  Weakness_Boss_Multiplier: 1.5   # 약점 배율 (보스)
  Resistance_Multiplier: 0.5      # 저항 배율 (최하한)
  Neutral_Multiplier: 1.0         # 중립 배율

  burn_duration_s: 3.0            # Burn 기본 지속시간 (초)
  burn_damage_per_sec: 0.03       # Burn 초당 피해 (최대 HP의 %)
  freeze_duration_s: 2.0          # Freeze 기본 지속시간 (초)
  freeze_damage_bonus: 0.20       # Freeze 취약 피해 배율 증가 (+20%)
  freeze_boss_slow_rate: 0.30     # 보스 Freeze 시 이동속도 감소율 (30%)
  shock_duration_s: 2.5           # Shock 기본 지속시간 (초)
  shock_speed_reduction: 0.40     # Shock 행동속도 감소율 (40%)
  Int_Duration_Scale: 0.005       # INT 1당 상태이상 지속시간 증가 비율
  Status_Max_Stack: 3             # 동시 적용 가능 상태이상 최대 수
  Fusion_Cooldown_s: 3.0          # 원소 퓨전 쿨다운 (적 1체당)
```

---

## 5. 무기 원소 부여 규칙 (Weapon Element Assignment)

### 5.1. Echo 인챈트 방식

원소는 무기 자체에 고정 부여되지 않는다. Echo 인챈트를 통해 플레이어가 장착 무기에 원소를 동적으로 부여한다.

| 규칙 | 내용 |
|:---|:---|
| 인챈트 적용 단위 | 장착 중인 무기 1개 |
| 인챈트 가능 원소 | 에르다가 해금한 원소만 선택 가능 (Fire 기본, Ice/Thunder는 보스 처치 후) |
| 전투 중 전환 | 가능. 전환 딜레이 존재 (`System_Combat_Action.md` §2.2-A 참조) |
| 인챈트 미적용 | 무속성(None) 물리 데미지 공식 적용 |

### 5.2. 아이템계 진입 시 원소 상태

아이템계 진입 시점의 Echo 인챈트 원소가 해당 아이템계의 **진입 원소**로 기록된다. 진입 원소는 아이템계 내 기억 단편 분포 및 층별 원소 환경 연동에 사용된다 (ELM-05-B, Phase 3 평가 항목).

> **현재 구현 범위 (Phase 2):** 진입 원소 기록은 구현하되, 드롭 가중치 연동(ELM-05-B)은 Phase 3 플레이테스트 데이터 기반으로 결정한다. 현재는 진입 원소 = 기억 단편 분포 가중치 없음.

### 5.3. 장비 고유 원소 어픽스 (Rare 이상)

Rare 이상 레어리티 장비는 고유 원소 어픽스를 보유할 수 있다.

| 어픽스 유형 | 효과 | 스택 방식 |
|:---|:---|:---|
| Elemental Damage +% | 해당 원소 데미지 ×(1 + bonus) | 곱산 (Echo 인챈트와) |
| Status Duration +% | 해당 원소 상태이상 지속시간 ×(1 + bonus) | 곱산 (INT 스케일과) |
| Elemental Resistance | 해당 원소 받는 피해 감소 | DEF/RES 별도 스탯 |

> 구체적 어픽스 목록 및 수치 범위: `Sheets/Content_Stats_Weapon.csv`, `Sheets/Content_Stats_Armor.csv` 참조.

---

## 6. 적 원소 속성 분류 (Enemy Element Classification)

### 6.1. 적 원소 속성 구조

모든 적은 하나의 **방어 원소 속성**과 하나의 **약점 원소 속성**을 가진다. 속성 없는(None) 적도 존재한다.

| 방어 속성 | 약점 | 저항 |
|:---|:---|:---|
| Fire | Ice | Thunder |
| Ice | Thunder | Fire |
| Thunder | Fire | Ice |
| None | 없음 | 없음 |

> 일반 규칙: 방어 속성과 같은 원소로 공격하면 0.5x(동원소). 삼각 관계에서 자신을 이기는 원소로 공격받으면 2.0x(약점). 자신이 이기는 원소로 공격받으면 0.5x(저항).

### 6.2. 적 원소 속성 분류 테이블

적별 구체적 속성은 `Sheets/Content_Stats_Enemy.csv`의 `elem_type` 및 `elem_weakness` 필드를 SSoT로 한다. GDD 본문에는 분류 기준만 기술한다.

| 분류 | 설명 | 예시 (층별 배분) |
|:---|:---|:---|
| Fire Type | 화염 속성 적. Thunder에 약함 | 아이템계 1-2지층 화염 환경 적 |
| Ice Type | 빙결 속성 적. Fire에 약함 | 아이템계 2-3지층 빙결 환경 적 |
| Thunder Type | 뇌 속성 적. Ice에 약함 | 아이템계 3-4지층 뇌 환경 적 |
| None Type | 무속성 적. 원소 상성 없음 | 중립 층, 월드 일반 적 |
| Mixed | 원소 없는 고난이도 적. DEF/HP가 높음 | 보스, 엘리트 |

> **월드 vs. 아이템계:** 월드 일반 적은 대부분 None Type. 원소 속성 적은 아이템계 층별 테마에서 집중적으로 등장한다.

### 6.3. 보스 원소 처리

| 보스 유형 | 원소 약점 배율 | 상태이상 |
|:---|:---|:---|
| 월드 보스 | 1.5x (약점 원소) | 상태이상 적용되나 지속시간 50% |
| 아이템 장군 | 1.5x | 상태이상 적용되나 지속시간 50% |
| 아이템 왕/신/대신 | 1.5x | 상태이상 지속시간 25% (내성 강함) |

---

## 7. 아이템계 원소 연동 (Item World Element Integration)

### 7.1. 층별 원소 환경 타일 (ELM-05-A, Phase 2-3)

아이템계 층은 원소 테마를 가질 수 있다. 층 생성 시 원소 타입이 배정되면 해당 원소 환경 타일이 포함된다.

> **Phase 2 범위:** 원소 환경 타일은 시각적 테마(색상/파티클)만 적용. 피해나 버프/디버프는 Phase 3 평가.
> **Phase 3 평가:** 원소 환경 타일이 해당 원소 공격에 반응하는지 여부 (예: 화염 타일 + Fire 공격 → 폭발 범위 피해) 플레이테스트 데이터 기반 결정.

| 환경 원소 | 타일 시각 | Phase 2 효과 | Phase 3 후보 효과 |
|:---|:---|:---|:---|
| Fire Zone | 붉은 용암 균열, 화염 파티클 | 없음 | 화염 공격 데미지 +10% / 비화염 적 Burn 지속시간 +0.5초 |
| Ice Zone | 파란 결빙 바닥, 눈 파티클 | 없음 | 빙결 공격 데미지 +10% / 바닥 미끄럼 (이동속도 110%) |
| Thunder Zone | 노란 전기 균열, 스파크 파티클 | 없음 | 뇌 공격 데미지 +10% / 금속 오브젝트 감전 연쇄 |

> LDtk 연동: 층별 원소 타입은 LDtk 방 엔티티의 `ElemType` 필드(PascalCase)로 관리. `World_ProjectAbyss_ItemStratum.ldtk` 참조.

### 7.2. 원소 기억 단편 분포

아이템계 내 원소 기억 단편(Burner/Freezer/Shocker)의 등장은 현재(Phase 2) 균등 분포이다.

- Phase 3 평가 항목(ELM-05-B): 진입 원소 = 해당 원소 기억 단편 가중치 상향. 예: Fire Echo로 진입 시 Burner 기억 단편 등장 확률 증가.
- 이 연동이 구현되면 원소 선택 → 아이템계 경험 → 기억 단편 특화 → Echo 강화 선순환 루프 완성.

> 상세 기억 단편 규칙: `System_Memory Shard_Core.md` §2.2 참조.

---

## 8. Co-op 원소 퓨전 (Co-op Elemental Fusion)

원소 퓨전은 2인 Co-op의 Tier 3 의도적 시너지(`System_Coop_Synergy.md` §3.1)이다. 본 섹션은 원소 시스템 관점의 상세 규칙을 정의한다.

### 8.1. 퓨전 발동 조건

1. 적에게 원소 A 상태이상이 활성 상태일 것.
2. 같은 적에게 원소 B 공격이 적중할 것 (A ≠ B).
3. 퓨전 쿨다운(`Fusion_Cooldown_s`) 이내에 재발동 불가 (적 1체 단위).
4. 발동 시 기존 상태이상 양쪽 소모(리셋).

### 8.2. 퓨전 조합표

| 원소 조합 | 퓨전명 | 효과 | 데미지 |
|:---|:---|:---|:---|
| Fire + Ice | Steam Blast (증기 폭발) | 범위(AoE) 피해 | 양측 관련 스탯 합산의 `fusion_steam_ratio` |
| Fire + Thunder | Plasma Surge (플라즈마 충격) | 단일 고데미지 + 스턴 `fusion_plasma_stun_s`초 | 양측 관련 스탯 합산의 `fusion_plasma_ratio` |
| Ice + Thunder | Cryo Shock (극저온 충격) | `fusion_cryo_slow_s`초간 이동속도 `fusion_cryo_slow_rate` 감소 | 양측 관련 스탯 합산의 `fusion_cryo_ratio` |

```yaml
# Sheets/Content_System_Element_Params.csv 에서 관리
fusion_params:
  fusion_steam_ratio: 1.50      # Steam Blast 합산 스탯 대비 배율
  fusion_plasma_ratio: 2.00     # Plasma Surge 배율
  fusion_plasma_stun_s: 1.0     # Plasma Surge 스턴 지속시간 (초)
  fusion_cryo_ratio: 1.20       # Cryo Shock 배율
  fusion_cryo_slow_s: 3.0       # Cryo Shock 슬로우 지속시간 (초)
  fusion_cryo_slow_rate: 0.80   # Cryo Shock 이동속도 감소율 (80%)
  Fusion_Cooldown_s: 3.0        # 퓨전 쿨다운 (적 1체당)
```

> **퓨전 데미지 기준:** 원소 A는 상태이상을 부여한 플레이어의 INT 기반. 원소 B는 퓨전을 발동한 플레이어의 INT/ATK 기반. 합산 방식 상세: `System_Coop_Synergy.md` §3.1.

### 8.3. 퓨전 킬 보상

원소 퓨전으로 적을 처치 시 레어리티 1등급 상향 확률 +`fusion_kill_rarity_bonus`%. (`System_Coop_Synergy.md` §4 루트 시스템 연동.)

### 8.4. 솔로 퓨전 가능성

솔로 플레이에서도 퓨전 발동은 가능하다. Echo 인챈트 전환으로 원소 A 상태이상 부여 후 원소 B로 전환하여 공격하면 발동. 단, 인챈트 전환 딜레이로 인해 2인 파티 대비 발동 효율이 낮다. 이것이 Co-op의 가치를 원소 퓨전 효율로 증명하는 설계이다.

---

## 9. 원소 기억 단편 연동 (Element Memory Shard Integration)

원소 기억 단편의 상세 규칙은 `System_Memory Shard_Core.md` §2.2에서 관리한다. 본 섹션은 원소 시스템 관점의 연동 계약만 정의한다.

### 9.1. 원소 기억 단편 종류

| 기억 단편명 | 연동 원소 | 강화 효과 |
|:---|:---|:---|
| Burner | Fire | Fire 인챈트 데미지 배율 +X%, Burn 지속시간 +X초 |
| Freezer | Ice | Ice 인챈트 데미지 배율 +X%, Freeze 지속시간 +X초 |
| Shocker | Thunder | Thunder 인챈트 데미지 배율 +X%, Shock 속도 감소율 +X% |

> 구체적 수치는 `System_Memory Shard_Core.md` §2.2 및 `Sheets/Content_System_Memory Shard_Pool.csv` 참조.

### 9.2. 원소 기억 단편 역할 한정

원소 기억 단편는 **인챈트 효과를 강화하는 역할**이다. 원소 공격의 활성화 조건이 아니다. 기억 단편 없이도 Echo 인챈트로 원소 공격 가능. 기억 단편는 보조 최적화 레이어이다.

### 9.3. Co-op 기억 단편 공명 연동

파티원 양쪽이 같은 원소 기억 단편(예: 양쪽 Burner)를 보유 시 기억 단편 공명 +20% 효과 발동. (`System_Coop_Synergy.md` §1.3 참조.)

---

## 10. 예외 처리 (Edge Cases)

| 시나리오 | 처리 규칙 |
|:---|:---|
| Ice 미해금 상태에서 Ice Echo 인챈트 시도 | 인챈트 불가. Fire로 강제 설정. UI에 "해금 필요" 알림 |
| 동일 원소 퓨전 시도 (Fire + Fire) | 퓨전 불발. 두 번째 공격은 일반 Fire 데미지 처리 |
| 상태이상 3개 활성 중 4번째 적용 시 | 가장 오래된 상태이상을 교체. FIFO(First In, First Out) |
| Freeze + Burn 동시 적용 | 허용. 두 상태이상 독립적으로 작동. 취소되지 않음 |
| 보스에게 Freeze 적용 시 | 이동 불가 대신 `freeze_boss_slow_rate` 이동속도 감소로 대체 |
| 원소 퓨전 쿨다운 중 같은 조합 시도 | 퓨전 불발. 두 번째 공격은 일반 원소 데미지 처리 |
| 적 사망 시 활성 상태이상 | 즉시 소멸. 사망 후 상태이상 데미지 발생 없음 |
| RES가 매우 높아 원소 데미지 = 0이 될 경우 | 최소 1 데미지 보장 (`max(1, ...)` 공식 내 처리) |
| 아이템계 접속 중단 시 원소 상태이상 | 재접속 시 상태이상 소멸. 전투 상태 비저장 |
| INT = 0인 경우 원소 데미지 | Elemental_Damage = max(1, 0 × multiplier - RES × factor) = 1 (최소 보장) |

---

## 11. 시스템 의존성 (Dependencies)

### 11.1. 이 시스템이 의존하는 것

| 의존 시스템 | 의존 내용 |
|:---|:---|
| `System_Combat_Damage.md` | 데미지 공식 (Element_Multiplier 변수 제공처). INT, RES, RES_Factor, Critical_Multiplier 정의 |
| `System_Combat_Action.md` §2.2-A | Echo 인챈트 입력 처리, 인챈트 전환 딜레이 |
| `System_Memory Shard_Core.md` §2.2 | 원소 기억 단편 강화 수치, 원소 해금 순서 |
| `System_Coop_Synergy.md` §3.1 | 원소 퓨전 발동 트리거, 퓨전 데미지 계산, 킬 보상 |
| `Sheets/Content_Stats_Enemy.csv` | 적별 `elem_type`, `elem_weakness` 필드 |
| `Sheets/Content_System_Element_Params.csv` | 모든 원소 파라미터 SSoT |
| LDtk `World_ProjectAbyss_ItemStratum.ldtk` | 층 타입 `ElemType` 필드 |

### 11.2. 이 시스템이 제공하는 것

| 제공 대상 | 제공 내용 |
|:---|:---|
| `System_Combat_Damage.md` | Element_Multiplier 값 (상성 계산 결과) |
| `System_Coop_Synergy.md` | 원소 상태이상 활성 여부 (퓨전 발동 조건) |
| `System_Memory Shard_Core.md` | 원소 인챈트 활성 원소 타입 (기억 단편 드롭 가중치 입력) |
| UI 시스템 | 현재 인챈트 원소, 적 원소 속성, 상태이상 아이콘 표시용 데이터 |

---

## 12. 수용 기준 (Acceptance Criteria)

### 12.1. 기능 기준

| ID | 기준 | 검증 방법 |
|:---|:---|:---|
| AC-ELM-01 | Fire 원소로 Ice 속성 적 공격 시 데미지가 Neutral 대비 2.0x | 유닛 테스트: Ice 적 ATK 100 공격, Neutral vs Fire 비교 |
| AC-ELM-02 | 동원소(Fire vs Fire 적) 공격 시 0.5x 적용 확인 | 유닛 테스트 |
| AC-ELM-03 | Freeze 발동 시 일반 적 이동 불가, 보스는 이동속도 감소 | QA 수동 검증 |
| AC-ELM-04 | 상태이상 3개 상한. 4번째 적용 시 가장 오래된 것 교체 | 유닛 테스트 |
| AC-ELM-05 | INT 증가 시 상태이상 지속시간이 Int_Duration_Scale에 따라 선형 증가 | 유닛 테스트 |
| AC-ELM-06 | 원소 퓨전(Fire+Thunder)이 발동하면 Plasma Surge 이펙트 + 스턴 발생 | QA 수동 검증 |
| AC-ELM-07 | 원소 미해금 시 해당 원소 인챈트 불가 처리 | 유닛 테스트 |
| AC-ELM-08 | RES가 극단적으로 높아도 최소 1 데미지 보장 | 유닛 테스트: RES=9999 세팅 |
| AC-ELM-09 | 보스 약점 배율이 2.0x가 아닌 1.5x로 제한됨 | 유닛 테스트 |

### 12.2. 경험 기준 (플레이테스트 검증)

| 기준 | 목표 |
|:---|:---|
| 원소 상성이 체감되는가? | 약점 원소 공격 시 데미지 차이가 플레이어에게 명확히 인지됨. "이거 약점이네"가 즉각 느껴질 것 |
| 원소 선택이 의미 있는 결정인가? | 아이템계 진입 전 원소를 고려하는 행동이 자연스럽게 발생할 것 |
| 상태이상이 전투 리듬을 방해하지 않는가? | Freeze로 인해 전투가 완전히 멈추는 불쾌 경험이 없을 것 |
| Co-op 퓨전의 하이라이트 순간이 있는가? | Plasma Surge 발동 시 파티 채팅에서 반응이 나올 것 |
| 원소 없는 물리 빌드가 유효한가? | 무속성 빌드로도 Phase 2 콘텐츠를 클리어할 수 있을 것 |

---

*관련 문서: `System_Combat_Damage.md` | `System_Combat_Action.md` | `System_Memory Shard_Core.md` | `System_Coop_Synergy.md`*
*데이터 SSoT: `Sheets/Content_System_Element_Params.csv` | `Sheets/Content_Stats_Enemy.csv`*
