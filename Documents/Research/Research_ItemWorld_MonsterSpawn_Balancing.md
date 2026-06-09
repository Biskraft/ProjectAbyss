# 아이템계 몬스터 스폰 & 밸런싱 리서치 (Item World Monster Spawn & Balancing)

> **문서 ID:** RES-IWS-01
> **작성일:** 2026-06-09
> **문서 상태:** Research (설계 입력)
> **준거 상위:** 본격 제작 스테이지 (Phase 2)
> **2-Space:** Item World (전용)
> **설계 의도:** 로그라이크 / Diablo 3 Greater Rift / Diablo 4 Pit·Nightmare·Monster Family 의 절차적 몬스터 생성·밸런싱을 전수 조사하고, ECHORIS 아이템계에 적용할 **2축 분리 스폰 모델**을 도출한다. 핵심 요구: (a) 레어리티별 차등, (b) 무기 종류별 차등, (c) **같은 NORMAL 등급이라도 무기에 따라 다른 몬스터가 나오게** 한다.
> **선행 코드 접지:** `Sheets/Content_ItemWorld_SpawnTable.csv`, `game/src/data/StrataConfig.ts`, `game/src/scenes/itemworld/ItemWorldEnemyEncounterRuntime.ts`, `game/src/level/RoomGraph.ts`, `Documents/System/System_Enemy_MonsterArchetype.md`(SYS-ENM-ARC, 11종 아키타입).

---

## 0. 요약 (TL;DR)

1. **Diablo 계열의 핵심은 "두 축의 분리"다.** 강도(intensity)는 레어리티/깊이가, 정체성(identity)은 몬스터 패밀리/세트가 담당한다. 두 축이 직교하므로 "같은 강도, 다른 얼굴"이 자연히 나온다 — 이것이 사용자 요구 (c)의 정확한 산업 표준 해법이다.
2. **밀도 우선(density-first).** Greater Rift의 1순위 변수는 몬스터 밀도다. 강한 적 소수보다 적당한 적 다수가 핵앤슬래시 손맛·진행감을 만든다. 현재 ECHORIS의 "방당 단일 종 2~4마리"는 밀도·다양성 양쪽에서 미달이다.
3. **단일 아키타입 금지 — 기능 보완 조성.** D4 몬스터 패밀리는 한 조우에 스워머+레인지+리테넌트를 섞어 전술 레이어를 만든다. 방은 단일 종이 아니라 **기능 예산(role budget)** 으로 채워야 한다.
4. **보장 + 변동(guarantee + fishing).** Greater Rift는 변동(rift fishing)으로 리플레이성을, 밀도 하한으로 최소 품질을 동시에 보장한다. ECHORIS는 지층 예산 하한(보장)과 패밀리/조성 변주(변동)를 함께 둔다.
5. **ECHORIS는 이미 절반을 갖고 있다.** 5기질(forge/iron/rust/spark/shadow) → fluid 속성 → 무기 아키타입 매핑이 존재한다. 이 5기질을 **5개 몬스터 패밀리(권속)** 로 승격하면 "정체성 축"이 완성된다. 무기의 주색이 패밀리를, 무기 종류가 기능 조성 편향을 결정한다.

---

## 1. 레퍼런스 전수조사

### 1.1. Diablo 3 — Greater Rift (밀도·세트·무한 스케일)

| 메커닉 | 내용 | 수치 |
|:---|:---|:---|
| **몬스터 세트** | 각 층은 **33개 몬스터 세트 중 1개**가 랜덤 배정. 세트별 진행 효율이 천차만별(Best~Restart 티어). | 33세트 |
| **밀도 우선** | 빠른 클리어의 #1 변수는 밀도. 플레이어가 밀집 구간을 찾거나 만들어 끌어모은다. | — |
| **진행 게이지** | 몬스터 처치로 100% 채우면 Rift Guardian 등장 → 처치 시 보상. 엘리트는 진행 오브(약 1%/개) 드롭. | 엘리트 ≈ 1%/개 |
| **HP 스케일링** | GR 레벨당 몬스터 생명력 **×1.17** (지수). | +17%/레벨 |
| **데미지 스케일링** | 구간별 지수: GR1–25 ×1.13185, GR26–70 ×1.07177, GR71–150 ×1.02337. GR71+ 에서 HP는 4.5티어마다 2배. | 구간 지수 |
| **인원 스케일링** | 플레이어 1인 추가마다 몬스터 생명력 +100%. | +100%/인 |
| **파일런(Pylon)** | 4종, 리프트당 각 1회. 등장 확률은 진행도와 연동(파일런 등장 후 ~1%로 리셋, ~50% 진행까지 선형 증가). | 4종 |
| **Rift Fishing** | "완벽한 리프트"는 약 **1/69,000**. 변수: 맵 품질·레이아웃·몬스터 타입·밀도·엘리트 어픽스·파일런·보스 품질. | 변동성=리플레이성 |

**Transformers 세트 사례:** Dark Vessel은 3 또는 7마리 팩으로 등장, 교전 전까지 수동, 변신 시 추가 진행(0.33%/마리). 고밀도일 때 "1층 리프트"를 만든다 — **세트 구성이 클리어 양상을 근본적으로 바꾸는** 증거.

> 핵심 차용: **밀도 = 1순위 변수**, **세트 랜덤 배정 = 정체성 변주**, **지수 HP 스케일**, **엘리트 = 진행 가속자**, **변동성 = 리플레이 연료**.

### 1.2. Diablo 4 — Pit of Artificers (티어=몬스터 레벨, 엘리트 밀도)

| 메커닉 | 내용 |
|:---|:---|
| **티어=레벨** | 적 시작 Lv100, **티어당 적 레벨 +1**. 최고 티어에서 Lv300 (VoH 확장은 150티어). |
| **엘리트 밀도 우선** | 저·중티어는 엘리트 밀도가 보스 단일딜보다 진행 기여 큼. 고티어는 보스 단일딜이 병목. 엘리트가 진행을 가장 많이 준다. |
| **타임드 압박** | 제한 시간 내 게이지 충전 → 보스. 밀도/엘리트 사냥이 곧 시간 효율. |

> 핵심 차용: **티어=선형 레벨 환산**(레어리티/지층을 단일 강도 스칼라로 환산 가능), **엘리트 밀도가 중간 구간의 핵심 페이싱 레버**.

### 1.3. Diablo 4 — Nightmare Dungeon (어픽스 레이어링, 밀도 부스트)

| 메커닉 | 내용 |
|:---|:---|
| **밀도 부스트** | 일반 던전 대비 적·엘리트 밀도 상향. 엘리트가 훨씬 많고 강함. |
| **어픽스 계단** | 티어 1–10: 어픽스 3개(긍정1+부정2) / 11–20: 4개 / 21+: 5개. 부정 어픽스는 엘리트 강화·전체 버프·특수 몹 도입. |
| **레벨=강도** | 티어가 직접 몬스터 레벨을 올려 HP·데미지 증가. |

> 핵심 차용: **어픽스 = 깊이에 따라 누적되는 전역 변조자**. ECHORIS는 지층 깊이에 따라 "방 변조자(은신 강화·속성 폭발 등)"를 1→N개로 늘릴 수 있다.

### 1.4. Diablo 4 — Monster Family (★ "같은 등급 다른 몬스터"의 직접 모델)

D4는 모든 적을 **20개 몬스터 패밀리**로 묶는다(Bandits, Cannibals, Cultists, Demons, Drowned, Fallen, Goatmen, Knights, Skeletons, Snakes, Spiders, Vampires, Werewolves, Zombies 등). 각 패밀리는 테마·지역으로 묶인 한 줌의 적 집합이다.

**지역 = 패밀리 매핑:**

| 지역 | 패밀리 |
|:---|:---|
| Fractured Peaks | Skeletons, Fallen, Ghosts, Knights, Vampires, Werewolves |
| Dry Steppes | Bandits, Cannibals, Goatmen, Spiders, Zombies |
| Hawezar | Cultists, Snakes, Zombies |
| Scosglen | Werewolves, Wildlife |

**패밀리 내부 = 기능 아키타입 조성:**

| 기능 | 역할 | 예시 |
|:---|:---|:---|
| Melee Bruiser | 중타격 근접 | Cannibal Gorger |
| Swarmer | 다수 약체, "체력 벽" + 회복 오브 공급 | Cannibal Cleaver |
| Ranged | 투사체, 보스 외 최고 위협(동시 사격) | Goatmen Impaler |
| Mage/Caster | 원소 마법 | Cultist Mother Disciple |
| Buffer/Shaman | 아군 강화 → "먼저 죽여라" 우선순위 강제 | Goatmen Shaman |
| Unique Threat | 부활·소환·군중제어 | Spider Host |

**설계 합리:** 조우는 **우선순위 표적(샤먼·레인지) → 스워머 정리** 의 전술 레이어를 만든다. 환경 메커닉(거미줄·부활·버프)이 정적 플레이를 처벌한다.

> 핵심 차용: **(지역→패밀리) = (무기 정체성→몬스터 권속)**. 패밀리 내부는 기능 조성으로 채운다. 이것이 사용자 요구 (c)의 골격이다.

### 1.5. 로그라이크 — 데이터 주도 스폰 테이블

bracketproductions(Rust 로그라이크 튜토리얼)의 표준 패턴:

```
각 spawn 엔트리: { name, weight, min_depth, max_depth, add_map_depth_to_weight }

스폰 절차:
  현재 깊이로 [min_depth, max_depth] 필터
  weight = entry.weight
  if add_map_depth_to_weight: weight += current_depth   // 깊을수록 가중↑
  RandomTable 에 (name, weight) 추가 → 가중 추첨
```

- **min/max_depth:** 적의 등장 깊이 창(window). 약체는 얕은 층에서 도태, 강체는 깊은 층에서 출현.
- **add_map_depth_to_weight:** 깊이가 깊을수록 특정 적의 비중을 자동 증가(코드 수정 없이 곡선 형성).
- **난이도 레버:** 스폰율·몬스터 강도·함정 수를 독립 파라미터로 둬 조우 난이도를 다축 제어.

> 핵심 차용: **깊이 창(min/max stratum) + 깊이 가중 + 데이터 주도(CSV SSoT)**. ECHORIS 스폰 테이블은 이미 `rarity:stratum` 키를 쓰므로 깊이 창은 부분 구현 상태다.

---

## 2. 핵심 인사이트 추출 (설계 원칙)

### P1 — 2축 분리 (Intensity ⟂ Identity)

| 축 | 담당 | 결정 변수 | 레퍼런스 |
|:---|:---|:---|:---|
| **강도축(Intensity)** | 레어리티 × 지층 | HP·ATK 배율, 마릿수 예산, 엘리트 밀도, 방 변조자 수 | GR ×1.17/lv, Pit 티어=lv, NMD 어픽스 계단 |
| **정체성축(Identity)** | 무기 (기질 + 종류) | 어떤 몬스터 패밀리(권속)가, 어떤 기능 조성으로 나오는가 | D4 Monster Family, GR 33세트 |

두 축은 직교한다. **NORMAL(강도 최저)** 이라도 무기 기질이 다르면 다른 권속이 나온다 → 요구 (c) 충족.

### P2 — 밀도 우선 + 단일 아키타입 금지

- 방은 **기능 예산**으로 채운다: `{ 스워머, 근접, 원소/레인지, 리테넌트 }` 비율을 정하고 그 합을 마릿수 예산으로 본다.
- 현재 `ItemWorldEnemyEncounterRuntime.spawnForRoom` 의 "단일 종 1픽 × 2~4" 를 폐기하고 예산 채우기로 전환(별도 설계: 스폰 예산 모델, 본 문서 §3.4).

### P3 — 엘리트 = 진행/페이싱 가속자

- 엘리트(A-09)는 레어리티에 비례해 밀도를 올린다. 중간 구간의 핵심 난이도 레버.
- 엘리트에 어픽스(부정 변조자)를 부여하면 NMD식 깊이 변조가 된다.

### P4 — 보장(floor) + 변동(fishing)

- **하한 보장:** 지층별 최소 마릿수·기능 다양성을 시드 무관 보장(품질 바닥).
- **변동 변주:** 패밀리 내 세트 선택, 조성 비율, 엘리트 어픽스를 시드로 변주(리플레이 연료). GR fishing의 축소판.

### P5 — 몬스터는 무기 패시브의 검증 장치 (기존 캐논 계승)

SYS-ENM-ARC 명제 1: "몬스터는 무기 패시브의 검증 장치다." 무기 **종류**가 기능 조성을 편향시켜, 그 무기의 강점 축이 빛나는 전술을 반복 생성한다(§4).

---

## 3. ECHORIS 적용 설계

### 3.1. 2축 스폰 모델 개요

```
스폰 풀(pool)   = f( 무기 기질 → 패밀리,  레어리티:지층 → 깊이 창 )
방 조성(comp)   = 기능 예산 { swarmer, bruiser, ranged, lieutenant }
마릿수(count)   = 지층 예산(레어리티 스칼라) / 전투방 수,  하한 클램프
강도(strength) = baseHP·ATK × StrataConfig.hpMul·atkMul (레어리티×지층)
변조자(modifier)= 지층 깊이에 따라 0→N (엘리트 어픽스·속성 폭발 등)
```

### 3.2. 정체성 축 — 5기질 → 5 몬스터 권속 (★ 핵심)

ECHORIS는 이미 `RoomGraphArchetypes` 에서 5기질을 정의하고, SYS-ENM-ARC §1.1에서 **기질→fluid 속성** 자동 바인딩을 캐논화했다(forge→magma, iron→cyro/water, rust→acid, spark→charged, shadow→oil). 이 5기질을 **5개 몬스터 권속**으로 승격한다.

| 무기 기질 | fluid 속성 | 몬스터 권속(Family) | 권속 정서 | 현 로스터 매핑(예) |
|:---|:---|:---|:---|:---|
| **forge** | magma | 용광로 권속 (Foundry) | 공격적·돌진·열폭발 | CinderImp, MawDrone, Skeleton |
| **iron** | cyro/water | 냉각 권속 (Coolant) | 질서·방어·정렬 | Bulwark, Sentry, Sentinel |
| **rust** | acid | 부식 권속 (Corrosion) | 소모·지속·붕괴 | Lurker, Slime(산성), Lobber |
| **spark** | charged | 방전 권속 (Conduit) | 고속·원거리·연쇄 | SparkBat, Conduit, Sentry(전격) |
| **shadow** | oil | 은닉 권속 (Umbra) | 매복·기습·교란 | Ghost, Lurker, Ambusher |

- 무기의 **주색(temperamentPrimary)** 이 권속을, **부색(temperamentSecondary)** 이 혼합 비율(부색 권속 20~30% 혼입)을 결정한다 → "순수형 vs 혼합형" 변별이 그래프 아키타입과 동일 키로 정합.
- **결과:** NORMAL forge 검과 NORMAL shadow 검은 같은 강도지만 **용광로 권속 vs 은닉 권속** 으로 완전히 다른 얼굴 → 요구 (c) 충족.
- fluid 속성이 권속에 자동 바인딩되므로 화학 반응 매트릭스(`Design_ChemicalReactions_FullMatrix.md`)와도 일관 — forge 권속은 magma를 남기고, 플레이어 빌드가 그 속성에 대응하게 강제.

### 3.3. 방당 기능 조성 (단일 아키타입 문제 해결)

D4 패밀리 복합성을 차용. 각 전투방은 **기능 예산**으로 채운다. 11종 아키타입(SYS-ENM-ARC)을 4대 기능군으로 묶는다:

| 기능군 | 포함 아키타입(A-) | 방 기본 비중 | 역할 |
|:---|:---|:---|:---|
| **Swarmer** | A-06 Swarmer, A-02 Jumper | 40~50% | 체력 벽·밀도·회복 오브 공급 |
| **Bruiser** | A-01 Charger, A-04 Shielder | 25~35% | 압박·라인 형성 |
| **Ranged** | A-03a Shooter, A-03b Bombardier, A-05 Flier | 15~25% | 위치 압박·우선 표적 |
| **Lieutenant** | A-08 Summoner, A-10 Sentinel, A-09 Elite | 0~15%(레어리티↑) | 버프·소환·우선 처치 강제 |

- **우선순위 표적 강제:** 리테넌트(버퍼/소환사)를 먼저 처치해야 스워머 정리가 쉬워지는 D4식 전술 레이어.
- **하한:** 모든 전투방은 최소 2개 기능군을 포함(시드 무관) → 단조로운 단일 종 방 제거.

### 3.4. 마릿수 — 예산 기반 스폰 (강도축 ×)

> 본 절은 별도 진행 중인 "스폰 예산 모델" 논의(세션 2026-06-08)와 직결. `enemyCountBonus`(현재 `StrataConfig` 에 파싱만 되고 **미사용**)를 활성화한다.

```
방당 예산 budget = BaseEnemyCount(레어리티) + StrataConfig.enemyCountBonus(지층)
지층 보장 하한 floorTotal = 전투방수 × BaseEnemyCount × 0.75

방 채우기:
  while spawned < budget:
    role  = 기능 예산에서 가중 선택 (swarmer 우세)
    enemy = 권속 풀에서 role·깊이창 만족하는 종 가중 추첨
    cluster = min(remaining, role별 군집 크기)
    spawn(cluster)
  기억 파편은 별도 예산 → budget 잠식 금지
보스방 직전 지층 누적 < floorTotal 이면 backfill
```

**레어리티별 시작 수치(플레이테스트 보정 타깃):**

| 레어리티 | 지층 수 | BaseEnemyCount | +지층보너스 | 방당 실효 | 엘리트 밀도 |
|:---|:---|:---|:---|:---|:---|
| Normal | 1 | 4 | +1 | 5 | 0~1/지층 |
| Magic | 2 | 5 | +1~2 | 6~7 | 1~2/지층 |
| Rare | 3 | 6 | +1~3 | 7~9 | 2~3/지층 |
| Legendary | 4 | 7 | +1~4 | 8~11 | 3~4/지층 |
| Ancient | 4+심연 | 8 | +1~4 | 9~12 | 4~5/지층 + 정예팩 |

### 3.5. 강도 스케일링 (HP·ATK)

현행 `StrataConfig`(레어리티×지층 hpMul/atkMul)을 유지·검증한다. Diablo의 지수 곡선을 사니티 체크 기준으로 사용:

- **D3 기준선:** +17% HP/레벨(지수). ECHORIS는 지층 수가 적으므로(1~4+) 지층당 더 큰 스텝이 정당.
- **현행 검증:** Normal Lv1 hpMul 0.95 → Ancient St4 hpMul 8.1. 이를 "유효 레벨"로 환산하면 약 8.5배 ≈ D3 GR14 상당. 지층/레어리티 23단계에 분산되므로 단계당 약 +10~12% — D3보다 완만하나 ECHORIS는 무기 성장(Recovery)·기억 파편이 병행 스케일하므로 적정.
- **권장:** 지층 내 거리 스케일(`distScale = 1 + dist×0.1`, 현행)을 유지해 같은 지층에서도 보스 접근 시 강도 상승(GR식 미세 페이싱).

### 3.6. 깊이 변조자 (NMD 어픽스 차용, 선택적)

지층 깊이에 따라 방 변조자 수를 0→N으로 증가:

| 변조자 예 | 효과 | 등장 깊이 |
|:---|:---|:---|
| 속성 과포화 | 권속 fluid 잔류물 2배(반응 위험↑) | St2+ |
| 정예 각성 | 엘리트 1마리 추가 + 어픽스 1 | St3+ |
| 은닉 심화 | shadow 권속 매복 반경↑ | Ancient |

NMD식 "1긍정+N부정"은 ECHORIS 톤(고독·압박)에 맞춰 **부정 변조자 위주**로 가져가되, 보상(추가 기억 회복률)으로 상쇄.

### 3.7. 보장 + 변동 (P4 구현)

- **보장(시드 무관):** 지층 floorTotal 하한, 방당 최소 2기능군, 권속 일관성.
- **변동(시드 의존):** 권속 내 종 선택, 기능 비율 ±10%, 엘리트 어픽스, 혼합 권속 비율. → 같은 무기·레어리티라도 다이브마다 다른 조성(GR fishing의 건전한 축소판). 단, ECHORIS는 프리미엄(비-라이브서비스) 지향이므로 fishing을 **강제 그라인드가 아닌 변주 다양성**으로만 사용.

---

## 4. 무기별 차등 매트릭스

### 4.1. 무기 종류 → 기능 조성 편향 (검증 장치)

무기 **종류**는 권속을 바꾸지 않고, **기능 조성을 편향**시켜 그 무기의 강점 축이 시험받게 한다(SYS-ENM-ARC 명제 1).

| 무기 종류 | 강점 | 조성 편향(해당 무기를 시험) |
|:---|:---|:---|
| **Blade**(근접 균형) | 연속 근접 | Ranged·Caster 비중↑ — 접근 중 원거리 압박을 견디는가 |
| **Cleaver**(광역 저속) | 군집 처리 | Swarmer 비중↑·밀집 — 광역 타이밍 검증 |
| **Shiv**(고속 단일) | 단일 폭딜 | Lieutenant·Elite 비중↑ — 우선 표적 제거력 검증 |
| **Harpoon**(중거리 견제) | 라인 유지 | Bruiser 돌진 비중↑ — 거리 유지력 검증 |
| **Chain**(군중 제어) | 다수 견제 | Swarmer + Jumper 혼합 — 산개 대응 검증 |
| **Railbow**(원거리 정밀) | 안전 딜 | Flier·Ambusher 비중↑ — 접근 차단·사각 대응 검증 |
| **Emitter**(원소 지속) | 속성 시너지 | 권속 fluid 상극 조성 — 화학 반응 운용 검증 |

### 4.2. 종합 — 정체성 결정 트리

```
무기
 ├─ temperamentPrimary  → 몬스터 권속(5)         [누가 나오나]
 ├─ temperamentSecondary→ 혼합 권속 비율(20~30%) [얼마나 섞이나]
 ├─ type(7)             → 기능 조성 편향          [어떻게 싸우나]
 └─ rarity × stratum    → 강도·마릿수·엘리트·변조자[얼마나 센가]
```

**워크 예시 — 같은 NORMAL, 다른 얼굴:**

| 무기(NORMAL) | 권속 | 조성 편향 | 체감 |
|:---|:---|:---|:---|
| `sword_caretaker`(Blade, iron) | 냉각 권속 | Ranged↑ | 정렬된 방어형 적이 원거리로 압박, 접근전 강제 |
| `sword_rustborn`(Blade, rust) | 부식 권속 | Ranged↑ | 산성 잔류·소모전, 같은 Blade라도 지형이 산으로 더럽혀짐 |
| `dagger_normal`(Shiv) | (기질 미부여 → forge fallback) | Elite↑ | 우선 표적 중심, 단일 폭딜 시험 |

→ 동일 레어리티·동일 강도에서 **권속·조성·속성**이 전부 달라진다.

---

## 5. 구현 매핑 (코드·CSV 연결점)

| 설계 요소 | 현행 | 변경/신설 |
|:---|:---|:---|
| 스폰 풀 키 | `rarity:stratum` (`Content_ItemWorld_SpawnTable.csv`) | **Family·Role·MinStratum·MaxStratum 칼럼 추가** → 깊이 창 + 권속 + 기능 |
| 권속 선택 | 없음 | 무기 `temperamentPrimary` → Family 매핑(신규 `MonsterFamily.ts` 또는 SYS-ENM-ARC 표) |
| 방 조성 | 단일 종 1픽 (`ItemWorldEnemyEncounterRuntime`) | **기능 예산 채우기 루프**(§3.4)로 교체 |
| 마릿수 예산 | `minCount/maxCount` 단종 | `BaseEnemyCount` + `enemyCountBonus`(미사용 활성화) |
| 강도 | `StrataConfig.hpMul/atkMul` + distScale | 유지(검증만) |
| 엘리트 밀도 | 없음(Treasure GoldenMonster만) | 레어리티 스칼라 엘리트 카운트 + 어픽스 |
| 변조자 | 없음 | 깊이별 방 변조자(선택, Phase 2 후반) |
| 기억 파편 | 몬스터 슬롯 잠식(`trySpawn`+continue) | **별도 예산으로 분리**(budget 비잠식) |

> **CSV 스키마 확장안 (SpawnTable):**
> `Rarity, MinStratum, MaxStratum, Family, Role, EnemyType, Weight, Level, ClusterMin, ClusterMax, IsBoss, EliteEligible`
> 선택 절차: 무기→Family 고정 → (Rarity, 현재 지층∈[Min,Max]) 필터 → Role 예산에 맞춰 가중 추첨 → Cluster 스폰.

---

## 6. 미해결 / 다음 단계

1. **권속 로스터 확정:** 현 13종 적(Bulwark·CinderImp·Conduit·Ghost·GoldenMonster·Guardian·Lobber·Lurker·MawDrone·Sentry·Skeleton·Slime·SparkBat)을 5권속 × 4기능군 그리드에 배치 → 빈칸(미존재 조합) 도출. **권속당 최소 3종(스워머+근접+레인지)** 필요.
2. **BaseEnemyCount·엘리트 곡선 플레이테스트:** §3.4 시작 수치를 30분 슬라이스에서 검증(지층당 floorTotal 미달 0회 목표).
3. **혼합 권속 비율:** 부색 혼입 20~30%가 정체성을 흐리지 않는지 변별 테스트.
4. **변조자 도입 시점:** Phase 2 후반 vs Phase 3. ECHORIS 톤상 부정 변조자 과다는 고독→피로로 전환될 위험 — 보상 균형 설계 선행.
5. **설계 문서 승격:** 본 리서치 → `System_ItemWorld_MonsterSpawn.md`(5단계 구조) 신설, SYS-ENM-ARC·`System_ItemWorld_FloorGen.md` 와 교차참조.

---

## 6.1. 권속 그리드 & 신규 6종 거동 스펙 (2026-06-09 확정)

### 전제

- **데이터 사실:** `Content_Stats_Enemy.csv` 의 Attribute 칼럼은 13종 전부 공란. 현재 어떤 적도 권속이 하드코딩돼 있지 않다. 아래 배치는 **색·거동 기반 자연 친화도 제안**이며, 공란 적(Slime·Skeleton·MawDrone)은 권속 무관 **중립 리스킨 충원재**다.
- **그리드 제외 2종:** GoldenMonster(보물 몹·도주형), Guardian(보스). 전투 조성 충원재가 아니다. → **전투 로스터 = 11종.**
- **기능군 정의:** Swarmer(A-06/02) · Bruiser(A-01/04) · Ranged·교란(A-03a/03b/05/**07**) · Lieutenant(A-08/10/09, 선택). ※ A-07 Ambusher는 4기능군에 단독 슬롯이 없어 Ranged를 "Ranged·교란"으로 확장 수용.

### 배치 그리드 (현 11종, 중립 3종 최적 배분)

| 권속 | Swarmer | Bruiser | Ranged·교란 | Lieutenant(선택) |
|:--|:--|:--|:--|:--|
| **forge** 용광로 | CinderImp ✓ | MawDrone ⚠ | Lobber ✓ | ✗ |
| **iron** 냉각 | Slime ⚠ | Bulwark ✓ | Sentry ✓ | Sentry(Sentinel 겸용) |
| **rust** 부식 | ✗ **NEW** | Skeleton ⚠ | ✗ **NEW** | ✗ |
| **spark** 방전 | ✗ **NEW** | ✗ **NEW** | SparkBat ✓ | Conduit ✓ |
| **shadow** 은닉 | ✗ **NEW** | ✗ **NEW** | Ghost ✓ / Lurker ✓ | ✗ |

✓ 하드 친화 · ⚠ 중립 리스킨 배분 · ✗ 빈칸(신규 필요)

### 정량 결론

코어 최소 = 5권속 × 3기능(S+B+R) = **15칸**. 하드 6 + 중립 3 = 9 충족. **빈칸 6 = 신규 6종.**

| 권속 | 신규 코어 | 비고 |
|:--|:--|:--|
| forge / iron | 0 | MawDrone·Slime 배분으로 코어 완성 |
| **rust** | Swarmer·Ranged (2) | 시그니처 0종 — 정체성 공백 최대 |
| **spark** | Swarmer·Bruiser (2) | 근접·다수 부재 |
| **shadow** | Swarmer·Bruiser (2) | 교란형(Lurker+Ghost)으로만 쏠림 |

선택적 Lieutenant(엘리트 깊이용) 전권속 충족 시 forge·rust·shadow에 **+3종**(총 9종).

### 구조적 발견

1. **shadow 불균형:** 교란형 2종(Lurker·Ghost)만 보유, Swarmer·Bruiser 통째로 공백. 정체성은 강하나 조성 쏠림.
2. **rust 공백:** 부식 계열 고유 적 0종. 5권속 중 정체성 공백 최대.

### 신규 6종 거동 스펙 초안

> 수치 규약 접지: **Lv1 ATK 23 균일**(DEC-049), HP는 기능대역(글래스 스워머 18~25 / 브루저 96~160 / 레인지 90~130), 레벨 스케일 **HP ×2.5 / ATK ×2 per Lv**(기존 로스터 동일). fluid 속성은 권속 자동 바인딩(rust→acid, spark→charged, shadow→oil).

| 적(신규) | 권속 | 기능 | HP(L1) | ATK | DEF | 속도 | 감지/사거리 | 공격 패턴 | fluid |
|:--|:--|:--|:--|:--|:--|:--|:--|:--|:--|
| **RustMite** | rust | Swarmer | 22 | 23 | 1 | 60 | 200 / 20 | 위빙 접근 → 근접 물기. **처치 시 산성 웅덩이**(DoT 타일) 생성 | acid |
| **Spitter** | rust | Ranged | 95 | 23 | 4 | 25 | 260 / 220 | 직선 산성 사출(Lobber 아크와 구분) → 착탄점 **잔류 산웅덩이 ~3s**. 근접 시 후퇴 | acid |
| **Arcling** | spark | Swarmer | 20 | 23 | 0 | 78 | 200 / 18 | 고속 불규칙 위빙 → 접촉 감전. **처치 시 전하 방출**(인접 fluid 연쇄) | charged |
| **Dynamo** | spark | Bruiser | 120 | 23 | 5 | 38 | 200 / 30(자기중심) | 전진 → 충전 텔레그래프(Conduit식 펄스) → **근접 AoE 방전**(밀집 처벌) | charged |
| **Slickling** | shadow | Swarmer | 24 | 23 | 1 | 55 | 190 / 18 | 근접 + **이동 경로에 기름 슬릭**(둔화·인화성 — forge magma와 화학 반응) | oil |
| **Tarbrute** | shadow | Bruiser | 140 | 23 | 6 | 28 | 170 / 24 | 은폐 전진(Lurker식 alpha 점멸 유지 → **텔레그래프 가독성↓**) + 중타격. 기름 오라 | oil |

설계 의도 — 각 신규는 **권속 fluid를 전장에 남겨** 화학 반응 매트릭스를 강제하고(RustMite·Spitter=산, Slickling=기름, Arcling·Dynamo=전하), 기능 역할로 방 조성을 완성한다. Bulwark(iron, 방향 블록)와 Tarbrute(shadow, 가독성 저하)처럼 **같은 Bruiser라도 위협 메커니즘이 권속별로 다르다** — 단순 리스킨 이상의 변별.

### 결정 (2026-06-09) — 중립 베이스 거동 분기 채택

> **사용자 결정:** 중립 3종을 속성 틴트 리스킨이 아니라 **권속별로 거동을 분기**시킨다("리스킨 이상의 변별"). 거동 분기의 엔진은 **fluid 속성**이며, 이미 캐논인 화학 반응 매트릭스(`Design_ChemicalReactions_FullMatrix.md`)를 재사용한다. 베이스 FSM(이동·공격)은 공유하되, **잔류물 / 접촉 / 처치 효과**가 권속 fluid로 갈린다.

**핵심 효과 — 코어 신규 6 → 1.** Slime(Swarmer 베이스)·Skeleton(Bruiser 베이스)이 권속별 거동 분기로 모든 Swarmer·Bruiser 빈칸을 메운다. Ranged만 베이스가 없어 **rust Ranged(Spitter) 1종만 필수 신규**로 남는다. 나머지(Arcling·Dynamo·Slickling·Tarbrute)는 *권속 정체성 강화용 시그니처*로 격하 — 필수가 아닌 단계적 추가.

**fluid 거동 분기 매트릭스 (베이스 공통 적용):**

| fluid(권속) | 이동 잔류 | 접촉 효과 | 처치 효과 |
|:--|:--|:--|:--|
| magma (forge) | 불타는 타일 | 화상 DoT | 소형 폭발 |
| cryo (iron) | 서리 슬로우존 | 둔화 | 빙결 파편 |
| acid (rust) | 산 웅덩이 DoT | DEF 저하 | 산 분출 |
| charged (spark) | 정전기 필드 | 감전 스턴(단) | 전하 연쇄 |
| oil (shadow) | 기름 슬릭(둔화·인화) | 시야 방해 | 기름 확산 |

**거동 분기 후 그리드 (코어 충족):**

| 권속 | Swarmer | Bruiser | Ranged |
|:--|:--|:--|:--|
| forge | CinderImp | MawDrone / Skeleton(magma) | Lobber |
| iron | Slime(cryo) | Bulwark | Sentry |
| rust | Slime(acid) | Skeleton(acid) | **Spitter NEW** |
| spark | Slime(charged) | Skeleton(charged) / Dynamo | SparkBat |
| shadow | Slime(oil) | Skeleton(oil) / Tarbrute | Ghost / Lurker |

→ **필수 신규 = 1종(Spitter).** 시그니처 신규(선택, 정체성 강화) = Arcling·Dynamo·Slickling·Tarbrute. Lieutenant(선택, 엘리트 깊이) = forge·rust·shadow 3종.

**구현 메모:** 스폰 시스템이 권속 Swarmer 슬롯을 채울 때 `Slime + 권속 fluid 모듈`을, Bruiser는 `Skeleton + fluid 모듈`을 인스턴스화. fluid 모듈이 잔류/접촉/처치 분기를 담당(신규 AI 골격 불요 → 풀 신규 종 대비 저비용). 시그니처는 권속별 변주 피크로 단계 투입.

---

## 6.2. 확장 천장 — 이동×위협 매트릭스 & 16칸 우선순위 (2026-06-09)

### 문제 인식

현 11종은 거의 (이동 1축 × 위협 1축)의 순수 코너 케이스다. "비행 슈터"(비행×직선사격) 같은 **하이브리드가 통째로 공백**. 확장 한계는 단순 곱셈이 아니라 **반복 패턴 직전의 포화점**으로 본다.

### 설계 공간 — 이동(Locomotion) × 위협(Threat)

| 이동 \ 위협 | 접촉 | 돌진/도약 | 직선사격 | 아크/투척 | 방어/반격 | 지역봉쇄 |
|:--|:--|:--|:--|:--|:--|:--|
| **지상** | ●Slime | ●Skeleton·CinderImp | ○ | ●Lobber | ●Bulwark | ○ |
| **비행** | ●Ghost | ●SparkBat | ○ | ○ | ✕ | ○ |
| **고정** | ✕ | ✕ | ●Sentry | ○ | ○ | ○ |
| **은신** | ●Lurker | ○ | ○ | ✕ | ✕ | ○ |
| **벽/천장** | ○ | ○ | ○ | ✕ | ✕ | ✕ |

서포트(소환/버프) 오버레이 = 지상●Conduit / 고정○ / 비행○. ● 현존 9 · ○ 신규 16 · ✕ 퇴화.

### 두 단계 천장

| 기준 | 종 수 | 근거 |
|:--|:--|:--|
| 현재 전투 로스터 | 11 (≈9 템플릿) | 지상-근접 중복(Skeleton·CinderImp·MawDrone·Slime) |
| **반복 없는 기능 천장** | **약 25** | 유효칸 22 + 서포트 배치 3 |
| **fluid 변별까지 실용 천장** | **약 40~48** | 봉쇄·잔류·방출 5~6종만 다권속화(×4), 접촉·돌진형 ×1~1.5 |
| Phase 2 현실 타깃 | 24~30 | 한계효용·웹 스코프·인지 부하 |

이론 최대 48을 다 채우는 건 비효율. **25 기능 템플릿에서 변별의 90%가 나온다.**

### 16 빈칸 → 권속·우선순위 (Q1: 이중 결핍 동시 해소)

> 결핍 좌표: **rust = 시그니처 0(정체성 공백)** / **shadow = 교란형 편중(Swarmer·Bruiser 공백)**. 새 템플릿을 이 두 결핍에 정조준해 한 종으로 둘을 메운다. ※ shadow엔 **추가 Ranged/교란을 부여하지 않는다**(편중 악화 회피) — 근접·봉쇄 기능만.

| 우선 | 셀(이동-위협) | 템플릿(가칭) | 권속 | fluid | 동시 해소 |
|:--|:--|:--|:--|:--|:--|
| **P0** | 지상-직선 | **Spitter**(산성 사출) | rust | acid | 신 템플릿 + **rust Ranged 시그니처** |
| **P0** | 지상-봉쇄 | **부식보행체**(산 웅덩이) | rust | acid | 신 템플릿 + **rust Swarmer·정체성** |
| **P0** | 은신-돌진 | **매복돌진체** | shadow | oil | 신 템플릿 + **shadow Bruiser** |
| **P0** | 벽/천장-접촉 | **천장낙하 포식체** | shadow | oil | **벽/천장 모드 신설(0커버)** + shadow 근접 |
| **P1** | 비행-직선 | **비행슈터**(코너링불가) | spark | charged | 하이브리드 개시(요구 예시) |
| **P1** | 비행-아크 | **공중폭격체** | forge | magma | 아크 하이브리드 |
| **P1** | 고정-봉쇄 | **방출플러딩**(둔화지대) | iron | cryo | 봉쇄 fluid 변별(산↔서리) |
| **P1** | 벽/천장-돌진 | **벽도약체** | forge | magma | 벽 모드 수직압박 |
| **P1** | 비행-봉쇄 | **비행 기름살포** | shadow | oil | shadow 공중 스워머 |
| **P2** | 고정-아크 | 박격포 | rust/forge | — | 고정 지원화력 |
| **P2** | 고정-방어 | 방패포대 | iron | cryo | iron 방어 강화 |
| **P2** | 고정-서포트 | 고정토템 스포너 | spark | charged | Lieutenant 보강 |
| **P2** | 비행-서포트 | 공중 운반/소환 | spark | charged | Lieutenant 공중 |
| **P2** | 은신-직선 | 은신저격 | spark/iron | — | (shadow 미부여 — 편중 회피) |
| **P2** | 은신-봉쇄 | 함정설치 | rust | acid | rust 보조 |
| **P2** | 벽/천장-직선 | 벽사격 | spark | charged | 벽 모드 원거리 |

### 결론 — 투자 순서

- **P0 4종이 최고 한계효용:** rust 정체성(2종) + shadow 근접 결핍(2종) + 벽/천장 모드(0→1) 를 동시 타격. rust·shadow 불균형이 4종으로 해소된다.
- **P1 5종:** 비행 하이브리드 개시(요구 사항) + 봉쇄 fluid 변별 + 벽 모드 확장.
- **P2 7종:** 고정/잔여 — 한계효용 낮음, Phase 3 이후.
- 11(현재) + P0 4 + P1 5 = **20종**이 Phase 2 현실 타깃(24~30) 하단. P2까지 = 27종.

### 주석 — 벽/천장 = 플래그십(선결조건부)

> **체감 임팩트 최대 ≠ 최저 비용.** 벽/천장(W-ct/W-ch/W-dp)은 16칸 중 *지각 다양성 단가*는 최고지만 *엔지니어링 단가*도 최고다. 지표에 따라 순위가 갈린다.

| 지표 | 1위 |
|:--|:--|
| 셀당 체감 다양성 | **벽/천장** — 유일한 0커버 이동축 + 1모듈 3셀 + 수직성 기둥(`System_World_VerticalGimmicks.md`) 보강 |
| 시간당 체감 다양성 | 비행 하이브리드 + fluid 봉쇄군 — 기존 FSM 재활용 저비용 |

**벽/천장 고유 선결비용 (나머지 15칸엔 없음):**
1. **신규 이동 코드** — 중력 반전·표면 감지·표면 경로 추적. (비행슈터=SparkBat 비행 FSM + Sentry 사격 조립 / 봉쇄형=지상 FSM + fluid 모듈 → 둘 다 *조립*인 반면 표면 부착은 *신규 골격*.)
2. **스폰 지오메트리** — 현 `ItemWorldSpawnController.computeSpawnPoints`·`findFlatFloorCenter` 는 **바닥 평탄 타일만** 반환. 천장/벽 적은 천장·수직벽 타일 감지가 새로 필요하고, RoomGraph 수직 다이브 방이 그 위치를 항상 제공한다는 보장이 없다(넓은 방 = 천장 행어 불가).
3. **가독성** — 화면 밖/위 기습은 §1.3 금지. 텔레그래프 필수.

**권장 시퀀스 (게이트):**
1. RoomGraph/LDtk 방이 천장·수직벽을 일정 비율 보장하는지 검증 → 미달 시 템플릿에 "천장 행어 포인트" 태그 선(先) 심기.
2. 1회성 표면 부착 이동 모듈 제작, 데뷔를 **shadow(oil) 권속**과 묶음(천장 매복 = 은닉 정체성 정합 + shadow 근접 결핍 동시 해소).
3. 동일 모듈로 W-ch·W-dp 저비용 확장.

→ **결론: P0 플래그십 유지하되, 선결조건(방 지오메트리 보장 + 이동 모듈) 통과 후 착수.** 통과 시 단일 모듈로 3셀 + 수직성 기둥을 한 번에 산다.

---

## 7. 구현 로드맵 (2026-06-09 확정)

### 설계 원칙 — 사용자 7단계 안에 적용한 2개 구조적 수정

사용자 제안 순서(몬스터 추가 → 검수 → 스폰 문서·CSV → 기능 → test map → 조정 → 적용)의 골격은 유효. 두 결함만 교정한다.

- **수정 A — 분류 좌표 선결:** 몬스터를 자유형으로 만들면 CSV 조립 시 좌표 불일치로 재작업. 각 몬스터를 **4좌표 태그(Family / Role / Fluid / Locomotion)째** 제작 → CSV 단계가 *창작 0, 조립만*.
- **수정 B — 버티컬 슬라이스 선행:** 완전 순차(전부 제작 → 검증)는 2축 모델이 "체감상 맞는가"를 가장 늦게·가장 비싸게 알게 됨(워터폴). **한 패밀리를 끝까지 관통**해 핵심 가정을 싸게 검증 후 확장.

### Phase 0 — 선결 (착수 전)

1. **분류 계약 고정:** 본 문서 권속/기능/fluid/이동 좌표를 CSV 컬럼 스펙 1쪽으로 확정 — `Family, Role, MinStratum, MaxStratum, Fluid, Locomotion, EliteEligible`.
2. **(벽/천장 포함 시 한정)** 방 지오메트리 보장 + 표면 부착 이동 모듈 게이트(§6.2 주석). M1 슬라이스는 지상 패밀리(rust)라 이 게이트 **불필요** — 후속 마일스톤으로 미룸.

### ★ M1 — 버티컬 슬라이스 (첫 마일스톤, rust 패밀리)

> **목표 질문:** "권속×기능 2축 모델이 체감상 작동하는가?" 이 한 가지를 최소 비용으로 검증.
> **대상:** rust(시그니처 0 → 검증 가치 최대). 지상 한정 → 이동 모듈 불요.

| 단계 | 산출물 | 비고 |
|:--|:--|:--|
| **A. 제작** | rust 핵심 3종 — Spitter(Ranged/acid) + 산성 분기 Swarmer(Slime+acid 모듈) + 산성 분기 Bruiser(Skeleton+acid 모듈). 전부 4좌표 태그째 | fluid 모듈 = 산 웅덩이 DoT 잔류 |
| **B. 최소 스폰** | 역할 예산 채우기 루프(`spawnForRoom` 신규 분기) — 단일 권속(rust)만, BaseEnemyCount + enemyCountBonus 활성화 | 기존 단일 종 1픽 폐기 |
| **C. test map** | rust 전용 test map 1개 — 패밀리 정체성 + **혼합 역할 조성**(swarmer+bruiser+ranged 동시 방) 둘 다 노출 | 단독 패밀리뿐 아니라 role budget 체감 |
| **D. 조정** | 밀도·역할비·산 잔류 빈도 튜닝 | — |

**M1 Exit Criteria (PASS 기준):**
- rust 방이 **2개 이상 기능군**을 시드 무관 포함(단일 종 방 0).
- 산성 잔류물이 무기 속성 대응을 실제로 강제(빈 연출 아님).
- "같은 강도라도 rust는 부식·소모전으로 읽힌다"가 플레이로 성립.
- → **PASS 시 2축 모델 확정, M2 착수. FAIL 시 이 단계에서 피벗(매몰 비용 최소).**

### M2+ — 확장 (M1 PASS 후)

| 마일스톤 | 내용 |
|:--|:--|
| **E. 패밀리 확장** | 나머지 4권속 몬스터 제작(검증된 계약·4좌표째). 우선순위 §6.2: P0 잔여(shadow 근접) → P1 |
| **F. 개별 검수** | 텔레그래프 가독성·스탯대역·애니 프레임 체크리스트(상시 병행) |
| **G. CSV 채우기** | 전체 SpawnTable 조립(창작 0) |
| **H. 경험 검증** | 패밀리별 + 혼합 역할 test map |
| **I. 전역 튜닝** | 레어리티×지층 강도·엘리트 밀도·변조자 |
| **J. 실제 적용** | 아이템계 본 스폰 경로 교체 |
| **(별도) 벽/천장 플래그십** | Phase 0-2 게이트 통과 후, shadow 권속과 묶어 데뷔(§6.2) |

**전체 규모:** 11(현재) + M1 rust 3 + M2 확장 → Phase 2 타깃 **20~27종**(§6.2). P2 7종은 Phase 3.

---

## 7.1. Phase 0 — CSV 스키마 계약 (확정 2026-06-09)

> **정규화 결정:** 분리(3 테이블). 행 입자가 다름 — 적 *고유 분류* / *스폰 규칙* / *조성 비율*. 단일 시트는 `권속×지층×역할×fluid` 조합 폭발.
> **Rarity 칼럼 제거:** 정체성=Family, 강도·게이팅=깊이 창(MinStratum) + `StrataConfig(rarity,stratum)`. 깊이 창이 레어리티 게이팅을 겸함(강한 적 MinStratum=3 → 지층 3 보유 Rare+ 에서만 출현).

### 테이블 1 — `Content_Enemy.csv` (기존 확장) · 적 종당 1행 · 거동/분류

> **사용자 결정 2026-06-09 — 단일 시트 유지.** 신규 메타 파일을 만들지 않는다. 분류 시트는 **이미 존재**(`Content_Enemy.csv` = 거동/분류, Type·MovementType·Attribute·**Archetype** 보유). 여기에 칼럼만 추가한다.
> ※ 적 데이터는 본래 2시트 구조: `Content_Stats_Enemy.csv`(숫자 스탯) + `Content_Enemy.csv`(거동/분류). 분류는 후자에 둔다(전자는 숫자 전용). 로더(`enemyStats.ts`)가 **헤더 기반**이라 칼럼 추가는 기존 파서 무파손.

**기존 칼럼:** `Type, DetectRange, AttackRange, MoveSpeed, AttackCooldown, JumpTiles, MovementType, Attribute, Archetype`
**신규 추가 3칼럼:**

| 칼럼 | 값 | 설명 |
|:--|:--|:--|
| `Role` | swarmer\|bruiser\|ranged\|lieutenant\|treasure\|boss | **조성 예산 버킷**. A-09(보물)·Boss 엣지 때문에 파생 대신 명시 |
| `IsNeutralBase` | true\|false | true = fluid 분기로 다권속 등장(Slime·Skeleton·MawDrone) |
| `EliteEligible` | true\|false | A-09 엘리트 승격 허용 |

```
Type,...,Attribute,Archetype,Role,IsNeutralBase,EliteEligible
Slime,...,water,A-02,swarmer,true,false
Skeleton,...,,A-01,bruiser,true,true
Ghost,...,,A-03a,ranged,false,false
MawDrone,...,,A-01,bruiser,true,false
Bulwark,...,,A-04,bruiser,false,true
Sentry,...,,A-10,ranged,false,true
Conduit,...,,A-08,lieutenant,false,true
Spitter,...,acid,A-03a,ranged,false,false   ← M1 신규
```

> **파생 항목(칼럼 불요):** `Locomotion` 은 당분간 코드 파생 — `flying→aerial`, `MoveSpeed=0→stationary`, `Archetype=A-07→concealed`, else `ground`. surface(벽/천장) 모드 도입 시(M2+) 명시 칼럼 추가.
> **Attribute 칼럼:** 종 고유 fluid(시그니처)만 기입. 중립 베이스의 분기 fluid 는 스폰 테이블 Fluid 가 결정(공란 = 권속 fallback).

### ⚠ 실측 정합 보정 (Content_Enemy.csv 기준, §6 재조정)

손분석(§6.1/§6.2)과 실 CSV가 일부 어긋남 — CSV가 ground truth:

- **Ghost = `flying` + `A-03a`(Shooter) = 비행 슈터가 이미 존재.** §6.2에서 빈칸(○NEW)으로 본 A-dp(비행-직선) 셀을 **Ghost가 점유**. → 확장 천장 16빈칸이 **15로 감소**(단, Ghost 구현이 실제 사격인지 코드 검증 필요 — A-03a 라벨↔거동 desync 가능성).
- **MawDrone = `flying`** (지상으로 추정했으나 비행). 비행 모드 적은 Ghost·MawDrone·SparkBat **3종**(§6.2의 2종 아님).
- **Slime = `A-02`(Jumper)** (A-06 swarmer 로 추정했으나). swarmer 버킷은 유지(A-02 도 swarmer 버킷).
- **Sentry = `A-10`(Sentinel)** → Role 은 ranged 로 명시(고정 사격 위협).

### 테이블 2 — `Content_ItemWorld_SpawnTable.csv` (거동 기준 재구조 2026-06-09) · 스폰 규칙당 1행

> **거동 모델 갱신(DEC-052/053 + `Task_Enemy_00_BehaviorCatalog.md`):** 스폰 단위 = **거동(Behavior, 카탈로그 B01~B52)**, 속성 무관. 속성은 **Family→Fluid 매핑**으로 풀이 적용(per-row 컬럼 아님). 구 `EnemyType+Fluid` 결합 폐기 — 같은 거동이 6속성을 곱셈 커버.

| 칼럼 | 값 | 설명 |
|:--|:--|:--|
| `Family` | forge\|iron\|rust\|spark\|shadow | 무기 기질 → 권속 풀 키. **속성은 이 값에서 파생.** |
| `Behavior` | B01~B52 (또는 거동 EnemyType) | `Task_Enemy_00_BehaviorCatalog.md` 참조. **속성 무관 거동.** Role/Size/Locomotion 은 카탈로그에서 조회. |
| `FluidOverride` | (선택) magma\|water\|oil\|acid\|charged\|cyro | 빈값=Family 기본 fluid. **지층 속성 혼합 시에만** 명시. |
| `MinStratum` | 1.. | 깊이 창 시작(레어리티 게이팅 겸) |
| `MaxStratum` | 1..99 | 깊이 창 끝(99=무제한) |
| `Weight` | int | 동일 Role 버킷 내 가중 추첨 |
| `ClusterMin` / `ClusterMax` | int | 픽 시 군집 크기 |

**Family → Fluid 매핑** (속성 SSoT, 코드 상수 또는 소형 CSV):

| Family | Fluid | | Family | Fluid |
|:--|:--|:-:|:--|:--|
| forge | magma | | spark | charged |
| iron | cyro | | shadow | oil |
| rust | acid | | (water) | iron 변형·FluidOverride |

```
# M1 슬라이스 — rust 풀 (속성=acid 자동, FluidOverride 공란)
Family,Behavior,FluidOverride,MinStratum,MaxStratum,Weight,ClusterMin,ClusterMax
rust,B04_Swarmer,,1,99,70,3,4     # 구 RustMite = B04 × rust(acid)
rust,B05_Brawler,,1,99,50,1,2     # 구 acid Skeleton 분기
rust,B07_Gunner,,1,99,40,1,1      # 구 Spitter = B07 × rust(acid)
```

> 같은 `B07_Gunner` 행이 `forge` 풀에 있으면 자동 magma(=구 Pyrelance). **하나의 거동이 전 가족 커버**, 깊이 게이팅 = MinStratum. 보스(Guardian)는 본 풀 제외(stratum-end/별도 보스 테이블).

**테이블 1 델타(거동 모델):** `Content_Enemy.csv` 에 `Size`(S\|M\|L) 칼럼 추가, `Locomotion` 명시화. per-enemy `Attribute` 는 **deprecated**(속성=풀 적용). `IsNeutralBase` 는 **subsumed**(전 거동이 풀 속성 수용 → 의미 소멸, 제거 가능).

### 테이블 3 — `Content_RoleComposition.csv` (M2 연기) · 무기 종류 → 역할 예산 편향(§4.1)

```
WeaponType,SwarmerPct,BruiserPct,RangedPct,LieutenantPct
Blade,40,30,25,5
Cleaver,55,30,10,5
Railbow,40,20,30,10
...
```
M1 은 단일 권속이라 **상수 비율(swarmer45/bruiser30/ranged20/lieut5)** 로 대체, 본 테이블은 M2 도입.

### `Content_StrataConfig.csv` 확장 · 마릿수 예산 ✅ 적용 (2026-06-09)

- 신규 칼럼 `BaseEnemyCount`(레어리티당): Normal4 / Magic5 / Rare6 / Legendary7 / Ancient8. **CSV + `StrataConfig.ts` 파서(cols[13]) + `StratumDef.baseEnemyCount` 적용 완료, tsc 통과.**
- 방당 예산 = `BaseEnemyCount + EnemyCountBonus`. ※ `EnemyCountBonus`는 파싱돼 있으나 **소비(spawnForRoom)는 M1-B**에서 연결.

### 무기 → 권속 해석 (코드, 신규 CSV 불요)

`family = weapon.temperamentPrimary ?? 'forge'`. 부색 혼입(secondary 권속 20~30%)은 M2 연기.

### 마이그레이션 영향 (M1-B 작업)

1. `game/src/data/itemWorldSpawnTable.ts` 파서 재작성(거동 칼럼 `Family,Behavior,FluidOverride,...`).
2. `ItemWorldEnemyEncounterRuntime.spawnForRoom` — 단일 종 1픽 → **Family 필터 + Role 예산 채우기 + Family→Fluid 속성 적용** 로 교체.
3. `Content_Enemy.csv` 확장 — `Size` 칼럼 추가, `Locomotion` 명시화(이미 Role/EliteEligible 적용 완료).
4. **Family→Fluid 매핑** 상수/CSV + fluid 모듈 6종을 거동에 pluggable 부착(per-enemy Attribute 폐기).
5. `StrataConfig.ts` — BaseEnemyCount 파싱(완료), enemyCountBonus 소비.

---

## 출처 (Sources)

- [Diablo 3 Greater Rift Mechanics — Maxroll](https://maxroll.gg/d3/resources/greater-rift-explained) — 33 몬스터 세트, 밀도, ×1.17 HP, 진행 게이지, Rift Fishing(1/69,000), 파일런
- [What are Greater Rifts — PureDiablo](https://www.purediablo.com/gameinfo/greater-rifts-diablo-3) — 세트 랜덤 배정, 진행 오브, 무한 스케일
- [Greater Rift XP/Scaling Table — d3andre](http://www.d3andre.com/en/greater-rifts-table-xp.html) — 구간별 데미지/HP 지수
- [The Pit of Artificers — Maxroll D4](https://maxroll.gg/d4/resources/pit-guide) — 티어=레벨(+1/티어), 엘리트 밀도 우선
- [Nightmare Dungeons — Maxroll D4](https://maxroll.gg/d4/resources/nightmare-dungeons) — 밀도 부스트, 어픽스 계단(3→5)
- [Monster Families — Maxroll D4](https://maxroll.gg/d4/resources/monster-families) — 20 패밀리, 기능 아키타입(스워머/레인지/리테넌트), 지역 테마링, 복합 조우 설계
- [Data-Driven Spawn Tables — Roguelike Tutorial in Rust](https://bfnightly.bracketproductions.com/chapter_46.html) — weight + min/max_depth + add_map_depth_to_weight 가중 추첨
- [Reverse Design: Diablo 2 — The Game Design Forum](https://thegamedesignforum.com/features/RD_D2_6.html) — 몬스터 기능 분류·가속 흐름 설계 사조
