# 몬스터 아키타입 시스템 (Monster Archetype System)

> **문서 ID:** SYS-ENM-ARC
> **작성일:** 2026-04-19
> **문서 상태:** Draft
> **2-Space:** World + Item World
> **설계 의도:** 7카테고리 무기 x 7축 패시브 프레임워크(300무기)에 대응하는 몬스터 아키타입 시스템. 6개 BASE 아키타입이 Tier 업그레이드로 스케일링하며, 아키타입 조합이 특정 무기 패시브 축(A-G)을 검증하는 전술 상황을 생성한다.

---

## 0. 필수 참고 자료 (Mandatory References)

| 문서 | 경로 |
| :--- | :--- |
| 무기 시스템 (7카테고리) | `Documents/System/System_Combat_Weapons.md` |
| 무기 다양성 리서치 (7축 패시브) | `Documents/Research/WeaponDiversity_300Weapons_Research.md` |
| 적 아키타입 리서치 | `Documents/Research/EnemyDesign_MobArchetype_Research.md` |
| 몬스터 도감 | `Documents/Content/Content_Monster_Bestiary.md` |
| 서사 몬스터 풀 | `Documents/System/System_ItemNarrative_MonsterPool.md` |
| 적 스폰 시스템 | `Documents/System/System_Enemy_Spawning.md` |
| 아이템계 코어 | `Documents/System/System_ItemWorld_Core.md` |
| 아이템계 지층 생성 | `Documents/System/System_ItemWorld_FloorGen.md` |
| 전투 철학 | `Documents/Design/Design_Combat_Philosophy.md` |
| 보스 설계 | `Documents/System/System_ItemWorld_Boss.md` |

---

## 1. 설계 원칙

### 1.1. 핵심 명제

> **"몬스터는 무기 패시브의 검증 장치다."**

300개 무기가 7축(A-G) 패시브로 차별화되어 있으므로, 몬스터 시스템의 핵심 목적은 **특정 패시브 축이 빛나는 전술 상황을 반복적으로 생성하는 것**이다. 아키타입이 달라지면 유효한 패시브 축이 달라지고, 아키타입 조합이 바뀌면 최적 무기 선택이 바뀐다.

### 1.2. 7축 패시브 Quick Reference

| 축 | 명칭 | 핵심 키워드 |
|:---|:---|:---|
| A | Critical Condition | 특정 상황 보너스 (배후, 공중, 저HP 적, 첫타 등) |
| B | On-Hit Effect | 적중마다 발동 (원소 부여, HP 회복, 연쇄, 반사) |
| C | State-Change | 자신의 상태 기반 (저HP 강화, 풀HP 방어, 전투 시간 등) |
| D | Kill Bonus | 처치 시 발동 (ATK 스택, HP 회복, 이속 증가, 무적) |
| E | Combo Variation | 콤보 구조 변경 (추가타, 캔슬, 히트박스 변형, 딜레이 보상) |
| F | Movement | 이동/대시 연동 (대시 후 보너스, 정지 보너스, 체공 보상) |
| G | Environment/Team | 아이템계 환경, 코옵, 기억 단편 연동 |

### 1.3. 설계 제약

1. **BASE 아키타입은 6종만.** 추가 금지. 아키타입 조합이 다양성을 만든다.
2. **Tier 업그레이드는 새 행동을 추가하지 않는다.** 기존 행동의 강도/빈도/윈도우를 조정한다.
3. **아트 자산 = 기본 실루엣 6종 + Tier별 팔레트 스왑/사이즈 변형.** 신규 스프라이트 최소화.
4. **4x4 Room Grid 기준 설계.** 방당 최대 적 수 6, 최대 아키타입 조합 3.

---

## 2. 몬스터 아키타입 시스템 (Section 1)

### 6 BASE 아키타입

---

#### ARC-01: Stalker (추적자)

**컨셉:** 플레이어를 직선으로 쫓아와 근접 타격을 가하는 기본 위협 단위.
**실루엣:** 갑옷 파편으로 구성된 인간형. 한 손에 부서진 무기. 16x24px 기본 캔버스.

**핵심 행동:**
- 감지 범위 내 플레이어를 향해 직선 추적
- 추적 도달 시 전방 근접 1타 (Tell: 무기 뒤로 당기기 3f)
- Attack Cooldown 후 재추적
- 지상 이동만. 점프는 1-2타일 단차에서만 사용

**패시브 축 검증:**

| 축 | 왜 유효한가 | 구체적 예시 |
|:---|:---|:---|
| A (Critical Condition) | 직선 접근으로 배후 노출이 잦다 | Shiv 배후 강타(x3.0), Blade Critical Eye(x3.0) |
| E (Combo Variation) | 정지 후 공격하므로 콤보 윈도우가 예측 가능 | Blade Finisher's Edge(3타 x1.8), Combo Breaker(대시 캔슬) |
| F (Movement) | 추적-멈춤 패턴이 대시 후 공격을 보상 | Momentum Blade(이동 후 x1.5), Blink Cut(대시 무적) |

**Tier 진화:**

| Tier | 명칭 | 스탯 배율 | 행동 변화 |
|:-----|:-----|:--------:|:---------|
| T1 | Stalker | x1.0 | 기본. 느린 추적, 긴 Tell |
| T2 | Stalker Veteran | x1.8 | 추적 속도 +30%. 공격 후 1회 후퇴 스텝 추가 |
| T3 | Stalker Elite | x3.0 | 공격 쿨다운 -40%. 2-콤보(1타 수평 + 2타 찌르기) |
| T4 | Stalker Primus | x5.0 | HP 50% 이하에서 Enrage(속도 +50%, 붉은 팔레트). 3-콤보 |

**비주얼 차별화:**
- T1: 회색 갑옷 파편
- T2: 청동 팔레트 + 사이즈 1.1배
- T3: 강철 팔레트 + 사이즈 1.2배 + 어깨 파티클
- T4: 붉은 강철 + 사이즈 1.3배 + 눈에서 빛 이펙트

---

#### ARC-02: Swarm (군집체)

**컨셉:** 단독으로는 약하지만 3-5체가 동시에 출현하여 공간을 점령하는 군집 위협.
**실루엣:** 작은 구체 또는 곤충형. 8x8px 기본 캔버스. 무리 단위로 인식.

**핵심 행동:**
- 3-5체가 무리(Flock) 단위로 이동. Boid 알고리즘 기반 군집 행동
- 개별 공격력 극히 낮음. 수량으로 위협
- 처치 시 다른 개체가 일시적으로 흩어짐(scatter)
- 일부 개체 처치 후 잔여 개체가 재집결하여 지속 압박

**패시브 축 검증:**

| 축 | 왜 유효한가 | 구체적 예시 |
|:---|:---|:---|
| B (On-Hit) | 다수 타격 기회로 On-Hit 발동 빈도 극대화 | Vampire Edge(적중 HP 1.5%), Thunder Chain(연쇄 번개 15%) |
| D (Kill Bonus) | 연속 처치가 쉬워 Kill Bonus 스택 빠르게 누적 | Kill Streak(처치당 ATK +8%, 최대 5스택), Soul Edge(처치 무적) |
| E (Combo Variation) | 밀집 상태에서 콤보 히트 수가 폭발적으로 증가 | Lucky Seven(7타 누적 시 무적+회복), Wide Arc(히트박스 +30%) |

**Tier 진화:**

| Tier | 명칭 | 스탯 배율 | 행동 변화 |
|:-----|:-----|:--------:|:---------|
| T1 | Swarm | x1.0 | 3체 출현. 느린 군집 이동 |
| T2 | Swarm Pack | x1.5 | 4체 출현. 이동 속도 +20%. 처치 시 scatter 시간 단축 |
| T3 | Swarm Hive | x2.5 | 5체 출현. 일부 개체가 자폭 돌진 (접촉 시 소형 AoE) |
| T4 | Swarm Legion | x4.0 | 5체 + 처치 후 2초 뒤 1체 재생성(최대 2회). 자폭 빈도 증가 |

**비주얼 차별화:**
- T1: 작고 회색. 최소 파티클
- T2: 약간 큰, 파란 팔레트. 이동 궤적에 잔상
- T3: 붉은 핵이 보이는 개체. 자폭 개체는 깜빡임
- T4: 전체 무리에 연결선 이펙트(군집 오라). 사이즈 1.3배

---

#### ARC-03: Sentinel (파수)

**컨셉:** 고정 위치 또는 극히 제한된 구역에서 원거리 투사체로 공간을 지배하는 포대형 위협.
**실루엣:** 구조물에 부착된 포대형. 또는 부유 구체. 16x16px 기본 캔버스.

**핵심 행동:**
- 고정 위치(또는 매우 느린 이동). 이동하지 않거나, 소구역 내에서만 부유
- 일정 주기로 직선 투사체 1발 발사 (Tell: 발광 2f)
- 투사체는 벽에 닿으면 소멸. 플레이어 관통 불가
- 피격 시 넉백 없음 (고정형). 일시적 사격 중단(flinch 0.3s)

**패시브 축 검증:**

| 축 | 왜 유효한가 | 구체적 예시 |
|:---|:---|:---|
| F (Movement) | 투사체 회피를 위해 이동/대시 빈도가 급증 | 대시 직후 공격 보상(Railbow 카이팅 시그니처 x1.2), Light Footing(대시 3회 크리+40%) |
| A (Critical Condition) | 고정 위치이므로 배후 확보가 쉬움 | Piercing Heart(후방 콤보 x2.5), Critical Eye(배후 3타 x3.0) |
| C (State-Change) | 투사체 피격으로 HP 변동이 잦아 상태 기반 패시브 발동 빈도 증가 | Berserker's Fury(저HP 공속+ATK), Guardian's Oath(풀HP DEF+20%) |

**Tier 진화:**

| Tier | 명칭 | 스탯 배율 | 행동 변화 |
|:-----|:-----|:--------:|:---------|
| T1 | Sentinel | x1.0 | 직선 투사체 1발. 2초 주기 |
| T2 | Sentinel Turret | x1.8 | 투사체 2연발. 1.5초 주기 |
| T3 | Sentinel Cannon | x3.0 | 3방향 부채꼴 발사(30도 각도). 1.5초 주기 |
| T4 | Sentinel Nexus | x5.0 | 추적 투사체(느린 유도, 3초 수명). 2연발. 1초 주기 |

**비주얼 차별화:**
- T1: 소형 단안(single eye) 구체. 기본 투사체
- T2: 쌍안(dual eye). 포신 2개 시각화
- T3: 삼안. 사이즈 1.3배. 부유 파티클 추가
- T4: 대형 구체 + 레이저 조준선 이펙트. 사이즈 1.5배

---

#### ARC-04: Aegis (방패)

**컨셉:** 전면에 방어 판정을 가지고 느리게 전진하며, 정면 공격을 무효화하는 장벽형 위협.
**실루엣:** 큰 방패를 든 갑옷형. 또는 전면이 강화된 거대 갑각류. 24x24px 기본 캔버스.

**핵심 행동:**
- 전면 180도 범위 내 피격 시 데미지 80% 감소(T1 기준)
- 느린 전진 + 전면 밀어내기(push) 공격
- 배후(후면 180도)는 방어 없음. 정상 피격
- 공격 시 방패를 들어올려 전면에 히트박스 생성 (Tell: 방패 들어올림 4f)
- Cleaver 충격파, Harpoon 관통 등 특정 무기 시그니처가 정면 방어를 관통/파괴 가능

**패시브 축 검증:**

| 축 | 왜 유효한가 | 구체적 예시 |
|:---|:---|:---|
| A (Critical Condition) | 배후 공격이 필수적이므로 배후 보너스가 극대화 | Shiv 배후 강타(x3.0), Shadow Step(텔레포트 배후 세팅) |
| F (Movement) | 배후 확보를 위해 지속적 기동이 요구됨 | Gale Rhythm(방향 전환 x1.3), Blink Cut(대시 무적) |
| E (Combo Variation) | 정면 무효화로 콤보 방향/구조 선택이 중요해짐 | Combo Breaker(대시 캔슬), Seeking Edge(자동 유도) |

**Tier 진화:**

| Tier | 명칭 | 스탯 배율 | 행동 변화 |
|:-----|:-----|:--------:|:---------|
| T1 | Aegis | x1.0 | 정면 80% 감소. 느린 전진. 밀어내기 1타 |
| T2 | Aegis Guard | x2.0 | 정면 85% 감소. 방패 강타 추가(넉백 강화) |
| T3 | Aegis Knight | x3.5 | 정면 90% 감소. 돌진 + 방패 강타 콤보. 회전 속도 증가 |
| T4 | Aegis Fortress | x6.0 | 정면 95% 감소. 주변 아군에게 DEF 버프(3m 범위). 방패 파괴 후 재생(5초) |

**비주얼 차별화:**
- T1: 나무 방패. 작은 체형
- T2: 철제 방패. 사이즈 1.2배
- T3: 대형 강철 방패 + 전면 장식. 사이즈 1.3배
- T4: 요새형 전신 방패. 사이즈 1.5배. 방어 시 파티클 벽

---

#### ARC-05: Phantom (비행체)

**컨셉:** 지형 제약을 무시하고 공중에서 급강하/선회 공격을 가하는 공중 위협.
**실루엣:** 날개 달린 반투명 형태. 또는 부유하는 파편 집합체. 16x16px 기본 캔버스.

**핵심 행동:**
- 자유 비행. 벽/천장 충돌 없음
- 고공 순찰 -> 급강하 공격(Tell: 날개 접음 2f) -> 재상승
- 급강하 시 수직 히트박스(하방 넓음). 접지 후 짧은 경직
- 지상에서 타격 가능하지만, 체공 중 원거리만 유효한 구간 발생

**패시브 축 검증:**

| 축 | 왜 유효한가 | 구체적 예시 |
|:---|:---|:---|
| A (Critical Condition) | 공중 적 타격 보너스가 직접 적용 | Aerial Reckoning(공중 적 x1.5), First Blood(방 첫타 x2.5) |
| F (Movement) | 수직 추적을 위해 점프/대시 사용 빈도가 극대화 | Low Gravity(공중 이속 x1.3, 낙하 x0.7), Velocity Cut(이속 비례 데미지) |
| B (On-Hit) | 급강하 착지 경직 시 집중 타격 기회 -> On-Hit 연쇄 | Flame Scar(매 3타 화염 폭발), Tidal Blade(5회 적중 파동) |

**Tier 진화:**

| Tier | 명칭 | 스탯 배율 | 행동 변화 |
|:-----|:-----|:--------:|:---------|
| T1 | Phantom | x1.0 | 단일 급강하. 긴 재상승 시간 |
| T2 | Phantom Striker | x1.8 | 급강하 후 수평 돌진 추가(L자 패턴) |
| T3 | Phantom Ace | x3.0 | 급강하 2연속. 재상승 시간 단축. 착지 시 소형 충격파 |
| T4 | Phantom Sovereign | x5.0 | 체공 중 원거리 투사체 발사(하방 3발). 급강하 시 넓은 AoE |

**비주얼 차별화:**
- T1: 작고 반투명한 날개 형태
- T2: 날개 확장 + 청색 잔상
- T3: 사이즈 1.3배 + 하강 시 불꽃 궤적
- T4: 사이즈 1.5배 + 날개에서 지속적 파티클 방출 + 아이 글로우

---

#### ARC-06: Lurker (잠복자)

**컨셉:** 벽/천장/바닥에 은신하다가 플레이어 접근 시 기습 출현하여 강한 1타를 가하는 앰부시형 위협.
**실루엣:** 평상시 환경 타일과 유사한 위장 형태. 출현 시 절지동물형. 16x20px 기본 캔버스.

**핵심 행동:**
- 초기 상태: 환경에 은신(비활성). 시각적으로 미세한 단서만 제공(벽 질감 미세 변화)
- 플레이어가 감지 범위(40px) 내 진입 시 출현 애니메이션(4f) + 강한 1타 공격
- 기습 후 짧은 경직 -> 도주 또는 재은신 시도
- 1회 기습이 핵심 위협. 지속전 능력은 낮음(낮은 HP)

**패시브 축 검증:**

| 축 | 왜 유효한가 | 구체적 예시 |
|:---|:---|:---|
| C (State-Change) | 기습 피격으로 HP가 급락하여 저HP 패시브가 빈번하게 발동 | Berserker's Fury(HP 30% 이하 공속+ATK), Last Stand(HP 20% 이하 x2.0+치사 방지 1회) |
| A (Critical Condition) | 출현 직후 무방비 경직이 존재하여 카운터 공격 보너스 적용 | Counter Rhythm(피격 후 0.3초 내 공격 x2.0), Revenge Strike(피격 후 2초 내 x1.8) |
| D (Kill Bonus) | 낮은 HP로 빠른 처치가 가능하여 Kill Bonus 발동 용이 | No Mercy(처치 후 0.5초 내 크리티컬 확정), Hungry Edge(처치 시 이속+20%) |

**Tier 진화:**

| Tier | 명칭 | 스탯 배율 | 행동 변화 |
|:-----|:-----|:--------:|:---------|
| T1 | Lurker | x1.0 | 단일 기습 1타. 출현 후 도주 |
| T2 | Lurker Ambusher | x1.8 | 기습 2타 연속. 도주 대신 재은신 시도(2초 후) |
| T3 | Lurker Predator | x3.0 | 기습 + 속박(0.5초 이동 불가). 재은신 + 재기습 패턴 |
| T4 | Lurker Nemesis | x5.0 | 기습 + 독 부여(3초 DoT). 2체 동시 출현(좌우 협공). 재은신 1초로 단축 |

**비주얼 차별화:**
- T1: 벽 질감과 유사한 위장. 출현 시 작은 절지형
- T2: 위장에 미세한 눈 깜빡임 추가. 사이즈 1.1배
- T3: 출현 시 보라색 파티클. 독 이펙트 시각화. 사이즈 1.2배
- T4: 출현 시 검은 연기 이펙트 + 쌍체 출현. 사이즈 1.3배

---

### 아키타입 요약표

| ID | 아키타입 | 위협 축 | 핵심 패시브 검증 | 구현된 적 매핑 |
|:---|:---------|:--------|:-----------------|:--------------|
| ARC-01 | Stalker | 거리 압박 | A / E / F | Skeleton |
| ARC-02 | Swarm | 수량 압도 | B / D / E | Slime, Cinder Imp |
| ARC-03 | Sentinel | 공간 지배 | F / A / C | Ghost |
| ARC-04 | Aegis | 정면 무효화 | A / F / E | (신규 필요) |
| ARC-05 | Phantom | 수직 위협 | A / F / B | Spark Bat |
| ARC-06 | Lurker | 기습/서프라이즈 | C / A / D | (신규 필요) |

---

## 3. 아키타입 상호작용 매트릭스 (Section 2)

### 3.1. 아키타입 조합 효과 매트릭스

아키타입 2종 조합이 만드는 전술 상황과, 해당 상황에서 빛나는 무기 카테고리.

| 조합 | 전술 상황 | 플레이어 딜레마 | 최적 무기 | 검증 패시브 축 |
|:-----|:---------|:---------------|:---------|:-------------|
| Stalker + Sentinel | **탱크-포격** : 근접 추적과 원거리 투사체 동시 압박 | Sentinel을 먼저 처리하면 Stalker에 맞고, Stalker를 상대하면 투사체에 노출 | Railbow(원거리로 Sentinel 우선 처리), Shiv(빠른 접근+회피) | A, F |
| Stalker + Aegis | **돌파 장벽** : Aegis가 정면을 막고 Stalker가 측면에서 추적 | 배후 돌아가려면 Stalker 거리 관리 필요 | Harpoon(관통으로 Aegis 뚫기), Chain(가변 리치로 양쪽 대응) | A, E |
| Swarm + Sentinel | **포격 하 군집** : 군집이 이동선을 차단하고 Sentinel이 안전 구역을 제거 | AoE로 Swarm 정리? 이동으로 투사체 회피? 동시 불가 | Cleaver(충격파 AoE), Emitter(원소 광역) | B, D, F |
| Swarm + Phantom | **전방위 압박** : 지상 군집 + 공중 급강하가 수직/수평 동시 위협 | 위를 보면 아래에서 당하고, 아래를 보면 위에서 당함 | Blade(3타 넓은 범위), Chain(가변 리치로 상하 커버) | B, D, F |
| Aegis + Sentinel | **요새** : Aegis가 전면 차단, 뒤에서 Sentinel이 포격 | 정면 돌파 불가. 반드시 측면/상단 우회 필요 | Shiv(Shadow Step 배후), Emitter(투사체로 후방 Sentinel 처리) | A, F, E |
| Phantom + Lurker | **상하 기습** : Phantom이 공중 주의를 끌면 Lurker가 지상 기습 | 공중에 집중하면 Lurker에 당함. 환경 경계가 동시에 필요 | Railbow(공중 Phantom 처리), Blade(빠른 반격) | A, C, F |
| Stalker + Swarm | **추격 군집** : Stalker가 플레이어를 한 방향으로 몰고 Swarm이 포위 | 도주하면 Swarm에 포위. 맞서면 Stalker에 압박 | Cleaver(AoE 정리), Harpoon(관통으로 직선 정리) | D, E, B |
| Aegis + Lurker | **은폐 방벽** : Aegis 뒤에 Lurker가 은신. 배후 돌아가면 Lurker 기습 | 정면 공략도, 배후 공략도 리스크가 있음 | Chain(가변 리치로 Aegis 너머 타격), Shiv(빠른 기동) | A, C, F |

### 3.2. 무기 카테고리 x 아키타입 상성 매트릭스

각 칸은 해당 무기가 해당 아키타입에 대해 갖는 상대적 유불리를 표시한다.

| 무기 \ 아키타입 | Stalker | Swarm | Sentinel | Aegis | Phantom | Lurker |
|:----------------|:-------:|:-----:|:--------:|:-----:|:-------:|:------:|
| **Blade** (3타 콤보) | **강** | 보통 | 약 | 보통 | 보통 | **강** |
| **Cleaver** (2타 충격파) | 보통 | **강** | 약 | **강** | 약 | 보통 |
| **Shiv** (4타 배후) | **강** | 약 | 약 | **강** | 보통 | **강** |
| **Harpoon** (관통) | 보통 | **강** | 보통 | **강** | 약 | 보통 |
| **Chain** (가변 리치) | 보통 | **강** | **강** | 보통 | **강** | 보통 |
| **Railbow** (원거리 물리) | 약 | 보통 | **강** | 약 | **강** | 약 |
| **Emitter** (원거리 INT) | 약 | **강** | **강** | 약 | **강** | 보통 |

**상성 해설:**
- Stalker는 근접 교전이므로 근접 무기(Blade/Shiv)가 유리. 원거리는 사거리 낭비
- Swarm은 군집이므로 AoE(Cleaver 충격파, Emitter 원소, Harpoon 관통, Chain 광역)가 유리
- Sentinel은 고정 위치이므로 원거리(Railbow/Emitter/Chain)가 안전하게 처리 가능
- Aegis는 배후가 핵심이므로 Shiv(배후 강타)/Harpoon(관통)/Cleaver(충격파 방어 관통)가 유리
- Phantom은 공중이므로 리치가 긴 Chain/원거리(Railbow/Emitter)가 유리
- Lurker는 빠른 반격이 핵심이므로 속도가 빠른 Blade/Shiv가 유리

---

## 4. 레벨 디자인 구조 (Section 3) : 4x4 Item World Rooms

### 4.1. Room 구성 템플릿

아이템계의 4x4 그리드(16방) 내 방 타입 분포. 레어리티/지층에 따른 조합.

**기본 구성 비율:**

| 방 타입 | 비율 | 방 수 (16방 기준) | 역할 |
|:--------|:----:|:-----------------:|:-----|
| Combat (전투) | 50% | 8 | 아키타입 조합 전투 |
| Corridor (통로) | 19% | 3 | 이동+경량 적(Swarm/단독 Stalker) |
| Treasure (보물) | 6% | 1 | 엘리트(GoldenMonster) |
| Rest (휴식) | 6% | 1 | 회복. 적 없음 |
| Memory (기억) | 6% | 1 | 서사. 적 없음 |
| Boss (보스) | 6% | 1 | 지층 보스 |
| Puzzle (퍼즐) | 6% | 1 | 환경 퍼즐 |

### 4.2. 전투방 아키타입 구성 규칙

| 지층 | 단독 아키타입 | 2-조합 | 3-조합 | 방당 최대 적 |
|:-----|:----------:|:------:|:------:|:----------:|
| Surface (지층 1) | 60% | 35% | 5% | 4 |
| Mid (지층 2) | 30% | 50% | 20% | 5 |
| Deep (지층 3) | 15% | 45% | 40% | 6 |
| Core/심연 (지층 4) | 5% | 40% | 55% | 6 |

### 4.3. Room 시그니처 (무기 플레이스타일 우대 Room)

각 전투방은 지형 구조에 따라 특정 무기 카테고리가 유리한 "시그니처"를 갖는다.

| Room 시그니처 | 지형 특징 | 유리한 무기 | 불리한 무기 | 아키타입 배치 |
|:-------------|:---------|:-----------|:-----------|:-------------|
| **Flat Arena** | 평평한 넓은 공간. 장애물 없음 | Cleaver, Harpoon | Shiv(엄폐 부재) | Stalker + Swarm |
| **Vertical Shaft** | 높은 천장. 3-4단 플랫폼 | Railbow, Chain, Emitter | Cleaver(상하 이동 느림) | Phantom + Sentinel |
| **Tight Corridor** | 좁고 긴 수평 통로 | Harpoon, Railbow | Cleaver(후딜 위험) | Stalker + Lurker |
| **Pillared Hall** | 기둥/장애물 다수. 시야 차단 | Shiv, Chain | Railbow(시야 방해) | Aegis + Lurker |
| **Elevated Perch** | 높은 위치 + 하단 넓은 공간 | Railbow, Emitter | Blade(리치 부족) | Swarm + Sentinel |
| **Pit Room** | 중앙 함정/구덩이 | Chain, Blade | Harpoon(직선 제한) | Phantom + Swarm |

### 4.4. ASCII Room 레이아웃 예시

#### Flat Arena (평지 전투방)
```
+----------------------------------+
|                                  |
|  ████                    ████    |
|  ████                    ████    |
|                                  |
|          S    S                  |  S = Stalker
|                                  |  w = Swarm
|    w w w                         |
|                                  |
|  ████████████████████████████    |
+----------------------------------+
    넓은 바닥. Cleaver/Harpoon 최적
```

#### Vertical Shaft (수직 구조방)
```
+----------------------------------+
|        P           P             |  P = Phantom
|    ████████                      |  N = Sentinel
|    |      |       N              |
|    |      |                      |
|    ████████████████              |
|              |    |              |
|              |    |              |
|    ████████████████████          |
|    N                             |
|  ████████████████████████████    |
+----------------------------------+
    3단 플랫폼. Chain/Railbow 최적
```

#### Pillared Hall (기둥방)
```
+----------------------------------+
|                                  |
|    ██    ██    ██    ██          |  A = Aegis
|    ██    ██    ██    ██          |  L = Lurker (은신)
|         A                        |
|    ██    ██    ██    ██          |
|    ██  L ██    ██  L ██          |
|                                  |
|    ██    ██    ██    ██          |
|                                  |
|  ████████████████████████████    |
+----------------------------------+
    기둥 사이 시야 차단. Shiv/Chain 최적
```

#### Tight Corridor (좁은 통로방)
```
+----------------------------------+
|  ████████████████████████████    |
|                                  |
|    S         L         S         |  S = Stalker
|                                  |  L = Lurker (은신)
|  ████████████████████████████    |
+----------------------------------+
    좁은 수평 통로. Harpoon/Railbow 최적
```

### 4.5. 조우 밀도 스케일링

| 지층 | 전투방당 최소 적 | 전투방당 최대 적 | 엘리트 출현 비율 | 기억 단편 출현율 |
|:-----|:---------------:|:---------------:|:---------------:|:--------------:|
| Surface | 1 | 4 | 10% | 15% |
| Mid | 2 | 5 | 15% | 15% |
| Deep | 2 | 6 | 20% | 15% |
| Core | 3 | 6 | 25% | 20% |

---

## 5. 전투 조우 패턴 (Section 4)

### 5.1. 12 Named Encounter Patterns

각 패턴은 아키타입 조합 + 지형 구조 + 최적 무기 대응을 정의한다.

---

**ENC-01: The Gauntlet (장갑 돌파)**
- **아키타입:** Stalker x3 (직선 배치)
- **지형:** Tight Corridor
- **상황:** 좁은 통로 양쪽에서 Stalker가 접근. 탈출 불가. 정면 돌파만 가능
- **최적 무기:** Harpoon (관통으로 3체 동시 타격), Blade (3타 피니셔로 순차 처리)
- **검증 패시브 축:** E (콤보 완성 보상), A (첫타 보너스)
- **무기 검증 순간:** Harpoon 3타 관통이 3체를 한 줄로 꿰뚫는 순간 = F축(Piercing) + A축(First Blood) 동시 발동

---

**ENC-02: Chokepoint (협공점)**
- **아키타입:** Aegis x1 (전면) + Sentinel x2 (후방 양측)
- **지형:** Pillared Hall
- **상황:** Aegis가 전면을 막고 Sentinel이 양쪽 기둥 뒤에서 포격
- **최적 무기:** Shiv (Shadow Step으로 Aegis 배후 + 빠른 Sentinel 처리), Chain (기둥 너머 타격)
- **검증 패시브 축:** A (배후 공격), F (대시/텔레포트 이동)
- **무기 검증 순간:** Shadow Step으로 Aegis 뒤로 순간이동 -> 배후 강타 x3.0 발동 = A축 극대화

---

**ENC-03: Swarm Tide (군집 조수)**
- **아키타입:** Swarm x5 (대규모 군집)
- **지형:** Flat Arena
- **상황:** 넓은 공간에 대량 군집이 사방에서 포위 접근
- **최적 무기:** Cleaver (충격파 AoE), Emitter (원소 확산)
- **검증 패시브 축:** B (On-Hit 연쇄), D (Kill Bonus 스택)
- **무기 검증 순간:** Cleaver Overkill 패시브(처치 초과 데미지 50% 전이)로 군집이 연쇄 폭발 = D축 극대화

---

**ENC-04: Aerial Swarm (공중 소탕)**
- **아키타입:** Phantom x2 + Swarm x3
- **지형:** Vertical Shaft
- **상황:** Phantom이 상공에서 급강하하고 Swarm이 플랫폼 위를 채움
- **최적 무기:** Chain (가변 리치로 상하 커버), Railbow (공중 Phantom 저격)
- **검증 패시브 축:** F (이동/체공), A (공중 적 보너스)
- **무기 검증 순간:** Railbow로 급강하 중인 Phantom을 정확히 저격 + Aerial Reckoning(공중 적 x1.5) = A축+F축 동시 발동

---

**ENC-05: Pincer (양면 협공)**
- **아키타입:** Stalker x2 (좌우) + Lurker x1 (중앙 은신)
- **지형:** Flat Arena
- **상황:** 양쪽에서 Stalker가 접근하는 동안 중앙에 Lurker가 은신
- **최적 무기:** Blade (빠른 반격 + 3타 피니셔), Shiv (기동으로 Lurker 회피)
- **검증 패시브 축:** C (피격 후 상태 변화), A (카운터 공격)
- **무기 검증 순간:** Lurker 기습을 맞은 직후 Counter Rhythm(피격 0.3초 내 x2.0) 발동 -> Blade 3타로 Lurker 즉처리 = C축+A축

---

**ENC-06: Fortress (요새)**
- **아키타입:** Aegis x2 (전면 벽) + Sentinel x1 (후방 포격)
- **지형:** Tight Corridor
- **상황:** 좁은 통로에 Aegis 2체가 방벽. 뒤에서 Sentinel 포격. 정면 돌파 불가
- **최적 무기:** Harpoon (관통으로 Aegis 관통 -> Sentinel 타격), Emitter (투사체로 후방 처리)
- **검증 패시브 축:** A (방어형 적 보너스), E (관통 콤보)
- **무기 검증 순간:** Harpoon 3타 대돌진 관통이 Aegis 2체 + Sentinel을 한 줄로 관통 = E축 극대화

---

**ENC-07: Ambush Corridor (기습 회랑)**
- **아키타입:** Lurker x3 (벽/천장/바닥 분산 은신)
- **지형:** Tight Corridor
- **상황:** 통로를 진행하는 동안 연속 기습. 환경 경계가 핵심
- **최적 무기:** Blade (빠른 반격), Chain (가변 리치로 원거리 선제 타격)
- **검증 패시브 축:** C (피격 후 상태 변화), D (연속 처치 보너스)
- **무기 검증 순간:** Lurker 연속 기습을 받으면서 Final Breath(HP 10% 이하 전 공격 크리) 발동 -> 역전 = C축 극대화

---

**ENC-08: Shield Wall (방패벽)**
- **아키타입:** Aegis x1 + Stalker x2 + Swarm x2
- **지형:** Flat Arena
- **상황:** Aegis가 전면, Stalker가 측면 압박, Swarm이 후방 봉쇄
- **최적 무기:** Cleaver (AoE로 Swarm + Stalker 동시 처리 후 Aegis 단독 상대)
- **검증 패시브 축:** B (On-Hit 다중), D (Kill Bonus 연쇄), E (AoE 콤보)
- **무기 검증 순간:** Cleaver Seismic Wave(충격파 거리 x1.5)로 Swarm 일소 + Overkill 전이 = D축+B축

---

**ENC-09: Turret Maze (포대 미로)**
- **아키타입:** Sentinel x4 (각 코너 배치)
- **지형:** Pillared Hall
- **상황:** 기둥 사이를 이동하며 사방의 투사체를 피해야 함
- **최적 무기:** Shiv (빠른 기동으로 접근), Railbow (원거리 각개격파)
- **검증 패시브 축:** F (이동/대시), C (피격 관리)
- **무기 검증 순간:** 대시 3회 연속 후 Light Footing(크리+40%) 발동 -> Sentinel 원샷 = F축

---

**ENC-10: Dive Bomb (급강하 폭격)**
- **아키타입:** Phantom x3
- **지형:** Vertical Shaft
- **상황:** 3체가 시간차 급강하. 연속적인 수직 회피 필요
- **최적 무기:** Railbow (공중 저격), Emitter (광역 원소)
- **검증 패시브 축:** A (공중 적 보너스), F (체공/이동)
- **무기 검증 순간:** Low Gravity(체공 연장)로 플랫폼 상단에서 체류하며 3체 연속 저격 = F축+A축

---

**ENC-11: Boss Antechamber (보스 전실)**
- **아키타입:** Stalker x1 + Aegis x1 + Sentinel x1
- **지형:** Pillared Hall -> Flat Arena 전환
- **상황:** 보스방 직전. 3 아키타입 동시 조합. 미니 보스급 강도
- **최적 무기:** (상황 적응형. 모든 무기에 기회 존재)
- **검증 패시브 축:** 전 축 종합 테스트
- **무기 검증 순간:** 3 아키타입을 효율적으로 처리하는 순서를 플레이어가 직접 결정하는 순간 자체가 검증

---

**ENC-12: The Last Stand (최후의 저항)**
- **아키타입:** Stalker x2 + Swarm x3 + Phantom x1 + Lurker x1
- **지형:** Flat Arena
- **상황:** Deep/Core 지층 최고 난이도방. 4 아키타입 7체 동시(Swarm 개별 계수 시)
- **최적 무기:** Chain (가변 리치로 전방위 대응), Cleaver (AoE 정리)
- **검증 패시브 축:** 전 축 종합. 특히 D (연속 처치) + C (상태 관리)
- **무기 검증 순간:** 대량 적 한복판에서 Kill Streak 5스택(ATK+40%) + Soul Edge(처치 무적) 연쇄 발동 = D축 극대화

---

### 5.2. 패턴-패시브 축 매핑 요약

| 패턴 | A | B | C | D | E | F | G |
|:-----|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| ENC-01 Gauntlet | ++ | | | | ++ | | |
| ENC-02 Chokepoint | ++ | | | | | ++ | |
| ENC-03 Swarm Tide | | ++ | | ++ | | | |
| ENC-04 Aerial Swarm | ++ | | | | | ++ | |
| ENC-05 Pincer | ++ | | ++ | | | | |
| ENC-06 Fortress | ++ | | | | ++ | | |
| ENC-07 Ambush Corridor | | | ++ | ++ | | | |
| ENC-08 Shield Wall | | ++ | | ++ | ++ | | |
| ENC-09 Turret Maze | | | ++ | | | ++ | |
| ENC-10 Dive Bomb | ++ | | | | | ++ | |
| ENC-11 Boss Antechamber | + | + | + | + | + | + | + |
| ENC-12 Last Stand | | | ++ | ++ | | | |

> `++` = 해당 축의 패시브가 극대화. `+` = 유의미한 보상 존재.
> G축(Environment/Team)은 조우 패턴보다 아이템계 지층 환경/코옵 상태에 의존하므로 개별 패턴에서는 직접 검증되지 않는다. G축은 지층 테마(T-FORGE 화염 환경에서 ATK+15% 등)와 코옵 파트너 근접 여부로 검증된다.

---

## 6. 업그레이드 시스템 (Section 5) : Tier 스케일링

### 6.1. 스케일링 철학

> **"같은 적이 더 강해지는 것이지, 새로운 적이 나타나는 것이 아니다."**

Tier 업그레이드는 다음 3축으로만 이루어진다:
1. **수치 배율** (HP/ATK/DEF 증가)
2. **행동 강화** (같은 패턴의 빈도/속도/윈도우 조정)
3. **시각 변형** (팔레트 스왑 + 사이즈 + 파티클)

**금지 사항:** Tier 업그레이드에서 완전히 새로운 공격 패턴을 추가하지 않는다. 기존 패턴의 연속(예: 1타 -> 2타 콤보) 또는 기존 효과의 추가(자폭 개체 등)만 허용.

### 6.2. 수치 스케일링 테이블

| Tier | HP 배율 | ATK 배율 | DEF 배율 | Speed 배율 | 레어리티 매핑 |
|:-----|:-------:|:--------:|:--------:|:----------:|:------------|
| T1 | x1.0 | x1.0 | x1.0 | x1.0 | Normal 무기 |
| T2 | x1.8 | x1.5 | x1.3 | x1.2 | Magic 무기 |
| T3 | x3.0 | x2.2 | x1.8 | x1.3 | Rare-Legendary 무기 |
| T4 | x5.0 | x3.0 | x2.5 | x1.5 | Ancient 무기 |

**지층 보정은 별도 적용:** 최종 스탯 = Base x Tier배율 x 지층배율 x 레어리티보정

```
FinalHP  = BaseHP  x TierHP  x StratumHP  x RarityScale
FinalATK = BaseATK x TierATK x StratumATK x RarityScale

지층 배율 (기존 유지):
  Surface: HP x1.0, ATK x1.0
  Mid:     HP x1.5, ATK x1.3
  Deep:    HP x2.5, ATK x2.0
  Core:    HP x4.0, ATK x3.0

레어리티 배율 (기존 유지):
  Normal x1.0, Magic x1.2, Rare x1.5, Legendary x2.0, Ancient x3.0
```

### 6.3. 행동 강화 테이블

| 파라미터 | T1 | T2 | T3 | T4 |
|:---------|:--:|:--:|:--:|:--:|
| Attack Cooldown | 기준값 | x0.85 | x0.70 | x0.55 |
| Tell 지속시간 | 기준값 | x0.90 | x0.80 | x0.70 |
| 콤보 타수 | 1타 | 1-2타 | 2타 | 2-3타 |
| 특수 행동 확률 | 0% | 20% | 40% | 60% |
| Enrage 임계값 | 없음 | 없음 | HP 30% | HP 50% |

**설계 근거:**
- Attack Cooldown 감소: 같은 패턴이지만 쉬는 시간이 줄어 압박 강도 증가
- Tell 감소: 반응 윈도우가 줄어 숙련도 요구 상승 (최소 2f = 33ms 보장)
- 콤보 타수 증가: 패턴의 지속시간이 길어져 처벌 윈도우도 증가 (리스크/리워드 유지)

### 6.4. 시각 차별화 규칙

```
시각 변형 = 기본 실루엣 + Tier 팔레트 LUT + Size 배율 + Tier 파티클

Tier 팔레트:
  T1: 기본 회색/중성 팔레트
  T2: 테마 주색 팔레트 (T-FORGE=주황, T-WAR=붉은 등)
  T3: 테마 강조색 + 발광 포인트 (눈/핵심부)
  T4: 풀 팔레트 변환 + 지속 파티클 + 사이즈 1.3-1.5배

Size 배율:
  T1: 1.0x
  T2: 1.1x
  T3: 1.2x
  T4: 1.3-1.5x (아키타입별 상이)
```

### 6.5. Tier 출현 규칙

| 지층 | T1 비율 | T2 비율 | T3 비율 | T4 비율 |
|:-----|:------:|:------:|:------:|:------:|
| Surface | 80% | 20% | 0% | 0% |
| Mid | 40% | 45% | 15% | 0% |
| Deep | 10% | 30% | 50% | 10% |
| Core | 0% | 15% | 45% | 40% |

---

## 7. 보스 패턴 원칙 (Section 6)

### 7.1. 보스 = 아키타입 매시업 + 고유 메커닉

아이템계 보스(기억의 문)는 기본 아키타입의 행동을 조합한 존재다. 보스는 새로운 행동 유형을 발명하지 않는다. 대신 2-3개 아키타입의 핵심 행동을 하나의 개체에 통합하고, 위상(Phase) 전환이라는 고유 메커닉을 추가한다.

### 7.2. 보스 Tier별 아키타입 구성

| 보스 등급 | 출현 조건 | 아키타입 조합 수 | 위상(Phase) 수 | 패시브 축 검증 깊이 |
|:----------|:---------|:---------------:|:-------------:|:------------------|
| **아이템 장군** (Item General) | Normal-Magic 최종 지층 | 2 아키타입 | 2 위상 | 단일 축 검증 (A or E) |
| **아이템 왕** (Item King) | Rare 최종 지층 | 2-3 아키타입 | 2-3 위상 | 2축 동시 검증 (A+F, B+D 등) |
| **아이템 신** (Item God) | Legendary 최종 지층 | 3 아키타입 | 3 위상 | 3축 동시 검증 |
| **아이템 대신** (Item Great God) | Ancient 심연 지층 | 4+ 아키타입 전환 | 4 위상 | 전 축 종합 검증 |

### 7.3. 보스 설계 원칙

**원칙 1: 아키타입 위상 전환**
보스는 HP 임계값에 따라 아키타입 행동 모드를 전환한다.

```
예시: 아이템 왕 (Rare 보스)
  Phase 1 (HP 100-60%): Stalker 모드 — 직선 추적 + 근접 콤보
  Phase 2 (HP 60-30%):  Sentinel 모드 — 후퇴 + 투사체 연사
  Phase 3 (HP 30-0%):   Stalker+Sentinel 동시 — 추적하면서 투사체 발사
```

**원칙 2: 아키타입 약점 계승**
보스가 특정 아키타입 모드일 때, 해당 아키타입의 약점이 그대로 적용된다.
- Stalker 모드: 배후 노출 (A축 검증)
- Sentinel 모드: 이동으로 회피 가능 (F축 검증)
- Aegis 모드: 정면 방어 (관통/배후 필요)
- Phantom 모드: 공중 체류 (리치/원거리 필요)

**원칙 3: 처벌 윈도우 보장**
모든 보스 패턴은 Tell(예고) -> Action(행동) -> Recovery(경직) 구조를 따르며, Recovery 시간은 최소 500ms를 보장한다. 이 구간이 플레이어의 "무기 패시브가 빛나는 순간"이다.

```
Tell      Action     Recovery
 |           |          |
 v           v          v
[예고 3-6f] [공격 수행] [경직 8-16f = 패시브 검증 윈도우]

Recovery 동안:
  - Blade: 3타 피니셔 완성 가능 (E축)
  - Shiv: 배후 진입 + 4타 강타 (A축)
  - Cleaver: 풀 차지 강타 (E축)
  - Harpoon: 관통 찌르기 (A축)
  - Chain: 끝단 강타 x2.0 (E축)
  - Railbow: 정밀 조준 사격 (F축)
  - Emitter: 원소 증폭 연사 (G축)
```

**원칙 4: 보스 Tier별 검증 깊이 진행**

| 보스 | 검증 방식 | 예시 |
|:-----|:---------|:-----|
| 아이템 장군 | "이 패시브가 발동하면 좋다"를 알려주는 단계 | Stalker 모드 배후 노출이 명확 -> A축 패시브 첫 경험 |
| 아이템 왕 | "패시브를 의도적으로 발동시켜야 이긴다" 단계 | Sentinel+Stalker 전환 중 투사체 사이로 대시 -> F축 활용 필수 |
| 아이템 신 | "여러 패시브를 동시에 운용해야 이긴다" 단계 | 3 아키타입 전환에 맞춰 E축(콤보)+F축(이동)+A축(조건부) 동시 관리 |
| 아이템 대신 | "무기와 패시브의 완전한 숙달을 증명하는" 단계 | 전 아키타입 행동이 혼재. 모든 축이 동시에 요구됨 |

### 7.4. 보스별 아키타입 구성 예시

#### 아이템 장군 (Item General) — 기존 Guardian 확장

```
기본 아키타입: Stalker + Sentinel

Phase 1 (HP 100-50%): Stalker 주도
  - 직선 추적 -> Swipe(근접 스윙)
  - 가끔 후퇴 -> 단발 투사체 1회 (Sentinel 전조)

Phase 2 (HP 50-0%): Enrage + Stalker-Sentinel 혼합
  - Charge(돌진) 후 정지 -> 투사체 3연발
  - Slam(점프 슬램) 착지 시 충격파 + 방사형 투사체 4발
  - Attack Cooldown x0.6

검증 축: A(돌진 후 배후 노출), E(Recovery 윈도우에서 콤보 완성)
```

#### 아이템 왕 (Item King) — 신규

```
기본 아키타입: Aegis + Phantom + Sentinel

Phase 1 (HP 100-60%): Aegis 주도
  - 전면 방패 들고 느린 전진
  - 방패 강타 (넉백 강)
  - 약점: 배후

Phase 2 (HP 60-30%): Phantom 전환
  - 방패 버리고 비행 모드 진입
  - 급강하 x2 연속 + 수평 돌진
  - 약점: 착지 경직

Phase 3 (HP 30-0%): Sentinel + Phantom 혼합
  - 체공하면서 투사체 연사
  - 가끔 급강하
  - 약점: 투사체 패턴 사이 공격 윈도우

검증 축: A(배후) + F(이동/체공 대응) + B(착지 경직 집중 타격)
```

#### 아이템 신 (Item God) — 신규

```
기본 아키타입: Stalker + Aegis + Phantom (3 아키타입 순환 전환)

Phase 1 (HP 100-66%): Stalker
Phase 2 (HP 66-33%): Aegis
Phase 3 (HP 33-0%): Phantom + 이전 Phase 패턴 랜덤 삽입

각 Phase 전환 시 rage_transition 연출(3f 무적 + 팔레트 전환)
검증 축: A+E+F (전환 패턴 읽기 + 즉시 대응)
```

#### 아이템 대신 (Item Great God) — 신규 (Ancient 심연 전용)

```
기본 아키타입: 전 6 아키타입 행동을 Phase별로 전환

Phase 1: Stalker+Swarm (추적 + 소환물)
Phase 2: Aegis+Sentinel (방어 + 포격)
Phase 3: Phantom+Lurker (비행 + 은신 페이크)
Phase 4 (HP 10%): 전 Phase 패턴 무작위 혼합 + Attack Cooldown 최소

화면 절반 이상 차지하는 대형 보스
야리코미 최종 도전 목표. 전 축 종합 검증
```

---

## 8. 구현 우선순위

| Phase | 구현 대상 | 근거 |
|:------|:---------|:-----|
| Phase 1 | ARC-01 Stalker (T1-T2), ARC-02 Swarm (T1-T2), ARC-03 Sentinel (T1-T2) | 기존 Skeleton/Slime/Ghost 매핑. 최소 3 아키타입으로 조합 전투 검증 |
| Phase 2 | ARC-04 Aegis (T1-T3), ARC-05 Phantom (T1-T3), ARC-06 Lurker (T1-T3) | 배후/수직/기습 축 추가. 7 무기 카테고리 전체 상성 검증 |
| Phase 3 | 전 아키타입 T4, 아이템 왕/신 보스 | 심층 지층 + 높은 레어리티 콘텐츠 |
| Phase 4 | 아이템 대신, 시즌 이벤트 변형, 코옵 전용 조우 패턴 | 장기 운영 |

---

## 9. 엣지 케이스 및 제약

| 케이스 | 처리 방침 |
|:-------|:---------|
| 같은 방에 Aegis 2체 이상 | 허용. 단, Tight Corridor에서는 1체 제한 (측면 우회 불가능 방지) |
| Lurker가 보스방에 배치 | 금지. 보스방은 보스 단독 |
| Swarm 개체 수가 방 최대 적 수를 초과 | Swarm은 개별 카운트에서 제외. "Swarm 1세트 = 적 1카운트"로 계산 |
| T4 적이 Surface 지층에 출현 | 금지. Tier 출현 규칙(6.5) 준수 |
| 원거리 무기만 보유한 플레이어 vs Lurker | Lurker 출현 시 최소 2f 경직 보장. 원거리로도 반격 가능 |
| 코옵 시 적 스탯 스케일링 | 기존 규칙 유지: HP x(1 + 0.5 x (playerCount - 1)) |

---

## 10. 의존성 (Dependencies)

| 방향 | 시스템 | 계약 |
|:-----|:-------|:-----|
| 읽음 | `System_Combat_Weapons.md` | 7 무기 카테고리, 시그니처 메커닉, 히트박스 |
| 읽음 | `WeaponDiversity_300Weapons_Research.md` | 7축 패시브 프레임워크 |
| 읽음 | `System_ItemWorld_FloorGen.md` | 4x4 Room Grid, 방 타입, 지층 구조 |
| 읽음 | `System_Enemy_Spawning.md` | 스폰 규칙, 가중치 선택, Tier 출현률 |
| 읽음 | `System_ItemNarrative_MonsterPool.md` | 테마별 몬스터 비주얼/서사 매핑 |
| 쓰기 | `Content_Monster_Bestiary.md` | 아키타입 매핑 갱신 |
| 쓰기 | `Sheets/Content_Stats_Enemy.csv` | Tier별 수치 테이블 |
