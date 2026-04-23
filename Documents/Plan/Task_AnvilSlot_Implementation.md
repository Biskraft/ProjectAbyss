# Task: 앤빌 슬롯 2단계 배치 시스템 구현

> **작성일:** 2026-04-23
> **근거 GDD:** `Documents/UI/UI_Inventory.md` §3.4 anvil 모드 + §3.8
> **근거 리서치:** `Documents/Research/KanaisCube_AnvilSlot_UX_Research.md`
> **예상 공수:** 4-6시간
> **선행 조건:** 없음 (기존 InventoryUI.ts + Anvil.ts 위에 구현)

---

## 목표

인벤토리 anvil 모드에서 **[C] Place → [C] Dive** 2단계 배치 시스템을 구현한다. 아이템이 인벤토리에서 앤빌 슬롯으로 "탁" 날아가는 시각 이펙트를 포함한다.

---

## 구현 항목

### 1. InventoryUI 상태 머신 확장

**파일:** `game/src/ui/InventoryUI.ts`

현재 anvil 모드는 단일 상태(아이템 선택 → X키 확정). 2단계로 확장:

```typescript
// 새 상태 추가
type AnvilState = 'selecting' | 'placed';

// InventoryUI 클래스에 추가
private anvilState: AnvilState = 'selecting';
private anvilItem: ItemInstance | null = null;   // 앤빌에 올려진 아이템
private anvilSlotSprite: Container | null = null; // 앤빌 슬롯 비주얼
```

**상태 전이:**
```
open(anvil) → anvilState = 'selecting'
  → [C] → anvilState = 'placed', anvilItem = selectedItem
    → [C] → onDive(anvilItem), close()
    → [ESC] → anvilState = 'selecting', anvilItem = null
  → [ESC] → close()
```

| 작업 | 상세 | 체크 |
|:-----|:-----|:-----|
| `anvilState` 필드 추가 | `'selecting' \| 'placed'` | [ ] |
| `anvilItem` 필드 추가 | 배치된 아이템 참조 | [ ] |
| `open()` 에서 anvilState 초기화 | `this.anvilState = 'selecting'` | [ ] |
| `close()` 에서 안전망 | anvilItem이 있으면 인벤토리에 복귀 (시각만 — 실제로 인벤토리에서 제거하지 않음) | [ ] |

---

### 2. 키 입력 분기 (anvil 모드)

**파일:** `game/src/ui/InventoryUI.ts` — `handleInput()` 또는 `update()` 내

```typescript
if (this.mode === 'anvil') {
  if (this.anvilState === 'selecting') {
    // 상태 1: 인벤토리 탐색 중
    if (input.isJustPressed(ATTACK)) {  // C키
      const item = this.getSelectedItem();
      if (!item) return;
      if (item.uid === this.inventory.equipped?.uid) {
        this.toast.show('Unequip first');
        return;
      }
      if (!item.canDive) {
        this.toast.show('Cannot dive');
        return;
      }
      this.placeOnAnvil(item);
    }
    // Arrow 탐색: 기존 로직 유지
    // ESC: close()
  } else if (this.anvilState === 'placed') {
    // 상태 2: 앤빌에 배치됨
    if (input.isJustPressed(ATTACK)) {  // C키 → DIVE
      this.confirmDive();
    }
    if (input.isJustPressed(MENU)) {  // ESC → 제거
      this.removeFromAnvil();
    }
    // Arrow: 무시 (return early)
    // Z: Detail View (anvilItem 기준)
  }
}
```

| 작업 | 상세 | 체크 |
|:-----|:-----|:-----|
| `handleInput` 분기 추가 | anvilState 기반 분기 | [ ] |
| C키 selecting 상태 처리 | 검증 → placeOnAnvil() | [ ] |
| C키 placed 상태 처리 | confirmDive() | [ ] |
| ESC placed 상태 처리 | removeFromAnvil() | [ ] |
| Arrow placed 상태 차단 | early return | [ ] |
| Z키 placed 상태 처리 | anvilItem 기준 Detail View | [ ] |

---

### 3. placeOnAnvil() — 배치 로직 + "탁" 이펙트

```typescript
private placeOnAnvil(item: ItemInstance): void {
  this.anvilItem = item;
  this.anvilState = 'placed';

  // 1. 인벤토리 슬롯 시각 변경 (어두워짐)
  const slotIdx = this.inventory.items.indexOf(item);
  this.dimSlot(slotIdx, 0.3);  // alpha 0.3 + "ON ANVIL" 텍스트

  // 2. 아이콘 비행 트윈 (150ms)
  const startPos = this.getSlotScreenPos(slotIdx);
  const endPos = this.getAnvilSlotScreenPos();
  this.playPlaceTween(item, startPos, endPos);

  // 3. 앤빌 슬롯 업데이트 (트윈 완료 후)
  // → drawAnvilSlot(item)
  // → 스파크 파티클
  // → 테두리 플래시
  // → 맥동 시작

  // 4. 하단 힌트 갱신
  this.updateHints('[C]DIVE  [ESC]Remove  [Z]Detail');

  // 5. Info Box를 anvilItem 정보로 갱신
  this.updateInfoBox(item);
}
```

| 작업 | 상세 | 체크 |
|:-----|:-----|:-----|
| `placeOnAnvil(item)` 메서드 | 상태 전환 + 시각 갱신 | [ ] |
| `dimSlot(idx, alpha)` | 슬롯 어둡게 + "ON ANVIL" 텍스트 | [ ] |
| `playPlaceTween(item, from, to)` | 150ms ease-out 아이콘 비행 | [ ] |
| `drawAnvilSlot(item)` | 앤빌 슬롯에 아이콘 + 레어리티 테두리 | [ ] |
| 스파크 파티클 | 착지 시 3-5개 불꽃 (단조 불꽃 색상) | [ ] |
| 테두리 플래시 | 레어리티 색상 200ms 밝게 | [ ] |
| 맥동 시작 | 0.8초 주기 테두리 alpha 진동 | [ ] |
| `updateHints(text)` | 하단 조작 힌트 텍스트 갱신 | [ ] |

---

### 4. removeFromAnvil() — 제거 로직 + 역 이펙트

```typescript
private removeFromAnvil(): void {
  if (!this.anvilItem) return;

  const item = this.anvilItem;
  const slotIdx = this.inventory.items.indexOf(item);

  // 1. 역 비행 트윈 (100ms)
  const startPos = this.getAnvilSlotScreenPos();
  const endPos = this.getSlotScreenPos(slotIdx);
  this.playRemoveTween(startPos, endPos);

  // 2. 인벤토리 슬롯 복원
  this.restoreSlot(slotIdx);  // alpha 1.0, "ON ANVIL" 제거

  // 3. 앤빌 슬롯 초기화
  this.clearAnvilSlot();  // 빈 점선 테두리 복원

  // 4. 상태 복원
  this.anvilItem = null;
  this.anvilState = 'selecting';
  this.selectedIndex = slotIdx;  // 커서를 원래 슬롯으로

  // 5. 하단 힌트 갱신
  this.updateHints('[C]Place  [Z]Detail  [ESC]Close');
}
```

| 작업 | 상세 | 체크 |
|:-----|:-----|:-----|
| `removeFromAnvil()` 메서드 | 역 전환 + 시각 복원 | [ ] |
| `playRemoveTween(from, to)` | 100ms ease-in 역 비행 | [ ] |
| `restoreSlot(idx)` | alpha 1.0 복원 | [ ] |
| `clearAnvilSlot()` | 빈 점선 테두리 | [ ] |
| 커서 복원 | selectedIndex를 원래 슬롯으로 | [ ] |

---

### 5. confirmDive() — 다이브 확정

```typescript
private confirmDive(): void {
  if (!this.anvilItem) return;

  // 기존 anvil 모드의 onSelect 콜백 호출
  if (this.onAnvilSelect) {
    this.onAnvilSelect(this.anvilItem);
  }

  // 상태 초기화 (close가 처리)
  this.anvilItem = null;
  this.anvilState = 'selecting';
}
```

| 작업 | 상세 | 체크 |
|:-----|:-----|:-----|
| `confirmDive()` | 기존 `onAnvilSelect` 콜백 연결 | [ ] |
| 기존 `openForAnvil(onSelect)` 시그니처 유지 | 하위 호환 | [ ] |

---

### 6. 앤빌 슬롯 비주얼 (신규 그래픽)

**파일:** `game/src/ui/InventoryUI.ts` — `draw()` 또는 별도 `drawAnvilSlot()` 메서드

```typescript
private createAnvilSlotVisual(): void {
  const slot = new Container();

  // 빈 슬롯 (점선 테두리)
  const border = new Graphics();
  border.rect(0, 0, 32, 32);
  border.stroke({ width: 1, color: 0x666666, dash: [3, 2] });
  // PixiJS v8: dash는 직접 구현 필요 (4개 선분으로 점선 근사)

  // 라벨
  const label = new BitmapText({ text: 'ANVIL', style: { fontSize: 6 } });
  label.anchor.set(0.5);
  label.position.set(16, 38);

  slot.addChild(border, label);
  this.anvilSlotSprite = slot;
  // Info 영역 중앙에 배치
}
```

| 작업 | 상세 | 체크 |
|:-----|:-----|:-----|
| 빈 슬롯 Graphics | 32x32 점선 테두리 | [ ] |
| "ANVIL" 라벨 | 슬롯 아래 6px 텍스트 | [ ] |
| 배치됨 상태 | 아이템 아이콘 + 레어리티 색상 실선 테두리 | [ ] |
| 맥동 애니메이션 | 0.8초 주기 테두리 alpha 0.5~1.0 | [ ] |
| 패널 레이아웃 조정 | PANEL_W 확장하여 앤빌 슬롯 영역 확보 | [ ] |

---

### 7. 하단 힌트 시스템

**파일:** `game/src/ui/InventoryUI.ts`

현재 하단 힌트는 Info Box 내에 고정 텍스트. 상태별로 갱신해야 함.

```typescript
private updateHints(text: string): void {
  if (this.hintText) {
    this.hintText.text = text;
  }
}
```

| 상태 | 힌트 텍스트 |
|:-----|:-----------|
| inventory 모드 | `[Z]Detail [X]Equip [C]Compare` |
| anvil selecting | `[C]Place [Z]Detail [ESC]Close` |
| anvil placed | `[C]DIVE [ESC]Remove [Z]Detail` |

| 작업 | 상세 | 체크 |
|:-----|:-----|:-----|
| `hintText` BitmapText 참조 | 하단 힌트 텍스트 객체 | [ ] |
| `updateHints()` 메서드 | 상태별 텍스트 갱신 | [ ] |
| 모드 전환 시 힌트 초기화 | open() 시 모드별 기본 힌트 설정 | [ ] |

---

### 8. 타이틀 변경

| 모드 | 타이틀 |
|:-----|:-------|
| inventory | "INVENTORY" (기존) |
| anvil (기존) | ~~"FORGE -- SELECT WEAPON"~~ |
| **anvil (변경)** | **"FORGE"** |

이유: 2단계 배치 시스템에서는 "SELECT WEAPON"이 불필요. 배치 전/후 상태가 자명.

---

## 검증 체크리스트

### 기능 검증

- [ ] 앤빌 근접 C키 → FORGE UI가 좌측 인벤토리 + 우측 앤빌 슬롯으로 열림
- [ ] 인벤토리에서 아이템 선택 후 C키 → 아이템이 앤빌 슬롯으로 "탁" 비행
- [ ] 비행 완료 후 인벤토리 슬롯이 어두워지고 "ON ANVIL" 표시
- [ ] 앤빌 슬롯에 아이콘 + 레어리티 색상 맥동
- [ ] 배치 후 C키 → DIVE 확정 (기존 다이브 프리뷰/연출로 이행)
- [ ] 배치 후 ESC → 아이템이 앤빌에서 인벤토리로 역비행, 슬롯 복원
- [ ] 배치 후 Arrow키 비활성 확인
- [ ] 장착 중 아이템에 C키 → "Unequip first" 토스트, 배치 차단
- [ ] Broken Blade에 C키 → "Cannot dive" 토스트, 배치 차단
- [ ] UI 닫기(I/ESC) 시 앤빌 아이템 자동 인벤토리 복귀
- [ ] 하단 힌트가 상태별로 정확히 갱신됨

### 경험 검증

- [ ] "탁" 배치가 물리적 만족감을 준다 (금속 위에 무기를 올려놓는 느낌)
- [ ] 2단계 확인(Place → Dive)이 실수를 방지하면서도 번거롭지 않다
- [ ] ESC 취소가 직관적이다 (배치 전 ESC=닫기, 배치 후 ESC=제거)
- [ ] 인벤토리 모드(I키)와 앤빌 모드(C키)의 조작 차이가 혼동되지 않는다

### 회귀 검증

- [ ] 인벤토리 모드(I키)에서 C키 = Compare Mode가 정상 동작
- [ ] 인벤토리 모드에서 X키 = Equip이 정상 동작
- [ ] 기존 SacredPickup 플로우 (S5→S6→S7) 가 정상 동작
- [ ] ProximityRouter의 앤빌 핸들러가 기존대로 동작

---

## 변경 이력

| 날짜 | 변경 | 근거 |
| :--- | :--- | :--- |
| 2026-04-23 | 작업 사양서 신규 작성 | D3 Kanai's Cube UX 리서치 기반, UI_Inventory.md §3.4/§3.8 갱신 |
