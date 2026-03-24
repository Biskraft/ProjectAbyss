# 적 AI 시스템 (Enemy AI System)

## 구현 현황 (Implementation Status)

> 최근 업데이트: 2026-03-23
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
| 메트로베니아 탐험 | 구역별로 등장하는 적 유형이 다르다. 새 구역 진입 시 새로운 패턴의 적이 등장하여 탐험의 신선함을 유지한다. 적 처치가 곧 구역 정복의 증거이다 |
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

아이템계에서는 지층 깊이에 따라 적 스탯이 기본값에서 비례 증가한다.

데미지 공식: `System_Combat_Damage.md` 기본 공식을 따른다.
물리 데미지: `(ATK * skill_multiplier) - DEF`, 최솟값 1.
스케일링 적용 스탯: HP, ATK, DEF.
스케일링 미적용 스탯: SPD, Weight (속도와 무게는 지층과 무관하게 고정).

```yaml
item_world_scaling:
  formula:
    hp: "base_hp * (1 + hp_scale_per_stratum * stratum_number)"
    atk: "base_atk * (1 + atk_scale_per_stratum * stratum_number)"
    def: "base_def * (1 + def_scale_per_stratum * stratum_number)"
  note: "stratum_number는 1-based. 지층 1: 계수 1회 적용"
```

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

### 4.3. 공통 파라미터 참조

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
| 난이도별 스케일링 | 월드 구역별 적 기본 스탯 차이. 난이도 설정에 따른 스케일링 계수 조정 |
| 적 조합 규칙 | 구역별 적 조합 테이블. `Design_Combat_Philosophy.md` 5.2절 기본 조합 원칙 데이터화 |
| 슈퍼 아머 | 탱커형/보스 전용. `System_Combat_Action.md` CMB-04-B 기준 |
