# UI Interaction Patterns - 4-Pattern Unification

> 모든 UI 인터랙션은 4가지 패턴 중 하나에 속한다. 예외 없음.
>
> - **Pattern A (Modal):** 게임 멈춤 + 선택 요구 (Inventory, Altar Select, Boss Choice 등)
> - **Pattern B (Prompt):** 게임 멈춤 + 읽기만 (LorePopup, LoreDisplay)
> - **Pattern C (Overlay):** 게임 계속 + 정보 표시 (HUD, Map, Toast)
> - **Pattern D (Proximity):** 게임 계속 + 근접 상호작용 (Save Point, Anvil, Altar 접근)

---

## Reference Game Analysis

4개 레퍼런스 게임에서 도출한 UI/UX 설계 원칙.

> **Sources disclaimer:** 위키/가이드 기반 2차 소스. 영상/스크린샷 1차 검증 미완료.

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

## Pattern D: Proximity Interaction

근접하면 자동으로 힌트가 뜨고, 확인 키로 상호작용하는 world-space UI. Modal 도 Prompt 도 아닌 "월드 내 오브젝트 상호작용" 전용 패턴.

| 속성 | 규칙 |
|------|------|
| 게임 차단 | NO (접근 시 힌트만 표시, 게임 계속) |
| 힌트 표시 | 근접 범위 진입 시 자동 (KeyPrompt: [C] Label) |
| 확인 | **C** (ATTACK 액션) |
| 취소 | 없음 (범위 이탈로 자동 해제) |
| 입력 처리 | `player.update()` **전** 에 선점 + `consumeJustPressed(ATTACK)` 로 헛스윙 방지 |
| Z/X 사용 | 금지 |
| 화살표 사용 | 금지 (방향 입력은 상호작용 키가 아님) |

### 해당 컴포넌트

| 컴포넌트 | 근접 트리거 | 확인 키 | 동작 |
|----------|------------|--------|------|
| Save Point | 32px 범위 | C | 세이브 실행 |
| Anvil (empty) | AABB overlap | C | InventoryUI (anvil mode) 열기 |
| Altar | 접촉 범위 | C | Altar Select (Pattern A) 열기 |
| Portal | 접촉 범위 | 자동 | 아이템계 진입 (입력 불요) |

### Pattern D 세부 규칙

1. **공격 충돌 방지:** 확인 키(C) 가 공격 키와 동일하므로, 상호작용 성공 시 반드시 `consumeJustPressed(ATTACK)` 호출하여 같은 프레임에 플레이어가 헛스윙하지 않게 한다.
2. **선점 순서:** 상호작용 입력 처리는 `player.update()` **전** 에 수행. 순서가 뒤바뀌면 공격이 먼저 발사되어 취소 불가.
3. **상호 배타:** 여러 proximity 오브젝트가 겹친 경우 우선순위에 따라 최상위 핸들러만 실행. **Altar 30 > Anvil 20 > SavePoint 10**.
4. **시각 피드백:** 근접 시 오브젝트 맥동(pulse) + KeyPrompt 표시. 이탈 시 모두 숨김.

### 구현: ProximityRouter

Pattern D 규약은 `src/core/ProximityRouter.ts` 가 강제한다. 인라인으로 `isJustPressed(ATTACK) + consume + 조건 분기` 를 반복 작성하지 말 것.

**핸들러 등록** (`LdtkWorldScene.registerProximityHandlers` 참조):
```ts
this.proximity.register({
  label: 'Anvil',
  priority: 20,
  canInteract: () => /* proximity + 상태 */,
  onInteract: () => this.openAnvilUI(),
});
```

**씬 update 에서 호출**:
```ts
// player.update() 호출 전에:
if (this.proximity.tryInteract(this.game.input)) return;
```

`tryInteract` 은 ATTACK 입력 + 최고 우선순위의 `canInteract()` 매칭 핸들러를 찾아 실행하고, 입력을 소비한다. 매칭이 없으면 false 반환 — 플레이어가 정상적으로 공격.

**규칙:**
- 새 proximity 오브젝트 추가 시 반드시 라우터에 등록 (직접 `isJustPressed(ATTACK)` 검사 금지)
- 우선순위는 위 표준값(30/20/10) 중에서 선택, 필요 시 새 값 협의 후 추가
- 핸들러는 씬 생성 시 1회 등록, closure 로 `this.*` 참조

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

### 변경 필요 항목 (4건)

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

#### 4. Save Point: ↑키 세이브 → C키 세이브 ✅ (완료)

- **파일:** `src/scenes/LdtkWorldScene.ts` (update() pre-player 블록 + checkSavePoints + KeyPrompt)
- **Before:** LOOK_UP(↑) = 세이브 실행, KeyPrompt 아이콘 `[↑] Save`
- **After:** ATTACK(C) = 세이브 실행 + `consumeJustPressed`, KeyPrompt 아이콘 `[C] Save`
- **이유:** Pattern D 준수. 화살표는 네비게이션 전용이고, proximity-interaction 은 C 키로 통일.

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

---

## Sources

### Castlevania: Symphony of the Night

- [Controls - StrategyWiki](https://strategywiki.org/wiki/Castlevania:_Symphony_of_the_Night/Controls)
- [Relics - StrategyWiki](https://strategywiki.org/wiki/Castlevania:_Symphony_of_the_Night/Relics)
- [SotN Inventory - Castlevania Wiki Fandom](https://castlevania.fandom.com/wiki/Symphony_of_the_Night_Inventory)
- [Warp Room - Castlevania Wiki Fandom](https://castlevania.fandom.com/wiki/Warp_Room)
- [SotN Instruction Manual - Castlevania Crypt](https://www.castlevaniacrypt.com/sotn-manual-ps/)

### Disgaea

- [Item World - Disgaea Wiki Fandom](https://disgaea.fandom.com/wiki/Item_World)
- [Item World - StrategyWiki](https://strategywiki.org/wiki/Disgaea:_Hour_of_Darkness/Item_World)
- [Item Bosses - Disgaea Wiki Fandom](https://disgaea.fandom.com/wiki/Item_Bosses)
- [Mr. Gency's Exit - Disgaea Wiki Fandom](https://disgaea.fandom.com/wiki/Mr._Gency%27s_Exit)
- [Controls - StrategyWiki](https://strategywiki.org/wiki/Disgaea:_Hour_of_Darkness/Controls)
- [Geo Panels - StrategyWiki](https://strategywiki.org/wiki/Disgaea:_Hour_of_Darkness/Geo_Panels)
- [Disgaea 5 Item World - Gamer Guides](https://www.gamerguides.com/disgaea-5-alliance-of-vengeance/guide/extras/item-world/overview)

### Spelunky 2

- [Controls - Spelunky Wiki Fandom](https://spelunky.fandom.com/wiki/Controls)
- [Shop - Spelunky Wiki Fandom](https://spelunky.fandom.com/wiki/Spelunky_2:Shop)
- [Terra Tunnel - Spelunky Wiki Fandom](https://spelunky.fandom.com/wiki/Terra_Tunnel_(2))
- [Game UI Database - Spelunky 2](https://www.gameuidatabase.com/gameData.php?id=1329)

### Dead Cells

- [Gear - Dead Cells Wiki](https://deadcells.wiki.gg/wiki/Gear)
- [Mutations - Dead Cells Wiki](https://deadcells.wiki.gg/wiki/Mutations)
- [Biomes - Dead Cells Wiki](https://deadcells.wiki.gg/wiki/Biomes)
- [Bosses - Dead Cells Wiki](https://deadcells.wiki.gg/wiki/Bosses)
- [Game UI Database - Dead Cells](https://www.gameuidatabase.com/gameData.php?id=1780)
- [Dead Cells Accessibility Update - NintendoLife](https://www.nintendolife.com/news/2022/06/dead-cells-accessibility-focused-update-adds-assist-mode-difficulty-options-and-more)
