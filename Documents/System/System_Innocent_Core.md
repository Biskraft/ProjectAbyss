# 이노센트 코어 시스템 (Innocent Core System) — SYS-INC-01

## §0. 필수 참고 자료 (Mandatory References)

- Project Vision: `Documents/Terms/Project_Vision_Abyss.md`
- Writing Standards: `Documents/Terms/GDD_Writing_Rules.md`
- Glossary: `Documents/Terms/Glossary.md`
- 야리코미 철학: `Documents/Design/Design_Yarikomi_Philosophy.md`
- 핵심 순환 구조: `Documents/Design/Design_CoreLoop_Circulation.md`
- 아이템계 코어: `Documents/System/System_ItemWorld_Core.md` (SYS-IW-01)
- 장비 레어리티: `Documents/System/System_Equipment_Rarity.md`
- 스탯 게이트: `Documents/System/System_World_StatGating.md`
- 3-Space 아키텍처: `Documents/Design/Design_Architecture_3Space.md`
- 디스가이아 이노센트 연구: `Documents/Research/Disgaea_ItemWorld_InnocentSystem.md`
- 이노센트 분류 밸런스 연구: `Documents/Research/Innocent_Classification_Balance_Research.md`
- 이노센트 성장 경제 연구: `Documents/Research/Innocent_Growth_Economy_Research.md`
- 이노센트 전투 행동 연구: `Documents/Research/Innocent_Combat_Behavior_Research.md`

---

## 구현 현황 (Implementation Status)

> 최근 업데이트: 2026-04-05
> 문서 상태: `확정 (Final)`
> 2-Space: Item World (아이템계), World (스탯 게이트 판정)
> 기둥: 야리코미 (주), 메트로베니아 탐험 (부), 온라인 멀티플레이 (부)

| 기능 ID  | 분류    | 기능명 (Feature Name)                     | 우선순위 | 구현 상태 | 비고                                                    |
| :------- | :------ | :---------------------------------------- | :------: | :-------- | :------------------------------------------------------ |
| INC-01-A | 코어    | Wild/Tamed 이분법 상태 관리               |    P0    | 대기      | Wild=50% 효과, Tamed=100% + 레벨 2배                   |
| INC-02-A | 코어    | 이노센트 타입 정의 (4분류 12종)           |    P0    | 대기      | Basic 3 + Behavioral 6 + Elemental 3                   |
| INC-02-B | 코어    | No.1 서사 이노센트                        |    P1    | 대기      | P1: 비주얼 전용. P2: 서사 트리거 연동                  |
| INC-03-A | 슬롯    | 레어리티별 슬롯 수 (2~8)                  |    P0    | 대기      | Normal 2 ~ Ancient 8                                   |
| INC-04-A | 드롭    | Wild 이노센트 아이템계 내 조우            |    P0    | 대기      | 방 클리어 시 확률 스폰 (`INNOCENT_SPAWN_RATE`)         |
| INC-05-A | 전투    | 이노센트 복종 전투 규칙                   |    P0    | 대기      | 격파 = Tamed 확정. 레벨 2배 즉각 적용                 |
| INC-06-A | 합성    | 동종 이노센트 합성 (레벨 합산)            |    P1    | 대기      | 세이브 포인트 대장간 NPC                               |
| INC-07-A | 경제    | 잉여 이노센트 분해 → 레어리티 승급 재료   |    P1    | 대기      | 이노센트가 Memory Fragment를 겸함. §2.6 참조           |
| INC-08-A | 게이트  | 기본형 이노센트 스탯 게이트 문지기 역할   |    P0    | 대기      | ATK/INT/HP 게이트 충족 경로. §2.1 참조                 |

---

## §1. 개요 (Concept)

### §1.1. 설계 의도 (Intent)

> "이노센트는 아이템 내부에 거주하는 주민이다. 야생(Wild) 상태에서는 절반의 힘만 발휘하지만, 아이템계에서 격파하여 복종(Tamed)시키는 순간 효과가 2배가 되고, 다른 아이템으로 옮길 수 있으며, 같은 종류와 합성하여 레벨을 쌓을 수 있다. 기본형 이노센트는 스탯 게이트를 여는 열쇠이며, 행동형 이노센트는 그 위에 쌓는 빌드 정체성이다."

이노센트 시스템은 두 개의 역할을 동시에 수행한다.

첫째, 스탯 게이트의 문지기다. ATK 게이트 50이 막혀 있을 때, 플레이어는 Gladiator 이노센트를 복종시키고 합성하여 수치를 채운다. 이노센트가 없으면 아무리 높은 레어리티 장비를 얻어도 게이트를 넘지 못한다. 기본형(Basic) 이노센트 3종은 이 경로의 핵심 수단이다.

둘째, 빌드 정체성의 층위다. 게이트를 넘은 다음, 플레이어는 행동형(Behavioral) 이노센트로 "어떻게 싸울 것인가"를 결정한다. Berserker를 쌓을지, Vampire로 공격적 생존을 택할지, Ghost로 회피 특화를 갈지 — 같은 장비라도 이노센트 구성에 따라 전혀 다른 전투 경험이 된다.

에르다에게 이노센트를 복종시키는 행위는 대장장이의 두드림과 같다 — 아이템 내부의 혼돈을 격파하여 쓸 수 있는 형태로 만드는 것. 에코(Echo)로 아이템계에 진입하는 것도, 이노센트를 격파하는 것도, 모두 같은 행위의 연장이다.

### §1.2. 설계 근거 (Reasoning)

| 설계 결정 | 채택 이유 | 기각된 대안 |
| :--- | :--- | :--- |
| 기본형 = 스탯 게이트 문지기 | 이노센트에 "반드시 해야 하는 이유"를 부여. 아이템계 진입 동기가 선택이 아닌 필요로 격상 | 기본형을 선택지로만 — 야리코미 진입 압박이 없어 파밍 동기 약화 |
| Wild 50% / Tamed 100% + 레벨 2배 | 격파(리스크)에 따른 4배 실효 보상이 아이템계 진입의 결정적 동기. 복종 순간의 수치 점프가 체감 강화를 만듦 | 처음부터 Tamed — 격파 긴장감 소실, 야리코미 동기 약화 |
| 레벨 선형 합산 (A+B=A.Lv+B.Lv) | 예측 가능한 합성 결과로 장기 계획 수립 가능. 저레벨 이노센트도 "합칠 재료"로 가치 유지 | 랜덤 합성 — 좌절감 누적, 장기 파밍 보상 예측 불가 |
| 잉여 이노센트 = 레어리티 승급 재료 | PoE 커런시 모델. 별도 자원 없이 이노센트가 강화 소재를 겸함. 잉여 이노센트의 가치 보장으로 수집 동기 유지 | 별도 Memory Fragment 자원 — 자원 종류 증가, 관리 복잡도 상승 |
| 슬롯 제약 (Normal 2 ~ Ancient 8) | 제한된 슬롯이 "어떤 이노센트를 선택할 것인가"라는 전략적 판단을 유발. 장비의 정체성 형성 | 슬롯 무제한 — 모든 보너스를 스태킹하는 단일 최적해 수렴, 선택 의미 소실 |
| 자연 시너지 (명시적 보너스 없음) | 무기 특성과 이노센트의 논리적 궁합을 플레이어가 발견하는 재미 유지. 지식이 보상이 되는 구조 | 명시적 시너지 보너스 — 계산 복잡화, "최적 조합 검색" 강제 유발 |

### §1.3. 3대 기둥 정렬 (Pillar Alignment)

| 기둥 | 이노센트 시스템에서의 구현 |
| :--- | :--- |
| 메트로베니아 탐험 | Gladiator/Tutor/Dietician 합산으로 ATK/INT/HP 스탯 게이트 해금 → 새 층위 탐험. 이노센트 없이는 게이트를 넘지 못한다. |
| 아이템계 야리코미 | Wild 이노센트 격파 → Tamed 2배 보상 → 합성으로 레벨 누적 → 다음 게이트 해금 → 더 깊은 아이템계 진입. 끝없는 성장 루프. |
| 온라인 멀티플레이 | 깊은 지층의 고레벨 이노센트는 파티 협력으로 획득. 이노센트 완성도가 팀 전투력을 좌우하는 사회적 동기. |

### §1.4. 저주받은 문제 검증 (Cursed Problem Check)

| 긴장 | 위험 A | 위험 B | 설계의 선택 |
| :--- | :--- | :--- | :--- |
| 복종 강제 vs 자발적 야리코미 | 게이트 때문에 억지로 이노센트 파밍 → 강요감 | 이노센트 없어도 게이트 통과 가능 → 야리코미 진입 동기 소실 | 게이트 수치를 이노센트+장비 합산으로 유연하게 충족 가능하게 설계. 강제가 아닌 "가장 효율적인 경로"로 포지셔닝 |
| 합성 인플레 vs 성장 천장 | 무한 합성으로 스탯 폭발 → 게이트 의미 소실 | 소프트 캡 너무 낮음 → 야리코미 이탈 | 소프트 캡 설정. 캡 초과 합성 시 체감 효율 감소. Phase 2에서 경제 설계 확정 |
| 행동형 이노센트 발견 vs 정보 접근성 | 시너지를 모르는 신규 플레이어 → 진입 장벽 | 모든 시너지 UI 명시 → 발견의 재미 소실 | 기본형은 역할 명시(ATK/INT/HP). 행동형은 효과만 표시, 조합 효과는 플레이어 발견에 맡김 |
| Wild 절반 효과 vs 초보자 편의 | 초보는 아이템계 없이 Wild 이노센트로 플레이 → 스탯 부족 | Wild 효과를 높이면 복종 동기 약화 | Wild 이노센트는 "예고편". 스탯 게이트 해금을 위해 복종이 사실상 필요하게 설계 |

### §1.5. 위험과 보상 (Risk & Reward)

| 행동 | 리스크 | 리턴 |
| :--- | :--- | :--- |
| 아이템계 진입 (이노센트 목적) | 지층 탈출 실패 시 진행 손실 | Wild 이노센트 발견, 격파 시 Tamed + 레벨 2배 즉각 부여 |
| Wild 이노센트 격파 | 보스급 전투 난이도 | 실효 4배 스탯 보상, 이식/합성 해금 |
| 잉여 이노센트 분해 | 이노센트 영구 소모 | 레어리티 승급 재료 획득. 활용 불가한 잉여를 유의미한 자원으로 전환 |
| 슬롯에 기본형 vs 행동형 선택 | 선택 기회 비용 | 게이트 해금 경로 vs 빌드 정체성 — 장기 전략적 판단 |
| 합성 (두 이노센트 소모) | 합성 소재 이노센트 소멸 | 레벨 합산 단일 이노센트. 예측 가능한 성장 |

---

## §2. 메커닉 규칙 (Mechanics & Rules)

### §2.1. 기본형 이노센트의 게이트 문지기 역할

기본형 이노센트 3종(Gladiator/Tutor/Dietician)은 스탯 게이트 해금의 1차 수단이다. 장비 기본 스탯과 이노센트 스탯 보너스를 합산하여 게이트 요구치를 충족한다.

```
스탯 게이트 판정 공식:
  총_ATK = 장비_기본_ATK + Σ(장착_Gladiator_이노센트_효과)
  총_INT = 장비_기본_INT + Σ(장착_Tutor_이노센트_효과)
  총_HP  = 장비_기본_HP  + Σ(장착_Dietician_이노센트_효과)

  게이트 해금 조건:
    ATK 게이트_N ← 총_ATK ≥ GATE_ATK_N
    INT 게이트_N ← 총_INT ≥ GATE_INT_N
    HP  게이트_N ← 총_HP  ≥ GATE_HP_N
```

플레이어는 장비 레어리티 업그레이드와 이노센트 합성 레벨 향상을 조합하여 게이트를 충족한다. 어느 한 쪽만으로도 충족 가능하지만, 두 가지를 병행하는 것이 가장 빠른 경로다.

예시: "ATK 게이트 50 해금 필요 → Rare 검 기본 ATK 30 + Gladiator Lv.40 (Tamed, 효과 40) → 총 ATK 70 → 게이트 해금"

행동형 이노센트는 게이트와 무관하다. 게이트를 넘은 플레이어가 빌드 차별화를 위해 선택하는 상위 레이어다.

### §2.2. Wild vs Tamed 상태

#### Wild 상태 (야생)

- 장비 획득 시 모든 이노센트는 Wild 상태로 등록
- 효과 배율: `WILD_EFFECT_RATIO` (기본값 0.5 — 절반 효과)
- 이식 불가: 다른 아이템으로 옮길 수 없음
- 합성 불가: 동종 이노센트와 합산 불가
- 아이템계 역할: 해당 이노센트는 아이템계 내 적 NPC로 등장하여 플레이어를 공격
- UI 표시: 노란 느낌표 (!) 마크

#### Tamed 상태 (복종)

- 획득 조건: 아이템계 내에서 해당 Wild 이노센트 NPC를 격파
- 즉각 효과: 복종 시점에 이노센트 레벨 `TAMED_LEVEL_MULTIPLIER`배 (기본값 2.0배) 적용
- 효과 배율: 100% 전체 효과
- 이식 가능: 다른 아이템으로 이동 가능
- 합성 가능: 동종 Tamed 이노센트끼리 레벨 합산
- UI 표시: 초록 체크마크 (✓)

복종 직후 플레이어가 체감하는 실효 스탯 증가:

```
Wild 실효 효과   = Wild_Lv × WILD_EFFECT_RATIO
Tamed 실효 효과  = (Wild_Lv × TAMED_LEVEL_MULTIPLIER) × 1.0

실효 배율 = (Wild_Lv × 2.0 × 1.0) / (Wild_Lv × 0.5) = 4.0배
```

레벨 10 Wild Gladiator를 복종시키면: ATK +5 → ATK +20으로 순간 4배 점프.

### §2.3. 이노센트 슬롯 시스템

레어리티별 슬롯 수는 `System_Equipment_Rarity.md`가 SSoT다.

| 레어리티 | 이노센트 슬롯 수 | 슬롯 특성 |
| :------- | :---: | :--- |
| Normal   |   2   | 기본형 2개 채우는 것만으로도 게이트 진입 가능 |
| Magic    |   3   | 기본형 2 + 행동형 1로 빌드 첫 분기 발생 |
| Rare     |   4   | 기본형 vs 행동형 선택 압박이 본격 시작 |
| Legendary |  6   | 빌드 정체성이 명확해지는 범위 |
| Ancient  |   8   | 풀 빌드 표현 가능. 야리코미의 목표 장비 |

슬롯 운영 규칙:
- 슬롯 초과: 모든 슬롯이 찬 상태에서 새 이노센트 복종 시 기존 이노센트와 교체 또는 새 이노센트 포기 선택
- 슬롯 비어있음: 이노센트 없는 슬롯은 보너스 없음 — "이 슬롯에 뭘 넣을까"가 장비 설계의 핵심 선택

### §2.4. 야생 이노센트 조우 (아이템계 내)

```
방 입장 → 모든 적 처치
              ↓
    [확률 판정: INNOCENT_SPAWN_RATE]
         ├─ 스폰: Wild 이노센트 NPC 1마리 등장
         │        초기 레벨 = 방 난이도 × [2~5 범위 랜덤]
         └─ 미스폰: 루프 계속
```

조우 규칙:
- 지층 클리어 또는 사망 탈출 시 미복종 Wild 이노센트는 사라짐
- 슬롯이 모두 찬 상태에서 조우 시 복종 후 배치가 불가하므로 조우 전 슬롯 확인 권장 (UI 경고)
- Wild 이노센트는 현재 탐험 중인 아이템에 귀속 — 이식 불가

### §2.5. 복종 전투 규칙

- 대상: 방 클리어 후 스폰된 Wild 이노센트 NPC
- 난이도: 해당 방의 일반 적보다 약간 강함 (계수 `INNOCENT_COMBAT_DIFFICULTY_RATIO`)
- 격파 조건: HP = 0 → Tamed 확정 (실패 없음)
- 복종 처리: 격파 즉시 "이노센트 획득" UI 표시. 레벨 `TAMED_LEVEL_MULTIPLIER`배 적용
- 자동 배치: 장비의 빈 첫 슬롯에 자동 배치. 빈 슬롯 없으면 교체 선택 UI 표시

### §2.6. 합성 (Synthesis)

합성은 세이브 포인트 대장간 NPC를 통해 수행한다.

합성 공식:

```
조건:  같은 타입 + 둘 다 Tamed 상태
결과:  Result.Level = A.Level + B.Level
예시:  Gladiator Lv.15 (Tamed) + Gladiator Lv.25 (Tamed)
       → Gladiator Lv.40 (Tamed)
```

합성 금지 규칙:

| 상황 | 처리 |
| :--- | :--- |
| Wild + Wild | 합성 불가 |
| Wild + Tamed | 합성 불가 |
| 다른 타입 (Gladiator + Tutor) | 합성 불가 |

소프트 캡 이상에서의 합성:
- `INNOCENT_SOFT_CAP` 초과 분량은 실제 스탯 기여 없음
- 소프트 캡까지의 합성은 100% 확정 선형 합산

### §2.7. 잉여 이노센트 분해 → 레어리티 승급 재료

슬롯 구성상 사용하지 않는 잉여 이노센트는 세이브 포인트 대장간 NPC에서 분해하여 레어리티 승급 재료로 전환한다. 이노센트가 Memory Fragments를 겸하는 구조다 (PoE 커런시 모델).

```
분해 공식:
  분해 가능 조건: Tamed 상태 이노센트
  획득 재료: Remnant Fragment (레어리티 승급 재료)
  획득량:    floor(이노센트_레벨 / FRAGMENT_DIVISOR) 개

분해 시 주의:
  - 분해는 되돌릴 수 없음 (UI 경고 + 확인 필요)
  - Wild 이노센트는 분해 불가 (복종 후 분해 가능)
```

Remnant Fragment 활용처는 `System_Equipment_Rarity.md` 승급 규칙 참조.

---

## §3. 콘텐츠 (Content)

### §3.1. 이노센트 타입 전체 목록

#### 기본형 (Basic) — 3종

기본형은 ATK/INT/HP 스탯을 직접 상승시킨다. 이노센트 레벨에 비례하여 선형으로 효과가 증가한다. 스탯 게이트 해금의 핵심 수단이다.

```yaml
# 기본형 이노센트 공식 (Tamed 기준)
# Wild 효과 = Tamed 효과 × WILD_EFFECT_RATIO (0.5)

Gladiator:
  effect_per_level: ATK + (Lv × GLADIATOR_ATK_PER_LV)
  role: ATK 게이트 해금 문지기
  build_note: 물리 빌드 기반, 검/대검/단검 모든 무기 범용

Tutor:
  effect_per_level: INT + (Lv × TUTOR_INT_PER_LV)
  role: INT 게이트 해금 문지기
  build_note: 원소 빌드 기반, 지팡이 특화. 에코 인챈트 데미지와 직결

Dietician:
  effect_per_level: MaxHP + (Lv × DIETICIAN_HP_PER_LV)
  role: HP 게이트 해금 문지기
  build_note: 생존력 기반. 보스 지구전, VIT 게이트 연관 스탯
```

#### 행동형 (Behavioral) — 6종

행동형은 스탯 수치가 아닌 플레이 방식을 변화시킨다. 같은 무기라도 어떤 행동형 이노센트를 장착하느냐에 따라 전혀 다른 전투 경험이 된다. 이노센트 레벨에 비례하여 효과 크기가 증가한다.

```yaml
# 행동형 이노센트 공식 (Tamed 기준)
# Wild 효과 = Tamed 효과 × WILD_EFFECT_RATIO (0.5)

Berserker:
  effect: 공격 속도 + (Lv × BERSERKER_ATK_SPD_PER_LV) %
  play_change: 빠른 콤보, 높은 DPS. 레벨이 오를수록 타격 연속성 체감 증가

Vampire:
  effect: 적 처치 시 MaxHP × VAMPIRE_LEECH_RATIO % 회복
  play_change: 공격적 플레이 = 생존. 피가 부족할수록 더 공격적으로 플레이해야 회복

Ironclad:
  effect: 넉백 거리 × (1 - IRONCLAD_RESIST_PER_LV × Lv)
  play_change: 보스전 안정, 진지 사수. 넉백 저항이 올라갈수록 타격교환 유리

Ghost:
  effect: 대시 i-frame + (Lv × GHOST_IFRAME_PER_LV) ms
           대시 거리   + (Lv × GHOST_DASH_RANGE_PER_LV) %
  play_change: 회피 특화. 레벨이 높을수록 "들어가서 치고 빠지기" 간격 여유 증가

Sprinter:
  effect: 이동 속도 + (Lv × SPRINTER_SPEED_PER_LV) %
  play_change: 탐험/스피드런. 월드 이동 및 아이템계 방 이동 모두 적용

Leech:
  effect: 공격 적중 시 HP + LEECH_HP_PER_HIT 회복 (쿨다운 LEECH_COOLDOWN_SEC 초)
  play_change: 보스 지구전. Vampire가 처치 기반이라면 Leech는 적중 기반 — 처치 어려운 탱커형 보스에 유리
```

#### 원소형 (Elemental) — 3종

원소형 이노센트는 에코 인챈트의 효과를 강화한다. 인챈트 자체는 이노센트 없이도 사용 가능하며, 원소형은 이미 해금된 인챈트를 더 강하게 만드는 부스터다.

에코 인챈트 해금 구조 (이노센트와 독립):
- 화(Fire) 인챈트: 게임 시작부터 에코 기본 탑재
- 빙(Ice) 인챈트: 지하 수로 보스 처치 시 흡수
- 뇌(Thunder) 인챈트: 마법 연구소 보스 처치 시 흡수

원소형 이노센트는 아이템계 랜덤 드랍 전용이다.

```yaml
# 원소형 이노센트 공식 (Tamed 기준)
# Wild 효과 = Tamed 효과 × WILD_EFFECT_RATIO (0.5)

Burner:
  element: Fire
  effect_damage:  해당 인챈트 적용 중 원소 데미지 + (Lv × BURNER_DMG_PER_LV) %
  effect_ailment: 화상 지속시간 + (Lv × BURNER_DOT_DUR_PER_LV) %
  activation: Fire 인챈트 활성 중에만 효과 발동

Freezer:
  element: Ice
  effect_damage:  해당 인챈트 적용 중 원소 데미지 + (Lv × FREEZER_DMG_PER_LV) %
  effect_ailment: 빙결 지속시간 + (Lv × FREEZER_DOT_DUR_PER_LV) %
  activation: Ice 인챈트 활성 중에만 효과 발동

Shocker:
  element: Thunder
  effect_damage:  해당 인챈트 적용 중 원소 데미지 + (Lv × SHOCKER_DMG_PER_LV) %
  effect_ailment: 감전 지속시간 + (Lv × SHOCKER_DOT_DUR_PER_LV) %
  activation: Thunder 인챈트 활성 중에만 효과 발동
```

복수 원소형 이노센트 장착 시: 현재 활성 인챈트 원소와 일치하는 이노센트만 효과 발동. 다른 원소 이노센트는 인챈트 전환 전까지 대기.

#### 서사형 (Narrative) — 1종 (No.1)

No.1은 에르다의 에코(Echo)에 부착된 발광 구체다. 분리 불가. 슬롯을 차지하지 않는다.

| 항목 | 내용 |
| :--- | :--- |
| 분류 | 서사 이노센트 (Story Innocent) |
| 슬롯 비용 | 없음 (에코 전용 부착, 장비 슬롯 외) |
| P1 스탯 효과 | 없음 (비주얼 전용 단계) |
| P1 행동 패턴 | 전투 위기 시 에코 뒤로 위치 이동. 복종 성공 시 빠르게 진동 및 발광 |
| P2 역할 | 서사 진행 이벤트와 연결된 반응 추가 예정 |
| 진실의 정체 | 에르다의 스승 마르타가 남긴 이노센트. 에르다가 처음 아이템계에 진입한 순간, 마르타의 금속 조각 안에 있던 이노센트가 에코로 이주했다. 마르타와 에르다를 10년간 이어준 보이지 않는 끈이 이노센트의 형태로 현현한 것이다. |
| 3막 공개 | 마르타의 실루엣이 기억의 방랑자로 등장하는 순간, No.1이 격렬하게 반응한다. |

### §3.2. 무기별 자연 시너지 가이드

명시적인 보너스 수치는 없다. 무기 특성과 이노센트 효과의 논리적 궁합을 제시하여, 플레이어가 스스로 발견하도록 안내하는 가이드다.

| 무기 | 특성 | 자연 시너지 이노센트 | 조합 논리 |
| :--- | :--- | :--- | :--- |
| 검 (Sword) | 속도와 ATK 균형. Auto Combo 3타 안정 | Berserker, Vampire | 빠른 콤보가 Berserker 공속과 시너지. 3타 연속이 Vampire 처치 회복 빈도 높임 |
| 대검 (Greatsword) | 느리지만 강타. 넉백 유발 | Ironclad, Leech | 피격교환 시 Ironclad로 넉백 상쇄. 강타 1회당 Leech 회복이 상대적으로 고효율 |
| 단검 (Dagger) | 매우 빠른 공격. 낮은 단타 데미지 | Berserker, Leech | 공속×Berserker로 DPS 극대화. 타격수가 많아 Leech 쿨다운 갱신 빈도 높음 |
| 활 (Bow) | 원거리. 이동 중 공격 가능 | Sprinter, Ghost | 이동 중 공격 특성과 Sprinter 이동속도 시너지. Ghost로 후퇴 대시 효율 향상 |
| 지팡이 (Staff) | 낮은 물리 데미지. 인챈트 강화 특화 | Tutor, Burner/Freezer/Shocker | INT로 인챈트 데미지 기반 강화. 원소 이노센트로 인챈트 특화 극대화 |

---

## §4. 연동 (Integration)

### §4.1. 아이템계 연동

이노센트는 아이템계에서 발생하고 아이템계에서 성장한다.

| 연동 지점 | 방향 | 세부 규칙 |
| :--- | :--- | :--- |
| Wild 이노센트 스폰 | IW → INC | 방 클리어 후 `INNOCENT_SPAWN_RATE` 확률로 Wild 이노센트 NPC 등장 |
| 보스 처치 보상 | IW → INC | 아이템 장군/왕/신/대신 처치 시 고레벨 이노센트 보장 드랍 (`§5.2` 드랍률 테이블 참조) |
| 복종 즉시 효과 | INC → IW | Tamed 처리 후 해당 지층 진행 중 즉각 스탯 반영 |
| 기억의 방랑자 | IW → INC | 방랑자 접촉 시 임시 제단에서 보상 강화 이노센트 획득 기회 부여 |

### §4.2. 장비 연동

이노센트 스탯 보너스는 장비에 귀속된다. 장비를 교체하면 해당 장비의 이노센트도 함께 이동한다 (장비와 이노센트는 한 단위).

- 이식: Tamed 이노센트만 다른 장비 슬롯으로 이동 가능 (대장간 NPC 경유)
- 판매 전 제거: 장비 판매 시 Tamed 이노센트 유무 확인 UI 경고. 제거 후 판매 또는 이노센트 포기 선택
- 레어리티 승급: 장비 레어리티 승급 시 이노센트 슬롯이 증가하며, 기존 이노센트는 보존

### §4.3. 스탯 게이트 연동

이노센트 스탯 보너스는 월드의 스탯 게이트 판정에 포함된다. 구체적 게이트 수치 및 해금 콘텐츠는 `System_World_StatGating.md` 참조.

```
게이트 판정 흐름:
  에르다가 게이트 오브젝트에 접촉
    ↓
  게이트 타입 (ATK / INT / HP) 확인
    ↓
  장착 장비 전체의 총_스탯 계산
  (= 장비_기본_스탯 + Σ 장착_이노센트_효과)
    ↓
  총_스탯 ≥ GATE_THRESHOLD → 해금
  총_스탯 <  GATE_THRESHOLD → 차단 (게이트 요구치 UI 표시)
```

### §4.4. 경제 연동

이노센트 시스템은 별도의 전용 자원 없이 운영된다.

| 행위 | 소비 | 획득 |
| :--- | :--- | :--- |
| 합성 | Tamed 이노센트 2개 소모 | Tamed 이노센트 1개 (레벨 합산) |
| 분해 | Tamed 이노센트 1개 소모 | Remnant Fragment (레어리티 승급 재료) |
| 레어리티 승급 | Remnant Fragment N개 소모 | 장비 레어리티 +1 등급, 이노센트 슬롯 +증가분 |

Remnant Fragment 소모량 기준은 `System_Equipment_Rarity.md` 승급 규칙 참조.

---

## §5. 밸런스 (Balance)

### §5.1. 이노센트 레벨 효과 테이블

기본형 3종의 레벨별 효과 예시 (파라미터 기본값 기준, 조정 가능):

```yaml
# 파라미터 기본값
GLADIATOR_ATK_PER_LV: 1      # ATK +1/레벨
TUTOR_INT_PER_LV:     1      # INT +1/레벨
DIETICIAN_HP_PER_LV:  1      # MaxHP +1/레벨
WILD_EFFECT_RATIO:    0.5    # Wild = 50%
TAMED_LEVEL_MULTIPLIER: 2.0  # Tamed 시 레벨 2배
INNOCENT_SOFT_CAP:    300    # 소프트 캡 (Phase 2 조정)
```

| 이노센트 | Wild Lv | Wild 효과 | Tamed Lv (×2) | Tamed 효과 | 실효 배율 |
| :------- | :-----: | :------- | :------------: | :--------- | :---: |
| Gladiator |  10    | ATK +5   |      20        | ATK +20   | 4.0×  |
| Gladiator |  25    | ATK +12  |      50        | ATK +50   | 4.0×  |
| Gladiator |  50    | ATK +25  |     100        | ATK +100  | 4.0×  |
| Tutor     |  10    | INT +5   |      20        | INT +20   | 4.0×  |
| Dietician |  10    | HP +5    |      20        | HP +20    | 4.0×  |

행동형 레벨별 효과 예시 (파라미터 기본값 기준):

```yaml
BERSERKER_ATK_SPD_PER_LV: 0.1    # 공격 속도 +0.1%/레벨
GHOST_IFRAME_PER_LV:       0.5   # i-frame +0.5ms/레벨
GHOST_DASH_RANGE_PER_LV:   0.1   # 대시 거리 +0.1%/레벨
SPRINTER_SPEED_PER_LV:     0.1   # 이동 속도 +0.1%/레벨
```

| 이노센트  | Lv 20 효과              | Lv 50 효과              | Lv 100 효과             |
| :------- | :---------------------- | :---------------------- | :---------------------- |
| Berserker | 공격 속도 +2%           | 공격 속도 +5%           | 공격 속도 +10%          |
| Ghost    | i-frame +10ms, 거리+2%  | i-frame +25ms, 거리+5%  | i-frame +50ms, 거리+10% |
| Sprinter | 이동 속도 +2%           | 이동 속도 +5%           | 이동 속도 +10%          |

### §5.2. 드랍률 및 조우 확률 테이블

```yaml
# 이노센트 조우 파라미터
INNOCENT_SPAWN_RATE:            0.15   # 방 클리어당 Wild 이노센트 스폰 확률 (15%)
INNOCENT_COMBAT_DIFFICULTY_RATIO: 1.2 # 이노센트 전투 난이도 (방 일반 적의 1.2배)

# 이노센트 초기 레벨 범위 (방 난이도 × 계수)
INNOCENT_LEVEL_RANGE_MIN: 2
INNOCENT_LEVEL_RANGE_MAX: 5

# 보스별 이노센트 보장 드랍
Item_General_innocent_lv_range: [10, 20]   # 아이템 장군
Item_King_innocent_lv_range:    [20, 40]   # 아이템 왕
Item_God_innocent_lv_range:     [40, 80]   # 아이템 신
Item_Overlord_innocent_lv_range: [80, 150] # 아이템 대신

# 분해 재료 획득
FRAGMENT_DIVISOR: 10  # floor(이노센트_레벨 / 10) 개의 Remnant Fragment
```

### §5.3. 튜닝 파라미터 요약

| 파라미터명 | 기본값 | 조정 범위 | 설계 의도 |
| :--- | :---: | :--- | :--- |
| `WILD_EFFECT_RATIO` | 0.5 | 0.3~0.7 | 복종 보상의 명시성 — 낮을수록 복종 필요성 강화 |
| `TAMED_LEVEL_MULTIPLIER` | 2.0 | 1.5~2.5 | 격파 즉각 보상감 — 높을수록 체감 강화 크지만 인플레 위험 |
| `INNOCENT_SPAWN_RATE` | 0.15 | 0.05~0.25 | 방 클리어당 조우 긴장감 — 높을수록 아이템계가 이노센트 사냥터로 느껴짐 |
| `INNOCENT_SOFT_CAP` | 300 | 100~500 | 야리코미 장기 목표 거리 — 높을수록 파밍 기간 연장 |
| `FRAGMENT_DIVISOR` | 10 | 5~20 | 분해 경제 밀도 — 낮을수록 잉여 이노센트가 더 많은 재료로 전환 |
| `INNOCENT_COMBAT_DIFFICULTY_RATIO` | 1.2 | 1.0~1.5 | 복종 전투 긴장감 — 보스급보다 낮되 일반 적보다 강한 범위 유지 |

---

## §5.4. 엣지 케이스 (Edge Cases)

| 상황 | 처리 규칙 |
| :--- | :--- |
| 아이템 판매 시 Tamed 이노센트 손실 위험 | 판매 전 "이 아이템에 Tamed 이노센트 N개 있음" 경고 UI. 제거 또는 포기 선택 필요 |
| 슬롯 전부 찬 상태에서 Wild 이노센트 스폰 | 복종 후 교체 선택 UI 또는 복종 포기. 포기 시 스폰 이노센트 소멸 |
| 같은 아이템에 동종 이노센트 중복 배치 | 허용. 스태킹 효과는 선형 합산 (동종 4개 이상은 §5.5 스태킹 규칙 적용) |
| 복종 후 아이템 미장착 상태 | 이노센트 보존. 아이템 다시 장착 시 이노센트 효과 재반영 |
| 파티 멀티에서 파티원 탈출 | 탈출 플레이어의 이노센트는 개인 귀속. 파티원 탈출과 무관하게 보존 |
| 분해 되돌리기 | 불가. 분해 확인 UI에서 최종 확인 필수 |
| Wild 이노센트 분해 시도 | 불가. Wild 상태에서는 합성·분해·이식 모두 차단 |

### §5.5. 동종 이노센트 스태킹 규칙

| 동종 이노센트 수 | 스태킹 효과 |
| :---: | :--- |
| 1~3개 | 선형 스태킹 (효과 × 개수) |
| 4개 이상 | 4번째부터 효율 `STACK_DIMINISH_4TH` (기본 0.7), 5번째부터 `STACK_DIMINISH_5TH` (기본 0.5) |

단일 이노센트를 고레벨로 합성하는 것이 동종 다수 장착보다 슬롯 효율이 높도록 유도하는 설계다.

---

## §5.6. 수용 기준 (Acceptance Criteria)

#### 기능 기준 (Functional)

- [ ] Wild 이노센트는 `WILD_EFFECT_RATIO` (0.5) 적용, UI에 노란 느낌표 표시
- [ ] Tamed 이노센트는 100% 효과 적용, 복종 즉시 레벨 `TAMED_LEVEL_MULTIPLIER`배
- [ ] Tamed 이노센트만 이식 가능 (Wild 이식 시도 시 UI 차단)
- [ ] 합성 UI: 같은 타입 + Tamed 상태 이노센트 선택 → 레벨 합산 결과 미리보기 → 확정
- [ ] 레어리티별 슬롯 수 반영 (`System_Equipment_Rarity.md` 기준)
- [ ] 방 클리어당 `INNOCENT_SPAWN_RATE` 확률로 Wild 이노센트 스폰
- [ ] 복종 격파 시 빈 슬롯 자동 배치, 슬롯 가득 찬 경우 교체 선택 UI
- [ ] 잉여 이노센트 분해 → `floor(Lv / FRAGMENT_DIVISOR)` 개의 Remnant Fragment 획득
- [ ] 스탯 게이트 판정 시 이노센트 효과 합산 반영

#### 체험 기준 (Experiential)

- [ ] Wild → Tamed 느낌: 격파 직후 수치 점프(4배 실효)가 "이제 이 장비가 강해졌다"는 해방감으로 느껴지는가?
- [ ] 게이트 문지기 느낌: "ATK 게이트에 막혔다 → Gladiator 합성으로 해금했다"는 인과가 명확하게 느껴지는가?
- [ ] 슬롯 선택 압박: "이 슬롯에 Gladiator를 더 넣을까, Berserker를 넣을까"라는 선택이 의미 있게 느껴지는가?
- [ ] 합성 보상: 저레벨 이노센트 여러 개를 모아 고레벨 하나로 합성한 순간 쾌감이 있는가?
- [ ] 분해 납득감: 잉여 이노센트를 분해하여 레어리티 승급에 투자하는 행위가 자연스럽게 느껴지는가?

---

**작성자:** Systems Designer
**최종 업데이트:** 2026-04-05
**다음 단계:** Phase 2 — 소프트 캡 이후 경제 밸런스 설계, 보스별 이노센트 드랍 테이블 확정
