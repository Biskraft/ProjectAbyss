# 구현 작업서: A-05 Flier (급강하형 / Spark Bat)

> **준거 상위 (Authority):** T-03
> **상태:** 미구현 (디자인·AI·수치 명세 완비 — `System_Enemy_AI.md` §4.3)
> **우선순위:** P1 (§2.12.5 Phase 1 — 비행·군집 핵심 루프 검증)
> **관련 기획:** `System_Enemy_MonsterArchetype.md` §A-05 · §2.12 · `System_Enemy_AI.md` §4.3 (Spark Bat 파라미터) · ENM-04-C

---

## 1. 개요

**A-05 Flier = 수직 급습(dive-bomber) 위협 축.** 고공 순찰 → 급강하 1회 공격 → 재상승(hit-and-run). 수직 공간을 활성화한다. 캐논 예시 = **Spark Bat**.

- **비행 Charger(MawDrone, A-01)와 구분:** MawDrone은 *지속 추격·접촉*, Flier는 *찍고 빠짐*. 이름이 이동(flying)을 가리키나 정체는 급강하 hit-and-run.
- Type 키 = `SparkBat` (계획명 확정).

---

## 2. 정체성 · 세력 · 배치

- **세력:** 드론(환경 생물) — 평범·무해(정서 중립), 귀엽게 연출 안 함(DEC-044).
- **실루엣:** 날개 달린 반투명 형태 또는 부유 파편 집합체. 16×16px.
- **출현:** 천장 높은 방·수직 샤프트 보유 전 구역 + IW 전 테마. §2.12.2 출현 공간 = 전 구역(수직 구간) + IW. 지층 1 후반 첫 등장.
- **로스터:** A-05 고유 디자인 5종 중 1번 base(§2.12.2).

---

## 3. CSV 스펙 (System_Enemy_AI.md §4.3 → CSV 변환, 승인 대기)

`Sheets/Content_Stats_Enemy.csv` 추가 제안 (§4.3 YAML 기반):

```
SparkBat,1,25,7,1,180,24,50,1500,0,50,flying,
SparkBat,2,63,14,2,200,26,50,1450,0,100,flying,
SparkBat,3,157,28,4,220,28,55,1400,0,200,flying,
```

§4.3 원본 수치: hp25 / atk7 / def1 / spd3.0타일/s / weight0.4. 지층 스케일 hp+0.5·atk+0.3·def+0.15/지층은 `System_Enemy_AI.md` §2.8 계수에 위임. (Archetype 컬럼은 현 CSV 스키마 정합 시 `A-05`.)

---

## 4. AI 거동 스펙 (§4.3 완비 — 요약)

| 상태 | 동작 |
|:---|:---|
| Patrol | 8자(figure_eight) 순찰, 반경 5타일, 중력 무시 비행 |
| Detect | 반경 7타일 전방위 감지, confirm 100ms |
| Dive (windup) | Tell "spark_bat_dive_windup" **350ms**, 머리 위 솟구침 |
| Dive (active) | 고속 하강, hit_active 150ms, 배율 1.2, 넉백 2.5, hitstun light |
| Re-ascend | 즉시 상방 chase_speed×1.5 재상승 → Cooldown |
| Cooldown | 1500ms 후 Patrol/Detect 복귀 |

비행 물리(솔리드 벽 충돌, 플랫폼 통과)는 base `Enemy.update()` flying 분기 상속(Ghost와 동일 경로).

---

## 5. 핵심 난제 · 공정성

- **급강하 궤도 예측 가능성:** Tell 350ms + windup 자세로 하강 시점·지점이 읽혀야 한다(회피 가능). 무경고 급강하 금지.
- **재상승 = 안전 창:** 급강하 후 재상승 구간이 플레이어의 반격 윈도우. 너무 빠른 재돌입 금지(cooldown 1500ms 준수).
- **체공 시 무기 의존성:** 체공 중에는 리치·원거리 무기만 닿는 구간 발생 — 의도된 무기 검증 표면(Chain/Railbow 유리).

---

## 6. 구현 체크리스트

- [ ] **CSV** — `SparkBat` Lv1-3 추가
- [ ] **클래스** — `SparkBat.ts` (`Enemy` flying 상속 + dive FSM). Ghost 비행 이동 참조, dive windup/active/재상승 신규
- [ ] **EnemyFactory** — 유니온 `'SparkBat'` + case 추가
- [ ] **애니/Tell** — `spark_bat_dive_windup` 350ms 텔 모션
- [ ] **LDtk enum** — `MonsterType` 에 `SparkBat` 값
- [ ] **스폰 배치** — 수직 구간 보유 방
- [ ] **로컬라이즈** — 베스티어리 표시명 필요 시 `Content_Localization.csv`

---

## 7. 인수 기준

1. 고공 순찰 중 플레이어가 감지 반경 밖이면 급강하하지 않는다.
2. 급강하는 350ms Tell 후 발동하며 하강 지점이 사전에 읽힌다.
3. 급강하 후 즉시 재상승하고 1500ms 쿨다운 동안 재돌입하지 않는다.
4. 솔리드 벽에 충돌하고 플랫폼/빈 공간은 통과한다.
5. 지속 추격(MawDrone)과 체감이 명확히 다르다 — 붙지 않고 찍고 빠진다.
