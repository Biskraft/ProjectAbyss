# 구현 작업서: 적 수직 추적 (Enemy Vertical Chase)

> **상태:** 미구현
> **우선순위:** P0
> **관련 기획:** `System_Enemy_AI.md` §2.2-A

---

## 문제

Skeleton이 솔리드 바닥 위에 있고 플레이어가 바로 아래에 있을 때, 적은 영원히 플레이어를 추적하지 못한다.

원인: `moveTowardTarget()`이 플레이어의 X좌표만 향해 수평 이동. 플레이어가 바로 아래면 X 차이가 거의 없어 제자리. 바닥이 방 전체를 덮고 있어 떨어질 곳도 없음.

## 해결

**플레이어가 아래에 있으면, 플레이어 X가 아닌 "가장 가까운 바닥 구멍"으로 이동한다.**

바닥 구멍 = 발밑 타일이 air(0)인 열. 대부분 D door 위치 (cols 14-17).

```
BEFORE:  E가 플레이어 X(같은 위치)를 향해 이동 → 제자리

AFTER:   E가 바닥 구멍(cols 14-17)을 향해 이동 → 도착 → 낙하
```

---

## 변경: Skeleton.ts Chase 상태

현재 (line 97-114):
```typescript
// Chase
update: (dt) => {
  // ... lose target 체크 ...
  this.moveTowardTarget(this.moveSpeed);
},
```

변경:
```typescript
// Chase
update: (dt) => {
  // ... lose target 체크 ...

  // 플레이어가 2타일 이상 아래에 있으면: 바닥 구멍을 찾아 이동
  const TILE = 16;
  const targetBelow = this.target &&
    (this.target.y - this.y) > TILE * 2;

  if (targetBelow) {
    const feetRow = Math.floor((this.y + this.height) / TILE);
    const myCol = Math.floor((this.x + this.width / 2) / TILE);
    const gridW = this.roomData[0]?.length ?? 0;
    let gapX: number | null = null;

    // 현재 위치에서 가장 가까운 바닥 구멍 찾기
    for (let offset = 0; offset < gridW && gapX === null; offset++) {
      const r = myCol + offset;
      const l = myCol - offset;
      if (r < gridW && this.roomData[feetRow]?.[r] === 0) {
        gapX = r * TILE + TILE / 2;
      } else if (l >= 0 && this.roomData[feetRow]?.[l] === 0) {
        gapX = l * TILE + TILE / 2;
      }
    }

    if (gapX !== null) {
      // 구멍으로 이동
      this.vx = (gapX > this.x + this.width / 2 ? 1 : -1) * this.moveSpeed;
    } else {
      // 바닥에 구멍 없음 — 도달 불가
      this.vx = 0;
    }
  } else {
    // 같은 높이 또는 플레이어가 위 — 기존 수평 추적
    this.moveTowardTarget(this.moveSpeed);
  }
},
```

**새 메서드 0개.** Chase update 안에서 인라인 처리. 총 약 20줄 추가.

---

## 동작

```
Case A: 바닥에 D 구멍 있음 (일반적)

##############....##############  row 14 (cols 14-17 = air)
      E → → → → ↓                ← 구멍 발견, 이동, 낙하

##############....##############
         X                        ← 착지 후 수평 Chase 재개
```

```
Case B: 바닥에 구멍 없음 (완전 밀폐)

################################  row 14 (전부 solid)
         E                        ← gapX = null. 정지. 도달 불가.

################################
         X
```

Case B는 "이 적은 내려올 수 없다"가 맞음. 방 설계에서 D exit가 없는 셀이면 적은 내려오지 못하는 것이 정상. seal 시스템이 의도적으로 막은 것.

```
Case C: 플레이어가 같은 높이

기존 동작. targetBelow = false. 수평 Chase.
```

```
Case D: 다단 높이 (적이 3층, 플레이어가 1층)

3층: E → 구멍으로 이동 → 낙하
2층: E → 구멍으로 이동 → 낙하
1층: E → 플레이어 수평 Chase
```

---

## Ghost (비행형)

Enemy.ts `moveTowardTarget()` 에 flying 분기 추가:

```typescript
protected moveTowardTarget(speed: number): void {
  if (!this.target) return;

  if (this.movementType === 'flying') {
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;
    this.vx = (dx / dist) * speed;
    this.vy = (dy / dist) * speed;
    return;
  }

  const dir = this.target.x > this.x ? 1 : -1;
  this.vx = dir * speed;
}
```

Ghost는 바닥 구멍 찾기 불필요 — 직선 비행으로 해결.

---

## 변경 파일

| 파일 | 변경 | 규모 |
|:---|:---|:---|
| `Skeleton.ts` | Chase update에 바닥 구멍 탐색 인라인 | ~20줄 |
| `Enemy.ts` | `moveTowardTarget()`에 flying 분기 | ~8줄 |

총 ~28줄. 새 메서드 0개. 새 필드 0개.

---

## 테스트

| # | 상황 | 기대 |
|:---|:---|:---|
| T1 | Skeleton 위, 플레이어 아래, 바닥에 D 구멍 | 구멍으로 이동 → 낙하 → 수평 Chase |
| T2 | Skeleton 위, 플레이어 아래, 바닥 밀폐 | 정지 (도달 불가) |
| T3 | 같은 높이 | 기존 동작 (수평 Chase) |
| T4 | Ghost 위, 플레이어 아래 | 대각선 직선 비행 |
| T5 | 3단 높이 | 층마다 구멍 탐색 → 순차 낙하 |
| T6 | 플레이어가 구멍 바로 아래 | offset=0에서 즉시 발견, 제자리 낙하 |
