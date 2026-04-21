# 적 NPC 디자인 패턴 통합 리서치 — 슈터 패턴 + 횡스크롤 아키타입

> **작성일:** 2026-04-22
> **목적:** Rivera et al.(2012)의 슈터 장르 적 NPC 디자인 패턴을 분석하고, 기존 ECHORIS 아키타입 체계(9종)와 통합하여 설계 언어를 강화한다.
> **논문 출처:** Rivera, G., Hullett, K., Whitehead, J. "Enemy NPC Design Patterns in Shooter Games." DPG 2012, ACM. DOI: 10.1145/2427116.2427122
> **기존 문서:** `EnemyDesign_MobArchetype_Research.md` — 9대 아키타입 + 조우 매트릭스 + 테마 매핑

---

## 1. 논문 핵심 분석

### 1.1 논문 개요

Rivera et al.은 싱글 플레이어 슈터 게임에서 적 NPC가 플레이어 행동에 미치는 영향을 체계적으로 분류하여 **디자인 패턴 언어(Design Pattern Language)**를 제안했다. Christopher Alexander의 건축 패턴 언어(1977)와 GoF의 소프트웨어 디자인 패턴(1994)의 계보를 게임 전투 설계에 적용한 것이다.

### 1.2 NPC 구성 요소 (Elements of a NPC)

논문이 정의한 적 NPC의 7가지 구성 축:

| 요소 | 설명 | 범위 |
|:-----|:-----|:-----|
| **Movement Type** | 전투 중 이동 방식 | Flanking Intensive / Passive / Slow Push / Rush / Cautious |
| **Movement Range** | 교전 중 이동 범위 | Low / Medium / High |
| **Movement Frequency** | 위치 변경 빈도 | Low / Medium / High |
| **Attack Frequency** | 공격 개시 빈도 | Low / Medium / High |
| **Weapon Type** | 무기 유형 | Sniping / Close Blast / Assault / Projectile / Power / Melee |
| **Weapon Damage** | 피해량 수준 | Low / Medium / High |
| **Armor/Health** | 내구도 | Low / Medium / High |

**Motive (동기)** — NPC가 조우에서 유발하는 3가지 효과:
- **Challenge (도전)** — 전투 난이도
- **Tension (긴장)** — 플레이어 심리적 압박
- **Pacing (페이싱)** — 플레이어 이동 속도/방향 유도

### 1.3 4대 베이스 패턴 + 9개 서브 패턴

```
Soldier ─── Grunt          : 약한 원거리. 자신감 부여. 전진 유도
         ├── Elite         : 강화된 Grunt. 도전 증가
         ├── Grenadier     : 투사체 폭발. 엄폐 포기 강제. 페이싱 가속
         └── Sniper        : 초장거리. 이동 경로 통제

Aggressor ── Suicide       : 자폭형. 즉사 위험. 긴장 극대화
           ├── Swarm       : 대량 약체. 자원 소비 강제
           └── Berserker   : 고속 돌진. 고데미지. 즉각 대응 강제

Carrier ──── Sacrifice     : 사망 시 소환. 처치 타이밍 딜레마
           └── Summoner    : 생존 중 지속 소환. 우선 제거 강제

Tank ─────── Turret        : 고정 고화력. 전진 차단. 긴장+도전 극대화
           └── Shield      : 방향성 방어. 우회 강제. 페이싱 변경
```

---

## 2. 슈터 패턴 상세 분석 + ECHORIS 적용

### 2.1 Soldier 패턴 — "공간을 통제하는 자"

> **핵심 기능:** 사용 가능한 공간을 제어하여 플레이어의 이동 경로를 결정한다. 전체 조우의 다수를 구성하는 기본 유닛.

#### 2.1.1 Grunt (잡졸)

| 요소 | 값 |
|:-----|:---|
| Movement Type | Slow Push / Flanking Intensive / Cautious |
| Movement Range | Medium |
| Movement Frequency | Medium |
| Attack Frequency | Low-Medium |
| Weapon Damage | Low-Medium |
| Armor | Low |
| **Motive** | **Low Tension, Low Challenge** |

**설계 의도:** 플레이어의 자신감을 증가시키고, 전진을 유도한다. Halo의 Grunt는 특정 복도에 배치되어 "이 경로가 올바른 방향"임을 시그널링한다. Half-Life 2의 Metro Police는 Cautious에서 Slow Push로 전환하여 플레이어를 밀어낸다.

**특수 관계:** Grunt → Suicide 패턴으로 전환 가능 (Halo Grunt의 자폭 모드)

**ECHORIS 대응:** 기존 A-01(근접 돌격형/Charger)과 유사하지만, Grunt는 원거리 무기 기반이라는 점이 다르다. ECHORIS에서는 A-01과 A-03(원거리 사격형)이 Grunt의 역할을 분담한다.

#### 2.1.2 Grenadier (척탄병)

| 요소 | 값 |
|:-----|:---|
| Movement Type | Passive / Slow Push / Cautious |
| Movement Range | Medium |
| Movement Frequency | Low |
| Attack Frequency | Medium |
| Weapon Type | Projectile (폭발) |
| Armor | Low-Medium |
| **Motive** | **High Tension, High Challenge** |

**설계 의도:** Grunt의 정반대. 폭발물로 플레이어의 현재 위치를 불안정하게 만들어 이동을 강제한다. Gears of War의 Boomer는 폭발 스플래시로 엄폐 포기를 강제한다. Uncharted 2의 로켓 병사는 원거리에서 고데미지 투사체로 페이싱을 가속한다.

**ECHORIS 적용 — 신규 인사이트:**
기존 A-03(원거리 사격형)은 직선 투사체만 고려했다. **범위 투사체(Area Projectile)** 서브타입을 추가하면 "플레이어를 현재 플랫폼에서 몰아내는" Grenadier 역할을 횡스크롤에서 구현할 수 있다.

> **제안: A-03을 A-03a(직선 사격) / A-03b(범위 포격)로 분리**

#### 2.1.3 Sniper (저격수) — 논문에 명시, 상세 미수록

**설계 의도:** 극장거리에서 고정 위치 사격. 플레이어의 이동 경로를 한 축으로 제한. 시야선(Line of Sight) 관리를 강제.

**ECHORIS 적용:** 횡스크롤에서는 "화면 끝에서 사격하는 고정 적"으로 변환. 기존 체계에는 없는 패턴. 세이브 포인트 방어 배치 또는 보스 전실 압박에 적합.

> **제안: 고정 사격형(Sentinel) — 기존 9종에 없는 신규 후보**

---

### 2.2 Aggressor 패턴 — "거리를 제거하는 자"

> **핵심 기능:** 즉시 거리를 좁혀 근접/폭발 공격. 도전과 긴장을 급격히 증가시킨다.
> **공통 요소:** Rush 이동, High 이동 범위/빈도/공격 빈도, Melee 또는 Close Blast.

#### 2.2.1 Berserker (광전사)

| 요소 | 값 |
|:-----|:---|
| Movement Type | Rush |
| Movement Range | High |
| Movement Frequency | High |
| Attack Frequency | High |
| Weapon Type | Melee |
| Weapon Damage | **High** |
| Armor | Any |
| **Motive** | **High Challenge** |

**설계 의도:** 고속 돌진 + 고데미지. 즉각 대응을 강제한다. Borderlands의 Psycho는 전장 어디서든 직선 돌진. Gears of War의 Butcher는 느리지만 클리버로 고데미지. 두 경우 모두 **시각적 존재감이 크고, 플레이어가 가장 먼저 처리하게 만드는 것이 핵심.**

**ECHORIS 대응:** 기존 A-01(근접 돌격형/Charger)과 거의 일치. 단, 논문이 강조하는 핵심은 **"즉각 우선 처리 강제"**라는 점. A-01의 행동 모디파이어 MOD-06(Enrage)이 Berserker 서브패턴의 역할을 수행한다.

#### 2.2.2 Suicide (자폭형) — 논문에 명시, 상세 미수록

**설계 의도:** 접근 시 폭발하여 범위 피해. 단일 대상 위협이 아닌 공간 위협. Dead Space의 Exploder 유형.

**ECHORIS 적용:** 기존 체계에 없는 패턴. 아이템계 T-FORGE(단조) 테마의 "용광로 불꽃 정령"이 자폭형으로 설계 가능.

> **제안: A-01에 Suicide 서브패턴 추가 — MOD-02(격파 후 폭발)와 연동**

#### 2.2.3 Swarm (군집형)

**설계 의도:** 대량의 약한 개체가 자원을 소비시킨다.

**ECHORIS 대응:** 기존 A-06(군집형/Swarmer)과 정확히 일치. 추가 인사이트 없음.

---

### 2.3 Carrier 패턴 — "적을 만드는 자"

> **핵심 기능:** 전투 중 추가 NPC를 소환하여 긴장을 증가시킨다. 처치 시기가 전략적 판단의 핵심.
> **공통 요소:** High 이동 범위/빈도, Low Armor (빠르게 제거되도록 설계).

#### 2.3.1 Sacrifice (희생형)

| 요소 | 값 |
|:-----|:---|
| Movement Type | Rush |
| Attack Frequency | High |
| Weapon Type | Projectile |
| Armor | Low |
| **Motive** | **High Tension** |

**설계 의도:** 사망 시 주변에 적을 소환한다. 처치 자체가 새로운 위협을 만드는 딜레마. Dead Space의 Pregnant Necromorph는 사망 시 Swarm을 방출. Halo의 Carrier Flood는 근접 폭발 + 소환을 동시에 수행.

**ECHORIS 적용 — 핵심 인사이트:**
기존 체계에 **"사망 시 소환" 패턴이 완전히 부재**했다. 이것은 아이템계 T-TOMB(죽음) 테마와 자연스럽게 연결된다: "해골 병사가 격파되면 좀비 군집이 튀어나온다."

> **제안: MOD-03(소환)을 "사망 시 소환(Sacrifice)"과 "생존 중 소환(Summoner)"으로 분리**
> - MOD-03a: Death Spawn — 격파 시 A-06(군집형) 2-3마리 소환
> - MOD-03b: Live Spawn — 일정 주기(10초)마다 A-01 또는 A-06 1마리 소환

#### 2.3.2 Summoner (소환사) — 논문에 명시, 상세 미수록

**설계 의도:** 생존 중 지속적으로 적을 소환. "우선 제거" 판단을 가장 강하게 강제하는 패턴.

**ECHORIS 대응:** 기존 A-08(지원/버퍼형)이 "다른 적 강화"를 담당하지만, "적 소환"은 별도 역할. A-08을 A-08a(Buffer) / A-08b(Summoner)로 분리하거나, A-08에 Summoner 서브 역할을 추가한다.

---

### 2.4 Tank 패턴 — "진행을 차단하는 자"

> **핵심 기능:** 높은 내구도로 진행을 지연시킨다. 긴장과 도전을 동시에 올린다.
> **핵심 특징:** 대량의 Armor/Health.

#### 2.4.1 Turret (포탑형)

| 요소 | 값 |
|:-----|:---|
| Movement Type | Passive |
| Movement Range | High (사거리) |
| Movement Frequency | Low |
| Attack Frequency | High |
| Weapon Type | Power Weapon |
| Weapon Damage | **Very High** |
| Armor | **Very High** |
| **Motive** | **High Tension, High Challenge, Medium Pacing** |

**설계 의도:** 거의 움직이지 않지만 초고화력. 제거하기 어렵고 무시할 수 없다. Halo의 Hunter는 원거리 빔 + 근접 방패 타격을 전환하며 쌍으로 등장(약점 커버). CoD의 Juggernaut는 중장갑 + 중화기로 순수 화력으로 압도.

**특수 관계:** Turret → Berserker 전환 가능 (Hunter가 거리 좁히면 근접 모드)

**ECHORIS 적용:**
기존 체계에 "고정 고화력형"이 없었다. A-04(방어/방패형)는 이동하는 방어체이고, 논문의 Turret는 고정 공격체. 역할이 상이하다.

> **제안: A-10(고정 포대형/Turret) 신규 추가 — SotN의 Bone Pillar에 해당**
> 기존 A-04 체계는 유지. Turret는 아이템계 T-WAR(전쟁), T-CRAFT(공예) 테마에서 "부서진 전쟁 기계", "정밀 기계 인형"으로 구현.

#### 2.4.2 Shield (방패형)

| 요소 | 값 |
|:-----|:---|
| Movement Type | Slow Push |
| Movement Range | High |
| Movement Frequency | Medium |
| Armor | **High (한 방향만)** |
| **Motive** | **Medium Challenge, High Tension, High Pacing** |

**설계 의도:** 전방 완전 방어 + 느린 전진. 플레이어가 전략을 재고하고 측면을 찾도록 강제. Halo의 Jackal은 에너지 방패 뒤에서 사격. Uncharted 2의 Turtle은 방패 뒤에서 전진하되 사격받을수록 느려진다.

**논문의 핵심 분석 — 조합 시너지:**
Halo Reach의 Winter Contingency 레벨 분석에서, Grunt(약한 적) + Shield(방패 적)의 조합이 핵심 사례로 제시됨. Shield가 정면을 차단하면, 플레이어는 Grunt가 있는 측면 경로로 유도된다. **Grunt가 "안전한 경로 시그널"로 기능하는 것.**

**ECHORIS 대응:** 기존 A-04(방어/방패형)와 정확히 일치. 논문이 추가로 제공하는 인사이트는 **Shield + Grunt 조합의 "경로 유도" 기능**이며, 이를 기존 조우 매트릭스(3-1)에 반영해야 한다.

---

## 3. 통합 분류 체계 — ECHORIS 확장판

### 3.1 논문 패턴 → 기존 아키타입 매핑

| Rivera et al. 패턴 | 기존 ECHORIS 아키타입 | 매핑 상태 | 비고 |
|:-------------------|:---------------------|:---------|:-----|
| Soldier > Grunt | A-01 + A-03 분담 | 부분 일치 | 슈터의 Grunt는 원거리 기반. ECHORIS는 근접/원거리 분리 |
| Soldier > Elite | A-09 (엘리트형) | 일치 | 강화된 Grunt |
| Soldier > Grenadier | **A-03b (신규)** | **부재 → 추가** | 범위 투사체로 위치 강제 |
| Soldier > Sniper | **A-10 후보** | **부재** | 고정 초장거리 사격 |
| Aggressor > Berserker | A-01 + MOD-06 | 일치 | Enrage 모디파이어가 Berserker 역할 |
| Aggressor > Suicide | A-01 + MOD-02 | 부분 일치 | **격파 후 폭발을 자폭 돌진으로 확장 필요** |
| Aggressor > Swarm | A-06 (군집형) | 일치 | |
| Carrier > Sacrifice | **MOD-03a (신규)** | **부재 → 추가** | 사망 시 소환 |
| Carrier > Summoner | **A-08b (신규)** | **부재 → 추가** | 생존 중 지속 소환 |
| Tank > Turret | **A-10 (신규 제안)** | **부재 → 추가** | 고정 고화력 |
| Tank > Shield | A-04 (방어/방패형) | 일치 | |

### 3.2 통합 아키타입 체계 (9종 → 11종)

| ID | 아키타입명 | Rivera 대응 | 위협 축 | 신규 여부 |
|:---|:----------|:-----------|:-------|:---------|
| A-01 | 근접 돌격형 (Charger) | Aggressor > Berserker | 거리 압박 | 기존 |
| A-02 | 점프/바운스형 (Jumper) | -- | 불규칙 궤도 | 기존 |
| A-03a | 직선 사격형 (Shooter) | Soldier > Grunt | 수평 공간 지배 | 기존 분리 |
| **A-03b** | **범위 포격형 (Bombardier)** | **Soldier > Grenadier** | **위치 강제/엄폐 파괴** | **신규** |
| A-04 | 방어/방패형 (Shielder) | Tank > Shield | 정면 무효화 | 기존 |
| A-05 | 비행/공중형 (Flier) | -- | 수직 공간 활성화 | 기존 |
| A-06 | 군집형 (Swarmer) | Aggressor > Swarm | 다수 압도 | 기존 |
| A-07 | 앰부시형 (Ambusher) | -- | 서프라이즈 | 기존 |
| A-08 | 지원형 (Buffer/Summoner) | Carrier > Summoner | 전장 증폭 | 기존 확장 |
| A-09 | 엘리트형 (Elite) | Soldier > Elite | 다층 위협 | 기존 |
| **A-10** | **고정 포대형 (Sentinel)** | **Tank > Turret** | **고정 고화력 / 경로 차단** | **신규** |

### 3.3 행동 모디파이어 확장 (8종 → 11종)

| ID | 이름 | 효과 | Rivera 대응 | 신규 여부 |
|:---|:-----|:-----|:-----------|:---------|
| MOD-01 | 원소 강타 | 근접 공격 + 원소 상태이상 | -- | 기존 |
| MOD-02 | 격파 후 폭발 | 격파 시 범위 피해 | Aggressor > Suicide | 기존 |
| **MOD-02b** | **자폭 돌진** | **플레이어 접근 시 자폭 (Suicide Rush)** | **Aggressor > Suicide** | **신규** |
| MOD-03a | 사망 시 소환 | 격파 시 A-06 2-3마리 방출 | **Carrier > Sacrifice** | **기존 분리** |
| **MOD-03b** | **생존 중 소환** | **10초 주기 A-01/A-06 1마리 소환** | **Carrier > Summoner** | **신규** |
| MOD-04 | 방어막 | HP 이하 시 일시 방어막 | -- | 기존 |
| MOD-05 | 재생 | 격파 후 1회 부활 | -- | 기존 |
| MOD-06 | 광분 (Enrage) | HP 50% 이하 시 속도/ATK 급증 | Aggressor > Berserker | 기존 |
| MOD-07 | 속박 | 투사체 명중 시 일시 속박 | -- | 기존 |
| MOD-08 | 디버프 부여 | 시야 감소/이동속도 감소 | -- | 기존 |
| **MOD-09** | **패턴 전환** | **조건부 다른 패턴으로 전환** | **Grunt→Suicide, Turret→Berserker** | **신규** |

---

## 4. 논문의 NPC 요소 체계 → ECHORIS 적용

### 4.1 Motive 3축의 횡스크롤 재해석

논문의 Challenge/Tension/Pacing 3축은 슈터에서 3D 공간 이동을 전제한다. 횡스크롤에서는 다음과 같이 변환된다:

| 슈터 Motive | 횡스크롤 변환 | ECHORIS 적용 |
|:-----------|:-----------|:-----------|
| **Challenge** (도전) | 공격 패턴 복잡도 + 피해량 | 아키타입 복잡도 등급 (1-4) |
| **Tension** (긴장) | 처치 우선순위 판단 + 시간 압박 | Carrier/Summoner가 핵심 긴장 요소 |
| **Pacing** (페이싱) | 수평 이동 속도 + 수직 활용도 | A-03b(범위 포격)가 플랫폼 이동 강제 |

### 4.2 Movement Type의 횡스크롤 변환

| 슈터 Movement Type | 횡스크롤 변환 | 해당 아키타입 |
|:-------------------|:-----------|:------------|
| **Flanking Intensive** | 플레이어 뒤로 점프/벽 타기 이동 | A-07(앰부시형) |
| **Passive** | 고정 위치 + 사거리 내 사격 | A-10(고정 포대형) |
| **Slow Push** | 직선 전진, 방패 유지 | A-04(방패형), A-01(돌격형) |
| **Rush** | 고속 직선 돌진 | A-01 + MOD-06(광분) |
| **Cautious** | 플레이어와 일정 거리 유지, 도주 포함 | A-03a(사격형), 야생 이노센트 |

**핵심 인사이트:** 논문의 Cautious 이동 유형은 ECHORIS의 **야생 이노센트 도주 AI**와 구조적으로 동일하다. 이노센트가 "플레이어와 거리를 유지하며 도주하는 것"은 Cautious movement의 극단적 형태다.

### 4.3 NPC Relationships — 패턴 전환 시스템

논문이 강조한 핵심 개념: **NPC가 조건에 따라 다른 패턴으로 전환**한다.

| 전환 사례 | 출발 패턴 | 도착 패턴 | 조건 |
|:---------|:---------|:---------|:-----|
| Halo Grunt | Grunt (Soldier) | Suicide (Aggressor) | 절박 상태 (HP 낮음 / 리더 사망) |
| Halo Hunter | Turret (Tank) | Berserker (Aggressor) | 거리 좁혀짐 |
| 논문 제안 | 신규 패턴 | -- | Cautious + 고데미지 + 저체력 = "고긴장 저도전" |

**ECHORIS 적용 — MOD-09(패턴 전환):**

| ECHORIS 전환 | 출발 | 도착 | 조건 | 테마 |
|:------------|:-----|:-----|:-----|:-----|
| 방패 기사 → 광전사 | A-04(Shielder) | A-01+MOD-06 | 방패 파괴 시 | T-WAR, T-FAITH |
| 포대 → 자폭 | A-10(Sentinel) | A-01+MOD-02b | HP 25% 이하 | T-FORGE, T-CRAFT |
| 사격수 → 도주 | A-03a(Shooter) | Cautious(도주) | HP 50% 이하 | T-SHADOW |
| Grunt → Summoner | A-01(Charger) | A-08b+MOD-03b | 동료 3마리 이상 사망 | T-TOMB |

---

## 5. 조우 구성 매트릭스 보강

### 5.1 논문의 조합 분석 사례 — Winter Contingency

논문이 분석한 Halo Reach 조우:

```
[Arena]
  Jackal(Shield) x3 — 정면 경로 차단
  Grunt x5 — 측면 경로에 배치 → "안전한 경로" 시그널

플레이어 행동:
  1. 정면의 Shield NPC를 인지 → "정면은 위험하다"
  2. 측면의 Grunt를 발견 → "이쪽이 쉽다" → 측면 이동
  3. 측면에서 Shield NPC의 약점(후방)을 공격
  4. 결과: 낮은 도전 + 높은 긴장 = 만족스러운 조우
```

### 5.2 ECHORIS 아이템계 적용 — 패턴 조합으로 경로 유도

```
[4x4 방, 플랫폼 3단]

  상단: A-10(Sentinel) x1 — 하단 향해 고화력 사격. 상단 접근 차단
  중단: A-04(Shielder) x1 — 좌→우 Slow Push. 정면 경로 차단
  하단: A-01(Charger) x2 — 좌측에 배치. "안전한 경로" 시그널

플레이어 행동:
  1. A-10의 사격 인지 → "상단 직접 접근은 위험"
  2. A-04의 전진 인지 → "정면 돌파 어려움"
  3. 하단 A-01 처리 → 하단 경로 확보
  4. 하단에서 A-04 후방 공격 → 방패 무력화
  5. A-10을 아래에서 공격 (사각 공략)
```

### 5.3 기존 조우 매트릭스에 신규 패턴 통합

| 조합 | 조합명 | 생성되는 전술 상황 | 권장 지층 |
|:-----|:-------|:----------------|:---------|
| A-10 + A-01 | **포대-돌격** | Sentinel이 공간을 차단하고, Charger가 회피 경로에서 압박 | 지층 2 |
| A-03b + A-04 | **포격-방패** | Bombardier가 위치 이탈을 강제하고, Shielder가 이탈 경로를 차단 | 지층 2 후반 |
| A-08b + A-06 | **소환-군집** | Summoner가 Swarmer를 지속 생산. 소환사 우선 제거 강제 | 지층 3 |
| A-10 + A-03b + A-01 | **삼축 차단** | 고정 포대 + 범위 포격 + 돌격이 모든 도피 경로를 봉쇄 | 지층 3 엘리트방 |
| A-04 + A-01(MOD-09) | **방패-전환** | Shielder 뒤의 Charger가 동료 사망 시 Summoner로 전환. 우선순위 급변 | 지층 3 |

---

## 6. 논문 프레임워크의 한계와 ECHORIS 보강

### 6.1 논문의 한계

| 한계 | 설명 | ECHORIS에서의 보강 |
|:-----|:-----|:------------------|
| **3D 슈터 전제** | 엄폐 시스템, 3D 측면 공격 전제 | 횡스크롤 2D에서는 플랫폼 활용, 수직축이 핵심 |
| **비행/공중형 미다룸** | Flier 아키타입 완전 부재 | 기존 A-05(비행형)으로 보강 완료 |
| **점프/바운스형 미다룸** | 포물선 이동 적 없음 | 기존 A-02(점프형)으로 보강 완료 |
| **앰부시형 미다룸** | 은신→급습 패턴 없음 | 기존 A-07(앰부시형)으로 보강 완료 |
| **환경 상호작용 미다룸** | 적-함정 상호작용 없음 | 기존 Spelunky 분석으로 보강 완료 |
| **스케일링 미다룸** | 수치/행동 스케일링 체계 없음 | 기존 3-축 스케일링 모델로 보강 완료 |
| **테마-적 매핑 미다룸** | 비주얼/내러티브 연결 없음 | 기존 10개 테마 매핑으로 보강 완료 |

### 6.2 논문이 ECHORIS에 제공한 신규 인사이트 (5건)

1. **범위 포격형(A-03b/Bombardier)** — 플랫폼 이탈을 강제하는 전용 아키타입. 기존 직선 사격형(A-03a)과 분리 필요
2. **고정 포대형(A-10/Sentinel)** — 이동하지 않는 고화력 적. SotN Bone Pillar의 학술적 정당화
3. **사망 시 소환(MOD-03a/Sacrifice)** — 처치 자체가 위험을 만드는 딜레마. 기존 MOD-03을 분리
4. **패턴 전환(MOD-09)** — HP/상황에 따라 아키타입이 바뀌는 동적 적. 조우 복잡도 비용 없이 다양성 증가
5. **Motive 3축(Challenge/Tension/Pacing)** — 각 아키타입의 설계 목적을 3축으로 명시. 조합 설계 시 "어떤 감정을 만들 것인가"를 정량화

---

## 7. Phase별 통합 로드맵 갱신

| Phase | 추가 아키타입 | 추가 모디파이어 |
|:------|:-----------|:-------------|
| Phase 1 | A-01, A-02, A-03a, A-05, A-06, A-09 + 이노센트 | MOD-01, MOD-06 |
| **Phase 2** | **A-03b(범위 포격), A-04, A-07, A-10(고정 포대)** | **MOD-02b(자폭), MOD-03a/b(소환 분리), MOD-09(전환)** |
| Phase 3 | A-08(지원/소환 통합) + 멀티 특화 조합 | MOD-04, MOD-05, MOD-07, MOD-08 |

---

## 8. 교훈 요약

1. **적은 "행동 패턴의 조합"이다.** Rivera et al.의 7요소 프레임워크(Movement Type/Range/Frequency, Attack Frequency, Weapon Type/Damage, Armor)는 기존 ECHORIS의 "위협 축" 분류를 더욱 정밀하게 분해할 수 있는 도구를 제공한다.

2. **Motive(동기) 3축은 조우 설계의 목적 함수다.** 각 아키타입이 Challenge/Tension/Pacing 중 무엇을 올리는지 명시하면, 조합 설계가 "감정 설계"로 전환된다. "이 방에서 플레이어가 느낄 감정"을 먼저 정하고, 그에 맞는 패턴 조합을 선택한다.

3. **패턴 전환(MOD-09)은 적은 아트 자산으로 체감 다양성을 극대화한다.** 하나의 적 스프라이트가 HP 조건에 따라 A-04(방패) → A-01+MOD-06(광전사)로 전환되면, 1종 에셋이 2종 적 역할을 수행한다.

4. **Sacrifice(사망 시 소환)는 아이템계 절차적 생성과 시너지가 높다.** 절차적으로 배치된 A-01이 사망 시 A-06을 소환하면, 고정된 조우 스크립팅 없이도 동적 조우 에스컬레이션이 발생한다.

5. **범위 포격형(A-03b)은 횡스크롤 플랫포머에서 "수직 이동 강제" 역할을 한다.** 슈터의 Grenadier가 "엄폐 이탈"을 강제하듯, 횡스크롤에서는 "현재 플랫폼 이탈"을 강제하여 수직 공간 활용도를 올린다.

---

## Sources

### 학술 논문
- Rivera, G., Hullett, K., Whitehead, J. "Enemy NPC Design Patterns in Shooter Games." DPG 2012, ACM. DOI: 10.1145/2427116.2427122
- Alexander, C. "A Pattern Language." Oxford University Press, 1977.
- Gamma, E., Helm, R., Johnson, R., Vlissides, J. "Design Patterns: Elements of Reusable Object-Oriented Software." Addison-Wesley, 1994.
- Bjork, S., Holopainen, J. "Patterns in Game Design." Charles River Media, 2004.
- Hullett, K., Whitehead, J. "Design Patterns in FPS Levels." Foundations of Digital Games (FDG), 2010.

### 내부 참조 문서
- `Documents/Research/EnemyDesign_MobArchetype_Research.md` — 기존 9종 아키타입 체계
- `Documents/Research/BossDesign_SideScrolling_Research.md` — 보스 패턴 6분류
- `Documents/System/System_Enemy_AI.md` — 적 AI FSM
- `Documents/System/System_ItemWorld_FloorGen.md` — 아이템계 지층 생성
