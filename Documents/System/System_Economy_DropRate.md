# System: Economy & Drop Rate

## 구현 현황 (Implementation Status)

> 최근 업데이트: 2026-04-15
> 문서 상태: `작성 중 (Draft)`
> 2-Space: 전체 (World + Item World)
> 기둥: 야리코미 / 멀티플레이

| 기능 ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 비고 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| ECO-01-1 | 드롭 | 레어리티별 가중치 드롭 테이블 | P0 | 대기 | 2단계 분리 롤 방식 |
| ECO-01-2 | 드롭 | 드롭 풀 분리 (장비/이노센트/Gold) | P0 | 대기 | 독립 롤 방식 |
| ECO-02-1 | 드롭 | 아이템계 깊이별 드롭 보정 | P1 | 대기 | 지층 번호 기반 |
| ECO-02-2 | 드롭 | 보스 드롭 테이블 (보장 + 확률) | P1 | 대기 | Dedicated Drop 포함 |
| ECO-03-1 | 피티 | Legendary 피티 카운터 | P1 | 대기 | 소프트+하드 피티 |
| ECO-03-2 | 피티 | Ancient 피티 카운터 | P1 | 대기 | 서버 영구 저장 |
| ECO-03-3 | 피티 | 이노센트 피티 카운터 | P1 | 대기 | 40회 하드 피티 |
| ECO-03-4 | 피티 | LCK 스탯 드롭률 보정 | P2 | 대기 | 최대 2배 상한 |
| ECO-04-1 | Gold | Gold Faucet (월드/아이템계) | P0 | 대기 | HL 명칭 사용 |
| ECO-04-2 | Gold | Gold Sink (대장간/상점) | P0 | 대기 | 이노센트 복종 비용 포함 |
| ECO-05-1 | 이노센트 | 이노센트 드롭 규칙 | P1 | 대기 | 야생 상태로만 드롭 |
| ECO-05-2 | 이노센트 | 이노센트 합성 비용 | P1 | 대기 | 동종: 무료 |
| ECO-06-1 | 멀티 | 파티 드롭 보너스 | P2 | 대기 | 개인 인스턴스 방식 |
| ECO-06-2 | 멀티 | 파티 Gold 보너스 | P2 | 대기 | 인원 비례 |
| ECO-07-1 | 분해 | 아이템 분해 → 재료 변환 | P1 | 대기 | 기억의 파편 Sink |
| ECO-07-2 | 분해 | 레어리티 승급 비용 | P2 | 대기 | 기억의 파편 소비 |

---

## 1. 개요 (Concept)

### 1.1 설계 의도

ECHORIS의 이코노미는 다음 한 가지 문제를 해결하기 위해 존재한다.

> "플레이어가 아이템계에 계속 들어가야 할 이유는 무엇인가?"

드롭률과 Gold 흐름은 이 스파이크를 강화하는 수단이다. 순환 구조:

```
월드 탐험 → 장비 드롭 (HL + 아이템)
           ↓
     아이템계 진입 (HL 소비)
           ↓
  이노센트 드롭 + 보스 보상
           ↓
대장간 복귀 → 합성/강화 (HL 소비)
           ↓
 스탯 게이트 해금 → 새 월드 구역
```

### 1.2 3대 기둥 정렬

| 기둥 | 기여 방식 |
| :--- | :--- |
| 탐험 | 구역별 특화 드롭 풀 → "어디서 어떤 장비가 나오는지"를 아는 것이 탐험의 보상 |
| 야리코미 | 아이템계 깊이별 드롭 보정 + 갓 롤 확률 → 무한 반복의 동기 |
| 멀티플레이 | 파티 드롭/Gold 보너스 → 함께할 이유 |

### 1.3 저주받은 문제 검증

| 문제 | 선택한 방향 |
| :--- | :--- |
| 파밍 무한성 vs 인플레이션 방지 | 아이템계 내 HL Sink(이노센트 복종 비용) + 기억의 파편 소비로 흡수 |
| 희귀 드롭의 희귀성 vs 플레이어 좌절 방지 | 피티 카운터(소프트+하드) + LCK 스탯 보정 레이어 |
| 파티 보상 공유 vs 파밍 개인 동기 | 개인 인스턴스 드롭 (분배 아님, 인원당 독립 롤) |

### 1.4 리스크와 보상

| 행동 | 리스크 | 보상 |
| :--- | :--- | :--- |
| 월드 일반 구역 탐험 | 세이브 포인트 복귀 비용 (시간) | Normal~Rare 장비, HL |
| 아이템계 깊은 지층 도전 | 사망 시 런 내 이노센트 손실 | 고레어리티 장비, 희귀 이노센트 |
| 보스 전투 | 고난이도 전투 | 보장 Rare 이상 + Dedicated Drop |
| 심연(Ancient 전용) 진입 | 최고 난이도 + 탈출 제단 스폰 감소 | Ancient 20%, 심연 보스 전용 아이템 |

---

## 2. 레어리티별 드롭 확률 테이블

### 2.1 드롭 이벤트 발생률

적 1마리 처치 시 아이템이 드롭될 확률이다. 레어리티 분포와는 별개의 독립 롤이다.

```yaml
drop_event_rate:
  normal_enemy:    0.35   # 35%
  elite_enemy:     0.70   # 70%
  mini_boss:       1.00   # 100%, 아이템 1개 확정
  zone_boss:       1.00   # 100%, 아이템 3개 확정
  item_world_enemy: 0.45  # 아이템계 일반 적 (월드 대비 보정)
```

### 2.2 레어리티 분포 (가중치 기반)

드롭 이벤트 발생 후 레어리티를 결정하는 2단계 분리 롤 중 Step 1이다. 아래는 월드 기준값(`Base_Rarity_Weight`)이다.

```yaml
base_rarity_weight:
  # 월드 일반 적 기준. 총 가중치 1000
  Normal:    600   # 60.0%
  Magic:     250   # 25.0%
  Rare:      100   # 10.0%
  Legendary:  40   # 4.0%
  Ancient:    10   # 1.0%
```

구체 수치는 `Sheets/Content_Stats_Economy_DropRate.csv` 참조.

Step 2: 레어리티 결정 후 해당 레어리티 내 서브 풀(아이템 종류)을 별도 롤로 결정한다. 이를 통해 레어리티 분포와 아이템 종류 분포를 독립적으로 조정할 수 있다.

### 2.3 드롭 풀 분리 (독립 롤)

하나의 드롭 이벤트에서 풀별로 독립적으로 롤이 발생한다. 각 풀의 합이 100%를 초과하는 것은 복수 드롭이 허용되기 때문이다.

```yaml
drop_pool_activation:
  # 각 풀은 독립 롤. 동시에 여러 풀에서 드롭 가능
  #                 일반 적  엘리트  보스
  equipment_pool:   [ 0.30,  0.50, 0.70 ]
  consumable_pool:  [ 0.25,  0.20, 0.10 ]
  material_pool:    [ 0.30,  0.20, 0.15 ]
  innocent_pool:    [ 0.05,  0.08, 0.20 ]
  gold_pool:        [ 0.10,  0.02, 0.05 ]
```

구체 수치는 `Sheets/Content_Stats_Economy_DropRate.csv` 참조.

### 2.4 목표 획득 시간 기준값 (EV/h)

시간당 기대 획득량(`EV_per_hour`) 설계 기준. 구역 파밍, 시간당 적 처치 수 `Encounter_per_hour`는 구역별 별도 파라미터.

| 등급 | 초반 (Phase 1) | 중반 | 후반 | 엔드게임 |
| :--- | :--- | :--- | :--- | :--- |
| Normal | 5~10개/h | 10~20개/h | 20~40개/h | 60+개/h |
| Magic | 2~4개/h | 5~10개/h | 8~15개/h | 20~30개/h |
| Rare | 0.5~1개/h | 1~3개/h | 3~6개/h | 8~15개/h |
| Legendary | 0.1~0.3개/h | 0.3~0.8개/h | 0.5~1.5개/h | 2~5개/h |
| Ancient | 세션당 0~1개 | 세션당 0~1개 | 시간당 0.1~0.3개 | 시간당 0.5~1개 |

---

## 3. 아이템계 깊이별 드롭 보정

### 3.1 지층별 레어리티 분포 보정

아이템계에 진입하면 지층 번호에 따라 레어리티 분포가 상위 등급으로 이동한다. 월드 기준값 대비 가중치가 재배분된다.

```yaml
item_world_rarity_distribution:
  # 각 열은 해당 지층에서의 레어리티 비중 (%)
  #             월드   지층1  지층2~3  지층4   심연
  Normal:      [ 60,   50,    30,      15,      5  ]
  Magic:       [ 25,   30,    35,      25,     15  ]
  Rare:        [ 10,   15,    25,      35,     30  ]
  Legendary:   [  4,    4,     8,      20,     30  ]
  Ancient:     [  1,    1,     2,       5,     20  ]
```

구체 수치는 `Sheets/Content_Stats_Economy_DropRate.csv` 참조.

설계 근거:
- 지층이 깊을수록 고레어리티 비중이 집중 → "더 깊이 들어갈 이유" 형성
- 심연(Ancient 이상 아이템 전용)에서 Ancient 20% → 최종 콘텐츠 보상 집중
- 지층 1은 월드와 유사하게 유지 → 신규 아이템 진입 장벽 낮춤

### 3.2 지층별 이노센트 드롭률

이노센트는 장비 풀과 별개의 독립 풀에서 드롭된다(`ECO-01-2` 참조). 지층이 깊을수록 드롭률과 이노센트 수치 범위가 증가한다.

```yaml
innocent_drop_by_strata:
  # 방 1개 통과당 이노센트 드롭 발동 확률
  strata_1: 0.05   # 5%
  strata_2: 0.08   # 8%
  strata_3: 0.12   # 12%
  strata_4: 0.18   # 18%
  abyss:    0.25   # 25%

innocent_level_range_by_strata:
  strata_1: [  1,  10 ]
  strata_2: [  5,  20 ]
  strata_3: [ 10,  35 ]
  strata_4: [ 20,  50 ]
  abyss:    [ 30,  80 ]
```

구체 수치는 `Sheets/Content_Stats_Economy_DropRate.csv` 참조.

### 3.3 난이도와 보상의 비대칭 설계

깊은 지층일수록 난이도가 보상 증가율보다 빠르게 오른다. 이는 최고 난이도가 "효율"이 아닌 "도전"을 위한 영역임을 명확히 하기 위함이다.

```yaml
difficulty_scaling_per_strata:
  monster_hp_multiplier:  1.8   # 지층당 80% 증가 (지수)
  monster_dmg_multiplier: 1.4   # 지층당 40% 증가 (완화, 즉사 방지)

rarity_base_power:
  # 아이템 레어리티가 높을수록 아이템계 기본 적 파워 증가
  Normal:    1.0
  Magic:     1.3
  Rare:      1.7
  Legendary: 2.2
  Ancient:   3.0
```

구체 수치는 `Sheets/Content_Stats_Economy_DropRate.csv` 참조.

---

## 4. Gold (HL) 획득·소비 설계

### 4.1 Gold Faucet (유입 경로)

Gold의 공식 명칭은 HL이다. 모든 유입 경로는 수동 플레이 전제이며, 월드가 주된 Faucet이다.

```yaml
gold_faucet:
  world:
    enemy_drop:     "처치당 HL_Enemy_Base (레어리티 보정 ×1.0~2.5)"
    boss_reward:    "보스 처치 시 HL_Boss_Reward (구역 보스 별도 테이블)"
    item_sell:      "상점 매각: 장비 레어리티 × HL_Sell_Rate"

  item_world:
    enemy_drop:     "처치당 HL_IW_Enemy_Base (월드 대비 ×0.7)"
    # 아이템계는 이노센트/장비가 주 보상. HL은 보조
    boss_reward:    "지층 보스 처치 시 HL_IW_Boss_Reward"
```

구체 수치는 `Sheets/Content_Stats_Economy_DropRate.csv` 참조.

### 4.2 Gold Sink (소멸 경로)

Sink는 HL 공급을 흡수하여 인플레이션을 억제한다. 가장 규모가 큰 Sink는 이노센트 복종 비용이다.

```yaml
gold_sink:
  blacksmith_shop:          # 월드 세이브 포인트(대장간/상점)
    consumable_purchase:    "탈출 아이템, 회복 아이템 구매"
    innocent_subdue_cost:   "이노센트 복종 시 HL 소모 (HL_Subdue_Base × 이노센트 레벨)"
    rarity_upgrade_fee:     "레어리티 승급 수수료 (기억의 파편 + HL)"
    item_disassemble_mat:   "분해 재료 정제 비용 (Phase 2)"

  item_world:
    # 아이템계 내 상점 방(존재 시): 탈출 아이템 구매
    shop_room_purchase:     "탈출 아이템 HL_IW_Shop_Price"
```

구체 수치는 `Sheets/Content_Stats_Economy_DropRate.csv` 참조.

### 4.3 Faucet / Sink 균형 흐름도

```
[HL Faucet]                      [HL Sink]
월드 적 처치     ───────┐         ┌──── 이노센트 복종 비용 (주 Sink)
월드 보스 처치   ───────┤         ├──── 상점 소모품 구매
아이템계 적 처치 ───────┼────▶────┤──── 레어리티 승급 수수료
아이템계 보스    ───────┤         ├──── 아이템계 내 상점 방 구매
아이템 매각      ───────┘         └──── 기억의 파편 정제 비용 (Phase 2)
```

### 4.4 인플레이션 경고 지표

아래 수치를 초과하면 Sink 조정을 검토한다. 구체 임계값은 `analytics-engineer`와 협의하여 갱신한다.

| 지표 | 경고 임계값 | 대응 |
| :--- | :--- | :--- |
| 활성 HL 총량 | 설계 기준의 200% 초과 | 이노센트 복종 비용 상향, 임시 이벤트 Sink 추가 |
| 세션당 평균 HL 순증가 | 목표 대비 150% 초과 | Faucet 조정 또는 신규 Sink 도입 |
| Legendary 장비 매각가 급등 | 30일 평균의 150% 초과 | 드롭률 미세 조정 검토 |

---

## 5. 이노센트 드롭 규칙

### 5.1 드롭 기본 원칙

이노센트는 항상 야생(Unsubdued) 상태로 드롭된다. 복종(Subdued) 상태 이노센트의 직접 드롭은 없다.

```yaml
innocent_drop_rules:
  drop_state:       "Unsubdued (야생) 고정"
  drop_source:
    - "아이템계 적 처치 (독립 풀 ECO-01-2)"
    - "아이템계 보스 처치 (보장 드롭 포함)"
    - "미스터리 룸 (특수 보상)"
  world_drop:       false   # 월드에서는 이노센트 드롭 없음
  recursive_drop:   false   # 아이템계 내 중첩 진입 불가 (폐기된 기능)
```

이노센트 레어리티 분포:

```yaml
innocent_rarity_weight:
  # 이노센트 드롭 발동 시 종류 결정 롤
  Common_Innocent:   700   # 70% (스탯형 일반)
  Rare_Innocent:     250   # 25% (파밍형, 상태이상형)
  Legendary_Innocent: 45  # 4.5% (유니크 효과형)
  Ancient_Innocent:    5  # 0.5% (복합 유니크형, 심연 이상에서만 출현)
```

구체 수치는 `Sheets/Content_Stats_Economy_DropRate.csv` 참조.

### 5.2 이노센트 드롭 피티

연속 40회 처치 동안 이노센트가 드롭되지 않으면 다음 처치 시 1개 확정 드롭.

```yaml
innocent_pity:
  hard_pity_count:  40    # 40회 연속 비드롭 시 확정
  counter_scope:    "아이템계 런 내 독립 (런 종료 시 리셋)"
  # 서버 저장 불필요 (런 내 휘발성 카운터)
```

Legendary 이노센트 피티:

```yaml
legendary_innocent_pity:
  base_rate:         0.045   # 4.5%
  soft_pity_start:   30      # 30회 이노센트 드롭 누적 후
  guarantee_count:   30      # 이노센트 드롭 30회 중 Legendary 1개 보장
```

### 5.3 이노센트 합성 비용

동종(Type 동일) 합성은 무료다. 이종 합성(Phase 2)에는 대장간 전용 재화 비용이 부과된다.

```yaml
innocent_synthesis:
  same_type_cost:    0     # 무료
  cross_type_cost:   "HL_CrossSynth_Base (Phase 2 도입 시 결정)"
  result_formula:    "Result.Level = A.Level + B.Level"
  soft_cap:
    stat_type:       1000   # 스탯형 이노센트 소프트 캡
    farming_type:    500    # 파밍형 (EXP/Gold 보너스) 소프트 캡
    status_type:     100    # 상태이상형 하드 캡
    resistance_type: 100    # 속성 내성형 하드 캡
```

---

## 6. 보스 드롭 테이블

### 6.1 보스 종류별 드롭 구조

각 보스는 (a) 레어리티 분포 배율, (b) 최소 보장 드롭, (c) Dedicated Drop 확률을 가진다.

```yaml
boss_drop_table:
  mini_boss:
    rarity_multiplier:  1.5
    guaranteed:
      - "Rare 1개"
    dedicated_drop:     false

  zone_boss:
    rarity_multiplier:  2.0
    guaranteed:
      - "Rare 2개"
      - "Legendary 1개 (30% 확률)"
    dedicated_drop:
      count:    "1~2종"
      rate:     0.15   # 15~25%
      # 해당 보스에서만 드롭되는 Legendary 전용 아이템

  item_world_general:    # 아이템 장군 (지층 1 보스, 10/20/40/50층)
    rarity_multiplier:  2.0
    guaranteed:
      - "Rare 1개"
      - "Legendary 1개 (20% 확률)"
    stat_bonus:         "+3% 주 스탯 (영구, 해당 아이템에 적용)"

  item_world_king:       # 아이템 왕 (30/60/90층)
    rarity_multiplier:  3.0
    guaranteed:
      - "Legendary 1개"
    stat_bonus:         "+7% 주 스탯 (영구)"

  item_world_god:        # 아이템 신 (100층)
    rarity_multiplier:  4.0
    guaranteed:
      - "Legendary 1개"
      - "Ancient 1개 (15% 확률)"
    stat_bonus:         "+15% 주 스탯 (영구)"

  item_world_god_king:   # 아이템 대신 (심연 최종 보스)
    rarity_multiplier:  5.0
    guaranteed:
      - "Legendary 2개"
      - "Ancient 1개 (40% 확률)"
    stat_bonus:         "+25% 주 스탯 (영구)"
    dedicated_drop:
      count:    "1종 (심연 전용)"
      rate:     1.00   # 100% 보장 (단, 심연 전용 아이템 풀)

  world_boss_multiplayer:    # 월드 보스 (파티 협동 전용)
    rarity_multiplier:  3.0
    guaranteed:
      - "Legendary 2개"
      - "전용 아이템 1개 (해당 보스 Dedicated Drop)"
```

구체 수치는 `Sheets/Content_Stats_Economy_DropRate.csv` 참조.

### 6.2 보스 스탯 보너스 계단식 구조

아이템계 보스를 처치하면 해당 아이템의 주 스탯에 영구 보너스가 부여된다. 이 보너스는 이노센트 복종과 별개로 누적된다.

```yaml
boss_stat_bonus_cumulative:
  # 보스 처치 시 아이템 주 스탯 영구 %보너스 (해당 아이템에만 적용)
  item_world_general:   "+3%"
  item_world_king:      "+7%"
  item_world_god:       "+15%"
  item_world_god_king:  "+25%"
  abyss_remnant:        "+40%"   # 심연 보스 (Ancient 전용)
```

---

## 7. 파밍 루프 경제 순환 (인플레이션 방지)

### 7.1 파밍 루프 핵심 순환

```
[월드 탐험]
  ↓ HL + 장비 드롭
[대장간/상점]
  ↓ HL 소비 → 소모품 구매
[아이템계 진입]
  ↓ 이노센트 드롭, HL 소비 (복종 비용)
  ↓ 보스 처치 → 장비 드롭 + 스탯 보너스
[대장간 귀환]
  ↓ 이노센트 합성/복종 → HL 소비
[스탯 게이트 해금]
  ↓ 새 월드 구역 → 새 장비 풀 접근
[루프 재시작]
```

이 순환에서 HL은 월드에서 생성되고 이노센트 복종·합성 비용으로 소멸한다. 강한 장비를 만들수록 더 깊은 아이템계에 진입하고, 더 많은 HL이 소비된다(소비 확장형 Sink).

### 7.2 아이템 분해 싱크

잉여 장비는 분해하여 강화 재료로 변환한다. 기억의 파편(`Memory_Shard`)은 레어리티 승급의 핵심 재료로, 강한 Sink 역할을 한다.

```yaml
item_disassembly:
  Normal:    { base_material: [1, 2],  memory_shard: 0 }
  Magic:     { base_material: [1, 3],  memory_shard: 0 }
  Rare:      { base_material: [2, 4],  memory_shard: 0 }
  Legendary: { base_material: [3, 5],  memory_shard: [1, 2] }
  Ancient:   { base_material: [5, 7],  memory_shard: [3, 5] }
```

레어리티 승급 비용 (`Memory_Shard` 소비량):

```yaml
rarity_upgrade_cost:
  Normal_to_Magic:       5    # 기억의 파편 5개 + 대상 아이템계 지층 1 클리어
  Magic_to_Rare:        15    # 기억의 파편 15개 + 지층 2 클리어
  Rare_to_Legendary:    50    # 기억의 파편 50개 + 지층 3 클리어
  Legendary_to_Ancient: 200   # 기억의 파편 200개 + 지층 4 + 심연 클리어
```

구체 수치는 `Sheets/Content_Stats_Economy_DropRate.csv` 참조.

### 7.3 타겟 파밍 vs 랜덤 파밍 균형

ECHORIS는 두 파밍 경로를 병존시킨다.

| 경로 | 비중 | 적용 범위 |
| :--- | :--- | :--- |
| 타겟 파밍 가능 | 30~40% | 보스 Dedicated Drop, 구역별 특화 풀 |
| 순수 랜덤 (Chase Item) | 60~70% | 갓 롤 이노센트, Ancient 등급 |

구역별 특화 드롭 풀 (설계 방향):

```yaml
zone_specialized_pool:
  # 해당 구역에서 특화 스탯 고정 옵션 Legendary 드롭 가능
  underground_waterway:  "DEX 특화"
  frozen_cave:           "VIT 특화"
  catacomb:              "LCK 특화"
  sky_tower:             "SPD 특화"
  # 구체 구역명은 월드 설계 문서에 종속
```

### 7.4 갓 롤(God Roll) 확률과 야리코미 동기

갓 롤은 단순 Legendary 드롭이 아닌 원하는 이노센트 조합까지 완성된 상태를 말한다. 이것이 야리코미의 궁극 목표다.

```
[갓 롤 확률 모델 — Ancient 검 기준]
Ancient 드롭 확률: 1%
원하는 아이템 타입(검): 1/총 아이템 종류
원하는 이노센트 슬롯 8개 완성 확률: 수천~수만 분의 1

→ 순수 드롭 갓 롤: 극히 낮은 확률 (운의 영역, 강렬한 감정 반응)
→ 이노센트 파밍 갓 롤: 노력으로 달성 가능 (성취감, 지속 참여 동기)
→ 두 경로의 병존이 야리코미의 핵심
```

---

## 8. 배드 럭 보정 (Bad Luck Protection)

### 8.1 피티 카운터 구조

피티 카운터는 서버에 영구 저장된다. 월드 피티와 아이템계 피티는 독립 카운터다.

```yaml
pity_counter:
  Legendary:
    soft_pity_start:    30    # 30회 비드롭부터 확률 상승 시작
    hard_pity:          60    # 60회 비드롭 시 100% 보장
    soft_pity_formula:  "P(n) = 0.04 + floor((n-30)/5) × 0.01"
    # 30회: 5%, 35회: 6%, 40회: 7%, 45회: 8%, 50회: 9%, 55회: 10%, 59회: 11%

  Ancient:
    soft_pity_start:    50    # 50회 비드롭부터 확률 상승 시작
    hard_pity:          150   # 150회 비드롭 시 100% 보장
    soft_pity_formula:  "P(n) = 0.01 + floor((n-50)/10) × 0.005"
    # 50회: 1.5%, 60회: 2%, 70회: 2.5%, ..., 149회: 5.5%

  Innocent:
    hard_pity:          40    # 40회 처치 동안 미드롭 시 확정 1개
    counter_scope:      "런 내 휘발 (세션 종료 시 리셋)"

pity_counter_persistence:
  world_counter:        "서버 영구 저장, 사망/세션 종료 유지"
  item_world_counter:   "서버 영구 저장, 아이템계 피티는 런 종료 후에도 유지"
  season_reset:         "Phase 4 시즌 도입 시 결정 (현재: 이월 유지 권장)"
```

### 8.2 LCK 스탯 드롭률 보정

LCK 스탯은 장비 이노센트(Lucky 타입)로 획득하며 드롭률에 곱셈 보정을 적용한다.

```yaml
lck_drop_bonus:
  formula: "P_actual(rarity) = P_base(rarity) × (1 + LCK × 0.001)"
  cap:     2.0   # 최대 2배 상한 (LCK 1000 초과분 무효)
  examples:
    LCK_0:   "Ancient 1.0% (기준)"
    LCK_100: "Ancient 1.1% (+10%)"
    LCK_500: "Ancient 1.5% (+50%)"
    LCK_999: "Ancient ~2.0% (상한)"

innocent_lck_bonus:
  base_rate: 0.05   # 이노센트 기본 드롭 5%
  LCK_500:   0.075  # 7.5%
  LCK_999:   0.10   # 10% (상한)
```

---

## 9. 멀티플레이 시 루트 분배

### 9.1 개인 인스턴스 드롭 원칙

파티 플레이 시 드롭된 아이템은 분배하지 않는다. 각 파티원은 독립적인 드롭 롤을 가진다. 이는 "함께하면 더 많이 얻는다"는 구조로, 파티 가입이 개인 파밍을 방해하지 않도록 한다.

```yaml
multiplayer_loot:
  distribution:     "Individual Instance"
  # 각 파티원에게 독립 드롭 롤 적용. 아이템은 각자 드롭
  temporary_bind:   30    # 드롭 후 30초간 드롭자에게 귀속 (이후 파티원 공개)
```

### 9.2 파티 드롭 보너스

인원이 늘수록 드롭 보너스가 증가한다. 보너스는 레어리티 가중치에 곱셈으로 적용된다.

```yaml
party_drop_bonus:
  # 드롭률/Gold/이노센트 보너스 배율
  #               1인    2인    3인    4인
  drop_rate:    [ 1.00, 1.15,  1.25,  1.35 ]
  gold_rate:    [ 1.00, 1.10,  1.15,  1.20 ]
  innocent_rate:[ 1.00, 1.20,  1.35,  1.50 ]
```

구체 수치는 `Sheets/Content_Stats_Economy_DropRate.csv` 참조.

### 9.3 예외 처리 (멀티플레이)

| 상황 | 처리 방침 |
| :--- | :--- |
| 파티원 접속 끊김 중 드롭 | 드롭 보너스는 남은 파티원 기준으로 즉시 재계산 |
| 파티원 사망 후 루트 획득 | 사망한 파티원도 귀환 전까지 드롭 롤 유지 (런 지속 중) |
| 파티 리더 아이템계 탈출 | 남은 파티원의 드롭 보너스 단계 하향 |

---

## 10. 예외 처리 (Edge Cases)

| 상황 | 처리 방침 |
| :--- | :--- |
| 아이템계 전멸 시 | 해당 런에서 획득한 이노센트 손실. 아이템 레벨/스탯 보너스는 보존. 월드 귀환. |
| 아이템계 중 접속 끊김 | 현재 지층 진행 상태 서버 유지. 재접속 시 해당 런 지층 시작점에서 재개. |
| 피티 카운터 동기화 실패 | 마지막 확인된 카운터 값 사용. 과소 보정 방향으로 안전 처리. |
| 보스 드롭 미생성 버그 | 보장 드롭 미발생 시 다음 보스 처치에 누적 적용 (피티와 별개). |
| LCK가 캡(999)을 초과하는 이노센트 조합 | 캡 초과분 무효. 실효 LCK는 999로 고정. |
| Ancient 귀속 아이템 분해 시 | 분해 불가 (UI에서 비활성화). 단, 플레이어 명시 확인 후에만 허용 가능 (Phase 2 결정). |

---

## 11. 참조 문서

| 문서 | 경로 | 참조 이유 |
| :--- | :--- | :--- |
| 장비 드롭률 리서치 | `Documents/Research/Equipment_DropRate_Economy_Research.md` | 드롭 테이블 설계 벤치마크 |
| 엔드게임 루프 리서치 | `Documents/Research/EndgameLoop_Economy_Research.md` | Faucet/Sink 균형, 인플레이션 사례 |
| 이노센트 성장 리서치 | `Documents/Research/Innocent_Growth_Economy_Research.md` | 이노센트 합성/캡 설계 |
| 아이템계 깊이-보상 리서치 | `Documents/Research/ItemWorld_DepthReward_RiskBalance_Research.md` | 깊이별 보상 스케일링, 리스크 설계 |
| 장비 레어리티 시스템 | `Documents/System/System_Equipment_Rarity.md` | 레어리티 체계 SSoT |
| 이코노미 수치 데이터 | `Sheets/Content_Stats_Economy_DropRate.csv` | 파라미터 SSoT |
