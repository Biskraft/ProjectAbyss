# 밸런스 수식 레퍼런스 (Balance Formulas Reference)

이 문서는 게임의 핵심 수식과 밸런스 기준값을 정리합니다. 모든 수치는 `게임 기획 개요.md`의 설계를 기반으로 합니다.

---

## 1. 데미지 공식 (Damage Formula)

### 기본 데미지 계산

```
Final_Damage = (ATK * Weapon_Multiplier - DEF * Defense_Ratio) * Element_Modifier * Crit_Modifier * Random_Variance
```

| 변수 | 설명 | 기본값 | 단위 |
| :--- | :--- | :--- | :--- |
| ATK | 캐릭터 공격력 (Base + Equipment + Innocent) | - | _dmg |
| Weapon_Multiplier | 무기 종류별 배율 | 1.0 | _x |
| DEF | 대상 방어력 | - | _def |
| Defense_Ratio | 방어력 감쇠 비율 | 0.5 | _x |
| Element_Modifier | 원소 상성 배율 | 1.0 | _x |
| Crit_Modifier | 크리티컬 배율 (Is_Crit ? Crit_Damage : 1.0) | 1.0/1.5 | _x |
| Random_Variance | 데미지 편차 | 0.95~1.05 | _x |

### 최소 데미지 보장

```
if Final_Damage < 1 then Final_Damage = 1
```

---

## 2. 스탯 공식 (Stat Formulas)

### 6대 기본 스탯

| 스탯 | 약칭 | 영향 | 게이트 용도 |
| :--- | :--- | :--- | :--- |
| Strength | STR | 물리 공격력, 무거운 물체 이동 | 힘 게이트 (바위, 문) |
| Intelligence | INT | 마법 공격력, 마나 풀 | 마법 게이트 (봉인) |
| Dexterity | DEX | 명중률, 크리티컬, 공격 속도 | 민첩 게이트 (좁은 통로) |
| Vitality | VIT | HP, 방어력, 상태이상 저항 | 체력 게이트 (독 지대) |
| Speed | SPD | 이동 속도, 회피율, 행동 순서 | 속도 게이트 (시한부 구역) |
| Luck | LCK | 아이템 드롭률, 크리티컬 확률, Innocent 출현 | 행운 게이트 (숨겨진 방) |

### 레벨업 스탯 증가

```
Stat_At_Level = Base_Stat + (Growth_Per_Level * (Level - 1))
```

---

## 3. 성장 곡선 (Growth Curves)

### EXP 요구량

```
EXP_Required(Lv) = Base_EXP * (EXP_Growth_Rate ^ (Lv - 1))
```

```yaml
Base_EXP: 100               # _exp (Lv 1→2 필요량)
EXP_Growth_Rate: 1.15        # _x (레벨당 15% 증가)
EXP_Soft_Cap: 50             # _lv (성장률 감소 시작)
EXP_Hard_Cap: 100            # _lv (최대 레벨)
EXP_Diminish_Factor: 0.5     # Soft Cap 이후 성장률 50% 감소
```

### 장비 스탯 스케일링

```
Equipment_Stat = Base_Stat * Rarity_Multiplier * (1 + Enhancement_Level * Enhancement_Rate)
```

| 희귀도 | Rarity_Multiplier | Innocent_Slots |
| :--- | :--- | :--- |
| Common | 1.0 | 1 |
| Uncommon | 1.3 | 2 |
| Rare | 1.7 | 3 |
| Legendary | 2.2 | 4 |
| Mythic | 3.0 | 5 |

---

## 4. Item World 수식 (Item World Formulas)

### 층별 난이도 스케일링

```
Floor_Difficulty = Base_Difficulty * (1 + Floor_Scaling_Rate * Floor_Number) * Recursive_Depth_Multiplier
```

```yaml
Base_Difficulty: 1.0          # 1층 기준
Floor_Scaling_Rate: 0.05      # _x (층당 5% 증가)
Recursive_Depth_Multiplier_D1: 1.0   # 깊이 1
Recursive_Depth_Multiplier_D2: 1.5   # 깊이 2
Recursive_Depth_Multiplier_D3: 2.5   # 깊이 3
```

### 보상 스케일링

```
Floor_Reward = Base_Reward * (1 + Reward_Scaling * Floor_Number) * Depth_Bonus
```

### 시드 생성

```
Seed = hash(Item_ID + Item_Level + Floor_Number)
Room_Count = Seed % (Max_Rooms - Min_Rooms + 1) + Min_Rooms
Template_Index = Seed % Template_Pool_Size
```

---

## 5. Innocent 수식 (Innocent Formulas)

### Innocent 효과 계산

```
Innocent_Effect = Base_Effect * Innocent_Level * Tamed_Bonus
```

| 상태 | Tamed_Bonus |
| :--- | :--- |
| Wild (빨간색) | 0.5 |
| Tamed (파란색) | 1.0 |

### Innocent 합성

```
Synthesized_Level = Innocent_A_Level + Innocent_B_Level * Synthesis_Efficiency
Synthesis_Efficiency: 0.8     # 80% 효율
```

---

## 6. 멀티플레이 스케일링 (Multiplayer Scaling)

### 파티 난이도 조정

```
Scaled_HP = Base_HP * (1 + Party_HP_Bonus * (Party_Size - 1))
Scaled_ATK = Base_ATK * (1 + Party_ATK_Bonus * (Party_Size - 1))
```

```yaml
Party_HP_Bonus: 0.4           # _x (인원당 40% HP 증가)
Party_ATK_Bonus: 0.15         # _x (인원당 15% ATK 증가)
Party_Reward_Bonus: 0.1       # _x (인원당 10% 보상 증가)
```

---

## 7. 자동사냥 효율 (Auto-Hunt Efficiency)

```yaml
# 자동사냥 효율 상한
Hunting_Ground_Efficiency: 0.7     # 직접 플레이 대비 70%
ItemWorld_Auto_Efficiency: 0.6     # 직접 플레이 대비 60%
Offline_Expedition_Efficiency: 0.4 # 직접 플레이 대비 40%

# 자동사냥 불가 영역
Auto_Disabled_Zones: ["보스층", "이벤트층", "숨겨진 방", "PvP 구역"]
```

---

## 8. 밸런스 기준값 (Balance Benchmarks)

### TTK (Time to Kill)

| 상황 | 목표 | 허용 범위 |
| :--- | :--- | :--- |
| 일반 몬스터 (동일 레벨, 솔로) | 3초 | 2~5초 |
| 엘리트 몬스터 (동일 레벨, 솔로) | 15초 | 10~25초 |
| 보스 (솔로) | 3분 | 2~5분 |
| 보스 (4인 파티) | 2분 | 1~3분 |
| Item World 10층 보스 (솔로) | 2분 | 1~4분 |
| Item World 100층 최종 보스 (솔로) | 10분 | 7~15분 |

### TTD (Time to Die)

| 상황 | 목표 |
| :--- | :--- |
| 일반 몬스터에게 (동일 레벨) | 15초 이상 생존 |
| 보스에게 (집중 공격 시) | 8초 이상 생존 |

### 경제 지표

```yaml
Gold_Faucet_Rate: 0          # _gold/min (분당 골드 획득, 직접 플레이)
Gold_Sink_Rate: 0             # _gold/min (분당 골드 소비, 강화/구매)
Inflation_Target: 0.0         # _% (월간 인플레이션 목표)
```
