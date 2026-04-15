# System_Enemy_Spawning.md — 적 스폰 시스템

> **작성 기준:** 코드 역기획서 (Code-First Reverse GDD)
> **소스 파일:** `game/src/data/itemWorldSpawnTable.ts`, `game/src/data/enemyStats.ts`, `game/src/scenes/ItemWorldScene.ts` (spawnEnemiesInRoom)
> **데이터 SSoT:** `Sheets/Content_ItemWorld_SpawnTable.csv`, `Sheets/Content_Stats_Enemy.csv`
> **필수 참고:** `Documents/Terms/Project_Vision_Abyss.md`, `Documents/Terms/GDD_Writing_Rules.md`

---

## 1. 개요

아이템계(Item World) 내의 모든 방은 플레이어가 최초 진입하는 순간 적 스폰이 결정된다 (Lazy Spawn). 스폰 데이터는 `Content_ItemWorld_SpawnTable.csv`를 단일 진실 소스(SSoT)로 삼아 빌드 타임에 파싱되며, Rarity x Stratum 조합으로 인덱싱된다. 각 방의 타입(Combat, Boss, Rest, Treasure, Puzzle)에 따라 서로 다른 스폰 규칙이 적용되고, 결정론적 PRNG(시드: `item.uid * 999 + col * 77 + row * 33`)를 사용해 동일 아이템은 항상 동일한 방 구성을 재현한다.

---

## 2. 설계 의도 (Design Intent)

**핵심 판타지:** 아이템계는 "무기의 기억 속에서 더 강한 존재와 싸운다"는 경험을 제공해야 한다. 레어리티가 높을수록 더 희귀하고 강한 적이 등장하며, 지층이 깊어질수록 위협이 증가한다는 명확한 성장 긴장감을 만들어야 한다.

**MDA 설계 목표:**
- **Aesthetic:** Challenge(숙련도 도전) + Discovery(GoldenMonster 우연한 조우)
- **Dynamic:** 플레이어가 방 타입을 읽고 전략적으로 진입 순서를 선택
- **Mechanic:** Weight 기반 확률 풀 + 방 타입 분기 + Cycle 레벨 스케일링

**SDT 검증:**
- Competence: 지층 깊이에 비례한 난이도 상승으로 성장감 제공
- Autonomy: Rest/Puzzle 방 선택으로 전투 페이스 조절 가능
- Relatedness: 보스 처치 후 방 클리어 카운터 갱신으로 진행 피드백 제공

---

## 3. 상세 규칙 (Detailed Rules)

### 3.1 CSV SSoT 구조

```
Rarity, Stratum, EnemyType, Weight, Level, MinCount, MaxCount, IsBoss
```

- **인덱스 키:** `"rarity:stratum"` 문자열 (예: `"magic:2"`)
- **IsBoss = true:** SpawnBucket.boss 필드에 단일 항목으로 저장 (normal 배열 제외)
- **IsBoss = false:** SpawnBucket.normal 배열에 추가
- CSV는 빌드 타임에 `?raw` import로 동기 파싱 — 런타임 fetch 없음

### 3.2 Lazy Spawn 트리거

1. 플레이어가 방(col, row)에 최초 진입
2. `spawnEnemiesInRoom(col, row)` 호출
3. `cell.cleared === true`이면 즉시 반환 (재진입 시 재스폰 없음)
4. 방 타입(roomType)에 따라 분기 처리

### 3.3 방 타입별 스폰 규칙

| 방 타입 | 스폰 내용 | 클리어 조건 |
|---------|----------|------------|
| **Combat** | 가중치 기반 무작위 적 1종 + MinCount-MaxCount마리 | 모든 적 처치 |
| **Boss** | SpawnBucket.boss의 단일 보스 (cycle 레벨 보정) | 보스 처치 |
| **Treasure** | GoldenMonster 1마리 (엘리트 인카운터) | GoldenMonster 처치 |
| **Rest** | 적 없음 + HealingPickup 1-2개 | 즉시 클리어 |
| **Puzzle** | 적 없음 (LDtk 템플릿 오브젝트가 퍼즐 구성) | 퍼즐 해결 시 수동 클리어 |
| **Stratum Start** | 안전 지역 — 스폰 없음 | 즉시 클리어 |
| **Memory Room** | 스폰 없음 (로어 장면) | 즉시 클리어 |

### 3.4 일반 방 스폰 알고리즘

```
1. PRNG(seed = item.uid * 999 + col * 77 + row * 33)
2. pickWeightedEnemy(normalEntries, rng.next()) → SpawnEntry 1종 선택
3. countRng(seed + enemyType.charCodeAt(0) * 17) → [minCount, maxCount] 범위에서 정수 롤
4. 각 적마다:
   a. innocentRoll < INNOCENT_SPAWN_CHANCE(15%)이면 InnocentNPC 스폰
   b. 아니면 picked.enemyType 적 스폰
5. 스폰 위치: 공기 타일 + 아래 1칸 솔리드 타일 조건의 유효 위치에서 무작위 선택
   (룸 경계 2타일 마진 유지)
```

### 3.5 가중치 선택 알고리즘 (pickWeightedEnemy)

```
totalWeight = sum(entry.weight for entries)
누적합 순회 → roll * totalWeight < cumulative이면 해당 항목 반환
마지막 항목은 fallback (부동소수점 오차 방지)
```

### 3.6 스탯 스케일링

보스를 포함한 모든 적 스탯에 두 가지 승수가 적용된다:

| 승수 | 적용 대상 | 수식 |
|------|----------|------|
| `stratumDef.hpMul` | HP | `floor(baseHp * hpMul * distScale)` |
| `stratumDef.atkMul` | ATK | `floor(baseAtk * atkMul * distScale)` |
| `stratumDef.bossHpMul` | 보스 HP | `floor(baseHp * bossHpMul)` |
| `stratumDef.bossAtkMul` | 보스 ATK | `floor(baseAtk * bossAtkMul)` |
| `distScale` | 거리 보정 | `1 + distance * 0.1` (맨해튼 거리) |

- **Cycle 레벨 보정:** `picked.level + cycle` — 같은 아이템을 재진입할 때마다 +1 레벨 (CSV에 정의된 다음 행의 스탯 사용)
- **최솟값:** HP와 ATK 모두 1 미만 불가 (`Math.max(1, ...)`)

### 3.7 EnemyStats 조회

```
getEnemyStats(type, level) → ENEMY_STATS.get("Type:Level")
폴백 순서: level N → level 1 → 하드코딩 기본값 (hp:50, atk:10, def:1, ...)
```

### 3.8 GoldenMonster 희귀도

| 레어리티 | 지층 | Weight (일반 풀) | 비고 |
|---------|------|----------------|------|
| magic | 2, 3 | 10 / 100 | 10% 확률 |
| rare | 1, 2, 3 | 10-20 / 100 | 10-17% |
| legendary | 1-4 | 20-30 / 100 | 17-25% |
| ancient | 1-4 | 30-60 / 100 | 30-60% |

- normal 레어리티에는 GoldenMonster가 스폰되지 않음
- Treasure 방에서는 레어리티/지층 무관하게 무조건 GoldenMonster 1마리 강제 스폰
- `rollGoldenDrop()`: GoldenMonster는 아이템 드롭 보장 (rare 등급 이상)

### 3.9 리스폰 규칙

- **리스폰 없음:** `cell.cleared = true`가 되면 재진입 시 스폰 경로 완전 스킵
- 클리어 조건: 방의 모든 `_roomKey` 태그 적의 수가 0이 될 때 `cell.cleared = true` 설정
- Puzzle 방은 퍼즐 해결 이벤트에서 수동으로 cleared 설정

---

## 4. 공식 (Formulas)

### 적 HP 최종값

```
finalHp = max(1, floor(csvHp * stratumHpMul * distScale))
distScale = 1 + (|col - startCol| + |row - startRow|) * 0.1
```

### 보스 HP 최종값

```
bossHp = max(1, floor(csvHp * stratumBossHpMul))
(distScale 미적용 — 보스는 고정 강도)
```

### Cycle 스케일링

```
effectiveLevel = csvLevel + cycle
getEnemyStats(type, effectiveLevel)
```

예시 계산: magic 레어리티 지층 2, Guardian 보스, cycle=1
- CSV: Guardian level 2, HP=1200, ATK=60
- bossHpMul 가정 2.5 → HP = floor(1200 * 2.5) = 3000
- effectiveLevel = 2 + 1 = 3 → getEnemyStats("Guardian", 3) → HP=2400, ATK=80
- finalBossHp = floor(2400 * 2.5) = 6000

---

## 5. 엣지 케이스 (Edge Cases)

| 상황 | 처리 방식 |
|------|----------|
| 유효 스폰 위치가 0개 | `spawnPoints.length === 0`이면 스폰 전체 스킵 (방 미클리어 유지) |
| CSV에 해당 rarity:stratum 키 없음 | `{ normal: [], boss: null }` 반환 — 스폰 없음 |
| EnemyStats에 (type, level) 없음 | level 1 폴백 → 하드코딩 기본값 폴백 |
| pickWeightedEnemy entries 빈 배열 | null 반환 — 스폰 없음 |
| Cycle 레벨이 CSV 최대 레벨 초과 | getEnemyStats가 level 1 폴백 (레벨 상한 없이 계속 강해지지 않음) |
| 보스 방인데 spawnTable.boss = null | 보스 스폰 스킵 (방은 미클리어 상태로 남음) |
| Treasure 방 + 스폰 위치 없음 | gold 스폰 후 addChild 시도 — spawnPoints는 이미 계산됨, 0개면 y좌표 오류 가능 (미처리 엣지 케이스) |
| InnocentNPC 스폰 후 item.innocentSlots 초과 | `canAddInnocent()` 체크로 사전 차단 |
| 동일 씨드로 다른 아이템 UID | UID 기반 씨드로 아이템별 고유 방 배치 보장 |

---

## 6. 의존성 (Dependencies)

| 방향 | 시스템 | 계약 |
|------|--------|------|
| 읽음 | `Content_ItemWorld_SpawnTable.csv` | Rarity x Stratum별 SpawnEntry 목록 |
| 읽음 | `Content_Stats_Enemy.csv` | Type x Level별 EnemyStatEntry (HP, ATK, DEF, etc.) |
| 읽음 | `ItemWorldScene.unifiedGrid` | 방 타입, 지층 인덱스, 방 클리어 상태 |
| 읽음 | `strataConfig.strata[i]` | hpMul, atkMul, bossHpMul, bossAtkMul |
| 쓰기 | `cell.cleared` | 방 클리어 상태 영속화 |
| 쓰기 | `roomEnemyCount` | 방별 생존 적 카운터 |
| 제공 | Enemy 인스턴스 배열 | `enemies[]`, `entityLayer` 에 추가 |
| 호출 | `ItemDrop.rollGoldenDrop()` | GoldenMonster 처치 시 아이템 드롭 |
| 호출 | `InnocentNPC` 생성자 | INNOCENT_SPAWN_CHANCE 조건부 대체 스폰 |

---

## 7. 튜닝 노브 (Tuning Knobs)

| 노브 | 위치 | 범위 | 카테고리 | 기본값 | 설명 |
|------|------|------|----------|--------|------|
| Weight (각 EnemyType) | CSV col 4 | 0-100 | Feel | 가변 | 방당 등장 빈도 |
| MinCount / MaxCount | CSV col 6-7 | 1-5 | Gate | 가변 | 방당 적 수 |
| Level (CSV) | CSV col 5 | 1-3 | Curve | 가변 | 기준 스탯 레벨 |
| INNOCENT_SPAWN_CHANCE | `ItemWorldScene.ts` | 0-0.5 | Gate | 0.15 (15%) | 이노센트 NPC 대체 확률 |
| distScale coefficient | `ItemWorldScene.ts` | 0-0.5 | Curve | 0.1 | 거리당 스탯 증가율 |
| RING_DELAY (보스 스폰 전 평탄 바닥 탐색 타일) | `ItemWorldScene.ts` | 8-32 | Feel | 16 | 보스 배치 선호 바닥 길이 |

---

## 8. 검증 체크리스트 (Acceptance Criteria)

**기능 검증:**
- [ ] normal:1 방에서 Slime 70%, Skeleton 30% 비율로 스폰됨 (100회 시뮬레이션)
- [ ] Boss 방에서는 반드시 단 1마리의 보스만 스폰됨
- [ ] Rest 방 재진입 시 HealingPickup이 재생성되지 않음
- [ ] 동일 아이템 UID로 아이템계 재진입 시 동일 방 구성 재현
- [ ] ancient:3 방에서 GoldenMonster가 60% 확률로 등장 (통계 검증)
- [ ] Cycle+1 시 모든 적의 레벨이 +1 증가함
- [ ] 스폰 위치가 항상 공기 타일 + 솔리드 바닥 조건을 만족함

**경험 검증:**
- [ ] normal 레어리티 아이템에서는 GoldenMonster가 등장하지 않음
- [ ] ancient 레어리티 지층 3-4에서는 Ghost/GoldenMonster가 주력 적으로 체감됨
- [ ] Rest 방은 전투 없이 회복만 제공하는 "숨 고르기" 공간으로 인식됨
- [ ] Treasure 방의 GoldenMonster는 일반 전투보다 긴장감 있게 느껴짐

---

## 구현 현황

| 기능 | 상태 | 비고 |
|------|------|------|
| CSV SSoT 파싱 (빌드 타임) | 구현 완료 | `itemWorldSpawnTable.ts` |
| Lazy Spawn (최초 진입 트리거) | 구현 완료 | `spawnEnemiesInRoom()` |
| 방 타입별 분기 (Combat/Boss/Rest/Treasure/Puzzle) | 구현 완료 | roomTypeMap 기반 |
| 가중치 선택 알고리즘 | 구현 완료 | `pickWeightedEnemy()` |
| Cycle 레벨 스케일링 | 구현 완료 | `cycle = progress?.cycle ?? 0` |
| distScale 거리 보정 | 구현 완료 | 맨해튼 거리 * 0.1 |
| InnocentNPC 15% 대체 스폰 | 구현 완료 | |
| Treasure 방 스폰 위치 0개 엣지 케이스 | 미처리 | 버그 가능성 있음 |
| GoldenMonster 드롭 보장 | 구현 완료 | `rollGoldenDrop()` |
