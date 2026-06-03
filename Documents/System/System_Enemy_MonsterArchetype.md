# 몬스터 아키타입 시스템 (Monster Archetype System)

> **문서 ID:** SYS-ENM-ARC
> **작성일:** 2026-04-19
> **최종 개정:** 2026-06-03 (아키타입 정합 라운드)
> **문서 상태:** Draft
> **2-Space:** World + Item World
> **설계 의도:** 7카테고리 무기 x 7축 패시브 프레임워크(300무기)에 대응하는 몬스터 아키타입 시스템. 10개 BASE 아키타입이 속성·MOD·조우 조합으로 다양성을 만들며, 아키타입 조합이 특정 무기 패시브 축(A-G)을 검증하는 전술 상황을 생성한다.
> **이 문서가 아키타입 분류의 SSoT다.** 학술/리서치 출처는 `Documents/Research/EnemyDesign_MobArchetype_Research.md` 이며, 본 문서가 그 11종 분류를 게임 캐논으로 확정한다.

---

## 0. 개정 이력 (Consolidation Note)

> **2026-06-03 — 아키타입 정합 라운드.** 분산돼 있던 3개 분류 버전(본 문서 8 ARC / `System_Enemy_AI.md` 9 A-series / Research 11 A-series)을 **10종 단일 체계**로 통합했다.

| 결정 | 내용 |
| :--- | :--- |
| **기준 분류** | Research 11종(A-01~A-10 + A-03b)을 캐논 기반으로 채택. ARC- 넘버링 폐기, **A- 넘버링으로 통일.** |
| **A-07 앰부시형 흡수** | 스텔스 제거 결정에 따라 독립 아키타입 A-07(천장/벽 은신)을 폐기하고, 그 "빠른 접근 + 강한 1타" 위협을 **A-01 Charger의 급습 변형**으로 흡수. → 10종. |
| **스텔스·엄폐 메커닉 전면 제거** | 적 은신/위장, 플레이어 측 은신·엄폐(시야각 사각, 시선 차단 회피)를 전부 제거. 감지는 **반경 단독**으로 단순화(코드 현실과 일치). 상세는 `System_Enemy_AI.md` §2.3. |
| **Tier 진화(T1~T4) 제거** | 같은 아키타입을 4단계로 진화시키던 Tier 레이어를 폐기. 강도 스케일링은 **지층 × 레어리티 수치 계수**로만 처리(`System_Enemy_AI.md` §2.8). 체감 다양성은 속성 × MOD × 조우 조합이 담당. |

**10종 최종 목록:** A-01 Charger · A-02 Jumper · A-03a Shooter · A-03b Bombardier · A-04 Shielder · A-05 Flier · A-06 Swarmer · A-08 Summoner · A-09 Elite · A-10 Sentinel.

---

## 0.1. 필수 참고 자료 (Mandatory References)

| 문서 | 경로 |
| :--- | :--- |
| 적 AI 시스템 (FSM·감지·스케일링) | `Documents/System/System_Enemy_AI.md` |
| 무기 시스템 (7카테고리) | `Documents/System/System_Combat_Weapons.md` |
| 무기 다양성 리서치 (7축 패시브) | `Documents/Research/WeaponDiversity_300Weapons_Research.md` |
| 적 아키타입 리서치 (출처) | `Documents/Research/EnemyDesign_MobArchetype_Research.md` |
| 적 스폰 시스템 | `Documents/System/System_Enemy_Spawning.md` |
| 아이템계 지층 생성 | `Documents/System/System_ItemWorld_FloorGen.md` |
| 전투 철학 | `Documents/Design/Design_Combat_Philosophy.md` |
| 보스 설계 | `Documents/System/System_ItemWorld_Boss.md` |
| 화학 반응 매트릭스 (속성) | `Documents/Design/Design_ChemicalReactions_FullMatrix.md` |

---

## 1. 설계 원칙

### 1.1. 핵심 명제

> **명제 1 — "몬스터는 무기 패시브의 검증 장치다."**
> **명제 2 — "모든 몬스터는 속성(Attribute)을 가진다."**

300개 무기가 7축(A-G) 패시브로 차별화되어 있으므로, 몬스터 시스템의 핵심 목적은 **특정 패시브 축이 빛나는 전술 상황을 반복적으로 생성하는 것**이다. 아키타입이 달라지면 유효한 패시브 축이 달라지고, 아키타입 조합이 바뀌면 최적 무기 선택이 바뀐다.

**속성 필수 원칙 (예외 없음):** 모든 몬스터는 반드시 하나의 **속성(fluid 물질 = magma / water / oil / acid / charged / cyro 중 1)** 을 가진다. 무속성 몬스터는 존재하지 않는다. 속성은 그 몬스터가 (a) 무엇으로 이뤄졌는지, (b) 죽거나 이동할 때 무엇을 남기는지, (c) 화학 반응 매트릭스에서 어떻게 반응하는지를 결정한다. 속성은 기본적으로 **지층 테마(5기질)** 가 자동 바인딩하며(forge→magma, iron→cyro/water, rust→acid, spark→charged, shadow→oil), 디자이너가 개별 override할 수 있다. 조성 규칙은 §2.11 참조.

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

1. **BASE 아키타입은 10종.** 이상 추가 금지 — 추가하려면 슈터 4 base 패턴(Soldier/Aggressor/Carrier/Tank)에 없는 새 위협 축을 입증해야 한다. 다양성은 아키타입 조합 + 속성 + MOD가 만든다.
2. **새 위협 축 발명 금지.** 스케일링(지층/레어리티)은 기존 행동의 강도/빈도/윈도우만 조정한다. 완전히 새로운 공격 패턴을 수치 스케일링으로 추가하지 않는다.
3. **아트 자산 = 기본 실루엣 10종 + 테마 팔레트 스왑 + 속성 이펙트.** 신규 스프라이트 최소화.
4. **4x4 Room Grid 기준 설계.** 방당 최대 적 수 6, 최대 아키타입 조합 3.
5. **모든 몬스터는 속성을 가진다 (예외 없음).** 무속성 몬스터 금지. 속성 = fluid 물질 1종, 기본은 테마 자동 바인딩. 몬스터 정의·스폰 데이터에 속성 필드가 비면 검증 실패로 처리한다 (§2.11).
6. **스텔스·은신·위장 금지.** 적은 플레이어에게 보이지 않는 상태에서 출현하거나 기습하지 않는다. 모든 적은 화면 안에서 인지 가능한 상태로 행동하며, 공격은 Tell로 예고된다. (구 A-07 앰부시형 폐기.)

---

## 2. 몬스터 아키타입 시스템 (Section 1)

### 10 BASE 아키타입

> 분류 출처: Research 11종(Rivera et al. 2012 슈터 NPC 패턴 통합). A-07 앰부시형은 스텔스 제거로 A-01에 흡수. 슈터 family = A-03a Shooter(기동 사격) + A-03b Bombardier(범위 포격) + A-10 Sentinel(고정 포대).

---

#### A-01: Charger (근접 돌격형)

**컨셉:** 플레이어를 직선으로 쫓아와 근접 타격을 가하는 기본 위협 단위. 거리 압박의 표준.
**실루엣:** 갑옷 파편으로 구성된 인간형. 한 손에 부서진 무기. 16x24px 기본 캔버스.
**Rivera 대응:** Aggressor > Berserker.

**핵심 행동:**
- 감지 범위 내 플레이어를 향해 직선 추적
- 추적 도달 시 전방 근접 1타 (Tell: 무기 뒤로 당기기 3f)
- Attack Cooldown 후 재추적
- 지상 이동만. 점프는 1-2타일 단차에서만 사용

**급습 변형 (Rusher) — 구 A-07 흡수:**
스텔스 없이, 화면 가장자리나 원거리에서 **빠른 가속으로 진입해 강한 1타**를 노리는 변형. 은신·위장은 사용하지 않으며, 가속 구간 자체가 시각적 Tell(돌진 자세 + 잔상)이 된다. 1타 후 짧은 경직 → 일반 Charger 추적으로 복귀. MOD-06(광분)과 결합하면 "기습 압박" 조우를 구성한다.

**패시브 축 검증:**

| 축 | 왜 유효한가 | 구체적 예시 |
|:---|:---|:---|
| A (Critical Condition) | 직선 접근으로 배후 노출이 잦다. 급습 변형은 피격 후 카운터 보너스 유효 | Shiv 배후 강타(x3.0), Counter Rhythm(피격 후 0.3초 내 x2.0) |
| E (Combo Variation) | 정지 후 공격하므로 콤보 윈도우가 예측 가능 | Blade Finisher's Edge(3타 x1.8), Combo Breaker(대시 캔슬) |
| F (Movement) | 추적-멈춤·급습 패턴이 대시 후 공격을 보상 | Momentum Blade(이동 후 x1.5), Blink Cut(대시 무적) |

**비주얼:** 테마 팔레트 스왑 + 속성 이펙트(magma=잔열 궤적 / cyro=결빙 발자국 등). 급습 변형은 돌진 시 속도선.

---

#### A-02: Jumper (점프/바운스형)

**컨셉:** 포물선 점프를 반복하며 불규칙한 궤도로 압박하는 위협. 착지 지점이 위협 영역.
**실루엣:** 작은 구체 또는 탄성체. 12x12px 기본 캔버스. 점프 시 변형(squash & stretch).

**핵심 행동:**
- 일정 주기로 플레이어 방향 포물선 점프
- 착지 시 소형 범위 피해(착지 충격) (Tell: 점프 직전 웅크림 3f)
- 점프 위상이 어긋나면 안전 창이 좁아짐(2체 이상 조합 시 핵심)
- 지상 이동만. 점프 높이/거리는 스탯 고정

**패시브 축 검증:**

| 축 | 왜 유효한가 | 구체적 예시 |
|:---|:---|:---|
| F (Movement) | 착지 지점 예측 회피로 이동/체공 보너스가 빈번 | Low Gravity(체공 이속 x1.3), Velocity Cut(이속 비례 데미지) |
| A (Critical Condition) | 착지 직후 짧은 무방비 경직에 카운터 보너스 | First Blood(방 첫타 x2.5), Counter Rhythm |
| E (Combo Variation) | 착지 경직 윈도우에 콤보를 욱여넣어야 함 | Finisher's Edge(3타 x1.8), Wide Arc(히트박스 +30%) |

**비주얼:** 속성에 따라 착지 잔류물 분화(oil=가연 슬릭 / acid=DoT 장판). 점프 궤적 잔상.

---

#### A-03a: Shooter (직선 사격형 / 기동)

**컨셉:** 직선 투사체를 쏘며 끊임없이 거리를 재조정(카이팅)하는 기동 사격형. 고정된 Sentinel과 달리 *도망치며 쏜다* — 추격·예측을 강제한다.
**실루엣:** 경장 사수형. 소형 총/활. 16x16px 기본 캔버스.
**Rivera 대응:** Soldier > Grunt.

**핵심 행동:**
- 이동-정지 반복(Cautious): 사격 위치를 잡고 직선 투사체 1-3발 발사 후 재배치 (Tell: 발광 2f)
- 플레이어 접근 시 후퇴하며 거리 유지(kiting). 사격 중에는 정지(취약 윈도우)
- 재배치 중에는 사격 불가
- 벽에 막히면 측면 회피 대시
- 투사체는 벽에 닿으면 소멸. 관통 불가

**패시브 축 검증:**

| 축 | 왜 유효한가 | 구체적 예시 |
|:---|:---|:---|
| F (Movement) | 카이팅 추격을 위해 대시/이동 보너스가 핵심 | Momentum Blade(이동 후 x1.5), Blink Cut(대시 무적 접근) |
| D (Kill Bonus) | 낮은 HP·정지 윈도우로 빠른 처치 → kill 연쇄 보너스 | No Mercy(처치 후 크리 확정), Hungry Edge(처치 시 이속+20%) |
| E (Combo Variation) | 접근 성공 시 짧은 정지 윈도우에 콤보 압축 | Combo Breaker(대시 캔슬 접근), Finisher's Edge(3타 x1.8) |

**비주얼:** 속성 투사체(charged=감전탄 / magma=화염탄). 재배치 시 잔상.

---

#### A-03b: Bombardier (범위 포격형)

**컨셉:** 후방에서 포물선 범위 폭발 투사체를 쏘아 플레이어의 발판을 강제로 비우게 만드는 지역 거부(area-denial)형 위협. *착탄 지점*을 위협한다.
**실루엣:** 곡사포/박격포를 진 중장형. 또는 부푼 포낭형. 20x20px 기본 캔버스.
**Rivera 대응:** Soldier > Grenadier.

**핵심 행동:**
- 후방 유지(플레이어와 거리 벌림). 직선 사격 안 함 — 포물선 사격만
- 착탄 지점에 조준 마커 표시(0.5s 지연) → 범위 폭발 (Tell: 조준 마커 + 발광 6f)
- 마커가 미리 보이므로 *즉각 이동·수직 회피*로 피함. 마커 위에 있으면 피격
- 근접 시 회피/후퇴(취약). 지속 근접 능력 낮음

**패시브 축 검증:**

| 축 | 왜 유효한가 | 구체적 예시 |
|:---|:---|:---|
| F (Movement) | 착탄 회피를 위해 이동/대시/수직 회피가 강제됨 | Light Footing(대시 3회 크리+40%), Gale Rhythm(방향 전환 x1.3) |
| A (Critical Condition) | 접근 시 무방비 후퇴 경직이 생겨 배후·접근 보너스 | Shiv 배후 강타(x3.0), Momentum Blade(이동 후 x1.5) |
| G (Environment/Team) | 좁은 발판·플랫폼 위에서 area-denial 위협이 증폭 | 코옵 분산 보너스, 환경 회피 시그니처 |

**비주얼:** 착탄 마커 = 속성색 원형 경고. 착탄 시 속성 장판(magma=화염장판 / acid=부식장판).

---

#### A-04: Shielder (방어/방패형)

**컨셉:** 전면에 방어 판정을 가지고 느리게 전진하며, 정면 공격을 무효화하는 장벽형 위협.
**실루엣:** 큰 방패를 든 갑옷형. 또는 전면이 강화된 거대 갑각류. 24x24px 기본 캔버스.
**Rivera 대응:** Tank > Shield.

**핵심 행동:**
- 전면 180도 범위 내 피격 시 데미지 80% 감소
- 느린 전진 + 전면 밀어내기(push) 공격 (Tell: 방패 들어올림 4f)
- 배후(후면 180도)는 방어 없음. 정상 피격
- Cleaver 충격파, Harpoon 관통 등 특정 무기 시그니처가 정면 방어를 관통/파괴 가능

**패시브 축 검증:**

| 축 | 왜 유효한가 | 구체적 예시 |
|:---|:---|:---|
| A (Critical Condition) | 배후 공격이 필수적이므로 배후 보너스가 극대화 | Shiv 배후 강타(x3.0), Shadow Step(텔레포트 배후 세팅) |
| F (Movement) | 배후 확보를 위해 지속적 기동이 요구됨 | Gale Rhythm(방향 전환 x1.3), Blink Cut(대시 무적) |
| E (Combo Variation) | 정면 무효화로 콤보 방향/구조 선택이 중요 | Combo Breaker(대시 캔슬), Seeking Edge(자동 유도) |

**비주얼:** 속성 방패(MagmaCrucible 등 §2.11). 파괴 시 속성 분출.

---

#### A-05: Flier (비행/공중형)

**컨셉:** 지형 제약을 무시하고 공중에서 급강하/선회 공격을 가하는 공중 위협. 수직 공간을 활성화한다.
**실루엣:** 날개 달린 반투명 형태. 또는 부유하는 파편 집합체. 16x16px 기본 캔버스.

**핵심 행동:**
- 자유 비행. 솔리드 벽만 충돌(벽 통과 금지, 공정성). 플랫폼/빈 공간 통과
- 고공 순찰 → 급강하 공격(Tell: 날개 접음 2f) → 재상승
- 급강하 시 수직 히트박스(하방 넓음). 접지 후 짧은 경직
- 체공 중에는 원거리/리치 무기만 유효한 구간 발생

**패시브 축 검증:**

| 축 | 왜 유효한가 | 구체적 예시 |
|:---|:---|:---|
| A (Critical Condition) | 공중 적 타격 보너스가 직접 적용 | Aerial Reckoning(공중 적 x1.5), First Blood(방 첫타 x2.5) |
| F (Movement) | 수직 추적을 위해 점프/대시 사용 빈도가 극대화 | Low Gravity(공중 이속 x1.3, 낙하 x0.7), Velocity Cut |
| B (On-Hit) | 급강하 착지 경직 시 집중 타격 → On-Hit 연쇄 | Flame Scar(매 3타 화염 폭발), Tidal Blade(5회 적중 파동) |

**비주얼:** 날개 잔상 + 속성 파티클. 급강하 시 속도선.

---

#### A-06: Swarmer (군집형)

**컨셉:** 단독으로는 약하지만 3-5체가 동시에 출현하여 공간을 점령하는 군집 위협.
**실루엣:** 작은 구체 또는 곤충형. 8x8px 기본 캔버스. 무리 단위로 인식.
**Rivera 대응:** Aggressor > Swarm.

**핵심 행동:**
- 3-5체가 무리(Flock) 단위로 이동. Boid 알고리즘 기반 군집 행동
- 개별 공격력 극히 낮음(짧은 쿨다운 약근접). 수량으로 위협
- 처치 시 다른 개체가 일시적으로 흩어짐(scatter) 후 재집결

**패시브 축 검증:**

| 축 | 왜 유효한가 | 구체적 예시 |
|:---|:---|:---|
| B (On-Hit) | 다수 타격 기회로 On-Hit 발동 빈도 극대화 | Vampire Edge(적중 HP 1.5%), Thunder Chain(연쇄 번개 15%) |
| D (Kill Bonus) | 연속 처치가 쉬워 Kill Bonus 스택 빠르게 누적 | Kill Streak(처치당 ATK +8%, 최대 5스택), Soul Edge(처치 무적) |
| E (Combo Variation) | 밀집 상태에서 콤보 히트 수가 폭발적으로 증가 | Lucky Seven(7타 누적 시 무적+회복), Wide Arc(히트박스 +30%) |

**비주얼:** 무리 연결선 오라(밀집 시). 속성에 따라 잔류 장판(oil 군집 = 가연 슬릭).

---

#### A-08: Summoner (지원/소환형)

**컨셉:** 직접 교전을 피하고 후방에서 아군을 강화하거나 소환물을 생산하여 전장 위협을 증폭하는 위협. 우선 제거 대상.
**실루엣:** 후드/지팡이형 또는 부유 구체. 16x20px 기본 캔버스.
**Rivera 대응:** Carrier > Summoner.

**핵심 행동:**
- 후방 유지(Cautious). 플레이어 접근 시 후퇴
- 주기적으로 (a) 인근 아군 강화(속도↑/ATK↑/방어막) 또는 (b) Swarmer 1-2체 소환 (Tell: 시전 발광 6f)
- 직접 공격력 낮음. 지속 근접 취약
- 제거 시 강화·소환 효과 즉시 소멸

**패시브 축 검증:**

| 축 | 왜 유효한가 | 구체적 예시 |
|:---|:---|:---|
| D (Kill Bonus) | 우선 처치 시 전장이 급격히 약화 → kill 보상 가치 극대화 | No Mercy(처치 후 크리 확정), Soul Edge(처치 무적으로 후방 침투) |
| B (On-Hit) | 소환물·강화 아군 다수에 On-Hit 연쇄 | Thunder Chain(연쇄), Flame Scar(폭발) |
| G (Environment/Team) | 코옵 시 우선순위 분담(한 명이 Summoner 견제) | 코옵 역할 분담 시그니처 |

**비주얼:** 시전 시 속성 룬/연결선(강화 대상에게 빔). 소환 시 속성 게이트.

---

#### A-09: Elite (엘리트형)

**컨셉:** 2-3개 아키타입의 핵심 행동을 하나의 개체에 통합한 다층 위협. 보상방의 미니 보스급 존재.
**실루엣:** 기본 아키타입 실루엣 + 금색 발광 + 사이즈 1.3배. 16x24px 기준 확대.
**Rivera 대응:** Soldier > Elite.

**핵심 행동:**
- 2-3개 BASE 아키타입의 핵심 패턴을 보유(예: Charger 추적 + Shooter 투사체)
- 높은 HP. 패턴 간 전환에 짧은 무적(0.3s)
- 처치 시 강화 드랍(레어리티 포탈 등 G축 연동)
- MOD-06(광분) 기본 내장 가능(HP 50% 이하 강화)

**패시브 축 검증:** 전 축 종합. 보유한 BASE 아키타입의 패시브 축이 그대로 적용된다.

**비주얼:** 금색 발광 오라 + 속성 강조. 처치 시 대형 소멸 연출.

---

#### A-10: Sentinel (고정 포대형)

**컨셉:** 고정 위치 또는 극히 제한된 구역에서 고화력 장거리 투사체로 공간을 지배하는 포대형 위협. 경로를 차단한다.
**실루엣:** 구조물에 부착된 포대형. 또는 부유 구체. 16x16px 기본 캔버스.
**Rivera 대응:** Tank > Turret.

**핵심 행동:**
- 고정 위치(또는 매우 느린 부유). 이동하지 않음
- 일정 주기로 고데미지 직선 투사체 발사 (Tell: 발광 2f)
- 투사체는 벽에 닿으면 소멸. 관통 불가
- 피격 시 넉백 없음(고정형). 일시적 사격 중단(flinch 0.3s)

**패시브 축 검증:**

| 축 | 왜 유효한가 | 구체적 예시 |
|:---|:---|:---|
| F (Movement) | 투사체 회피를 위해 이동/대시 빈도가 급증 | Railbow 카이팅 시그니처(x1.2), Light Footing(대시 3회 크리+40%) |
| A (Critical Condition) | 고정 위치이므로 배후·사각 확보가 쉬움 | Piercing Heart(후방 콤보 x2.5), Critical Eye(배후 3타 x3.0) |
| C (State-Change) | 투사체 피격으로 HP 변동이 잦아 상태 기반 패시브 발동 | Berserker's Fury(저HP 공속+ATK), Guardian's Oath(풀HP DEF+20%) |

**비주얼:** 단안→다안 구체 + 조준선 이펙트. 속성 투사체.

---

### 아키타입 요약표

| ID | 아키타입 | 위협 축 | 핵심 패시브 검증 | 구현된 적 매핑 |
|:---|:---------|:--------|:-----------------|:--------------|
| A-01 | Charger | 거리 압박 (+급습) | A / E / F | Skeleton |
| A-02 | Jumper | 불규칙 궤도 | F / A / E | Slime |
| A-03a | Shooter | 기동 사격(카이팅) | F / D / E | Ghost |
| A-03b | Bombardier | 지역 거부(범위 포격) | F / A / G | (신규 필요) |
| A-04 | Shielder | 정면 무효화 | A / F / E | (신규 필요) |
| A-05 | Flier | 수직 위협 | A / F / B | Spark Bat (계획) |
| A-06 | Swarmer | 수량 압도 | B / D / E | Cinder Imp (계획) |
| A-08 | Summoner | 전장 증폭 | D / B / G | (신규 필요) |
| A-09 | Elite | 다층 위협 | 전 축 종합 | GoldenMonster |
| A-10 | Sentinel | 고정 고화력 | F / A / C | (신규 필요) |

> **구현 현황 주석:** 현재 코드에 완성된 적은 Skeleton(A-01), Slime(A-02, 수동형), Ghost(A-03a), GoldenMonster(A-09), Boss01(보스). Spark Bat(A-05)·Cinder Imp(A-06)·Gladiator(기억 단편)는 계획 단계. 갭 추적은 구현 현황 대시보드 참조.

---

### 2.11 조성 레이어 (Composition Layer) — 모든 몬스터는 속성을 가진다

> **핵심 원칙(명제 2):** 한 마리의 몬스터는 고정 로스터의 한 항목이 아니라, **직교 레이어의 곱**으로 조성된다. 모든 몬스터는 반드시 **속성(물질)** 을 가지며, 속성은 기본적으로 지층 테마가 자동 바인딩한다. 이미 구현된 fluid·container·화학반응 시스템 위에 얹는 *조성 규칙*이며 신규 시스템이 아니다.

#### 2.11.1 4개 조성 레이어

| 레이어 | 정의 | 출처 시스템 | 필수 |
| :--- | :--- | :--- | :---: |
| **행동 (Archetype)** | 이동·공격 패턴 | A-01~A-10 (10종) | 필수 |
| **속성 (Fluid)** | 무엇으로 이뤄졌나 / 무엇을 남기나 / 어떻게 반응하나 | `System_World_Fluid`, 화학 매트릭스 | **필수(예외 없음)** |
| **껍질 (Container)** | 부서지는 용기/내용물 (선택) | `ThrowableContainer`, `ContainerPools` | 선택 |
| **거동 변형 (MOD)** | 행동 모디파이어 | 8 MOD (§5.x) | 선택 |

> Tier 레이어는 폐기됐다(2026-06-03). 강도는 §6의 지층×레어리티 수치 계수가 담당한다. 손으로 저작하는 것은 사실상 **행동 × MOD** 뿐이다. 속성·껍질은 테마가 자동 바인딩하므로, 아키타입 1종이 5테마 × 6속성으로 5-6배의 체감 변종을 낳는다.

#### 2.11.2 속성 → 거동 규칙 (모든 몬스터 적용)

속성은 다음 3가지를 결정한다 (화학 매트릭스 SSoT: `Design_ChemicalReactions_FullMatrix.md`).

| 결정 항목 | 예 |
| :--- | :--- |
| **구성/잔류** | magma 몸 = 이동 궤적에 잔열·죽으면 magma 풀 / oil 몸 = 미끄러운 가연 슬릭 / cyro 몸 = 결빙 슬릭 |
| **반응(화학)** | water 몸 → 전기 chain 취약 / oil 몸 → 화염 연쇄 취약 / acid 몸 → metal 플랫폼 부식 / magma 몸 → oil 점화 |
| **On-hit/사망 효과** | magma=Burn 부여 / acid=DoT 장판 / charged=감전 / cyro=Frozen 슬로우 |

#### 2.11.3 테마 → 속성·껍질 자동 바인딩 (이미 매핑됨)

`ContainerPools.ts` 가 이미 기질→용기→fluid를 매핑하므로, 테마만 정하면 속성·껍질이 자동 결정된다. 디자이너 override 가능.

| 테마(기질) | 자동 속성(Fluid) | 자동 껍질(Container) |
| :--- | :--- | :--- |
| forge | magma | MagmaCrucible |
| iron | cyro / water | CyroCanister / WaterBarrel |
| rust | acid | AcidVial |
| spark | charged | (전도 용기) |
| shadow | oil | OilDrum |

#### 2.11.4 3가지 통합 패턴

1. **Fluid 본체** — 적의 몸이 속성 fluid. 같은 Charger가 forge=불 궤적 추격자 / iron=얼음 추격자 / rust=부식 추격자로 분화.
2. **Container 껍질** — 적이 용기를 껍질로 두름. Shielder 방패=MagmaCrucible → 파괴 시 magma 분출. 플레이어가 WaterBarrel을 magma 적에 투척 → `water+magma 폭발+굳음`으로 발판화.
3. **반응 캐스케이드** — 적·용기·fluid·타일이 한 화학 그래프 공유. Spark-Sentinel이 water 웅덩이 충전 → 그 안의 모든 적+플레이어+metal 플랫폼 chain 감전(위치 퍼즐).

#### 2.11.5 검증 규칙

- 몬스터 정의/스폰 데이터에 **속성 필드 필수**. 비면 검증 실패(§1.3 제약 5).
- 속성 미지정 시 **테마 자동 바인딩** 값을 적용(폴백). 무속성 폴백 없음.
- 속성과 테마가 상이한 override(예: shadow 테마에 magma 적)는 허용하되 *의도 주석* 권장.

---

## 3. 아키타입 상호작용 매트릭스 (Section 2)

### 3.1. 아키타입 조합 효과 매트릭스

아키타입 2종 조합이 만드는 전술 상황과, 해당 상황에서 빛나는 무기 카테고리.

| 조합 | 전술 상황 | 플레이어 딜레마 | 최적 무기 | 검증 패시브 축 |
|:-----|:---------|:---------------|:---------|:-------------|
| Charger + Sentinel | **탱크-포격** : 근접 추적과 원거리 투사체 동시 압박 | Sentinel을 먼저 처리하면 Charger에 맞고, Charger를 상대하면 투사체에 노출 | Railbow(원거리 우선 처리), Shiv(빠른 접근+회피) | A, F |
| Charger + Shielder | **돌파 장벽** : Shielder가 정면을 막고 Charger가 측면에서 추적 | 배후 돌아가려면 Charger 거리 관리 필요 | Harpoon(관통으로 Shielder 뚫기), Chain(가변 리치로 양쪽 대응) | A, E |
| Swarmer + Sentinel | **포격 하 군집** : 군집이 이동선을 차단하고 Sentinel이 안전 구역을 제거 | AoE로 Swarmer 정리? 이동으로 투사체 회피? 동시 불가 | Cleaver(충격파 AoE), Emitter(원소 광역) | B, D, F |
| Swarmer + Flier | **전방위 압박** : 지상 군집 + 공중 급강하가 수직/수평 동시 위협 | 위를 보면 아래에서 당하고, 아래를 보면 위에서 당함 | Blade(3타 넓은 범위), Chain(가변 리치로 상하 커버) | B, D, F |
| Shielder + Sentinel | **요새** : Shielder가 전면 차단, 뒤에서 Sentinel이 포격 | 정면 돌파 불가. 반드시 측면/상단 우회 필요 | Shiv(Shadow Step 배후), Emitter(후방 Sentinel 처리) | A, F, E |
| Charger + Swarmer | **추격 군집** : Charger가 플레이어를 한 방향으로 몰고 Swarmer가 포위 | 도주하면 Swarmer에 포위. 맞서면 Charger에 압박 | Cleaver(AoE 정리), Harpoon(관통 직선 정리) | D, E, B |
| Charger(급습) + Shooter | **기습-카이팅** : 급습 Charger가 패닉을 만들면 Shooter가 도망치며 사격 | 한쪽을 쫓으면 다른 쪽에 노출. 회복 창 없음 | Blade(빠른 반격), Blink Cut(대시로 거리 압축) | C, A, F |
| Shielder + Bombardier | **요새 포격** : Shielder가 전면을 막는 동안 후방 Bombardier가 발판에 범위 착탄 | 정면은 못 뚫고, 멈춰서 우회하면 착탄에 맞음. 이동하며 우회 필수 | Shiv(배후 침투), Railbow(후방 Bombardier 저격) | F, A, G |
| Charger + Shooter(A-03a) | **추격 카이팅** : Charger가 한 방향으로 몰고 Shooter가 반대로 도망치며 사격 | 한쪽을 쫓으면 다른 쪽에 노출. 두 거리 축을 동시에 못 잡음 | Chain(리치로 Shooter 견제), Blink Cut(대시로 거리 압축) | F, D, E |
| Summoner + Swarmer | **소환 군집** : Summoner가 Swarmer를 지속 생산. 소환사 우선 제거 강제 | 소환사를 두면 군집이 무한 보충. 군집을 뚫고 후방 진입해야 함 | Shiv(후방 침투), Cleaver(군집 AoE) | D, B |

### 3.2. 무기 카테고리 x 아키타입 상성 매트릭스

각 칸은 해당 무기가 해당 아키타입에 대해 갖는 상대적 유불리를 표시한다.

| 무기 \ 아키타입 | Charger | Jumper | Shooter | Bombardier | Shielder | Flier | Swarmer | Summoner | Sentinel |
|:----------------|:-------:|:------:|:-------:|:----------:|:--------:|:-----:|:-------:|:--------:|:--------:|
| **Blade** (3타 콤보) | **강** | 보통 | 약 | 보통 | 보통 | 보통 | 보통 | 보통 | 약 |
| **Cleaver** (2타 충격파) | 보통 | **강** | 약 | 보통 | **강** | 약 | **강** | 보통 | 약 |
| **Shiv** (4타 배후) | **강** | 보통 | **강** | **강** | **강** | 보통 | 약 | **강** | 약 |
| **Harpoon** (관통) | 보통 | 보통 | 보통 | **강** | **강** | 약 | **강** | 보통 | 보통 |
| **Chain** (가변 리치) | 보통 | **강** | **강** | **강** | 보통 | **강** | **강** | 보통 | **강** |
| **Railbow** (원거리 물리) | 약 | 약 | **강** | **강** | 약 | **강** | 보통 | **강** | **강** |
| **Emitter** (원거리 INT) | 약 | **강** | 보통 | **강** | 약 | **강** | **강** | **강** | **강** |

**상성 해설:**
- Charger는 근접 교전이므로 근접 무기(Blade/Shiv)가 유리. 원거리는 사거리 낭비
- Jumper는 궤도 예측이 핵심이므로 광역(Cleaver/Emitter)·리치(Chain)가 유리
- Shooter는 카이팅이므로 거리를 좁히는 빠른 접근(Shiv)·긴 리치(Chain)·원거리 맞불(Railbow)이 유리
- Bombardier는 후방 area-denial이므로 빠른 접근(Shiv)·관통/리치(Harpoon/Chain)·원거리 맞불(Railbow/Emitter)이 유리. 느린 근접(Cleaver)은 접근 전 피격
- Shielder는 배후가 핵심이므로 Shiv(배후 강타)/Harpoon(관통)/Cleaver(충격파 방어 관통)가 유리
- Flier는 공중이므로 리치가 긴 Chain/원거리(Railbow/Emitter)가 유리
- Swarmer는 군집이므로 AoE(Cleaver 충격파, Emitter 원소, Harpoon 관통, Chain 광역)가 유리
- Summoner는 후방 우선 제거 대상이므로 빠른 침투(Shiv)·원거리 저격(Railbow/Emitter)이 유리
- Sentinel은 고정 위치이므로 원거리(Railbow/Emitter/Chain)가 안전하게 처리 가능

---

## 4. 레벨 디자인 구조 (Section 3) : 4x4 Item World Rooms

### 4.1. Room 구성 템플릿

아이템계의 4x4 그리드(16방) 내 방 타입 분포.

| 방 타입 | 비율 | 방 수 (16방 기준) | 역할 |
|:--------|:----:|:-----------------:|:-----|
| Combat (전투) | 50% | 8 | 아키타입 조합 전투 |
| Corridor (통로) | 19% | 3 | 이동+경량 적(Swarmer/단독 Charger) |
| Treasure (보물) | 6% | 1 | 엘리트(A-09) |
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
| **Flat Arena** | 평평한 넓은 공간. 장애물 없음 | Cleaver, Harpoon | Shiv(장애물 부재) | Charger + Swarmer |
| **Vertical Shaft** | 높은 천장. 3-4단 플랫폼 | Railbow, Chain, Emitter | Cleaver(상하 이동 느림) | Flier + Sentinel |
| **Tight Corridor** | 좁고 긴 수평 통로 | Harpoon, Railbow | Cleaver(후딜 위험) | Charger + Shooter |
| **Pillared Hall** | 기둥/장애물 다수. 시야 차단 | Shiv, Chain | Railbow(시야 방해) | Shielder + Summoner |
| **Elevated Perch** | 높은 위치 + 하단 넓은 공간 | Railbow, Emitter | Blade(리치 부족) | Swarmer + Sentinel |
| **Pit Room** | 중앙 함정/구덩이 | Chain, Blade | Harpoon(직선 제한) | Flier + Swarmer |

### 4.4. ASCII Room 레이아웃 예시

#### Flat Arena (평지 전투방)
```
+----------------------------------+
|                                  |
|  ████                    ████    |
|  ████                    ████    |
|                                  |
|          C    C                  |  C = Charger
|                                  |  w = Swarmer
|    w w w                         |
|                                  |
|  ████████████████████████████    |
+----------------------------------+
    넓은 바닥. Cleaver/Harpoon 최적
```

#### Vertical Shaft (수직 구조방)
```
+----------------------------------+
|        F           F             |  F = Flier
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
|    ██    ██    ██    ██          |  S = Shielder
|    ██    ██    ██    ██          |  U = Summoner
|         S                        |
|    ██    ██    ██    ██          |
|    ██  U ██    ██    ██          |
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
|    C         H         C         |  C = Charger
|                                  |  H = Shooter
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

### 5.1. 10 Named Encounter Patterns

각 패턴은 아키타입 조합 + 지형 구조 + 최적 무기 대응을 정의한다.

---

**ENC-01: The Gauntlet (장갑 돌파)**
- **아키타입:** Charger x3 (직선 배치)
- **지형:** Tight Corridor
- **상황:** 좁은 통로 양쪽에서 Charger가 접근. 탈출 불가. 정면 돌파만 가능
- **최적 무기:** Harpoon (관통으로 3체 동시 타격), Blade (3타 피니셔로 순차 처리)
- **검증 패시브 축:** E (콤보 완성 보상), A (첫타 보너스)

---

**ENC-02: Chokepoint (협공점)**
- **아키타입:** Shielder x1 (전면) + Sentinel x2 (후방 양측)
- **지형:** Pillared Hall
- **상황:** Shielder가 전면을 막고 Sentinel이 양쪽 기둥 뒤에서 포격
- **최적 무기:** Shiv (Shadow Step으로 Shielder 배후 + 빠른 Sentinel 처리), Chain (기둥 너머 타격)
- **검증 패시브 축:** A (배후 공격), F (대시/텔레포트 이동)

---

**ENC-03: Swarm Tide (군집 조수)**
- **아키타입:** Swarmer x5 (대규모 군집)
- **지형:** Flat Arena
- **상황:** 넓은 공간에 대량 군집이 사방에서 포위 접근
- **최적 무기:** Cleaver (충격파 AoE), Emitter (원소 확산)
- **검증 패시브 축:** B (On-Hit 연쇄), D (Kill Bonus 스택)

---

**ENC-04: Aerial Swarm (공중 소탕)**
- **아키타입:** Flier x2 + Swarmer x3
- **지형:** Vertical Shaft
- **상황:** Flier가 상공에서 급강하하고 Swarmer가 플랫폼 위를 채움
- **최적 무기:** Chain (가변 리치로 상하 커버), Railbow (공중 Flier 저격)
- **검증 패시브 축:** F (이동/체공), A (공중 적 보너스)

---

**ENC-05: Pincer (양면 협공)**
- **아키타입:** Charger x2 (좌우) + Charger(급습) x1 (중앙)
- **지형:** Flat Arena
- **상황:** 양쪽에서 Charger가 접근하는 동안 중앙에서 급습 변형이 가속 진입
- **최적 무기:** Blade (빠른 반격 + 3타 피니셔), Shiv (기동으로 급습 회피)
- **검증 패시브 축:** C (피격 후 상태 변화), A (카운터 공격)

---

**ENC-06: Fortress (요새)**
- **아키타입:** Shielder x2 (전면 벽) + Sentinel x1 (후방 포격)
- **지형:** Tight Corridor
- **상황:** 좁은 통로에 Shielder 2체가 방벽. 뒤에서 Sentinel 포격. 정면 돌파 불가
- **최적 무기:** Harpoon (관통으로 Shielder 관통 → Sentinel 타격), Emitter (투사체로 후방 처리)
- **검증 패시브 축:** A (방어형 적 보너스), E (관통 콤보)

---

**ENC-07: Summon Engine (소환 기관)**
- **아키타입:** Summoner x1 (후방) + Swarmer x3 (소환물)
- **지형:** Pillared Hall
- **상황:** Summoner가 기둥 뒤에서 Swarmer를 지속 생산. 군집을 뚫고 후방 진입해야 함
- **최적 무기:** Shiv (군집 회피 후방 침투), Cleaver (군집 AoE 정리)
- **검증 패시브 축:** D (우선 처치 보너스), B (군집 On-Hit)

---

**ENC-08: Shield Wall (방패벽)**
- **아키타입:** Shielder x1 + Charger x2 + Swarmer x2
- **지형:** Flat Arena
- **상황:** Shielder가 전면, Charger가 측면 압박, Swarmer가 후방 봉쇄
- **최적 무기:** Cleaver (AoE로 Swarmer + Charger 동시 처리 후 Shielder 단독 상대)
- **검증 패시브 축:** B (On-Hit 다중), D (Kill Bonus 연쇄), E (AoE 콤보)

---

**ENC-09: Turret Maze (포대 미로)**
- **아키타입:** Sentinel x4 (각 코너 배치)
- **지형:** Pillared Hall
- **상황:** 기둥 사이를 이동하며 사방의 투사체를 피해야 함
- **최적 무기:** Shiv (빠른 기동으로 접근), Railbow (원거리 각개격파)
- **검증 패시브 축:** F (이동/대시), C (피격 관리)

---

**ENC-10: The Last Stand (최후의 저항)**
- **아키타입:** Charger x2 + Swarmer x3 + Flier x1 + Bombardier x1
- **지형:** Flat Arena
- **상황:** Deep/Core 지층 최고 난이도방. 4 아키타입 동시(Swarmer 개별 계수 시)
- **최적 무기:** Chain (가변 리치로 전방위 대응), Cleaver (AoE 정리)
- **검증 패시브 축:** 전 축 종합. 특히 D (연속 처치) + F (착탄 회피)

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
| ENC-07 Summon Engine | | ++ | | ++ | | | |
| ENC-08 Shield Wall | | ++ | | ++ | ++ | | |
| ENC-09 Turret Maze | | | ++ | | | ++ | |
| ENC-10 Last Stand | | | | ++ | | ++ | |

> `++` = 해당 축의 패시브가 극대화. G축(Environment/Team)은 조우 패턴보다 아이템계 지층 환경/코옵 상태에 의존하므로 개별 패턴에서 직접 검증되지 않는다. G축은 지층 테마 환경과 코옵 파트너 근접 여부로 검증된다.

### 5.3. 행동 모디파이어 8종 (MOD)

행동 모디파이어는 기존 아키타입 기본 동작에 덧붙이는 변형 레이어다. 아트 자산 추가 없이 행동 변형만으로 체감 다양성을 확보한다. 지층이 깊어질수록 동시 적용 MOD 수가 증가한다 (지층 1: 1개, 지층 2: 2개, 지층 3: 3개).

| MOD ID | 이름 | 효과 | 어울리는 테마 |
| :--- | :--- | :--- | :--- |
| **MOD-01** | 원소 강타 | 근접 공격에 해당 테마 원소 상태이상 추가 | T-FORGE(화), T-NATURE(독), T-ARCANE(뇌) |
| **MOD-02** | 격파 후 폭발 | 격파 시 범위 피해 또는 파티클 방출 | T-FORGE, T-NATURE(포자) |
| **MOD-02b** | 자폭 돌진 | 플레이어 접근 시 자폭. 폭발 범위 피해 | T-FORGE(용광로 정령), T-CRAFT(태엽 쥐) |
| **MOD-03** | 소환 | 격파 직전 또는 주기적 Swarmer 1-3체 방출 | T-TOMB, T-WAR, T-ARCANE |
| **MOD-04** | 방어막 | 일정 HP 이하에서 일시 방어막 활성화 | T-FAITH, T-ARCANE |
| **MOD-05** | 재생 | 격파 후 1회 부활 (저HP로) | T-TOMB |
| **MOD-06** | 광분 (Enrage) | HP 50% 이하에서 속도/ATK 급증 | T-HUNT, T-WAR |
| **MOD-08** | 디버프 부여 | 공격 시 이동속도 감소 등 | T-SHADOW, T-NATURE |

> 구 MOD-07(속박)·MOD-09(패턴 전환)는 보류. 속박은 플레이어 통제권 박탈 리스크로 재검토 대상, 패턴 전환은 Tier 폐기와 함께 보스 위상 전환(§7)으로 이관.

---

## 6. 강도 스케일링 (Section 5) : 지층 × 레어리티

> **Tier 진화(T1~T4) 폐기(2026-06-03).** 같은 아키타입을 4단계로 진화시키던 레이어는 제거됐다. 강도는 아래 수치 계수로만 처리하며, 체감 다양성은 속성 × MOD × 조우 조합이 담당한다.

### 6.1. 스케일링 철학

> **"같은 적이 더 강해지는 것이지, 새로운 적이 나타나는 것이 아니다."**

스케일링은 HP/ATK/DEF 수치 배율로만 이루어진다. 행동 패턴 자체는 변하지 않는다. 깊은 지층의 체감 차이는 (a) 더 높은 수치, (b) 더 많은 동시 적용 MOD(§5.3), (c) 더 복잡한 아키타입 조합(§4.2)에서 나온다.

### 6.2. 최종 스탯 공식

스케일링의 SSoT는 `System_Enemy_AI.md` §2.8 이다. 본 문서는 요약만 싣는다.

```
Final_Enemy_HP  = BaseHP  × HP_Scale_Factor(stratum) × Rarity_Scale(rarity)
Final_Enemy_ATK = BaseATK × ATK_Scale_Factor(stratum) × Rarity_Scale(rarity)
```

| 지층 | HP_Scale | ATK_Scale | | 레어리티 | Rarity_Scale |
|:-----|:--------:|:---------:|:-:|:---------|:-----------:|
| Surface (1) | 1.0 | 1.0 | | Normal | 1.0 |
| Mid (2) | 1.5 | 1.3 | | Magic | 1.2 |
| Deep (3) | 2.5 | 1.8 | | Rare | 1.5 |
| Core/심연 (4) | 4.0 | 2.8 | | Legendary | 2.0 |
| | | | | Ancient | 3.0 |

ATK 스케일이 HP 스케일보다 완만한 이유: HP 증가는 전투 시간(TTK)을 늘려 피로감을 유발하지만, ATK 증가는 회피 실수의 비용을 높여 긴장감을 유지한다. HP 인플레는 야리코미 후기의 최대 재미 훼손 요소다.

---

## 7. 보스 패턴 원칙 (Section 6)

### 7.1. 보스 = 아키타입 매시업 + 위상 전환

아이템계 보스(기억의 문)는 기본 아키타입의 행동을 조합한 존재다. 보스는 새로운 행동 유형을 발명하지 않는다. 대신 2-3개 아키타입의 핵심 행동을 하나의 개체에 통합하고, 위상(Phase) 전환이라는 고유 메커닉을 추가한다.

### 7.2. 보스 등급별 아키타입 구성

| 보스 등급 | 출현 조건 | 아키타입 조합 수 | 위상(Phase) 수 | 패시브 축 검증 깊이 |
|:----------|:---------|:---------------:|:-------------:|:------------------|
| **아이템 장군** (Item General) | Normal-Magic 최종 지층 | 2 아키타입 | 2 위상 | 단일 축 검증 (A or E) |
| **아이템 왕** (Item King) | Rare 최종 지층 | 2-3 아키타입 | 2-3 위상 | 2축 동시 검증 (A+F, B+D 등) |
| **아이템 신** (Item God) | Legendary 최종 지층 | 3 아키타입 | 3 위상 | 3축 동시 검증 |
| **아이템 대신** (Item Great God) | Ancient 심연 지층 | 4+ 아키타입 전환 | 4 위상 | 전 축 종합 검증 |

### 7.3. 보스 설계 원칙

**원칙 1: 아키타입 위상 전환.** 보스는 HP 임계값에 따라 아키타입 행동 모드를 전환한다.

```
예시: 아이템 왕 (Rare 보스)
  Phase 1 (HP 100-60%): Charger 모드 — 직선 추적 + 근접 콤보
  Phase 2 (HP 60-30%):  Sentinel 모드 — 후퇴 + 투사체 연사
  Phase 3 (HP 30-0%):   Charger+Sentinel 동시 — 추적하면서 투사체 발사
```

**원칙 2: 아키타입 약점 계승.** 보스가 특정 아키타입 모드일 때, 해당 아키타입의 약점이 그대로 적용된다.
- Charger 모드: 배후 노출 (A축 검증)
- Sentinel 모드: 이동으로 회피 가능 (F축 검증)
- Shielder 모드: 정면 방어 (관통/배후 필요)
- Flier 모드: 공중 체류 (리치/원거리 필요)

**원칙 3: 처벌 윈도우 보장.** 모든 보스 패턴은 Tell(예고) → Action(행동) → Recovery(경직) 구조를 따르며, Recovery 시간은 최소 500ms를 보장한다. 이 구간이 플레이어의 "무기 패시브가 빛나는 순간"이다.

```
Tell      Action     Recovery
 |           |          |
 v           v          v
[예고 3-6f] [공격 수행] [경직 8-16f = 패시브 검증 윈도우]
```

### 7.4. 보스별 아키타입 구성 예시

#### 아이템 장군 (Item General) — Boss01 확장

```
기본 아키타입: Charger + Sentinel

Phase 1 (HP 100-50%): Charger 주도
  - 직선 추적 → Swipe(근접 스윙)
  - 가끔 후퇴 → 단발 투사체 1회 (Sentinel 전조)

Phase 2 (HP 50-0%): Enrage + Charger-Sentinel 혼합
  - Charge(돌진) 후 정지 → 투사체 3연발
  - Slam(점프 슬램) 착지 시 충격파 + 방사형 투사체 4발
  - Attack Cooldown x0.6

검증 축: A(돌진 후 배후 노출), E(Recovery 윈도우에서 콤보 완성)
```

#### 아이템 왕 (Item King) — 신규

```
기본 아키타입: Shielder + Flier + Sentinel

Phase 1 (HP 100-60%): Shielder 주도 — 전면 방패 전진. 약점: 배후
Phase 2 (HP 60-30%):  Flier 전환 — 비행 + 급강하 x2. 약점: 착지 경직
Phase 3 (HP 30-0%):   Sentinel + Flier 혼합 — 체공 투사체 연사. 약점: 패턴 사이 윈도우

검증 축: A(배후) + F(이동/체공) + B(착지 경직 집중 타격)
```

#### 아이템 신 (Item God) — 신규

```
기본 아키타입: Charger + Shielder + Flier (3 아키타입 순환 전환)

Phase 1 (HP 100-66%): Charger
Phase 2 (HP 66-33%):  Shielder
Phase 3 (HP 33-0%):   Flier + 이전 Phase 패턴 랜덤 삽입

각 Phase 전환 시 rage_transition 연출(3f 무적 + 팔레트 전환)
검증 축: A+E+F (전환 패턴 읽기 + 즉시 대응)
```

#### 아이템 대신 (Item Great God) — 신규 (Ancient 심연 전용)

```
기본 아키타입: 다수 아키타입 행동을 Phase별로 전환

Phase 1: Charger + Swarmer (추적 + 소환물)
Phase 2: Shielder + Sentinel (방어 + 포격)
Phase 3: Flier + Bombardier (비행 + 범위 착탄)
Phase 4 (HP 10%): 전 Phase 패턴 무작위 혼합 + Attack Cooldown 최소

화면 절반 이상 차지하는 대형 보스
야리코미 최종 도전 목표. 전 축 종합 검증
```

---

## 8. 구현 우선순위

| Phase | 구현 대상 | 근거 |
|:------|:---------|:-----|
| Phase 1 | A-01 Charger, A-02 Jumper, A-03a Shooter, A-05 Flier, A-06 Swarmer + 기억 단편 1종 | 기존 Skeleton/Slime/Ghost + Spark Bat/Cinder Imp 매핑. 비행·군집 포함 핵심 루프 검증 |
| Phase 2 | A-03b Bombardier, A-04 Shielder, A-10 Sentinel, A-01 급습 변형 | 범위 포격/배후/고정 포대 축 추가. 7 무기 카테고리 전체 상성 검증 |
| Phase 3 | A-08 Summoner, 아이템 왕/신 보스 | 우선순위 판단 + 심층 지층 + 높은 레어리티 콘텐츠 |
| Phase 4 | 아이템 대신, 시즌 이벤트 변형, 코옵 전용 조우 패턴 | 장기 운영 |

---

## 9. 엣지 케이스 및 제약

| 케이스 | 처리 방침 |
|:-------|:---------|
| 같은 방에 Shielder 2체 이상 | 허용. 단, Tight Corridor에서는 1체 제한 (측면 우회 불가능 방지) |
| Summoner가 보스방에 배치 | 금지. 보스방은 보스 단독 |
| Swarmer 개체 수가 방 최대 적 수를 초과 | Swarmer는 개별 카운트에서 제외. "Swarmer 1세트 = 적 1카운트"로 계산 |
| Bombardier 착탄 마커가 좁은 발판 전체를 덮음 | 마커 반경 캡 적용. 발판 폭의 70%를 초과하지 않음 (회피 경로 보장) |
| 원거리 무기만 보유한 플레이어 vs Charger 급습 | 급습 가속 구간을 시각 Tell로 보장. 원거리로도 가속 중 반격 가능 |
| 코옵 시 적 스탯 스케일링 | 기존 규칙 유지: HP x(1 + 0.5 x (playerCount - 1)) |

---

## 10. 의존성 (Dependencies)

| 방향 | 시스템 | 계약 |
|:-----|:-------|:-----|
| 읽음 | `System_Enemy_AI.md` | FSM, 반경 감지, 지층/레어리티 스케일링 공식(SSoT) |
| 읽음 | `System_Combat_Weapons.md` | 7 무기 카테고리, 시그니처 메커닉, 히트박스 |
| 읽음 | `WeaponDiversity_300Weapons_Research.md` | 7축 패시브 프레임워크 |
| 읽음 | `System_ItemWorld_FloorGen.md` | 4x4 Room Grid, 방 타입, 지층 구조 |
| 읽음 | `Design_ChemicalReactions_FullMatrix.md` | 속성(fluid) 화학 반응 |
| 쓰기 | `System_Enemy_Spawning.md` | 스폰 규칙, 아키타입 가중치 선택 |
| 쓰기 | `Sheets/Content_Stats_Enemy.csv` | 아키타입별 기본 스탯 + 속성 컬럼 |
