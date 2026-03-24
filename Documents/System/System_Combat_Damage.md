# 데미지 시스템 (Combat Damage System)

## 구현 현황 (Implementation Status)

> **최근 업데이트:** 2026-03-23
> **문서 상태:** `작성 중 (Draft)`
> **3-Space:** 전체 (World + Item World + Hub는 전투 없음)
> **기둥:** 전체

| 기능 ID    | 분류       | 기능명 (Feature Name)                | 우선순위 | 구현 상태    | 비고 (Notes)                  |
| :--------- | :--------- | :----------------------------------- | :------: | :----------- | :---------------------------- |
| DMG-01-A   | 공식       | 기본 데미지 공식                     |    P1    | 📅 대기      | ATK/DEF 기반                   |
| DMG-01-B   | 공식       | 스킬 데미지 공식                     |    P1    | 📅 대기      | 스킬 배율 적용                 |
| DMG-01-C   | 공식       | 마법 데미지 공식                     |    P1    | 📅 대기      | INT/RES 기반                   |
| DMG-02-A   | 크리티컬   | 크리티컬 확률 시스템                 |    P1    | 📅 대기      | LCK 기반                       |
| DMG-02-B   | 크리티컬   | 크리티컬 배율 시스템                 |    P1    | 📅 대기      | 기본 1.5x + LCK 보너스        |
| DMG-03-A   | 원소       | 원소 상성 배율                       |    P1    | 📅 대기      | 6원소 상성표                   |
| DMG-03-B   | 원소       | 원소 상태이상 적용                   |    P2    | 📅 대기      | 원소별 고유 디버프             |
| DMG-04-A   | 방어       | 물리 방어력 감산 공식                |    P1    | 📅 대기      | DEF 기반                       |
| DMG-04-B   | 방어       | 마법 저항력 감산 공식                |    P1    | 📅 대기      | RES 기반                       |
| DMG-05-A   | 스케일링   | 아이템계 지층별 데미지 스케일링      |    P1    | 📅 대기      | 지층 보정 계수                 |
| DMG-05-B   | 스케일링   | 레벨 차이 보정                       |    P2    | 📅 대기      | 레벨 격차 배율                 |
| DMG-06-A   | UI         | 데미지 넘버 표시                     |    P1    | 📅 대기      | 색상/크기 차별화               |
| DMG-07-A   | 멀티       | 서버 데미지 검증                     |    P1    | 📅 대기      | 클라이언트 예측 + 서버 권위    |

---

## 0. 필수 참고 자료 (Mandatory References)

* Writing Standards: `Documents/Terms/GDD_Writing_Rules.md`
* Project Definition: `Documents/Terms/Project_Vision_Abyss.md`
* 전투 액션: `Documents/System/System_Combat_Action.md`
* 스탯 시스템: `Documents/System/System_Growth_Stats.md`
* 장비 시스템: `Documents/System/System_Equipment_Slots.md`
* 원소 상성: `Documents/System/System_Combat_Elements.md`
* 이노센트 시스템: `Documents/System/System_Innocent_Core.md`
* 데미지 공식 데이터: `Sheets/Content_System_Damage_Formula.csv`
* Game Overview: `Reference/게임 기획 개요.md`

---

## 1. 개요 (Concept)

### 1.1. 설계 의도 (Intent)

Project Abyss의 데미지 시스템은 다음 한 문장으로 정의한다:

> "눈에 보이는 성장이 수치로 증명되고, 아이템계 한 지층 한 지층이 체감되는 데미지"

데미지 공식은 캐릭터 성장(레벨, 장비, 이노센트)의 결과를 전투에서 직접 확인할 수 있어야 한다. 아이템계에서 장비를 한 지층 더 강화한 결과가 데미지 숫자로 즉시 체감되는 것이 핵심 설계 목표이다.

### 1.2. 설계 근거 (Reasoning)

| 결정                           | 근거                                                                                    |
| :----------------------------- | :-------------------------------------------------------------------------------------- |
| ATK - DEF 감산 방식            | 직관적. 공격력 100, 방어력 30이면 70이라는 예측 가능한 결과. 성장 체감이 명확            |
| 최소 데미지 1 보장             | 0 데미지는 플레이어의 무력감을 유발. 1이라도 피해를 주면 "느리지만 가능"이라는 희망 유지 |
| 원소 상성 배율                 | 전략적 장비/스킬 선택을 유도. 아이템계 진입 전 원소를 고려한 빌드 선택이 깊이를 제공     |
| 크리티컬을 LCK 기반으로        | LCK 스탯에 전투 가치를 부여. 스탯 게이트(비밀방 발견)와 전투 보상을 동시 제공            |
| 랜덤 분산 0.9~1.1              | 완전 고정 데미지는 기계적. 10% 분산으로 타격마다 미세한 변화를 주되 예측 가능성은 유지   |

### 1.3. 3대 기둥 정렬 (Pillar Alignment)

| 기둥                           | 데미지 시스템에서의 구현                                                                |
| :----------------------------- | :-------------------------------------------------------------------------------------- |
| Metroidvania 탐험              | 스탯 게이트 연동. 장비 스탯이 월드 진행의 열쇠. DEF가 낮으면 독 지대 통과 불가          |
| Item World 야리코미            | 아이템계 지층 클리어 = 장비 레벨업 = ATK/DEF 상승 = 데미지 숫자 증가. 성장의 직접 증거  |
| Online 멀티플레이              | 파티 역할에 따른 데미지 기여. DPS 미터로 역할 수행 확인. 보스 데미지 기여 보상           |

### 1.4. 저주받은 문제 검증 (Cursed Problem Check)

| 문제                                                    | 해결 방향                                                                  |
| :------------------------------------------------------ | :------------------------------------------------------------------------- |
| 레벨/장비 격차로 콘텐츠가 무의미해지지 않는가            | 아이템계 지층별 적 스케일링 + 레벨 차이 보정으로 항상 도전적인 전투 유지   |
| 이노센트 스태킹으로 데미지가 폭주하지 않는가             | 이노센트 레벨 상한 + 최종 데미지 캡으로 무한 성장을 제어                   |
| DEF가 너무 높으면 전투가 무한히 느려지지 않는가          | 방어 관통(Penetration) 스탯 + 최소 데미지 1 + 고정 피해 스킬로 해결       |
| 크리티컬이 너무 강하면 비크리티컬이 무의미해지지 않는가  | 크리티컬 배율 상한(3.0x) + 크리티컬 확률 상한(50%)으로 안정 딜의 가치 유지 |

### 1.5. 위험과 보상 (Risk & Reward)

| 전략             | 위험 (Risk)                            | 보상 (Reward)                              |
| :--------------- | :------------------------------------- | :----------------------------------------- |
| ATK 극대화 빌드  | DEF 부족으로 피격 시 대량 피해         | 최고 DPS, 빠른 지층 클리어                 |
| DEF 극대화 빌드  | 느린 딜, 긴 전투 시간                  | 생존성, 보스전 안정성                      |
| LCK 극대화 빌드  | 평균 딜 낮음, 확률 의존                | 크리티컬 폭발 딜, 비밀방 발견, 높은 드랍률 |
| 원소 특화 빌드   | 비상성 적에게 효율 감소                | 약점 적에게 2.0x 피해, 상태이상 부여       |
| 밸런스 빌드      | 어떤 분야에서도 최고가 아님            | 모든 상황에서 안정적                       |

---

## 2. 메커닉 (Mechanics)

### 2.1. 데미지 공식 아키텍처 (Damage Formula Architecture)

```mermaid
graph TD
    subgraph "입력 (Input)"
        ATK[공격자 ATK/INT]
        DEF[피격자 DEF/RES]
        SKM[스킬 배율]
        ELE[원소 배율]
        CRT[크리티컬 배율]
        RNG[랜덤 분산]
        LVL[레벨 보정]
        IW[아이템계 지층 보정]
    end

    subgraph "계산 (Calculation)"
        BASE[기본 피해 = ATK * 스킬배율 - DEF * 0.5]
        ELEM[원소 적용 = 기본 피해 * 원소배율]
        CRIT[크리티컬 적용 = 원소 피해 * 크리티컬배율]
        RAND[분산 적용 = 크리티컬 피해 * 랜덤(0.9~1.1)]
        LVLC[레벨 보정 적용]
        CLAMP[최소 1, 최대 캡 적용]
    end

    subgraph "출력 (Output)"
        FINAL[최종 데미지]
        DISP[데미지 넘버 UI]
        HP[대상 HP 감소]
    end

    ATK --> BASE
    DEF --> BASE
    SKM --> BASE
    BASE --> ELEM
    ELE --> ELEM
    ELEM --> CRIT
    CRT --> CRIT
    CRIT --> RAND
    RNG --> RAND
    RAND --> LVLC
    LVL --> LVLC
    IW --> LVLC
    LVLC --> CLAMP
    CLAMP --> FINAL
    FINAL --> DISP
    FINAL --> HP
```

### 2.2. 기본 데미지 공식 (Base Damage Formula)

#### 물리 데미지 (Physical Damage)

```
Physical_Damage = max(1, floor(
  (ATK * Skill_Multiplier - DEF * DEF_Factor)
  * Element_Multiplier
  * Critical_Multiplier
  * Level_Correction
  * Random(0.9, 1.1)
))
```

#### 마법 데미지 (Magic Damage)

```
Magic_Damage = max(1, floor(
  (INT * Skill_Multiplier - RES * RES_Factor)
  * Element_Multiplier
  * Critical_Multiplier
  * Level_Correction
  * Random(0.9, 1.1)
))
```

#### 고정 데미지 (True Damage)

```
True_Damage = floor(Fixed_Value * Level_Correction * Random(0.9, 1.1))
```

고정 데미지는 DEF/RES를 무시한다. 특정 스킬 또는 원소 시너지 효과에서만 발생한다.

### 2.3. 스탯 산출 공식 (Stat Calculation)

전투에서 사용되는 최종 스탯의 산출 과정. 상세 스탯 시스템은 `System_Growth_Stats.md`에서 정의한다.

```
Final_ATK = (Base_ATK + Level_Bonus_ATK) * Equipment_ATK_Multiplier + Innocent_ATK_Bonus + Buff_ATK
Final_DEF = (Base_DEF + Level_Bonus_DEF) * Equipment_DEF_Multiplier + Innocent_DEF_Bonus + Buff_DEF
Final_INT = (Base_INT + Level_Bonus_INT) * Equipment_INT_Multiplier + Innocent_INT_Bonus + Buff_INT
Final_RES = (Base_RES + Level_Bonus_RES) * Equipment_RES_Multiplier + Innocent_RES_Bonus + Buff_RES
```

| 요소                   | 계산 방식                              | 참조 데이터                     |
| :--------------------- | :------------------------------------- | :------------------------------ |
| Base_ATK               | 캐릭터 기본값 (고정)                   | Content_Stats_Character_Base.csv|
| Level_Bonus_ATK        | 레벨 * 레벨당 ATK 증가량              | Content_System_LevelExp_Curve.csv|
| Equipment_ATK_Multiplier| 장비 ATK * 레어리티 배율              | Content_Stats_Weapon_List.csv   |
| Innocent_ATK_Bonus     | 장착된 이노센트의 ATK 보너스 합산     | Content_System_Innocent_Pool.csv|
| Buff_ATK               | 활성 버프 효과 합산                    | 런타임 계산                     |

### 2.4. 크리티컬 시스템 (Critical Hit System)

#### 크리티컬 확률 (Critical Chance)

```
Critical_Chance = min(Crit_Chance_Cap, Base_Crit_Rate + LCK * Crit_Per_LCK)
```

| 파라미터          | 값       | 설명                    |
| :---------------- | :------- | :---------------------- |
| Base_Crit_Rate    | 5%       | 기본 크리티컬 확률      |
| Crit_Per_LCK      | 0.1%     | LCK 1당 크리티컬 확률   |
| Crit_Chance_Cap   | 50%      | 크리티컬 확률 상한      |

LCK 450에서 크리티컬 확률 상한(50%)에 도달한다.

#### 크리티컬 배율 (Critical Multiplier)

```
Critical_Multiplier = min(Crit_Multi_Cap, Base_Crit_Multi + LCK * Multi_Per_LCK)
```

| 파라미터          | 값       | 설명                    |
| :---------------- | :------- | :---------------------- |
| Base_Crit_Multi   | 1.5x     | 기본 크리티컬 배율      |
| Multi_Per_LCK     | 0.001x   | LCK 1당 배율 증가       |
| Crit_Multi_Cap    | 3.0x     | 크리티컬 배율 상한      |

LCK 1500에서 크리티컬 배율 상한(3.0x)에 도달한다.

### 2.5. 원소 시스템 (Elemental System)

6가지 원소가 존재하며, 상성 관계에 따라 데미지 배율이 변동한다. 상세 시스템은 `System_Combat_Elements.md`에서 정의한다.

#### 원소 종류

| 원소     | 색상   | 상태이상          | 상태이상 효과                        |
| :------- | :----- | :---------------- | :----------------------------------- |
| 화 (Fire)| 빨강   | 화상 (Burn)       | 3초간 초당 최대HP 3% 지속 피해       |
| 빙 (Ice) | 파랑   | 빙결 (Freeze)     | 1.5초간 이동 불가, 피해 20% 증가     |
| 뇌 (Thunder)| 노랑| 감전 (Shock)      | 2초간 행동 속도 30% 감소             |
| 풍 (Wind)| 초록   | 밀어내기 (Push)   | 강화 넉백 + 방어력 15% 감소 2초      |
| 암 (Dark)| 보라   | 저주 (Curse)      | 3초간 회복량 50% 감소                |
| 광 (Light)| 흰색  | 정화 (Purify)     | 디버프 1개 제거 + 2초간 피해 15% 증가|

#### 원소 상성표 (Elemental Affinity Table)

| 공격 \ 방어 | 화    | 빙    | 뇌    | 풍    | 암    | 광    | 무    |
| :---------- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| 화          | 0.5x  | 2.0x  | 1.0x  | 0.5x  | 1.0x  | 1.0x  | 1.0x  |
| 빙          | 0.5x  | 0.5x  | 1.0x  | 2.0x  | 1.0x  | 1.0x  | 1.0x  |
| 뇌          | 1.0x  | 1.0x  | 0.5x  | 0.5x  | 2.0x  | 1.0x  | 1.0x  |
| 풍          | 2.0x  | 0.5x  | 1.0x  | 0.5x  | 1.0x  | 1.0x  | 1.0x  |
| 암          | 1.0x  | 1.0x  | 0.5x  | 1.0x  | 0.5x  | 2.0x  | 1.0x  |
| 광          | 1.0x  | 1.0x  | 2.0x  | 1.0x  | 0.5x  | 0.5x  | 1.0x  |
| 무          | 1.0x  | 1.0x  | 1.0x  | 1.0x  | 1.0x  | 1.0x  | 1.0x  |

* **약점 (Weakness)**: 2.0x 배율. 상태이상 적용 확률 2배.
* **저항 (Resistance)**: 0.5x 배율. 상태이상 적용 확률 절반.
* **동원소 (Same)**: 0.5x 배율. 같은 원소는 서로 약하다.
* **무 (None)**: 1.0x 배율. 무속성 공격/방어는 보정 없음.

#### 상태이상 적용 규칙

1. 원소 공격 적중 시 `status_apply_chance`(30%) 확률로 해당 원소의 상태이상을 적용한다.
2. 약점 원소 공격 시 적용 확률이 2배(60%)로 증가한다.
3. 저항 원소 공격 시 적용 확률이 절반(15%)으로 감소한다.
4. 동일 상태이상은 중첩되지 않는다. 기존 상태이상의 지속 시간을 갱신한다.
5. 서로 다른 상태이상은 동시에 적용될 수 있다 (최대 3개).

### 2.6. 방어력 계산 (Defense Calculation)

#### 감산 방식 (Subtraction Model)

```
Effective_Damage = ATK * Skill_Multiplier - DEF * DEF_Factor
```

| 파라미터      | 값     | 설명                                     |
| :------------ | :----- | :--------------------------------------- |
| DEF_Factor    | 0.5    | DEF 1당 실제 피해 감소량                 |
| RES_Factor    | 0.5    | RES 1당 실제 마법 피해 감소량            |

**설계 의도**: DEF 100일 때 피해 50 감소. ATK 200 - 피해 감소 50 = 150 피해. 방어력의 효과가 직관적으로 예측 가능하다.

#### 방어 관통 (Armor Penetration)

일부 스킬 또는 장비는 방어 관통 스탯을 보유한다.

```
Effective_DEF = DEF * (1 - Penetration_Rate)
```

| 파라미터          | 범위          | 설명                    |
| :---------------- | :------------ | :---------------------- |
| Penetration_Rate  | 0% ~ 50%     | 방어 관통률 (상한 50%)  |

### 2.7. 레벨 차이 보정 (Level Correction)

공격자와 피격자의 레벨 차이에 따라 데미지를 보정한다.

```
Level_Correction = clamp(1.0 + (Attacker_Level - Target_Level) * Level_Diff_Factor, Level_Corr_Min, Level_Corr_Max)
```

| 파라미터          | 값     | 설명                                   |
| :---------------- | :----- | :------------------------------------- |
| Level_Diff_Factor | 0.02   | 레벨 1당 2% 보정                       |
| Level_Corr_Min    | 0.5    | 최소 보정 (50%) — 25레벨 이상 낮을 때  |
| Level_Corr_Max    | 1.5    | 최대 보정 (150%) — 25레벨 이상 높을 때 |

**설계 의도**: 레벨 차이가 전투에 영향을 주되, 장비/스킬 운영으로 극복 가능한 범위(50%~150%)로 제한한다. 아이템계에서의 장비 성장이 레벨 차이보다 중요한 게임이 되어야 한다.

### 2.8. 아이템계 지층 보정 (Item World Stratum Scaling)

아이템계에서 적의 강도는 지층 깊이에 비례하여 증가한다.

```
Stratum_Enemy_ATK = Base_ATK * (1 + Stratum_Number * Stratum_ATK_Scale)
Stratum_Enemy_DEF = Base_DEF * (1 + Stratum_Number * Stratum_DEF_Scale)
Stratum_Enemy_HP  = Base_HP  * (1 + Stratum_Number * Stratum_HP_Scale)
```

| 파라미터            | 값     | 설명                          |
| :------------------ | :----- | :---------------------------- |
| Stratum_ATK_Scale   | 0.30   | 지층당 ATK 30% 증가           |
| Stratum_DEF_Scale   | 0.25   | 지층당 DEF 25% 증가           |
| Stratum_HP_Scale    | 0.40   | 지층당 HP 40% 증가            |

4지층 기준: ATK 2.2배, DEF 2.0배, HP 2.6배.

각 지층의 보스에서는 추가 배율이 적용된다:

| 보스 등급       | ATK 추가 배율 | DEF 추가 배율 | HP 추가 배율 |
| :-------------- | :------------ | :------------ | :----------- |
| 아이템 장군     | 1.5x          | 1.3x          | 2.0x         |
| 아이템 왕       | 2.0x          | 1.5x          | 3.0x         |
| 아이템 신       | 2.5x          | 2.0x          | 5.0x         |
| 아이템 대신     | 3.0x          | 2.5x          | 8.0x         |

### 2.9. 데미지 캡 (Damage Cap)

무한 성장 시스템의 특성상 최종 데미지에 상한을 설정한다.

| 대상                | 데미지 캡           | 이유                                      |
| :------------------ | :------------------ | :---------------------------------------- |
| 일반 적 단일 히트   | 9,999,999           | 네트워크 패킷 크기 + UI 표시 제한         |
| 보스 단일 히트      | 9,999,999           | 동일                                      |
| 초당 총 데미지 (DPS)| 제한 없음            | 야리코미의 핵심: 무한 성장 체감을 보장    |

### 2.10. 데미지 넘버 UI (Damage Number Display)

| 데미지 유형     | 색상   | 크기   | 애니메이션         |
| :-------------- | :----- | :----- | :----------------- |
| 물리 (일반)     | 흰색   | 기본   | 위로 떠오르기      |
| 물리 (크리티컬) | 노랑   | 1.5배  | 위로 튀기 + 흔들림 |
| 마법 (일반)     | 하늘   | 기본   | 위로 떠오르기      |
| 마법 (크리티컬) | 보라   | 1.5배  | 위로 튀기 + 흔들림 |
| 고정 피해       | 빨강   | 기본   | 위로 떠오르기      |
| 회복            | 초록   | 기본   | 위로 떠오르기      |
| 약점 피해       | 주황   | 1.3배  | 위로 떠오르기 + "WEAK!" 텍스트 |
| 저항 피해       | 회색   | 0.8배  | 위로 떠오르기 + "RESIST" 텍스트 |
| 0 (미스/회피)   | -      | -      | "MISS" 텍스트      |

---

## 3. 규칙 (Rules)

### 3.1. 데미지 계산 순서 (Damage Calculation Order)

데미지 계산은 다음 순서를 엄격히 따른다:

```text
Step 1: 기본 피해 = ATK * Skill_Multiplier
Step 2: 방어 감산 = 기본 피해 - DEF * DEF_Factor * (1 - Penetration_Rate)
Step 3: 원소 배율 = Step 2 * Element_Multiplier
Step 4: 크리티컬 = Step 3 * Critical_Multiplier (크리티컬 발생 시)
Step 5: 레벨 보정 = Step 4 * Level_Correction
Step 6: 랜덤 분산 = Step 5 * Random(0.9, 1.1)
Step 7: 버프/디버프 = Step 6 * Buff_Multiplier
Step 8: 데미지 캡 = min(Step 7, Damage_Cap)
Step 9: 최소 데미지 = max(Step 8, 1)
Step 10: 소수점 내림 = floor(Step 9)
```

### 3.2. 피해 유형 규칙 (Damage Type Rules)

| 피해 유형      | 감산 적용 | 원소 배율 | 설명                                  |
| :------------- | :-------- | :-------- | :------------------------------------ |
| 물리 (Physical)| DEF       | 적용      | 기본 공격, 물리 스킬                  |
| 마법 (Magic)   | RES       | 적용      | 마법 스킬, INT 기반 공격              |
| 고정 (True)    | 없음      | 없음      | DEF/RES 무시. 특수 스킬, 원소 시너지  |
| 반사 (Reflect) | 없음      | 없음      | 피격 데미지의 일정 비율 반사          |
| 지속 (DoT)     | DEF/RES   | 없음      | 상태이상(화상/독). 방어 50% 감산 적용 |

### 3.3. 최소 데미지 규칙 (Minimum Damage Rules)

1. 최종 데미지가 0 이하인 경우 1로 보정한다.
2. 이 규칙은 고정 피해에도 적용된다 (고정 피해 0은 존재하지 않음).
3. "MISS"(회피)는 데미지 0이 아니라 히트 판정 자체가 실패한 것이므로 별도 처리한다.

### 3.4. 버프/디버프 배율 규칙 (Buff/Debuff Multiplier Rules)

| 종류                      | 배율 범위     | 중첩 규칙                        |
| :------------------------ | :------------ | :------------------------------- |
| 공격력 증가 버프          | 1.1x ~ 1.5x  | 가장 높은 배율 1개만 적용        |
| 공격력 감소 디버프        | 0.5x ~ 0.9x  | 가장 낮은 배율 1개만 적용        |
| 피해량 증가 (받는 측)     | 1.1x ~ 1.5x  | 중첩 가능, 곱연산                |
| 원소 상태이상 추가 피해   | 개별 적용     | 원소 시너지와 별도 계산          |

* 버프와 디버프가 동시에 존재하면 각각 독립 적용 후 곱연산한다.
* 예시: 공격력 1.3x 버프 + 피격자 피해 1.2x 디버프 = 최종 배율 1.56x.

### 3.5. 멀티플레이 데미지 규칙 (Multiplayer Damage Rules)

1. **데미지 계산 권위**: 서버에서 최종 계산. 클라이언트는 예측 데미지를 선 표시하되, 서버 결과로 보정.
2. **파티 데미지 보정**: 아이템계에서 파티원 수에 따라 적 HP가 증가한다.

| 파티 인원 | 적 HP 배율 | 보스 HP 배율 |
| :-------- | :--------- | :----------- |
| 1인       | 1.0x       | 1.0x         |
| 2인       | 1.6x       | 1.8x         |
| 3인       | 2.2x       | 2.5x         |
| 4인       | 2.8x       | 3.2x         |

3. **DPS 기여 보상**: 보스 처치 시 각 파티원의 데미지 기여율에 따라 추가 보상이 분배된다.
4. **데미지 동기화**: 데미지 넘버는 공격자의 클라이언트에서 즉시 표시 후, 서버 검증 결과로 보정. 차이가 5% 이내면 무시, 5% 초과 시 서버 값으로 덮어쓰기.

### 3.6. 회피 규칙 (Evasion Rules)

| 파라미터         | 공식                                           | 상한   |
| :--------------- | :--------------------------------------------- | :----- |
| 회피 확률        | Base_Evasion + DEX * Evasion_Per_DEX           | 30%    |
| Base_Evasion     | 3%                                             | -      |
| Evasion_Per_DEX  | 0.05%                                          | -      |

* DEX 540에서 회피 확률 상한(30%)에 도달한다.
* 회피 성공 시 데미지 0이 아니라 "MISS" 표시. 히트 리액션(경직, 넉백) 없음.

---

## 4. 데이터 & 파라미터 (Parameters)

### 4.1. 데미지 공식 파라미터 (Damage Formula Parameters)

```yaml
damage_formula:
  # --- 방어 계수 (Defense Factor) ---
  def_factor: 0.5                      # DEF 1당 피해 감소
  res_factor: 0.5                      # RES 1당 마법 피해 감소
  dot_defense_factor: 0.5              # 지속 피해에 적용되는 방어 감산 비율

  # --- 방어 관통 (Armor Penetration) ---
  penetration_rate_cap: 0.5            # 방어 관통 상한 (50%)

  # --- 랜덤 분산 (Random Variance) ---
  damage_variance_min: 0.9             # 최소 분산 (90%)
  damage_variance_max: 1.1             # 최대 분산 (110%)

  # --- 최소/최대 데미지 (Min/Max Damage) ---
  minimum_damage: 1                    # 최소 데미지
  damage_cap: 9999999                  # 단일 히트 데미지 상한

  # --- 크리티컬 (Critical) ---
  base_crit_rate: 0.05                 # 기본 크리티컬 확률 (5%)
  crit_per_lck: 0.001                  # LCK 1당 크리티컬 확률 (+0.1%)
  crit_chance_cap: 0.50                # 크리티컬 확률 상한 (50%)
  base_crit_multiplier: 1.5            # 기본 크리티컬 배율
  crit_multi_per_lck: 0.001            # LCK 1당 크리티컬 배율 (+0.001x)
  crit_multiplier_cap: 3.0             # 크리티컬 배율 상한

  # --- 레벨 보정 (Level Correction) ---
  level_diff_factor: 0.02              # 레벨 1당 보정 (2%)
  level_correction_min: 0.5            # 최소 보정 (50%)
  level_correction_max: 1.5            # 최대 보정 (150%)

  # --- 회피 (Evasion) ---
  base_evasion: 0.03                   # 기본 회피 확률 (3%)
  evasion_per_dex: 0.0005              # DEX 1당 회피 확률 (+0.05%)
  evasion_cap: 0.30                    # 회피 확률 상한 (30%)
```

### 4.2. 원소 파라미터 (Elemental Parameters)

```yaml
elemental:
  # --- 상태이상 적용 (Status Application) ---
  status_apply_chance: 0.30            # 기본 상태이상 적용 확률 (30%)
  weakness_apply_multiplier: 2.0       # 약점 시 적용 확률 배율
  resistance_apply_multiplier: 0.5     # 저항 시 적용 확률 배율
  max_concurrent_debuffs: 3            # 동시 적용 가능한 상태이상 최대 수

  # --- 상태이상 효과 (Status Effects) ---
  burn_duration_s: 3                   # 화상 지속 시간
  burn_damage_per_sec: 0.03            # 화상 초당 피해 (최대HP 3%)
  freeze_duration_s: 1.5               # 빙결 지속 시간
  freeze_damage_bonus: 0.20            # 빙결 중 받는 피해 증가 (20%)
  shock_duration_s: 2                  # 감전 지속 시간
  shock_speed_reduction: 0.30          # 감전 행동 속도 감소 (30%)
  push_def_reduction: 0.15             # 밀어내기 방어력 감소 (15%)
  push_def_reduction_duration_s: 2     # 밀어내기 디버프 지속
  curse_duration_s: 3                  # 저주 지속 시간
  curse_heal_reduction: 0.50           # 저주 회복량 감소 (50%)
  purify_damage_bonus: 0.15            # 정화 피해 증가 (15%)
  purify_bonus_duration_s: 2           # 정화 보너스 지속
```

### 4.3. 아이템계 스케일링 파라미터 (Item World Scaling Parameters)

```yaml
item_world_scaling:
  # --- 지층별 적 스케일링 (Stratum Enemy Scaling) ---
  stratum_atk_scale: 0.30              # 지층당 ATK 30% 증가
  stratum_def_scale: 0.25              # 지층당 DEF 25% 증가
  stratum_hp_scale: 0.40               # 지층당 HP 40% 증가

  # --- 보스 추가 배율 (Boss Multipliers) ---
  boss_general:                        # 아이템 장군 (초기 지층)
    atk_multi: 1.5
    def_multi: 1.3
    hp_multi: 2.0
  boss_king:                           # 아이템 왕 (중반 지층)
    atk_multi: 2.0
    def_multi: 1.5
    hp_multi: 3.0
  boss_god:                            # 아이템 신 (후반 지층)
    atk_multi: 2.5
    def_multi: 2.0
    hp_multi: 5.0
  boss_grand_god:                      # 아이템 대신 (최심층 지층)
    atk_multi: 3.0
    def_multi: 2.5
    hp_multi: 8.0

  # --- 파티 HP 보정 (Party HP Scaling) ---
  party_hp_scale:
    1: 1.0
    2: 1.6
    3: 2.2
    4: 2.8
  party_boss_hp_scale:
    1: 1.0
    2: 1.8
    3: 2.5
    4: 3.2
```

### 4.4. 버프/디버프 파라미터 (Buff/Debuff Parameters)

```yaml
buff_debuff:
  # --- 공격 버프 (ATK Buff) ---
  atk_buff_min: 1.1                    # 최소 공격력 증가 배율
  atk_buff_max: 1.5                    # 최대 공격력 증가 배율
  atk_buff_stack: "highest_only"       # 가장 높은 배율 1개만 적용

  # --- 공격 디버프 (ATK Debuff) ---
  atk_debuff_min: 0.5                  # 최소 공격력 감소 배율
  atk_debuff_max: 0.9                  # 최대 공격력 감소 배율
  atk_debuff_stack: "lowest_only"      # 가장 낮은 배율 1개만 적용

  # --- 피해량 증감 (Damage Taken Modifier) ---
  damage_taken_increase_stack: "multiplicative"  # 중첩 시 곱연산
  damage_taken_increase_cap: 2.0       # 피해량 증가 상한 (2.0x)

  # --- 멀티플레이 데미지 동기화 (MP Damage Sync) ---
  mp_damage_sync_threshold: 0.05       # 5% 이내 차이 무시
  mp_damage_overwrite_above: 0.05      # 5% 초과 시 서버 값으로 덮어쓰기
```

---

## 5. 예외 처리 (Edge Cases)

### 5.1. 데미지 오버플로우 (Damage Overflow)

| 시나리오                                | 처리 방식                                                         |
| :-------------------------------------- | :---------------------------------------------------------------- |
| 계산 중간값이 JavaScript Number 범위 초과| `Number.MAX_SAFE_INTEGER` 이내로 제한. 사실상 발생하지 않음       |
| 최종 데미지가 캡(9,999,999)을 초과      | 캡으로 고정. 초과분은 손실                                        |
| 버프/디버프 중첩으로 배율이 비정상       | 최종 배율을 0.1x ~ 10.0x 범위로 클램핑                           |
| 이노센트 보너스 합산이 비정상적으로 큰 경우| 이노센트 레벨 상한으로 제어. 최종 스탯 캡은 별도 설정하지 않음   |

### 5.2. 원소 상호작용 예외 (Elemental Interaction Edge Cases)

| 시나리오                                | 처리 방식                                                         |
| :-------------------------------------- | :---------------------------------------------------------------- |
| 화염 공격으로 이미 화상 상태인 적 공격  | 화상 지속 시간 갱신 (남은 시간 리셋). 피해 중첩 없음              |
| 빙결 상태에서 화염 공격                 | 원소 시너지 발동: 증기 폭발 (범위 피해). 빙결 해제               |
| 3개 상태이상 보유 적에게 추가 상태이상  | 4번째 상태이상은 적용 불가. 기존 상태이상 중 남은 시간이 가장 짧은 것을 교체 |
| 무속성 무기로 원소 스킬 사용            | 스킬의 원소가 우선 적용. 무기 원소와 스킬 원소가 다르면 스킬 원소 사용 |
| 원소 저항 100% (면역) 적에게 해당 원소 공격 | 데미지 0x. 최소 데미지 1은 적용됨. 상태이상은 적용 불가          |

### 5.3. 멀티플레이 데미지 동기화 예외 (MP Damage Sync Edge Cases)

| 시나리오                                | 처리 방식                                                         |
| :-------------------------------------- | :---------------------------------------------------------------- |
| 클라이언트 예측 데미지와 서버 결과 불일치| 5% 이내: 무시. 5% 초과: 서버 값으로 UI 보정 (플래시 효과)        |
| 적 HP가 서버와 클라이언트에서 다름      | 서버 HP를 권위로 사용. 클라이언트 HP 바를 부드럽게 보간           |
| 동시 공격으로 적 HP가 0 이하            | 서버에서 마지막 일격(killing blow) 판정. 처치자에게 처치 보상     |
| 네트워크 지연으로 이미 죽은 적에게 공격  | 서버에서 "대상 이미 사망" 응답. 클라이언트의 히트 이펙트는 표시하되 데미지 무효 |

### 5.4. 회피 시스템 예외 (Evasion Edge Cases)

| 시나리오                                | 처리 방식                                                         |
| :-------------------------------------- | :---------------------------------------------------------------- |
| 범위 공격(AoE) 회피                     | 범위 공격에는 회피 판정을 적용하지 않음. 범위 내 모든 대상에 피해 |
| 고정 피해(True Damage) 회피             | 고정 피해는 회피할 수 없음                                        |
| 회피 확률 0% (디버프 등)                | 회피 판정을 건너뜀 (성능 최적화)                                  |

### 5.5. 아이템계 깊은 지층 예외 (Deep Stratum Edge Cases)

| 시나리오                                   | 처리 방식                                                         |
| :----------------------------------------- | :---------------------------------------------------------------- |
| 최심층 지층 적의 스탯이 플레이어보다 압도적 | 의도된 설계. 장비 강화(야리코미)를 통해 극복하는 것이 핵심 루프   |
| 재귀 아이템계(깊이 2~3)에서의 적 스케일링  | 재귀 깊이 보정: 깊이 2는 적 HP +20%, 깊이 3은 +50%               |
| Ancient 등급 아이템의 심연 페이즈           | 4지층 클리어 후 심연 진입. 심연 내 추가 보스 등장                 |

---

## 검증 기준 (Verification Checklist)

* [ ] 물리 데미지 공식이 ATK * 배율 - DEF * 0.5으로 정확히 계산되는가
* [ ] 마법 데미지 공식이 INT * 배율 - RES * 0.5으로 정확히 계산되는가
* [ ] 최소 데미지가 항상 1 이상인가 (0 데미지 방지)
* [ ] 데미지 캡(9,999,999)이 적용되는가
* [ ] 크리티컬 확률이 5% + LCK * 0.1%로 계산되고 50% 상한이 적용되는가
* [ ] 크리티컬 배율이 1.5x + LCK * 0.001x로 계산되고 3.0x 상한이 적용되는가
* [ ] 원소 상성표에 따라 약점(2.0x), 저항(0.5x), 동원소(0.5x)가 적용되는가
* [ ] 상태이상 적용 확률이 30%이고 약점 시 60%, 저항 시 15%인가
* [ ] 동시 상태이상 3개 제한이 동작하는가
* [ ] 원소 시너지(증기 폭발, 감전 확산 등)가 올바르게 발동하는가
* [ ] 레벨 차이 보정이 50%~150% 범위로 클램핑되는가
* [ ] 아이템계 지층별 적 스케일링이 정확히 적용되는가
* [ ] 보스 등급별 추가 배율이 올바르게 적용되는가
* [ ] 파티 인원별 적 HP 배율이 올바르게 적용되는가
* [ ] 방어 관통이 DEF * (1 - Penetration)으로 계산되고 50% 상한이 적용되는가
* [ ] 회피 확률이 3% + DEX * 0.05%로 계산되고 30% 상한이 적용되는가
* [ ] 범위 공격에 회피가 적용되지 않는가
* [ ] 데미지 계산 순서(10단계)가 문서 명세대로 실행되는가
* [ ] 단일 히트 데미지 캡(9,999,999)이 극후반 야리코미에서 "성장이 막힌 느낌"을 주지 않는지 프로토타입 단계에서 검증했는가 (`Design_Combat_Philosophy.md` 정합성 노트 참조)
* [ ] 데미지 넘버 UI가 유형별로 색상/크기가 차별화되는가
* [ ] 멀티플레이에서 서버 데미지 검증이 동작하고 5% 초과 차이 시 보정되는가
* [ ] 버프/디버프 중첩 규칙(highest only, 곱연산 등)이 올바르게 적용되는가
