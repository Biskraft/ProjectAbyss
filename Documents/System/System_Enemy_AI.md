# 적 AI 시스템 (Enemy AI System)

## 구현 현황 (Implementation Status)

> 최근 업데이트: 2026-04-07
> 문서 상태: `작성 중 (Draft)`
> 3-Space: World + Item World
> 기둥: 탐험

| 기능 ID | 분류 | 기능명 (Feature Name) | 우선순위 | 구현 상태 | 비고 (Notes) |
| :--- | :--- | :--- | :---: | :--- | :--- |
| ENM-01-A | 상태 머신 | 적 AI 기본 상태 머신 (7단계) | P1 | 대기 | Idle/Patrol/Detect/Chase/Attack/Cooldown/Retreat |
| ENM-01-B | 상태 머신 | 화면 밖 비활성화 처리 | P1 | 대기 | 공정성 규칙 준수 |
| ENM-02-A | 감지 | 원형 감지 반경 시스템 | P1 | 대기 | 적 유형별 반경 차이 |
| ENM-02-B | 감지 | 시야각 (Field of View) 판정 | P1 | 대기 | 전방 기준 각도 |
| ENM-02-C | 감지 | Line of Sight 판정 | P1 | 대기 | 장애물 차단 여부 |
| ENM-03-A | 공격 Tell | 공격 예고 동작 시스템 | P0 | 대기 | 모든 적 공격에 Tell 필수 |
| ENM-04-A | 적 개체 | Skeleton (근접형) AI | P1 | 대기 | 감지-접근-공격-대기 |
| ENM-04-B | 적 개체 | Ghost (원거리형) AI | P1 | 대기 | 감지-거리유지-사격-회피 |
| ENM-04-C | 적 개체 | Spark Bat (비행형 A-05) AI | P1 | 대기 | 전방위 감지-공중 순찰-하강 급습-재상승 |
| ENM-04-D | 적 개체 | Cinder Imp (군집형 A-06) AI | P1 | 대기 | 군집 이동-약근접-빠른 쿨다운 반복 |
| ENM-04-E | 이노센트 | Gladiator 야생 이노센트 AI | P1 | 대기 | IDLE-ALERTED-FLEE-CORNERED-CAPTURED |
| ENM-05-A | 스폰 | 방 진입 시 스폰 포인트 활성화 | P1 | 대기 | 방 진입 트리거 |
| ENM-05-B | 사망 | 사망 이펙트-드랍-경험치 순서 처리 | P1 | 대기 | 소멸 이펙트 포함 |
| ENM-06-A | 스케일링 | 아이템계 지층별 스탯 스케일링 | P1 | 대기 | HP/ATK/DEF 각각 계수 |
| ENM-06-B | 어그로 | 단일 타겟 어그로 시스템 | P1 | 대기 | 최근 피해 플레이어 추적 |

---

## 0. 필수 참고 자료 (Mandatory References)

* Writing Standards: `Documents/Terms/GDD_Writing_Rules.md`
* Project Definition: `Documents/Terms/Project_Vision_Abyss.md`
* 전투 액션 시스템: `Documents/System/System_Combat_Action.md`
* 데미지 시스템: `Documents/System/System_Combat_Damage.md`
* 전투 설계 철학: `Documents/Design/Design_Combat_Philosophy.md`
* Game Overview: `Reference/게임 기획 개요.md`
* 캐슬바니아 시스템 분석: `Reference/캐슬바니아 시스템 분석.md`
* 일반 적 아키타입 설계 리서치: `Documents/Research/EnemyDesign_MobArchetype_Research.md`

---

## 1. 개요 (Concept)

### 1.1. 설계 의도 (Intent)

Project Abyss의 적 AI 시스템은 다음 한 문장으로 정의한다:

> "읽을 수 있고, 반응할 수 있고, 정복할 수 있는 적"

`Design_Combat_Philosophy.md`의 전투 철학에 따라, 모든 적은 플레이어가 패턴을 읽고 반응할 수 있는 행동을 한다. 적의 공격은 예측 불가능한 기습이 아니라, Tell(예고 동작)을 통해 반드시 사전에 예고된다. 플레이어는 적을 처음 마주쳤을 때 낯설더라도, 반복 조우를 통해 패턴을 완전히 습득하고 정복하는 경험을 얻는다.

### 1.2. 설계 근거 (Reasoning)

| 결정 | 근거 |
| :--- | :--- |
| 상태 머신 7단계 구조 | 단순한 On/Off 이분법보다 세분화된 상태가 전투 리듬을 만든다. Cooldown 상태가 없으면 적이 멈추지 않아 "숨 쉴 틈"이 사라진다 |
| Tell 절대 필수 원칙 | Tell 없는 공격은 플레이어에게 불공정하다. 피해를 입었을 때 "내 실수"가 아닌 "게임이 불공정하다"는 인식이 생기면 이탈로 이어진다 |
| 화면 밖 비활성화 | 화면 밖의 적이 공격을 가하면 회피 불가능한 피해가 발생한다. 공정성 원칙에 따라 플레이어가 볼 수 없는 적은 행동하지 않는다 |
| 단일 타겟 어그로 | 다중 어그로 시스템은 멀티 환경에서 어그로 분산 전략을 유발하지만, MVP 단계에서는 단순한 단일 타겟 어그로로 구현 복잡도를 낮춘다 |
| 근접형 + 원거리형 MVP 2종 | `Design_Combat_Philosophy.md` 5.2절의 역할 분담 철학에 따라, 가장 대비되는 2종부터 구현하여 조합 전투의 기초를 마련한다 |

### 1.3. 3대 기둥 정렬 (Pillar Alignment)

| 기둥 | 적 AI에서의 구현 |
| :--- | :--- |
| 메트로베니아 탐험 | 층위별로 등장하는 적 유형이 다르다. 새 층위 진입 시 새로운 패턴의 적이 등장하여 탐험의 신선함을 유지한다. 적 처치가 곧 층위 정복의 증거이다 |
| 아이템계 야리코미 | 아이템계 지층에 따라 동일 유형의 적이 강화된다. 이미 알고 있는 패턴의 적이 더 강해진 상태로 등장하여, 학습한 전투 기술의 가치를 지속 확인할 수 있다 |
| 온라인 멀티플레이 | 파티 전투 시 근접형 + 원거리형 조합이 역할 분담을 자연스럽게 유도한다. 탱커가 Skeleton을 묶는 동안 딜러가 Ghost를 처리하는 파티 전술이 창발한다 |

### 1.4. 저주받은 문제 검증 (Cursed Problem Check)

| 문제 | 해결 방향 |
| :--- | :--- |
| Tell 시간이 너무 짧으면 사실상 Tell이 없는 것과 같지 않은가 | 모든 Tell의 최소 지속 시간을 0.3초로 강제한다. Skeleton Tell 0.4초, Ghost Tell 0.5초. 이 시간은 `Design_Combat_Philosophy.md` 4.2절 판단 시간 기준(0.2-0.3초)보다 충분히 길다 |
| 아이템계 스케일링이 너무 가파르면 진입 자체가 불가능해지지 않는가 | 지층별 적절한 스케일링으로 완만하게 설정한다. 각 지층의 보스가 있어 자연스러운 진행 체크포인트가 생긴다 |
| 단일 어그로 시스템에서 멀티 환경 시 한 명에게 모든 적이 집중되지 않는가 | 최근 피해를 준 플레이어로 어그로가 전환된다. 어그로 타겟 외 플레이어도 적에게 공격받을 수 있도록, 접촉 판정은 어그로 무관하게 항상 활성화한다 |
| 화면 밖 비활성화로 인해 적이 갑자기 초기화되어 이질감이 생기지 않는가 | 비활성화 시 AI 상태를 Idle로 리셋하지 않는다. 재활성화 시 직전 상태에서 재개하여 자연스러운 복귀를 보장한다 |

### 1.5. 위험과 보상 (Risk & Reward)

| 행동 | 위험 (Risk) | 보상 (Reward) |
| :--- | :--- | :--- |
| Skeleton 근접 교전 | ATK 사거리(1.5타일) 내 진입 필수. 피격 경직 중 연속 공격 위험 | 안정적인 근접 딜, 아이템 드랍 |
| Ghost 원거리 교전 유지 | 투사체 회피 부담. 이동 공간 필요 | 근접 위험 없이 딜 가능 |
| Ghost에 접근 교전 | 피격 시 강한 넉백으로 Ghost가 후퇴하며 거리 재확보 | Ghost Tell 시간 무력화, 즉시 격파 가능 |
| 근접 + 원거리 조합 동시 교전 | 판단 복잡도 증가. 한쪽 집중 시 나머지에게 피격 위험 | 빠른 처리 시 파티 보상 배율 증가 |

---

## 2. 메커닉 (Mechanics)

### 2.1. 적 AI 상태 머신 (State Machine)

모든 적 AI는 다음 7개 상태를 순환한다. 상태 전환 조건은 적 유형별로 파라미터가 다르나, 구조는 공통이다.

```
[상태 전환 다이어그램]

          스폰
           |
           v
        [Idle]
     (대기/정지)
           |
    patrol_enabled = true
           |
           v
       [Patrol]  <----- 감지 범위 이탈
     (구역 순찰)
           |
    감지 범위 + LoS 확인
           |
           v
       [Detect]
    (감지 확인 딜레이)
           |
      detect_confirm_ms 경과
           |
           v
       [Chase]  ----------> [Retreat]
     (플레이어 추적)         (거리 유지, Ghost 전용)
           |                     |
    공격 사거리 내 진입    유지 거리 확보 완료
           |                     |
           v                     v
       [Attack] <----------------+
     (공격 실행)
    Tell + 공격 판정
           |
    공격 완료
           |
           v
      [Cooldown]
    (공격 후 대기)
           |
    cooldown_ms 경과
           |
           v
    [Chase / Retreat] (반복)
```

### 2.2. 각 상태 정의

| 상태 | 진입 조건 | 탈출 조건 | 행동 |
| :--- | :--- | :--- | :--- |
| Idle | 스폰 직후, 또는 방 비활성 상태 | patrol_enabled = true: Patrol 전환. 플레이어 감지: Detect 전환 | 제자리 대기. 애니메이션: 기본 서 있는 자세 |
| Patrol | Idle에서 patrol_enabled 조건 충족 | 플레이어 감지: Detect 전환 | patrol_range 범위 내 왕복 이동. 플랫폼 엣지에서 반전 |
| Detect | 감지 반경 + 시야각 + LoS 동시 충족 | detect_confirm_ms 경과: Chase/Retreat 전환. 조건 미충족 복귀: Patrol 전환 | 이동 정지. 감지 확인 딜레이. 시각적 느낌표 이펙트 표시 |
| Chase | Detect 확정 후 (근접형) | 공격 사거리 진입: Attack 전환. 감지 범위 이탈: Patrol 전환 | 플레이어 방향으로 chase_speed로 이동 |
| Retreat | Detect 확정 후 (원거리형) | 유지 거리 범위 도달: Attack 전환 | 플레이어와의 거리를 keep_distance_min ~ keep_distance_max 유지하며 이동 |
| Attack | 공격 사거리 내 진입 (근접형) 또는 유지 거리 확보 (원거리형) | 공격 판정 완료: Cooldown 전환 | Tell 애니메이션 재생 후 공격 판정. 공격 중 이동 불가 |
| Cooldown | Attack 완료 | cooldown_ms 경과: Chase/Retreat 전환 | 이동 정지. 공격 불가. "숨 쉴 틈" 보장 |

### 2.3. 감지 시스템 (Detection System)

감지는 세 가지 조건이 모두 충족될 때만 성립한다. 하나라도 실패하면 감지가 이루어지지 않는다.

#### 감지 3조건

| 조건 | 설명 | 실패 시 |
| :--- | :--- | :--- |
| 감지 반경 (Detect Radius) | 적을 중심으로 한 원형 범위 내에 플레이어가 존재하는지 판정 | 범위 외: 감지 불가 |
| 시야각 (Field of View) | 적의 전방 벡터 기준으로 좌우 fov_angle_deg 이내에 플레이어가 위치하는지 판정 | 후방 접근: 감지 불가 (스텔스 접근 가능) |
| 시선 확인 (Line of Sight) | 적에서 플레이어까지 레이캐스트. 솔리드 타일 또는 플랫폼으로 차단되면 실패 | 장애물 뒤: 감지 불가 |

#### 감지 확인 딜레이

감지 조건 충족 즉시 Chase로 전환하지 않는다. `detect_confirm_ms` 동안 조건이 유지되어야 Detect 확정이 된다. 이 딜레이 동안 플레이어가 범위를 이탈하거나 장애물 뒤로 숨으면 감지가 취소된다. 이 메커닉이 "적 눈을 피해 숨어 진행하는" 탐험 플레이를 가능하게 한다.

### 2.4. 공격 예고 동작(Tell) 시스템

`Design_Combat_Philosophy.md` 5.3절의 Tell 원칙을 기술 명세로 구현한다.

#### Tell 공통 규칙

- 모든 적의 모든 공격에는 반드시 Tell이 존재한다. Tell 없는 공격은 구현 불가 사항이다.
- Tell 시작부터 피해 판정까지의 시간을 `tell_duration_ms`로 정의한다. 이 값은 최소 300ms 이상이어야 한다.
- Tell 애니메이션은 통상 동작과 시각적으로 확연히 구별되어야 한다.
- 동일한 Tell은 항상 동일한 공격으로 이어진다. Tell-공격 1:1 매핑 원칙.
- Tell 도중에는 적의 이동이 정지한다. 움직이면서 Tell을 재생하면 회피 판단이 불가능해진다.

#### Tell 판정 타임라인

```
[Tell 타임라인]

t=0ms       t=tell_duration_ms       t=tell_duration_ms + hit_active_ms
  |                  |                          |
  v                  v                          v
[Tell 시작]  [피해 판정 시작]          [피해 판정 종료]
 (예고 동작)   (히트박스 활성화)         (공격 완료 -> Cooldown)
```

### 2.5. 스폰 및 방 활성화 시스템

- 적은 방에 배치된 스폰 포인트(Spawn Point)에서 생성된다.
- 플레이어가 방에 진입하는 순간, 해당 방의 모든 스폰 포인트가 활성화되어 적이 소환된다.
- 방을 완전히 이탈하여 카메라에 방이 벗어나면, 방 내 살아있는 적은 Idle 상태로 전환되고 AI 연산이 일시 정지된다.
- 재진입 시 직전 HP와 상태를 유지한 채로 AI가 재개된다.

### 2.6. 사망 처리 시퀀스

사망은 항상 다음 순서로 처리된다:

```
[사망 시퀀스]

HP <= 0 확인
    |
    v
사망 이펙트 재생 (소멸 애니메이션, 파티클)
    |
    v
아이템 드랍 판정 (드랍 테이블 참조)
    |
    v
경험치 지급 (어그로 타겟 플레이어에게 지급)
    |
    v
엔티티 소멸 (씬에서 제거)
```

### 2.7. 어그로 시스템

- 적은 항상 단일 타겟에게 어그로를 유지한다.
- 어그로 타겟 결정 규칙: 가장 최근에 해당 적에게 피해를 준 플레이어.
- 어그로 타겟이 없는 상태(스폰 직후 또는 타겟 사망 시): 감지 범위 내 가장 가까운 플레이어로 자동 전환.
- 어그로와 무관하게, 모든 적의 물리 접촉 피해 판정은 범위 내 모든 플레이어에게 적용된다.

### 2.8. 아이템계 스케일링

아이템계에서는 지층 깊이와 아이템 레어리티에 따라 적 스탯이 비례 증가한다. "더 좋은 아이템 속에 더 강한 기억이 있다"는 내러티브 정합.

데미지 공식: `System_Combat_Damage.md` 기본 공식을 따른다.
물리 데미지: `(ATK * skill_multiplier) - DEF`, 최솟값 1.
스케일링 적용 스탯: HP, ATK, DEF.
스케일링 미적용 스탯: Weight (무게는 지층과 무관하게 고정). 이동/공격 속도는 무기 유형별 고정값.

#### 최종 적 스탯 공식

```
Final_Enemy_HP  = BaseHP  × HP_Scale_Factor(stratum) × Rarity_Scale(rarity)
Final_Enemy_ATK = BaseATK × ATK_Scale_Factor(stratum) × Rarity_Scale(rarity)
```

#### 지층별 스케일 계수

| 지층 | HP_Scale_Factor | ATK_Scale_Factor |
| :--- | :---: | :---: |
| 지층 1 (표층) | 1.0 | 1.0 |
| 지층 2 (중층) | 1.5 | 1.3 |
| 지층 3 (심층) | 2.5 | 1.8 |
| 심연 (Ancient 전용) | 4.0 | 2.8 |

ATK 스케일이 HP 스케일보다 완만한 이유: HP 증가는 전투 시간(TTK)을 늘려 피로감을 유발하지만, ATK 증가는 회피 실수의 비용을 높여 긴장감을 유지한다. HP 인플레는 야리코미 후기의 최대 재미 훼손 요소다.

#### 레어리티별 기본 스탯 보정

| 레어리티 | Rarity_Scale |
| :--- | :---: |
| Normal | × 1.0 |
| Magic | × 1.2 |
| Rare | × 1.5 |
| Legendary | × 2.0 |
| Ancient | × 3.0 |

#### 레거시 공식 참조 (개별 적 파라미터 파일용)

```yaml
item_world_scaling:
  formula:
    hp: "base_hp * (1 + hp_scale_per_stratum * stratum_number)"
    atk: "base_atk * (1 + atk_scale_per_stratum * stratum_number)"
    def: "base_def * (1 + def_scale_per_stratum * stratum_number)"
  note: "stratum_number는 1-based. 지층 1: 계수 1회 적용. 레어리티 보정은 별도 Rarity_Scale 곱산"
```

### 2.9. 9대 아키타입 분류

PA 아이템계의 일반 적(Mob)은 9개 아키타입으로 분류한다. 각 아키타입은 단일 위협 축만 담당하며, 조합으로 복합 위협을 구성한다. SotN의 핵심 원칙: 적 1마리는 단일 위협 축만 담당하고, 위협이 중첩되면 조우 구성(Encounter Composition)으로 처리한다.

| ID | 아키타입명 | 기존 적 매핑 | 위협 축 | 이동 패턴 | 공격 패턴 | 플레이어 대응 기술 | 도입 지층 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A-01** | 근접 돌격형 (Charger) | Skeleton / Forge Knight | 거리 압박 | 직선 추적 | 짧은 선딜 근접 타격 | 거리 관리, 패링 타이밍 | 지층 1 (튜토리얼) |
| **A-02** | 점프/바운스형 (Jumper) | Slime / Molten Slime | 불규칙 궤도 | 포물선 점프 반복 | 착지 범위 피해 | 예측 이동, 공중 타격 | 지층 1 |
| **A-03** | 원거리 사격형 (Shooter) | Ghost / Ember Wraith | 수평 공간 지배 | 이동-정지 반복 | 투사체 1~3발 | 엄폐, 투사체 회피 | 지층 1 후반 |
| **A-04** | 방어/방패형 (Shielder) | (Phase 2 신규) | 정면 공격 무효화 | 느린 전진 | 방패 강타 반격 | 측면 공격, 방패 파괴 기술 | 지층 2 후반 |
| **A-05** | 비행/공중형 (Flier) | Spark Bat (Phase 1 신규) | 수직 공간 활성화 | 자유 방향 비행 | 하강 급습, 반복 | 공중 타격, 반응 회피 | 지층 1 후반 |
| **A-06** | 군집형 (Swarmer) | Cinder Imp (Phase 1 신규) | 다수에 의한 압도 | 무리 이동 | 개별 약한 근접 타격 | AoE 공격, 자원 관리 | 지층 2 초반 |
| **A-07** | 앰부시형 (Ambusher) | (Phase 2 신규) | 서프라이즈 + 일시 패닉 | 천장/벽 은신 후 튀어나옴 | 급습 강타 1타 | 환경 경계, 빠른 반격 | 지층 2 |
| **A-08** | 지원/버퍼형 (Buffer) | (Phase 3 신규) | 전장 위협 증폭 | 후방 유지 | 다른 적 강화(속도↑/HP↑) | 우선 제거, 거리 조절 | 지층 3 |
| **A-09** | 엘리트형 (Elite) | Golden Monster / Forge Champion | 다층 위협 | 아키타입 조합 | 복수 공격 패턴 | 전체 기술 종합 | 모든 지층 보상방 |

#### 아키타입 복잡도 등급

SDT의 Competence(역량) 원리에 따라, 각 아키타입은 플레이어에게 요구하는 기술 복잡도가 다르다. 지층 1에서는 복잡도 1~2를 중심으로 도입하고, 지층 3에서 복잡도 3을 추가한다.

| 아키타입 | 복잡도 | 필요 기술 |
| :--- | :---: | :--- |
| A-01 근접 돌격형 | 1 | 기본 거리 관리 |
| A-02 점프형 | 1 | 예측 타격 |
| A-03 원거리 사격형 | 2 | 엄폐 이동 + 타이밍 |
| A-05 비행형 | 2 | 수직 공간 전투 |
| A-06 군집형 | 2 | AoE 활용, 자원 관리 |
| A-07 앰부시형 | 2 | 환경 경계 + 빠른 반격 |
| A-04 방어형 | 3 | 측면 공격 + 타이밍 조합 |
| A-08 지원형 | 3 | 우선순위 판단 + 다중 처리 |
| A-09 엘리트형 | 4 | 종합 기술 응용 |

### 2.10. 조우 구성 매트릭스

조우 설계는 2~3개 아키타입의 조합이 "어떤 인지 부하와 전략적 선택"을 만드는지를 정의한다. 난이도는 개별 적의 HP/ATK 수치가 아닌 아키타입 조합이 결정한다.

#### 2-조합 패턴 (7종)

| 조합 | 조합명 | 생성되는 전술 상황 | 요구 기술 | 권장 지층 |
| :--- | :--- | :--- | :--- | :--- |
| A-01 + A-03 | 탱크-포격 | 근접 압박과 원거리 압박 동시. 어느 쪽을 먼저 제거할지 우선순위 판단 필요 | 목표 우선순위 + 거리 관리 | 지층 1 후반 |
| A-02 + A-02 | 중복 점프 | 두 점프형의 위상이 어긋나 항상 한 마리가 공중에 있음. 안전 창이 없음 | 예측 타격 + 연속 판단 | 지층 1 |
| A-01 + A-05 | 지상-공중 | 지상 근접과 공중 접근이 동시에 압박. 수직+수평 공간 동시 관리 | 수직 전투 + 거리 관리 | 지층 2 초반 |
| A-03 + A-06 | 포격-군집 | 군집이 플레이어를 원거리 사격 방향으로 몰아붙임. 공간 선택 강제 | AoE 처리 + 이동선 확보 | 지층 2 |
| A-01 + A-08 | 강화-돌격 | 지원형이 근접형을 강화함. 지원형 제거 우선 vs. 근접형 처리 우선 딜레마 | 우선순위 판단 | 지층 3 |
| A-04 + A-03 | 방패-포격 | 방패형이 플레이어를 원거리 사격 방향으로 밀고, 뒤에서 사격형이 포격 | 측면 확보 + 타이밍 | 지층 2 후반 |
| A-07 + A-01 | 기습-추격 | 앰부시형이 패닉을 만들고, 근접형이 즉시 압박을 넣음. 회복 창 없음 | 빠른 반격 + 거리 확보 | 지층 2 |

#### 3-조합 패턴 (4종)

| 조합 | 조합명 | 생성되는 전술 상황 | 위험도 | 권장 지층 |
| :--- | :--- | :--- | :--- | :--- |
| A-01 + A-03 + A-05 | 삼축 압박 | 지상/공중/원거리 세 축이 동시에 압박. 어떤 방향으로도 완전 안전하지 않음 | 높음 | 지층 2 보스 전실 |
| A-06 + A-08 + A-03 | 강화 군집-포격 | 군집이 강화된 상태에서 원거리 포격과 함께 공간 지배. 공황 상태 유발 | 높음 | 지층 3 |
| A-07 + A-02 + A-01 | 기습-혼돈 | 앰부시가 패닉을 만들면 불규칙 점프형과 돌격형이 동시에 접근 | 매우 높음 | 지층 3 엘리트방 |
| A-04 + A-01 + A-05 | 요새화 | 방패형이 공간을 차단하고, 비행형이 상단을 제어하며, 근접형이 후방에서 압박 | 중간 | 지층 2 |

#### 방 타입별 조우 밀도

| 지층 | 방당 최소 적 | 방당 최대 적 | 엘리트 방 비율 |
| :--- | :---: | :---: | :---: |
| 지층 1 (표층) | 1 | 4 | 10% |
| 지층 2 (중층) | 2 | 5 | 15% |
| 지층 3 (심층) | 2 | 6 | 20% |
| 심연 (Ancient 전용) | 3 | 7 | 25% |

방당 최대 적이 7을 초과하면 "읽기 불가능한 혼돈"으로 전락한다. 4×4 방 크기를 고려할 때 6이 일반 지층 최대치.

### 2.11. 테마-적 연결

"아이템의 기억이 던전이 된다"는 PA 스파이크의 핵심은 테마와 적의 외형/행동이 일체감을 이룰 때 실현된다. 각 테마의 적은 세 요소가 일치해야 한다: (1) 테마와 일치하는 실루엣과 팔레트, (2) 테마의 기억이 만들어낸 행동 패턴, (3) 격파 시 "기억의 소멸" 느낌의 테마 파티클.

| 테마 ID | 테마명 | 내러티브 (기억의 성격) | 주력 아키타입 | 구체적 적 컨셉 | 행동 특이점 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T-FORGE** | 단조 | 뜨거운 화로 앞에서 망치질하던 장인의 기억 | A-01, A-04 | 불 원소 살아있는 갑옷, 해머 골렘, 용광로 불꽃 정령 | 근접 강타 시 화염 상태이상. 방패형은 내열 방패(충격파로만 파괴) |
| **T-WAR** | 전쟁 | 전장을 누볐던 병사의 기억 | A-01, A-03, A-09 | 망령 병사, 해골 궁수, 전쟁 짐승, 부서진 전쟁 기계 | 병사들이 편대를 이루는 경향 (2~3마리가 같은 방향에서 진격) |
| **T-NATURE** | 자연 | 숲 속에서 채집하던 자의 기억 | A-02, A-05, A-06 | 덩굴 식물, 독 곤충, 균류 포자, 날벌레 | 독 상태이상 부여. 군집형은 격파 시 주변에 포자 뿌림 |
| **T-ARCANE** | 마법 | 마법을 연구하던 학자의 기억 | A-03, A-08, A-09 | 룬 마법진, 마법 골렘, 에너지 위스프, 방어막 구체 | INT 빌드 약점 없음 (마법 저항 높음). 위스프는 지원형으로 골렘을 강화 |
| **T-TOMB** | 죽음 | 영면에 든 자의 기억, 혹은 장례의 기억 | A-01, A-06, A-07 | 해골 병사, 좀비 군중, 지박령, 매장 콜로서스 | 좀비 군집은 격파 후 재생 1회. 지박령은 앰부시형으로 벽에서 출현 |
| **T-VOYAGE** | 항해 | 먼 바다를 항해한 선원의 기억 | A-02, A-03, A-05 | 해적 망령, 해초 군집, 갈매기 정령, 닻 투사체 | 미끄러운 바닥 기믹과 연동. 원거리형이 닻을 던져 일시 속박 |
| **T-HUNT** | 사냥 | 짐승을 쫓던 사냥꾼의 기억 | A-01, A-07, A-09 | 야수 망령, 투명화 사냥꾼, 매 정령 | 앰부시형이 플레이어 등 뒤에서 출현. 엘리트 야수는 플레이어 ATK가 높을수록 강해지는 Enrage 메커닉 |
| **T-FAITH** | 신앙 | 신전을 섬기던 사제의 기억 | A-03, A-04, A-08 | 성화 파수대, 신성 방패 기사, 기도 정령, 성벽 수호자 | 방어형이 특히 강화됨. 지원형이 인근 적에게 방어막 부여 |
| **T-CRAFT** | 공예 | 정밀한 공예품을 만들던 장인의 기억 | A-04, A-07, A-09 | 정밀 기계 인형, 태엽 쥐, 절삭 디스크 | 앰부시형이 바닥 타일 속에서 튀어오름. 기계 인형은 특정 부위 파괴 메커닉 |
| **T-SHADOW** | 어둠 | 어둠 속에서 활동한 암살자의 기억 | A-01, A-07, A-09 | 그림자 도플갱어, 그림자 칼날, 어둠 속 눈 | 도플갱어는 플레이어의 이전 공격 패턴을 1가지 모방. 어둠 속 눈은 시야 감소 디버프 부여 |

아트 효율화 공식: `[기본 실루엣 아트] × [테마 팔레트 LUT] × [행동 모디파이어] = 테마 전용 적`. 독립 아트 자산 12~15종으로 40~60가지 체감 적을 구현하는 것이 목표다.

### 2.12. 행동 모디파이어 8종

행동 모디파이어는 기존 아키타입 기본 동작에 덧붙이는 변형 레이어다. Hades의 Pact of Punishment가 보여준 것처럼, 아트 자산 추가 없이 행동 변형만으로 체감 다양성을 극대화한다. 지층이 깊어질수록 동시 적용 모디파이어 수가 증가한다 (지층 1: 1개, 지층 2: 2개, 지층 3: 3개).

| 모디파이어 ID | 이름 | 효과 | 어울리는 테마 |
| :--- | :--- | :--- | :--- |
| **MOD-01** | 원소 강타 | 근접 공격에 해당 테마 원소 상태이상 추가 | T-FORGE(화염), T-NATURE(독), T-ARCANE(뇌) |
| **MOD-02** | 격파 후 폭발 | 격파 시 범위 피해 또는 파티클 방출 | T-FORGE, T-NATURE(포자) |
| **MOD-03** | 소환 | 격파 직전 소환형 전환 (소규모 군집 소환) | T-TOMB, T-WAR |
| **MOD-04** | 방어막 | 일정 HP 이하에서 일시 방어막 활성화 | T-FAITH, T-ARCANE |
| **MOD-05** | 재생 | 격파 후 1회 부활 (저HP로) | T-TOMB |
| **MOD-06** | 광분 (Enrage) | HP 50% 이하에서 속도/ATK 급증 | T-HUNT, T-WAR |
| **MOD-07** | 속박 | 투사체 명중 시 플레이어 일시 속박 | T-VOYAGE, T-FAITH |
| **MOD-08** | 디버프 부여 | 공격 시 시야 감소/이동속도 감소 | T-SHADOW, T-NATURE |

---

## 3. 규칙 (Rules)

### 3.1. 공통 금지 규칙

| 규칙 | 내용 | 근거 |
| :--- | :--- | :--- |
| 화면 밖 공격 금지 | 카메라 뷰포트 밖에 있는 적은 Attack 상태로 전환 불가 | 공정성 원칙: 플레이어가 볼 수 없는 공격은 회피 불가 |
| Tell 없는 공격 금지 | tell_duration_ms < 300ms인 공격 패턴은 구현 금지 | 반응 시간 보장 원칙 |
| Cooldown 없는 연속 공격 금지 | Attack 완료 후 반드시 Cooldown 상태를 거쳐야 한다 | "숨 쉴 틈" 보장 원칙 |
| 스폰 즉시 공격 금지 | 스폰 후 최소 spawn_grace_ms 동안 Attack 상태 진입 불가 | 플레이어 인식 시간 보장 |

### 3.2. 감지 규칙

- 감지는 반드시 반경 + 시야각 + LoS 세 조건을 동시에 충족해야 한다.
- LoS 판정에 사용하는 레이캐스트는 타일 레이어의 솔리드 레이어만 참조한다. 일반 플랫폼 타일은 LoS를 차단하지 않는다.
- 감지 확인 딜레이(`detect_confirm_ms`) 도중 플레이어가 장애물 뒤로 숨으면 감지가 즉시 취소되고 Patrol 상태로 복귀한다.
- 이미 Chase 또는 Retreat 상태인 적이 플레이어를 놓쳤을 경우(LoS 차단 또는 감지 반경 이탈): `lose_target_delay_ms` 경과 후 Patrol 상태로 복귀한다.

### 3.3. 공격 규칙

- 공격 판정(히트박스 활성화)은 Tell 애니메이션 완료 직후에만 발생한다.
- 피해 판정 공식: `System_Combat_Damage.md`의 물리 데미지 공식을 따른다.
- 피격 경직: 약공격 피해 200ms, 중공격 피해 300ms (`System_Combat_Action.md` CMB-04-A 기준).
- 넉백 계산: `actual_knockback = knockback_force / weight`.
- 히트스탑: 공격 적중 시 `System_Combat_Action.md` CMB-05-A 기준 히트스탑 적용.

### 3.4. 사망 규칙

- HP가 0 이하가 되는 순간 즉시 사망 처리가 시작된다.
- 사망 처리 중(소멸 애니메이션 재생 중)에는 피해 판정이 비활성화된다. 이미 죽은 적의 히트박스가 남아 플레이어를 피해주는 상황을 방지한다.
- 아이템 드랍 판정은 드랍 테이블(`Sheets/Content_Enemy_Drop_Table.csv`)을 따른다.
- 경험치는 어그로 타겟 플레이어 1인에게만 지급한다. 파티 경험치 공유는 Phase 3에서 추가한다.

### 3.5. 아이템계 스케일링 적용 규칙

- 스케일링은 스폰 시 한 번만 계산되어 고정된다. 전투 중 지층 변동에 따른 실시간 재계산은 하지 않는다.
- DEF 스케일링은 플레이어에게 적용되는 방어 관통(Penetration) 스탯과 상호작용한다. `System_Combat_Damage.md` DEF 공식을 따른다.

---

## 4. 데이터 & 파라미터 (Parameters)

### 4.1. Skeleton 파라미터

```yaml
enemy_skeleton:
  id: ENM_SKELETON
  type: melee
  display_name: "스켈레톤"

  # 기본 스탯 (Lv1, 아이템계 미적용)
  stats:
    hp: 50
    atk: 8
    def: 3
    spd: 1.5        # 이동 속도 (타일/초)
    weight: 1.0     # 넉백 저항 계수. actual_knockback = force / weight

  # 아이템계 지층 스케일링 계수 (지층당 증가율)
  item_world_scaling:
    hp_scale_per_stratum: 0.50    # 지층당 HP +50%
    atk_scale_per_stratum: 0.30   # 지층당 ATK +30%
    def_scale_per_stratum: 0.20   # 지층당 DEF +20%

  # 감지 파라미터
  detection:
    detect_radius_tiles: 6        # 감지 반경 (타일 단위)
    fov_angle_deg: 120            # 전방 기준 시야각 (좌우 각각 60도)
    los_check: true               # Line of Sight 판정 활성화
    detect_confirm_ms: 200        # 감지 확정 딜레이
    lose_target_delay_ms: 1500    # 타겟 놓친 후 Patrol 복귀까지 대기

  # 이동 파라미터
  movement:
    chase_speed: 1.5              # Chase 상태 이동 속도 (타일/초)
    patrol_range_tiles: 4         # Idle 스폰 포인트 기준 순찰 범위
    patrol_speed: 0.8             # Patrol 상태 이동 속도

  # 공격 파라미터
  attack:
    attack_id: ATK_SKELETON_SLASH
    attack_type: melee
    attack_range_tiles: 1.5       # 공격 판정 사거리
    attack_width_tiles: 1.5       # 공격 판정 수평 너비 (전방 수평 베기)

    # Tell (예고 동작)
    tell_animation: "skeleton_windup"   # 팔 뒤로 젖히기 애니메이션
    tell_duration_ms: 400               # Tell 지속 시간 (0.4초)

    # 피해 판정
    hit_active_ms: 200            # 히트박스 활성화 지속 시간
    damage_multiplier: 1.0        # 기본 데미지 배율 (ATK * 1.0 - 상대 DEF)
    knockback_force: 3.0          # 넉백 힘. actual_knockback = 3.0 / target_weight
    hitstun_type: light           # 피격 경직 유형: light (200ms)

    # 쿨다운
    cooldown_ms: 1200             # 공격 완료 후 다음 공격까지 대기 시간

  # 스폰 파라미터
  spawn:
    spawn_grace_ms: 500           # 스폰 후 Attack 상태 진입 금지 시간

  # 드랍 테이블
  drop:
    xp: 10
    drop_table_ref: "Sheets/Content_Enemy_Drop_Table.csv#ENM_SKELETON"
```

### 4.2. Ghost 파라미터

```yaml
enemy_ghost:
  id: ENM_GHOST
  type: ranged
  display_name: "고스트"

  # 기본 스탯 (Lv1, 아이템계 미적용)
  stats:
    hp: 30
    atk: 10
    def: 1
    spd: 2.0        # 이동 속도 (타일/초)
    weight: 0.5     # 가벼운 적: 넉백이 크다. actual_knockback = force / 0.5

  # 아이템계 지층 스케일링 계수
  item_world_scaling:
    hp_scale_per_stratum: 0.50    # 지층당 HP +50%
    atk_scale_per_stratum: 0.30   # 지층당 ATK +30%
    def_scale_per_stratum: 0.20   # 지층당 DEF +20%

  # 감지 파라미터
  detection:
    detect_radius_tiles: 8        # 감지 반경 (타일 단위)
    fov_angle_deg: 150            # 전방 기준 시야각 (좌우 각각 75도)
    los_check: true               # Line of Sight 판정 활성화
    detect_confirm_ms: 150        # 감지 확정 딜레이 (Skeleton보다 빠름)
    lose_target_delay_ms: 2000    # 타겟 놓친 후 Patrol 복귀까지 대기

  # 이동 파라미터 (Retreat 상태 전용)
  movement:
    retreat_speed: 2.0            # Retreat 상태 이동 속도 (타일/초)
    keep_distance_min_tiles: 4    # 플레이어와의 최소 유지 거리
    keep_distance_max_tiles: 6    # 플레이어와의 최대 유지 거리
    patrol_range_tiles: 5
    patrol_speed: 1.0

  # 공격 파라미터
  attack:
    attack_id: ATK_GHOST_PROJECTILE
    attack_type: ranged

    # Tell (예고 동작)
    tell_animation: "ghost_charge"  # 몸체 발광 애니메이션
    tell_duration_ms: 500           # Tell 지속 시간 (0.5초)

    # 투사체
    projectile_id: PROJ_GHOST_ORB
    projectile_speed_px_per_frame: 4    # 투사체 이동 속도
    projectile_lifetime_ms: 3000        # 투사체 최대 생존 시간

    # 피해 판정
    damage_multiplier: 1.0        # 기본 데미지 배율
    knockback_force: 2.0          # 투사체 명중 시 넉백 힘
    hitstun_type: light           # 피격 경직 유형: light (200ms)

    # 쿨다운
    cooldown_ms: 2000             # 공격 완료 후 다음 공격까지 대기 시간

  # 피격 시 후퇴 (특수 행동)
  on_hit_behavior:
    trigger: "피격 발생 시"
    action: "즉시 Retreat 상태 강제 전환"
    retreat_impulse_tiles: 2.0    # 피격 방향 반대로 즉시 이동 거리 (넉백 추가)
    note: "weight 0.5 + on_hit retreat로 Ghost의 근접 취약성을 극대화한다"

  # 스폰 파라미터
  spawn:
    spawn_grace_ms: 500

  # 드랍 테이블
  drop:
    xp: 15
    drop_table_ref: "Sheets/Content_Enemy_Drop_Table.csv#ENM_GHOST"
```

### 4.3. Spark Bat 파라미터 (A-05 비행형, Phase 1 신규)

```yaml
enemy_spark_bat:
  id: ENM_SPARK_BAT
  archetype: A-05   # 비행/공중형 (Flier)
  type: aerial
  display_name: "Spark Bat"
  theme: T-FORGE

  # 기본 스탯 (Lv1, 아이템계 미적용)
  stats:
    hp: 25
    atk: 7
    def: 1
    spd: 3.0        # 이동 속도 (타일/초) — 비행형은 빠름
    weight: 0.4     # 매우 가벼움. actual_knockback = force / 0.4

  # 아이템계 지층 스케일링 계수
  item_world_scaling:
    hp_scale_per_stratum: 0.50
    atk_scale_per_stratum: 0.30
    def_scale_per_stratum: 0.15

  # 감지 파라미터
  detection:
    detect_radius_tiles: 7
    fov_angle_deg: 360          # 전방위 감지 (비행형)
    los_check: true
    detect_confirm_ms: 100      # 빠른 반응
    lose_target_delay_ms: 1000

  # 이동 파라미터 (공중 자유 이동)
  movement:
    move_type: aerial           # 중력 무시 자유 방향 이동
    chase_speed: 3.0
    patrol_range_tiles: 5
    patrol_speed: 1.5
    patrol_pattern: figure_eight  # 8자 순찰 패턴

  # 공격 패턴 — 하강 급습 (Dive Attack)
  attack:
    attack_id: ATK_SPARK_BAT_DIVE
    attack_type: melee_aerial

    # Tell: 머리 위 솟구쳐 고속 하강 준비 자세
    tell_animation: "spark_bat_dive_windup"
    tell_duration_ms: 350       # 0.35초 (최소 300ms 규칙 준수)

    # 피해 판정
    hit_active_ms: 150
    damage_multiplier: 1.2      # 하강 급습 배율
    knockback_force: 2.5
    hitstun_type: light

    # 공격 후 재상승 (Flier 특유 행동)
    post_attack_behavior: "즉시 상방으로 chase_speed × 1.5 속도로 재상승. Cooldown 진입"
    cooldown_ms: 1500

  # 스폰 파라미터
  spawn:
    spawn_grace_ms: 400
    spawn_height_tiles: 3       # 스폰 시 바닥에서 3타일 위에 생성

  # 드랍 테이블
  drop:
    xp: 12
    drop_table_ref: "Sheets/Content_Enemy_Drop_Table.csv#ENM_SPARK_BAT"
```

### 4.4. Cinder Imp 파라미터 (A-06 군집형, Phase 1 신규)

```yaml
enemy_cinder_imp:
  id: ENM_CINDER_IMP
  archetype: A-06   # 군집형 (Swarmer)
  type: swarm
  display_name: "Cinder Imp"
  theme: T-FORGE

  # 기본 스탯 (Lv1, 아이템계 미적용)
  # 군집형: 개체 스탯은 낮지만 수로 압도
  stats:
    hp: 15
    atk: 4
    def: 0
    spd: 2.0
    weight: 0.3     # 매우 가벼움

  # 아이템계 지층 스케일링 계수
  item_world_scaling:
    hp_scale_per_stratum: 0.40
    atk_scale_per_stratum: 0.25
    def_scale_per_stratum: 0.10

  # 감지 파라미터
  detection:
    detect_radius_tiles: 5
    fov_angle_deg: 360          # 전방위 감지 (군집 본능)
    los_check: false            # 군집형은 LoS 판정 생략 (무리 행동)
    detect_confirm_ms: 50       # 즉각 반응
    lose_target_delay_ms: 3000  # 타겟을 오래 추적

  # 이동 파라미터
  movement:
    chase_speed: 2.0
    patrol_range_tiles: 3
    patrol_speed: 1.0
    swarm_behavior: true        # 무리 내 다른 Cinder Imp와 군집 이동 활성화
    swarm_radius_tiles: 1.5     # 무리 내 개체 간 유지 거리

  # 공격 파라미터 — 약한 근접 타격
  attack:
    attack_id: ATK_CINDER_IMP_SCRATCH
    attack_type: melee

    tell_animation: "cinder_imp_scratch_windup"
    tell_duration_ms: 300       # 최소 기준치. 군집형의 빠른 공격 반영

    hit_active_ms: 100
    damage_multiplier: 0.7      # 개체 피해는 낮음. 수로 보완
    knockback_force: 1.0        # 약한 넉백
    hitstun_type: light

    cooldown_ms: 800            # 짧은 쿨다운. 빠른 반복 공격

  # 스폰 파라미터
  spawn:
    spawn_grace_ms: 300
    spawn_count_min: 3          # 최소 3마리 동시 스폰 (군집형 의도)
    spawn_count_max: 5

  # 드랍 테이블
  drop:
    xp: 5                       # 개체 경험치는 낮음
    drop_table_ref: "Sheets/Content_Enemy_Drop_Table.csv#ENM_CINDER_IMP"
```

### 4.5. Gladiator 이노센트 파라미터 (야생 이노센트, Phase 1 신규)

```yaml
innocent_gladiator:
  id: INN_GLADIATOR
  type: innocent_wild
  display_name: "Gladiator"
  innocent_type: stat_boost     # 스탯형 이노센트 (기본형)
  effect_when_tamed: "STR +X (레벨에 따라 결정)"

  # 기본 스탯
  stats:
    hp: 20
    atk: 3              # 코너링 시 약한 방어 공격만 사용
    def: 0
    spd: 3.75           # 플레이어 기본 속도 × 0.75 = 도주 속도 기준

  # 이노센트 AI — 일반 적 상태 머신과 다름
  ai_states:
    IDLE:
      description: "방 내 배회 또는 구조물에 잠든 상태"
      trigger_to_alerted: "플레이어 감지 반경 진입"
    ALERTED:
      description: "각성 애니메이션 재생"
      duration_ms: 700          # 0.7초 각성 시간 (플레이어 인식 기회)
      vfx: "gladiator_wake_aura"  # 흰색 오라 이펙트
      trigger_to_flee: "각성 완료"
    FLEE:
      description: "플레이어 반대 방향으로 도주"
      flee_speed_ratio: 0.75    # 플레이어 기본 이동속도의 75%
      wall_behavior: "벽 도달 시 반대 방향으로 전환"
      trigger_to_cornered: "이동 불가 상태 0.5초 이상 지속"
    CORNERED:
      description: "탈출로 없을 때 약한 방어 근접 공격"
      attack_id: ATK_INN_GLADIATOR_DEFENSIVE
      tell_duration_ms: 400
      damage_multiplier: 0.5
    CAPTURED:
      description: "HP 0 도달 시 격파 대신 Tamed 전환"
      result: "Tamed Gladiator 아이템 획득. 경험치 미지급"
      vfx: "innocent_tamed_sparkle"

  # 등장 연출 3단계
  spawn_presentation:
    step1_signal: "방 진입 직후 희미한 흰색 오라가 구조물에서 깜박임"
    step2_wake: "플레이어 접근 시 ALERTED 진입 + 짧은 종 소리"
    step3_action: "각성 후 0.3초 내 FLEE 행동 시작"

  # 드랍
  drop:
    on_captured: "Tamed Gladiator (스탯 아이템)"
    on_flee_escaped: "없음 (파밍 기회 손실)"
    xp: 0
```

### 4.6. 공통 파라미터 참조

```yaml
common_enemy_params:
  # 사망 처리
  death:
    death_anim_ms: 600          # 소멸 애니메이션 지속 시간
    hitbox_disable_on_death: true

  # 화면 밖 처리
  offscreen:
    deactivate_outside_camera: true
    state_reset_on_deactivate: false   # 비활성화 시 상태 유지 (Idle 리셋 안 함)

  # 피해 공식 참조
  damage_formula_ref: "Documents/System/System_Combat_Damage.md"
  damage_data_ref: "Sheets/Content_System_Damage_Formula.csv"
```

---

## 5. 예외 처리 (Edge Cases)

### 5.1. 감지 예외

| 상황 | 처리 방식 |
| :--- | :--- |
| 플레이어가 감지 반경과 시야각은 충족하지만 LoS가 차단된 경우 | 감지 실패. Patrol 유지. LoS 세 조건이 모두 충족되어야만 감지 성립 |
| 감지 확인 딜레이 도중 플레이어가 시야각에서 벗어난 경우 | 감지 즉시 취소. 딜레이 타이머 리셋. Patrol 복귀 |
| 이미 Chase 상태인 적이 LoS를 잃은 경우 | lose_target_delay_ms 동안 마지막 알려진 플레이어 위치로 계속 이동. 딜레이 경과 후 Patrol 복귀 |
| 적이 Chase 중 플레이어가 텔레포트나 순간 이동으로 감지 반경 이탈 | lose_target_delay_ms 이후 Patrol 복귀. 강제 추적 없음 |

### 5.2. 공격 예외

| 상황 | 처리 방식 |
| :--- | :--- |
| Tell 재생 중 플레이어가 공격 사거리 밖으로 이동 | Tell 애니메이션은 완료까지 재생한다. 공격 판정(히트박스) 활성화 시 사거리 내 플레이어가 없으면 공격 무효. Cooldown 진입 |
| Tell 재생 중 플레이어가 사망 | Tell 완료 후 공격 판정. 히트 대상 없음. Cooldown 진입 후 새 타겟 탐색 |
| Ghost Tell 중 플레이어의 공격으로 Ghost가 피격 | on_hit_behavior 규칙 적용: Ghost 즉시 Retreat 상태로 전환. Tell 중단 (투사체 미발사). Cooldown 진입 |
| Attack 상태 중 카메라 밖으로 이동하는 경우 | 이미 시작된 Attack 시퀀스는 완료한다. 다음 Chase/Attack 전환 시점부터 화면 밖 공격 금지 규칙 적용 |

### 5.3. 사망 예외

| 상황 | 처리 방식 |
| :--- | :--- |
| Tell 재생 중 적이 사망 | 즉시 사망 처리 시작. 공격 판정은 발생하지 않는다 |
| 두 플레이어가 동시에 동일한 적에게 마지막 피해를 준 경우 | 서버 타임스탬프 기준으로 먼저 도달한 피해 기준 사망 처리. 경험치는 어그로 타겟 플레이어에게 지급 |
| 아이템계에서 적 사망 시 드랍 아이템이 바닥 없는 공간에 생성 | 드랍 아이템은 중력 적용. 가장 가까운 플랫폼 위에 착지하거나, 착지 불가 시 플레이어 위치에 직접 지급 |

### 5.4. 아이템계 스케일링 예외

| 상황 | 처리 방식 |
| :--- | :--- |
| 지층 번호가 0인 경우 (로직 오류) | 스케일링 계수 미적용. 기본 스탯(Lv1) 그대로 사용 |
| 스케일링 결과 ATK가 플레이어 최대 HP를 초과하는 경우 | ATK 상한 캡: `player_base_hp * 2.0`을 최대값으로 제한. 최소 데미지 1 원칙은 항상 유지 |
| 파티 내 플레이어 수준 차이가 클 때 (낮은 레벨 플레이어 참여) | 지층 스케일링은 지층 번호만 참조. 파티원 레벨은 적 스탯에 영향을 주지 않는다 |

### 5.5. 멀티플레이 예외

| 상황 | 처리 방식 |
| :--- | :--- |
| 한 플레이어가 방에서 이탈하고 다른 플레이어가 방 안에 있는 경우 | 방은 활성 상태 유지. 방 안 플레이어가 모두 이탈할 때만 비활성화 |
| 어그로 타겟 플레이어가 사망한 경우 | 감지 범위 내 가장 가까운 살아있는 플레이어로 어그로 즉시 전환 |
| 플레이어 수 변화로 어그로 타겟이 없어진 경우 | Patrol 상태로 복귀 |

---

## 검증 기준 (Validation Criteria)

### 구현 완료 검증

| 검증 항목 | 검증 방법 | 통과 기준 |
| :--- | :--- | :--- |
| Tell 시간 보장 | Skeleton, Ghost 각각 공격 영상 프레임 분석 | Tell 시작부터 히트박스 활성화까지 Skeleton 400ms 이상, Ghost 500ms 이상 |
| 화면 밖 공격 불가 | 적이 화면 밖에 있는 상태에서 Attack 상태 진입 시도 | 화면 밖 적은 Attack 상태 진입 불가 확인 |
| 감지 3조건 독립성 | 시야각 범위 외 접근, 장애물 뒤 접근 각각 테스트 | 단일 조건 실패 시 감지 불성립 확인 |
| Cooldown 강제 | 적 공격 완료 직후 플레이어 접촉 | cooldown_ms 동안 추가 Attack 발생하지 않음 |
| 아이템계 스케일링 수치 | 지층 1, 2, 3, 4에서 적 스탯 로그 출력 | 공식 `base * (1 + scale_per_stratum * stratum)` 결과와 일치 |
| Ghost 피격 후퇴 | Ghost에게 근접 공격 적중 | 피격 즉시 Retreat 상태 전환 및 on_hit retreat_impulse 이동 확인 |
| 사망 시퀀스 순서 | 적 HP 0 도달 후 시퀀스 관찰 | 소멸 이펙트 -> 아이템 드랍 -> 경험치 지급 순서 준수 |

### 밸런스 검증 기준

| 기준 | 목표값 |
| :--- | :--- |
| 플레이어 Lv1 vs Skeleton Lv1 1:1 전투 소요 시간 | 10-20초 |
| 플레이어 Lv1 vs Ghost Lv1 1:1 전투 소요 시간 | 8-15초 |
| 아이템계 지층 2 적이 지층 1 대비 체감 강도 | "눈에 띄게 강하지만 무리하면 잡을 수 있는" 수준 |
| Tell 후 회피 성공률 (신규 플레이어 기준) | 3회 조우 후 50% 이상 회피 성공 |

---

## Phase 2 추가 예정

다음 항목은 Phase 2(알파) 단계에서 추가한다. 본 문서는 Phase 1 MVP 범위만 정의한다.

| 항목 | 내용 |
| :--- | :--- |
| 적 10종+ 추가 | 탱커형, 자폭형, 서포터형 적 포함. `Design_Combat_Philosophy.md` 5.2절 역할 분담 전체 구현 |
| 보스 AI | 페이즈 전환, 보스 3역할(시험관/서사 장치/페이스 조절자) 구현. `Design_Combat_Philosophy.md` 6절 기준 |
| 난이도별 스케일링 | 월드 층위별 적 기본 스탯 차이. 난이도 설정에 따른 스케일링 계수 조정 |
| 적 조합 규칙 | 층위별 적 조합 테이블. `Design_Combat_Philosophy.md` 5.2절 기본 조합 원칙 데이터화 |
| 슈퍼 아머 | 탱커형/보스 전용. `System_Combat_Action.md` CMB-04-B 기준 |
