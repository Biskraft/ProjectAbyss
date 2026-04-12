# Task: ItemWorld Spawn Weight + Memory Room Clear — Hotfix Brief

> **작성자:** PM
> **작성일:** 2026-04-11
> **우선순위:** P2 (Spawn Weight) + P3 (Memory Room Clear)
> **대상 에이전트:** Gameplay Programmer
> **출처:** Codex 리뷰 (task `biiial5wx`, 워킹 트리 리뷰 결과)
> **영향 파일:** `game/src/scenes/ItemWorldScene.ts` (단일)
> **예상 작업량:** 1-2 커밋, 양쪽 모두 로컬 수정 (리팩터링 없음)

---

## 0. 배경

최근 커밋되지 않은 워킹 트리(`ItemWorldScene.ts` +554줄 수정분)에 대해 Codex 리뷰를 수행한 결과 두 건의 게임플레이 로직 이슈가 발견되었다. 두 건 모두 **국소적(single-file, specific lines) 수정**으로 해결 가능하며, 아키텍처 변경이나 설계 결정 없이 "의도된 동작으로 복귀"시키는 작업이다.

**이 브리프의 목적:** 프로그래머가 즉시 구현에 착수할 수 있도록 현재 코드, 기대 동작, 수정 방향, 수용 기준을 명확히 제시한다.

**범위 외:**
- LDtk Multi-World 병합 관련 변경(같은 파일 내 +554줄) — 건드리지 말 것
- Dialogue/DialogueManager/stats.ts 등 타 시스템의 Zombie Code — 별도 작업
- Memory Room UI/연출 로직 — 이번 작업은 상태 집계/영속화만

---

## 1. 이슈 [P2] — 일반 적 스폰 시 `entry.weight` 무시

### 1.1 위치
- **파일:** `game/src/scenes/ItemWorldScene.ts`
- **함수:** `spawnEnemiesInRoom(col, row)`
- **영향 범위:** `// Normal room — spawn from weighted table` 주석 이후, `normalEntries` 루프 전체 (대략 719-770줄대. Codex 리포트상 742-748줄대)
- **관련 유틸:** `game/src/data/itemWorldSpawnTable.ts:80` `pickWeightedEnemy()`

### 1.2 현재 동작 (버그)

```ts
// Normal room — spawn from weighted table
const normalEntries = spawnTable.normal;
if (normalEntries.length === 0) return;

// CSV-driven spawn: each entry rolls its own count in [minCount, maxCount].
// Total enemies per room = sum of rolled counts across all entries.
let spawnIndex = 0;
for (const entry of normalEntries) {
  const countSeed = this.item.uid * 999 + col * 77 + row * 33 + entry.enemyType.charCodeAt(0) * 17;
  const countRng = new PRNG(countSeed);
  const range = entry.maxCount - entry.minCount;
  const rolledCount = range > 0
    ? entry.minCount + countRng.nextInt(0, range)
    : entry.minCount;

  for (let i = 0; i < rolledCount; i++) {
    // ... spawn logic
  }
}
```

**문제:**
- `normalEntries`의 모든 항목이 **매번 무조건** 자기 count를 굴린다
- `entry.weight` 필드가 **한 번도 읽히지 않는다**
- CSV(`Content_ItemWorld_SpawnTable.csv`)에는 `Weight` 컬럼이 존재하며, `SpawnEntry` 인터페이스와 로더는 정상적으로 `weight` 값을 보존하고 있음
- 주석은 "weighted table"이라고 적혀 있는데 실제로는 가중치가 무시됨

**가시적 증상:** `GoldenMonster` 같은 희귀 적(낮은 Weight)이 일반 optional entry(높은 Weight)와 **동일한 확률**로 등장한다.

### 1.3 기대 동작

**원래 설계 의도 (추정 A — 단일 가중 선택):**
- 일반 방 1개당 한 entry를 가중치 기반으로 **하나만** 선택
- 선택된 entry의 minCount-maxCount 범위에서 count 굴림
- `itemWorldSpawnTable.ts:80`의 `pickWeightedEnemy()`가 이 용도로 이미 존재

**원래 설계 의도 (추정 B — entry별 확률 체크):**
- 각 entry가 자기 Weight를 "이 entry가 등장할 확률"로 사용
- Weight가 높은 entry는 더 자주 등장, 낮은 entry는 드물게
- 여러 entry가 동시에 등장 가능

### 1.4 요구 사항 및 판단 위임

**프로그래머 결정 사항:** A/B 중 어느 해석이 원본 설계 의도인지를 **커밋 히스토리**와 **CSV 데이터 분포**(`game/public/data/Content_ItemWorld_SpawnTable.csv`와 `Sheets/Content_ItemWorld_SpawnTable.csv`)로 판단할 것.

- **Weight 값이 모든 row에서 100에 가까우면** → 추정 B (entry별 확률 체크, 각 row가 거의 확실하게 등장)
- **Weight 값이 row마다 편차가 크면 (예: 10, 50, 100)** → 추정 A (단일 가중 선택, 하나만 뽑음)
- **`GoldenMonster` row의 Weight가 한 자리대** → 추정 A 또는 B 둘 다 가능하지만, 주변 row가 100이면 A에 가까움

### 1.5 구현 가이드

**추정 A의 경우** (`pickWeightedEnemy` 재사용):

```ts
const normalEntries = spawnTable.normal;
if (normalEntries.length === 0) return;

// Room-deterministic weighted pick: 한 방 = 한 entry
const pickSeed = this.item.uid * 999 + col * 77 + row * 33;
const pickRng = new PRNG(pickSeed);
const picked = pickWeightedEnemy(normalEntries, pickRng.next());
if (!picked) return;

// Count roll for the picked entry
const countSeed = pickSeed + picked.enemyType.charCodeAt(0) * 17;
const countRng = new PRNG(countSeed);
const range = picked.maxCount - picked.minCount;
const rolledCount = range > 0
  ? picked.minCount + countRng.nextInt(0, range)
  : picked.minCount;

let spawnIndex = 0;
for (let i = 0; i < rolledCount; i++) {
  // ... 기존 스폰 로직 그대로 (entry → picked로 치환)
}
```

**추정 B의 경우** (entry별 Weight를 100 만점 확률로 해석):

```ts
let spawnIndex = 0;
for (const entry of normalEntries) {
  // entry.weight를 0-100 확률로 사용 (CSV 범위 확인 후 분모 조정 필요)
  const weightSeed = this.item.uid * 999 + col * 77 + row * 33 + entry.enemyType.charCodeAt(0) * 7;
  const weightRng = new PRNG(weightSeed);
  if (weightRng.next() * 100 >= entry.weight) continue; // skip

  // 기존 count 굴림 로직 유지
  // ...
}
```

**어느 쪽이든 `entry.weight`를 읽어야 한다.** 현재처럼 무시하면 안 된다.

### 1.6 수용 기준

- [ ] `entry.weight` 필드를 읽고 스폰 결정에 반영한다
- [ ] `pickWeightedEnemy()` 유틸이 존재하므로 추정 A라면 재사용한다 (중복 구현 금지)
- [ ] 동일 seed로 같은 방을 재진입했을 때 **동일한 스폰 결과**가 나와야 한다 (결정론적 유지)
- [ ] `GoldenMonster` 또는 그 유사 희귀 row가 **이전 버전보다 명확히 덜 등장**해야 한다 (체감 확인)
- [ ] 추정 A/B 중 선택한 근거를 커밋 메시지에 명시한다

---

## 2. 이슈 [P3] — Memory Room 클리어 시 진행률 집계/영속화 누락

### 2.1 위치
- **파일:** `game/src/scenes/ItemWorldScene.ts`
- **함수:** `spawnEnemiesInRoom(col, row)`
- **해당 코드 블록:** 635-639줄 주변 (Memory Room 조기 반환 분기)

### 2.2 현재 동작 (버그)

```ts
private spawnEnemiesInRoom(col: number, row: number): void {
  const cell = this.unifiedGrid.cells[row]?.[col];
  if (!cell || cell.cleared) return;

  // Memory Room — lore pause, no enemies. Mark as cleared to keep it empty.
  if (this.memoryRoomPlacements.has(`${col}:${row}`)) {
    cell.cleared = true;        // ← 플래그만 세팅
    return;                      // ← 조기 반환, 정상 경로 우회
  }
  // ... normal spawn
}
```

**문제:**
1. `this.roomsCleared++` 호출이 빠져 있다 → HUD의 "Rooms N/M" 카운터가 즉시 갱신되지 않음
2. `this.persistRoomState()` 호출이 빠져 있다 → 세이브 상태에 cleared 플래그가 즉시 반영되지 않음
3. `spawnEnemiesInRoom`은 `persistRoomState`가 이미 호출된 **이후**에 실행되는 경우가 있어, 다음 persist 호출 시점까지 stale 상태가 지속된다

### 2.3 정상 클리어 경로 참조

정상 경로(적 처치로 방이 비는 경우)는 `ItemWorldScene.ts:2259-2264`에 이미 존재한다:

```ts
const clearedCell = this.unifiedGrid.cells[r]?.[c];
if (clearedCell && !clearedCell.cleared) {
  clearedCell.cleared = true;
  this.roomsCleared++;
  this.persistRoomState();
}
```

Memory Room 분기도 같은 3 step을 수행해야 한다.

### 2.4 구현 가이드

```ts
// Memory Room — lore pause, no enemies. Mark as cleared to keep it empty.
if (this.memoryRoomPlacements.has(`${col}:${row}`)) {
  if (!cell.cleared) {
    cell.cleared = true;
    this.roomsCleared++;
    this.persistRoomState();
  }
  return;
}
```

**주의 사항:**
- 중복 증가 방지를 위해 `!cell.cleared` 가드 추가
- `roomsCleared++`와 `persistRoomState()` **순서를 정확히** (카운트 증가 후 persist)
- HUD 갱신이 자동이 아니라면 `updateHudText()` 호출도 추가 필요 — 기존 정상 경로가 호출하는지 확인 후 동일 패턴 적용

### 2.5 수용 기준

- [ ] Memory Room 진입 시 `roomsCleared` 카운터가 즉시 증가한다
- [ ] Memory Room 진입 시 `persistRoomState()`가 호출되어 세이브 상태에 반영된다
- [ ] HUD의 "Rooms N/M" 표기가 Memory Room 진입 직후 갱신된다
- [ ] 동일 Memory Room 재진입 시 **중복 카운트 증가가 없다**
- [ ] 아이템계 재입장 시 Memory Room cleared 상태가 복원된다

---

## 3. 테스트 가이드

### 3.1 P2 (Spawn Weight) 검증

1. 아이템계 진입 → 일반 방 5-10개 순회
2. 관찰: `GoldenMonster` 또는 희귀 row 등장 빈도가 **명백히 낮아야** 함
3. 동일 아이템 재진입 → 동일 방 스폰 결과 일치 확인 (결정론)
4. `Content_ItemWorld_SpawnTable.csv` 의 Weight 값을 극단적으로 조정(예: 모두 1 vs 한 row만 100) → 예상대로 분포 바뀌는지 확인

### 3.2 P3 (Memory Room Clear) 검증

1. Memory Room이 배치된 아이템 선택 (`getMemoryRoom(weaponId, stratumIndex)` 반환값 확인)
2. Memory Room 진입 → HUD "Rooms N/M" 카운터 즉시 +1 확인
3. 아이템계 나갔다 재진입 → Memory Room이 `cleared=true`로 복원되는지 확인
4. Memory Room 중복 진입 → 카운터가 또 증가하지 않는지 확인

### 3.3 통합 검증

- [ ] `npx tsc --noEmit` 통과 (타입 에러 없음)
- [ ] `npm run build` 통과 (빌드 에러 없음)
- [ ] 아이템계 1회 풀 플레이 (진입→탐험→보스→나가기) 무버그

---

## 4. 범위 외 / 건드리지 말 것

다음 사항들은 별도 작업으로 분리되어 있으므로 이번 핫픽스에서 건드리지 않는다:

- ❌ `DialogueManager`, `dialogues.ts`, LDtk `DialogueTrigger` — 스펙상 삭제된 Dialogue 시스템 (GDD 정합성 검증 Tier C)
- ❌ `stats.ts`의 6스탯/MP 필드 — 3스탯 리팩터링 대기 중
- ❌ `StrataConfig.ts` 필드명 vs GDD 불일치 — 별도 작업
- ❌ LDtk Multi-World 병합 관련 코드 — 같은 파일의 다른 변경분, 이미 DEC-008에서 검증 완료
- ❌ 내러티브/연출/UI 텍스트 — 이번 작업은 오로지 상태 집계/영속화만
- ❌ CSV 수치 조정 — 로직만 수정, 데이터는 그대로

---

## 5. 커밋 메시지 권장 형식

```
fix(itemworld): spawn weight 반영 + memory room 클리어 집계 누락

## [P2] 일반 적 스폰 시 entry.weight 무시
- 기존: normalEntries 전체를 순회하며 count 굴림, weight 필드 미사용
- 수정: 추정 {A|B} 방식으로 weight 반영
- 근거: {CSV 분포 분석 결과 요약 / pickWeightedEnemy 재사용 등}

## [P3] Memory Room 클리어 시 진행률 갱신 누락
- 기존: cell.cleared 플래그만 세팅 후 조기 반환
- 수정: 정상 클리어 경로와 동일하게 roomsCleared++ + persistRoomState() 호출
- 중복 카운트 방지: !cell.cleared 가드 추가

## 검증
- tsc + build 통과
- 아이템계 풀 플레이 스모크 테스트 완료
- Memory Room 재진입 시 중복 집계 없음 확인

Ref: Codex review task biiial5wx
```

---

## 6. 질문이 있을 때

이 브리프로 명확하지 않은 부분이 있으면 **구현 전에 반드시 질문**할 것. 특히:

1. P2의 추정 A/B 중 선택이 불확실한 경우 → CSV 데이터 공유 후 PM 재확인
2. `persistRoomState()` 호출 타이밍이 기존 다른 코드와 충돌하는 것으로 보이면 → 함수 전체 컨텍스트 공유 후 논의
3. 수정 후 테스트에서 예상 외 동작이 발견되면 → 커밋 전 PM 보고

구현 완료 후에는 **커밋 해시와 git diff stat**을 보고할 것.

---

## 참조

- **Codex 리뷰 원본:** task `biiial5wx`, `/codex:status biiial5wx`에서 조회 가능
- **영향 파일:** `game/src/scenes/ItemWorldScene.ts`
- **관련 유틸:** `game/src/data/itemWorldSpawnTable.ts` (`pickWeightedEnemy`)
- **CSV 데이터:** `Sheets/Content_ItemWorld_SpawnTable.csv`, `game/public/data/Content_ItemWorld_SpawnTable.csv`
- **관련 시스템 문서:** `Documents/System/System_ItemWorld_Core.md`, `Documents/System/System_ItemWorld_FloorGen.md`
- **PM 모드 브리프 표준:** `Documents/Terms/GDD_Writing_Rules.md`
