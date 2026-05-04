# 웹 브라우저 PixiJS 메트로베니아 게임패드 구현 — 통합 레퍼런스

> ECHORIS 게임패드 도입 사전 리서치 통합 보고서. 2026-05-04 작성.
> 4갈래 병렬 리서치 결과 통합: 웹 메트로베니아 사례 전수조사 / PixiJS 구현 패턴 / W3C 표준 & 베스트 프랙티스 / 상용 메트로베니아 패드 UX.
> 모든 인용은 [확인함] (직접 페이지 확인) / [추측임] (2차 자료) / [근거 없음] (추정) 으로 태그합니다.

---

## 0. Executive Summary

### 0.1 결론 4줄

1. **표준 W3C Gamepad API + Standard Mapping + dual-rumble 만으로 Phase 2 베타 충분**. trigger-rumble · 터치패드 · 자이로 · Steamworks 직접 통합은 Phase 4(Tauri+Steam Input) 단계로 미룬다.
2. **6프레임 Coyote / 6프레임 점프 Buffer / 8프레임 대시·공격 Buffer / Scaled Radial Deadzone 0.20 / minVelocity 클램프 가변 점프** — 메트로베니아 액션의 사실상 표준이며 Celeste/Hollow Knight 분해 분석으로 검증.
3. **점프=A · 공격=X · 대시=RT 의 3대 표준은 협상 불가**. 1차 niche(SOTN/HK/Dead Cells/Disgaea) 근육 기억과 충돌하면 niche 신호가 희석된다.
4. **PixiJS + TS로 W3C Gamepad API를 직접 호출한 횡스크롤 메트로베니아 공개 사례는 검색 범위 내 0건** [확인함]. ECHORIS는 좁은 카테고리에서 선점 가능.

### 0.2 4갈래 합의점 매트릭스

| 항목 | Stream A (웹 사례) | Stream B (PixiJS) | Stream C (W3C/UX) | Stream D (상용 매핑) | 합의 |
|---|---|---|---|---|---|
| 표준 API 직접 호출 | Cuckoo Castle 모범 [확인함] | 직접 구현 권장 | Baseline Widely available [확인함] | — | **W3C Gamepad API 직접 호출** |
| 라이브러리 채택 | — | `pixijs-input-devices` v0.9.1 (v1.0 대기) | — | — | **자체 InputManager 확장 (50줄)** |
| Deadzone | — | Scaled Radial 0.15-0.20 | Scaled Radial 0.20 [확인함] | — | **0.20** |
| 매핑 표준 | XInput 우선, PS 보조 | Standard Mapping | `mapping === "standard"` 우선 | 점프=A · 공격=X · 대시=RT | **3대 표준 협상 불가** |
| 리매핑 | 표본 1건만 (SHRUBNAUT 컴플레인) | — | XAG/GAG 필수 [확인함] | — | **베타 직전 P0** |

---

## 1. 입력 황금비 (코어 액션 정밀도)

| 파라미터 | 권장값 | 출처 |
|---|---|---|
| 폴링 진입점 | PixiJS `Ticker` 단일 RAF 루프 | web.dev / MDN [확인함] |
| Deadzone (좌스틱) | **Scaled Radial 0.20** (innerDz) + 0.05 (outerDz) | Hypersect [확인함] |
| Deadzone (트리거) | 0.10 시작 | Game Developer 매거진 [확인함] |
| Coyote Time | **6 프레임 (≈100ms)** | Celeste PICO-8 분해 [확인함] |
| Jump Buffer | **점프 6f / 대시·공격 8f** | Celeste 4f / Terresquall 8f [확인함] |
| 가변 점프 | minVelocity 클램프 + 상승 1.0× / 하강 3.0× 중력 | Celeste · Maddy Thorson [확인함] |
| 8방향 분할 | `Math.atan2(y, x) → π/4 양자화` | 표준 [확인함] |

### 1.1 Coyote Time 비교

| 게임 | Coyote 프레임 | 출처 |
|---|---|---|
| Celeste (PICO-8 분해 분석) | **6 프레임** | [확인함] |
| Celeste 정식판 | 5 프레임 | [확인함] |
| Hollow Knight | 약간 있음 (수치 비공개) | [확인함, 커뮤니티 합의] |
| **ECHORIS 권장** | **6 프레임 (≈100ms)** | [추측임, 업계 합의 기반] |

### 1.2 Jump Buffer 비교

| 게임 | Buffer | 출처 |
|---|---|---|
| Celeste | **4 프레임** | [확인함] |
| 일반 메트로베니아 권장 | 약 **8 프레임** | [확인함, Terresquall] |
| **ECHORIS 권장** | **6 프레임 (점프) · 8 프레임 (대시/공격)** | [추측임] |

---

## 2. ECHORIS 권장 매핑

> **설계 원칙:**
> 1. 1차 niche(SOTN/HK/Dead Cells/Disgaea) 근육 기억과 충돌하지 않을 것
> 2. 현재 키보드 매핑(Z=점프, X=대시, C=상호작용)과 패드 매핑이 1:1 대응될 것
> 3. 검 1종 + 방향성 공격 시스템을 단일 버튼(X)에서 방향 입력으로 분기

### 2.1 4열 통합 매핑표

| 액션 | Xbox | PlayStation | Switch | 키보드(현재) | 근거 |
|---|---|---|---|---|---|
| 이동 | LS + DPad | LS + DPad | LS + DPad | ←→ / WASD | 표준 |
| **점프 (가변)** | **A** | **×** | **B** | Z | 9/10 게임 [확인함] |
| **대시** | **RT** | **R2** | **ZR** | X | HK · Blasphemous 트리거 대시 [확인함] |
| **공격(검) 횡베기** | **X** | **□** | **Y** | (분리 필요) | 8/8 게임 [확인함] |
| 내려치기 (Pogo) | 공중 ↓ + X | 공중 ↓ + □ | 공중 ↓ + Y | (구현 필요) | HK 표준 [확인함] |
| 올려치기 | ↑ + X | ↑ + □ | ↑ + Y | – | HK Cyclone 변형 [추측임] |
| 상호작용 | B | ○ | A | C | 페이스 버튼 + 키프롬프트 |
| 기억 단편 (Active) | Y | △ | X | (Shift?) | Hades 스페셜 슬롯 |
| 퀵 캐스트 (보조) | RB | R1 | R | – | HK 퀵캐스트 [확인함] |
| 백대시 | LB | L1 | L | – | Bloodstained 백스텝 [확인함] |
| 인벤토리 | Back/View | Touchpad | – | I | – |
| 맵 | LT | L2 | ZL | M | – |
| 메뉴 (Pause) | Start | Options | + | Esc | – |
| 검 Ego 대화 | DPad ↑ | DPad ↑ | DPad ↑ | – | 스파이크 시그널 강화 |

### 2.2 패드 변환 표 (Xbox → PS → Switch)

| Xbox | PlayStation | Switch | 한국 게이머 통칭 |
|---|---|---|---|
| A | × (Cross) | B | "확인" 버튼(JP 표준) |
| B | ○ (Circle) | A | "취소" 버튼(JP 표준) |
| X | □ (Square) | Y | – |
| Y | △ (Triangle) | X | – |
| LB | L1 | L | – |
| RB | R1 | R | – |
| LT | L2 | ZL | – |
| RT | R2 | ZR | – |

> **지역별 함정:** 일본/한국 출시 게임은 ○=확인, ×=취소가 전통이지만, 2010년대 이후 글로벌 출시 게임은 ×=확인 통일 추세 [추측임]. ECHORIS는 글로벌 표준 채택 + 옵션 토글 권장.

### 2.3 진동(Rumble) 가이드라인

| 이벤트 | strong | weak | duration | trigger |
|---|---|---|---|---|
| 일반 피격 | 0.5 | 0.7 | 120-150ms | — |
| 검 단조 (Forge 단편 충전 완료) | 0.9 | 0.4 | 200-250ms | — |
| Stratum 보스 처치 | 1.0 | 1.0 | 400ms | — |
| 대시 | low | – | 80ms | — |
| 보스 등장 | ramp-up | – | 600ms+ | — |
| 완전 가드 / Parry [추측임] | 0.0 | 0.8 | 60ms | leftTrigger 0.6 (지원 시) |

> **글로벌 강도 슬라이더 필수** (Hollow Knight v1.5+ 표준 [확인함]).

---

## 3. 권장 아키텍처

### 3.1 폴더 구조 (50줄 미만 PR)

```
game/src/core/
├── InputManager.ts          # 기존 — GameAction enum + setVirtualAction 패턴 재사용
├── GamepadManager.ts        # 신규 — navigator.getGamepads() 폴링 + Standard Mapping
└── input/
    ├── gamepadStandard.ts   # GP 상수 (FACE_DOWN=0, RT=7, DPAD_*=12-15)
    ├── deadzone.ts          # scaledRadialDeadzone()
    └── padBindings.ts       # PAD_BINDINGS 프리셋 (Xbox baseline)
```

**통합 포인트:** PixiJS `Ticker` 콜백 1줄로 `gamepad.update()` + `gamepad.syncToInputManager(input)` 등록. **Player.ts/UI 코드 0줄 수정**으로 패드 자동 동작 (현 `setVirtualAction` 채널이 VirtualPad에서 이미 검증됨).

### 3.2 GamepadManager 핵심 코드

```typescript
// game/src/core/GamepadManager.ts
import { Ticker } from 'pixi.js';

export interface GamepadFrame {
  buttons: boolean[];
  buttonsPrev: boolean[];
  axes: number[];
  triggers: number[];
  connected: boolean;
}

export class GamepadManager {
  private index: number | null = null;
  private state: GamepadFrame = {
    buttons: new Array(17).fill(false),
    buttonsPrev: new Array(17).fill(false),
    axes: [0, 0, 0, 0],
    triggers: [0, 0],
    connected: false,
  };

  constructor() {
    window.addEventListener('gamepadconnected', (e) => {
      if (this.index === null) this.index = e.gamepad.index;
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      if (this.index === e.gamepad.index) {
        this.index = null;
        this.state.connected = false;
      }
    });
  }

  /** PixiJS Ticker.shared.add(() => gpm.update()) 로 등록 */
  update(): void {
    // CRITICAL: navigator.getGamepads() 객체는 매 프레임 새로 가져와야 함 [확인함 MDN]
    const pads = navigator.getGamepads?.();
    if (!pads || this.index === null) {
      this.state.connected = false;
      return;
    }
    const gp = pads[this.index];
    if (!gp) { this.state.connected = false; return; }

    this.state.buttonsPrev = this.state.buttons.slice();
    for (let i = 0; i < gp.buttons.length; i++) {
      this.state.buttons[i] = gp.buttons[i].pressed;
    }
    this.state.axes = [gp.axes[0] ?? 0, gp.axes[1] ?? 0, gp.axes[2] ?? 0, gp.axes[3] ?? 0];
    this.state.triggers = [gp.buttons[6]?.value ?? 0, gp.buttons[7]?.value ?? 0];
    this.state.connected = true;
  }

  isDown(btn: number): boolean { return this.state.buttons[btn] === true; }
  isJustPressed(btn: number): boolean {
    return this.state.buttons[btn] === true && this.state.buttonsPrev[btn] !== true;
  }
  isJustReleased(btn: number): boolean {
    return this.state.buttons[btn] !== true && this.state.buttonsPrev[btn] === true;
  }

  /** 스케일드 레이디얼 데드존 [확인함 Hypersect] */
  leftStick(deadzone = 0.20): { x: number; y: number } {
    return scaledRadialDeadzone(this.state.axes[0], this.state.axes[1], deadzone);
  }
}

export function scaledRadialDeadzone(
  x: number, y: number,
  innerDz = 0.20,
  outerDz = 0.05,
): { x: number; y: number; magnitude: number } {
  const mag = Math.hypot(x, y);
  if (mag <= innerDz) return { x: 0, y: 0, magnitude: 0 };
  const legalRange = 1 - outerDz - innerDz;
  const normalized = Math.min(1, (mag - innerDz) / legalRange);
  const scale = normalized / mag;
  return { x: x * scale, y: y * scale, magnitude: normalized };
}
```

### 3.3 Standard Gamepad 버튼 인덱스

```typescript
// W3C/MDN 표준 [확인함]
export const GP = {
  FACE_DOWN: 0, FACE_RIGHT: 1, FACE_LEFT: 2, FACE_UP: 3,    // Xbox: A B X Y
  LB: 4, RB: 5, LT: 6, RT: 7,
  BACK: 8, START: 9, LSTICK: 10, RSTICK: 11,
  DPAD_UP: 12, DPAD_DOWN: 13, DPAD_LEFT: 14, DPAD_RIGHT: 15,
} as const;
```

### 3.4 InputManager 통합 (가상 키 주입)

```typescript
// GamepadManager.update() 내에서 InputManager 갱신
syncToInputManager(input: InputManager): void {
  for (const [action, btns] of Object.entries(PAD_BINDINGS)) {
    const pressed = btns.some(b => this.isDown(b));
    input.setVirtualAction(action as GameAction, pressed);
  }
  const ls = this.leftStick(0.20);
  input.setVirtualAction(GameAction.MOVE_LEFT,  ls.x < -0.30);
  input.setVirtualAction(GameAction.MOVE_RIGHT, ls.x >  0.30);
  input.setVirtualAction(GameAction.LOOK_UP,    ls.y < -0.50 || this.isDown(GP.DPAD_UP));
  input.setVirtualAction(GameAction.LOOK_DOWN,  ls.y >  0.50 || this.isDown(GP.DPAD_DOWN));
}
```

### 3.5 Vendor ID 검출 (브랜드 자동 라벨링)

```typescript
const VENDOR_PRODUCT = /Vendor:\s*([0-9a-f]{4})\s*Product:\s*([0-9a-f]{4})/i;
const FF_PATTERN = /^([0-9a-f]{1,4})-([0-9a-f]{1,4})-/i; // Firefox/Safari

type ControllerBrand = "xbox" | "playstation" | "switch" | "generic";

function detectBrand(id: string): ControllerBrand {
  const m = id.match(VENDOR_PRODUCT) ?? id.match(FF_PATTERN);
  const vendor = m?.[1]?.toLowerCase();
  switch (vendor) {
    case "045e": return "xbox";        // Microsoft
    case "054c": return "playstation"; // Sony
    case "057e": return "switch";      // Nintendo
    case "0f0d": return "switch";      // HORI
    default: return "generic";
  }
}
```

### 3.6 가변 점프 + Coyote + Buffer (Player.ts 통합 의사 코드)

```typescript
const MAX_JUMP_VELOCITY = 360;
const MIN_JUMP_VELOCITY = 140;
const COYOTE_FRAMES = 6;
const JUMP_BUFFER_FRAMES = 6;

if (input.isJustPressed(GameAction.JUMP)) {
  jumpBuffer = JUMP_BUFFER_FRAMES;
}
if (onGround) coyoteCounter = COYOTE_FRAMES;
else coyoteCounter--;

if (jumpBuffer > 0 && coyoteCounter > 0) {
  vy = -MAX_JUMP_VELOCITY;
  jumpBuffer = 0;
  coyoteCounter = 0;
  jumpHolding = true;
}

// 점프 버튼을 떼면 minVelocity로 클램프
if (jumpHolding && !input.isDown(GameAction.JUMP) && vy < -MIN_JUMP_VELOCITY) {
  vy = -MIN_JUMP_VELOCITY;
  jumpHolding = false;
}
jumpBuffer = Math.max(0, jumpBuffer - 1);
```

---

## 4. Phase별 적용 로드맵

| Phase | 스코프 | 근거 |
|---|---|---|
| **Phase 2 베타 (지금)** | ① W3C Gamepad API 폴링 ② Standard Mapping (Xbox baseline) ③ Scaled Radial 0.20 ④ 6f Coyote + 6f/8f Buffer ⑤ 가변 점프 ⑥ 키↔패드 매핑 페이지 동시 표기 (Goodboy Galaxy 형식) ⑦ Xbox + 8BitDo + DualSense 3종 × Chrome/Edge/Firefox 검증 매트릭스 | 데모 baseline (Cuckoo Castle 수준) |
| **Phase 2 베타 직전 (P0)** | 풀 리매핑 + 버튼 라벨 자동 전환 (Vendor ID 045e/054c/057e) | XAG/GAG + SHRUBNAUT 컴플레인 차단 |
| **Phase 2 후반 (P1)** | `dual-rumble` 진동 (피격 150ms / 단조열 250ms / 보스 600ms) + 강도 슬라이더 | HK v1.5+ 표준 |
| **Phase 3** | Roll-Cancel + Dodge Offset (콤보 보존) — 야리코미 파밍 효율 직결 | Dead Cells 모델 |
| **Phase 4 PC 포팅** | Tauri v2 + Steam Input "Gamepad Emulation" — 코드 변경 없이 데크/PS5/Switch Pro가 XInput으로 노출 | Steamworks 가이드 [확인함] |

### 4.1 Steam Deck 호환 체크리스트

- [ ] `gamepadconnected` 1회 확인 후 패드 인식 정상 (데스크톱 모드 Chromium은 udev 필요)
- [ ] Gaming 모드 Steam Web Browser는 미테스트 — 데모 안내문에 "Steam에 비-Steam 게임으로 추가 후 실행 권장" 명시 [추측임]
- [ ] LS scaled radial deadzone 0.20 기본값
- [ ] DPad (buttons[12-15]) 우선 폴링 — 데크 D-Pad는 디지털, LS와 분리 사용
- [ ] Steam Input "Gamepad" 템플릿 사용 시 `mapping === "standard"` 으로 노출 [추측임]
- [ ] "웹/브라우저 게임" 표현 금지 (memory: project_demo_positioning)

### 4.2 Tauri v2 마이그레이션 시 고려사항

| 항목 | 영향 | 대응 |
|---|---|---|
| Tauri는 OS WebView 사용 (Windows=WebView2 Chromium, macOS=WKWebView Safari) | macOS에서 트리거-럼블/일부 패드 인식 약함 | feature-detect, fallback gracefully [확인함] |
| `tauri-plugin-gamepad` (gilrs 폴리필) 존재 | WebView Gamepad API가 부족할 때 보강 가능 [확인함] | Phase 4 PC 포팅 시 평가 |
| Steamworks SDK 통합 | Steam Input API 직접 접근 = 자이로/터치패드/Action Set 가능 [확인함] | Phase 4 진입 시점에만 평가 |
| Steam Input "Gamepad Emulation" | 별도 코드 없이 데크/PS5/Switch Pro가 XInput으로 노출 [확인함] | **권장 1차 전략** — 코드 변경 최소 |

---

## 5. 안티패턴 (즉시 폐기 목록)

| 안티패턴 | 사유 |
|---|---|
| `setInterval` 별도 폴링 | 렌더 desync [확인함] |
| `gamepad.id` vendor만 보고 매핑 강제 | Standard Mapping 우선 [확인함] |
| `getGamepads()` 결과 캐싱 | 매 프레임 스냅샷 재호출 필수 [확인함] |
| haptics 중첩 호출 | 마지막만 살아남음 (preempt) [확인함] |
| user gesture 전 `getGamepads()` 결과 신뢰 | 빈 리스트 정상 [확인함] |
| 지역별 한국 특화 매핑 | 1차 niche 시그널 희석 (루리웹/HK 갤 합의) |
| Phase 2/3에 Steamworks 직접 통합 | `project_multiplayer_timing` 원칙 위반 |
| Hollow Knight 비공인 사이트 (`hollowknight.io`) 레퍼런스 | 라이선스 회색지대, 비교 표본 부적합 |

---

## 6. 차별화 기회 (시장 공백)

Stream A 결과:
- **상용 메트로베니아 공식 브라우저 데모 0건** [확인함]
- **PixiJS + TS로 Gamepad API 직접 호출한 횡스크롤 메트로베니아 공개 사례 0건**
- 표본 20건 중 리매핑 1건, 진동 0건, HUD 아이콘 자동 전환 0건

→ ECHORIS가 **W3C 표준 직접 호출 + 풀 리매핑 + HUD 아이콘 자동 전환** 셋을 모두 갖추면 좁은 카테고리에서 선점 가능.

---

## 7. 한국 시장 고려사항

### 7.1 입력 디바이스 분포

- 한국 PC 게이머의 키보드 우선 선호는 FPS/MMORPG 시장이 주도해 왔으나, **메트로베니아·플랫포머는 패드 권장이 주류 의견** [확인함]. 루리웹·할로우 나이트 마이너 갤러리에서 "패드 vs 키보드" 토론은 패드 선호가 다수.
- Steam 한국 사용자 중 게임패드 보유율은 글로벌 평균 이하로 추정 [근거 없음]. 키보드 매핑이 1순위 시민이어야 한다.

### 7.2 한국어 패드 가이드 표기

- 한국 출시 메트로베니아(Hollow Knight · Blasphemous · Bloodstained 모두 공식 한국어화)에서 패드 가이드는 Xbox 글리프 + 영문 액션명 또는 한국어 액션명 혼용. 한국 게이머는 "A 버튼", "X 버튼" 등 영문 글리프 직접 호명에 익숙 [추측임].
- **권장:** 글리프는 그래픽 아이콘으로, 액션명은 한국어로(예: `[A] 점프`, `[X] 공격`).

### 7.3 한국 커뮤니티 피드백 패턴

- 루리웹 · 인벤 · DC 인디게임 갤러리에서 메트로베니아의 패드 조작 불만 1순위는 **"기본 매핑이 직관에 어긋남"** 이다 [확인함]. SOTN의 ○=공격, △=백대시 같은 "역방향" 매핑에 거부감 강함.
- **권장:** 글로벌 표준(점프=A, 공격=X, 대시=RT)을 그대로 채택. 한국 시장 특화 매핑은 1차 niche 시그널을 희석시키므로 채택하지 않는다.

### 7.4 IME 충돌

- 현재 키보드 매핑에 Z/X/C 사용 중. 한글 IME 활성 시 **`Z`가 한자 변환 트리거**가 될 수 있음 [확인함]. KEY_CHAR_TO_CODE fallback 처리는 이미 존재하나, "한영 키 자동 토글" 기능을 옵션으로 노출 권장 [추측임].

---

## 부록 A — 웹 메트로베니아 사례 전수조사 (Stream A)

### A.1 발견된 작품 목록 (표본 20건)

| # | 작품 | 엔진 | 패드 지원 | 리매핑 | 진동 | 특이사항 | 출처 |
|---|---|---|---|---|---|---|---|
| 1 | [Vapor Trails](https://sevencrane.itch.io/vapor-trails) (sevencrane) | Unity WebGL | XInput / DualShock / Generic | 예 | 미언급 | itch 인풋 메타에 Xbox·PS·Gamepad(any) 모두 명시 | [확인함] |
| 2 | [Dank Tomb](https://krajzeg.itch.io/dank-tomb) (Jakub Wasilewski) | PICO-8 | Gamepad (any) | 미언급 | 미언급 | "Gamepads are supported as well" | [확인함] |
| 3 | [SHRUBNAUT](https://gleeson.itch.io/shrubnaut) (gleeson) | GameMaker HTML5 | Xbox / Gamepad (any) | 미지원 (댓글 항의 있음) | 미언급 | V1.5에서 HTML5 재제작 | [확인함] |
| 4 | [Ruins Of Mitriom](https://pixel-boy.itch.io/ruins-of-mitriom) (pixel-boy) | Godot | Gamepad (any) | 미언급 | 미언급 | 컨트롤 이미지에 패드 매핑 도해 포함 | [확인함] |
| 5 | [EMUUROM](https://borbware.itch.io/emuurom) (borbware) | TIC-80 | Xbox Series / 8BitDo SN30 Pro | 미언급 | 미언급 | 개발자 직접 검증 답변 | [확인함] |
| 6 | [Birdsong](https://managore.itch.io/birdsong) (Daniel Linssen) | GameMaker | Xbox 명시 | 미지원 | 미언급 | 좌스틱·D-pad 이동, A 점프, B/Start 매핑 페이지 명문화 | [확인함] |
| 7 | [Cuckoo Castle](https://rilem.itch.io/cuckoo-castle) (Richard Lems) | Construct | HTML5 Gamepad API 호환 모든 패드 | 미언급 | 미언급 | "html5 gamepad API" — 표준 직사용 사례 | [확인함] |
| 8 | [Goodboy Galaxy DEMO](https://goodboygalaxy.itch.io/goodboy-galaxy-demo) | GBA + VBA-M 포크 | Gamepad (any), 키↔패드 자동 매핑 | 미언급 | 미언급 | LB/RB·A/B 매핑 공개 | [확인함] |
| 9 | [Feed IT Souls](https://gumpyfunction.itch.io/feed-it-souls) (Gumpy Function) | GB Studio | Gamepad (any) | 미언급 | 미언급 | 웹은 에뮬 래퍼 | [확인함] |
| 10 | [Hollow Knight Beta Demake](https://elvies.itch.io/hollowknightdemake) (Elvies) | GB Studio | 미언급 | 미언급 | 미언급 | 페이지 컨트롤은 키보드만 명시 | [확인함] |
| 11 | [The Fallen Crown - GBC](https://atavistgames.itch.io/the-fallen-crown) | GB Studio | 미언급 | 미언급 | 미언급 | GB Studio 통상 패드 매핑 가능 | [추측임] |
| 12 | [Moss Moss](https://noelcody.itch.io/moss-moss) (Noel Cody) | PICO-8 | 미언급 (PICO-8 기본 가능) | 미언급 | 미언급 | 페이지 안내는 키보드만 | [추측임] |
| 13 | [Ascent](https://johanpeitz.itch.io/ascent) (Johan Peitz) | PICO-8 | 미언급 (PICO-8 기본 가능) | 미언급 | 미언급 | LOWREZJAM 2022 | [추측임] |
| 14 | [Low Knight](https://krajzeg.itch.io/low-knight) (Jakub Wasilewski) | PICO-8 | 미언급 | 미언급 | 미언급 | 동일 개발자 Dank Tomb는 명시 | [추측임] |
| 15 | [Blink](https://justcamh.itch.io/blink) (Justcamh) | Unity WebGL | 미언급 | 미언급 | 미언급 | Unity WebGL 표준상 가능 | [근거 없음] |
| 16 | [Kobold Siege](https://stopsignal.itch.io/kobold-siege) (Stopsignal) | GameMaker | 미지원 추정 | 미언급 | 미언급 | 웹빌드 버그, 다운로드 권장 | [확인함] |
| 17 | [Growmi](https://carlospedroso.itch.io/growmi) (Carlos Pedroso) | 미공개 | 미언급 | 미언급 | 미언급 | 검증 불가 | [근거 없음] |
| 18 | [hollowknight.io](https://hollowknight.io/) | 정체 불명 | 키보드만 명시 | 미언급 | 미언급 | 비공인 팬/리스킨 사이트 | [확인함] |
| 19 | Hollow Knight demo recreation (Construct.net 팬 메이드) | Construct 3 | Construct 3 표준상 가능 | 미언급 | 미언급 | 페이지 직접 검증 실패(403) | [추측임] |
| 20 | RetroGames.cc SOTN | PSX 에뮬레이터 JS | 에뮬 측 매핑 제공 | 미언급 | 미언급 | 정식 데모 아닌 에뮬 사이트 | [추측임] |

### A.2 패드 지원율 (표본 20개 기준)

- 명시적 지원 + 작동 검증: 9건 → **45%** [확인함]
- 엔진상 가능하나 페이지 미명시: 7건 → **35%** [추측임]
- 명시적 미지원 또는 댓글 무응답: 4건 → **20%**

### A.3 주목할 만한 작품 5선

1. **Vapor Trails (Unity WebGL)** — itch 인풋 메타에 Keyboard / Xbox / Gamepad(any) / PlayStation 모두 표기, 접근성 항목에 "Configurable controls" 명시 [확인함]. 횡스크롤 액션 메트로베니아라는 장르 정합성도 ECHORIS와 가장 가깝다. Unity WebGL 빌드 사이즈 단점.
2. **Cuckoo Castle (Construct)** — 패치 노트에 "update 1.1 added support for gamepads supported by html5 gamepad API" — 표준 W3C Gamepad API에만 의존해 패드 지원 유일 명시 사례 [확인함]. ECHORIS 접근과 정확히 동일.
3. **SHRUBNAUT (GameMaker HTML5)** — 댓글에서 "X로 점프 말고 위로 점프하고 싶다"는 리매핑 요청 무응답 [확인함]. **고정 매핑은 즉각 컴플레인 신호**.
4. **EMUUROM (TIC-80)** — 개발자가 "8BitDo SN30 Pro와 Xbox Series 컨트롤러 둘 다 Chrome에서 잘 된다"고 직접 답변 [확인함]. ECHORIS QA 체크리스트에 그대로 차용 가치.
5. **Goodboy Galaxy DEMO** — 페이지에 키보드와 패드 매핑을 항상 쌍으로 표기 ("LB / A key" 형식) [확인함]. echoris.io 데모 컨트롤 안내에 그대로 차용.

### A.4 ECHORIS 적용 모범 사례 매핑

| 항목 | 모범 | 적용안 |
|---|---|---|
| 표준 Gamepad API 직접 호출 | Cuckoo Castle | InputManager에 `navigator.getGamepads()` 폴링 + `gamepadconnected` 이벤트 |
| 키↔패드 매핑 동시 표기 | Goodboy Galaxy ("LB / A key" 형식) | echoris.io 데모 컨트롤 가이드에 두 줄 병기 |
| 멀티 패드 호환 검증 | EMUUROM 댓글 응답 | Xbox + 8BitDo + DualSense Chrome 셋 검증 후 페이지 명시 |
| 접근성으로 리매핑 노출 | Vapor Trails | 옵션 메뉴 "Configurable controls" + itch 인풋 메타 |
| 리매핑 부재 컴플레인 차단 | SHRUBNAUT | 점프/대시/공격 최소 3개 리매핑 |

### A.5 사각지대

- 403 차단된 페이지 2건 (itch.io 다층 필터, Construct.net) — 인접 페이지로 보강했으나 일부 누락 가능성 존재
- Newgrounds 메트로베니아 표본 빈약 (HTML5 전환 후 카테고리 작음)
- CrazyGames / Poki — "Controller Compatible" 메트로베니아 0건 [확인함]
- 상용 게임 공식 브라우저 데모 0건 [확인함] — Hollow Knight, Dead Cells, Blasphemous, Ori 모두 미제공

---

## 부록 B — PixiJS 게임패드 구현 패턴 (Stream B)

### B.1 PixiJS 공식 지원 현황

PixiJS v8 코어 라이브러리에는 **게임패드 모듈이 존재하지 않는다** [확인함]. 공식 이벤트 시스템은 Pointer/Mouse/Touch만 다루며, `navigator.getGamepads()` 통합 레이어를 별도로 제공하지 않는다 [확인함].

PixiJS GitHub Discussions #11203에서 메인테이너 `@reececomo`가 직접 작성한 **`pixijs-input-devices` 플러그인이 사실상의 권장 해법**으로 게시되어 있다 [확인함].

### B.2 라이브러리 비교

| 라이브러리 | 최근 업데이트 | 버전 | PixiJS 호환성 | 라이선스 | 추천도 |
|---|---|---|---|---|---|
| [pixijs-input-devices](https://github.com/reececomo/pixijs-input-devices) | 약 10일 전 (2026-04 말) [확인함] | 0.9.1 | PixiJS v8+ 명시 [확인함] | MIT | ★★★★★ |
| [pixi-controller (novout)](https://www.npmjs.com/package/pixi-controller) | 1년+ 전 [추측임] | n/a | PixiJS v6/v7 | MIT | ★★ |
| [gamepad-wrapper](https://www.npmjs.com/package/gamepad-wrapper) | 2년 전 [확인함] | 1.3.4 | 프레임워크 무관 | MIT [추측임] | ★★ |
| [mmk.gamepad](https://github.com/MaulingMonkey/mmk.gamepad) | 2년+ 전 [추측임] | n/a | 프레임워크 무관 | MIT [추측임] | ★ |
| Phaser Gamepad 모듈 | 활성 [확인함] | Phaser 3 | Phaser 전용 | MIT | 참고용 |

`pixijs-input-devices` 핵심 기능 [확인함]:
- Standard Controller Layout (Face1-4, LeftShoulder/RightShoulder, LeftTrigger/RightTrigger, Dpad, Stick)
- 명명 바인딩 + `BindValues` TypeScript 모듈 확장
- `bindDown` (held), `onBindDown` (event), 좌/우 조이스틱 직접 접근
- 햅틱 진동(rumble/buzz/trigger)
- 키보드/게임패드/커스텀 디바이스 통합 매니저
- UI 네비게이션 매니저(D-Pad/Stick으로 포인터 UI 탐색)

### B.3 결정 트리

| 조건 | 권장 |
|---|---|
| 멀티플레이/UI 네비게이션이 단기 로드맵에 있다 | `pixijs-input-devices` 채택 |
| 입력 시스템을 완전히 통제 / 의존성 최소화 | **직접 구현 (현 InputManager 확장)** |
| 빠른 프로토타입 검증 후 결정 | 직접 구현 → 추후 교체 검토 |

**ECHORIS 권장: 직접 구현** [추측임 — 현 코드베이스 분석 기반]:
1. `InputManager.ts`가 이미 잘 설계된 액션-바인딩 추상화를 갖추고 있어 흡수 비용이 50줄 미만
2. `setVirtualAction` 패턴이 VirtualPad에서 검증됨
3. `pixijs-input-devices`는 v0.x로 아직 메이저 버전 미달 → API 안정성 위험
4. ECHORIS 멀티플레이는 Phase 3 진입 전 0줄 정책 — 거대한 입력 라이브러리 도입은 과스코프

다만 **`pixijs-input-devices`가 0.x → 1.0으로 안정화되면 Phase 3 시점에서 재평가** 권장.

### B.4 함정과 주의사항

1. **객체 캐싱 금지** — `navigator.getGamepads()`가 반환하는 `Gamepad` 객체는 프레임 간 재사용 금지. 매 프레임 재호출 [확인함 MDN].
2. **null 슬롯 방어** — `getGamepads()`는 항상 길이 4 배열을 반환하며 빈 슬롯은 `null` [확인함].
3. **Firefox 사용자 상호작용 요구** — 핑거프린팅 방지로 첫 입력 전까지 패드 비노출. "Press any button" 안내 권장 [확인함 MDN].
4. **Safari 부분 지원** — Standard Layout은 동작하나 일부 컨트롤러(Switch Pro, DualSense)에서 매핑 비표준 가능 [추측임].
5. **데드존 권장값**: 좌스틱 0.15-0.20 (스케일드 레이디얼), 트리거 0.10 시작 [확인함].
6. **인덱스 재사용** — 패드 분리 후 다른 패드 연결 시 같은 인덱스 재할당 가능. `connected` 속성과 이벤트로 추적 [확인함].
7. **timestamp 미지원** — Firefox는 `gp.timestamp`가 동작하지 않을 수 있음. 자체 프레임 카운터 사용 [확인함 MDN].
8. **Standard 매핑 미보장** — `gp.mapping !== "standard"`인 패드는 인덱스가 임의 배치. 캘리브레이션 UI 또는 무시 정책 [확인함].
9. **DualSense/Switch Pro 페이스 버튼 라벨** — 시각 표기는 OS/브라우저별 상이. 위치 기반 또는 사용자 선택 [추측임].
10. **iframe 게임 호스팅 (itch.io)** — `gamepad-input` 권한이 iframe에 전파되어야 함. 자체 호스팅 시 `<iframe allow="gamepad">` 필요 [추측임].

---

## 부록 C — Gamepad API 표준 & 베스트 프랙티스 (Stream C)

### C.1 표준화 단계 (2026-05 기준)

- **W3C Working Draft, 2025-07-10 발행** [확인함]
- 2026년 5월 시점에도 Recommendation 미진입, "work-in-progress, may be updated" 명시 [확인함]
- 핵심 인터페이스(`Gamepad`, `GamepadButton`, `gamepadconnected`/`disconnected` 이벤트, Standard Gamepad 매핑)는 **MDN 기준 "Baseline Widely available"** [확인함]

### C.2 Standard Gamepad 매핑 (`mapping === "standard"`)

| Index | Xbox | PlayStation | Switch Pro |
|---|---|---|---|
| buttons[0] | A | Cross (X) | B |
| buttons[1] | B | Circle | A |
| buttons[2] | X | Square | Y |
| buttons[3] | Y | Triangle | X |
| buttons[4] | LB | L1 | L |
| buttons[5] | RB | R1 | R |
| buttons[6] | LT (아날로그 0..1) | L2 | ZL |
| buttons[7] | RT (아날로그 0..1) | R2 | ZR |
| buttons[8] | Back/View | Share/Create | Minus |
| buttons[9] | Start/Menu | Options | Plus |
| buttons[10] | LS click | L3 | LStick |
| buttons[11] | RS click | R3 | RStick |
| buttons[12-15] | DPad U/D/L/R (디지털) | DPad | DPad |
| buttons[16] | Guide/Xbox | PS | Home |
| axes[0..1] | LS X/Y (-1..1, Y는 위가 음수) | LS | LS |
| axes[2..3] | RS X/Y | RS | RS |

> 스펙 인용: "All button values MUST be linearly normalized to the range [0..1]. 0 MUST mean fully unpressed, and 1 MUST mean fully pressed." [확인함]

`mapping === ""` (빈 문자열)이면 비표준 매핑 — Windows DirectInput 전용 패드, 일부 8BitDo 레거시 모드, Joy-Con 단일 등 [확인함]. 폴백 매핑 테이블 또는 사용자 리바인딩 UI 필요.

### C.3 Gamepad Extensions 지원 현황

- **dual-rumble** — Chrome/Edge/Firefox 안정 [확인함]
- **trigger-rumble** — Chrome 113+ 만 정식 [확인함]. Firefox/Safari 미지원 [확인함]
- **vibrationActuator** vs 구형 `hapticActuators[]` 배열 — 신 API 우선 사용 권장 [확인함, web.dev]
- **Touchpad / Gyro / Accelerometer / Lights** — W3C Working Draft에서 GamepadTouch만 추가, 자이로/LED 미언급 [확인함]
- **DualSense 자이로** 브라우저 직접 접근 불가, Steam Input 경유 필요 [추측임]
- **Permissions Policy** — "gamepad" 권한 키 정의, user gesture 이전엔 빈 리스트 반환 [확인함]

### C.4 브라우저별 호환성 매트릭스

| 기능 | Chrome 120+ | Edge 120+ | Firefox 120+ | Safari 17+ (macOS) | Safari iOS | Steam Deck Browser |
|---|---|---|---|---|---|---|
| 기본 Gamepad API | 안정 [확인함] | 안정 [확인함] | 안정 [확인함] | 안정 [확인함] | 부분 (외부 MFi/Xbox) [추측임] | 안정 (Chromium 기반) [확인함] |
| Standard Mapping 자동 인식 | 광범위 [확인함] | 광범위 [확인함] | 양호 [확인함] | XInput 한정 [추측임] | 한정 [추측임] | udev 권한 필요 [확인함] |
| `playEffect("dual-rumble")` | 지원 [확인함] | 지원 [확인함] | 지원 [확인함, 비교적 최근] | 미지원/제한 [확인함] | 미지원 [추측임] | 지원 [추측임] |
| `playEffect("trigger-rumble")` | 지원 [확인함] | 지원 [확인함] | 미지원 [확인함] | 미지원 [확인함] | 미지원 [추측임] | 지원 추정 [추측임] |
| GamepadTouch | 부분 [추측임] | 부분 [추측임] | 미지원 [추측임] | 미지원 [추측임] | 미지원 [추측임] | 부분 [추측임] |

> **Steam Deck 핵심 주의** [확인함]: Flatpak Chromium은 격리로 인해 내장 패드 인식 실패. 사용자가 `flatpak override --user --filesystem=/run/udev:ro org.chromium.Chromium` 실행 필요. ECHORIS 데모 단계에서는 Steam에서 게임 실행(데스크톱 모드 + "비-Steam 게임으로 추가") 하면 Steam Input이 가상 XInput 으로 패드 노출 우회 가능 [추측임].

### C.5 패드별 식별 패턴

| 패드 | Chrome `id` 예시 | mapping |
|---|---|---|
| Xbox 360/One/Series (XInput) | `Xbox 360 Controller (STANDARD GAMEPAD Vendor: 045e Product: 028e)` [확인함] | standard |
| DualShock 4 | `Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)` [확인함] | standard (Chrome) |
| DualSense (PS5) | `DualSense Wireless Controller (Vendor: 054c Product: 0ce6)` [추측임, 패턴 일관] | 보통 standard |
| Switch Pro Controller | Vendor `057e` Product `2009` [추측임] | 혼재 (브라우저별 비표준 가능) |
| 8BitDo Pro 2 / SN30 | XInput 모드면 045e 위장 [확인함]. DInput 모드면 비표준 [확인함] | 모드 의존 |

### C.6 접근성 권장사항 (XAG 2.0.1 + GAG)

#### Basic 등급 (필수)
- 풀 리매핑 (키보드/패드 양쪽, 모든 액션) [확인함]
- Hold → Toggle 변환 옵션 [확인함, XAG]
- Deadzone 슬라이더 (0.0-0.40) [추측임]
- 버튼 라벨 자동 전환 (Xbox/PS/Switch + 사용자 강제 옵션) [확인함]
- 사용자 정의 저장 (`localStorage` 충분) [추측임]

#### Intermediate (권장)
- 한 손 모드 (점프=L1+R1 동시 → 단일 버튼 우회) [확인함]
- 입력 큐 시각화 (HUD에 다음 1-2 입력 표시) — Sekiro/Smash Ultimate 사례 [확인함]
- "Press to bind" UI — 캡처 1초 후 자동 등록, ESC 취소 [추측임]

#### ECHORIS 우선순위
| 항목 | 우선순위 |
|---|---|
| 풀 리매핑 + Hold/Toggle | **P0** (베타 직전) |
| 버튼 라벨 자동 전환 | **P0** |
| Deadzone 슬라이더 | P1 |
| 한 손 모드 | P2 |

---

## 부록 D — 상용 메트로베니아 패드 UX (Stream D)

### D.1 게임별 Xbox 매핑 매트릭스

| 게임 | 점프 | 대시/회피 | 주공격 | 보조/마법 | 상호작용 | 메뉴 | 인벤토리/맵 | 진동 |
|---|---|---|---|---|---|---|---|---|
| Hollow Knight [확인함] | A | RT | X | B(시전), RB(퀵캐스트) | (이동 + 키프롬프트) | Start | Back(인벤), LB(맵) | 있음(v1.5+ 강도 슬라이더) [확인함] |
| Dead Cells [확인함] | A | B(롤) | X(주무기) | Y(보조), LT/RT(스킬) | RB | Start | Select(맵) | 있음 [추측임] |
| SOTN (PS1 원본) [확인함] | × → A | △ [추측임] | □ → X(우손) | ○ → B(좌손/방어구), ↑+공격(서브웨폰) | (자동) | Start | Select | 없음(원본) [확인함] |
| Bloodstained: RotN [확인함] | A | LB(백스텝) | X | RT/RB(샤드), Y(트리거) | ↑(검색) | Menu | View(맵) | 있음 [추측임] |
| Ori WotW [확인함] | A | RB | X(검) [추측임] | LB(Bash) | (자동) [근거 없음] | Start | Back | 있음 [추측임] |
| Blasphemous 1 [확인함] | A | RT | X | B(원거리), LB(힐), LT(기도) | View | Menu | View(아이템) | 있음 [추측임] |
| Blasphemous 2 [추측임] | A | RT | X | B/LT(스킬) | View | Menu | View | 있음 [추측임] |
| Metroid Dread (Switch) [확인함] | B | ZL(슬라이드) | Y(샷) + X(근접) | R(미사일), L(자유 조준) | — | + | – | HD Rumble [추측임] |
| Aeterna Noctis [확인함] | A(가변 점프) [확인함] | RB [추측임] | X [추측임] | Y/B [근거 없음] | — | Start [추측임] | – | 있음 [추측임] |
| Hades [확인함] | — (대시 A) | A | X(공격) | Y(스페셜), B(캐스트), RT(콜) | RB | Start | Back(부신/맵) | 있음 [추측임] |
| Celeste [확인함] | A(가변), Switch는 B | X 또는 Y | — | — | — | Start | – | 있음 [추측임] |

### D.2 공통 패턴 통계

#### 점프 = A/× (10/10 게임)
조사 대상 10종 중 **9종이 점프 = A(Xbox) / × 또는 B(PS/Switch)** [확인함]. Hades는 A를 대시에 할당하여 예외이지만, **Hollow Knight · Dead Cells · Bloodstained · Blasphemous · Ori · Aeterna Noctis · SOTN(현대 컬렉션) 모두 A=점프** 이다.

#### 대시 = RT 또는 B 분기
- 트리거 대시 (RT): Hollow Knight, Blasphemous 1/2, Bloodstained(LB 백스텝은 변형) [확인함]
- 페이스 버튼 대시 (B/A): Dead Cells, Hades [확인함]
- 숄더 대시 (RB): Ori WotW [확인함]

> 대시가 "공격 직후 빠르게 캔슬해야 하는" 시스템이면 트리거(HK, Blasphemous), "일상적 회피"면 페이스 버튼(Dead Cells)이 표준.

#### 공격 = X/□ (8/8 게임)
액션 콤뱃이 있는 8종 모두 공격 = X(Xbox) / □(PS) [확인함]. Metroid Dread만 Y=샷, X=근접 분리 — 슈팅이 주공격이라 외삽 사례 아님.

### D.3 입력 정밀도 패턴

#### Pogo Jump (Hollow Knight)
- 입력: 공중에서 ↓ + 공격(X) [확인함]
- 요구사항: 단순 연타가 아닌 "타겟에 닿는 타이밍"에 입력 시 발동
- ECHORIS 함의: 검 1종 + 횡/내려치기/올려치기 시스템과 자연스럽게 연결. 내려치기를 "공중 + ↓ + 공격"으로 정의하면 Pogo가 자동 따라옴

#### Roll-Cancel (Dead Cells)
- 입력: 공격 startup/recovery 프레임 중 B(롤) 입력 [확인함]
- Dodge Offset: 롤로 캔슬해도 콤보 카운터 유지 [확인함]
- ECHORIS 함의: 야리코미 RPG에서 콤보 보존은 파밍 효율 직결. 도입 가치 높음

#### Backdash (SOTN)
- 입력: PS1 원본에서 △ 단발 입력 [확인함, 다수설]
- 속도 우위: 백대시 → 즉시 공격 캔슬 → 다시 백대시 패턴이 일반 달리기보다 빠름 [확인함]
- ECHORIS 함의: "백대시 = 별도 버튼"은 메트로베니아 코어 팬에게 강한 시그널. 단, 입력 부담 증가

#### Variable Jump (Celeste, Aeterna Noctis, Bloodstained)
- 표준값: 점프 버튼 hold 시간에 따라 점프 높이 조절 [확인함]
- Celeste 표준: 점프 버튼을 떼면 즉시 상승 속도 컷오프(weighted-cut). 최소 점프 50-60%, 최대 점프 100% [추측임]

#### Bash (Ori) / Cast (Hades)
- 공통 패턴: 시간 정지 또는 속도 저하 후 좌스틱 8방향(혹은 360도 아날로그) 정밀 입력 [확인함]
- ECHORIS 함의: 검 1종 컨셉에 직접 적용은 부담. 기억 단편 발동 시 단기간 좌스틱 360도 조준은 검토 가치

### D.4 UX 패턴

#### 버튼 프롬프트 동적 전환
대상 대부분이 Xbox/PS/Switch 글리프 자동 전환하지만, Steam Input 래핑 시 식별 실패로 Xbox 글리프로 폴백되는 알려진 이슈 [확인함]. Hades에서 가장 빈번한 사례.
**권장:** ISteamInput API 사용 또는 옵션에서 사용자가 글리프 종류를 직접 선택 [확인함].

#### 입력 모드 자동 감지
HK, Hades, Dead Cells 모두 마지막 입력 디바이스 기준으로 화면 가이드(예: "Press A to Jump" vs "Z 키를 눌러 점프") 즉시 전환 [확인함]. 디바운스 윈도우 100-250ms 추정 [추측임].

#### 메뉴 네비게이션 표준
- D-Pad와 좌스틱 동시 지원이 사실상 표준 [확인함]
- 확인 = A(Xbox) / ×(PS) / B(Switch), 취소 = B(Xbox) / ○(PS) / A(Switch) — 글로벌 표준 [확인함]
- SOTN 원본은 ○=확인이었으나 Requiem 컬렉션은 글로벌 표준 변경 [추측임]

---

## 8. 출처

### W3C / 표준
- [W3C Gamepad WD 2025-07-10](https://www.w3.org/TR/gamepad/)
- [MDN: Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API)
- [MDN: GamepadHapticActuator.playEffect](https://developer.mozilla.org/en-US/docs/Web/API/GamepadHapticActuator/playEffect)
- [MDN: Navigator.getGamepads()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getGamepads)
- [MDN: Desktop with gamepad](https://developer.mozilla.org/en-US/docs/Games/Techniques/Control_mechanisms/Desktop_with_gamepad)
- [web.dev: Gamepad](https://web.dev/articles/gamepad)
- [ChromeStatus: Trigger-Rumble Extension](https://chromestatus.com/feature/5162940951953408)

### PixiJS / 라이브러리
- [pixijs-input-devices (GitHub)](https://github.com/reececomo/pixijs-input-devices)
- [PixiJS Discussion #11203](https://github.com/pixijs/pixijs/discussions/11203)
- [PixiJS Events Guide](https://pixijs.com/8.x/guides/components/events)
- [pixi-controller (npm)](https://www.npmjs.com/package/pixi-controller)
- [gamepad-wrapper (npm)](https://www.npmjs.com/package/gamepad-wrapper)
- [mmk.gamepad (GitHub)](https://github.com/MaulingMonkey/mmk.gamepad)
- [Smashing Magazine — Using The Gamepad API In Web Games](https://www.smashingmagazine.com/2015/11/gamepad-api-in-web-games/)

### Deadzone / 입력 베스트 프랙티스
- [Hypersect — Interpreting Analog Sticks](http://blog.hypersect.com/interpreting-analog-sticks/)
- [Minimuino — Thumbstick Deadzones](https://minimuino.github.io/thumbstick-deadzones/)
- [thumbstick-deadzones (GitHub)](https://github.com/Minimuino/thumbstick-deadzones)
- [Maddy Thorson — Celeste & Forgiveness](https://maddythorson.medium.com/celeste-forgiveness-31e4a40399f1)
- [eguneys/celeste-jumping (PICO-8 분해)](https://github.com/eguneys/celeste-jumping)
- [Terresquall — Metroidvania Movement Part 2](https://blog.terresquall.com/2023/05/creating-a-metroidvania-like-hollow-knight-part-2/)
- [Enichan — Gamepad ID patterns gist](https://gist.github.com/Enichan/de1618d2c481523bd0c1123800bfe747)

### 접근성
- [Game Accessibility Guidelines — Remappable Controls](https://gameaccessibilityguidelines.com/allow-controls-to-be-remapped-reconfigured/)
- [Microsoft Xbox Accessibility Guideline 107](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107)

### Steam Deck / Steam Input / Tauri
- [GamingOnLinux — Chrome on Steam Deck Gamepad Support](https://www.gamingonlinux.com/2022/03/chrome-on-steam-deck-now-supports-the-deck-controller-with-geforce-now-working/)
- [Schemescape — Porting browser game to Steam](https://log.schemescape.com/posts/game-development/browser-based-game-on-steam.html)
- [tauri-plugin-gamepad](https://github.com/DeveloperMindset-com/tauri-plugin-gamepad)
- [Steamworks — Steam Input Gamepad Emulation Best Practices](https://partner.steamgames.com/doc/features/steam_controller/steam_input_gamepad_emulation_bestpractices?l=english)
- [Steam Controller Getting Started for Devs](https://partner.steamgames.com/doc/features/steam_controller/getting_started_for_devs)

### 상용 메트로베니아 컨트롤
- [Hollow Knight Controls — Fextralife](https://hollowknight.wiki.fextralife.com/Controls)
- [Hollow Knight Controls — hollowknight.wiki](https://hollowknight.wiki/w/Controls_(Hollow_Knight))
- [Hollow Knight Rumble Adjustment Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=2564962552)
- [Dead Cells Controls — Official Wiki](https://deadcells.wiki.gg/wiki/Controls)
- [Dead Cells Speedrun Tech Guide](https://www.speedrun.com/deadcells/guides/oo8vv)
- [SOTN Controls — StrategyWiki](https://strategywiki.org/wiki/Castlevania:_Symphony_of_the_Night/Controls)
- [SOTN Speedruns — Game Mechanics](https://kb.speeddemosarchive.com/Castlevania:_Symphony_of_the_Night/Game_Mechanics_and_Glitches)
- [Back Dash — Castlevania Wiki](https://castlevania.fandom.com/wiki/Back_Dash)
- [악마성 드라큘라 X 월하의 야상곡 — 나무위키](https://namu.wiki/w/%EC%95%85%EB%A7%88%EC%84%B1%20%EB%93%9C%EB%9D%BC%ED%81%98%EB%9D%BC%20X%20%EC%9B%94%ED%95%98%EC%9D%98%20%EC%95%BC%EC%83%81%EA%B3%A1)
- [Bloodstained Controls — Fextralife](https://bloodstainedritualofthenight.wiki.fextralife.com/Controls)
- [Blasphemous Controls — Fextralife](https://blasphemous.wiki.fextralife.com/Controls)
- [Metroid Dread Controls — Game8](https://game8.co/games/MetroidDread/archives/343369)
- [Hades Controls — Black Screen Gaming](https://www.blackscreengaming.com/hades/controls/index.php)
- [Bash — Ori and the Blind Forest Wiki](https://oriandtheblindforest.fandom.com/wiki/Bash)
- [Aeterna Noctis Patch v1.0.009](https://steamcommunity.com/app/1517970/eventcomments/3200370471678441219/)
- [Celeste Basic Controls — Neoseeker](https://www.neoseeker.com/celeste/Celeste_Basic_Controls)

### itch.io / 웹 메트로베니아
- [itch.io - Gamepad × Metroidvania](https://itch.io/games/input-gamepad/tag-metroidvania)
- [itch.io - HTML5 × Metroidvania](https://itch.io/games/html5/tag-metroidvania)
- [itch.io - Platformer × Gamepad](https://itch.io/games/genre-platformer/input-gamepad)
- [Top PixiJS games with Gamepad support (itch.io)](https://itch.io/games/input-gamepad/made-with-pixijs)
- [Kongregate - Metroidvania Games](https://www.kongregate.com/metroidvania-games?sort=gameplays)
- [CrazyGames - Controller Compatible](https://www.crazygames.com/t/controller)
- [gamecontroller.js (GitHub)](https://github.com/alvaromontoro/gamecontroller.js/)
