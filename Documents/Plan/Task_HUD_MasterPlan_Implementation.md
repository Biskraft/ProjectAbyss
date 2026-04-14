# HUD 마스터플랜 구현 작업 지시서

> **작성일:** 2026-04-13
> **대상:** AI Programmer Agent
> **설계 문서:** `Documents/UI/UI_HUD_MasterPlan.md`
> **리서치 근거:** `Documents/Research/UX_Layout_Sizing_Research.md`, `Documents/Research/ReferenceGame_UI_UX_Research.md`
> **기술 스택:** PixiJS v8, TypeScript, 640x360 베이스 해상도

---

## 개요

HUD 마스터플랜에 따라 기존 HUD를 개선한다. 작업은 P0(즉시) - P1(단기) - P2(기능 추가) 3단계로 구분되며, 각 단계는 독립적으로 커밋 가능하다.

**핵심 변경 방향:**
1. 세이프 존 마진 확보 (4px -> 8px)
2. HP 바 / Flask 아이콘 확대 (가독성)
3. 정수 배율 스케일링 강제 (픽셀아트 선명도)
4. 브라우저 입력 안전장치 (Tab/ESC/beforeunload)
5. Dead Cells식 키 프롬프트 시스템 도입

---

## P0: 즉시 적용 (기존 코드 상수 변경)

### Task 1: HUD 마진 및 크기 조정

**파일:** `game/src/ui/HUD.ts`

**변경할 상수:**

```typescript
// 변경 전
const HP_BAR_W = 80;
const HP_BAR_H = 6;
const HP_BAR_X = 4;
const HP_BAR_Y = 4;
const FLASK_ICON_SIZE = 6;

// 변경 후
const HP_BAR_W = 100;
const HP_BAR_H = 8;
const HP_BAR_X = 8;
const HP_BAR_Y = 8;
const FLASK_ICON_SIZE = 8;
```

**추가 변경:**

1. `FLASK_Y` 계산식이 `HP_BAR_Y + HP_BAR_H + 2`로 되어있으므로 자동 반영됨 (8 + 8 + 2 = 18). 확인만.

2. 골드 텍스트 위치:
```typescript
// 변경 전
this.goldText.x = SCREEN_W - 4;
this.goldText.y = 80;

// 변경 후
this.goldText.x = SCREEN_W - 8;  // 우측 마진 8px
this.goldText.y = 80;            // 미니맵(128x72, y=4) 아래 유지
```

3. 층수 텍스트 위치:
```typescript
// 변경 전
this.floorText.y = 350;

// 변경 후
this.floorText.x = 8;   // 좌측 마진 (현재 4 -> 8)
this.floorText.y = 344;  // 하단 마진 8px (360 - 8 - 8 = 344)
```

4. HP 바 보더 크기도 비례 조정:
```typescript
// redrawHpBar() 내부
// 변경 전
g.rect(-1, -1, HP_BAR_W + 2, HP_BAR_H + 2).fill(HP_BORDER_COLOR);

// 변경 후 (동일 패턴이지만 W/H가 커졌으므로 자동 반영)
// 확인만 필요
```

**검증:** 빌드 후 HP 바가 좌상단에서 8px 안쪽에 위치하고, 골드가 우측에서 8px 안쪽, 층수 텍스트가 하단에서 16px 안쪽에 있는지 시각 확인.

---

### Task 2: 정수 배율 강제

**파일:** `game/src/Game.ts`

**변경 위치:** `handleResize()` 메서드 내 scale 계산 부분

```typescript
// 변경 전
const scale = Math.min(w / GAME_WIDTH, h / GAME_HEIGHT);
canvas.style.width = `${Math.floor(GAME_WIDTH * scale)}px`;
canvas.style.height = `${Math.floor(GAME_HEIGHT * scale)}px`;

// 변경 후
const rawScale = Math.min(w / GAME_WIDTH, h / GAME_HEIGHT);
const scale = Math.max(1, Math.floor(rawScale));  // 정수만 허용
canvas.style.width = `${GAME_WIDTH * scale}px`;
canvas.style.height = `${GAME_HEIGHT * scale}px`;
```

**레터박스 처리:** 남는 영역은 `index.html`의 `body { background: #000; }`으로 자동 블랙바. 추가 CSS 불필요.

**검증:**
- 1920x1080 전체화면: 3x (1920x1080 = 딱 맞음)
- 1920x1080 윈도우(높이 ~960px): 2x (1280x720 + 블랙바)
- 2560x1440: 4x
- 브라우저 줌 변경 후에도 정수 배율 유지 확인

---

### Task 3: Tab 키 기본 동작 차단

**파일:** `game/src/input/InputManager.ts`

canvas 포커스가 벗어나는 것을 방지. 기존 `GAME_KEYS` 배열에 Tab을 추가하거나, 별도 핸들러를 추가한다.

```typescript
// 방법 1: GAME_KEYS에 Tab 추가 (기존 패턴 활용)
// GAME_KEYS 배열에 'Tab' 추가

// 방법 2: 별도 핸들러 (GAME_KEYS 수정이 부담스러울 경우)
window.addEventListener('keydown', (e) => {
  if (e.code === 'Tab') e.preventDefault();
}, true);  // capture phase
```

방법 1 권장. 기존 `GAME_KEYS` 배열에 `'Tab'`을 추가하면 기존 `preventDefault()` 로직에서 자동 처리됨.

**검증:** 게임 실행 중 Tab 키 누르면 canvas 포커스가 유지되는지 확인.

---

## P1: 단기 개선 (버그 수정 + 품질)

### Task 4: setTimeout 제거 (게임 루프 타이머로 교체)

**파일:** `game/src/ui/HUD.ts`

**문제:** L126-128의 `setTimeout`은 게임 루프 외부에서 실행되어 히트스탑/일시정지 중에도 타이머가 진행됨.

```typescript
// 변경 전 (L125-128)
if (hp < prevHp && prevHp > 0) {
  this.hpText.tint = 0xff4444;
  setTimeout(() => { this.hpText.tint = 0xffffff; }, 200);
}

// 변경 후
// 1. 클래스 멤버 추가
private hpTextFlashTimer = 0;

// 2. updateHP() 내부 변경
if (hp < prevHp && prevHp > 0) {
  this.hpText.tint = 0xff4444;
  this.hpTextFlashTimer = 200;  // 200ms
}

// 3. update(dt) 내부에 추가
if (this.hpTextFlashTimer > 0) {
  this.hpTextFlashTimer -= dt;
  if (this.hpTextFlashTimer <= 0) {
    this.hpTextFlashTimer = 0;
    this.hpText.tint = 0xffffff;
  }
}
```

**검증:** 피격 시 HP 텍스트가 빨갛게 변한 후 200ms 뒤 흰색으로 복귀. 히트스탑 중에는 타이머도 정지되는지 확인.

---

### Task 5: 보스 힐 플래시 타이밍 단축

**파일:** `game/src/ui/HUD.ts`

```typescript
// 변경 전
const BOSS_HEAL_FLASH_DURATION = 500;

// 변경 후
const BOSS_HEAL_FLASH_DURATION = 400;
```

**근거:** UX 리서치 기준 최대 허용 애니메이션 시간 400ms. 500ms는 "느리다" 체감 영역.

---

### Task 6: HUD 텍스트 가독성 보강 (드롭셰도우)

**파일:** `game/src/ui/HUD.ts`

모든 BitmapText에 검정 1px 드롭셰도우를 추가하여 어떤 배경에서든 4.5:1+ 대비를 보장한다.

PixiJS v8 BitmapText에서 드롭셰도우를 추가하는 방법:

```typescript
// 방법 1: BitmapText 뒤에 같은 텍스트를 검정으로 1px 오프셋 배치
// (PixiJS BitmapText에는 네이티브 shadow가 없으므로)

private createShadowedText(text: string, style: object): Container {
  const container = new Container();
  const shadow = new BitmapText({ text, style: { ...style, fill: 0x000000 } });
  shadow.x = 1;
  shadow.y = 1;
  const main = new BitmapText({ text, style });
  container.addChild(shadow, main);
  return container;
}
```

또는 더 간단하게, 폰트 자체가 픽셀 폰트(Press Start 2P)이므로 **BitmapFont 생성 시 stroke를 포함**하는 방법도 검토. 다만 `installBitmapFont`의 현재 설정을 확인 후 판단.

**적용 대상:** `hpText`, `goldText`, `floorText` 3개.

**검증:** 밝은 배경(주황 구조물 위) + 어두운 배경(청록 동굴) 양쪽에서 텍스트가 명확히 읽히는지 확인.

---

## P2: 키 프롬프트 시스템 (신규 기능)

### Task 7: KeyPrompt 유틸리티 클래스 생성

**새 파일:** `game/src/ui/KeyPrompt.ts`

Dead Cells식 "다크 박스" 키 아이콘을 렌더링하는 재사용 가능한 유틸리티.

```typescript
/**
 * KeyPrompt.ts - Dead Cells 스타일 다크 박스 키 아이콘 렌더링
 *
 * 사용법:
 *   const prompt = KeyPrompt.createKeyIcon('Z');           // 키 아이콘만
 *   const prompt = KeyPrompt.createPrompt('Z', 'Save');    // 키 아이콘 + 텍스트
 *   const prompt = KeyPrompt.createInline('Press ', 'Z', ' to jump'); // 인라인
 */

import { Container, Graphics, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from './fonts';

// 다크 박스 비주얼 상수 (640x360 기준)
const KEY_BOX_SIZE = 7;           // 7x7px
const KEY_BOX_BG = 0x1a1a1a;     // 어두운 배경
const KEY_BOX_BG_ALPHA = 0.85;
const KEY_BOX_BORDER = 0x666666;  // 밝은 테두리
const KEY_BOX_BORDER_W = 1;
const KEY_BOX_TEXT_COLOR = 0xffffff;
const KEY_BOX_FONT_SIZE = 5;
const KEY_BOX_RADIUS = 1;        // 라운딩

// 컨텍스트 프롬프트용 (약간 더 큰 크기)
const CONTEXT_KEY_SIZE = 8;      // 8x8px
const CONTEXT_FONT_SIZE = 6;
const CONTEXT_LABEL_COLOR = 0xffffff;
const CONTEXT_BG = 0x000000;
const CONTEXT_BG_ALPHA = 0.6;
const CONTEXT_PADDING = 2;
const CONTEXT_GAP = 2;

export class KeyPrompt {

  /**
   * 키 아이콘 단독 (7x7 다크 박스)
   * HUD 슬롯 하단 코너에 배치할 때 사용
   */
  static createKeyIcon(key: string, size = KEY_BOX_SIZE): Container {
    const c = new Container();
    const bg = new Graphics();

    // 배경 라운드 사각형
    bg.roundRect(0, 0, size, size, KEY_BOX_RADIUS)
      .fill({ color: KEY_BOX_BG, alpha: KEY_BOX_BG_ALPHA });
    bg.roundRect(0, 0, size, size, KEY_BOX_RADIUS)
      .stroke({ color: KEY_BOX_BORDER, width: KEY_BOX_BORDER_W });
    c.addChild(bg);

    // 키 이름 텍스트 (중앙 정렬)
    const label = new BitmapText({
      text: key.toUpperCase(),
      style: { fontFamily: PIXEL_FONT, fontSize: KEY_BOX_FONT_SIZE, fill: KEY_BOX_TEXT_COLOR },
    });
    label.x = Math.floor((size - label.width) / 2);
    label.y = Math.floor((size - label.height) / 2);
    c.addChild(label);

    return c;
  }

  /**
   * 컨텍스트 프롬프트 ([Z] Save 형태)
   * 오브젝트 위에 월드 스페이스로 표시할 때 사용
   *
   * @param key - 키 이름 (예: 'Z')
   * @param action - 액션 텍스트 (예: 'Save')
   * @returns Container (배경 패널 + 키 아이콘 + 텍스트)
   */
  static createPrompt(key: string, action: string): Container {
    const c = new Container();

    // 키 아이콘
    const keyIcon = KeyPrompt.createKeyIcon(key, CONTEXT_KEY_SIZE);
    keyIcon.x = CONTEXT_PADDING;
    keyIcon.y = CONTEXT_PADDING;
    c.addChild(keyIcon);

    // 액션 텍스트
    const label = new BitmapText({
      text: action,
      style: { fontFamily: PIXEL_FONT, fontSize: CONTEXT_FONT_SIZE, fill: CONTEXT_LABEL_COLOR },
    });
    label.x = CONTEXT_PADDING + CONTEXT_KEY_SIZE + CONTEXT_GAP;
    label.y = CONTEXT_PADDING + Math.floor((CONTEXT_KEY_SIZE - label.height) / 2);
    c.addChild(label);

    // 배경 패널 (자동 크기)
    const totalW = label.x + label.width + CONTEXT_PADDING;
    const totalH = CONTEXT_KEY_SIZE + CONTEXT_PADDING * 2;
    const bg = new Graphics();
    bg.roundRect(0, 0, totalW, totalH, 1)
      .fill({ color: CONTEXT_BG, alpha: CONTEXT_BG_ALPHA });
    c.addChildAt(bg, 0); // 배경을 맨 아래로

    return c;
  }

  /**
   * InputManager에서 키 코드를 사람이 읽을 수 있는 이름으로 변환
   *
   * @param code - e.code 형식 (예: 'KeyZ', 'ArrowLeft', 'Space')
   * @returns 표시용 문자열 (예: 'Z', '←', 'SPC')
   */
  static codeToLabel(code: string): string {
    if (code.startsWith('Key')) return code.slice(3); // 'KeyZ' -> 'Z'
    if (code.startsWith('Digit')) return code.slice(5); // 'Digit1' -> '1'
    const map: Record<string, string> = {
      'Space': 'SPC',
      'ShiftLeft': 'SH', 'ShiftRight': 'SH',
      'ControlLeft': 'CT', 'ControlRight': 'CT',
      'ArrowLeft': '\u2190', 'ArrowRight': '\u2192',
      'ArrowUp': '\u2191', 'ArrowDown': '\u2193',
      'Escape': 'ESC', 'Enter': 'ENT', 'Tab': 'TAB',
      'Backspace': 'BS',
    };
    return map[code] || code;
  }
}
```

**설계 원칙:**
- 정적 팩토리 메서드로 호출. 인스턴스 생성 불필요.
- 키 리바인딩 시 `codeToLabel()`이 현재 바인딩된 코드를 변환하므로 프롬프트가 자동 갱신됨.
- 모든 프롬프트가 동일한 상수(색상/크기/패딩)를 공유하여 비주얼 일관성 보장.

---

### Task 8: 컨텍스트 프롬프트 (대장간/NPC/아이템 드랍)

**수정 파일:** `game/src/scenes/LdtkWorldScene.ts`, `game/src/scenes/ItemWorldScene.ts`

상호작용 가능한 엔티티(GameSaver, NPC, 아이템 드랍) 근처에 플레이어가 접근하면 `KeyPrompt.createPrompt()`로 생성한 프롬프트를 오브젝트 위에 표시한다.

**구현 흐름:**

```
매 프레임 update():
  1. 플레이어와 각 인터랙터블 사이 거리 계산
  2. 거리 <= 32px 이면:
     - 프롬프트가 없으면 생성 + entityLayer에 추가
     - 프롬프트 위치 = 오브젝트.x + 오브젝트.width/2 - 프롬프트.width/2, 오브젝트.y - 프롬프트.height - 4
     - alpha를 150ms에 걸쳐 0->1로 페이드인 (ease-out)
  3. 거리 > 32px 이면:
     - 프롬프트가 있으면 제거 (또는 alpha 0으로 즉시 숨김)
```

**적용 대상 (현재 코드에서 확인된 엔티티):**

| LDtk 엔티티 | 프롬프트 | 키 |
|:---|:---|:---|
| GameSaver | `[Z] Save` | Z (또는 현재 INTERACT 바인딩) |
| NPC | `[Z] Talk` | Z |
| Altar (제단) | `[Z] Offer` | Z |
| AbilityRelic | `[Z] Take` | Z |

**아이템 드랍 (ItemWorldScene 내):**

| 상황 | 프롬프트 | 키 |
|:---|:---|:---|
| 바닥 아이템 근처 | `[Z] Pick up` | Z |

**주의:**
- 한 번에 1개의 프롬프트만 표시 (가장 가까운 오브젝트 우선)
- 프롬프트 Container는 카메라 오프셋이 적용되는 entityLayer에 추가 (HUD 레이어 아님)
- 프롬프트는 `KeyPrompt.createPrompt()`로 매번 새로 생성하지 말고, 오브젝트당 1개를 캐싱하여 visible 토글

---

### Task 9: ControlsOverlay 제거 → 분산 키 레이블로 교체

**삭제 파일:** `game/src/ui/ControlsOverlay.ts` (전체 삭제)

별도 키 가이드 패널 대신, 각 HUD 요소에 키 레이블을 직접 붙인다.
ControlsOverlay.ts는 삭제하고, 키 표시를 HUD.ts에 통합한다.

**변경 전 (현재):**
```
우상단에 별도 패널:
┌──────────┐
│ ← → Move │
│  Z  Jump │
│  X  Atk  │
│  C  Dash │
│  I  Item │
└──────────┘
```

**변경 후 (분산 배치):**
```
키가 각 기능 옆에 직접 붙음:

좌상단: ●●●[R] 48/100    (Flask 옆에 [R])
우상단: 미니맵 아래에 [M] [I]
좌하단: [Z]Jump [X]Atk [C]Dash
```

**A. HUD.ts에 추가할 요소:**

```typescript
// 1. Flask 옆 [R] 키 레이블
private flaskKeyLabel: Container;  // KeyPrompt.createKeyIcon('R')
// 위치: Flask 아이콘 나열 끝 + 2px
// HP 텍스트를 [R] 우측 + 3px로 밀어냄

// 2. 좌하단 액션 키 바 [Z]Jump [X]Atk [C]Dash
private actionKeyBar: Container;
// 위치: x=8, y=344
// 구성: 3개의 (키박스 + 액션명) 그룹, 각 그룹 gap 6px

// 3. 미니맵 하단 [M] [I] 키 레이블
// → 미니맵을 관리하는 씬(LdtkWorldScene)에서 추가
// HUD.ts에서는 [I]만 추가 (인벤토리는 양쪽 씬에서 사용)
```

**B. 액션 키 바 상세 (좌하단):**

```typescript
// 위치 텍스트를 y=334로 올리고, 액션 키 바를 y=344에 배치
this.floorText.y = 334;  // 기존 344 → 334

// 액션 키 바 구성
const actions = [
  { key: 'Z', label: 'Jump', x: 8 },
  { key: 'X', label: 'Atk',  x: 38 },
  { key: 'C', label: 'Dash', x: 62 },
];

for (const a of actions) {
  const icon = KeyPrompt.createKeyIcon(a.key);  // 7x7 다크 박스
  icon.x = a.x;
  icon.y = 344;
  this.container.addChild(icon);

  const text = new BitmapText({
    text: a.label,
    style: { fontFamily: PIXEL_FONT, fontSize: 5, fill: 0xaaaaaa },
  });
  text.x = a.x + 9;  // 키 박스(7) + gap(2)
  text.y = 345;       // 키 박스와 세로 중앙 정렬
  this.container.addChild(text);
}
```

**C. Flask 키 [R] 레이블:**

```typescript
// updateFlask() 내부에서 위치 재계산
const totalFlaskW = max * (FLASK_ICON_SIZE + FLASK_ICON_GAP);
// [R] 키 박스
this.flaskKeyLabel.x = HP_BAR_X + totalFlaskW + 2;
this.flaskKeyLabel.y = FLASK_Y;
// HP 텍스트
this.hpText.x = HP_BAR_X + totalFlaskW + 2 + 7 + 3;  // [R](7) + gap(3)
```

**D. 미니맵 하단 [M][I]:**

LdtkWorldScene에서 미니맵 컨테이너에 [M][I] 추가:
```typescript
// 미니맵 (x=504, y=8, 128x72)
const mapKey = KeyPrompt.createKeyIcon('M');
mapKey.x = 504;
mapKey.y = 82;  // 미니맵 하단 (8 + 72 + 2)
minimapContainer.addChild(mapKey);

const invKey = KeyPrompt.createKeyIcon('I');
invKey.x = 514;  // [M] 우측 (504 + 7 + 3)
invKey.y = 82;
minimapContainer.addChild(invKey);

// 골드 텍스트 y를 88로 조정 (기존 80)
this.hud.setGoldY(88);
```

**E. 아이템계에서:**
- 미니맵 숨김 → [M] 자동 숨김
- [I]만 우상단에 단독 표시 (x=632 - 7 = 625, y=8, 우측 정렬)

**F. 상태 연동:**

```typescript
// 대시 렐릭 미획득 시
if (!player.hasDash) dashAction.alpha = 0.4;

// Flask 0개 시
if (flaskCurrent <= 0) flaskKeyLabel.alpha = 0.4;
```

**G. ControlsOverlay 참조 제거:**
ControlsOverlay를 import/사용하는 모든 씬에서 해당 코드 삭제.

**검증:**
1. 좌하단에 [Z]Jump [X]Atk [C]Dash가 항상 표시
2. Flask 옆에 [R] 다크 박스가 표시
3. 미니맵 아래에 [M] [I]가 표시
4. 아이템계에서 [M] 숨김, [I]만 우상단에 표시
5. 대시 미획득 시 [C]Dash 흐림
6. 기존 ControlsOverlay(우상단 패널) 완전 제거 확인

---

### Task 10: 아이템계 미니맵/M키 비활성

**파일:** `game/src/scenes/ItemWorldScene.ts`

현재 `drawMiniMap()`이 빈 함수로 되어있어 미니맵은 이미 없음. 추가로 M키를 비활성화한다.

```typescript
// ItemWorldScene의 키 입력 처리 부분에서
// M키(월드맵 오버레이 토글)가 호출되지 않도록 처리

// 방법: LdtkWorldScene에서만 M키를 처리하고,
// ItemWorldScene에서는 WorldMapOverlay를 생성하지 않거나
// M키 핸들러를 등록하지 않으면 됨.

// 현재 코드에서 M키 처리 위치를 확인 후,
// ItemWorldScene에서 해당 로직이 실행되지 않는지 검증.
```

**검증:** 아이템계 진입 후 M키를 눌러도 아무 반응 없음 확인.

---

## 파일 변경 요약

| 파일 | 변경 유형 | Task |
|:---|:---|:---|
| `game/src/ui/HUD.ts` | 상수 수정 + setTimeout 제거 + 드롭셰도우 | T1, T4, T5, T6 |
| `game/src/Game.ts` | handleResize() 정수 배율 | T2 |
| `game/src/input/InputManager.ts` | Tab 키 차단 | T3 |
| `game/src/ui/KeyPrompt.ts` | **신규 생성** | T7 |
| `game/src/scenes/LdtkWorldScene.ts` | 컨텍스트 프롬프트 추가 | T8 |
| `game/src/scenes/ItemWorldScene.ts` | 컨텍스트 프롬프트 + M키 비활성 | T8, T10 |
| `game/src/ui/ControlsOverlay.ts` | **삭제** (분산 키 레이블로 교체) | T9 |

## 커밋 단위 권장

| 커밋 | 포함 Task | 메시지 |
|:---|:---|:---|
| 1 | T1, T2, T3 | `fix: HUD 세이프존 마진 확대 + 정수 배율 강제 + Tab 키 차단` |
| 2 | T4, T5 | `fix: HUD setTimeout 제거 + 보스 힐 플래시 단축` |
| 3 | T6 | `feat: HUD 텍스트 드롭셰도우 가독성 보강` |
| 4 | T7 | `feat: KeyPrompt 유틸리티 클래스 (Dead Cells식 다크 박스)` |
| 5 | T8 | `feat: 대장간/NPC/아이템 컨텍스트 키 프롬프트` |
| 6 | T9 | `refactor: ControlsOverlay 삭제 → HUD 분산 키 레이블 ([Z]Jump [X]Atk [C]Dash + [R]Flask + [M][I])` |
| 7 | T10 | `fix: 아이템계 M키 월드맵 비활성` |

## 수치 체크리스트 (구현 후 검증용)

구현 완료 후 아래 12개 항목을 전부 확인한다.

| # | 항목 | 기준 (640x360) | @1080p (3x) | 확인 |
|:---|:---|:---|:---|:---|
| 1 | 화면 마진 | 모든 HUD 요소 각 변 8px+ 안쪽 | 24px+ | [ ] |
| 2 | HP 바 | 100x8 (x=8, y=8) | 300x24 | [ ] |
| 3 | Flask 아이콘 | 8px 원, gap 2px | 24px | [ ] |
| 4 | 텍스트 크기 | fontSize 8 (=24px @1080p) | 최소 18px 충족 | [ ] |
| 5 | 클릭 타겟 | 인벤토리 슬롯 20px (=60px @1080p) | WCAG AAA 44px 충족 | [ ] |
| 6 | 텍스트 대비 | 흰색 + 검정 셰도우 = 4.5:1+ | -- | [ ] |
| 7 | 키 프롬프트 대비 | 흰색 on #1a1a1a = 15.4:1 | WCAG AAA 초과 | [ ] |
| 8 | 애니메이션 | Ghost 200ms, Heal 300ms, BossHeal 400ms | 모두 400ms 이하 | [ ] |
| 9 | 깜빡임 | 저HP 맥동 1회/초 | 3회/초 이하 | [ ] |
| 10 | 정수 배율 | 1080p=3x, 1440p=4x, 4K=6x | 비정수 없음 | [ ] |
| 11 | Tab 키 | canvas 포커스 유지 | 페이지 요소로 이동 안 함 | [ ] |
| 12 | setTimeout | HUD.ts에 setTimeout 0건 | grep 확인 | [ ] |
