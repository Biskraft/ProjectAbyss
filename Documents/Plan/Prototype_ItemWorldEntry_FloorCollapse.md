# 프로토타입 계획서: 아이템계 진입 바닥 붕괴 연출

> 모루/제단 위에 무기를 올리고 에코로 두드리면, 모루 4타일을 제외한 바닥이 무너지고 아래에 아이템계가 드러나는 연출의 프로토타입.

---

## 문서 정보

| 항목 | 내용 |
| :--- | :--- |
| 작성일 | 2026-03-28 |
| 목표 | 프로그래머가 바로 코딩할 수 있는 수준의 기술 명세 |
| 관련 GDD | `System_ItemWorld_Core.md` § 2.1, `Content_First30Min_ExperienceFlow.md` Screen 9 |
| 예상 작업량 | 2~3일 (1인 기준) |

---

## 1. 목표

브라우저에서 다음을 확인할 수 있다:

1. 에르다가 모루 앞에서 공격 키를 누르면 바닥이 무너진다
2. 모루 아래 2×2 타일만 남고 나머지 바닥이 떨어진다
3. 아래에 아이템계 1지층이 보인다
4. 에르다가 아래로 떨어져 착지한다
5. 에르다가 다른 방으로 이동하면 바닥이 복원된다

---

## 2. 기존 코드 현황

### 사용 가능한 시스템

| 시스템 | 파일 | 상태 | 활용 방법 |
| :--- | :--- | :--- | :--- |
| **씬 스택** | `core/SceneManager.ts` | ✅ 완성 | `push(ItemWorldScene)` / `pop()` 그대로 사용 |
| **물리/충돌** | `core/Physics.ts` | ✅ 완성 | `roomData[row][col] = 0`으로 타일 제거 시 즉시 반영 |
| **타일맵 렌더** | `level/TilemapRenderer.ts` | ✅ 완성 | 타일 제거 후 리렌더 필요 |
| **플레이어** | `entities/Player.ts` | ✅ 완성 | 중력, 이동, 공격 콤보 |
| **카메라** | `core/Camera.ts` | ✅ 완성 | screen shake, 바운드 |
| **아이템계** | `scenes/ItemWorldScene.ts` | ✅ 완성 | 4×4 그리드, 지층 진행 |
| **제단** | `entities/Altar.ts` | ✅ 존재 | 위치/오버랩 판정. 확장 필요 |
| **히트 매니저** | `combat/HitManager.ts` | ✅ 완성 | 공격 판정 |
| **포탈** | `entities/Portal.ts` | ✅ 완성 | 기존 포탈 전환 (참고용) |

### 새로 만들어야 할 것

| 항목 | 설명 |
| :--- | :--- |
| **Anvil 엔티티** | 모루/제단. 에코 공격 감지 + 바닥 붕괴 트리거 |
| **바닥 붕괴 시스템** | 지정 범위 타일을 순차적으로 제거 + 파편 이펙트 |
| **바닥 복원 로직** | 방 이동 시 원래 `roomData` 복원 |

---

## 3. 구현 단계

### Step 1: Anvil 엔티티 (모루/제단)

**파일:** `game/src/entities/Anvil.ts` (신규)

```
Anvil {
  x, y: number           // 모루 위치 (타일 좌표)
  width: 32, height: 16  // 2×1 타일 크기
  item: ItemInstance | null  // 올려놓은 무기 (null이면 비어있음)

  interactable: boolean   // 플레이어가 가까이 있으면 true

  placeItem(item)         // 무기를 모루 위에 올림
  onEchoStrike()          // 에코 공격 감지 시 호출 → 바닥 붕괴 시작
}
```

**상호작용 플로우:**
1. 에르다가 모루 근처에서 UP 키 → 인벤토리 UI → 무기 선택 → `anvil.placeItem(item)`
2. 모루 위에 무기 스프라이트 표시
3. 에르다가 모루를 향해 **공격** (기존 콤보 1타) → 히트 판정이 Anvil에 닿음
4. `anvil.onEchoStrike()` 호출 → Step 2로

**기존 코드 연결:**
- `Altar.ts`의 `overlaps()` 패턴을 참고하되, 공격 히트 판정도 추가
- `HitManager.checkHits()`의 targets에 Anvil을 포함하거나, Player의 공격 hitbox와 Anvil의 AABB를 직접 비교

---

### Step 2: 바닥 붕괴 시스템

**파일:** `game/src/effects/FloorCollapse.ts` (신규)

**입력:** Anvil 위치, 붕괴 반경, roomData 참조

**로직:**

```
FloorCollapse {
  anvilCol, anvilRow: number    // 모루의 타일 좌표
  radius: number                // 붕괴 반경 (레어리티별)
  roomData: number[][]          // 현재 방의 충돌 데이터 참조
  savedTiles: Map<string, number>  // 복원용 원본 저장
  phase: 'idle' | 'cracking' | 'collapsing' | 'done'
  timer: number

  start() → 붕괴 시작
  update(dt) → 프레임별 업데이트
  restore() → 바닥 복원
}
```

**붕괴 시퀀스 (1.5초):**

```
Phase 1: cracking (0~0.4초)
  - 히트스탑 6프레임 (Game.hitstopFrames = 6)
  - 카메라 shake (intensity = 3)
  - 붕괴 범위 내 바닥 타일에 균열 오버레이 스프라이트 표시
  - 모루 아래 2×2 영역은 제외 (보존 타일)

Phase 2: collapsing (0.4~0.8초)
  - 바깥 타일부터 안쪽으로 순차 제거:
    for each ring from outermost to innermost:
      - roomData[row][col] = 0 (충돌 즉시 해제)
      - 해당 타일 위치에 떨어지는 파편 스프라이트 생성
      - ring 간 딜레이 = 0.05초
  - 모루 아래 2×2은 절대 제거하지 않음
  - 카메라 shake (intensity = 5, 점점 증가)

Phase 3: done (0.8초~)
  - 붕괴 완료
  - 에르다가 서 있던 타일이 사라졌으므로 Physics.resolveY에 의해 자동 낙하
  - 아래에 아이템계 1지층 타일맵이 있어야 함 (Step 3)
```

**보존 타일 계산:**

```typescript
function isPreservedTile(col: number, row: number, anvilCol: number, anvilRow: number): boolean {
  // 모루 아래 2×2 영역
  return col >= anvilCol && col < anvilCol + 2
      && row >= anvilRow + 1 && row < anvilRow + 3;
}
```

**파편 이펙트:**

```typescript
// 각 제거된 타일 위치에 작은 사각형 파편 생성
// 초기 vy = -50~-100 (살짝 위로 튀었다 떨어짐)
// gravity 적용
// 화면 밖으로 나가면 제거
// Graphics.drawRect(0, 0, 8, 8) × 2~3개 per tile
```

**레어리티별 반경:**

```typescript
const COLLAPSE_RADIUS: Record<Rarity, number> = {
  normal: 3,      // 6×6 타일
  magic: 4,       // 8×8
  rare: 5,        // 10×10
  legendary: 6,   // 12×12
  ancient: 999,   // 화면 전체
};
```

---

### Step 3: 아이템계 연결

**현재 구조:** `ItemWorldScene`은 별도 씬으로 `push`된다. 월드와 아이템계는 **다른 씬**이다.

**프로토타입 접근법 (간단한 방법):**

바닥 붕괴 후 에르다가 떨어지는 것을 **연출**로만 보여주고, 실제로는 씬 전환한다.

```
1. 바닥 붕괴 완료 (Phase 2 끝)
2. 에르다가 아래로 떨어지기 시작 (vy 증가)
3. 에르다 y가 화면 아래로 나가면 → 화면 페이드 아웃 (0.3초)
4. ItemWorldScene push
5. ItemWorldScene에서 에르다는 위에서 떨어져 착지하는 것으로 시작 (기존 로직)
```

```typescript
// WorldScene 또는 LdtkWorldScene 내
if (floorCollapse.phase === 'done' && player.y > ROOM_HEIGHT * TILE_SIZE) {
  // 플레이어가 화면 아래로 빠짐
  fadeOut(300, () => {
    const itemWorldScene = new ItemWorldScene(game, anvil.item, inventory, player);
    game.sceneManager.push(itemWorldScene);
  });
}
```

**귀환 시:**

```typescript
// ItemWorldScene 탈출 시
game.sceneManager.pop(); // WorldScene으로 복귀
// WorldScene.enter()에서 floorCollapse.restore() 호출
// 에르다를 모루 옆에 배치
```

---

### Step 4: 바닥 복원

**트리거:** `WorldScene.enter()` (ItemWorldScene에서 pop으로 돌아왔을 때)

```typescript
// WorldScene.enter() 또는 resume()
if (this.floorCollapse) {
  this.floorCollapse.restore(); // savedTiles를 roomData에 복원
  this.tilemapRenderer.refresh(); // 타일맵 리렌더
  this.floorCollapse = null;

  // 에르다를 모루 옆에 배치
  this.player.x = this.anvil.x + 32;
  this.player.y = this.anvil.y;

  // 모루 위에 강화된 무기 표시 (스프라이트)
  this.anvil.showEnhancedItem();
}
```

---

## 4. 파일 구조

```
game/src/
├── entities/
│   ├── Anvil.ts          ← 신규: 모루/제단 엔티티
│   ├── Altar.ts          (기존 — 참고용)
│   └── Player.ts         (기존 — 공격 타겟에 Anvil 추가)
├── effects/
│   ├── FloorCollapse.ts  ← 신규: 바닥 붕괴 시스템
│   └── HitSpark.ts       (기존 — 참고용)
├── scenes/
│   ├── WorldScene.ts     (수정: Anvil 배치, 붕괴 트리거, 복원)
│   └── ItemWorldScene.ts (기존 — 변경 최소)
└── core/
    └── Physics.ts        (기존 — 변경 없음, roomData 변경만으로 작동)
```

---

## 5. 구현 순서

| 순서 | 작업 | 예상 시간 | 검증 기준 |
| :--- | :--- | :--- | :--- |
| **1** | `Anvil.ts` — 모루 엔티티 기본 (위치, 렌더, 오버랩 판정) | 2시간 | 모루가 화면에 보이고 에르다가 앞에 서면 힌트 표시 |
| **2** | `Anvil.ts` — 무기 올리기 (UP 키 → 인벤토리 → 선택) | 2시간 | 무기를 올리면 모루 위에 스프라이트 표시 |
| **3** | `Anvil.ts` — 에코 스트라이크 감지 (공격 히트가 모루에 닿으면 트리거) | 2시간 | 공격 시 `onEchoStrike()` 호출 확인 |
| **4** | `FloorCollapse.ts` — Phase 1: cracking (히트스탑 + 균열 오버레이) | 3시간 | 두드리면 바닥에 균열 표시 + 히트스탑 |
| **5** | `FloorCollapse.ts` — Phase 2: collapsing (타일 순차 제거 + 파편) | 3시간 | 바닥이 무너지고 모루 4타일만 남음 |
| **6** | WorldScene — 낙하 → 페이드 → ItemWorldScene push | 2시간 | 떨어지면 아이템계로 전환 |
| **7** | WorldScene — 귀환 시 `restore()` + 모루 옆 복귀 | 1시간 | 아이템계에서 나오면 바닥 복원, 모루 옆에 서 있음 |
| **8** | 레어리티별 반경 차이 + 카메라 shake 강도 | 1시간 | Normal은 작은 구멍, Legendary는 넓은 붕괴 |
| | **합계** | **~16시간 (2일)** | |

---

## 6. 프로토타입 범위 제한

### 포함

- 모루 1개 (월드에 고정 배치)
- 바닥 붕괴 연출 (균열 → 순차 제거 → 파편)
- 모루 4타일 보존
- 아이템계 전환 (기존 씬 push)
- 귀환 시 바닥 복원
- 레어리티별 반경 차이

### 제외 (나중에)

- 필드 균열 제단 (여러 개 배치) → Phase 2
- 기억의 방랑자 (랜덤 출현) → Phase 2
- 인벤토리 UI (프로토에서는 하드코딩된 테스트 아이템 사용)
- 무기 강화 결과 표시 → 기존 ItemWorldScene의 보상 시스템 사용
- ~~재귀적 진입 (아이템계 안에서 다시 진입)~~ → DEPRECATED. 순환 구조로 대체

---

## 7. 테스트 시나리오

| # | 시나리오 | 예상 결과 |
| :--- | :--- | :--- |
| 1 | 모루 앞에서 UP 키 → 무기 선택 → 공격 | 바닥 붕괴 → 낙하 → 아이템계 |
| 2 | 무기 없이 모루 공격 | 아무 일도 안 일어남 (일반 공격) |
| 3 | 바닥 붕괴 중 에르다 위치 | 모루 위 4타일에 서 있거나, 이미 떨어지고 있음 |
| 4 | 아이템계에서 탈출 제단 사용 | 월드로 복귀, 바닥 복원, 모루 옆 |
| 5 | 아이템계에서 사망 | 월드로 복귀, 바닥 복원, 모루 옆 |
| 6 | Normal 아이템으로 진입 | 6×6 붕괴, 약한 shake |
| 7 | Legendary 아이템으로 진입 | 12×12 붕괴, 강한 shake + 불꽃 |
| 8 | 바닥 복원 후 다시 진입 | 정상 작동 (반복 가능) |

---

## 8. 참고 코드 패턴

### roomData 타일 제거 (Physics.ts 호환)

```typescript
// 타일 제거 = 해당 셀을 0으로
roomData[row][col] = 0;
// Physics.resolveX/resolveY가 다음 프레임에서 자동 반영
// isSolid(0) === false → 통과 가능
```

### 카메라 shake (Camera.ts)

```typescript
game.camera.shake(intensity, durationMs);
// intensity: 픽셀 진폭
// 기존 API 그대로 사용
```

### 히트스탑 (Game.ts)

```typescript
game.hitstopFrames = 6;
// 게임 루프에서 hitstopFrames > 0이면 update 스킵
```

### 씬 전환

```typescript
// 아이템계 진입
const scene = new ItemWorldScene(game, item, inventory, player);
await game.sceneManager.push(scene);

// 아이템계 퇴장
game.sceneManager.pop();
```
