# [밸런스 주제] ([Balance Topic])

## 0. 필수 참고 자료 (Mandatory References)

* Project Overview: `Reference/게임 기획 개요.md`
* Writing Rules: `.claude/skills/metroidvania-gdd/references/writing-rules.md`
* [관련 시스템]: `[경로]`

---

## 구현 현황 (Implementation Status)

> 최근 업데이트: YYYY-MM-DD
> 문서 상태: `작성 중 (Draft)` / `진행 중 (Living)` / `완료 (Stable)`

| 기능 ID | 분류 | 기능명 (Feature Name) | 우선순위 | 구현 상태 | 비고 (Notes) |
| :--- | :--- | :--- | :---: | :--- | :--- |
| BAL-01-A | 밸런스 | [기능명] | P1 | 작성 중 | [비고] |

---

### 적용 공간 (Applicable Space)

| 공간 | 적용 여부 | 비고 |
| :--- | :---: | :--- |
| World | O/X | [설명] |
| Item World | O/X | [설명] |
| Hub | O/X | [설명] |

---

## 1. 개요 (Concept)

### 의도 (Intent)

> [이 밸런스 시스템의 목적. 어떤 플레이어 경험을 만드는가]

### 설계 목표 (Design Goals)

- 목표 1: [구체적 수치 목표]
- 목표 2: [구체적 수치 목표]
- 목표 3: [구체적 수치 목표]

---

## 2. 핵심 수식 (Core Formulas)

### [수식 이름] ([Formula Name])

```
[변수명] = [수식]

예시:
Final_Damage = (Base_Damage * Weapon_Multiplier + Flat_Bonus) * (1 + Crit_Multiplier * Is_Crit) * Element_Modifier
```

#### 변수 정의

| 변수 | 설명 | 범위 | 단위 | 출처 |
| :--- | :--- | :--- | :--- | :--- |
| Base_Damage | 기본 공격력 | [min~max] | _dmg | [CSV/시스템] |
| Weapon_Multiplier | 무기 배율 | [min~max] | _x | [CSV] |

---

## 3. 성장 곡선 (Growth Curves)

### [곡선 이름] ([Curve Name])

```yaml
# 성장 곡선 파라미터
Growth_Formula: "[수식]"    # 예: Base * (1 + Growth_Rate) ^ Level
Base_Value: 0               # 레벨 1 기준값
Growth_Rate: 0.0            # _% (레벨당 증가율)
Soft_Cap_Level: 0           # 성장률 감소 시작 레벨
Hard_Cap_Level: 0           # 최대 레벨
Diminishing_Factor: 0.0     # Soft Cap 이후 감쇠 계수
```

### 레벨별 수치 테이블

| 레벨 | [수치 A] | [수치 B] | [수치 C] | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | [값] | [값] | [값] | 시작점 |
| 10 | [값] | [값] | [값] | - |
| 25 | [값] | [값] | [값] | 중반 |
| 50 | [값] | [값] | [값] | Soft Cap |
| 75 | [값] | [값] | [값] | - |
| 100 | [값] | [값] | [값] | Hard Cap |

> SSoT: `[CSV 경로]`

---

## 4. 시뮬레이션 결과 (Simulation Results)

### 시나리오 A: [시나리오 설명]

조건:
- [입력 조건 1]
- [입력 조건 2]

결과:
- [결과 수치 1]
- [결과 수치 2]

### 시나리오 B: [시나리오 설명]

[동일 형식]

---

## 5. 밸런스 검증 포인트 (Balance Checkpoints)

| 검증 항목 | 기대값 | 허용 범위 | 측정 방법 |
| :--- | :--- | :--- | :--- |
| [항목 1] | [값] | [범위] | [방법] |
| [항목 2] | [값] | [범위] | [방법] |

### TTK (Time to Kill) 기준

| 상황 | 목표 TTK | 허용 범위 |
| :--- | :--- | :--- |
| 일반 몬스터 (동일 레벨) | [N]초 | [범위] |
| 엘리트 몬스터 | [N]초 | [범위] |
| 보스 (솔로) | [N]분 | [범위] |
| 보스 (4인 파티) | [N]분 | [범위] |

---

## 6. 공간별 밸런스 차이 (Space-specific Balance)

| 파라미터 | World | Item World | 비고 |
| :--- | :--- | :--- | :--- |
| [파라미터 1] | [값] | [값] | [차이 이유] |
| [파라미터 2] | [값] | [값] | [차이 이유] |

---

## 7. 조정 가이드 (Tuning Guide)

### 문제 상황별 조정 방법

| 문제 | 조정 파라미터 | 방향 | 영향 범위 |
| :--- | :--- | :--- | :--- |
| [문제 상황] | [파라미터명] | 증가/감소 | [영향받는 시스템] |

---

## 검증 기준 (Verification Checklist)

* [ ] 핵심 수식 코드 블록 내 작성
* [ ] 변수 정의 테이블 완전
* [ ] 성장 곡선 파라미터 YAML 분리
* [ ] 레벨별 수치 테이블 포함
* [ ] 시뮬레이션 시나리오 최소 2개
* [ ] 밸런스 검증 포인트 정의
* [ ] TTK 기준 명시
