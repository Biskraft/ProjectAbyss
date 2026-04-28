# 데미지 시스템 (Combat Damage System)

## 구현 현황 (Implementation Status)

> **최근 업데이트:** 2026-04-07
> **문서 상태:** `작성 중 (Draft)`
> **2-Space:** 전체 (World + Item World)
> **기둥:** 전체

| 기능 ID    | 분류       | 기능명 (Feature Name)                | 우선순위 | 구현 상태    | 비고 (Notes)                  |
| :--------- | :--------- | :----------------------------------- | :------: | :----------- | :---------------------------- |
| DMG-01-A   | 공식       | 기본 데미지 공식                     |    P1    | 📅 대기      | ATK - DEF 감산 방식            |
| DMG-01-B   | 공식       | 스킬 데미지 공식                     |    P1    | 📅 대기      | 스킬 배율 적용                 |
| DMG-01-C   | 공식       | 원소 데미지 공식                     |    P1    | 📅 대기      | INT × ElementMultiplier - EnemyRES  |
| DMG-02-A   | 크리티컬   | 크리티컬 확률 시스템                 |    P1    | 📅 대기      | 기본 5% + 기억 단편 보정        |
| DMG-02-B   | 크리티컬   | 크리티컬 배율 시스템                 |    P1    | 📅 대기      | 고정 1.5x                      |
| DMG-03-A   | 원소       | 원소 상성 배율                       |    P1    | 📅 대기      | 3원소 상성표 (화/빙/뇌)        |
| DMG-03-B   | 원소       | 원소 상태이상 적용                   |    P2    | 📅 대기      | 원소별 고유 디버프             |
| DMG-04-A   | 방어       | 방어력 감산 공식                     |    P1    | 📅 대기      | DEF 기반 (장비에서 직접 제공)  |
| DMG-04-B   | 방어       | 마법 저항력 감산 공식                |    P1    | 📅 대기      | RES 기반 (원소 데미지 감산)    |
| DMG-05-A   | 스케일링   | 아이템계 지층별 데미지 스케일링      |    P1    | 📅 대기      | 지층 보정 계수                 |
| DMG-05-B   | 스케일링   | 레벨 차이 보정                       |    P2    | 📅 대기      | 레벨 격차 배율                 |
| DMG-06-A   | UI         | 데미지 넘버 표시                     |    P1    | 📅 대기      | 색상/크기 차별화               |
| DMG-07-A   | 멀티       | 서버 데미지 검증                     |    P1    | 📅 대기      | 클라이언트 예측 + 서버 권위    |
| DMG-08-A   | 회복       | HP 전투 외 자동 회복                 |    P1    | 📅 대기      | 2%/초, 70% 이하 조건          |
| DMG-08-B   | 회복       | HP 적 처치 회복 (Push Forward)       |    P1    | 📅 대기      | 처치 시 3% 회복, 킬 파티클    |
| ~~DMG-08-C~~ | ~~회복~~ | ~~MP 공격 적중 회복~~                |    —     | ❌ DEPRECATED | MP 시스템 삭제, 스킬은 쿨다운  |
| DMG-08-D   | 회복       | 포션 시스템                          |    P2    | 📅 대기      | 공간별 차등 (최대 3개 소지)   |
| DMG-08-E   | 회복       | HP 오브 드랍                         |    P1    | 📅 대기      | 녹색=HP 오브                   |

---

## 0. 필수 참고 자료 (Mandatory References)

* Writing Standards: `Documents/Terms/GDD_Writing_Rules.md`
* Project Definition: `Documents/Terms/Project_Vision_Abyss.md`
* 전투 액션: `Documents/System/System_Combat_Action.md`
* 스탯 시스템: `Documents/System/System_Growth_Stats.md`
* 장비 시스템: `Documents/System/System_Equipment_Slots.md`
* 원소 상성: 본 문서 §3 원소 섹션 참조 <!-- System_Combat_Elements.md는 Phase 2 제작 예정 -->
* 기억 단편 시스템: `Documents/System/System_Memory Shard_Core.md`
* 데미지 공식 데이터: `Sheets/Content_System_Damage_Formula.csv`
* Game Overview: `Reference/게임 기획 개요.md`

---

## 1. 개요 (Concept)

### 1.1. 설계 의도 (Intent)

ECHORIS의 데미지 시스템은 다음 한 문장으로 정의한다:

> "눈에 보이는 성장이 수치로 증명되고, 아이템계 한 지층 한 지층이 체감되는 데미지"

데미지 공식은 캐릭터 성장(레벨, 장비, 기억 단편)의 결과를 전투에서 직접 확인할 수 있어야 한다. 아이템계에서 장비를 한 지층 더 강화한 결과가 데미지 숫자로 즉시 체감되는 것이 핵심 설계 목표이다.

### 1.2. 설계 근거 (Reasoning)

| 결정                           | 근거                                                                                    |
| :----------------------------- | :-------------------------------------------------------------------------------------- |
| ATK - DEF 감산 방식            | 직관적. 공격력 100, 방어력 30이면 70이라는 예측 가능한 결과. 성장 체감이 명확            |
| 최소 데미지 1 보장             | 0 데미지는 플레이어의 무력감을 유발. 1이라도 피해를 주면 "느리지만 가능"이라는 희망 유지 |
| 원소 상성 배율                 | 전략적 장비/스킬 선택을 유도. 아이템계 진입 전 원소를 고려한 빌드 선택이 깊이를 제공     |
| 크리티컬 고정 5% + 기억 단편 보정 | 기본 크리티컬은 고정값으로 단순화. 기억 단편로 크리티컬 확률을 올리는 것이 야리코미 목표   |
| 랜덤 분산 0.9-1.1              | 완전 고정 데미지는 기계적. 10% 분산으로 타격마다 미세한 변화를 주되 예측 가능성은 유지   |

### 1.3. 3대 기둥 정렬 (Pillar Alignment)

| 기둥                           | 데미지 시스템에서의 구현                                                                |
| :----------------------------- | :-------------------------------------------------------------------------------------- |
| Metroidvania 탐험              | ATK 게이트 연동. 장비 ATK가 월드 진행의 열쇠. ATK가 낮으면 장벽 파괴 불가               |
| Item World 야리코미            | 아이템계 지층 클리어 = 장비 레벨업 = ATK/DEF 상승 = 데미지 숫자 증가. 성장의 직접 증거  |
| Online 멀티플레이              | 파티 역할에 따른 데미지 기여. DPS 미터로 역할 수행 확인. 보스 데미지 기여 보상           |

### 1.4. 저주받은 문제 검증 (Cursed Problem Check)

| 문제                                                    | 해결 방향                                                                  |
| :------------------------------------------------------ | :------------------------------------------------------------------------- |
| 레벨/장비 격차로 콘텐츠가 무의미해지지 않는가            | 아이템계 지층별 적 스케일링 + 레벨 차이 보정으로 항상 도전적인 전투 유지   |
| 기억 단편 스태킹으로 데미지가 폭주하지 않는가             | 기억 단편 레벨 상한 + 최종 데미지 캡으로 무한 성장을 제어                   |
| DEF가 너무 높으면 전투가 무한히 느려지지 않는가          | 방어 관통(Penetration) 스탯 + 최소 데미지 1 + 고정 피해 스킬로 해결       |
| 크리티컬이 너무 강하면 비크리티컬이 무의미해지지 않는가  | 크리티컬 배율 상한(3.0x) + 크리티컬 확률 상한(50%)으로 안정 딜의 가치 유지 |

### 1.5. 위험과 보상 (Risk & Reward)

| 전략             | 위험 (Risk)                            | 보상 (Reward)                              |
| :--------------- | :------------------------------------- | :----------------------------------------- |
| ATK 극대화 빌드  | DEF 장비 부족으로 피격 시 대량 피해    | 최고 DPS, 빠른 지층 클리어, ATK 게이트 해금 |
| DEF 극대화 빌드  | 느린 딜, 긴 전투 시간                  | 생존성, 보스전 안정성                      |
| 원소 특화 빌드   | 비상성 적에게 효율 감소                | 약점 적에게 2.0x 피해 (보스는 1.5x), 상태이상 부여 |
| 밸런스 빌드      | 어떤 분야에서도 최고가 아님            | 모든 상황에서 안정적                       |

---

## 2. 메커닉 (Mechanics)

### 2.1. 데미지 공식 아키텍처 (Damage Formula Architecture)

```mermaid
graph TD
    subgraph "입력 (Input)"
        ATK[공격자 ATK]
        DEF[피격자 DEF]
        SKM[스킬 배율]
        ELE[원소 배율]
        CRT[크리티컬 배율]
        RNG[랜덤 분산]
        LVL[레벨 보정]
        IW[아이템계 지층 보정]
    end

    subgraph "계산 (Calculation)"
        BASE[기본 피해 = ATK * 스킬배율 - min(DEF * 0.5, ATK * 0.85)]
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

#### 기본 데미지 (Base Damage)

```
Damage = max(1, floor(
  (ATK * Skill_Multiplier - DEF * DEF_Factor)
  * Element_Multiplier
  * Critical_Multiplier
  * Level_Correction
  * Random(0.9, 1.1)
))
```

> **설계 변경:** ATK/INT/HP 3스탯 체계. 물리 공격(인챈트 없음)은 ATK - EnemyDEF, 원소 공격(에코 인챈트 활성)은 INT × ElementMultiplier - EnemyRES로 산출합니다. 물리 방어는 DEF, 원소 방어는 RES로 감산합니다.

#### 원소 데미지 (Elemental Damage)

```
Elemental_Damage = max(1, floor(
  (INT * Element_Multiplier - RES * RES_Factor)
  * Critical_Multiplier
  * Level_Correction
  * Random(0.9, 1.1)
))
```

> **원소 적중률 100%:** 모든 원소 공격은 항상 적용된다 (확률 기반 아님). 에코 인챈트로 원소를 입힌 상태에서의 모든 공격은 원소 데미지 공식을 사용한다. 상태이상(화상/빙결/감전)도 적중 시 항상 발동하며, 지속시간/강도가 INT에 비례한다.

#### 고정 데미지 (True Damage)

```
True_Damage = floor(Fixed_Value * Level_Correction * Random(0.9, 1.1))
```

고정 데미지는 DEF를 무시한다. 특정 스킬 또는 원소 시너지 효과에서만 발생한다.

### 2.3. 스탯 산출 공식 (Stat Calculation)

전투에서 사용되는 최종 스탯의 산출 과정. ATK/INT/HP 3스탯 체계에 따라 물리 공격력, 원소 공격력, 방어력을 계산한다.

```
Final_ATK = Base_ATK + Equipment_ATK + Memory Shard_ATK_Bonus + Buff_ATK
Final_INT = Base_INT + Equipment_INT + Memory Shard_INT_Bonus + Buff_INT
Final_DEF = Equipment_DEF + Buff_DEF
Final_RES = Equipment_RES + Buff_RES
Final_MaxHP = Base_HP + Level_Bonus_HP + Memory Shard_HP_Bonus
```

> **설계 변경:** 기존 6대 스탯(STR/INT/DEX/VIT/SPD/LCK) → ATK/INT/HP 3스탯으로 단순화. ATK는 물리 데미지, INT는 원소/인챈트 데미지. DEF/RES는 장비에서 직접 제공. MP 시스템 삭제 (스킬은 쿨다운 사용).

| 요소                   | 계산 방식                              | 참조 데이터                     |
| :--------------------- | :------------------------------------- | :------------------------------ |
| Base_ATK               | 캐릭터 기본값 (고정)                   | Content_Stats_Character_Base.csv|
| Equipment_ATK          | 장비 ATK * 레어리티 배율              | Content_Stats_Weapon_List.csv   |
| Memory Shard_ATK_Bonus     | 장착된 Gladiator 기억 단편 합산        | Content_System_Memory Shard_Pool.csv|
| Buff_ATK               | 활성 버프 효과 합산                    | 런타임 계산                     |
| Base_INT               | 캐릭터 기본값 (고정)                   | Content_Stats_Character_Base.csv|
| Equipment_INT          | 장비 INT * 레어리티 배율              | Content_Stats_Weapon_List.csv   |
| Memory Shard_INT_Bonus     | 장착된 Tutor 기억 단편 합산            | Content_System_Memory Shard_Pool.csv|
| Buff_INT               | 활성 버프 효과 합산                    | 런타임 계산                     |
| Equipment_DEF          | 방어구 DEF * 레어리티 배율            | Content_Stats_Armor_List.csv    |
| Equipment_RES          | 장비 RES * 레어리티 배율              | Content_Stats_Armor_List.csv    |
| Base_HP                | 캐릭터 기본 HP (고정)                  | Content_Stats_Character_Base.csv|
| Level_Bonus_HP         | 레벨 * 레벨당 HP 증가량               | Content_System_LevelExp_Curve.csv|

### 2.4. 크리티컬 시스템 (Critical Hit System)

#### 크리티컬 확률 (Critical Chance)

```
Critical_Chance = min(Crit_Chance_Cap, Base_Crit_Rate + Memory Shard_Crit_Bonus)
```

| 파라미터              | 값       | 설명                    |
| :-------------------- | :------- | :---------------------- |
| Base_Crit_Rate        | 5%       | 고정 기본 크리티컬 확률 |
| Memory Shard_Crit_Bonus   | 가변     | 크리티컬 기억 단편에 의한 보정 (Phase 2) |
| Crit_Chance_Cap       | 50%      | 크리티컬 확률 상한      |

> **설계 변경:** 기존 LCK 스탯 기반 크리티컬이 고정 5% + 기억 단편 보정으로 변경. LCK 스탯 삭제.

#### 크리티컬 배율 (Critical Multiplier)

```
Critical_Multiplier = 1.5    # 고정값
```

| 파라미터          | 값       | 설명                    |
| :---------------- | :------- | :---------------------- |
| Base_Crit_Multi   | 1.5x     | 고정 크리티컬 배율      |

> **설계 변경:** 기존 LCK 기반 가변 배율이 고정 1.5x로 단순화.

### 2.5. 원소 시스템 (Elemental System)

3가지 원소(화/빙/뇌) + 무속성이 존재하며, 상성 관계에 따라 데미지 배율이 변동한다.

> **원소 공격 조건:** 에코(Echo)로 장착 무기에 인챈트를 적용해야 한다 (`System_Combat_Action.md` §2.2-A 참조). 인챈트 미적용(무 속성) 상태에서는 모든 공격이 물리 데미지만 발생한다. **에코의 원소 획득 경로:** 화(Fire)는 에코 기본 내장. 나머지 2원소(빙/뇌)는 월드 보스 처치 시 에코가 영구 흡수. 원소 기억 단편(Burner 등)는 인챈트 효과를 강화하는 보조 수단이지 원소 활성화 수단이 아니다.
>
> **원소 해금:** 화(Fire)는 게임 시작부터 사용 가능. 나머지 2원소(빙/뇌)는 월드 보스 처치 시 순서대로 해금된다 (`System_Memory Shard_Core.md` §2.2 원소 해금 순서 참조).
>
> **원소 기억 단편의 역할:** 원소 기억 단편(Burner/Freezer/Shocker)는 원소 공격의 조건이 아니라, **인챈트 효과를 강화**하는 역할이다. 기억 단편 장착 시 해당 원소의 데미지 배율 상승, 상태이상 적용 확률 상승, 지형 반응 효과 지속시간 증가가 적용된다. 상세 수치는 `System_Memory Shard_Core.md` §2.2 원소 기억 단편 규칙 참조.

#### 원소 종류

| 원소     | 색상   | 상태이상          | 상태이상 효과                        |
| :------- | :----- | :---------------- | :----------------------------------- |
| 화 (Fire)| 빨강   | 화상 (Burn)       | `burn_duration_s`초간 초당 최대HP `burn_damage_per_sec`×100% 지속 피해 |
| 빙 (Ice) | 파랑   | 빙결 (Freeze)     | `freeze_duration_s`초�� 이동 불가, 피해 `freeze_damage_bonus`×100% 증가 |
| 뇌 (Thunder)| 노랑| 감전 (Shock)      | `shock_duration_s`초간 행동 속도 `shock_speed_reduction`×100% 감소 |
#### 원소 상성표 (Elemental Affinity Table)

| 공격 \ 방어 | 화    | 빙    | 뇌    | 무    |
| :---------- | :---- | :---- | :---- | :---- |
| 화          | 0.5x  | 2.0x  | 1.0x  | 1.0x  |
| 빙          | 0.5x  | 0.5x  | 2.0x  | 1.0x  |
| 뇌          | 1.0x  | 0.5x  | 0.5x  | 1.0x  |
| 무          | 1.0x  | 1.0x  | 1.0x  | 1.0x  |

* **약점 (Weakness)**: 2.0x 배율 (일반 적). **보스는 1.5x** — 원소 교체로 과도한 이득을 얻지 않도록 하향. 상태이상 지속시간 1.5배 증가.
* **저항 (Resistance)**: 0.5x 배율. 상태이상 지속시간 0.5배. 저항 최하한은 0.5x — 면역 금지.
* **동원소 (Same)**: 0.5x 배율. 같은 원소는 서로 약하다.
* **무 (None)**: 1.0x 배율. 무속성 공격/방어는 보정 없음.

#### 상태이상 적용 규칙

> **설계 변경:** 원소 적중률 100% 체계. 모든 원소 공격은 상태이상을 항상 적용한다. 확률이 아닌 배율로 효과를 제어한다.

1. 원소 공격 적중 시 해당 원소의 상태이상이 **항상 적용된다** (100% 발화율).
2. 상태이상의 **지속시간/강도가 INT에 비례**하여 스케일된다: `Duration = Base_Duration * (1 + INT * 0.005)`.
3. 약점 원소 공격 시 상태이상 지속시간이 1.5배 증가한다.
4. 저항 원소 공격 시 상태이상 지속시간이 0.5배로 감소한다.
5. 동일 상태이상은 중첩되지 않는다. 기존 상태이상의 지속 시간을 갱신한다.
6. 서로 다른 상태이상은 동시에 적용될 수 있다 (최대 3개).
7. 적의 원소 내성이 높으면 데미지 배율이 감소(0.5x)하고, 낮으면 증가(1.5x)한다. **절대로 "miss"하지 않는다.**

### 2.6. 방어력 계산 (Defense Calculation)

#### 감산 방식 (Subtraction Model)

```
Effective_Physical_Damage = ATK * Skill_Multiplier - min(DEF * DEF_Factor, ATK * DEF_Absorption_Cap)
Effective_Elemental_Damage = INT * Element_Multiplier - min(RES * RES_Factor, INT * RES_Absorption_Cap)
```

| 파라미터             | 값          | 설명                                                                 |
| :------------------- | :---------- | :------------------------------------------------------------------- |
| DEF_Factor           | 0.5         | DEF 1당 물리 피해 감소량                                             |
| RES_Factor           | **0.4**     | RES 1당 원소 피해 감소량. DEF_Factor보다 낮게 설정하여 INT 빌드에 소폭 우위 부여 |
| DEF_Absorption_Cap   | ATK × **0.85** | DEF가 아무리 높아도 ATK의 85% 이상을 흡수할 수 없음. 최소 15% 물리 피해 보장 |
| RES_Absorption_Cap   | INT × **0.80** | RES 상한을 DEF보다 낮게 설정. INT 빌드가 고저항 적을 상대할 때 상대적 우위 |

> **설계 변경:** ATK/INT/HP 3스탯 체계. 물리 방어는 DEF, 원소 방어는 RES로 분리. 장비에서 DEF/RES를 직접 제공한다. 물리 공격은 DEF로 감산, 원소 공격(에코 인챈트)은 RES로 감산.

> **RES_Factor 비대칭 설계 근거 (R7 리서치):** RES_Factor를 DEF_Factor(0.5)보다 낮은 0.4로 설정하는 이유는 세 가지다. (1) 에코 인챈트 유지, 원소 타이밍 관리 등 INT 빌드에 요구되는 추가 조작 복잡도에 대한 수치 보전. (2) 순수 히트 데미지만 비교하면 INT 빌드가 불리해 보이는 착시를 방지 — 상태이상 DPS 포함 기대값을 ATK와 동등하게 만드는 조정값. (3) 별도 저항 침투(Penetration) 스탯 없이 PoE Penetration과 동일한 효과를 공식 내에서 구현.

> **흡수 상한 설계 근거:** Diablo 2 원소 면역 문제의 교훈. DEF/RES가 100%에 도달하면 사실상 면역과 같은 경험을 준다. DEF 상한 85%, RES 상한 80%는 어떤 장비 조합에서도 최소 피해를 보장하며, RES 상한을 더 낮게 설정하여 INT 빌드가 고DEF 적을 상대할 때 추가 이점을 가진다.

**설계 의도**: DEF 100, ATK 200일 때 — DEF 흡수: min(100 × 0.5, 200 × 0.85) = min(50, 170) = 50 감소 → 150 피해. DEF 300, ATK 200일 때 — DEF 흡수 상한: min(300 × 0.5, 200 × 0.85) = min(150, 170) = 150 감소 → 최소 50 피해(ATK의 25%). 방어력의 효과가 직관적으로 예측 가능하며 면역 구간은 존재하지 않는다.

#### 방어 관통 (Armor Penetration)

일부 스킬 또는 장비는 방어 관통 스탯을 보유한다.

```
Effective_DEF = DEF * (1 - Penetration_Rate)
```

| 파라미터          | 범위          | 설명                    |
| :---------------- | :------------ | :---------------------- |
| Penetration_Rate  | 0% - 50%     | 방어 관통률 (상한 50%)  |

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

**설계 의도**: 레벨 차이가 전투에 영향을 주되, 장비/스킬 운영으로 극복 가능한 범위(50%150 내외%)로 제한한다. 아이템계에서의 장비 성장이 레벨 차이보다 중요한 게임이 되어야 한다.

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

### 2.9. HP 회복 시스템 (HP Recovery System)

#### 설계 철학: Push Forward Combat

Hollow Knight의 "공격=회복 연료" 철학을 채택한다. HP 회복의 주 경로를 전투 행동(적 처치)과 연동하여, 적을 피해 다니는 소극적 플레이보다 적극적인 전투가 생존에 유리한 구조를 만든다. 단, Hollow Knight와 달리 ECHORIS는 2-Space 간 긴장감 차등이 필요하므로 공간별로 회복률을 조정한다.

#### 전투 외 자동 회복 (Out-of-Combat Auto-Regen)

`System_Combat_Action.md` §2.7에서 전투 상태 관리(combat_exit_ms)를 정의한다. 본 섹션은 회복 수치를 확정한다.

```
HP_Regen_Tick = Max_HP * hp_regen_rate_per_sec   (초당 1회 적용)
적용 조건: Out-of-Combat 상태 AND Current_HP / Max_HP < hp_regen_threshold
```

| 공간        | hp_regen_threshold | hp_regen_rate_per_sec | 설계 의도              |
| :---------- | :------------------ | :-------------------- | :--------------------- |
| 월드        | 70% (0.70)         | 2% (0.02)             | 탐험 지속성 지원       |
| 아이템계    | 70% (0.70)         | 1% (0.01)             | 긴장감 유지            |
| 허브        | 즉시 전회복 (텔레포트 진입 시) | —        | 사교 공간, 준비 공간   |

> **System_Combat_Action.md §2.7 정합성 노트:** 해당 문서에는 아이템계에서 자연 회복이 비활성화된다고 기술되어 있다. 이 문서에서 수치를 재정의하여 아이템계에서 1%/초 회복을 허용하는 것으로 확정한다. System_Combat_Action.md의 `hp_regen_in_item_world: false` 파라미터는 `true`로, `hp_regen_rate_per_sec`는 공간별로 분리하여 업데이트가 필요하다.

#### 전투 중 회복 — Push Forward 구조

| 회복 트리거              | 회복량 (월드)      | 회복량 (아이템계)  | 시각 피드백                         |
| :----------------------- | :----------------- | :----------------- | :---------------------------------- |
| 일반 적 처치             | 최대HP × 3%        | 최대HP × 2%        | 킬 히트스탑 중 녹색 파티클          |
| 기억 단편 복종 성공       | 최대HP × 15%       | 최대HP × 15%       | 골드 파티클 + 회복 숫자 팝업        |
| 포션 사용 (일반)         | 최대HP × 30%       | 최대HP × 30%       | 초록 광역 이펙트                    |
| 미스터리 룸 병원 (아이템계) | —               | 전회복             | 흰색 힐링 이펙트 + 종소리 SFX       |
| 세이브 포인트 (월드)     | 전회복             | —                  | 세이브 포인트 발광 이펙트           |
| 허브 진입               | 즉시 전회복        | —                  | 허브 배경 BGM 전환과 동시           |

#### 포션 시스템 (Potion System)

| 공간        | 획득 방법                                          | 소지 상한 | 회복량       |
| :---------- | :------------------------------------------------- | :-------- | :----------- |
| 월드        | 소지 가능 (세이브 포인트 인근 NPC 구매, 드랍)      | 3개       | 최대HP × 30% |
| 아이템계    | 일반 적 드랍 확률 5% / 미스터리 룸 병원에서 전회복 | 소지 불가 | (드랍 의존)  |
| 허브        | 즉시 전회복 (포션 불필요)                          | —         | —            |

포션 사용 후 쿨다운: `potion_cooldown_ms`(3000ms). 연속 포션 회복 방지.

---

### ~~2.10. MP 회복 시스템 (MP Recovery System)~~ — DEPRECATED

> **⚠️ DEPRECATED:** MP 시스템은 삭제되었습니다. 스킬은 쿨다운 기반으로 작동합니다. MP 바, MP 회복, MP 포션은 모두 삭제됩니다. 아래 내용은 참고용으로 보존합니다.

### ~~2.10-OLD~~. MP 회복 시스템 (원본 보존)

#### 설계 철학: 공격이 스킬의 연료

기본 공격 적중 시 MP를 회복하는 구조를 채택한다. "MP가 없으면 스킬을 못 쓴다"가 아니라, "기본 공격을 하면 스킬을 쓸 수 있다"는 양의 강화 루프를 형성한다. 이는 기본 공격을 게임플레이에서 유의미하게 유지시키는 핵심 설계 결정이다.

#### 전투 외 자동 회복 (Out-of-Combat Auto-Regen)

`System_Combat_Action.md` §2.7에서 전투 상태 관리를 정의한다. 본 섹션은 MP 회복 수치를 확정한다.

```
MP_Regen_Tick = Max_MP * mp_regen_rate_per_sec   (초당 1회 적용)
적용 조건: Out-of-Combat 상태 AND Current_MP / Max_MP < mp_regen_threshold
```

| 공간        | mp_regen_threshold | mp_regen_rate_per_sec | 설계 의도              |
| :---------- | :------------------ | :-------------------- | :--------------------- |
| 월드        | 50% (0.50)         | 3% (0.03)             | 스킬 자유로운 사용     |
| 아이템계    | 50% (0.50)         | 2% (0.02)             | MP 관리 긴장감         |
| 허브        | 즉시 전회복 (진입 시) | —                   | 사교 공간              |

> **System_Combat_Action.md §2.7 정합성 노트:** 해당 문서는 아이템계 MP 자연 회복 비활성화를 명시하고 있다. 이 문서에서 아이템계 2%/초 회복으로 재정의한다. System_Combat_Action.md 파라미터 `mp_regen_in_item_world: false`를 `true`로, `mp_regen_rate_per_sec`를 공간별로 분리하여 업데이트가 필요하다.

#### 전투 중 MP 회복

| 회복 트리거              | 회복량 (월드)      | 회복량 (아이템계)  | 시각 피드백                         |
| :----------------------- | :----------------- | :----------------- | :---------------------------------- |
| 기본 공격 적중 (1회)     | 최대MP × 2%        | 최대MP × 1.5%      | MP 바 미세 증가 이펙트              |
| 3타 콤보 완료 보너스     | 최대MP × 5%        | 최대MP × 3%        | MP 바 파란 플래시                   |
| 일반 적 처치            | 최대MP × 5%        | 최대MP × 3%        | 킬 히트스탑 중 파란 파티클          |
| 보스 처치 (아이템계)    | —                  | 전회복             | 보스 사망 연출과 동시               |
| 미스터리 룸 병원 (아이템계) | —              | 전회복             | 힐링 이펙트                         |
| MP 포션 사용            | 최대MP × 40%       | 최대MP × 40%       | 파란 광역 이펙트                    |

MP 포션 드랍 확률: 일반 적 3% (아이템계 전용 드랍). 월드에서는 NPC 구매 또는 드랍.

---

### 2.11. HP 오브 드랍 시스템 (Recovery Orb Drop System)

> **설계 변경:** MP 시스템 삭제에 따라 MP 오브는 삭제. HP 오브만 유지.

적 처치 시 드랍되는 오브는 회복 수치를 별도 지급하는 것이 아니라 §2.9 / §2.10의 "적 처치 회복"을 시각화하는 피드백 요소이다. 즉각 흡수되지 않고 물리적으로 드랍되어 플레이어가 의식적으로 수집하도록 설계한다.

> **설계 의도:** 오브를 즉시 흡수가 아닌 드랍 형태로 처리함으로써, 위험한 상황에서 "오브를 줍기 위해 다가가는" 행동 자체가 미니 의사결정이 된다.

| 파라미터                  | 값          | 설명                                      |
| :------------------------ | :---------- | :---------------------------------------- |
| HP 오브 색상              | 녹색 (#00FF66) | 체력 회복 오브                         |
| 자동 흡수 범위            | 48px        | 플레이어 중심 반경                        |
| 오브 수명                 | 5000ms      | 수명 경과 시 사라짐                       |
| 드랍 방향                 | 처치 위치에서 랜덤 소산 (반경 32px 이내) | 물리적 분산감 |
| HP 오브 회복량            | 최대HP × 1% | 오브 1개당 (§2.9 처치 회복과 별개)        |
| MP 오브 회복량            | 최대MP × 1% | 오브 1개당 (§2.10 처치 회복과 별개)       |
| 아이템계 높은 지층 드랍 보정 | 지층 1개당 -5% (최소 30%) | 긴장감 증가 설계  |

#### 오브 드랍 수량 기준

| 적 등급              | HP 오브 수 | MP 오브 수 |
| :------------------- | :--------- | :--------- |
| 일반 적 (Normal)     | 1          | 1          |
| 강화 적 (Elite)      | 2          | 2          |
| 미니 보스            | 3          | 3          |
| 아이템계 보스        | 5          | 5          |

---

### 2.12. 데미지 캡 (Damage Cap)

무한 성장 시스템의 특성상 최종 데미지에 상한을 설정한다.

| 대상                | 데미지 캡           | 이유                                      |
| :------------------ | :------------------ | :---------------------------------------- |
| 일반 적 단일 히트   | 9,999,999           | 네트워크 패킷 크기 + UI 표시 제한         |
| 보스 단일 히트      | 9,999,999           | 동일                                      |
| 초당 총 데미지 (DPS)| 제한 없음            | 야리코미의 핵심: 무한 성장 체감을 보장    |

### 2.10. 데미지 넘버 UI (Damage Number Display)

| 데미지 유형     | 색상   | 크기   | 애니메이션         |
| :-------------- | :----- | :----- | :----------------- |
| 일반            | 흰색   | 기본   | 위로 떠오르기      |
| 크리티컬        | 노랑   | 1.5배  | 위로 튀기 + 흔들림 |
| 고정 피해       | 빨강   | 기본   | 위로 떠오르기      |
| 회복            | 초록   | 기본   | 위로 떠오르기      |
| 약점 피해       | 주황   | 1.3배  | 위로 떠오르기 + "WEAK!" 텍스트 |
| 저항 피해       | 회색   | 0.8배  | 위로 떠오르기 + "RESIST" 텍스트 |

> **설계 변경:** ATK/INT/HP 3스탯 체계. 물리는 ATK 기반, 원소는 INT 기반. 회피(MISS) 삭제 (모든 공격 적중, 대시 위치 이탈로 대체). 원소 적중률 100% (상태이상 항상 발동, 지속시간은 INT 스케일).

---

## 3. 규칙 (Rules)

### 3.1. 데미지 계산 순서 (Damage Calculation Order)

데미지 계산은 다음 순서를 엄격히 따른다:

```text
# 물리 데미지 (인챈트 미적용)
Step 1: 기본 피해 = ATK * Skill_Multiplier
Step 2: 방어 흡수 계산 = min(DEF * DEF_Factor * (1 - Penetration_Rate), ATK * DEF_Absorption_Cap)
Step 3: 방어 감산 = Step 1 - Step 2
Step 4: 크리티컬 = Step 3 * Critical_Multiplier (크리티컬 발생 시)
Step 5: 레벨 보정 = Step 4 * Level_Correction
Step 6: 랜덤 분산 = Step 5 * Random(0.9, 1.1)
Step 7: 버프/디버프 = Step 6 * Buff_Multiplier
Step 8: 데미지 캡 = min(Step 7, Damage_Cap)
Step 9: 최소 데미지 = max(Step 8, 1)
Step 10: 소수점 내림 = floor(Step 9)

# 원소 데미지 (에코 인챈트 활성)
Step 1: 기본 원소 피해 = INT * Element_Multiplier * Staff_Enchant_Amplifier(지팡이만 1.5x)
Step 2: 저항 흡수 계산 = min(RES * RES_Factor, INT * RES_Absorption_Cap)
Step 3: 저항 감산 = Step 1 - Step 2
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
| 일반 (Normal)  | DEF       | 적용      | 기본 공격, 모든 스킬                  |
| 고정 (True)    | 없음      | 없음      | DEF 무시. 특수 스킬, 원소 시너지      |
| 반사 (Reflect) | 없음      | 없음      | 피격 데미지의 일정 비율 반사          |
| 지속 (DoT)     | DEF       | 없음      | 상태이상(화상/독). 방어 `dot_defense_factor` 비�� 감산 적용 |

> **설계 변경:** ATK/INT/HP 3스탯 체계. 물리 공격은 ATK - DEF, 원소 공격(에코 인챈트)은 INT × ElementMultiplier - RES.

### 3.3. 최소 데미지 규칙 (Minimum Damage Rules)

1. 최종 데미지가 0 이하인 경우 1로 보정한다.
2. 이 규칙은 고정 피해에도 적용된다 (고정 피해 0은 존재하지 않음).
3. "MISS"(회피)는 데미지 0이 아니라 히트 판정 자체가 실패한 것이므로 별도 처리한다.

> **최소 데미지 1의 설계 근거 (R7 리서치):** Diablo 2 Hell 난이도의 원소 면역 문제에서 도출된 원칙이다. DEF/RES 흡수 상한(ATK×85%, INT×80%)과 최소 데미지 1 보장을 조합하면 어떤 적도 사실상 무적이 되지 않는다. 플레이어는 "느리지만 가능하다"는 희망을 유지하며, INT 빌드의 원소 공격이 특정 적에게 완전히 차단되는 Diablo 2식 실패 패턴을 방지한다.

### 3.4. 버프/디버프 배율 규칙 (Buff/Debuff Multiplier Rules)

| 종류                      | 배율 범위     | 중첩 규칙                        |
| :------------------------ | :------------ | :------------------------------- |
| 공격력 증가 버프          | `atk_buff_min`x - `atk_buff_max`x  | 가장 높은 배율 1개만 적용        |
| 공격력 감소 디버프        | `atk_debuff_min`x - `atk_debuff_max`x  | 가장 낮은 배율 1개만 적용        |
| 피해량 증가 (받는 측)     | `atk_buff_min`x - `atk_buff_max`x  | 중첩 가능, 곱연산. 상한 `damage_taken_increase_cap`x |
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

### ~~3.6. 회피 규칙 (Evasion Rules)~~ — DEPRECATED

> **⚠️ DEPRECATED:** 회피/명중 시스템은 삭제되었습니다. 모든 공격은 적중합니다. 회피는 대시 위치 이탈로 대체됩니다. DEX 스탯은 삭제되었습니다.

---

## 4. 데이터 & 파라미터 (Parameters)

### 4.1. 데미지 공식 파라미터 (Damage Formula Parameters)

```yaml
damage_formula:
  # --- 방어 계수 (Defense Factor) ---
  def_factor: 0.5                      # DEF 1당 물리 피해 감소
  res_factor: 0.4                      # RES 1당 원소 피해 감소. DEF_Factor보다 낮음 — INT 빌드 기술 세금 보전 (R7)
  dot_defense_factor: 0.5              # 지속 피해에 적용되는 방어 감산 비율

  # --- 방어/저항 흡수 상한 (Absorption Cap) — R7 리서치 적용 ---
  def_absorption_cap: 0.85             # DEF 흡수 상한: ATK × 85%. 최소 15% 물리 피해 보장
  res_absorption_cap: 0.80             # RES 흡수 상한: INT × 80%. DEF보다 낮게 설정. INT 빌드 고저항 적 우위

  # --- 방어 관통 (Armor Penetration) ---
  penetration_rate_cap: 0.5            # 방어 관통 상한 (50%)

  # --- 랜덤 분산 (Random Variance) ---
  damage_variance_min: 0.9             # 최소 분산 (90%)
  damage_variance_max: 1.1             # 최대 분산 (110%)

  # --- 최소/최대 데미지 (Min/Max Damage) ---
  minimum_damage: 1                    # 최소 데미지. 0 데미지는 사실상 면역 경험을 주므로 항상 1 이상 보장
  damage_cap: 9999999                  # 단일 히트 데미지 상한

  # --- ATK/INT 소프트 캡 (Soft Cap) — R7 리서치 적용 ---
  atk_soft_cap: 200                    # ATK 소프트 캡. 이후 신규 ATK 2당 실효 +1 (50% 효율)
  int_soft_cap: 180                    # INT 소프트 캡. ATK보다 10% 낮음. 상태이상 DPS 비중 자연 증가 유도
  atk_hard_cap: 500                    # ATK 하드 캡
  int_hard_cap: 500                    # INT 하드 캡
  soft_cap_efficiency: 0.5             # 소프트 캡 초과 효율 (50%)

  # --- 크리티컬 (Critical) ---
  base_crit_rate: 0.05                 # 고정 기본 크리티컬 확률 (5%)
  # crit_per_lck: DEPRECATED (LCK 삭제, 기억 단편로 보정)
  crit_chance_cap: 0.50                # 크리티컬 확률 상한 (50%)
  base_crit_multiplier: 1.5            # 고정 크리티컬 배율
  # crit_multi_per_lck: DEPRECATED (LCK 삭제)
  # crit_multiplier_cap: DEPRECATED (배율 고정)

  # --- 레벨 보정 (Level Correction) ---
  level_diff_factor: 0.02              # 레벨 1당 보정 (2%)
  level_correction_min: 0.5            # 최소 보정 (50%)
  level_correction_max: 1.5            # 최대 보정 (150%)

  # --- 회피 (Evasion) --- DEPRECATED
  # 회피/명중 시스템 삭제. 모든 공격은 적중. 회피는 대시 위치 이탈로 대체.
  # base_evasion: DEPRECATED
  # evasion_per_dex: DEPRECATED (DEX 삭제)
  # evasion_cap: DEPRECATED
```

### 4.2. 원소 파라미터 (Elemental Parameters)

```yaml
elemental:
  # --- 상태이상 적용 (Status Application) ---
  status_apply_chance: 1.00            # 원소 적중률 100% (항상 적용)
  # weakness_apply_multiplier: DEPRECATED (확률 기반 → 배율 기반 전환)
  # resistance_apply_multiplier: DEPRECATED (확률 기반 → 배율 기반 전환)
  weakness_duration_multiplier: 1.5    # 약점 시 상태이상 지속시간 1.5배
  resistance_duration_multiplier: 0.5  # 저항 시 상태이상 지속시간 0.5배
  int_duration_scaling: 0.005          # INT 1당 상태이상 지속시간 +0.5%
  res_factor: 0.4                      # RES 1당 원소 피해 감소 (damage_formula.res_factor와 동일값 유지)
  max_concurrent_debuffs: 3            # 동시 적용 가능한 상태이상 최대 수

  # --- 상태이상 효과 (Status Effects) ---
  burn_duration_s: 3                   # 화상 지속 시간
  burn_damage_per_sec: 0.02            # 화상 초당 피해 (최대HP 2%). R7: 화상 3초 = 총 HP의 6%. 위험하지 않되 INT 기여 가시화
  freeze_duration_s: 1.5               # 빙결 지속 시간
  freeze_damage_bonus: 0.20            # 빙결 중 받는 피해 증가 (20%)
  shock_duration_s: 2                  # 감전 지속 시간
  shock_speed_reduction: 0.30          # 감전 행동 속도 감소 (30%)
  push_def_reduction: 0.15             # 밀어내기 방어력 감소 (15%)
  push_def_reduction_duration_s: 2     # 밀어내기 디버프 지속
  # 암(Dark) 원소 삭제됨 — CLAUDE.md SSoT 기준 3원소(화/빙/뇌)+무속성만 확정
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

### 4.4. 회복 시스템 파라미터 (Recovery System Parameters)

```yaml
recovery:
  # --- HP 전투 외 자동 회복 (HP Out-of-Combat Regen) ---
  hp_regen_threshold: 0.70             # 회복 발동 임계값 (현재HP/최대HP < 70%)
  hp_regen_rate_world: 0.02            # 월드 초당 HP 회복률 (최대HP 2%)
  hp_regen_rate_item_world: 0.01       # 아이템계 초당 HP 회복률 (최대HP 1%)
  hp_regen_tick_ms: 1000               # 회복 틱 간격 (1초)

  # --- MP 전투 외 자동 회복 (DEPRECATED — MP 시스템 삭제) ---
  # mp_regen_threshold: DEPRECATED
  # mp_regen_rate_world: DEPRECATED
  # mp_regen_rate_item_world: DEPRECATED
  # mp_regen_tick_ms: DEPRECATED

  # --- HP 전투 중 회복 (HP In-Combat Recovery) ---
  hp_kill_regen_world: 0.03            # 월드 적 처치 HP 회복 (최대HP 3%)
  hp_kill_regen_item_world: 0.02       # 아이템계 적 처치 HP 회복 (최대HP 2%)
  hp_memory shard_tame_regen: 0.15         # 기억 단편 복종 HP 회복 (최대HP 15%)
  hp_potion_regen: 0.30                # 포션 사용 HP 회복 (최대HP 30%)
  potion_cooldown_ms: 3000             # 포션 사용 쿨다운

  # --- MP 전투 중 회복 (DEPRECATED — MP 시스템 삭제, 스킬은 쿨다운) ---
  # mp_attack_hit_world: DEPRECATED
  # mp_attack_hit_item_world: DEPRECATED
  # mp_combo_finish_world: DEPRECATED
  # mp_combo_finish_item_world: DEPRECATED
  # mp_kill_world: DEPRECATED
  # mp_kill_item_world: DEPRECATED
  # mp_potion_regen: DEPRECATED

  # --- 포션 드랍 확률 (Potion Drop Chance) ---
  hp_potion_drop_chance: 0.05          # 일반 적 HP 포션 드랍 확률 (5%)
  # mp_potion_drop_chance: DEPRECATED (MP 삭제)
  potion_world_carry_limit: 3          # 월드 포션 소지 상한 (3개)

  # --- HP/MP 오브 (Recovery Orbs) ---
  orb_absorb_radius_px: 48             # 오브 자동 흡수 범위 (픽셀)
  orb_lifetime_ms: 5000                # 오브 수명 (5초)
  orb_scatter_radius_px: 32            # 드랍 시 분산 반경
  hp_orb_regen: 0.01                   # HP 오브 1개당 회복 (최대HP 1%)
  # mp_orb_regen: DEPRECATED (MP 삭제)
  orb_drop_rate_stratum_penalty: 0.05  # 아이템계 지층당 오브 드랍률 감소 (5%)
  orb_drop_rate_minimum: 0.30          # 오브 드랍률 하한 (30%)
```

### 4.5. 버프/디버프 파라미터 (Buff/Debuff Parameters)

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
| 버프/디버프 중첩으로 배율이 비정상       | 최종 배율을 0.1x - 10.0x 범위로 클램핑                           |
| 기억 단편 보너스 합산이 비정상적으로 큰 경우| 기억 단편 레벨 상한으로 제어. 최종 스탯 캡은 별도 설정하지 않음   |

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
| ~~재귀 아이템계(깊이 2-3)에서의 적 스케일링~~ | ~~DEPRECATED. 재귀적 중첩 진입 삭제. 아이템계 난이도는 레어리티와 지층에 의해서만 결정~~ |
| Ancient 등급 아이템의 심연 페이즈           | 4지층 클리어 후 심연 진입. 심연 내 추가 보스 등장                 |

### 5.6. 회복 시스템 예외 (Recovery System Edge Cases)

| 시나리오                                        | 처리 방식                                                                   |
| :---------------------------------------------- | :-------------------------------------------------------------------------- |
| ~~암 원소 저주(Curse) 상태에서 회복 시도~~      | ~~삭제됨 - 3원소(화/빙/뇌)+무속성만 확정~~    |
| HP가 이미 100%인 상태에서 적 처치               | 초과 회복 없음. 현재 HP를 Max_HP로 클램핑. 오버힐 없음                      |
| MP가 이미 100%인 상태에서 기본 공격 적중        | 초과 회복 없음. 현재 MP를 Max_MP로 클램핑                                   |
| 허브에서 전투 행동 시도                          | 허브에서는 전투 불가. In-Combat 상태 전이 없음. HP/MP 전회복 유지           |
| 오브 수명(5초) 경과 후 흡수 시도                | 이미 사라진 오브. 흡수 처리 없음. 클라이언트에서 오브 오브젝트 제거         |
| 다수 오브가 동일 틱에 흡수됨                    | 각 오브 회복량을 개별 적용 후 합산. 동시 처리 허용 (캡 초과분은 클램핑)     |
| 아이템계 4지층에서 오브 드랍률 계산 (-20%)      | `orb_drop_rate_stratum_penalty * 4 = 20%` 감소. `max(0.30, 기본률 - 0.20)` |
| 포션 쿨다운(3초) 중 포션 사용 시도              | 입력 무시 + "포션 쿨다운 중" UI 표시. 포션 소모 없음                        |
| 멀티플레이에서 파티원 동시 적 처치              | 처치자 1인만 처치 회복 수령. 서버에서 killing blow 판정자 확정               |
| 기억 단편 복종과 동시에 피격당함                  | 복종 회복(15%)과 피격 피해를 독립 계산 후 순차 적용. 피격이 후순위           |

---

## 검증 기준 (Verification Checklist)

* [ ] 물리 데미지 공식이 ATK * 배율 - DEF * 0.5으로 정확히 계산되는가
* [ ] 원소 데미지 공식이 INT * ElementMultiplier - RES * 0.5으로 정확히 계산되는가
* [ ] 최소 데미지가 항상 1 이상인가 (0 데미지 방지)
* [ ] 데미지 캡(9,999,999)이 적용되는가
* [ ] 크리티컬 확률이 고정 5% + 기억 단편 보정으로 계산되고 50% 상한이 적용되는가
* [ ] 크리티컬 배율이 고정 1.5x로 적용되는가
* [ ] 원소 상성표에 따라 약점(2.0x), 저항(0.5x), 동원소(0.5x)가 적용되는가
* [ ] 상태이상이 원소 공격 시 항상 적용(100%)되고, 지속시간이 INT에 비례하는가
* [ ] 동시 상태이상 3개 제한이 동작하는가
* [ ] 원소 시너지(증기 폭발, 감전 확산 등)가 올바르게 발동하는가
* [ ] 레벨 차이 보정이 50%150 내외% 범위로 클램핑되는가
* [ ] 아이템계 지층별 적 스케일링이 정확히 적용되는가
* [ ] 보스 등급별 추가 배율이 올바르게 적용되는가
* [ ] 파티 인원별 적 HP 배율이 올바르게 적용되는가
* [ ] 방어 관통이 DEF * (1 - Penetration)으로 계산되고 50% 상한이 적용되는가
* [ ] 회피 시스템은 DEPRECATED (대시 위치 이탈로 대체)되어 작동하지 않는가
* [ ] 범위 공격에 회피가 적용되지 않는가
* [ ] 데미지 계산 순서(10단계)가 문서 명세대로 실행되는가
* [ ] 단일 히트 데미지 캡(9,999,999)이 극후반 야리코미에서 "성장이 막힌 느낌"을 주지 않는지 프로토타입 단계에서 검증했는가 (`Design_Combat_Philosophy.md` 정합성 노트 참조)
* [ ] 데미지 넘버 UI가 유형별로 색상/크기가 차별화되는가
* [ ] 멀티플레이에서 서버 데미지 검증이 동작하고 5% 초과 차이 시 보정되는가
* [ ] 버프/디버프 중첩 규칙(highest only, 곱연산 등)이 올바르게 적용되는가
* [ ] HP 자동 회복이 Out-of-Combat 상태에서 70% 이하일 때만 발동하는가
* [ ] 월드 HP 자동 회복 2%/초, 아이템계 1%/초가 공간에 따라 정확히 차등 적용되는가
* [ ] 적 처치 시 HP가 월드 3%, 아이템계 2% 즉시 회복되는가
* [ ] 기억 단편 복종 성공 시 HP 15% 회복 파티클과 함께 발동하는가
* [ ] 포션 사용 쿨다운(3초)이 연속 사용을 차단하는가
* [ ] 포션 월드 소지 상한(3개)이 적용되는가
* [ ] MP 자동 회복이 Out-of-Combat 상태에서 50% 이하일 때만 발동하는가
* [ ] 월드 MP 자동 회복 3%/초, 아이템계 2%/초가 공간에 따라 정확히 차등 적용되는가
* [ ] 기본 공격 적중 시 MP가 월드 2%, 아이템계 1.5% 회복되는가
* [ ] 3타 콤보 완료 시 MP 추가 보너스(월드 5%, 아이템계 3%)가 적용되는가
* [ ] 아이템계 보스 처치 시 MP 전회복이 발동하는가
* [ ] HP/MP 오브가 48px 반경 내 자동 흡수되는가
* [ ] 오브 수명(5초) 경과 후 정상 제거되는가
* [ ] 아이템계 지층이 높을수록 오브 드랍률이 지층당 5% 감소하고 30% 하한이 적용되는가
* ~~암 원소 삭제됨~~
* [ ] HP/MP 회복이 Max_HP/Max_MP를 초과하여 오버힐되지 않는가
