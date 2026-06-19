# 몬스터 구현 로드맵 (거동 모델 기준)

> **준거 상위:** `Task_Enemy_00_BehaviorCatalog.md` · RES-IWS-01 §7.1 · DEC-052/053
> **상태:** 계획 — 구현 착수 대기
> **모델:** 거동(크기×이동×위협) × 속성(풀) × MOD. **시스템 + 거동 빌드아웃** 구조(몬스터 1:1 아님).
> **현 구현(11):** B02·B04·B05·B09·B11·B13·B17·B18·B22·B31·B43 (`game/src/entities/ArchetypeEnemies.ts` + base).

---

## 의존 그래프 (요약)

```
Phase A (Foundation) ──► Phase B (M1 rust 슬라이스, 검증 게이트)
                          │  PASS
                          ▼
        Phase C (fluid 모듈, 병렬) ─┬─► Phase D (거동 빌드아웃, 병렬)
                                    └─► Phase E (벽/천장 플래그십, 게이트)
```

---

## Phase A — Foundation (순차, 전체 차단)

| ID | 작업 | 파일 | 의존 |
|:--|:--|:--|:--|
| **IMPL-01** | SpawnTable 거동 파서 재작성 — 신 스키마 `Family,Behavior,FluidOverride,MinStratum,MaxStratum,Weight,ClusterMin,ClusterMax` | `game/src/data/itemWorldSpawnTable.ts` | — |
| **IMPL-02** | 거동 FSM 베이스 프레임워크 — 위협 패턴 추상 + **크기(S/M/L) 파라미터화**(스탯·히트박스) | `Enemy.ts` 확장 / 신규 `BehaviorBase` | — |
| **IMPL-03** | 이동(Locomotion) 모듈 5종 — ground/aerial(부유·기동)/stationary/concealed/surface 를 movement strategy 로 분리 | 신규 `LocomotionModule` | IMPL-02 |
| **IMPL-04** | Family→Fluid 매핑 + fluid 모듈 프레임워크(pluggable 라이더: 잔류/접촉/사망). 매핑 SSoT=CSV or 상수 | `Content_FamilyFluid.csv`(또는 상수) + `FluidRider` | — |
| **IMPL-05** | spawnForRoom 예산 채우기 재작성 — Family 필터 + Role 예산 + Family→Fluid 적용. 단일 종 1픽 폐기 | `ItemWorldEnemyEncounterRuntime.ts` | IMPL-01·04 |
| **IMPL-06** | `Content_Enemy.csv` 거동 정합 — `Size`·`Locomotion` 칼럼 추가, `IsNeutralBase` 제거, per-enemy `Attribute` 폐기. 로더 갱신 | `Content_Enemy.csv` · `enemyStats.ts` | — |

---

## Phase B — M1 슬라이스 (rust, 2축 모델 검증 게이트)

| ID | 작업 | 파일 | 의존 |
|:--|:--|:--|:--|
| **IMPL-07** | **acid fluid 모듈**(첫 속성) — 산 웅덩이 DoT/DEF저하. FluidSpawner·화학매트릭스 기존 acid 확인 후 재활용/신규 | `FluidRider(acid)` | IMPL-04 |
| **IMPL-08** | **B04 Swarmer FSM**(지상·근접·소·군집) — CinderImp 패턴 재활용 + 크기 param | `ArchetypeEnemies.ts` | IMPL-02·03 |
| **IMPL-09** | **B07 Gunner FSM**(지상·직사·중·카이팅) — Lobber 후퇴 패턴 + 직사 | `ArchetypeEnemies.ts` | IMPL-02·03 |
| **IMPL-10** | rust 풀 SpawnTable 데이터 + rust test map + 검증 → **2축 PASS/FAIL 게이트** | `Content_ItemWorld_SpawnTable.csv` · LDtk | IMPL-05~09 |

> **Exit:** rust 방이 ≥2 기능군 포함(단일 종 방 0), 산 잔류가 무기 대응 강제, "rust=부식 소모전" 체감 성립 → PASS 시 Phase C/D 착수.

---

## Phase C — Fluid 모듈 잔여 (병렬, Phase B PASS 후)

| ID | 작업 | 의존 |
|:--|:--|:--|
| **IMPL-11** | magma 모듈 (잔열·Burn·magma 풀) | IMPL-04 |
| **IMPL-12** | oil 모듈 (가연 슬릭·시야방해) | IMPL-04 |
| **IMPL-13** | charged 모듈 (감전·연쇄) | IMPL-04 |
| **IMPL-14** | cyro/water 모듈 (결빙 슬로우·전도) | IMPL-04 |

> fluid 모듈은 거동에 pluggable 부착 → 1회 구현으로 전 거동 × 속성 곱셈.

---

## Phase D — 거동 빌드아웃 (병렬, 위협-FSM 단위)

> 신규 거동 ~29(카탈로그 52 − 구현 11 − cut 12). 위협 패턴별 FSM 1개 + 크기/이동 변형. 다수는 기존 FSM의 size/locomotion 파라미터 변형.

| ID | 위협-FSM | 포함 거동(카탈로그) | 의존 |
|:--|:--|:--|:--|
| **IMPL-15** | 돌진(Charge) | B01·B03(대) + 은신 B41/B42 + 벽 B48/B49 | IMPL-02·03 |
| **IMPL-16** | 근접/브루저(Melee) | B06(대) + 은신 B44 + 벽 B50/B51 | IMPL-02·03 |
| **IMPL-17** | 직사(Shoot) | B08·B23·**B24 건쉽** + 고정 B32 + 은신 B45 + 벽 B52 | IMPL-02·03 |
| **IMPL-18** | 포물선(Lob) | B33(고정 모타) + 공중 B25 에어바머 | IMPL-02·03 |
| **IMPL-19** | 방어(Guard) | B12(대) + 고정 B35 벙커 | IMPL-02·03 |
| **IMPL-20** | 소환(Summon) | 고정 B37 토템 + 공중 B27 캐리어 | IMPL-02·03 |
| **IMPL-21** | 봉쇄(AreaDenial) | B15·B16 + 고정 B39 에미터 + 공중 B29/B30 + 은신 B46 | IMPL-02·03·04 |
| **IMPL-22** | 공중 통합(Aerial) | 부유 vs 기동 이동 + B19·B20 등 비행 변형 | IMPL-03 |

> 각 IMPL-15~22 는 해당 위협 FSM + 크기/이동 변형 + (속성은 Phase C 모듈이 곱셈으로 자동). 거동별 스탯밴드·인수기준은 착수 시 거동 카탈로그에서 도출.

---

## Phase E — 벽/천장 플래그십 (게이트, DEC-055)

| ID | 작업 | 의존 |
|:--|:--|:--|
| **IMPL-23** | 표면 부착 이동 모듈(중력 반전·표면 감지·경로) + 스폰 지오메트리(천장/벽 타일 감지) | IMPL-03 + 방 지오메트리 보장 검증 |
| **IMPL-24** | 벽/천장 거동(B48~B52) 활성화, shadow 계열과 데뷔 | IMPL-23 · Phase D |

> 선결조건 통과 후 착수(§6.2 주석). M1~D 와 독립.

---

## Phase F — 특수 (세트피스)

| ID | 작업 | 의존 |
|:--|:--|:--|
| **IMPL-25** | 말소자 4 스킨(Blankmaw·Palewraith·Nullcrawler·Effacer) — 계열 풀 제외, Ch.4/5/6 세트피스 수동 배치, 속성 무바인딩, 디졸브 연출 | Phase D · 연출 |

---

## 우선순위 / 병렬화 요약

1. **Phase A(IMPL-01~06)** — 순차, 전체 기반. 1인 집중 권장.
2. **Phase B(IMPL-07~10)** — rust 슬라이스, 검증 게이트. A 직후.
3. **Phase C(11~14)** — fluid 모듈, 속성당 1인 병렬.
4. **Phase D(15~22)** — 위협 FSM당 1인 병렬(8 트랙).
5. **Phase E(23~24)** — 게이트 통과 후 별도 트랙.
6. **Phase F(25)** — 연출 의존, 후순위.

**총 25 IMPL task.** 코드 FSM ~15-20, 나머지는 모듈/데이터/파라미터.
