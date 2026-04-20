# UI Interaction Patterns - 3-Pattern Unification

> 모든 UI 인터랙션은 3가지 패턴 중 하나에 속한다. 예외 없음.

---

## Reference Game Analysis

4개 레퍼런스 게임에서 도출한 UI/UX 설계 원칙.

### Cross-Game Comparison

| 항목 | SotN | Disgaea | Spelunky 2 | Dead Cells | ECHORIS |
|------|------|---------|-----------|-----------|---------|
| Confirm | X (Jump) | X/O | Interact | Interact | **C** |
| Cancel | O (Attack) | O/X | None | ESC only | **ESC** |
| Navigate | D-pad | D-pad | N/A | D-pad | **Arrow** |
| Inventory | List (SELECT) | List+Context | None | None | Grid (I) |
| Item Pickup | Auto+Toast | Battle Result | Manual, no confirm | Manual, tooltip | Manual, tooltip |
| Important Pickup | Blocking popup | Blocking | None | None | Blocking (Pattern B) |
| Floor Transition | N/A | Instant (portal) | Instant (door) | Instant (door) | Instant (portal) |
| Boss Clear Choice | None | Yes/No exit prompt | None | None (physical loot) | C=Continue/ESC=Exit |
| Map | Pause (START) | None | None | Overlay minimap | Overlay (M toggle) |

### 5 Design Principles from References

**1. Don't break flow**
- Spelunky/Dead Cells: No summary screen between floors. No modal after boss kill.
- SotN: Normal item pickup = non-blocking toast.
- Rule: Item World room clear -> instant next room. No summary.

**2. Only pause for milestones**
- SotN: Only relics (ability gates) get blocking popup. Regular items get toast.
- Disgaea: Only boss floors present exit choice. Regular floors auto-advance.
- Rule: Pattern B (Prompt) only for: ability acquisition, first-time item lore.

**3. One-button context**
- Spelunky: Single interact button = attack/pickup/enter-door based on state.
- Dead Cells: Same button = pickup/interact/enter based on proximity.
- Rule: C key = attack (gameplay) = confirm/advance/pickup (UI). Context determines meaning.

**4. Compare before commit**
- Dead Cells: Tooltip auto-shows on approach, before pickup.
- Disgaea: Stat delta shown on cursor hover in shop.
- Rule: Show stat comparison automatically when player approaches an item drop.

**5. Cancel is one key, always**
- SotN: Circle = back in every menu.
- Disgaea: Dedicated cancel button works everywhere.
- Rule: ESC = only cancel/back key. Never assign cancel to Z/X/other keys.

---

## Pattern A: Modal

게임을 멈추고, 선택을 요구하는 UI.

| 속성 | 규칙 |
|------|------|
| 게임 차단 | YES (플레이어 이동/공격 불가) |
| 네비게이션 | Arrow Keys (4방향 그리드 or 리스트) |
| 확인 | **C** (ATTACK 액션) |
| 취소 | **ESC** (MENU 액션) |
| 열기 | 컴포넌트별 트리거 (키 or 이벤트) |
| 닫기 | 확인(C) 또는 취소(ESC) |
| Z/X 사용 | 금지 (게임 액션과 충돌 방지) |

### 해당 컴포넌트

| 컴포넌트 | 열기 트리거 | 네비게이션 | 현재 상태 | 변경 필요 |
|----------|------------|-----------|-----------|----------|
| InventoryUI | I키 | 5x4 그리드 (화살표) | C/ESC | 준수 |
| DivePreview | 앤빌 아이템 배치 후 | 없음 (단일 선택) | C/ESC | 준수 |
| Altar Select | 제단 근접 + C | 화살표 리스트 | C/ESC | 준수 |
| Boss Choice | 보스 처치 후 자동 | 없음 (2택) | C=Continue/ESC=Exit | 준수 |
| Cycle Prompt | 재진입 이벤트 | 없음 (단일 선택) | Z확인/X취소 | **C/ESC로 변경** |
| Anvil Interaction | 앤빌 근접 + C | 없음 | ↑키 배치 | **C로 인벤토리 열기** |

---

## Pattern B: Prompt

자동으로 등장하며, 읽기/확인만 요구하는 UI. 선택지 없음.

| 속성 | 규칙 |
|------|------|
| 게임 차단 | YES (읽기 강제) |
| 네비게이션 | 없음 |
| 확인/닫기 | **C** (ATTACK 액션) |
| 취소 | 없음 (반드시 확인해야 진행) |
| 열기 | 이벤트 자동 (픽업, 방 진입 등) |
| 입력 잠금 | 선택적 (LorePopup: 0.3~1초) |
| 멀티라인 | Z/C로 다음 줄 진행 (LoreDisplay) |

### 해당 컴포넌트

| 컴포넌트 | 열기 트리거 | 닫기 | 현재 상태 | 변경 필요 |
|----------|------------|------|-----------|----------|
| LorePopup | 아이템 픽업 (미열람) | C (잠금 후) | C 닫기 | 준수 |
| LoreDisplay | 메모리 방 진입 | C (줄 진행/닫기) | Z 진행 | **C로 변경** |
| TutorialHint | 이벤트 | 자동 소멸 (4초) | 입력 없음 | 준수 (자동 소멸 허용) |

### Pattern B 세부 규칙

1. **단일 메시지:** C를 누르면 즉시 닫힘
2. **멀티라인 (LoreDisplay):**
   - 타이핑 중 C → 즉시 전문 표시 (스킵)
   - 타이핑 완료 후 C → 다음 줄 or 닫기
3. **입력 잠금 (LorePopup):**
   - 잠금 시간 동안 C 무시
   - 링 애니메이션으로 잠금 해제 시점 시각화
   - 잠금은 최초 열람(1초) / 재열람(0.3초) 차등

---

## Pattern C: Overlay

게임이 계속 진행되며, 정보를 표시하는 UI.

| 속성 | 규칙 |
|------|------|
| 게임 차단 | NO (플레이어 자유 행동) |
| 네비게이션 | 없음 |
| 확인/취소 | 없음 |
| 열기/닫기 | 동일 키로 토글 (M, I 등) or 자동 |
| 인터랙션 | 읽기 전용 |

### 해당 컴포넌트

| 컴포넌트 | 토글/트리거 | 현재 상태 | 변경 필요 |
|----------|-----------|-----------|----------|
| WorldMap | M키 토글 | M 열기/닫기 | 준수 |
| HUD (HP/ATK/Flask) | 항상 표시 | 자동 | 준수 |
| BossHP Bar | 보스방 진입 | 자동 | 준수 |
| DepthGauge | 아이템계 | 자동 | 준수 |
| Item EXP Bar | 아이템계 | 자동 | 준수 |
| Toast | 코드 이벤트 | 자동 소멸 | 준수 |
| DamageNumbers | 타격 이벤트 | 자동 소멸 | 준수 |
| ReturnHint | 아이템계 진입 | 자동 | 준수 |
| ControlsOverlay | 항상 표시 | 자동 | 준수 |
| Anvil KeyPrompt | 근접 | 자동 표시/숨김 | 준수 |
| ScreenCrack | 이벤트 | 자동 재생/소멸 | 준수 |

---

## Migration Checklist

### 변경 필요 항목 (3건)

#### 1. Cycle Prompt: Z/X 확인/취소 → C/ESC

- **파일:** `src/scenes/LdtkWorldScene.ts` (updateAltarInput or cycle prompt logic)
- **Before:** Z(JUMP) = confirm, X(DASH) = cancel
- **After:** C(ATTACK) = confirm, ESC(MENU) = cancel
- **이유:** Pattern A 준수. Z/X는 게임 액션 전용.

#### 2. Anvil Interaction: ↑키 배치 → C키로 인벤토리 열기

- **파일:** `src/scenes/LdtkWorldScene.ts` (anvil proximity input)
- **Before:** ↑(LOOK_UP) = place weapon
- **After:** C(ATTACK) = open InventoryUI (anvil mode)
- **이유:** ↑키는 방향 입력이지 확인 키가 아님. C키로 통일.
- **참고:** KeyPrompt 아이콘도 [↑] → [C]로 변경

#### 3. LoreDisplay: Z 진행 → C 진행

- **파일:** `src/ui/LoreDisplay.ts`
- **Before:** Z(JUMP) = advance/skip text
- **After:** C(ATTACK) = advance/skip text
- **이유:** Pattern B 준수. C = "확인/진행"으로 통일.

---

## Input Key Summary (최종)

| 키 | 게임 액션 | UI 역할 |
|----|----------|---------|
| C (KeyC) | Attack | 확인 / 닫기 / 진행 (전 패턴 공용) |
| ESC (Escape) | Menu | 취소 / 뒤로 (Pattern A 전용) |
| Arrow Keys | Move / Look | 네비게이션 (Pattern A 전용) |
| Z (KeyZ) | Jump | UI에서 사용 금지 |
| X (KeyX) | Dash | UI에서 사용 금지 |
| I (KeyI) | Inventory | 인벤토리 토글 |
| M (KeyM) | Map | 월드맵 토글 |
| R (KeyR) | Flask | UI 관여 없음 |

---

## Design Rationale

1. **C = 범용 확인:** 게임 중 가장 자주 누르는 액션 키. 자연스러운 "proceed" 매핑.
2. **ESC = 범용 취소:** 업계 표준. 모달을 닫는 유일한 방법.
3. **Z/X UI 금지:** 점프/대시 키가 UI에서 다른 의미를 가지면 근육 기억 충돌 발생.
4. **화살표 = 네비게이션 전용:** 이동과 UI 선택을 동일 키로. 모달 중 이동이 차단되므로 충돌 없음.
5. **오버레이는 입력 안 먹음:** 게임 흐름을 끊지 않는 정보는 별도 입력 불필요.
