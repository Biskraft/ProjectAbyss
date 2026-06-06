# 구현 작업서: 비행형 Charger (Flying Charger / MawDrone)

> **준거 상위 (Authority):** T-03
> **상태:** 미구현 (데이터만 추가됨 — CSV 행 완료)
> **우선순위:** P1
> **관련 기획:** `System_Enemy_MonsterArchetype.md` §A-01 (Charger) · §2.12 (로스터) · `System_Enemy_AI.md` §2.2 (이동 타입) · §4.x

---

## 1. 개요

**비행형 Charger = A-01 Charger 위협 축(근접 추적·접촉 타격)에 `MovementType=flying` 이동을 결합한 변형.**
공중에 부유하다 플레이어 감지 시 직선으로 접근해 붙어서 근접 타격하는 지속 추격자(박쥐/나방형).

- **새 아키타입 아님.** §1.3 규칙 1(위협 축 신설 시에만 신규 아키타입)을 충족하지 않는다 — 기존 Charger 축 + 이동 변형이므로 그대로 합법. 선례: Ghost = A-03a Shooter + flying.
- 분류상 명칭 = **Charger (A-01)**. 코드/데이터 Type 키 = `MawDrone` (임시명, 개명 가능).

### A-05 Flier와의 구분 (혼동 금지)

| | 위협 패턴 | 체감 |
|:---|:---|:---|
| **A-05 Flier** (Spark Bat) | 고공 순찰 → **급강하 1회 → 재상승** (hit-and-run, 수직) | 위에서 찍고 빠진다 |
| **비행 Charger** (MawDrone) | **지속 추적 → 붙어서 근접 연타** (relentless, 추격) | 계속 달라붙는다, 떼어내야 함 |

원거리 공격 없음. 투사체 없음. 접촉/근접 단타만.

---

## 2. 정체성 · 세력 · 배치

- **세력:** 드론(환경 생물) — 평범·무해(정서 중립). **귀엽게 연출하지 않는다** (DEC-044, 2026-06-05 정합). 거대구조물 생태의 일부.
- **실루엣:** 32px 소형, 둥근 단순 비행체(박쥐/나방/부유 파편형). 환경 색온에 동화(채도 낮음).
- **출현 구역:** 수직 구간이 있는 전 구역 + 아이템계 전 테마. 특히 천장이 높은 방·수직 샤프트에서 압박이 성립.
- **로스터 슬롯:** §2.12.2 Charger 고유 디자인 5종 중 1슬롯으로 흡수(신규 슬롯 추가 아님).

---

## 3. CSV 스펙 (완료)

`Sheets/Content_Stats_Enemy.csv` — Ghost 블록 뒤 삽입:

```
MawDrone,1,60,12,1,180,20,52,1000,0,70,flying,
MawDrone,2,150,24,2,200,22,52,950,0,140,flying,
MawDrone,3,375,48,4,220,24,55,900,0,280,flying,
```

| 칼럼 | Lv1 | Lv2 | Lv3 | 설계 의도 |
|:---|:---:|:---:|:---:|:---|
| HP | 60 | 150 | 375 | Ghost(48)와 Skeleton(96) 사이. 하우스 스케일 2.5× |
| ATK | 12 | 24 | 48 | 접촉 단타. 2× 스케일 |
| DEF | 1 | 2 | 4 | 경량 비행체 — 낮음 |
| DetectRange | 180 | 200 | 220 | 공중 광역 감지 |
| AttackRange | 20 | 22 | 24 | 근접/접촉 (Skeleton 18-22와 동급, 원거리 아님) |
| MoveSpeed | 52 | 52 | 55 | Ghost(40-50)·Skeleton(45)보다 빠름 — 추격 압박 |
| AttackCooldown | 1000 | 950 | 900 | Skeleton(1200-1000)보다 짧음 — 지속 압박 |
| JumpTiles | 0 | 0 | 0 | 비행체 — 점프 미사용 |
| Exp | 70 | 140 | 280 | 2× 스케일 |
| MovementType | flying | flying | flying | 핵심 — Charger 뇌 + 비행 이동 |
| Attribute | (공백) | | | 테마 바인딩으로 속성 자동 부여 (V1 미지정) |

아이템계 지층 스케일링은 `System_Enemy_AI.md` §2.8 수치 계수에 위임(행동 불변).

---

## 4. AI 거동 스펙

FSM은 **Ghost의 비행 이동 + Skeleton의 근접 추격/공격**을 합성한다. 신규 로직 최소화.

| 상태 | 동작 | 재사용 소스 |
|:---|:---|:---|
| **Idle/Patrol** | 부유. 좌우/8자 완만 순찰. 중력 무시 | Ghost 비행 이동 |
| **Detect** | `DetectRange` 반경 내 플레이어 진입 → Chase (반경 단독 감지, FoV 없음 — `System_Enemy_AI.md` §2.3) | 공통 감지 |
| **Chase** | 플레이어를 향해 **직선 비행**(X·Y 동시). 플랫폼·빈 공간 통과, **솔리드 벽(IntGrid 1)에는 충돌**(벽 통과 금지 — 공정성) | Ghost 이동 + Skeleton chase 의도 |
| **Attack** | `AttackRange` 도달 시 전방 근접 1타. Tell(접근 정지/몸 솟구침) **≥300ms** | Skeleton 근접 공격 + Tell |
| **Cooldown** | `AttackCooldown` 후 재추적 | Skeleton |

- 접촉 데미지 vs 능동 근접 1타 중 택1: **능동 근접 1타(Tell 동반)** 권장 — 순수 접촉 데미지는 공정성 신호(Tell)가 없어 회피 불가가 된다.
- 원거리/투사체 분기 없음.

---

## 5. 공정성 제약 (P0)

비행 + 지속 추격은 좁은 공간에서 회피 불가가 되기 쉽다. 다음을 강제한다.

1. **솔리드 벽 충돌 유지** — 벽 통과 금지. 플레이어가 벽 뒤/모서리로 시야선을 끊으면 추격 경로가 막힌다.
2. **Tell ≥300ms** — 모든 근접 타격은 사전 신호 필수(`System_Enemy_AI.md` 최소 300ms 규칙).
3. **lose_target 지연** — 감지 이탈 후 일정 시간(예: 1000ms) 뒤 Patrol 복귀. 영구 추격 금지.
4. **좁은 통로 배치 금지** — 레벨 배치 시 1-2타일 폭 통로에는 비행 Charger를 두지 않는다(수직 구간·개방 공간 전용). 레벨 디자인 가이드에 반영.
5. **동시 출현 상한** — 군집 압박 방지. 1 화면당 ≤2체 권장(Swarmer와 구분).

---

## 6. 구현 체크리스트

- [x] **CSV 행 추가** — `Content_Stats_Enemy.csv` MawDrone Lv1-3 (완료)
- [ ] **EnemyFactory** — `EnemyTypeName` 유니온에 `'MawDrone'` 추가 + `case 'MawDrone'` 추가 (`game/src/entities/EnemyFactory.ts`)
- [ ] **런타임 클래스** — `MawDrone.ts` 신규 또는 Ghost 비행 이동 + Skeleton 근접 공격 합성. (`game/src/entities/`)
  - Ghost.ts(비행 이동)·Skeleton.ts(chase/Tell/근접 1타) 참조
  - 투사체 로직 미포함
- [ ] **LDtk enum** — `World_ProjectAbyss.ldtk` `MonsterType` enum 에 `MawDrone` 값 추가(에디터에서 추가 권장 — 손편집 시 JSON 콤마 주의)
- [ ] **스폰 배치** — 수직 구간 보유 구역에 배치(§2.12 출현 공간 정합)
- [ ] **로컬라이즈** — 베스티어리 표시명이 필요하면 `Sheets/Content_Localization.csv` 에 키 등록(코드 하드코딩 금지)

---

## 7. 인수 기준

1. 공중 부유 상태에서 플레이어가 `DetectRange` 밖이면 추격하지 않는다.
2. 감지 시 직선 비행으로 접근하고, 솔리드 벽에 막히면 통과하지 못한다.
3. 근접 도달 시 Tell(≥300ms) 후 1타. 원거리 투사체를 쏘지 않는다.
4. 좁은 통로가 아닌 개방·수직 공간에서 회피 가능한 페이싱으로 압박한다.
5. 지층/레벨 스케일링이 수치 계수로 적용되고 행동은 불변이다.

---

> **명칭 주의:** `MawDrone` 은 임시 데이터 키다. 베스티어리 표시명·최종 명칭은 아트/내러티브 확정 시 교체한다. 분류상 아키타입은 **A-01 Charger** 로 유지(비행은 이동 변형).
